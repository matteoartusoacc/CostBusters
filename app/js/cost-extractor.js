window.CostBusters = window.CostBusters || {};

(function (CL) {
  const KEYWORDS = {
    entry_load: [
      /commission[ei]\s+di\s+(?:ingresso|sottoscrizione|entrata)/i,
      /cost[oi]\s+di\s+(?:ingresso|sottoscrizione)/i,
      /caricament[oi]\s+(?:sui|sul)\s+prem/i,
      /\b(?:entry|subscription)\s+(?:load|fee|charge)s?/i
    ],
    management_fee: [
      /commission[ei]\s+(?:annu[ae]\s+)?di\s+gestione/i,
      /cost[oi]\s+(?:annu[oi]\s+)?di\s+gestione/i,
      /\bmanagement\s+fees?/i
    ],
    advisory_fee: [
      /commission[ei]\s+(?:annu[ae]\s+)?di\s+consulenza/i,
      /(?:compenso|onorario|fee)\s+(?:di|per\s+la)\s+consulenza/i,
      /\badvisory\s+fees?/i
    ],
    exit_load: [
      /commission[ei]\s+di\s+(?:uscita|rimborso)/i,
      /cost[oi]\s+di\s+(?:uscita|rimborso|riscatto)/i,
      /penal[ei]\s+(?:di|per\s+il)\s+riscatto/i,
      /\b(?:exit|redemption)\s+(?:load|fee|charge)s?/i
    ],
    ter: [
      /\bTER\b/i,
      /total\s+expense\s+ratio/i,
      /spese\s+correnti/i,
      /\bongoing\s+charges?/i
    ],
    transaction_costs: [
      /cost[oi]\s+di\s+(?:transazione|negoziazione)/i,
      /\btransaction\s+costs?/i
    ],
    bid_ask_spread: [
      /\bspread\b/i,
      /\bbid[\s/-]+ask\b/i,
      /denaro[\s-]+lettera/i
    ],
    fiscal_drag: [
      /\baliquota\b/i,
      /\btassazione\b/i,
      /\britenuta\b/i,
      /imposta\s+sostitutiva/i,
      /\btax(?:ation)?\s+rate/i,
      /withholding\s+tax/i
    ],
    inflation_drag: [
      /\binflazione\b/i,
      /\binflation\b/i
    ]
  };

  const PERCENT = /(\d{1,3}(?:[.,]\d{1,3})?)\s?%/g;
  const ZERO_WORDS = /\b(?:nessun[ao]?|assent[ei]|non\s+(?:sono\s+)?(?:previst|applicat|dovut)[aeio]|esent[ei]|none|nil)\b/gi;
  // Sentence ends: "." or ";" followed by whitespace, or a blank line. Decimal points ("1.80") are not followed by space.
  const SENTENCE_END = /[.;](?=\s|$)|\n\s*\n/g;
  const FORWARD_CHARS = 120;
  const BACKWARD_CHARS = 80;
  const SNIPPET_MAX = 200;

  function findKeywordMatches(text) {
    const matches = [];
    Object.keys(KEYWORDS).forEach((id) => {
      KEYWORDS[id].forEach((re) => {
        const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
        for (const m of text.matchAll(global)) {
          matches.push({ id, start: m.index, end: m.index + m[0].length });
        }
      });
    });
    return matches.sort((a, b) => a.start - b.start);
  }

  function valueCandidates(segment) {
    const out = [];
    for (const m of segment.matchAll(PERCENT)) {
      const value = parseFloat(m[1].replace(',', '.'));
      if (value <= 100) out.push({ index: m.index, length: m[0].length, value });
    }
    for (const m of segment.matchAll(ZERO_WORDS)) {
      out.push({ index: m.index, length: m[0].length, value: 0 });
    }
    return out.sort((a, b) => a.index - b.index);
  }

  function cleanSnippet(s) {
    const flat = s.replace(/\s+/g, ' ').trim();
    return flat.length > SNIPPET_MAX ? flat.slice(0, SNIPPET_MAX - 1) + '…' : flat;
  }

  // Look after the keyword first (up to sentence end or the next keyword of another cost type),
  // then before it, so both "commissione di gestione: 1,80%" and "1,80% di commissione di gestione" work.
  function readValueNear(text, match, allMatches, sentenceEnds) {
    let fwdLimit = Math.min(text.length, match.end + FORWARD_CHARS);
    const nextEnd = sentenceEnds.find((p) => p >= match.end);
    if (nextEnd !== undefined) fwdLimit = Math.min(fwdLimit, nextEnd);
    const nextOther = allMatches.find((o) => o.id !== match.id && o.start >= match.end);
    if (nextOther) fwdLimit = Math.min(fwdLimit, nextOther.start);

    const fwd = valueCandidates(text.slice(match.end, fwdLimit));
    if (fwd.length) {
      const hit = fwd[0];
      return { value: hit.value, sourceText: cleanSnippet(text.slice(match.start, match.end + hit.index + hit.length)) };
    }

    let backStart = Math.max(0, match.start - BACKWARD_CHARS);
    const prevEnds = sentenceEnds.filter((p) => p < match.start);
    if (prevEnds.length) backStart = Math.max(backStart, prevEnds[prevEnds.length - 1] + 1);
    const prevOthers = allMatches.filter((o) => o.id !== match.id && o.end <= match.start);
    if (prevOthers.length) backStart = Math.max(backStart, prevOthers[prevOthers.length - 1].end);

    const back = valueCandidates(text.slice(backStart, match.start));
    if (back.length) {
      const hit = back[back.length - 1];
      return { value: hit.value, sourceText: cleanSnippet(text.slice(backStart + hit.index, match.end)) };
    }
    return null;
  }

  CL.extractCosts = function extractCosts(text) {
    const allMatches = findKeywordMatches(text);
    const sentenceEnds = Array.from(text.matchAll(SENTENCE_END), (m) => m.index);

    const items = CL.COST_DEFS.map((def) => {
      let found = null;
      for (const m of allMatches) {
        if (m.id !== def.id) continue;
        found = readValueNear(text, m, allMatches, sentenceEnds);
        if (found) break;
      }
      let source = 'extracted';
      if (!found) source = def.estimable === false ? 'not_estimable' : 'assumed_default';
      return {
        id: def.id,
        category: def.category,
        label: def.label,
        unit: def.unit,
        value: found ? found.value : def.defaultValue,
        source,
        sourceText: found ? found.sourceText : null,
        defaultNote: def.defaultNote,
        advisorQuestions: def.advisorQuestions || []
      };
    });

    return {
      items,
      extractedCount: items.filter((it) => it.source === 'extracted').length
    };
  };
})(window.CostBusters);
