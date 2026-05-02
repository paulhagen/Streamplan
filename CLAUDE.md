# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev          # dev server at http://localhost:5173
yarn build        # tsc + vite build
yarn lint         # eslint
yarn pull         # fetch Twitch schedule → public/schedule.json (requires .env)
yarn screenshot   # Playwright screenshot of running dev server → schedule.png
```

No test suite exists yet.

## Architecture

**Goal:** Win95-styled Twitch stream schedule for OBS browser source + PNG export.

**Data flow:**
1. `yarn pull` (`src/scripts/fetch-schedule.mjs`) — calls Twitch Helix API, writes `public/schedule.json`
2. App loads `public/schedule.json` via `fetch('/schedule.json')` at runtime (no API calls from browser)
3. `yarn screenshot` (`src/scripts/screenshot.mjs`) — Playwright headless screenshot of the running app

**Key constraints:**
- Fixed 800×750px viewport — set in `main.tsx` GlobalStyles, designed for OBS browser source
- `overflow: hidden` on root — no scrollbars in OBS
- Font: `ms_sans_serif` loaded from `react95` package, applied globally in `main.tsx`

**Styling stack:**
- `react95` — Win95 UI components (`Window`, `WindowHeader`, `WindowContent`, `Button`, `Toolbar`, `Fieldset`, `Hourglass`, etc.)
- `styled-components` + `styleReset` from react95 — base reset, applied in `main.tsx` via `GlobalStyles`
- Tailwind CSS v4 — available but secondary; react95 handles all Win95 chrome
- `index.css` imports Tailwind but still contains Vite default styles (conflict with react95 reset)

**Environment variables** (`.env`, used only by `fetch-schedule.mjs`):
- `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_LOGIN`

**`public/schedule.json` shape:**
```ts
{ channel: string; updatedAt: string; items: Item[] }
// Item: { id, title, category, startTime, endTime, canceled }
```

**Date handling:** `dayjs` with German locale (`de`). `startTime`/`endTime` are ISO 8601 strings.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **streamplan-react95** (83 symbols, 93 relationships, 0 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/streamplan-react95/context` | Codebase overview, check index freshness |
| `gitnexus://repo/streamplan-react95/clusters` | All functional areas |
| `gitnexus://repo/streamplan-react95/processes` | All execution flows |
| `gitnexus://repo/streamplan-react95/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
