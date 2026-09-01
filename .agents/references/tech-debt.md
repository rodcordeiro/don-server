# Divida tecnica e lacunas

Atualizado com base no checkout e `docs/backlog.md` (2026-09-01).

## Backlog — Sprint 27 pendente

| ID | Item | Notas |
| --- | --- | --- |
| TOOL-007 | HTTPTool | Chamadas HTTP controladas |
| TOOL-008 | RabbitMQTool | Consultar/publicar em filas |
| AG-006 | RabbitAgent real | Hoje preparatorio (`toolConfigured: false`) |
| GW-002 | CLI Gateway | Entrada CLI → CommandService |
| GW-003 | RabbitMQ Gateway | Entrada por fila → CommandService |

## Lacunas fora do backlog formal

| Item | Severidade |
| --- | --- |
| Suite de testes automatizados ausente (`package.json` → test stub) | Alta |
| `SqliteEventStore` presente mas nao usado | Baixa |
| Intro de `docs/backlog.md` ainda menciona runtimes/tools como pendentes | Baixa (texto desatualizado) |
| Issue tracker para specs (`/to-spec`) nao configurado neste repo | Baixa |

## Gaps vs guideline API (Nero)

| Guideline | Estado no repo |
| --- | --- |
| Controllers finos / services com regras | Aplicavel: gateways finos, `CommandService` centraliza comando |
| Testes unitarios + integracao | Ausente |
| Config tipada centralizada | `process.env` lido pontualmente no bootstrap |
| OpenAPI/Swagger | Nao exposto |

## Infra opcional nao configurada

- Ollama local (agentes degradam para fallback)
- RabbitMQ (RabbitAgent e preparatorio)
- CI/CD no repositorio (nao observado)

## Prioridade sugerida

1. Testes nos fluxos criticos (auth, CommandParser, plan validator, BacklogSource)
2. Sprint 27 conforme decisao de escopo (HTTPTool + CLI Gateway sao mais independentes)
3. Atualizar texto introdutorio do backlog
