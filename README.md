# LearnStuff

A fresh startup monorepo with a React client and a Node.js API.

## Structure

- `client/` — React, TypeScript, and Vite.
- `server/` — Express API with a health endpoint.

## Getting started

Requires Node.js 24 or newer and npm.

```sh
npm install
npm run dev
```

Client: http://localhost:5173
API: http://localhost:3001/api/health

Vite forwards `/api` requests to the local server on port 3001.
The server defaults to port 3001. You can copy `server/.env.example` to
`server/.env` to customize it; update the Vite proxy if changing the port.

## Commands

- `npm run dev` — run both workspaces.
- `npm run dev:client` / `npm run dev:server` — run a single workspace.
- `npm run build` — type-check and build the client into `client/dist`.
- `npm run lint` — lint the client and check server JavaScript syntax.
- `npm start` — run the API server. Serve `client/dist` separately for production.

## UI modules

The pixel UI — palette, Pixelify Sans, sprites, buttons, cards, the subject map
and the topic paths — came over from SmartLab along with every subject.

- `client/src/shared/` — pixel components, the shared 3D lab kit, icons, hooks.
- `client/src/modules/home/` — the landing: hero machine, counters, features, steps, call.
- `client/src/modules/subjects/` — the subject registry and its selection screens.
- `client/src/modules/topics/` — the live-topic registry and the full-screen shell.
- `client/src/modules/layout/` — navigation, footer, and not-found page.

Routes: `/`, `/subjects`, `/:subject`, and `/:subject/:topic`. Every topic in
the registry has a live page; they load full-screen, one chunk each, through
`client/src/modules/topics/`.

- Kimyo: davriy jadval, molekulalar, atomlar, pH, gaz qonunlari, 3D laboratoriya
  (`/chemistry/lab`, with `/chemistry/lab-classic` as the single-bench fallback
  for phones).
- Biologiya: hujayra, hujayra studiyasi, DNK, anatomiya, inson atlasi,
  jarrohlik, genetika, tana simulyatori.
- Fizika: to'rt taktli ichki yonuv dvigateli.
- Elektronika: sxema quruvchi.
- Tarix: Registon audio-gid va tarixiy atlas.

Assets: `client/public/models/`, `client/public/sounds/`, `client/public/history/`
and `client/public/draco/`. Sound attribution is preserved in `sounds/lab/SOURCE.md`
and `sounds/engine/SOURCE.md`.

Run `npm run test:lab` for the chemistry engine regression tests.

The original JSX components are retained alongside the TypeScript entry point.
Pixelify Sans carries every piece of interface text and ships with the bundle
(`@fontsource-variable`), so it renders the same on a slow school network as it
does offline. Inter stays for the labels painted into 3D textures.
Production hosting should send client routes to `index.html` for SPA navigation.
