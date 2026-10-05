(function (CL) {
  const $ = (id) => document.getElementById(id);

  const state = {
    label: '',
    items: null,
    extractedCount: 0,
    assumptions: Object.assign({}, CL.DEFAULT_ASSUMPTIONS),
    horizon: CL.DEFAULT_HORIZON,
    result: null
  };

  const BADGES = {
    extracted: { cls: 'badge-extracted', icon: '✓', text: 'Estratto dal documento' },
    assumed_default: { cls: 'badge-default', icon: '≈', text: 'Valore di default' },
    user: { cls: 'badge-user', icon: '✎', text: 'Impostato da te' },
    not_estimable: { cls: 'badge-warning', icon: '⚠', text: 'Non stimabile dal documento' }
  };

  function setStatus(message, kind) {
    const el = $('input-status');
    el.textContent = message;
    el.className = 'status' + (kind ? ' status-' + kind : '');
  }

  function itemById(id) {
    return state.items.find((it) => it.id === id);
  }

  // ---------- Input: tabs ----------
  function initTabs() {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        $(t.getAttribute('aria-controls')).hidden = !on;
      });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        select(next);
        next.focus();
      });
    });
  }

  // ---------- Input: paste ----------
  const MAX_TEXT_BYTES = 200000;
  function initPaste() {
    $('analyze-btn').addEventListener('click', () => {
      const text = $('paste-input').value;
      if (text.length > MAX_TEXT_BYTES) {
        setStatus('Il testo è troppo lungo (oltre 200 000 caratteri). Copia solo la sezione dei costi del documento.', 'error');
        return;
      }
      analyze('testo incollato', text);
    });
  }

  // ---------- Input: PDF ----------
  function initPdf() {
    const input = $('pdf-input');
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const looksPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (!looksPdf) {
        setStatus('Il file selezionato non sembra un PDF.', 'error');
        input.value = '';
        return;
      }
      setStatus('Lettura del PDF in corso…', 'busy');
      try {
        const { text, pageCount } = await CL.extractTextFromPdf(file, (n, total) => {
          setStatus(`Lettura del PDF: pagina ${n} di ${total}…`, 'busy');
        });
        analyze(file.name, text, `PDF letto (${pageCount} ${pageCount === 1 ? 'pagina' : 'pagine'}). `);
      } catch (e) {
        if (e.code === 'NO_TEXT') {
          setStatus('In questo PDF non c’è testo selezionabile: probabilmente è una scansione (immagine). ' +
            'Il riconoscimento del testo nelle immagini (OCR) non è supportato: prova con un PDF digitale ' +
            'oppure copia e incolla il testo nella scheda «Incolla testo».', 'error');
        } else if (e.code === 'LIB_LOAD') {
          setStatus('Non è stato possibile caricare il lettore PDF (serve una connessione internet). ' +
            'Puoi copiare il testo del PDF e incollarlo nella scheda «Incolla testo».', 'error');
        } else {
          setStatus('Non è stato possibile leggere il PDF: il file potrebbe essere danneggiato o protetto da password.', 'error');
        }
      } finally {
        input.value = '';
      }
    });
  }

  // ---------- Assumptions ----------
  const ASSUMPTION_FIELDS = [
    { id: 'in-capital', min: 1, max: 1e9, apply: (v) => { state.assumptions.initialInvestment = v; } },
    { id: 'in-return', min: -20, max: 20, apply: (v) => { state.assumptions.grossReturnPct = v; } },
    { id: 'in-inflation', min: 0, max: 20, apply: (v) => setUserItem('inflation_drag', v) },
    { id: 'in-tax', min: 0, max: 100, apply: (v) => setUserItem('fiscal_drag', v) }
  ];

  function setUserItem(id, v) {
    const it = itemById(id);
    if (it.value === v) return;
    it.value = v;
    it.source = 'user';
  }

  function initAssumptions() {
    $('in-capital').value = state.assumptions.initialInvestment;
    $('in-return').value = state.assumptions.grossReturnPct;
    $('in-inflation').value = CL.COST_DEFS.find((d) => d.id === 'inflation_drag').defaultValue;
    $('in-tax').value = CL.COST_DEFS.find((d) => d.id === 'fiscal_drag').defaultValue;
    ASSUMPTION_FIELDS.forEach((field) => {
      const input = $(field.id);
      input.addEventListener('input', () => {
        const v = parseFloat(input.value.replace(',', '.'));
        const ok = Number.isFinite(v) && v >= field.min && v <= field.max;
        input.setAttribute('aria-invalid', String(!ok));
        if (!ok || !state.items) return;
        field.apply(v);
        renderAll();
      });
    });
  }

  function syncAssumptionInputs() {
    $('in-inflation').value = itemById('inflation_drag').value;
    $('in-tax').value = itemById('fiscal_drag').value;
    ['in-inflation', 'in-tax'].forEach((id) => $(id).setAttribute('aria-invalid', 'false'));
  }

  // ---------- Horizon picker ----------
  function initHorizon() {
    const group = $('horizon-picker');
    CL.HORIZONS.forEach((years) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'horizon-btn';
      btn.dataset.years = String(years);
      btn.textContent = CL.fmt.years(years);
      btn.addEventListener('click', () => selectHorizon(years));
      group.appendChild(btn);
    });
  }

  function selectHorizon(years) {
    state.horizon = years;
    renderAll();
  }

  // ---------- Analysis ----------
  function analyze(label, text, statusPrefix) {
    if (!text || !text.trim()) {
      setStatus('Il testo è vuoto: incolla il contenuto del documento da analizzare.', 'error');
      return;
    }
    // Preserve user-customised inflation/tax when re-analysing a new document.
    const prevInflation = state.items ? itemById('inflation_drag') : null;
    const prevTax = state.items ? itemById('fiscal_drag') : null;
    const savedInflation = prevInflation && prevInflation.source === 'user' ? prevInflation.value : null;
    const savedTax = prevTax && prevTax.source === 'user' ? prevTax.value : null;

    const extraction = CL.extractCosts(text);
    state.label = label;
    state.items = extraction.items;
    state.extractedCount = extraction.extractedCount;
    if (savedInflation !== null) setUserItem('inflation_drag', savedInflation);
    if (savedTax !== null) setUserItem('fiscal_drag', savedTax);
    syncAssumptionInputs();

    $('source-text').textContent = text;
    $('source-preview').hidden = false;

    const firstRun = $('results').hidden;
    $('results').hidden = false;
    renderAll();
    setStatus((statusPrefix || '') +
      `Caccia completata: ${extraction.extractedCount} voci di costo su ${CL.COST_DEFS.length} scovate nel documento.`, 'ok');
    if (firstRun) $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Rendering ----------
  let lastChartWidth = 0;

  function renderAll() {
    state.result = CL.calculateTCO(state.items, state.assumptions);
    $('doc-label').textContent = state.label;
    document.querySelectorAll('.horizon-btn').forEach((b) => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.years) === state.horizon));
    });
    renderWarnings();
    renderSummary();
    renderChart();
    CL.chart.renderTable($('chart-table'), state.result.perHorizon);
    renderCostLists();
    renderFormula();
  }

  function currentHorizon() {
    return state.result.perHorizon.find((h) => h.years === state.horizon);
  }

  function notEstimableItems() {
    return state.items.filter((it) => it.source === 'not_estimable');
  }

  function notice(text, strongText) {
    const note = document.createElement('p');
    note.className = 'notice';
    const icon = document.createElement('span');
    icon.className = 'notice-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '!';
    note.appendChild(icon);
    const body = document.createElement('span');
    if (strongText) {
      const strong = document.createElement('strong');
      strong.textContent = strongText + ' ';
      body.appendChild(strong);
    }
    body.appendChild(document.createTextNode(text));
    note.appendChild(body);
    return note;
  }

  function renderWarnings() {
    const box = $('warnings');
    box.textContent = '';

    const missing = notEstimableItems();
    if (missing.length) {
      const names = missing.map((it) => it.label).join(', ');
      box.appendChild(notice(
        `Il documento non dice quanto valgono: ${names}. Restano fuori dal calcolo, quindi quello che ti resta ` +
        'è in realtà più basso. Nelle voci segnalate qui sotto trovi le domande da porre al tuo consulente.',
        missing.length === 1 ? 'Attenzione: 1 costo non è stimabile dal documento.' :
          `Attenzione: ${missing.length} costi non sono stimabili dal documento.`
      ));
    }

    if (state.extractedCount === 0) {
      box.appendChild(notice('Nel testo non abbiamo riconosciuto nessuna voce di costo. I risultati qui sotto ' +
        'servono solo a mostrare come funziona il calcolo, non a descrivere questo documento.'));
    }
  }

  function renderSummary() {
    const h = currentHorizon();
    const f = CL.fmt;
    // Costs that can't be estimated are left out, so the net figure is an upper bound.
    const atMost = notEstimableItems().length > 0;
    $('hero-label').textContent = `Dei tuoi ${f.eur(state.assumptions.initialInvestment)}, ` +
      `quanto ti resta tra ${f.years(h.years)}?`;
    $('hero-value').textContent = (atMost ? '≤ ' : '') + f.eur(h.netResidual);
    $('hero-sub').textContent = 'In euro di oggi, dopo costi, tasse e inflazione, con un rendimento lordo ipotizzato ' +
      `del ${f.pct(state.assumptions.grossReturnPct)} all'anno (solo illustrativo, non una previsione).` +
      (atMost ? ' Alcuni costi non sono stimabili dal documento: la cifra reale è più bassa.' : '');
    $('tile-explicit').textContent = f.eur(h.explicitCost);
    $('tile-implicit').textContent = f.eur(h.implicitCost);
    $('tile-net').textContent = f.eur(h.netResidual);
    $('tile-gross').textContent = f.eur(h.grossValue);
  }

  function renderChart() {
    const container = $('chart');
    lastChartWidth = container.clientWidth;
    CL.chart.render(container, state.result.perHorizon, {
      selectedYears: state.horizon,
      onSelect: selectHorizon
    });
  }

  function renderCostLists() {
    const h = currentHorizon();
    const lists = { explicit: $('explicit-list'), implicit: $('implicit-list') };
    lists.explicit.textContent = '';
    lists.implicit.textContent = '';
    state.items.forEach((it) => lists[it.category].appendChild(costItem(it, h)));
  }

  function costItem(it, h) {
    const f = CL.fmt;
    const li = document.createElement('li');
    li.className = 'cost-item';

    const head = document.createElement('div');
    head.className = 'cost-head';
    const label = document.createElement('span');
    label.className = 'cost-label';
    label.textContent = it.label;
    const value = document.createElement('span');
    value.className = 'cost-value';
    const estimable = it.source !== 'not_estimable';
    value.textContent = estimable ? f.pct(it.value) : 'n.d.';
    head.append(label, value);

    const meta = document.createElement('div');
    meta.className = 'cost-meta';
    const b = BADGES[it.source];
    const badge = document.createElement('span');
    badge.className = 'badge ' + b.cls;
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = b.icon;
    badge.append(icon, document.createTextNode(' ' + b.text));
    const unit = document.createElement('span');
    unit.className = 'cost-unit';
    unit.textContent = it.unit;
    meta.append(badge, unit);

    const impact = document.createElement('p');
    impact.className = 'cost-impact';
    impact.append(document.createTextNode(`Impatto in ${f.years(h.years)}: `));
    const strong = document.createElement('strong');
    strong.textContent = estimable ? f.eur(h.breakdown[it.id]) : 'non incluso nel totale';
    impact.appendChild(strong);

    const explain = document.createElement('p');
    explain.className = 'cost-explain';
    explain.textContent = CL.GLOSSARY[it.id];

    li.append(head, meta, impact, explain);

    if (it.id === 'ter' && it.value > 0 && state.result.rates.management_fee > 0) {
      const note = document.createElement('p');
      note.className = 'cost-note';
      note.textContent = `Il TER include già la commissione di gestione: come costo aggiuntivo contiamo solo ` +
        `${f.pct(state.result.rates.terExtra * 100)} (TER ${f.pct(it.value)} − gestione ` +
        `${f.pct(state.result.rates.management_fee * 100)}).`;
      li.appendChild(note);
    }

    if (it.source === 'extracted') {
      const details = document.createElement('details');
      details.className = 'cost-source';
      const summary = document.createElement('summary');
      summary.textContent = 'Da dove viene questo numero';
      const quote = document.createElement('blockquote');
      quote.textContent = '«' + it.sourceText + '»';
      details.append(summary, quote);
      li.appendChild(details);
    } else if (it.source === 'assumed_default') {
      const note = document.createElement('p');
      note.className = 'cost-note';
      note.textContent = it.defaultNote;
      li.appendChild(note);
    } else if (it.source === 'not_estimable') {
      li.classList.add('is-warning');
      li.appendChild(advisorBox(it));
    }
    return li;
  }

  function advisorBox(it) {
    const box = document.createElement('div');
    box.className = 'advisor-box';
    const title = document.createElement('p');
    title.className = 'advisor-title';
    const icon = document.createElement('span');
    icon.className = 'notice-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '!';
    title.append(icon, document.createTextNode('Il documento non dice quanto vale questo costo'));
    const text = document.createElement('p');
    text.textContent = 'Non lo stimiamo e non lo diamo per zero: lo lasciamo fuori dal calcolo. Chiedi al tuo ' +
      'consulente:';
    const list = document.createElement('ul');
    it.advisorQuestions.forEach((q) => {
      const li = document.createElement('li');
      li.textContent = q;
      list.appendChild(li);
    });
    box.append(title, text, list);
    return box;
  }

  function renderFormula() {
    $('formula-horizon').textContent = CL.fmt.years(state.horizon);
    const list = $('formula-steps');
    list.textContent = '';
    CL.buildFormulaTrace(state.result, state.horizon).forEach((step) => {
      const li = document.createElement('li');
      const title = document.createElement('p');
      title.className = 'step-title';
      title.textContent = step.title;
      const expr = document.createElement('p');
      expr.className = 'step-expr';
      const code = document.createElement('code');
      code.textContent = step.expr;
      const result = document.createElement('strong');
      result.textContent = ' = ' + step.result;
      expr.append(code, result);
      li.append(title, expr);
      list.appendChild(li);
    });
  }

  function initResize() {
    new ResizeObserver(() => {
      const w = $('chart').clientWidth;
      if (state.result && w !== lastChartWidth) renderChart();
    }).observe($('chart'));
  }

  initTabs();
  initPaste();
  initPdf();
  initAssumptions();
  initHorizon();
  initResize();
  CL.chart.renderLegend($('legend'));
})(window.CostBusters);
