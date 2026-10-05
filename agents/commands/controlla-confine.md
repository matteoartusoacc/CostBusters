---
description: Controlla che nessun testo visibile superi il confine tra educazione finanziaria e consulenza
allowed-tools: Agent, Read, Grep, Glob
model: sonnet
---

Fai verificare il vincolo di prodotto più importante di CostBusters: lo strumento mostra **quanto costa** uno strumento finanziario, mai **se convenga**. Le regole in forma canonica sono in `docs/requirements.md` §5.

Delega il controllo al subagent `auditor-confine` con il tool Agent, così l'analisi avviene con uno sguardo pulito e senza il contesto di questa conversazione — chi ha appena scritto una frase è la persona meno adatta a giudicarla.

Nel prompt dell'agente specifica che deve esaminare tutti i testi visibili all'utente: `app/demo/index.html`, le stringhe generate da `app/demo/js/` (in particolare `glossary.js`, `constants.js` e `app.js`), `app/presentation/index.html` e i file di accompagnamento in `app/demo/samples/`. Ricordagli che i finti prospetti sotto `samples/` possono contenere linguaggio commerciale in modo legittimo, perché sono i documenti analizzati e non messaggi dell'applicazione.

Quando l'agente ha risposto, riporta i rilievi all'utente senza applicare correzioni: una riformulazione di un testo visibile va concordata, non decisa da te. Se non ci sono violazioni, dillo indicando quanti file sono stati esaminati, così il controllo resta verificabile.
