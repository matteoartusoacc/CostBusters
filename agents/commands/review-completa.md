---
description: Lancia in parallelo gli auditor di requisiti, invarianti e confine, poi sintetizza i rilievi in un piano prioritizzato
allowed-tools: Agent, Read, Grep, Glob
model: sonnet
---

Esegue la review completa di CostBusters prima di una consegna. Sostituisce la pipeline che prima andava avviata incollando un prompt a mano: qui i revisori sono subagent veri, definiti in `.claude/agents/`.

## Fase 1 — tre revisioni in parallelo

Lancia i tre agenti in **un solo messaggio con tre chiamate al tool Agent**, così lavorano davvero in parallelo e nessuno dei tre vede le conclusioni degli altri:

- `auditor-requisiti` — copertura di FR-1…FR-7, dei requisiti non funzionali §7 e dei criteri di successo §9 di `docs/requirements.md`.
- `revisore-invarianti` — bug di correttezza nei moduli in `app/demo/js/`, a partire dall'invariante del grafico e dal doppio conteggio del TER.
- `auditor-confine` — rispetto del confine educazione/consulenza nei testi visibili.

A ciascuno passa un prompt autonomo: gli agenti partono senza contesto di questa conversazione, quindi spiega cosa cercare e cosa restituire, e chiedi rapporti brevi.

## Fase 2 — verifica numerica

Quando i tre hanno risposto, esegui `/verifica-campioni` per sapere se i numeri attesi sui documenti di esempio tengono ancora. Va dopo, non in parallelo: se emerge una regressione, va letta insieme ai rilievi sul codice, perché spesso ne è la conseguenza visibile.

## Fase 3 — sintesi

Produci un elenco unico e prioritizzato, non quattro rapporti incollati:

1. **Da correggere prima della consegna** — tutto ciò che rompe un criterio di successo della demo, viola il confine educazione/consulenza o falsa un numero mostrato all'utente.
2. **Da correggere se c'è tempo** — rilievi di media gravità e disallineamenti tra codice e documentazione.
3. **Annotato e lasciato così** — i limiti che abbiamo deciso di accettare, con la ragione.

Per ogni voce: file e riga, cosa non funziona, e una stima dell'impegno (S/M/L). Se due agenti segnalano la stessa cosa da angoli diversi, unificala in una voce sola.

Non applicare le correzioni: questo comando produce una diagnosi. Le modifiche si decidono dopo, guardando l'elenco.
