# Documenti per la demo

Documenti preparati ad hoc. Ognuno esiste in due formati: `.txt` da incollare nella scheda «Incolla testo» e `.pdf` da caricare nella scheda «Carica PDF». I due formati danno lo stesso risultato.

I valori attesi si riferiscono alle ipotesi predefinite: 10.000 € investiti, rendimento lordo ipotizzato del 5%, orizzonte di 10 anni. Il valore netto è la cifra grande in cima ai risultati; il valore lordo di riferimento è sempre 16.289 €.

| File | Cosa mostra | Voci trovate | Avvisi «non stimabile» | Valore netto | Costi totali |
|---|---|---|---|---|---|
| `01-fondo-bilanciato` | Fondo comune con TER più alto della commissione di gestione (niente doppio conteggio) | 6 su 9 | Consulenza, spread | ≤ 9.857 € | 6.433 € |
| `02-etf-azionario-globale` | Prodotto a costi bassi, tutti i costi impliciti dichiarati | 5 su 9 | Gestione, consulenza | ≤ 11.632 € | 4.657 € |
| `03-report-consulenza` | Fee di consulenza che si somma ai costi del fondo | 7 su 9 | Transazioni, spread | ≤ 9.211 € | 7.078 € |
| `04-polizza-unit-linked` | Polizza che non dichiara i costi dei fondi sottostanti | 4 su 9 | Consulenza, TER, transazioni, spread | ≤ 10.236 € | 6.053 € |
| `05-pdf-scansionato.pdf` | PDF senza testo (immagine): limite dichiarato, niente OCR | — | — | — | messaggio di errore chiaro |

Quando ci sono costi non stimabili il valore netto è preceduto da «≤»: la cifra vera è più bassa, perché quei costi restano fuori dal calcolo. Vale sia per i costi espliciti sia per quelli impliciti: se il documento non dice quanto vale una voce, il tool non la stima e non la dà per zero — la segnala e suggerisce cosa chiedere al consulente. Fanno eccezione tasse (26%) e inflazione (2%), che hanno un default dichiarato.

## Scaletta suggerita (3 minuti)

1. **Fondo bilanciato (PDF)**: carica il file, leggi la domanda in cima («quanto ti resta tra 10 anni?») e il grafico, poi apri «Da dove viene questo numero» su una voce e la nota sul TER.
2. **Polizza unit-linked (testo incollato)**: mostra l'avviso con i 4 costi non stimabili, il «≤» davanti al valore netto e le domande da porre al consulente.
3. **Cambia un'ipotesi** (ad esempio l'orizzonte a 3 anni o il rendimento): grafico e cifre si aggiornano subito; apri le formule.
4. **PDF scansionato**: mostra che il limite è dichiarato e gestito, non nascosto.

Il caricamento dei PDF scarica la libreria pdf.js da internet: verifica la connessione prima della demo, oppure usa i `.txt`.
