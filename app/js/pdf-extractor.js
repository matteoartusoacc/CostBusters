window.CostBusters = window.CostBusters || {};

(function (CL) {
  // pdf.js 3.x still ships a classic (non-module) build, which is required to work from file://.
  const PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const MIN_TEXT_CHARS = 20;
  let loading = null;

  function pdfError(code, message) {
    const err = new Error(message);
    err.code = code;
    return err;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(pdfError('LIB_LOAD', 'Impossibile caricare ' + src));
      document.head.appendChild(s);
    });
  }

  // Loaded lazily so paste mode makes zero network requests.
  // Loading the worker script on the main thread lets pdf.js run without spawning a cross-origin Worker.
  function ensurePdfJs() {
    if (window.pdfjsLib && window.pdfjsWorker) return Promise.resolve(window.pdfjsLib);
    if (!loading) {
      loading = loadScript(PDFJS_BASE + 'pdf.min.js')
        .then(() => loadScript(PDFJS_BASE + 'pdf.worker.min.js'))
        .then(() => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + 'pdf.worker.min.js';
          return window.pdfjsLib;
        })
        .catch((e) => { loading = null; throw e; });
    }
    return loading;
  }

  CL.extractTextFromPdf = async function extractTextFromPdf(file, onProgress) {
    const pdfjsLib = await ensurePdfJs();
    const data = new Uint8Array(await file.arrayBuffer());

    let doc;
    try {
      // isEvalSupported:false closes the font-eval code path (CVE-2024-4367) present in pdf.js 3.x.
      doc = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
    } catch (e) {
      throw pdfError('UNREADABLE', e && e.message ? e.message : 'PDF non leggibile');
    }

    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      if (onProgress) onProgress(n, doc.numPages);
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      let pageText = '';
      content.items.forEach((item) => {
        if (typeof item.str !== 'string') return;
        pageText += item.str + (item.hasEOL ? '\n' : ' ');
      });
      pages.push(pageText.replace(/[ \t]+/g, ' '));
    }
    doc.destroy();

    const text = pages.join('\n\n').trim();
    if (text.replace(/\s/g, '').length < MIN_TEXT_CHARS) {
      throw pdfError('NO_TEXT', 'Nessun testo estraibile');
    }
    return { text, pageCount: pages.length };
  };
})(window.CostBusters);
