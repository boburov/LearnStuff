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

The client selectively reuses SmartLab's pixel UI: its palette, Pixelify Sans font,
sprites, buttons, cards, subject map, and topic selection paths.

- `client/src/shared/` — reusable pixel components, icons, styles helpers, and reveal behavior.
- `client/src/modules/home/` — simple LearnStuff landing sections.
- `client/src/modules/subjects/` — chemistry, physics, electronics, and history selection screens.
- `client/src/modules/layout/` — navigation, footer, and not-found page.

Routes: `/`, `/subjects`, `/:subject`, and `/:subject/:topic`.
The walkable chemistry lab is available at `/chemistry/lab` (`/chemistry/lab-3d`
is an alias). It loads separately from the pixel UI and includes the room model,
equipment, reagent cabinet, reaction simulation, physics, and sounds from SmartLab.
Use WASD to move, the mouse to look and interact, E for the cabinet, and Esc to pause.
The room requires WebGL 2, a keyboard, and a mouse; touch-only devices show a notice.
Other topic pages remain coming-soon previews. Biology, classic/VR lab, AI services,
and unrelated subject engines are not included. The server remains the health API.

Run `npm run test:lab` for the imported chemistry engine regression tests.
Lab implementation: `client/src/modules/lab-room/`.
Assets: `client/public/models/lab-room/`, `client/public/sounds/lab/`, and
`client/public/draco/`. Sound attribution is preserved in `sounds/lab/SOURCE.md`.

The original JSX components are retained alongside the TypeScript entry point.
Pixelify Sans and Inter are loaded from Google Fonts, with local font fallbacks.
Production hosting should send client routes to `index.html` for SPA navigation.
