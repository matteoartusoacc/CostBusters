# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: CostBusters — Financial Cost Transparency Tool

Hackathon project (October 2026). Theme: **Financial Inclusion**.

CostBusters analyzes financial prospectuses and investment advisory reports to surface both explicit and implicit costs that ordinary investors typically cannot see or quantify.

> **Design boundary**: The tool shows *what something costs*, not whether to buy it — firmly in financial education, not regulated financial advice.

**Branding**: the name and a few labels/icons nod to the Ghostbusters films (ghost icon, "costi fantasma", "Sai chi chiamare", "Scova i costi"). Keep references subtle — no film logo, no names or quotes — and never let a pun replace a clear financial label.

**Source of truth for scope**: [`docs/requirements.md`](docs/requirements.md) is the canonical functional/non-functional requirements document. `app/use_case.md` is kept only as the original raw input — read `docs/requirements.md` before building the demo or presentation.

## Directory Structure

- `docs/`
  - `requirements.md` — canonical functional/non-functional requirements — read this before building demo or presentation
- `app/` — application source code
  - `use_case.md` — original idea brief (raw, historical — superseded by `docs/requirements.md`)
  - `demo/` — interactive HTML prototype
    - `samples/` — demo documents (`.txt` to paste, `.pdf` to upload); expected results in `samples/README.md`
  - `presentation/` — HTML slide deck for the pitch (Accenture-branded: purple `#a100ff` accent, `>` as the accent mark)
- `.claude/` — Claude Code configuration and process documentation

---

## How We Use Claude Code

This project is built with **Claude Code as the primary development environment**, demonstrating end-to-end AI-assisted development in a hackathon setting.

### Development Phases

| Phase | Claude Code Role |
|-------|-----------------|
| Ideation | Brainstorming, risk analysis, alignment check with theme |
| Architecture | Planning project structure, file layout, tech decisions |
| Implementation | Generating HTML/CSS/JS for demo and presentation |
| Iteration | Reviewing and refining each artifact |
| Documentation | Maintaining CLAUDE.md and process transparency |

### Workflow

1. **Ideation** — Use case scoped via conversation (`app/use_case.md`), then formalized into functional requirements (`docs/requirements.md`)
2. **Planning** — Claude Code proposes structure and approach
3. **Build** — Artifacts generated: demo, presentation, config
4. **Review** — Each file reviewed and refined in dialogue
5. **Presentation** — Claude Code helps articulate the solution narrative

### Key Claude Code Capabilities Showcased

- Rapid scaffolding from a one-paragraph idea to working prototype
- Multi-file coherent generation (demo + presentation share consistent branding)
- Context-aware iteration across the session
- Proactive risk identification (the advice vs. education boundary)

---

## Claude Code Skills

Skills to invoke at each stage of the project (all available globally — nothing to install):

| Skill | When to use | Related requirement / artifact |
|-------|-------------|--------------------------------|
| `dataviz` | **Before** writing any chart code, choosing chart colors, or building stat tiles/legends | FR-5 cost breakdown chart, FR-4 TCO horizons (`app/demo/`) |
| `anthropic-skills:pdf` | Preparing or inspecting sample prospectus PDFs, validating text extraction | FR-1 PDF ingestion (runtime extraction in the demo uses pdf.js via CDN, not this skill) |
| `run` | Launching `app/demo/index.html` / `app/presentation/index.html` to verify a change in the browser | Demo success criteria (`docs/requirements.md` §9) |
| `code-review` | Before considering a demo/presentation file done — hunts correctness bugs | Review phase |
| `simplify` | After a feature works — cleanup for reuse/simplicity, no bug hunting | Iteration phase |
| `anthropic-skills:pptx` | Only if the pitch must also be delivered as a PowerPoint file | `app/presentation/` (HTML deck is the default) |

Not needed for this project: `xlsx`, `docx`, `google-workspace` (no deliverables in those formats), `claude-api` (the demo is client-side HTML/JS with no runtime API calls).

---

## Features to Implement

See [`docs/requirements.md`](docs/requirements.md) for full acceptance criteria per item.

- [x] FR-1 Document ingestion (paste or upload financial prospectus / PDF)
- [x] FR-2 Explicit cost extraction (management fee, entry/exit load, advisory fee)
- [x] FR-3 Implicit cost extraction (TER, bid/ask spread, transaction costs, fiscal drag, inflation drag)
- [x] FR-4 Total Cost of Ownership over horizon (1y, 3y, 5y, 10y)
- [x] FR-5 Visual breakdown chart (explicit vs implicit vs return)
- [x] FR-6 Plain-language explanation of each cost component
- [x] FR-7 Education/advice boundary disclaimer always visible in UI

**Never guess a missing cost.** A value the document states as absent ("commissione di uscita: nessuna") is an extracted 0. A value the document simply omits is flagged `not_estimable`, left out of the calculation, and turned into questions for the user's advisor — so the net figure is shown as an upper bound ("≤"). Only tax (26%) and inflation (2%) fall back to a declared default.

## Running Locally

```
# No build step required — pure HTML/JS
open app/demo/index.html         # interactive prototype
open app/presentation/index.html # pitch deck (arrow keys to navigate)
```

## Tech Stack

- **AI layer**: Claude (Anthropic) — document parsing and cost extraction
- **Frontend**: Vanilla HTML/CSS/JS — zero dependencies, fully portable
- **Privacy**: no data stored, runs client-side
