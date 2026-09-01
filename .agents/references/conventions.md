# Convencoes de mudanca

## Comandos

| Acao | Comando |
| --- | --- |
| Dev com hot reload | `pnpm dev` |
| Lint | `pnpm lint` |
| Typecheck (sem prebuild) | `pnpm exec tsc -b` |
| Build completo | `pnpm build` (roda lint:fix + prettier antes) |
| Start producao local | `pnpm start` |
| Cliente WS de teste | `pnpm client` |

Preferir `pnpm lint` + `pnpm exec tsc -b` durante iteracao para evitar diffs de formatacao involuntarios.

## Onde colocar codigo novo

- Tipo usado por mais de um modulo → `src/domain`
- Interface usada por uma classe → proximo da classe
- Adaptador de entrada → `src/gateway`
- Orquestracao de caso de uso → `src/services`
- Infra compartilhada (bus, registry, runtime) → `src/core`
- Agente concreto → `src/agents/<nome>/`
- Ferramenta → `src/tools/`

## REST e WebSocket

- Nao duplicar regras de comando nos gateways; reutilizar `CommandService`.
- Preservar shape JSON dos endpoints existentes sem breaking change explicito.
- Autenticar antes de rotas protegidas; ver `docs/security.md`.

## Eventos

- Todo evento segue `EventEnvelope`.
- Falhas de agente/tool devem virar evento persistido, nao derrubar o processo.
- Nao persistir segredos em payloads ou logs.

## LLM

- Providers via `ProviderRegistry`; agentes nao instanciam Ollama/OpenAI diretamente.
- Ollama indisponivel → fallback deterministico em BacklogAgent/PlannerAgent.

## Smoke test manual

Com servidor em `pnpm dev` e `.env` configurado:

```sh
curl -s -X POST http://localhost:3001/commands \
  -H "Authorization: Bearer change-me" -H "content-type: application/json" \
  -d '{"conversationId":"conv-hello","content":"@backlog levante o backlog pendente deste projeto"}'
curl -s http://localhost:3001/conversations/conv-hello/events -H "Authorization: Bearer change-me"
```

Esperado: `target: backlog-agent` e cadeia `human.instruction` → `agent.command` → `agent.started` → `agent.result` → `agent.completed`.
