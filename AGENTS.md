# Don Server — AGENTS

Backend-only, event-driven multi-agent platform (Node.js + TypeScript, ESM). Entry: `src/main.ts` → `Bootstrap.start()`.

## Como usar este contexto

| Preciso de… | Leia |
| --- | --- |
| Pastas, modulos e fronteiras | `.agents/references/structure.md` |
| Boot, wiring e ciclo de vida | `.agents/references/runtime.md` |
| Areas de negocio e vocabulario | `.agents/references/domain.md` |
| Regras de mudanca e validacao | `.agents/references/conventions.md` |
| Padroes locais observados | `.agents/references/patterns.md` |
| Divida tecnica e lacunas | `.agents/references/tech-debt.md` |
| Specs do produto | `docs/specs/` |
| Seguranca operacional | `docs/security.md` |
| Backlog e status de tarefas | `docs/backlog.md` |
| Guideline de API (Nero) | skill `$nero` → `references/guidelines/api-guidelines.md` |

## Regras rapidas

- Mudancas localizadas; preserve contratos de evento e endpoints REST sem plano de compatibilidade.
- Gateways adaptam entrada; regras de comando ficam em `CommandService`.
- Tipos compartilhados entre modulos vao em `src/domain`.
- Validar com `pnpm lint` + `pnpm exec tsc -b` durante iteracao; `pnpm build` roda format/lint fix.
- Copie `.env.example` → `.env` antes de testar; sem `DON_SERVER_TOKEN` tudo retorna 401 / WS close 1008.

## Skills condicionais

| Condicao | Skill / pack |
| --- | --- |
| Perguntas estruturais (calls, imports, path) | `$nero-code-graph` (`cg_*`) |
| Conhecimento operacional, decisoes, troubleshooting | `$nero` |
| Backend Node/TypeScript (padroes gerais) | guideline API do `$nero` (traduzir para Nest/Node) |
