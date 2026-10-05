window.CostBusters = window.CostBusters || {};

(function (CL) {
  const NS = 'http://www.w3.org/2000/svg';

  // Stack order from the baseline outward; color follows the entity (see css: --series-*).
  const SERIES = [
    { key: 'explicit', label: 'Costi espliciti', cls: 'seg-explicit', get: (h) => h.explicitCost },
    { key: 'implicit', label: 'Costi impliciti', cls: 'seg-implicit', get: (h) => h.implicitCost },
    { key: 'net', label: 'Valore netto', cls: 'seg-net', get: (h) => h.netResidual }
  ];

  const ROW_H = 60;
  const BAR_H = 24;
  const GAP = 2;
  const RADIUS = 4;
  const MARGIN = { top: 8, right: 150, bottom: 30, left: 64 };

  function svgEl(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach((k) => node.setAttribute(k, attrs[k]));
    if (parent) parent.appendChild(node);
    return node;
  }

  function niceStep(raw) {
    if (!raw || raw <= 0) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / exp;
    const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nice * exp;
  }

  function roundedEndPath(x, y, w, h, r) {
    const rr = Math.min(r, w, h / 2);
    return `M${x},${y} H${x + w - rr} A${rr},${rr} 0 0 1 ${x + w},${y + rr} ` +
      `V${y + h - rr} A${rr},${rr} 0 0 1 ${x + w - rr},${y + h} H${x} Z`;
  }

  function buildTooltip(tooltip, h) {
    tooltip.textContent = '';
    const title = document.createElement('p');
    title.className = 'tt-title';
    title.textContent = 'Dopo ' + CL.fmt.years(h.years);
    tooltip.appendChild(title);
    const total = document.createElement('p');
    total.className = 'tt-row tt-total';
    const tl = document.createElement('span');
    tl.className = 'tt-label';
    tl.textContent = 'Valore lordo';
    const tv = document.createElement('span');
    tv.className = 'tt-value';
    tv.textContent = CL.fmt.eur(h.grossValue);
    total.append(tl, tv);
    tooltip.appendChild(total);
    SERIES.forEach((s) => {
      const row = document.createElement('p');
      row.className = 'tt-row';
      const key = document.createElement('span');
      key.className = 'key key-' + s.key;
      const label = document.createElement('span');
      label.className = 'tt-label';
      label.textContent = s.label;
      const value = document.createElement('span');
      value.className = 'tt-value';
      value.textContent = CL.fmt.eur(s.get(h));
      row.append(key, label, value);
      tooltip.appendChild(row);
    });
  }

  function placeTooltip(container, tooltip, clientX, clientY) {
    const box = container.getBoundingClientRect();
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    let left = clientX - box.left + 14;
    let top = clientY - box.top - th - 10;
    if (left + tw > box.width) left = clientX - box.left - tw - 14;
    if (top < 0) top = clientY - box.top + 16;
    tooltip.style.left = Math.max(0, left) + 'px';
    tooltip.style.top = top + 'px';
  }

  CL.chart = {
    SERIES,

    renderLegend(container) {
      container.textContent = '';
      SERIES.forEach((s) => {
        const item = document.createElement('span');
        item.className = 'legend-item';
        const key = document.createElement('span');
        key.className = 'key key-' + s.key;
        key.setAttribute('aria-hidden', 'true');
        item.append(key, document.createTextNode(s.label));
        container.appendChild(item);
      });
    },

    render(container, perHorizon, opts) {
      container.textContent = '';
      const width = Math.max(360, container.clientWidth);
      const plotH = ROW_H * perHorizon.length;
      const height = MARGIN.top + plotH + MARGIN.bottom;
      const plotW = width - MARGIN.left - MARGIN.right;

      const max = Math.max(...perHorizon.map((h) => h.grossValue));
      const step = niceStep(max / 4);
      const domainMax = Math.ceil(max / step) * step;
      const x = (v) => MARGIN.left + (v / domainMax) * plotW;

      const svg = svgEl('svg', {
        width, height, viewBox: `0 0 ${width} ${height}`, class: 'chart-svg', role: 'img',
        'aria-label': 'Grafico a barre: per ogni orizzonte, il valore lordo diviso in costi espliciti, ' +
          'costi impliciti e valore netto. I dati sono anche nella tabella sotto il grafico.'
      }, container);

      const grid = svgEl('g', { class: 'grid' }, svg);
      for (let v = 0; v <= domainMax + step / 1000; v += step) {
        svgEl('line', { x1: x(v), x2: x(v), y1: MARGIN.top, y2: MARGIN.top + plotH, class: v === 0 ? 'axis-line' : 'grid-line' }, grid);
        const t = svgEl('text', { x: x(v), y: MARGIN.top + plotH + 20, class: 'tick', 'text-anchor': 'middle' }, grid);
        t.textContent = CL.fmt.eur(v);
      }

      const tooltip = document.createElement('div');
      tooltip.className = 'chart-tooltip';
      tooltip.hidden = true;
      container.appendChild(tooltip);

      perHorizon.forEach((h, i) => {
        const rowTop = MARGIN.top + i * ROW_H;
        const cy = rowTop + ROW_H / 2;
        const y = cy - BAR_H / 2;
        const selected = h.years === opts.selectedYears;
        const row = svgEl('g', { class: 'bar-row' + (selected ? ' is-selected' : '') }, svg);

        if (selected) {
          svgEl('rect', { x: 0, y: rowTop + 2, width, height: ROW_H - 4, rx: 6, class: 'row-highlight' }, row);
        }

        const label = svgEl('text', { x: MARGIN.left - 12, y: cy + 4, class: 'row-label', 'text-anchor': 'end' }, row);
        label.textContent = CL.fmt.years(h.years);

        const segments = SERIES.map((s) => ({ s, v: Math.max(0, s.get(h)) })).filter((seg) => seg.v > 0);
        let cursor = 0;
        segments.forEach((seg, j) => {
          const x0 = x(cursor);
          cursor += seg.v;
          const isLast = j === segments.length - 1;
          let w = x(cursor) - x0;
          if (!isLast && w > GAP * 2) w -= GAP;
          if (w <= 0) return;
          if (isLast) {
            svgEl('path', { d: roundedEndPath(x0, y, w, BAR_H, RADIUS), class: 'seg ' + seg.s.cls }, row);
          } else {
            svgEl('rect', { x: x0, y, width: w, height: BAR_H, class: 'seg ' + seg.s.cls }, row);
          }
        });

        if (selected) {
          const costs = h.explicitCost + h.implicitCost;
          const tip = svgEl('text', { x: x(h.grossValue) + 10, y: cy + 4, class: 'tip-label' }, row);
          tip.textContent = CL.fmt.eur(costs) + ' di costi';
        }

        const hit = svgEl('rect', {
          x: 0, y: rowTop, width, height: ROW_H, class: 'hit', tabindex: '0', role: 'button',
          'aria-label': `${CL.fmt.years(h.years)}: valore lordo ${CL.fmt.eur(h.grossValue)}, ` +
            `costi espliciti ${CL.fmt.eur(h.explicitCost)}, costi impliciti ${CL.fmt.eur(h.implicitCost)}, ` +
            `valore netto ${CL.fmt.eur(h.netResidual)}. Premi per selezionare questo orizzonte.`
        }, row);

        const show = (cx, cyClient) => {
          buildTooltip(tooltip, h);
          tooltip.hidden = false;
          placeTooltip(container, tooltip, cx, cyClient);
        };
        hit.addEventListener('mousemove', (e) => show(e.clientX, e.clientY));
        hit.addEventListener('mouseleave', () => { tooltip.hidden = true; });
        hit.addEventListener('focus', () => {
          const r = hit.getBoundingClientRect();
          show(r.left + MARGIN.left + plotW / 2, r.top);
        });
        hit.addEventListener('blur', () => { tooltip.hidden = true; });
        hit.addEventListener('click', () => opts.onSelect(h.years));
        hit.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onSelect(h.years); }
        });
      });
    },

    renderTable(container, perHorizon) {
      container.textContent = '';
      const table = document.createElement('table');
      table.className = 'data-table';
      const head = table.createTHead().insertRow();
      ['Orizzonte', 'Valore lordo', 'Costi espliciti', 'Costi impliciti', 'Valore netto'].forEach((t) => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = t;
        head.appendChild(th);
      });
      const body = table.createTBody();
      perHorizon.forEach((h) => {
        const r = body.insertRow();
        const th = document.createElement('th');
        th.scope = 'row';
        th.textContent = CL.fmt.years(h.years);
        r.appendChild(th);
        [h.grossValue, h.explicitCost, h.implicitCost, h.netResidual].forEach((v) => {
          r.insertCell().textContent = CL.fmt.eur(v);
        });
      });
      container.appendChild(table);
    }
  };
})(window.CostBusters);
