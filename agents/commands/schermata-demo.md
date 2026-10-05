---
description: Apre la demo in browser headless su un documento di esempio e ne cattura lo screenshot in tema chiaro e scuro
argument-hint: "[nome-campione, default 01-fondo-bilanciato]"
allowed-tools: Bash, Read, Glob
model: sonnet
---

Cattura lo stato reale dell'interfaccia di CostBusters dopo un'analisi, in tema chiaro e scuro. Serve perché i controlli numerici non vedono ciò che i test non sanno guardare: etichette che si sovrappongono, testo tagliato, contrasto insufficiente, un grafico che non entra nel suo contenitore.

Campione da analizzare: `$1` — se vuoto usa `01-fondo-bilanciato`.

## Documenti disponibili

!`ls "app/demo/samples"`

## Cosa fare

La demo si apre da `file://` e all'avvio mostra solo il pannello di input: per vedere i risultati va simulata l'analisi.

1. Nella directory temporanea di sessione — **mai nel progetto** — crea una copia di `app/demo/index.html` con due modifiche: un tag `<base>` che punta con URL assoluto alla cartella `app/demo/`, così CSS e script si risolvono, e uno script finale che inserisce il testo del campione nella textarea `#paste-input`, fa clic su `#analyze-btn` e riporta la pagina in cima.
2. Se ti serve vedere una parte specifica, nello stesso script puoi aprire i pannelli a fisarmonica (`.table-view`, `.formula`) o nascondere il pannello di input per mettere a fuoco i risultati.
3. Cattura con il browser headless usando `--screenshot`, `--hide-scrollbars` e una finestra alta (ad esempio `--window-size=1280,2400`) per prendere tutta la pagina. Aggiungi `--virtual-time-budget=3000`: le slide e i riquadri hanno una dissolvenza in entrata e senza attesa la cattura esce semitrasparente.
4. Ripeti con `--force-dark-mode` per il tema scuro, usando una directory di profilo diversa.
5. Il percorso del browser sta in `COSTBUSTERS_BROWSER`; se non è impostata usa `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
6. Apri le immagini e **guardale davvero**, poi riporta cosa vedi.

## Cosa controllare nelle immagini

- Il disclaimer è visibile in cima senza scorrere.
- I quattro riquadri sono nell'ordine valore lordo, costi espliciti, costi impliciti, valore netto, ognuno con la sua descrizione leggibile.
- Il grafico entra nel contenitore, le etichette degli assi non si sovrappongono, il segmento finale non sborda.
- Gli avvisi sui costi non stimabili sono leggibili e il valore netto mostra il simbolo `≤` quando ce ne sono.
- In tema scuro nessun testo sparisce nel fondo e nessun riquadro resta bianco.

Riporta i problemi che vedi con la zona della pagina in cui si trovano. Non correggerli in questo comando: prima si guarda, poi si decide.
