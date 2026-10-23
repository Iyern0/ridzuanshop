# Agent guide — MINUM MALAM SISWA

App-specific rules (`app/src/` is the source; `python tools/build.py` writes `index.html` + `admin.html`; bump `sw.js` on every release; never commit `transit-widget/DESIGN.md`) live in `../README.md`. Current app state is in `DRINKS-ORDER.md`; history is in `WORKLOG.md`.

## Agent skills

### Issue tracker

GitHub issues in `Iyern0/ridzuanshop`, driven with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the repo root, architecture decisions in `docs/adr/`. See `docs/agents/domain.md`.
