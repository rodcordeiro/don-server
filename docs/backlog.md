# Don Server - Backlog Consolidado

Fonte: `docs/ChatGPT-Don Server.json`, exportado em 2026-07-07.

## Contexto

O Don Server esta sendo estruturado como uma plataforma local de multiagentes orientada a eventos. A arquitetura consolidada separa:

- Gateway: adapta entradas externas, como WebSocket, REST, CLI ou RabbitMQ.
- CommandService: centraliza comandos humanos, cria IDs e publica eventos de dominio.
- EventBus/EventStore: distribui e persiste a historia da execucao.
- AgentRegistry/AgentRouter: registra agentes e entrega comandos ao agente alvo.
- PlannerAgent: usa catalogo de agentes e LLM para gerar plano e delegar subtarefas.
- Providers: encapsulam modelos como Ollama, OpenAI, Claude ou Gemini.
- Domain contracts: padronizam a linguagem comum entre planner, agentes, tools, runtime, auditoria e UI.
- Runtimes e Tools: ainda pendentes, para padronizar execucao, observabilidade, outputs e falhas.

## Decisoes consolidadas

- O agente nao conversa diretamente com o chat; ele publica eventos.
- O chat envia comandos, e comandos viram eventos.
- O comando humano deve ser registrado como `human.instruction` no `CommandService`, nao no Gateway.
- O Gateway deve manter apenas logs tecnicos do canal.
- O prefixo de mencao de agente sera `@`, por exemplo `@planner levante o backlog`.
- Comando sem mencao explicita deve cair no `planner-agent`.
- O servidor deve gerar `conversationId`, `taskId` e `correlationId` quando a entrada externa nao informar esses IDs.
- A persistencia inicial pode usar JSONL para reduzir atrito com bindings nativos do SQLite durante desenvolvimento.
- Tipos compartilhados por mais de um modulo devem ficar em `src/domain`.
- Interfaces usadas por apenas uma classe podem ficar proximas da propria classe.

## Legenda de status

- Concluido: implementado no codigo atual.
- Parcial: existe implementacao inicial, mas ainda nao atende ao contrato esperado.
- Pendente: nao implementado.

## Status atual observado

- `CORE-001` Bootstrap implementado em `src/bootstrap/bootstrap.ts`.
- `CORE-002` EventEnvelope implementado em `src/core/events/event-envelope.ts`.
- `CORE-003` EventBus implementado em `src/core/events/event-bus.ts`.
- `CORE-004` FileEventStore implementado e em uso por `Bootstrap`.
- `CORE-005` AgentRegistry implementado com catalogo via `getCatalog()`.
- `CORE-006` AgentRouter implementado para eventos `agent.command`.
- `CORE-007` CommandParser implementado com mencoes dinamicas via registry.
- `GW-001` WebSocket Gateway implementado em `src/gateway/chat-gateway.ts`.
- `SRV-001` CommandService implementado em `src/services/command-service.ts`.
- `PLAN-001` ProviderRegistry implementado e registra `ollama`.
- `PLAN-002` Agent Catalog implementado em `AgentRegistry.getCatalog()`.
- `PLAN-003` Planner Prompt Builder extraido para arquivo dedicado.
- `PLAN-004` PlannerAgent usa `ExecutionPlan` e `ExecutionStep` do dominio.
- `PLAN-005` Plan Validator dedicado valida JSON, steps obrigatorios, targets conhecidos e plano vazio.
- `AG-001` PlannerAgent existe e delega usando plano tipado.
- `AG-002` SummaryAgent consolida conteudo recebido em `agent.result`.
- `AG-003` BacklogAgent le `docs/backlog.md` e retorna tarefas pendentes/parciais.
- `LLM-001` OllamaProvider implementado.

## Ordem executiva recomendada

1. Preservar o kernel e comunicacao ja concluidos.
2. Criar contratos minimos de dominio antes de refatorar Planner.
3. Desacoplar ProviderRegistry e Prompt Builder.
4. Tornar o Planner validavel com `ExecutionPlan`.
5. Tornar BacklogAgent real para validar o caso `@planner levante o backlog`.
6. Expor consulta historica de eventos antes de UI, replay e metricas.
7. Criar Runtime e Tooling apos contratos e auditoria basica estarem estaveis.

## Sprint 1 - Kernel

Marco: nucleo minimo de eventos, persistencia e registro de agentes.

| ID       | Tarefa                 | Status    | Entregavel validavel                                                                |
| -------- | ---------------------- | --------- | ----------------------------------------------------------------------------------- |
| CORE-001 | Bootstrap da aplicacao | Concluido | `Bootstrap.create()` monta store, bus, registry, agents, router, service e gateway. |
| CORE-002 | EventEnvelope          | Concluido | Contrato base dos eventos.                                                          |
| CORE-003 | EventBus               | Concluido | Publicacao, persistencia opcional e subscribe por tipo ou global.                   |
| CORE-004 | FileEventStore JSONL   | Concluido | Persistencia simples em `data/events.jsonl`.                                        |
| CORE-005 | AgentRegistry          | Concluido | Registro, consulta e catalogo de agentes.                                           |

## Sprint 2 - Comunicacao

Marco: comando humano entra pelo WebSocket, vira eventos e chega ao agente alvo.

| ID       | Tarefa                 | Status    | Entregavel validavel                                          |
| -------- | ---------------------- | --------- | ------------------------------------------------------------- |
| GW-001   | WebSocket Gateway      | Concluido | Recebe mensagens, chama `CommandService` e transmite eventos. |
| SRV-001  | CommandService         | Concluido | Publica `human.instruction` e `agent.command`.                |
| CORE-006 | AgentRouter            | Concluido | Entrega `agent.command` ao agente alvo.                       |
| CORE-007 | CommandParser dinamico | Concluido | Resolve `@agent` ou `@agent-agent` via `AgentRegistry`.       |

## Sprint 3 - Contratos minimos de dominio

Marco: linguagem comum minima para Planner, agentes e tools antes de novas refatoracoes.

| ID      | Tarefa                                  | Status    | Entregavel validavel                                                                                  |
| ------- | --------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| DOM-001 | Criar estrutura `src/domain`            | Concluido | Pastas `planner`, `agents`, `tools` e `commands` criadas sem mover logica ainda.                      |
| DOM-002 | Criar `ExecutionPlan` e `ExecutionStep` | Concluido | Tipos compartilhados para plano e steps, com campos minimos `id`, `target`, `instruction` e `reason`. |
| DOM-003 | Criar `AgentResult`                     | Concluido | Contrato comum com `success`, `message`, `data` e `error`.                                            |
| DOM-004 | Criar `ToolResult`                      | Concluido | Contrato comum com `success`, `output`, `error` e metadados opcionais.                                |
| DOM-005 | Criar contratos de comando              | Concluido | `UserCommand` e `ParsedCommand` movidos/replicados para dominio sem quebrar imports atuais.           |

Critérios de aceite:

- `pnpm build` compila.
- Nenhuma regra de negocio muda.
- Tipos compartilhados deixam de depender de agentes concretos.

## Sprint 4 - Planejamento tipado

Marco: Planner gera plano validado e delega subtarefas com menor acoplamento.

| ID       | Tarefa                      | Status    | Entregavel validavel                                                                 |
| -------- | --------------------------- | --------- | ------------------------------------------------------------------------------------ |
| PLAN-001 | ProviderRegistry minimo     | Concluido | Registry registra `ollama` e permite `providerRegistry.get("ollama")`.               |
| PLAN-002 | Agent Catalog               | Concluido | `registry.getCatalog()` lista nome, descricao, capacidades e exemplos.               |
| PLAN-003 | Planner Prompt Builder      | Concluido | Prompt sai do `PlannerAgent` para `planner-prompt-builder.ts`.                       |
| PLAN-004 | Planner usa `ExecutionPlan` | Concluido | Tipos locais do Planner substituidos por contratos de dominio.                       |
| PLAN-005 | Plan Validator dedicado     | Concluido | Validador externo valida JSON, steps obrigatorios, targets conhecidos e plano vazio. |

Critérios de aceite:

- Enviar `@planner levante o backlog deste projeto` pelo WebSocket.
- Registrar `human.instruction`.
- Registrar `agent.command` para `planner-agent`.
- Planner montar prompt com catalogo de agentes.
- Planner chamar Ollama via ProviderRegistry.
- Planner rejeitar targets inexistentes antes da publicacao.
- Planner publicar `agent.command` apenas para steps validos.

## Sprint 5 - Backlog real e resumo

Marco: o caso de uso principal de backlog deixa de ser fake e passa a ser verificavel no proprio repositorio.

| ID       | Tarefa                                    | Status    | Entregavel validavel                                                                           |
| -------- | ----------------------------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| AG-003.1 | BacklogSource para Markdown               | Concluido | Leitor simples de `docs/backlog.md` retorna secoes e tabelas de tarefas.                       |
| AG-003.2 | BacklogAgent lista tarefas pendentes      | Concluido | `@backlog levante o backlog` retorna tarefas pendentes/parciais por sprint.                    |
| AG-003.3 | BacklogAgent filtra proximas tarefas      | Concluido | Retorna proxima sprint pendente ordenada por dependencia.                                      |
| AG-002.1 | SummaryAgent resume resultados de agentes | Concluido | Recebe resultado de outro agente e publica resumo objetivo.                                    |
| AG-001.1 | Planner delega backlog + resumo           | Concluido | `@planner levante o backlog deste projeto` aciona BacklogAgent e, se necessario, SummaryAgent. |

Critérios de aceite:

- `@backlog levante o backlog` nao retorna texto fake.
- `@planner levante o backlog deste projeto` delega para `backlog-agent`.
- Eventos de comando, resultado e mensagem ficam persistidos.

## Sprint 6 - Consulta historica de eventos

Marco: o sistema passa a expor sua propria historia operacional para debug, UI e auditoria.

| ID      | Tarefa                   | Status   | Entregavel validavel                                             |
| ------- | ------------------------ | -------- | ---------------------------------------------------------------- |
| EVT-001 | EventService             | Pendente | Service consulta eventos por conversation, task e correlation.   |
| EVT-002 | Consulta por conversa    | Pendente | Metodo `listByConversation(conversationId)` exposto via service. |
| EVT-003 | Consulta por task        | Pendente | Metodo `listByTask(taskId)` inclui root task e subtasks.         |
| EVT-004 | Consulta por correlation | Pendente | Metodo `listByCorrelation(correlationId)` exposto via service.   |
| EVT-005 | Timeline ordenada        | Pendente | Retorno ordenado por `createdAt`, com shape estavel para UI/API. |

Critérios de aceite:

- Consultas funcionam sobre `FileEventStore`.
- Consultas nao dependem de WebSocket.
- O retorno preserva `EventEnvelope`.

## Sprint 7 - REST API minima

Marco: clientes externos conseguem enviar comando e consultar historico sem WebSocket.

| ID      | Tarefa                                      | Status   | Entregavel validavel                                             |
| ------- | ------------------------------------------- | -------- | ---------------------------------------------------------------- |
| API-001 | HTTP server minimo                          | Pendente | Servidor HTTP inicializado pelo Bootstrap sem quebrar WebSocket. |
| API-002 | `POST /commands`                            | Pendente | Endpoint reutiliza `CommandService`.                             |
| API-003 | `GET /conversations/:conversationId/events` | Pendente | Endpoint usa `EventService`.                                     |
| API-004 | `GET /tasks/:taskId/events`                 | Pendente | Endpoint usa `EventService`.                                     |
| API-005 | `GET /correlations/:correlationId/events`   | Pendente | Endpoint usa `EventService`.                                     |

Critérios de aceite:

- Gateway REST nao cria regra propria de comando.
- WebSocket continua funcionando.
- Endpoints retornam JSON estavel.

## Sprint 8 - AgentRuntime

Marco: execucao de agentes passa a ser observavel e padronizada fora dos agentes concretos.

| ID      | Tarefa                       | Status   | Entregavel validavel                                                       |
| ------- | ---------------------------- | -------- | -------------------------------------------------------------------------- |
| RUN-001 | AgentRuntime basico          | Pendente | Encapsula chamada ao agente e publica `agent.started` e `agent.completed`. |
| RUN-002 | AgentRuntime captura erro    | Pendente | Excecoes viram `agent.error` sem derrubar o processo.                      |
| RUN-003 | AgentRouter usa AgentRuntime | Pendente | Router deixa de chamar `agent.handle()` diretamente.                       |
| RUN-004 | Medicao de duracao           | Pendente | Eventos de completed/error incluem duracao em ms.                          |
| RUN-005 | Timeout simples por agente   | Pendente | Timeout configuravel publica `agent.error`.                                |

Critérios de aceite:

- Agentes existentes continuam funcionando.
- Falhas de agente geram evento persistido.
- O Gateway recebe eventos de runtime em tempo real.

## Sprint 9 - Tooling inicial

Marco: primeira base de ferramentas executaveis com contrato e auditoria.

| ID       | Tarefa                         | Status   | Entregavel validavel                                                   |
| -------- | ------------------------------ | -------- | ---------------------------------------------------------------------- |
| TOOL-001 | Tool interface                 | Pendente | Interface comum para ferramentas usando `ToolResult`.                  |
| TOOL-002 | ToolRegistry                   | Pendente | Registro e descoberta de ferramentas por nome.                         |
| TOOL-003 | ToolRuntime basico             | Pendente | Publica `tool.started`, `tool.finished` e `tool.error`.                |
| TOOL-004 | FilesystemTool read/list       | Pendente | Lista diretorio e le arquivos permitidos.                              |
| TOOL-005 | ShellTool dry-run ou allowlist | Pendente | Execucao controlada com limites claros antes de comandos reais amplos. |

Critérios de aceite:

- ToolRuntime persiste eventos.
- Tools retornam `ToolResult`.
- Permissoes e limites ficam explicitos.

## Sprint 10 - Agentes de codigo e Git

Marco: agentes com ferramentas reais, ainda em escopo controlado.

| ID       | Tarefa                         | Status   | Entregavel validavel                                              |
| -------- | ------------------------------ | -------- | ----------------------------------------------------------------- |
| AG-004.1 | CodeAgent leitura inicial      | Pendente | Usa FilesystemTool para listar estrutura e resumir contexto.      |
| AG-004.2 | CodeAgent analise de arquivos  | Pendente | Lê arquivos selecionados e retorna achados sem editar.            |
| TOOL-006 | GitTool status/diff            | Pendente | Consulta `git status` e diff sem alterar repositorio.             |
| AG-005.1 | GitAgent status                | Pendente | Usa GitTool para resumir estado do repositorio.                   |
| AG-005.2 | Planner delega analise tecnica | Pendente | Planner consegue acionar CodeAgent/GitAgent quando pedido exigir. |

## Sprint 11 - Providers avancados

Marco: trocar ou escolher LLM sem alterar agentes.

| ID      | Tarefa                     | Status    | Entregavel validavel                                               |
| ------- | -------------------------- | --------- | ------------------------------------------------------------------ |
| LLM-001 | OllamaProvider             | Concluido | Provider local inicial.                                            |
| LLM-002 | Configurar provider padrao | Pendente  | Provider default configuravel por env.                             |
| LLM-003 | Selecao por agente         | Pendente  | Agente pode declarar provider/model preferencial.                  |
| LLM-004 | OpenAIProvider             | Pendente  | Provider OpenAI atras de interface existente.                      |
| LLM-005 | Fallback de provider       | Pendente  | Falha de provider retorna erro controlado ou fallback configurado. |

## Sprint 12 - Auditoria operacional

Marco: eventos persistidos viram material confiavel de analise e recuperacao.

| ID      | Tarefa                             | Status   | Entregavel validavel                                                |
| ------- | ---------------------------------- | -------- | ------------------------------------------------------------------- |
| AUD-001 | Export JSON                        | Pendente | Exporta eventos filtrados por conversation/task/correlation.        |
| AUD-002 | Metricas basicas de execucao       | Pendente | Conta eventos por tipo, agente, status e duracao quando disponivel. |
| AUD-003 | Replay somente leitura de task     | Pendente | Reconstrui timeline de uma task sem reexecutar agentes.             |
| AUD-004 | Replay somente leitura de conversa | Pendente | Reconstrui timeline de uma conversa sem reexecutar agentes.         |
| AUD-005 | Relatorio de falhas                | Pendente | Lista `agent.error` e `tool.error` por periodo/filtro.              |

## Sprint 13 - UI minima

Marco: primeira central visual de comando e observabilidade.

| ID     | Tarefa                | Status   | Entregavel validavel                              |
| ------ | --------------------- | -------- | ------------------------------------------------- |
| UI-001 | Chat WebSocket        | Pendente | Enviar comando e receber eventos em tempo real.   |
| UI-002 | Timeline de conversa  | Pendente | Mostrar eventos de uma conversa via API.          |
| UI-003 | Lista de conversas    | Pendente | Listar conversas conhecidas a partir dos eventos. |
| UI-004 | Detalhe de task       | Pendente | Mostrar root task, subtasks e status.             |
| UI-005 | Estado visual de erro | Pendente | Destacar `agent.error` e `tool.error`.            |

## Sprint 14 - Expansoes futuras

Marco: novas integracoes depois do nucleo estar validado.

| ID       | Tarefa           | Status   | Entregavel validavel                                        |
| -------- | ---------------- | -------- | ----------------------------------------------------------- |
| TOOL-007 | HTTPTool         | Pendente | Chamadas HTTP controladas.                                  |
| TOOL-008 | RabbitMQTool     | Pendente | Consultar filas e publicar mensagens.                       |
| AG-006   | RabbitAgent      | Pendente | Diagnostico RabbitMQ via RabbitMQTool.                      |
| GW-002   | CLI Gateway      | Pendente | Entrada por linha de comando reutilizando `CommandService`. |
| GW-003   | RabbitMQ Gateway | Pendente | Entrada por fila reutilizando `CommandService`.             |

## Proximo passo recomendado

Executar a Sprint 6 para expor consulta historica de eventos.

Motivo: o `BacklogAgent` agora consulta `docs/backlog.md` e o Planner possui caminho deterministico para backlog. O proximo ganho validavel e consultar a historia persistida por conversa, task e correlacao.
