# AGENTS.md

## Cursor Cloud specific instructions

Don Server is a **backend-only**, event-driven multi-agent platform (Node.js + TypeScript, ESM). It exposes a shared HTTP server on `PORT` (default `3001`) that serves both a REST API (`RestGateway`) and a WebSocket chat gateway (`ChatGateway`). There is no frontend/GUI, so testing is terminal-driven (curl / `ws` client).

Standard commands live in `package.json` scripts: `pnpm dev` (tsx watch, hot reload), `pnpm build` (`tsc -b`), `pnpm start` (runs `dist/`), `pnpm lint`, `pnpm format`. Package manager is **pnpm** (see `pnpm-lock.yaml`).

Non-obvious caveats:

- A `.env` is required for any working request. `src/main.ts` only loads `.env` if it exists; without `DON_SERVER_TOKEN` set, `AuthService` returns `auth-not-configured` and every REST/WebSocket request is rejected (401 / close code 1008). Copy it once before running: `cp .env.example .env` (default token is `change-me`). The update script intentionally does not create `.env` so it never clobbers local edits.
- Authenticate requests with `Authorization: Bearer <DON_SERVER_TOKEN>` (or `x-don-token`, or `?token=` on WebSocket). Optional `x-don-user-id` is honored only after a valid token. See `docs/security.md`.
- `pnpm build` runs a `prebuild` hook (`lint:fix` + `prettier --write .`) that can reformat/modify files across the repo. Prefer `pnpm lint` + `npx tsc -b` (or just `pnpm dev`) while iterating to avoid unintended formatting diffs.
- LLM calls go through Ollama (`OllamaProvider`), which is not installed in this environment. Agents that use it (`BacklogAgent`, `PlannerAgent`) fall back to deterministic behavior, so the core `@backlog` flow works fully offline. `@planner` will attempt Ollama and degrade to its fallback.
- `pnpm install` reports ignored build scripts for `esbuild` and `sqlite3`. This is harmless: `tsx`/esbuild run from the prebuilt platform binary, and `sqlite3` is only referenced by the currently-unused `SqliteEventStore` (the app uses `FileEventStore` writing to `data/events.jsonl`).

Quick end-to-end smoke test (server running via `pnpm dev`):

```
curl -s -X POST http://localhost:3001/commands \
  -H "Authorization: Bearer change-me" -H "content-type: application/json" \
  -d '{"conversationId":"conv-hello","content":"@backlog levante o backlog pendente deste projeto"}'
curl -s http://localhost:3001/conversations/conv-hello/events -H "Authorization: Bearer change-me"
```

Expect the command to return `target: backlog-agent`, and the events query to show `human.instruction` → `agent.command` → `agent.started` → `agent.result` → `agent.completed`.
