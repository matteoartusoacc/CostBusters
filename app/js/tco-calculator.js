window.CostBusters = window.CostBusters || {};

(function (CL) {
  const PRE_TAX_ORDER = [
    'entry_load', 'management_fee', 'advisory_fee', 'exit_load',
    'ter', 'transaction_costs', 'bid_ask_spread'
  ];

  function annualRates(items) {
    const r = {};
    items.forEach((it) => { r[it.id] = it.value / 100; });
    // The TER usually already includes the management fee: count only the excess to avoid double counting.
    r.terExtra = Math.max(0, r.ter - r.management_fee);
    return r;
  }

  function valueBeforeTax(years, P0, g, rt, active) {
    const rate = (id) => {
      if (!active.has(id)) return 0;
      return id === 'ter' ? rt.terExtra : rt[id];
    };
    const annual = rate('management_fee') + rate('advisory_fee') + rate('ter') + rate('transaction_costs');
    const halfSpread = rate('bid_ask_spread') / 2;
    const growth = Math.pow(Math.max(0, 1 + g - annual), years);
    return P0 * (1 - rate('entry_load')) * (1 - halfSpread) * growth * (1 - halfSpread) * (1 - rate('exit_load'));
  }

  // Costs are applied one at a time (waterfall), so each one's euro impact is exact and they sum to the gross value.
  CL.calculateTCO = function calculateTCO(items, assumptions) {
    const P0 = assumptions.initialInvestment;
    const g = assumptions.grossReturnPct / 100;
    const rt = annualRates(items);
    const categoryOf = Object.fromEntries(CL.COST_DEFS.map((d) => [d.id, d.category]));

    const perHorizon = CL.HORIZONS.map((years) => {
      const grossValue = P0 * Math.pow(1 + g, years);
      const breakdown = {};
      const active = new Set();
      let prev = grossValue;
      PRE_TAX_ORDER.forEach((id) => {
        active.add(id);
        const cur = valueBeforeTax(years, P0, g, rt, active);
        breakdown[id] = prev - cur;
        prev = cur;
      });
      const preTaxValue = prev;
      const taxableGain = Math.max(0, preTaxValue - P0);
      breakdown.fiscal_drag = taxableGain * rt.fiscal_drag;
      const afterTaxValue = preTaxValue - breakdown.fiscal_drag;
      const realValue = afterTaxValue / Math.pow(1 + rt.inflation_drag, years);
      breakdown.inflation_drag = afterTaxValue - realValue;

      let explicitCost = 0;
      let implicitCost = 0;
      Object.keys(breakdown).forEach((id) => {
        if (categoryOf[id] === 'explicit') explicitCost += breakdown[id];
        else implicitCost += breakdown[id];
      });

      return {
        years, grossValue, explicitCost, implicitCost, netResidual: realValue,
        breakdown, preTaxValue, taxableGain, afterTaxValue
      };
    });

    return { initialInvestment: P0, grossReturnPct: assumptions.grossReturnPct, rates: rt, perHorizon };
  };

  CL.buildFormulaTrace = function buildFormulaTrace(result, years) {
    const f = CL.fmt;
    const h = result.perHorizon.find((x) => x.years === years);
    const rt = result.rates;
    const P0 = result.initialInvestment;
    const g = f.pct(result.grossReturnPct);
    const p = (x) => f.pct(x * 100);
    const annual = rt.management_fee + rt.advisory_fee + rt.terExtra + rt.transaction_costs;

    return [
      {
        title: 'Valore lordo (nessun costo, nessuna tassa, nessuna inflazione)',
        expr: `${f.eur(P0)} × (1 + ${g})^${years}`,
        result: f.eur(h.grossValue)
      },
      {
        title: 'Costi annui che riducono il rendimento',
        expr: `gestione ${p(rt.management_fee)} + consulenza ${p(rt.advisory_fee)} + TER oltre la gestione ${p(rt.terExtra)} + transazioni ${p(rt.transaction_costs)}`,
        result: `${p(annual)} all'anno`
      },
      {
        title: 'Valore prima delle tasse',
        expr: `${f.eur(P0)} × (1 − ingresso ${p(rt.entry_load)}) × (1 − metà spread ${p(rt.bid_ask_spread / 2)})² × (1 + ${g} − ${p(annual)})^${years} × (1 − uscita ${p(rt.exit_load)})`,
        result: f.eur(h.preTaxValue)
      },
      {
        title: 'Tasse sul guadagno',
        expr: `max(0; ${f.eur(h.preTaxValue)} − ${f.eur(P0)}) × ${p(rt.fiscal_drag)}`,
        result: f.eur(h.breakdown.fiscal_drag)
      },
      {
        title: 'Valore netto (in euro di oggi)',
        expr: `${f.eur(h.afterTaxValue)} ÷ (1 + inflazione ${p(rt.inflation_drag)})^${years}`,
        result: f.eur(h.netResidual)
      },
      {
        title: 'Verifica: le tre parti del grafico sommano al valore lordo',
        expr: `netto ${f.eur(h.netResidual)} + espliciti ${f.eur(h.explicitCost)} + impliciti ${f.eur(h.implicitCost)}`,
        result: f.eur(h.netResidual + h.explicitCost + h.implicitCost)
      }
    ];
  };
})(window.CostBusters);
