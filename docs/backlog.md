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
- Cada agente relevante deve ter uma sprint propria de otimizacao e melhoria apos sua primeira entrega funcional.
- A autenticacao inicial deve usar token estatico via variavel de ambiente, evoluindo para JWT/OAuth apenas quando houver necessidade real.

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

| ID      | Tarefa                   | Status    | Entregavel validavel                                             |
| ------- | ------------------------ | --------- | ---------------------------------------------------------------- |
| EVT-001 | EventService             | Concluido | Service consulta eventos por conversation, task e correlation.   |
| EVT-002 | Consulta por conversa    | Concluido | Metodo `listByConversation(conversationId)` exposto via service. |
| EVT-003 | Consulta por task        | Concluido | Metodo `listByTask(taskId)` inclui root task e subtasks.         |
| EVT-004 | Consulta por correlation | Concluido | Metodo `listByCorrelation(correlationId)` exposto via service.   |
| EVT-005 | Timeline ordenada        | Concluido | Retorno ordenado por `createdAt`, com shape estavel para UI/API. |

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

## Sprint 10 - Seguranca de entrada

Marco: fechar acesso anonimo antes de ampliar superficies de API, agentes dinamicos e operacoes sensiveis.

| ID      | Tarefa                         | Status   | Entregavel validavel                                                        |
| ------- | ------------------------------ | -------- | --------------------------------------------------------------------------- |
| SEC-001 | Contrato de autenticacao       | Pendente | Definir payload/token esperado para conexoes WebSocket e futuras APIs.      |
| SEC-002 | Autenticacao no WebSocket      | Pendente | Exigir autenticacao para conexoes WebSocket e bloquear conexoes anonimas.   |
| SEC-003 | Identidade no EventEnvelope    | Pendente | Associar eventos a usuario/origem autenticada sem expor segredo no payload. |
| SEC-004 | Eventos de falha de seguranca  | Pendente | Publicar evento auditavel para tentativa anonima ou token invalido.         |
| SEC-005 | Documentar operacao de segredo | Pendente | Registrar configuracao local segura para token/chave sem commitar segredo.  |

## Sprint 11 - Backlog inteligente

Marco: evoluir o BacklogAgent de leitor deterministico para agente capaz de interpretar solicitacoes e preparar mudancas controladas.

| ID       | Tarefa                       | Status   | Entregavel validavel                                                                |
| -------- | ---------------------------- | -------- | ----------------------------------------------------------------------------------- |
| AG-003.4 | BacklogAgent usa modelo      | Pendente | Usar LLM para interpretar a solicitacao do usuario e retornar o recorte solicitado. |
| AG-003.5 | BacklogAgent adiciona tarefa | Pendente | Criar nova tarefa em `docs/backlog.md` preservando sprint, tabela e formato.        |
| AG-003.6 | BacklogAgent conclui tarefa  | Pendente | Alterar status de uma tarefa para `Concluido` com evento auditavel.                 |
| AG-003.7 | BacklogAgent edita tarefa    | Pendente | Atualizar titulo, status ou entregavel sem corromper a tabela Markdown.             |
| AG-003.8 | BacklogAgent remove tarefa   | Pendente | Remover tarefa existente de forma controlada, com confirmacao ou evento auditavel.  |

## Sprint 12 - Projetos e backlogs centralizados

Marco: sair de um backlog unico local e permitir gestao por projeto, preparando armazenamento centralizado.

| ID      | Tarefa                          | Status   | Entregavel validavel                                                           |
| ------- | ------------------------------- | -------- | ------------------------------------------------------------------------------ |
| PRJ-001 | Contrato de projeto             | Pendente | Definir `projectId`, nome, origem e repositorio associado.                     |
| PRJ-002 | Backlog por projeto             | Pendente | Resolver backlog por `projectId`, mantendo fallback para `docs/backlog.md`.    |
| PRJ-003 | Indice local de projetos        | Pendente | Listar projetos conhecidos e seus backlogs locais.                             |
| PRJ-004 | Backlog centralizado em nuvem   | Pendente | Definir adapter para persistencia remota sem acoplar agente ao provedor.       |
| PRJ-005 | Eventos com contexto de projeto | Pendente | Propagar `projectId` nos fluxos de comando, agente e auditoria quando existir. |

## Sprint 13 - Providers avancados

Marco: trocar ou escolher LLM sem alterar agentes.

| ID      | Tarefa                     | Status    | Entregavel validavel                                               |
| ------- | -------------------------- | --------- | ------------------------------------------------------------------ |
| LLM-001 | OllamaProvider             | Concluido | Provider local inicial.                                            |
| LLM-002 | Configurar provider padrao | Pendente  | Provider default configuravel por env.                             |
| LLM-003 | Selecao por agente         | Pendente  | Agente pode declarar provider/model preferencial.                  |
| LLM-004 | OpenAIProvider             | Pendente  | Provider OpenAI atras de interface existente.                      |
| LLM-005 | Fallback de provider       | Pendente  | Falha de provider retorna erro controlado ou fallback configurado. |

## Sprint 14 - Template e registro dinamico de agentes

Marco: permitir expansao controlada de agentes sem alterar manualmente o bootstrap a cada novo agente.

| ID      | Tarefa                          | Status   | Entregavel validavel                                                         |
| ------- | ------------------------------- | -------- | ---------------------------------------------------------------------------- |
| AGT-001 | Template base de agente         | Pendente | Criar modelo base de agente, similar ao Planner, para novos agentes.         |
| AGT-002 | Contrato de definicao de agente | Pendente | Definir nome, descricao, capacidades, exemplos, provider/model e limites.    |
| AGT-003 | Validacao de definicao          | Pendente | Rejeitar definicoes duplicadas, inseguras ou incompletas.                    |
| AGT-004 | Registro de agentes via chat    | Pendente | Permitir enviar definicao pelo chat e registrar agente em tempo de execucao. |
| AGT-005 | Listagem de agentes dinamicos   | Pendente | Expor catalogo atualizado incluindo agentes registrados em runtime.          |

## Sprint 14.1 - MCP para agentes externos

Marco: permitir que agentes de outras fontes se conectem ao Don Server e aparecam no chat como agentes registraveis.

| ID      | Tarefa                                | Status   | Entregavel validavel                                                                                         |
| ------- | ------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| MCP-001 | MCP para registro de agentes externos | Pendente | Servidor MCP permite que agentes externos se conectem, registrem metadata e sejam expostos no catalogo/chat. |

## Sprint 15 - Auditoria operacional

Marco: eventos persistidos viram material confiavel de analise e recuperacao.

| ID      | Tarefa                             | Status   | Entregavel validavel                                                |
| ------- | ---------------------------------- | -------- | ------------------------------------------------------------------- |
| AUD-001 | Export JSON                        | Pendente | Exporta eventos filtrados por conversation/task/correlation.        |
| AUD-002 | Metricas basicas de execucao       | Pendente | Conta eventos por tipo, agente, status e duracao quando disponivel. |
| AUD-003 | Replay somente leitura de task     | Pendente | Reconstrui timeline de uma task sem reexecutar agentes.             |
| AUD-004 | Replay somente leitura de conversa | Pendente | Reconstrui timeline de uma conversa sem reexecutar agentes.         |
| AUD-005 | Relatorio de falhas                | Pendente | Lista `agent.error` e `tool.error` por periodo/filtro.              |

## Sprint 16 - Agentes tecnicos por dominio

Marco: substituir o CodeAgent generico por agentes especializados por dominio tecnico.

| ID       | Tarefa             | Status   | Entregavel validavel                                                         |
| -------- | ------------------ | -------- | ---------------------------------------------------------------------------- |
| AG-004.1 | BackendAgent       | Pendente | Analisa APIs, services, regras de negocio, contratos e persistencia backend. |
| AG-004.2 | FrontendAgent      | Pendente | Analisa UI web, componentes, estado, integracao e acessibilidade.            |
| AG-004.3 | MobileAgent        | Pendente | Analisa React Native/Expo, navegacao, estado e comportamento mobile.         |
| AG-004.4 | DbaAgent           | Pendente | Analisa schema, queries, indices, migrations e riscos de dados.              |
| AG-004.5 | DevOpsReleaseAgent | Pendente | Analisa build, deploy, ambiente, rollback e confiabilidade operacional.      |

## Sprint 17 - Git e delegacao tecnica

Marco: permitir que agentes tecnicos consultem contexto Git sem cada agente interagir diretamente com Git.

| ID       | Tarefa                         | Status   | Entregavel validavel                                                        |
| -------- | ------------------------------ | -------- | --------------------------------------------------------------------------- |
| TOOL-006 | GitTool status/diff            | Pendente | Consulta `git status` e diff sem alterar repositorio.                       |
| AG-005.1 | GitAgent status                | Pendente | Usa GitTool para resumir estado do repositorio e centraliza permissoes Git. |
| AG-005.2 | Planner delega analise tecnica | Pendente | Planner aciona agentes de dominio e GitAgent quando pedido exigir.          |

## Sprint 18 - SecurityAgent

Marco: criar agente especializado para revisao de seguranca em fluxos, codigo e operacao.

| ID       | Tarefa                        | Status   | Entregavel validavel                                                       |
| -------- | ----------------------------- | -------- | -------------------------------------------------------------------------- |
| AG-007.1 | SecurityAgent metadata        | Pendente | Registrar agente com capacidades de autenticacao, autorizacao e dados.     |
| AG-007.2 | SecurityAgent analise inicial | Pendente | Avaliar riscos de auth, autorizacao, dados sensiveis e superficie exposta. |
| AG-007.3 | SecurityAgent revisa eventos  | Pendente | Identificar eventos com dados sensiveis ou ausencia de identidade.         |
| AG-007.4 | Planner delega seguranca      | Pendente | Planner aciona SecurityAgent quando pedido envolver seguranca.             |
| AG-007.5 | Relatorio de risco            | Pendente | Publicar severidade, evidencia, impacto e recomendacao.                    |

## Sprint 19 - UI minima

Marco: primeira central visual de comando e observabilidade.

| ID     | Tarefa                | Status   | Entregavel validavel                              |
| ------ | --------------------- | -------- | ------------------------------------------------- |
| UI-001 | Chat WebSocket        | Pendente | Enviar comando e receber eventos em tempo real.   |
| UI-002 | Timeline de conversa  | Pendente | Mostrar eventos de uma conversa via API.          |
| UI-003 | Lista de conversas    | Pendente | Listar conversas conhecidas a partir dos eventos. |
| UI-004 | Detalhe de task       | Pendente | Mostrar root task, subtasks e status.             |
| UI-005 | Estado visual de erro | Pendente | Destacar `agent.error` e `tool.error`.            |

## Sprint 20 - Otimizacao do PlannerAgent

Marco: melhorar qualidade de planejamento, delegacao e fallback do Planner.

| ID      | Tarefa                        | Status   | Entregavel validavel                                                 |
| ------- | ----------------------------- | -------- | -------------------------------------------------------------------- |
| OPT-001 | Prompt versionado do Planner  | Pendente | Versionar prompt e registrar mudancas relevantes.                    |
| OPT-002 | Replanejamento controlado     | Pendente | Permitir nova tentativa quando plano vier vazio ou invalido.         |
| OPT-003 | Selecao de agente por score   | Pendente | Considerar capacidades, exemplos e contexto para ordenar candidatos. |
| OPT-004 | Planos com dependencias reais | Pendente | Respeitar `dependsOn` antes de disparar steps dependentes.           |
| OPT-005 | Metricas do Planner           | Pendente | Registrar tempo, provider, modelo e sucesso/falha do plano.          |

## Sprint 21 - Otimizacao do BacklogAgent

Marco: melhorar confiabilidade, edicao e resposta do BacklogAgent.

| ID      | Tarefa                           | Status   | Entregavel validavel                                                     |
| ------- | -------------------------------- | -------- | ------------------------------------------------------------------------ |
| OPT-006 | Parser Markdown resiliente       | Pendente | Preservar tabelas mesmo com colunas extras ou texto entre secoes.        |
| OPT-007 | Validacao antes de editar        | Pendente | Simular mudanca e validar tabela antes de gravar.                        |
| OPT-008 | Diff auditavel de backlog        | Pendente | Publicar resumo de alteracoes antes/depois.                              |
| OPT-009 | Busca semantica de tarefas       | Pendente | Encontrar tarefas por intencao, nao apenas ID literal.                   |
| OPT-010 | Respostas por recorte solicitado | Pendente | Responder por sprint, status, projeto, prioridade ou agente responsavel. |

## Sprint 22 - Otimizacao do SummaryAgent

Marco: tornar consolidacao util em fluxos multiagente.

| ID      | Tarefa                          | Status   | Entregavel validavel                                               |
| ------- | ------------------------------- | -------- | ------------------------------------------------------------------ |
| OPT-011 | Correlacionar resultados filhos | Pendente | Buscar resultados relacionados por `parentTaskId` ou `rootTaskId`. |
| OPT-012 | Resumo por audiencia            | Pendente | Gerar resumo tecnico, executivo ou operacional conforme pedido.    |
| OPT-013 | Destaque de riscos              | Pendente | Extrair riscos, bloqueios e proximos passos dos resultados.        |
| OPT-014 | Limite de verbosidade           | Pendente | Controlar tamanho da resposta final.                               |
| OPT-015 | Evidencias no resumo            | Pendente | Incluir IDs de eventos/tarefas que sustentam a conclusao.          |

## Sprint 23 - Otimizacao dos agentes tecnicos

Marco: melhorar especializacao e consistencia dos agentes Backend, Frontend, Mobile, DBA e DevOps.

| ID      | Tarefa                         | Status   | Entregavel validavel                                                       |
| ------- | ------------------------------ | -------- | -------------------------------------------------------------------------- |
| OPT-016 | Rubricas por dominio           | Pendente | Definir criterios de analise para cada agente tecnico.                     |
| OPT-017 | Saida padronizada de review    | Pendente | Todos os agentes retornam achados, severidade, evidencia e recomendacao.   |
| OPT-018 | Escopo de arquivos por dominio | Pendente | Cada agente sugere arquivos relevantes sem varrer tudo desnecessariamente. |
| OPT-019 | Delegacao cruzada controlada   | Pendente | Agente tecnico pode sugerir outro dominio sem chamar diretamente.          |
| OPT-020 | Testes de roteamento tecnico   | Pendente | Validar que Planner escolhe agentes corretos por tipo de pedido.           |

## Sprint 24 - Otimizacao do GitAgent

Marco: reforcar o GitAgent como fronteira unica de operacoes Git.

| ID      | Tarefa                       | Status   | Entregavel validavel                                     |
| ------- | ---------------------------- | -------- | -------------------------------------------------------- |
| OPT-021 | Politica de comandos Git     | Pendente | Definir comandos permitidos, restritos e proibidos.      |
| OPT-022 | Resumo seguro de diff        | Pendente | Resumir diff sem vazar segredo ou arquivo sensivel.      |
| OPT-023 | Guardrail para escrita Git   | Pendente | Bloquear commit/tag/push sem confirmacao explicita.      |
| OPT-024 | Integracao com SecurityAgent | Pendente | Solicitar revisao de seguranca para operacoes sensiveis. |
| OPT-025 | Auditoria de operacoes Git   | Pendente | Emitir eventos para cada consulta ou acao Git.           |

## Sprint 25 - Otimizacao do SecurityAgent

Marco: amadurecer seguranca como capacidade transversal.

| ID      | Tarefa                     | Status   | Entregavel validavel                                                   |
| ------- | -------------------------- | -------- | ---------------------------------------------------------------------- |
| OPT-026 | Catalogo de riscos         | Pendente | Padronizar severidade, categoria e recomendacao.                       |
| OPT-027 | Politicas por ferramenta   | Pendente | Avaliar Shell, Filesystem, Git, HTTP e RabbitMQ antes de uso sensivel. |
| OPT-028 | Detecção de segredo        | Pendente | Sinalizar tokens, chaves e credenciais em outputs/eventos.             |
| OPT-029 | Checklist de deploy seguro | Pendente | Revisar auth, env, logs, CORS/origem e secrets antes de exposicao.     |
| OPT-030 | Relatorio consolidado      | Pendente | Gerar resumo final com riscos aceitos, mitigados e pendentes.          |

## Sprint 26 - Otimizacao do RabbitAgent

Marco: preparar evolucao operacional do RabbitAgent quando a integracao RabbitMQ existir.

| ID      | Tarefa                | Status   | Entregavel validavel                                                 |
| ------- | --------------------- | -------- | -------------------------------------------------------------------- |
| OPT-031 | Diagnostico de filas  | Pendente | Avaliar tamanho, consumidores, mensagens prontas e nao reconhecidas. |
| OPT-032 | Alertas por limiar    | Pendente | Sugerir alerta quando filas excederem limite configurado.            |
| OPT-033 | Relatorio operacional | Pendente | Resumir riscos e recomendacoes por exchange/fila.                    |
| OPT-034 | Acoes seguras         | Pendente | Bloquear purge/requeue sem confirmacao explicita.                    |
| OPT-035 | Auditoria RabbitMQ    | Pendente | Registrar toda consulta ou acao operacional como evento.             |

## Sprint 27 - Expansoes futuras

Marco: novas integracoes depois do nucleo estar validado.

| ID       | Tarefa           | Status   | Entregavel validavel                                        |
| -------- | ---------------- | -------- | ----------------------------------------------------------- |
| TOOL-007 | HTTPTool         | Pendente | Chamadas HTTP controladas.                                  |
| TOOL-008 | RabbitMQTool     | Pendente | Consultar filas e publicar mensagens.                       |
| AG-006   | RabbitAgent      | Pendente | Diagnostico RabbitMQ via RabbitMQTool.                      |
| GW-002   | CLI Gateway      | Pendente | Entrada por linha de comando reutilizando `CommandService`. |
| GW-003   | RabbitMQ Gateway | Pendente | Entrada por fila reutilizando `CommandService`.             |

## Proximo passo recomendado

Executar a Sprint 7 para expor REST API minima.

Motivo: o `EventService` agora centraliza a consulta historica por conversa, task e correlacao. O proximo ganho validavel e expor esses fluxos por HTTP sem duplicar logica de gateway.
