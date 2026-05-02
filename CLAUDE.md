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