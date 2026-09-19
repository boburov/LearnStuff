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
Topic pages are explicitly marked as coming soon; lesson content is not implemented.
Biology, lab simulations, 3D/VR engines, AI services, and scientific model assets
are not included. The server remains the minimal health API.

The original JSX components are retained alongside the TypeScript entry point.
Pixelify Sans and Inter are loaded from Google Fonts, with local font fallbacks.
Production hosting should send client routes to `index.html` for SPA navigation.
