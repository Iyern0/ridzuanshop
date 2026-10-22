# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

**This repo is single-context.** One `GLOSSARY.md` at the repo root, architecture decisions in `docs/adr/`. There is no `GLOSSARY-MAP.md` and no per-context glossary; do not create them until the first real glossary entry is written.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root, if it exists.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (this repo):

```
/
├── GLOSSARY.md          ← created lazily by /domain-modeling
├── docs/adr/            ← architecture decision records
└── ...
```

Multi-context repos use a root `GLOSSARY-MAP.md` pointing at one `GLOSSARY.md` per context, plus `src/<context>/docs/adr/`. This repo is not one of those.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
