---
description: Esegue estrazione costi e calcolo TCO sui documenti di esempio e confronta con i valori attesi
argument-hint: "[nome-campione opzionale, es. 04-polizza-unit-linked]"
allowed-tools: Bash, Read, Glob
model: sonnet
---

Verifica che l'estrazione dei costi e il calcolo del TCO producano ancora i numeri attesi sui documenti di esempio di CostBusters. È il test di regressione del progetto: non esiste un framework di test, questo comando ne fa le veci.

Campione richiesto: `$1` — se è vuoto, verifica tutti i documenti.

## Valori attesi

@app/demo/samples/README.md

## Documenti disponibili

!`ls "app/demo/samples"`

## Cosa fare

I moduli JavaScript sono script classici che popolano `window.CostBusters`, non moduli ES: non si possono eseguire con Node (che su questa macchina non è installato) e vanno caricati in una pagina HTML, aperta in un browser headless.

1. Nella directory temporanea di sessione — **mai dentro il progetto** — scrivi una pagina di prova che includa, in quest'ordine e con URL `file:///` assoluti, `app/demo/js/constants.js`, `app/demo/js/cost-extractor.js` e `app/demo/js/tco-calculator.js`.
2. La pagina carica il testo di ogni campione con una richiesta `file:///`, chiama `CostBusters.extractCosts(testo)` e poi `CostBusters.calculateTCO(items, CostBusters.DEFAULT_ASSUMPTIONS)`, e scrive l'esito in un `<pre>`. Per ogni voce riporta identificativo, valore e origine (`extracted`, `assumed_default`, `not_estimable`).
3. Per ogni orizzonte stampa la differenza `grossValue - explicitCost - implicitCost - netResidual`: deve essere zero a meno dell'errore in virgola mobile. Se non lo è, il grafico a barre impilate sta mentendo e la cosa è grave.
4. Esegui la pagina con il browser headless e `--dump-dom`, con un `--virtual-time-budget` generoso, e serve anche `--allow-file-access-from-files` perché la pagina legge i campioni da disco. Poi estrai il contenuto del `<pre>`.
5. Il percorso del browser sta in `COSTBUSTERS_BROWSER`; se non è impostata usa `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
6. Cancella i file temporanei che hai creato.

Non modificare file del progetto: questo comando verifica, non corregge.

## Come riportare

Una tabella per documento con voci estratte, voci non stimabili, valore netto e costi totali a 10 anni, e per ciascun numero `OK` oppure `atteso X / ottenuto Y`. Poi l'esito dell'invariante.

Se un valore non coincide, distingui **regressione del codice** (documento invariato, numero cambiato) da **tabella dei valori attesi da aggiornare** (documento o ipotesi cambiati di proposito), e lascia la scelta all'utente invece di correggere di tua iniziativa.
