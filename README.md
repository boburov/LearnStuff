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

This initial scaffold contains no application features or code copied from SmartLab.
