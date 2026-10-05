# La cartella `.claude/` di CostBusters

Questa cartella contiene la configurazione di Claude Code per il progetto. Ogni file risponde a un problema che abbiamo incontrato davvero durante lo sviluppo: sotto, per ciascuno, è scritto quale.

```
.claude/
├── README.md               questo file (per chi legge, non per Claude)
├── settings.json           permessi + hook · versionato, condiviso dal team
├── settings.local.json     percorso del browser · specifico della macchina, non versionato
├── agents/                 4 subagent di verifica, delegabili in parallelo
├── commands/               5 slash command per i workflow ripetitivi
└── hooks/                  1 hook che presidia il vincolo critico del prodotto
```

## Agenti (`agents/`)

Quattro revisori indipendenti. Girano in un contesto proprio, quindi non vedono la conversazione in cui il codice è stato scritto: è il motivo per cui li usiamo, perché chi ha appena scritto una cosa è la persona meno adatta a giudicarla.

| Agente | A cosa serve |
|---|---|
| `auditor-requisiti` | Confronta `docs/requirements.md` con il codice. Nasce dal problema opposto a quello che sembra: non "abbiamo implementato tutto?", ma "ciò che il documento promette è davvero ciò che il codice fa?". Diverse volte la risposta è stata no. |
| `revisore-invarianti` | Cerca bug nei calcoli. In particolare un invariante: le tre parti del grafico devono sommare esattamente al valore lordo, altrimenti il grafico a barre impilate mostra proporzioni false. |
| `verificatore-campioni` | Il test di regressione del progetto. Non c'è un framework di test e non c'è Node sulla macchina, quindi la verifica passa da una pagina caricata in un browser headless. |
| `auditor-confine` | Presidia il confine educazione/consulenza (`docs/requirements.md` §5). È il controllo che protegge il progetto dal rischio che lo affonderebbe: dire a un utente se un investimento convenga è consulenza finanziaria, e noi non siamo abilitati a farla. |

## Comandi (`commands/`)

Ognuno di questi è un procedimento che durante lo sviluppo abbiamo rifatto a mano più volte, ricostruendolo ogni volta da zero e sbagliando dettagli diversi.

| Comando | Perché esiste |
|---|---|
| `/verifica-campioni` | L'ho ricostruito a mano cinque volte: caricare i moduli JS in una pagina, eseguire estrazione e calcolo sui documenti di esempio, confrontare con i valori attesi. Tutte le regressioni di estrazione le ha trovate questo controllo. |
| `/rigenera-pdf-campioni` | Ogni documento di esempio esiste in `.txt` e in `.pdf` e i due devono restare allineati, perché la demo dimostra che incollare il testo e caricare il PDF danno lo stesso risultato. Il comando conserva anche il dettaglio non ovvio: senza `--no-pdf-header-footer` i PDF escono con URL e data stampati sopra. |
| `/schermata-demo` | I controlli numerici non vedono le etichette sovrapposte né il contrasto insufficiente. Contiene due dettagli che ci sono costati tempo: serve un `<base>` per far risolvere CSS e script, e serve attendere la dissolvenza in entrata, altrimenti lo screenshot esce semitrasparente. |
| `/controlla-confine` | Delega ad `auditor-confine` il controllo del vincolo di §5 prima di chiudere una modifica ai testi. |
| `/review-completa` | Sostituisce una pipeline che prima era descritta a parole e si avviava incollando un prompt: ora lancia i tre revisori in parallelo, poi la verifica numerica, poi sintetizza in un elenco prioritizzato. |

## Hook (`hooks/`)

Un hook solo, perché è l'unico che si giustifica: `controlla-confine.sh`, su `PostToolUse` per `Edit|Write|MultiEdit`.

Quando un file sotto `app/` viene scritto, lo script cerca espressioni di giudizio («conviene», «vale la pena», «ti consigliamo», «migliore», «peggiore») e, se le trova, esce con codice 2 riportando le righe: il problema torna a Claude, che corregge prima di procedere. I finti prospetti in `app/demo/samples/` sono esclusi, perché lì il linguaggio commerciale è legittimo — sono i documenti analizzati, non messaggi del prodotto.

Due precisazioni di onestà:

- Gira **dopo** la scrittura, non prima. Serve il file su disco per leggerlo, quindi è un rilevatore immediato, non un blocco preventivo.
- Lo script è provato da solo su tutti i file del progetto (zero falsi positivi) e su casi di violazione costruiti ad arte (intercettati). L'attivazione dell'hook richiede però il riavvio della sessione: non è stato possibile vederlo scattare nella sessione in cui è stato scritto.

Niente `jq` e niente Node: il percorso del file si estrae dal JSON con `sed`, e la decisione passa dal codice di uscita invece che da un JSON di risposta. Su una macchina senza Node, un hook che dipende da Node è un hook che non gira.

## Configurazione

`settings.json` è versionato e contiene solo ciò che serve davvero: i permessi per aprire la demo nel browser, quello per `ls` usato dai comandi, e la registrazione dell'hook.

`settings.local.json` non va versionato e contiene `COSTBUSTERS_BROWSER`, il percorso dell'eseguibile di Edge. Sta separato perché cambia da macchina a macchina: è la ragione per cui i due file esistono. Tutti i comandi che usano il browser leggono quella variabile con un valore di ripiego documentato, così funzionano anche su una macchina dove il file locale non c'è.

## Cosa non c'è, e perché

Questa cartella potrebbe essere più ricca. Abbiamo scelto di no:

- **Nessuna skill di progetto.** Le skill convengono quando servono istruzioni caricate su richiesta in base al contesto. Qui ogni procedimento ha un punto d'ingresso preciso e voluto: un comando è la forma giusta.
- **Nessuna status line e nessun output style.** Non avrebbero cambiato il modo in cui abbiamo lavorato.
- **Nessun `.mcp.json`.** Non ci sono servizi esterni da interrogare: la demo è interamente client-side e non ha backend.

Una cartella `.claude/` piena di artefatti mai usati dice qualcosa di sbagliato su come è stato costruito il progetto. Preferiamo sei pezzi che sappiamo spiegare, uno per uno, a dieci che fanno volume.
