window.CostBusters = window.CostBusters || {};

(function (CL) {
  CL.HORIZONS = [1, 3, 5, 10];
  CL.DEFAULT_HORIZON = 10;

  CL.DEFAULT_ASSUMPTIONS = {
    initialInvestment: 10000,
    grossReturnPct: 5
  };

  // Not estimable: these depend on the specific product, so a missing value is flagged, never guessed.
  // Only tax and inflation have a defensible default (statutory rate, ECB target).
  // Order matters: the TCO waterfall applies costs in this sequence.
  CL.COST_DEFS = [
    {
      id: 'entry_load', category: 'explicit', label: 'Commissione di ingresso',
      unit: 'una tantum, sul capitale versato',
      defaultValue: 0, estimable: false,
      advisorQuestions: [
        'Pago qualcosa al momento della sottoscrizione? Quanto?',
        'La commissione si applica a ogni versamento o solo al primo?',
        'È prevista una riduzione sugli importi più alti?'
      ]
    },
    {
      id: 'management_fee', category: 'explicit', label: 'Commissione di gestione',
      unit: "all'anno",
      defaultValue: 0, estimable: false,
      advisorQuestions: [
        'Qual è la commissione di gestione annua di questo prodotto?',
        'È già compresa nel TER o si somma?',
        'Esiste anche una commissione di performance? Su quale risultato si calcola?'
      ]
    },
    {
      id: 'advisory_fee', category: 'explicit', label: 'Commissione di consulenza',
      unit: "all'anno",
      defaultValue: 0, estimable: false,
      advisorQuestions: [
        'Quanto costa il servizio di consulenza e con quale frequenza viene addebitato?',
        'Si calcola sul capitale investito o sui guadagni?',
        'Oltre a quanto pago io, ricevete compensi da chi produce il prodotto (retrocessioni)?'
      ]
    },
    {
      id: 'exit_load', category: 'explicit', label: 'Commissione di uscita',
      unit: 'una tantum, quando disinvesti',
      defaultValue: 0, estimable: false,
      advisorQuestions: [
        'Se ritiro i soldi, pago qualcosa? Quanto?',
        'Il costo si riduce dopo un certo numero di anni?',
        'Ci sono vincoli di durata minima o penali per l’uscita anticipata?'
      ]
    },
    {
      id: 'ter', category: 'implicit', label: 'TER (spese correnti)',
      unit: "all'anno",
      defaultValue: 0, estimable: false,
      advisorQuestions: [
        'Qual è il TER (spese correnti) annuo di questo prodotto? Dove lo trovo nel KID?',
        'La commissione di gestione è già compresa nel TER o si aggiunge?',
        'Sono previste commissioni di performance? Come si calcolano?'
      ]
    },
    {
      id: 'transaction_costs', category: 'implicit', label: 'Costi di transazione',
      unit: "all'anno",
      defaultValue: 0, estimable: false,
      advisorQuestions: [
        'A quanto ammontano ogni anno i costi di transazione del portafoglio?',
        'Quanto spesso il gestore compra e vende i titoli (rotazione del portafoglio)?',
        'Questi costi sono compresi nel TER o si aggiungono?'
      ]
    },
    {
      id: 'bid_ask_spread', category: 'implicit', label: 'Spread denaro-lettera',
      unit: 'metà quando compri, metà quando vendi',
      defaultValue: 0, estimable: false,
      advisorQuestions: [
        'Qual è la differenza media tra prezzo di acquisto e prezzo di vendita (spread)?',
        'Su quale mercato e a che prezzo verranno eseguiti i miei ordini?',
        'La banca applica commissioni proprie su ogni acquisto o vendita?'
      ]
    },
    {
      id: 'fiscal_drag', category: 'implicit', label: 'Tasse sul guadagno',
      unit: 'aliquota sul guadagno, quando disinvesti',
      defaultValue: 26, defaultNote: "Non indicata nel documento: usiamo l'aliquota italiana standard del 26%."
    },
    {
      id: 'inflation_drag', category: 'implicit', label: 'Inflazione',
      unit: "all'anno",
      defaultValue: 2, defaultNote: "Non indicata nel documento: usiamo l'obiettivo BCE del 2% all'anno."
    }
  ];

  const eurFormat = new Intl.NumberFormat('it-IT', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always'
  });

  CL.fmt = {
    eur: (v) => eurFormat.format(Math.round(v)),
    pct: (v, digits = 2) => v.toLocaleString('it-IT', {
      minimumFractionDigits: digits, maximumFractionDigits: digits
    }) + '%',
    years: (n) => (n === 1 ? '1 anno' : n + ' anni')
  };
})(window.CostBusters);
