---
description: Rigenera i PDF dei documenti di esempio partendo dai file .txt
allowed-tools: Bash, Read, Glob
model: sonnet
---

Rigenera i PDF dei documenti di esempio di CostBusters a partire dai `.txt`. Serve ogni volta che si corregge il testo di un campione: i due formati devono restare allineati, perché la demo dimostra che incollare il testo e caricare il PDF danno lo stesso risultato.

## Stato attuale della cartella

!`ls -la "app/demo/samples"`

## Cosa fare

Per ogni file `.txt` in `app/demo/samples/`, produci il `.pdf` con lo stesso nome:

1. Converti il testo in una pagina HTML che assomigli a un documento finanziario reale: carattere con grazie per il corpo del testo, prima riga come titolo, righe isolate e brevi come intestazioni di sezione in grassetto, margini di circa 2 cm. Un PDF troppo spartano rende la demo meno credibile.
2. Stampa la pagina in PDF con il browser headless, usando `--print-to-pdf` e `--no-pdf-header-footer` (senza quest'ultimo compaiono URL e data, che in demo stonano).
3. Il percorso del browser sta in `COSTBUSTERS_BROWSER`; se non è impostata usa `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
4. Scrivi gli HTML intermedi nella directory temporanea di sessione, non nel progetto. I PDF finali vanno invece in `app/demo/samples/`.

## Il PDF scansionato

`05-pdf-scansionato.pdf` è un caso speciale: dimostra il limite dichiarato sull'OCR e **non deve contenere testo estraibile**. Si ottiene facendo prima uno screenshot a piena pagina di un documento di esempio e poi incorporando quell'immagine in un PDF, così il livello testuale non esiste. Non rigenerarlo da un `.txt`.

## Verifica finale

Dopo la rigenerazione esegui `/verifica-campioni` e controlla che per ogni documento il risultato dal PDF coincida con quello dal testo, e che su `05-pdf-scansionato.pdf` la lettura fallisca ancora con codice `NO_TEXT`.
