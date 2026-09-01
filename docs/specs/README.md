# Specs — Don Server

Especificacoes consolidadas a partir do estado do repositorio e do backlog (`docs/backlog.md`).

| Spec | Escopo | Status |
| --- | --- | --- |
| [don-server-platform.md](./don-server-platform.md) | Plataforma completa (Sprints 1–26 entregues) | Implementado |
| [sprint-27-expansions.md](./sprint-27-expansions.md) | Integracoes futuras pendentes | Pendente |

## Origem

Geradas via skill `/to-spec` em 2026-09-01, com contexto de revisao Nero (`don-server`, dominio `api`).

## Triage

Label sugerida para agentes: `ready-for-agent` (issue tracker nao configurado neste repositorio — specs versionadas em git).

## Seams de teste (plataforma)

Preferir o seam mais alto possivel:

1. **REST `POST /commands` + `GET /conversations/:id/events`** — cobre auth, CommandService, router, runtime e persistencia.
2. **BacklogAgent via `@backlog`** — cobre parser, agente, leitura Markdown e eventos.
3. **Planner + delegacao** — cobre provider, validator e multiplos `agent.command`.

Novos testes devem comecar pelo seam (1) antes de testar modulos isolados.
