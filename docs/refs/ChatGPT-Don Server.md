# Don Server

**User:** Anonymous  
**Created:** 7/6/2026 17:09:40  
**Updated:** 7/6/2026 23:18:37  
**Exported:** 7/7/2026 11:03:27  
**Link:** [https://chatgpt.com/c/6a4c0b3c-1008-83e9-a63a-dfc68261b440](https://chatgpt.com/c/6a4c0b3c-1008-83e9-a63a-dfc68261b440)

## Prompt

06/07/2026, 17:10:35

quero instanciar um ollama em um servidor. Mas ainda não consegui entender como fazer para trabalhar com multiagentes para deixá-los rodando de forma independente. Preciso abrir várias instancias de codex/claude/etc ou criar um "software" que instancie eles? não consegui assimilar este ponto. Pode simplificar e exemplificar?

## Response

06/07/2026, 17:09:40

Vou separar a ideia em camadas: modelo, agente e orquestrador. A confusão geralmente nasce porque “rodar vários agentes” não significa necessariamente “abrir várias instâncias do modelo”.

Pense assim:

**Ollama não é o agente. Ollama é o “motor de IA”.**  
O agente é um software seu que usa esse motor para pensar, decidir e executar ações.

A arquitetura mais simples seria:

```txt
[Seu software orquestrador]
        |
        | chama
        v
[Ollama / Claude / OpenAI / Codex]
        |
        v
[Resposta / decisão]
        |
        v
[Ferramentas: shell, arquivos, banco, RabbitMQ, APIs, navegador etc.]
```

Você **não precisa abrir várias instâncias do Ollama** para ter vários agentes. Normalmente você cria **vários processos/workers lógicos** no seu software, cada um com:

```ts
{
  name: "Agente de Código",
  model: "qwen2.5-coder",
  systemPrompt: "Você revisa código TypeScript...",
  tools: ["read_file", "write_file", "run_tests"]
}
```

Outro agente:

```ts
{
  name: "Agente de Monitoramento",
  model: "llama3.1",
  systemPrompt: "Você monitora filas RabbitMQ...",
  tools: ["rabbit_status", "send_teams_alert"]
}
```

E outro:

```ts
{
  name: "Agente de Planejamento",
  model: "mistral",
  systemPrompt: "Você quebra tarefas em subtarefas...",
  tools: ["create_task", "delegate_to_agent"]
}
```

A parte importante: **todos podem chamar o mesmo Ollama**.

```txt
Agente A ─┐
Agente B ─┼──> Ollama rodando no servidor
Agente C ─┘
```

Ollama é chamado via API/CLI e pode servir modelos locais; também há bibliotecas como `ollama-python` e `ollama-js` para integrar sua aplicação com ele. ([GitHub](https://github.com/ollama/ollama?utm_source=chatgpt.com))

## Então onde ficam os multiagentes?

Ficam no seu **orquestrador**.

Exemplo simples:

```txt
RabbitMQ
  |
  v
worker-agents
  |
  ├── AgenteClassificador
  ├── AgenteExecutor
  ├── AgenteRevisor
  └── AgenteNotificador
        |
        v
      Ollama
```

Cada agente é uma rotina independente rodando em loop:

```ts
while (true) {
	const task = await queue.consume('agent.tasks');

	const agent = chooseAgent(task.type);

	const response = await ollama.chat({
		model: agent.model,
		messages: [
			{ role: 'system', content: agent.systemPrompt },
			{ role: 'user', content: task.content },
		],
	});

	await executeToolsIfNeeded(response);
}
```

## Codex, Claude e afins entram onde?

Eles podem ser **provedores de modelo** ou **agentes prontos**, dependendo do uso.

Exemplo conceitual:

```txt
Seu Orquestrador
  |
  ├── usa Ollama local para tarefas baratas
  ├── usa Claude para raciocínio mais forte
  ├── usa OpenAI/Codex para tarefas de código
  └── usa ferramentas próprias para executar ações
```

Claude, por exemplo, suporta tool use: o modelo escolhe uma ferramenta, mas sua aplicação é quem executa a função no mundo real. ([Claude Platform Docs](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview?utm_source=chatgpt.com)) A OpenAI também tem documentação de Agents SDK, modelos, ferramentas e orquestração. ([Plataforma OpenAI](https://platform.openai.com/docs/api-reference/roles/project/list?lang=javascript&utm_source=chatgpt.com))

## Analogia simples

Pense em uma empresa:

```txt
Ollama = cérebro disponível
Agente = funcionário com função específica
Orquestrador = gerente
Ferramentas = computador, terminal, banco, APIs
RabbitMQ = fila de tarefas
```

Você não cria “um cérebro por funcionário”.  
Você cria vários funcionários com instruções diferentes usando o mesmo cérebro.

## Exemplo prático para seu caso

Você poderia ter um serviço chamado `don-agent-server`:

```txt
don-agent-server
  ├── recebe eventos via RabbitMQ
  ├── identifica o tipo de evento
  ├── escolhe qual agente deve atuar
  ├── chama Ollama/Claude/OpenAI
  ├── executa ferramentas permitidas
  └── grava logs/resultados
```

Com agentes assim:

```txt
code-review-agent
  - lê arquivos
  - sugere alterações
  - roda testes

rabbit-monitor-agent
  - consulta filas
  - detecta incidentes
  - envia alerta

planner-agent
  - quebra tarefas grandes
  - delega para outros agentes

memory-agent
  - salva contexto
  - consulta histórico
```

## Resposta direta

Você deve **criar um software que instancia/orquestra agentes**.

Não pense em:

```txt
abrir 10 Ollamas
abrir 10 Claudes
abrir 10 Codex
```

Pense em:

```txt
1 servidor Ollama
1 aplicação orquestradora
N agentes lógicos
N workers/processos se quiser paralelismo
```

A primeira versão poderia ser bem simples:

```txt
RabbitMQ -> Worker Node.js -> Ollama -> Tool Executor -> Resultado
```

Depois você evolui para multiagentes reais.

---

**Sources:**

- [Ollama](https://github.com/ollama/ollama?utm_source=chatgpt.com)
- [Tool use with Claude - Claude Platform Docs](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview?utm_source=chatgpt.com)
- [List project roles | OpenAI API Reference](https://platform.openai.com/docs/api-reference/roles/project/list?lang=javascript&utm_source=chatgpt.com)

## Prompt

06/07/2026, 17:15:42

entendi, e esses multiagentes são disparados sempre que uma task entra na fila? ou eu poderia instanciar estes agentes no momento em que iniciar a aplicação e ir utilizando?

## Response

06/07/2026, 17:14:48

Na verdade, **as duas abordagens existem**, mas uma delas é muito mais utilizada em sistemas distribuídos.

## Modelo 1 — Agentes permanentes (o mais comum)

Você inicia sua aplicação e ela sobe todos os agentes.

```text
┌───────────────────────────────┐
│ don-agent                     │
│                               │
│  ├── PlannerAgent             │
│  ├── CodeAgent                │
│  ├── RabbitMonitorAgent       │
│  ├── DocumentationAgent       │
│  └── MemoryAgent              │
└──────────────┬────────────────┘
               │
        aguardando eventos
               │
         RabbitMQ / WebSocket
```

Cada agente fica "vivo" aguardando trabalho.

Quando chega uma mensagem:

```text
Fila "code-review"

↓
CodeAgent recebe

↓
consulta Ollama

↓
executa ferramentas

↓
responde
```

Esse modelo é excelente porque:

- não precisa criar objetos toda hora;
- mantém memória em RAM (cache);
- mantém conexões abertas (Rabbit, banco, websocket);
- reduz latência.

É praticamente como um microserviço.

---

## Modelo 2 — Agentes efêmeros

Outro modelo é criar o agente somente quando necessário.

```text
Chegou tarefa

↓

new CodeAgent()

↓

processa

↓

destroy
```

Muito usado em:

- AWS Lambda
- Azure Functions
- Kubernetes Jobs
- workers serverless

Vantagem:

- economiza memória

Desvantagem:

- precisa inicializar tudo novamente
- perde contexto

---

# Mas existe um terceiro modelo (que eu acho que combina muito com o Don Agent)

Ao invés de pensar em "instanciar agentes", pense em **registrar agentes**.

Algo como:

```ts
registerAgent({
	name: 'code',
	queue: 'code',
	prompt: '...',
	model: 'qwen2.5-coder',
});

registerAgent({
	name: 'rabbit',
	queue: 'rabbit',
	prompt: '...',
	model: 'llama3',
});
```

Quando o programa inicia:

```text
startup()

↓

carrega configuração

↓

registra agentes

↓

conecta Rabbit

↓

fica escutando
```

Depois:

```text
RabbitMQ
        │
        ▼
Mensagem queue="code"

        │
        ▼
AgentRegistry

        │
        ▼
CodeAgent.handle()
```

Perceba que o agente **já existe**.

---

# O interessante é que um agente pode chamar outro

Imagine que chega uma solicitação:

> "Implemente a autenticação OAuth."

Quem recebe?

```text
PlannerAgent
```

Ele responde:

```text
Essa tarefa precisa de:

- Backend
- Frontend
- Testes
```

Então ele publica três mensagens:

```text
queue.backend

queue.frontend

queue.tests
```

Cada uma será consumida por outro agente.

```text
             Planner
                │
     ┌──────────┼─────────┐
     ▼          ▼         ▼
 Backend     Frontend    Tests
     │          │         │
     └──────────┼─────────┘
                ▼
           MergeAgent
```

Isso é um sistema multiagente de verdade.

---

# No seu caso

Conhecendo o projeto do **Don Agent**, eu faria algo assim:

```text
Don Agent
│
├── AgentRegistry
│
├── Rabbit Connection
│
├── WebSocket Server
│
├── Tool Registry
│
└── Agents
     ├── PlannerAgent
     ├── ShellAgent
     ├── GitAgent
     ├── RabbitAgent
     ├── MonitorAgent
     ├── FinanceAgent
     ├── MinecraftAgent 😄
     └── MemoryAgent
```

Todos esses agentes seriam carregados no startup.

Cada um possui:

```ts
class Agent {
	name;
	model;
	prompt;
	tools;
	memory;

	async handle(event) {}
}
```

E o `AgentRegistry` simplesmente faz:

```ts
registry.dispatch(event);
```

---

## Minha sugestão de evolução

Pela quantidade de projetos que você já está construindo (RabbitMQ, monitoramento, Banky, addons do Minecraft, automações), eu iria um passo além e faria o Don Agent como uma **plataforma de agentes**, não como um agente único.

Algo nessa linha:

```text
don-agent/
├── core/
│   ├── Agent
│   ├── Registry
│   ├── Tool
│   ├── Memory
│   └── EventBus
│
├── providers/
│   ├── Ollama
│   ├── OpenAI
│   ├── Claude
│   └── Gemini
│
├── agents/
│   ├── planner
│   ├── code
│   ├── rabbit
│   ├── monitor
│   ├── git
│   └── ...
│
└── plugins/
```

Com isso, adicionar um novo agente passaria a ser simplesmente criar uma classe e registrá-la. O restante da infraestrutura (filas, ferramentas, provedores de IA, memória e comunicação entre agentes) já estaria pronto. É uma arquitetura que cresce bem conforme você adiciona novos domínios e capacidades.

## Prompt

06/07/2026, 17:20:21

entendi, entendi. E como faria para os agentes disponibilizarem eventos, para que eu possa tratar como um chat para acompanhar os eventos e comunicação entre agentes? e também enviar instruções via chat? Vi alguns exemplos usando telegram e gostaria de construir algo meu assim

## Response

06/07/2026, 17:19:29

Você cria um **Event Bus interno** e pluga nele uma interface de chat própria.

A ideia:

```text
Usuário no chat
   │
   ▼
WebSocket/API
   │
   ▼
Event Bus
   │
   ├── AgentMessage
   ├── AgentThinking
   ├── ToolStarted
   ├── ToolFinished
   ├── TaskCreated
   ├── TaskCompleted
   └── HumanInstruction
```

Cada agente publica eventos enquanto trabalha:

```ts
eventBus.emit({
	type: 'agent.message',
	agent: 'planner',
	taskId: 'task-123',
	content: 'Vou dividir essa tarefa entre backend e testes.',
});
```

O chat só assina esses eventos e mostra na tela.

```text
Planner: Vou dividir essa tarefa...
BackendAgent: Começando alteração no auth...
ShellTool: Executando npm test...
TestAgent: 3 testes falharam...
```

E o caminho inverso também existe:

```text
Chat do usuário
   │
   ▼
"Pare essa tarefa"
   │
   ▼
HumanInstruction
   │
   ▼
Agente / Orquestrador
```

Exemplo de evento enviado pelo chat:

```ts
eventBus.emit({
	type: 'human.instruction',
	taskId: 'task-123',
	target: 'backend-agent',
	content: 'Não altere o banco agora, apenas gere o plano.',
});
```

## Arquitetura simples

```text
┌──────────────┐
│ Frontend Web │
└──────┬───────┘
       │ WebSocket
       ▼
┌─────────────────────┐
│ Chat Gateway         │
│ /ws                  │
│ /api/messages        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Event Bus            │
└──────┬──────────────┘
       │
       ├── PlannerAgent
       ├── CodeAgent
       ├── ShellAgent
       ├── GitAgent
       └── MonitorAgent
```

## Tipos de eventos

Eu começaria com estes:

```ts
type AgentEvent =
	| {
			type: 'task.created';
			taskId: string;
			title: string;
			createdBy: 'user' | 'agent';
	  }
	| {
			type: 'agent.message';
			taskId: string;
			agent: string;
			content: string;
	  }
	| {
			type: 'agent.tool.started';
			taskId: string;
			agent: string;
			tool: string;
			input?: unknown;
	  }
	| {
			type: 'agent.tool.finished';
			taskId: string;
			agent: string;
			tool: string;
			output?: unknown;
	  }
	| {
			type: 'agent.error';
			taskId: string;
			agent: string;
			error: string;
	  }
	| {
			type: 'task.completed';
			taskId: string;
			result: string;
	  }
	| {
			type: 'human.instruction';
			taskId: string;
			target?: string;
			content: string;
	  };
```

## Fluxo completo

Usuário envia no chat:

```text
Revise o projeto e rode os testes.
```

Backend recebe:

```ts
eventBus.emit({
	type: 'task.created',
	taskId,
	title: 'Revise o projeto e rode os testes',
	createdBy: 'user',
});
```

Planner publica:

```ts
eventBus.emit({
	type: 'agent.message',
	taskId,
	agent: 'planner',
	content: 'Vou inspecionar o projeto e delegar os testes ao TestAgent.',
});
```

TestAgent publica:

```ts
eventBus.emit({
	type: 'agent.tool.started',
	taskId,
	agent: 'test-agent',
	tool: 'shell',
	input: 'npm test',
});
```

Chat mostra:

```text
[planner] Vou inspecionar o projeto...
[test-agent] Executando ferramenta shell: npm test
[test-agent] Testes finalizados: 2 falhas
```

## Implementação mínima com WebSocket

```ts
import { WebSocketServer } from 'ws';
import { EventEmitter } from 'node:events';

const eventBus = new EventEmitter();
const wss = new WebSocketServer({ port: 3001 });

wss.on('connection', socket => {
	const sendToClient = event => {
		socket.send(JSON.stringify(event));
	};

	eventBus.on('agent.event', sendToClient);

	socket.on('message', raw => {
		const message = JSON.parse(raw.toString());

		eventBus.emit('agent.event', {
			type: 'human.instruction',
			taskId: message.taskId,
			target: message.target,
			content: message.content,
			createdAt: new Date().toISOString(),
		});
	});

	socket.on('close', () => {
		eventBus.off('agent.event', sendToClient);
	});
});
```

Um agente publicando eventos:

```ts
class PlannerAgent {
	constructor(private eventBus: EventEmitter) {}

	async handle(task: { id: string; content: string }) {
		this.eventBus.emit('agent.event', {
			type: 'agent.message',
			taskId: task.id,
			agent: 'planner',
			content: 'Vou analisar a tarefa e criar um plano.',
			createdAt: new Date().toISOString(),
		});

		// chama Ollama, Claude etc.
	}
}
```

## Para produção, eu separaria em duas camadas

```text
Event Bus local: EventEmitter / BullMQ / RabbitMQ
Chat Gateway: WebSocket / SSE
```

Exemplo:

```text
Agentes
  │
  ▼
RabbitMQ topic: agent.events
  │
  ▼
Chat Gateway
  │
  ▼
WebSocket
  │
  ▼
Seu frontend
```

Assim, seus agentes podem rodar em processos diferentes, servidores diferentes ou containers diferentes.

## RabbitMQ ficaria excelente aqui

Você poderia ter exchanges assim:

```text
agent.tasks
agent.events
agent.commands
```

Com routing keys:

```text
task.created
agent.planner.message
agent.code.tool.started
agent.code.tool.finished
human.instruction
task.completed
```

Fluxo:

```text
Frontend Chat
   │
   ▼
Chat Gateway
   │ publica
   ▼
agent.commands / human.instruction
   │
   ▼
Orchestrator
   │ delega
   ▼
agent.tasks
   │
   ▼
Agents
   │ publicam
   ▼
agent.events
   │
   ▼
Chat Gateway
   │ transmite
   ▼
Frontend Chat
```

## Resumo

Você não precisa usar Telegram. O Telegram é só uma interface pronta.

Para criar o seu próprio, faça:

```text
1. Event Bus
2. Padrão de eventos
3. WebSocket Gateway
4. Frontend de chat
5. Entrada de comandos do usuário
6. Agentes publicando tudo que fazem
```

A peça central é esta:

```text
Agente não fala diretamente com o chat.
Agente publica evento.
Chat escuta evento.
Usuário envia comando.
Comando vira evento.
```

Esse desenho deixa seu Don Agent muito mais poderoso, porque o “chat” deixa de ser apenas conversa e vira uma **central de comando observável dos agentes**.

## Prompt

06/07/2026, 17:27:43

ao enviar um comando, como definiria qual agente deve receber o evento?

## Response

06/07/2026, 17:26:49

Você define isso com uma camada de **roteamento** antes de entregar o comando ao agente.

```text
Chat
  ↓
CommandRouter
  ↓
Agente correto
```

Existem 4 formas comuns.

## 1. Usuário escolhe explicitamente

No chat você permite algo como:

```text
/code revise este arquivo
/rabbit verifique filas travadas
/planner crie um plano para implementar OAuth
```

Ou no payload:

```ts
{
  type: "human.instruction",
  target: "code-agent",
  content: "Revise este arquivo"
}
```

O router faz:

```ts
const agent = registry.get(event.target);
await agent.handle(event);
```

Esse é o melhor caminho para começar.

## 2. Canal por agente

Cada agente tem uma “sala” ou contexto próprio:

```text
#planner
#code
#rabbit
#monitor
```

Se o usuário manda mensagem no canal `#rabbit`, o `RabbitAgent` recebe.

```ts
const agentByChannel = {
	'#planner': 'planner-agent',
	'#code': 'code-agent',
	'#rabbit': 'rabbit-agent',
};
```

## 3. Roteamento por intenção

O usuário escreve livremente:

```text
Verifique se tem fila parada no RabbitMQ.
```

Um `RouterAgent` ou classificador decide:

```ts
{
  target: "rabbit-agent",
  confidence: 0.94,
  reason: "Mensagem fala sobre filas RabbitMQ."
}
```

Aí ele publica:

```ts
eventBus.emit('agent.command', {
	target: 'rabbit-agent',
	content: userMessage,
});
```

## 4. Planner decide e delega

Para tarefas mais abertas, tudo entra no `PlannerAgent`.

```text
Usuário: Revise o projeto, rode os testes e me diga o que quebraria em produção.
```

O planner decide:

```text
CodeAgent → revisar código
TestAgent → rodar testes
RiskAgent → avaliar impacto
```

Esse é o modelo multiagente mais flexível.

---

## Minha recomendação para o Don Agent

Comece com **roteamento explícito + fallback para planner**.

```ts
async function routeCommand(command: HumanInstruction) {
	if (command.target) {
		return registry.get(command.target).handle(command);
	}

	if (command.content.startsWith('/code')) {
		return registry.get('code-agent').handle(command);
	}

	if (command.content.startsWith('/rabbit')) {
		return registry.get('rabbit-agent').handle(command);
	}

	return registry.get('planner-agent').handle(command);
}
```

Fluxo:

```text
/code revisar função
   ↓
CodeAgent

/rabbit verificar filas
   ↓
RabbitAgent

"Preciso melhorar o deploy do sistema"
   ↓
PlannerAgent decide
```

## Exemplo com evento

Entrada pelo chat:

```ts
{
  type: "human.instruction",
  conversationId: "conv-123",
  taskId: "task-456",
  target: "rabbit-agent",
  content: "Verifique filas com mais de 5 mensagens"
}
```

Router:

```ts
const agent = registry.get(event.target ?? 'planner-agent');

await agent.handle(event);
```

Para primeira versão, eu faria assim:

```text
Comando com /prefixo → agente específico
Comando sem /prefixo → PlannerAgent
```

Simples, previsível e evolui bem depois para classificação automática.

## Prompt

06/07/2026, 17:35:44

saquei, saquei. Para o prefixo vou usar @, como mencionamento. E como faria para que o planner agent disparasse o evento para outros agentes? e o output de ferramentas?

## Response

06/07/2026, 17:34:50

Sim. Com `@` fica bem natural:

```text id="m762tk"
@code revise este arquivo
@rabbit verifique filas travadas
@planner crie um plano de deploy
```

O `PlannerAgent` não chama outro agente diretamente. Ele **publica comandos no Event Bus**.

```text id="2alvzn"
Usuário
  ↓
@planner revise o projeto e rode testes
  ↓
PlannerAgent
  ↓
publica comandos
  ↓
CodeAgent / TestAgent / GitAgent
```

Exemplo de evento que o Planner dispara:

```ts id="bpzz6r"
eventBus.emit('agent.command', {
	type: 'agent.command',
	taskId: 'task-123',
	parentTaskId: 'task-000',
	from: 'planner-agent',
	target: 'code-agent',
	content: 'Revise a estrutura do projeto e encontre possíveis problemas.',
	createdAt: new Date().toISOString(),
});
```

Outro:

```ts id="51iqba"
eventBus.emit('agent.command', {
	type: 'agent.command',
	taskId: 'task-124',
	parentTaskId: 'task-000',
	from: 'planner-agent',
	target: 'test-agent',
	content: 'Rode os testes e resuma falhas relevantes.',
	createdAt: new Date().toISOString(),
});
```

Aí o router entrega:

```ts id="8kzhnq"
eventBus.on('agent.command', async event => {
	const agent = registry.get(event.target);

	await agent.handle(event);
});
```

## E o output das ferramentas?

Tool output também deve virar evento.

```text id="vzn1xl"
TestAgent
  ↓
usa ShellTool
  ↓
ShellTool publica output
  ↓
Chat exibe
  ↓
TestAgent recebe resultado
  ↓
TestAgent resume
```

Exemplo:

```ts id="z3lng8"
eventBus.emit('agent.tool.started', {
	type: 'agent.tool.started',
	taskId: 'task-124',
	agent: 'test-agent',
	tool: 'shell',
	input: {
		command: 'npm test',
	},
	createdAt: new Date().toISOString(),
});
```

Depois:

```ts id="hk63e5"
eventBus.emit('agent.tool.finished', {
	type: 'agent.tool.finished',
	taskId: 'task-124',
	agent: 'test-agent',
	tool: 'shell',
	output: {
		exitCode: 1,
		stdout: '...',
		stderr: '2 tests failed',
	},
	createdAt: new Date().toISOString(),
});
```

O chat pode mostrar isso como:

```text id="opg95f"
[test-agent] Executando: npm test
[shell] Finalizado com erro: 2 tests failed
[test-agent] Detectei falhas nos testes de autenticação.
```

## Fluxo completo

```text id="xfdavt"
@planner revisar projeto e rodar testes
    ↓
PlannerAgent gera plano
    ↓
agent.command → code-agent
agent.command → test-agent
    ↓
CodeAgent publica agent.message
TestAgent publica agent.tool.started
ShellTool publica agent.tool.finished
    ↓
TestAgent publica agent.result
CodeAgent publica agent.result
    ↓
PlannerAgent escuta resultados filhos
    ↓
PlannerAgent publica resposta final
```

## Evento de resultado de agente

Cada agente, ao terminar, publica:

```ts id="ehwuah"
eventBus.emit('agent.result', {
	type: 'agent.result',
	taskId: 'task-124',
	parentTaskId: 'task-000',
	agent: 'test-agent',
	status: 'completed',
	result: 'Os testes falharam em auth.service.spec.ts.',
	createdAt: new Date().toISOString(),
});
```

O `PlannerAgent` escuta os resultados das subtarefas:

```ts id="sdwj64"
eventBus.on('agent.result', async result => {
	if (result.parentTaskId !== plannerTaskId) return;

	results.push(result);

	if (allSubtasksCompleted(results)) {
		await publishFinalAnswer(results);
	}
});
```

## Modelo mental

Use três tipos principais de evento:

```text id="rthxxv"
agent.command  → manda agente fazer algo
agent.message  → agente comunica progresso
agent.result   → agente concluiu algo
```

E para ferramentas:

```text id="pwqsfx"
agent.tool.started
agent.tool.output
agent.tool.finished
agent.tool.error
```

## Estrutura que eu usaria

```ts id="wc0bpg"
type AgentCommand = {
	type: 'agent.command';
	id: string;
	taskId: string;
	parentTaskId?: string;
	from: string;
	target: string;
	content: string;
};

type AgentResult = {
	type: 'agent.result';
	taskId: string;
	parentTaskId?: string;
	agent: string;
	status: 'completed' | 'failed';
	result: string;
};

type ToolFinished = {
	type: 'agent.tool.finished';
	taskId: string;
	agent: string;
	tool: string;
	output: unknown;
};
```

O mais importante:

```text id="9g3ncq"
Planner não chama agente.
Planner publica comando.

Agente não escreve direto no chat.
Agente publica evento.

Ferramenta não retorna só internamente.
Ferramenta publica output e também retorna para o agente.
```

Assim você ganha duas coisas ao mesmo tempo:

```text id="voycxh"
1. O agente consegue continuar trabalhando com o resultado.
2. O chat consegue acompanhar tudo em tempo real.
```

## Prompt

06/07/2026, 17:40:45

e como faria para o planner disparar o evento? exemplifique na classe como ficaria o código disso

## Response

06/07/2026, 17:39:52

A ideia é o `PlannerAgent` receber o comando, criar subtarefas e publicar eventos `agent.command` no `EventBus`.

Exemplo simples em TypeScript:

```ts
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

type AgentCommand = {
	type: 'agent.command';
	id: string;
	taskId: string;
	parentTaskId?: string;
	from: string;
	target: string;
	content: string;
	createdAt: string;
};

type HumanInstruction = {
	type: 'human.instruction';
	taskId: string;
	from: 'user';
	content: string;
};

export class PlannerAgent {
	constructor(private readonly eventBus: EventEmitter) {}

	async handle(event: HumanInstruction) {
		this.publishMessage(event.taskId, 'Recebi a tarefa. Vou quebrar em subtarefas.');

		const subtasks = [
			{
				target: 'code-agent',
				content: 'Analise a estrutura do projeto e encontre possíveis problemas.',
			},
			{
				target: 'test-agent',
				content: 'Execute os testes do projeto e resuma as falhas encontradas.',
			},
			{
				target: 'doc-agent',
				content: 'Verifique se a documentação está coerente com o código atual.',
			},
		];

		for (const subtask of subtasks) {
			this.dispatchCommand({
				parentTaskId: event.taskId,
				target: subtask.target,
				content: subtask.content,
			});
		}

		this.publishMessage(event.taskId, 'Subtarefas enviadas para os agentes responsáveis.');
	}

	private dispatchCommand(params: { parentTaskId: string; target: string; content: string }) {
		const command: AgentCommand = {
			type: 'agent.command',
			id: randomUUID(),
			taskId: randomUUID(),
			parentTaskId: params.parentTaskId,
			from: 'planner-agent',
			target: params.target,
			content: params.content,
			createdAt: new Date().toISOString(),
		};

		this.eventBus.emit('agent.command', command);
	}

	private publishMessage(taskId: string, content: string) {
		this.eventBus.emit('agent.message', {
			type: 'agent.message',
			taskId,
			agent: 'planner-agent',
			content,
			createdAt: new Date().toISOString(),
		});
	}
}
```

O router escutaria esses comandos:

```ts
eventBus.on('agent.command', async command => {
	const agent = registry.get(command.target);

	if (!agent) {
		eventBus.emit('agent.error', {
			type: 'agent.error',
			taskId: command.taskId,
			agent: command.target,
			error: `Agente não encontrado: ${command.target}`,
			createdAt: new Date().toISOString(),
		});

		return;
	}

	await agent.handle(command);
});
```

Exemplo de uso:

```ts
const eventBus = new EventEmitter();

const planner = new PlannerAgent(eventBus);

await planner.handle({
	type: 'human.instruction',
	taskId: randomUUID(),
	from: 'user',
	content: 'Revise o projeto, rode os testes e veja a documentação.',
});
```

O ponto central é este:

```ts
this.eventBus.emit('agent.command', command);
```

É essa linha que faz o `PlannerAgent` “disparar” uma tarefa para outro agente.

## Prompt

06/07/2026, 17:47:20

saquei, mas no caso de eu enviar um comando para o planner, como o agente processaria e devolveria quais agentes devem ser acionados? e como acionaria? Siga o exemplo:

> @planner, levante o backlog pendente deste projeto

## Response

06/07/2026, 17:46:28

Nesse caso o `PlannerAgent` faria 3 coisas:

1. interpreta a intenção;
2. decide quais agentes acionar;
3. publica `agent.command` para eles.

Exemplo:

```text
@planner levante o backlog pendente deste projeto
```

O Planner poderia decidir:

```ts
[
	{
		target: 'project-agent',
		reason: 'Precisa identificar o projeto atual e suas fontes.',
	},
	{
		target: 'backlog-agent',
		reason: 'Precisa consultar tarefas pendentes.',
	},
	{
		target: 'summary-agent',
		reason: 'Precisa consolidar o resultado para o usuário.',
	},
];
```

Classe simplificada:

```ts
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

type AgentCommand = {
	type: 'agent.command';
	id: string;
	taskId: string;
	parentTaskId: string;
	from: string;
	target: string;
	content: string;
	context?: Record<string, unknown>;
	createdAt: string;
};

type HumanInstruction = {
	type: 'human.instruction';
	taskId: string;
	from: 'user';
	content: string;
};

export class PlannerAgent {
	constructor(private readonly eventBus: EventEmitter) {}

	async handle(event: HumanInstruction) {
		this.say(event.taskId, 'Vou levantar o backlog pendente deste projeto.');

		const plan = await this.createPlan(event.content);

		this.say(event.taskId, `Plano criado. Vou acionar: ${plan.map(p => p.target).join(', ')}.`);

		for (const step of plan) {
			this.dispatch({
				parentTaskId: event.taskId,
				target: step.target,
				content: step.content,
				context: {
					originalRequest: event.content,
					reason: step.reason,
				},
			});
		}
	}

	private async createPlan(userRequest: string) {
		// Primeira versão: regra simples.
		// Depois isso pode ser feito com Ollama/Claude.
		if (userRequest.toLowerCase().includes('backlog')) {
			return [
				{
					target: 'project-agent',
					reason: 'Identificar o projeto atual.',
					content:
						'Identifique o projeto atual, repositório, board e fontes de backlog disponíveis.',
				},
				{
					target: 'backlog-agent',
					reason: 'Consultar tarefas pendentes.',
					content: 'Levante todas as tarefas pendentes do projeto atual.',
				},
				{
					target: 'summary-agent',
					reason: 'Consolidar resposta final.',
					content: 'Aguarde os resultados dos agentes filhos e gere um resumo do backlog pendente.',
				},
			];
		}

		return [
			{
				target: 'general-agent',
				reason: 'Fallback para tarefa genérica.',
				content: userRequest,
			},
		];
	}

	private dispatch(params: {
		parentTaskId: string;
		target: string;
		content: string;
		context?: Record<string, unknown>;
	}) {
		const command: AgentCommand = {
			type: 'agent.command',
			id: randomUUID(),
			taskId: randomUUID(),
			parentTaskId: params.parentTaskId,
			from: 'planner-agent',
			target: params.target,
			content: params.content,
			context: params.context,
			createdAt: new Date().toISOString(),
		};

		this.eventBus.emit('agent.command', command);
	}

	private say(taskId: string, content: string) {
		this.eventBus.emit('agent.message', {
			type: 'agent.message',
			taskId,
			agent: 'planner-agent',
			content,
			createdAt: new Date().toISOString(),
		});
	}
}
```

O router entrega para o agente correto:

```ts
eventBus.on('agent.command', async command => {
	const agent = registry.get(command.target);

	if (!agent) {
		eventBus.emit('agent.error', {
			type: 'agent.error',
			taskId: command.taskId,
			agent: command.target,
			error: `Agente não encontrado: ${command.target}`,
			createdAt: new Date().toISOString(),
		});

		return;
	}

	await agent.handle(command);
});
```

Exemplo de fluxo real no chat:

```text
Você:
@planner levante o backlog pendente deste projeto

planner-agent:
Vou levantar o backlog pendente deste projeto.

planner-agent:
Plano criado. Vou acionar: project-agent, backlog-agent, summary-agent.

project-agent:
Identifiquei o projeto atual: Don Agent.

backlog-agent:
Encontrei 12 itens pendentes.

summary-agent:
Backlog pendente consolidado:
1. Implementar EventBus
2. Criar AgentRegistry
3. Criar WebSocket Gateway
...
```

O ponto principal é: o Planner **não retorna só texto**. Ele retorna um **plano executável** e transforma cada etapa em evento:

```ts
this.eventBus.emit('agent.command', command);
```

Depois, cada agente responde com:

```ts
eventBus.emit('agent.result', {
	type: 'agent.result',
	taskId,
	parentTaskId,
	agent: 'backlog-agent',
	result: 'Encontrei 12 tarefas pendentes...',
});
```

## Prompt

06/07/2026, 17:52:47

E como faria com o ollama? como poderia fazer para que ele reconhecesse dentre os agentes quais devem ser acionados? poderia passar a lista de agentes e descrições como contexto?

## Response

06/07/2026, 17:51:54

Sim — você passa para o Ollama a **lista de agentes disponíveis**, com descrição, capacidades e formato de resposta esperado.

O `PlannerAgent` usa o Ollama como “classificador + planejador”.

```ts
const agents = [
	{
		name: 'project-agent',
		description: 'Identifica o projeto atual, repositório, board e contexto.',
	},
	{
		name: 'backlog-agent',
		description: 'Consulta backlog, tarefas pendentes, status e prioridades.',
	},
	{
		name: 'summary-agent',
		description: 'Consolida resultados e responde ao usuário.',
	},
	{
		name: 'code-agent',
		description: 'Analisa código, arquivos, commits e testes.',
	},
];
```

Aí você monta um prompt assim:

```ts
const systemPrompt = `
Você é o PlannerAgent.

Sua função é decidir quais agentes devem ser acionados para atender o pedido do usuário.

Agentes disponíveis:
${agents.map(a => `- ${a.name}: ${a.description}`).join('\n')}

Responda somente em JSON válido neste formato:

{
  "steps": [
    {
      "target": "nome-do-agente",
      "reason": "por que este agente deve ser acionado",
      "content": "instrução objetiva para este agente"
    }
  ]
}

Regras:
- Use apenas agentes da lista.
- Não invente agentes.
- Se precisar consolidar resposta final, acione summary-agent.
- Se o pedido for ambíguo, acione project-agent primeiro.
`;
```

Para o comando:

```text
@planner levante o backlog pendente deste projeto
```

O Ollama deveria retornar algo assim:

```json
{
	"steps": [
		{
			"target": "project-agent",
			"reason": "É necessário identificar qual é o projeto atual e suas fontes de backlog.",
			"content": "Identifique o projeto atual, repositório, board e fontes de backlog disponíveis."
		},
		{
			"target": "backlog-agent",
			"reason": "É necessário consultar os itens pendentes do backlog.",
			"content": "Levante os itens pendentes do backlog do projeto identificado."
		},
		{
			"target": "summary-agent",
			"reason": "É necessário consolidar os resultados para o usuário.",
			"content": "Consolide os resultados dos agentes anteriores em um resumo objetivo do backlog pendente."
		}
	]
}
```

Depois seu código parseia o JSON e dispara os eventos:

```ts
for (const step of plan.steps) {
	eventBus.emit('agent.command', {
		type: 'agent.command',
		id: randomUUID(),
		taskId: randomUUID(),
		parentTaskId: event.taskId,
		from: 'planner-agent',
		target: step.target,
		content: step.content,
		context: {
			originalRequest: event.content,
			reason: step.reason,
		},
		createdAt: new Date().toISOString(),
	});
}
```

Exemplo mais completo com Ollama:

```ts
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import ollama from 'ollama';

type AgentDefinition = {
	name: string;
	description: string;
};

type PlannerStep = {
	target: string;
	reason: string;
	content: string;
};

type PlannerResponse = {
	steps: PlannerStep[];
};

type HumanInstruction = {
	type: 'human.instruction';
	taskId: string;
	from: 'user';
	content: string;
};

export class PlannerAgent {
	constructor(
		private readonly eventBus: EventEmitter,
		private readonly agents: AgentDefinition[],
	) {}

	async handle(event: HumanInstruction) {
		this.say(event.taskId, 'Vou analisar quais agentes devem ser acionados.');

		const plan = await this.createPlan(event.content);

		this.say(event.taskId, `Vou acionar: ${plan.steps.map(step => step.target).join(', ')}.`);

		for (const step of plan.steps) {
			this.dispatch({
				parentTaskId: event.taskId,
				target: step.target,
				content: step.content,
				context: {
					originalRequest: event.content,
					reason: step.reason,
				},
			});
		}
	}

	private async createPlan(userRequest: string): Promise<PlannerResponse> {
		const systemPrompt = `
Você é o PlannerAgent.

Sua função é decidir quais agentes devem ser acionados para atender o pedido do usuário.

Agentes disponíveis:
${this.agents.map(agent => `- ${agent.name}: ${agent.description}`).join('\n')}

Responda somente em JSON válido neste formato:

{
  "steps": [
    {
      "target": "nome-do-agente",
      "reason": "por que este agente deve ser acionado",
      "content": "instrução objetiva para este agente"
    }
  ]
}

Regras:
- Use apenas agentes da lista.
- Não invente agentes.
- Se precisar consolidar resposta final, acione summary-agent.
- Se o pedido for ambíguo, acione project-agent primeiro.
`;

		const response = await ollama.chat({
			model: 'llama3.1',
			messages: [
				{
					role: 'system',
					content: systemPrompt,
				},
				{
					role: 'user',
					content: userRequest,
				},
			],
			format: 'json',
		});

		const parsed = JSON.parse(response.message.content);

		return this.validatePlan(parsed);
	}

	private validatePlan(plan: PlannerResponse): PlannerResponse {
		const availableAgents = new Set(this.agents.map(agent => agent.name));

		const validSteps = plan.steps.filter(step => {
			return availableAgents.has(step.target);
		});

		if (validSteps.length === 0) {
			return {
				steps: [
					{
						target: 'summary-agent',
						reason: 'Nenhum agente válido foi identificado.',
						content:
							'Informe ao usuário que não foi possível definir um agente adequado para a tarefa.',
					},
				],
			};
		}

		return {
			steps: validSteps,
		};
	}

	private dispatch(params: {
		parentTaskId: string;
		target: string;
		content: string;
		context?: Record<string, unknown>;
	}) {
		this.eventBus.emit('agent.command', {
			type: 'agent.command',
			id: randomUUID(),
			taskId: randomUUID(),
			parentTaskId: params.parentTaskId,
			from: 'planner-agent',
			target: params.target,
			content: params.content,
			context: params.context,
			createdAt: new Date().toISOString(),
		});
	}

	private say(taskId: string, content: string) {
		this.eventBus.emit('agent.message', {
			type: 'agent.message',
			taskId,
			agent: 'planner-agent',
			content,
			createdAt: new Date().toISOString(),
		});
	}
}
```

Então, sim: **você passa a lista de agentes como contexto**, mas não confia cegamente na resposta. Depois do Ollama responder, você valida:

```ts
const availableAgents = new Set(this.agents.map(agent => agent.name));
```

Isso impede ele de inventar algo como:

```json
{
	"target": "super-backlog-ai-agent"
}
```

Modelo mental:

```text
Usuário:
@planner levante o backlog pendente deste projeto

PlannerAgent:
manda pedido + catálogo de agentes para o Ollama

Ollama:
retorna plano JSON

PlannerAgent:
valida o plano

PlannerAgent:
emite agent.command para cada agente
```

Essa é uma boa primeira versão. Depois você pode evoluir o catálogo com mais dados:

```ts
{
  name: "backlog-agent",
  description: "Consulta backlog e tarefas pendentes.",
  tools: ["monday", "github", "azure-devops"],
  inputs: ["projectId", "repository", "boardId"],
  outputs: ["backlogItems"]
}
```

## Prompt

06/07/2026, 18:01:05

Perfeito, perfeito, e uma dúvida, a task id primária deveria nascer do front ou no momento em que o servidor recebe o input?

## Response

06/07/2026, 18:00:09

Essa pergunta é excelente, porque ela muda bastante a arquitetura. E, olhando para o Don Agent, **eu faria nascer no servidor**.

Na verdade, eu teria **três IDs diferentes**, cada um com uma responsabilidade.

```text
conversationId → conversa/chat
taskId         → solicitação do usuário
eventId        → evento individual
```

Exemplo:

```text
Conversa
└── conversationId = conv-001
    │
    ├── Task 1 (task-001)
    │      "Levante o backlog"
    │
    ├── Task 2 (task-002)
    │      "Agora gere um relatório"
    │
    └── Task 3 (task-003)
           "Implemente isso"
```

Cada evento possui um ID próprio:

```text
event-001
event-002
event-003
...
```

---

## Por que o servidor?

Imagine:

```text
Frontend A
Frontend B
CLI
Telegram
Discord
API REST
```

Todos podem enviar comandos.

Você quer que exista **uma única autoridade** para gerar IDs.

```text
           Frontends
      ┌──────┴───────┐
      │              │
 Web       CLI     Telegram
      │              │
      └──────┬───────┘
             ▼
      Don Agent Server
             │
      gera taskId
```

Assim você evita colisões e não depende do cliente.

---

## O fluxo ficaria assim

Frontend envia:

```json
{
	"conversationId": "conv-123",
	"content": "@planner levante o backlog"
}
```

Servidor recebe:

```ts
const task = {
	taskId: crypto.randomUUID(),
	conversationId: request.conversationId,
	createdBy: 'user',
	content: request.content,
};
```

A partir daí **todo o sistema passa a trabalhar usando esse taskId**.

---

## E as subtarefas?

Eu faria assim:

```text
Task Principal

task-100
│
├── task-101
├── task-102
└── task-103
```

Ou seja:

```ts
{
    taskId: "101",
    parentTaskId: "100",
    target: "code-agent"
}
```

Outro:

```ts
{
    taskId: "102",
    parentTaskId: "100",
    target: "backlog-agent"
}
```

Isso permite montar um grafo da execução.

---

## Inclusive eu iria além

Eu teria um objeto chamado **TaskContext**.

```ts
interface TaskContext {
	conversationId: string;

	rootTaskId: string;

	taskId: string;

	parentTaskId?: string;

	createdBy: string;

	assignedTo: string;

	createdAt: Date;
}
```

Então qualquer agente recebe:

```ts
handle(
    context: TaskContext,
    command: AgentCommand
)
```

Nunca apenas o texto.

---

## O Planner fica muito elegante

```text
Task 100
──────────────

Usuário:
Levante o backlog
```

Planner:

```text
Task 101
Buscar projeto

Task 102
Consultar backlog

Task 103
Gerar resumo
```

Todos possuem:

```text
rootTaskId = 100
```

Assim você consegue montar a árvore inteira.

---

## Eu adicionaria também um correlationId

Isso é muito usado em sistemas distribuídos.

```text
conversationId
      │
      ▼
taskId
      │
      ▼
correlationId
```

Exemplo:

```text
conversationId = chat-abc

taskId = task-100

correlationId = req-84af...
```

O `correlationId` acompanha todas as chamadas externas:

- Ollama
- GitHub
- RabbitMQ
- Azure DevOps
- Monday
- etc.

Quando olhar os logs, você consegue reconstruir tudo.

---

# Minha proposta para o Don Agent

```ts
interface EventEnvelope<T> {
	eventId: string;

	correlationId: string;

	conversationId: string;

	rootTaskId: string;

	taskId: string;

	parentTaskId?: string;

	source: string;

	target?: string;

	createdAt: Date;

	payload: T;
}
```

Aí tudo vira um `EventEnvelope`.

Exemplo:

```text
HumanInstruction
```

↓

```text
AgentCommand
```

↓

```text
ToolStarted
```

↓

```text
ToolOutput
```

↓

```text
AgentResult
```

Tudo compartilhando o mesmo envelope.

## Um detalhe que eu acho que faria bastante diferença

Como você quer construir uma interface de chat para acompanhar a "vida" dos agentes, eu faria o sistema **event-sourced** desde o início.

Ou seja, **o chat nunca conversa diretamente com os agentes**.

O chat apenas renderiza a sequência de eventos armazenados.

```text
event-001  UserMessage
event-002  PlannerThinking
event-003  PlannerDelegated(code-agent)
event-004  CodeAgentStarted
event-005  ToolStarted(git)
event-006  ToolFinished(git)
event-007  CodeAgentResult
event-008  PlannerSummary
```

Com isso você ganha gratuitamente:

- replay completo de uma execução;
- auditoria ("quem fez o quê?");
- linha do tempo visual;
- depuração de agentes;
- possibilidade de "rebobinar" uma tarefa para entender onde ela falhou.

Na prática, você acaba construindo algo muito próximo de uma combinação entre um sistema de filas, um motor de workflows e um chat colaborativo de agentes, que é exatamente a direção que muitos frameworks modernos de agentes estão seguindo.

## Prompt

06/07/2026, 18:05:44

acho que entendi

## Response

06/07/2026, 18:04:50

Acho que você já fez o "clique" principal. 😄

O erro que muita gente comete (e que eu também cometeria antes de estudar esse assunto) é imaginar que os agentes ficam **conversando entre si**. Na realidade, eles **conversam através de eventos**.

Vou desenhar como eu imagino o Don Agent baseado no que conversamos.

```text
                         Frontend
                            │
                     WebSocket / REST
                            │
                            ▼
                    Command Gateway
                            │
             gera taskId, correlationId
                            │
                            ▼
                      Event Bus
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   PlannerAgent       CodeAgent         RabbitAgent
        │                   │                   │
        └──────────────┬────┴───────────────────┘
                       ▼
                 Event Store
                       │
          (Postgres, SQLite, Mongo...)
                       │
          Chat apenas lê daqui
```

Perceba uma coisa interessante:

O **Planner nem sabe quem está ouvindo**.

Ele simplesmente fala:

```ts
eventBus.publish({
    type: "agent.command",
    target: "code-agent",
    ...
});
```

Ele não faz:

```ts
codeAgent.handle(...)
```

Essa diferença parece pequena, mas muda completamente a arquitetura.

---

## O clique que eu tive lendo sua ideia

Eu **não faria o chat conversar com os agentes**.

Eu faria o chat conversar **com o Event Bus**.

Ou seja:

```
Você:
@planner levante o backlog
```

vira

```
HumanInstruction
```

O Planner responde

```
PlannerMessage
```

Depois

```
PlannerDispatchedAgent
```

Depois

```
AgentStarted
```

Depois

```
ToolStarted
```

Depois

```
ToolFinished
```

Depois

```
AgentCompleted
```

O chat simplesmente vai renderizando tudo.

---

## A parte mais legal

Você pode deixar os agentes completamente desacoplados.

Imagine que daqui seis meses você cria um novo agente.

```
MondayAgent
```

Ele só precisa dizer:

```ts
registry.register(new MondayAgent());
```

O Planner passa a receber um catálogo assim:

```
Planner

Agentes disponíveis

- code-agent
- rabbit-agent
- git-agent
- monitor-agent
- monday-agent
```

E pronto.

Você não altera nenhuma lógica do Planner.

Ele apenas passa a enxergar um agente novo.

---

## Eu faria ainda melhor

Ao invés de passar apenas:

```json
{
	"name": "rabbit-agent",
	"description": "Monitora RabbitMQ"
}
```

Eu passaria algo parecido com MCP.

```json
{
	"name": "rabbit-agent",
	"description": "Especialista em RabbitMQ.",
	"capabilities": ["list queues", "purge queue", "inspect consumers", "check dead letters"],
	"examples": ["Verifique filas paradas", "Liste filas com mais de 100 mensagens"]
}
```

Repare que isso é muito parecido com o que um servidor MCP expõe: **nome, descrição e capacidades**.

Na prática, seus agentes viram "ferramentas inteligentes" que o Planner pode escolher.

---

## O que eu faria no Don Agent

Eu faria tudo baseado em **Registry**.

```ts
registry.registerAgent(...)
registry.registerTool(...)
registry.registerProvider(...)
registry.registerMemory(...)
```

No startup, o Planner perguntaria ao Registry:

```ts
const catalog = registry.getCatalog();
```

E esse catálogo seria enviado para o Ollama.

Isso significa que você nunca mais altera o prompt manualmente.

Instalou um novo agente?

Ele automaticamente aparece para o Planner.

---

Eu diria que, nesse ponto, você já está deixando de pensar em "vários agentes" e começando a pensar em uma **plataforma de agentes**. E essa, na minha opinião, é a diferença entre um projeto que resolve um problema específico e um framework que pode crescer para qualquer domínio.

Pelo que conheço dos projetos que você já desenvolveu (Banky, monitor do RabbitMQ, automações, addons, etc.), eu seguiria exatamente esse caminho: construir primeiro um **kernel** (Event Bus + Registry + Planner + Providers + Tool Executor) e, a partir daí, tudo o que você criar será apenas um plugin (agente, ferramenta ou provider). Isso tende a manter a arquitetura limpa mesmo quando o número de agentes crescer bastante.

## Prompt

06/07/2026, 18:09:05

este registry poderia ser uma classe com um Set para armazenar estes agentes?

## Response

06/07/2026, 18:08:10

Exatamente! E eu diria mais: **essa é provavelmente a primeira implementação que eu faria**.

Um `Registry` nada mais é do que um catálogo em memória.

```ts
class AgentRegistry {
	private readonly agents = new Map<string, Agent>();

	register(agent: Agent) {
		this.agents.set(agent.name, agent);
	}

	get(name: string) {
		return this.agents.get(name);
	}

	getAll() {
		return [...this.agents.values()];
	}

	exists(name: string) {
		return this.agents.has(name);
	}
}
```

Observe que eu prefiro um **Map** em vez de um **Set**.

## Por que Map?

Porque você quase sempre vai querer buscar pelo nome.

Com um `Set`:

```ts
agents.has(...)
```

funciona apenas se você tiver **a mesma referência do objeto**.

```ts
const agent = new CodeAgent();

set.add(agent);

set.has(agent); // true

set.has(new CodeAgent()); // false
```

Já com um `Map`:

```ts
agents.get('code-agent');
```

é instantâneo.

---

## Eu faria a interface assim

```ts
interface Agent {
	readonly name: string;

	readonly description: string;

	readonly capabilities: string[];

	handle(event: AgentCommand): Promise<void>;
}
```

Então um agente fica assim:

```ts
class CodeAgent implements Agent {
	readonly name = 'code-agent';

	readonly description = 'Especialista em código, testes e revisão.';

	readonly capabilities = ['read files', 'write files', 'run tests'];

	async handle(event: AgentCommand) {}
}
```

O Registry:

```ts
const registry = new AgentRegistry();

registry.register(new PlannerAgent());
registry.register(new CodeAgent());
registry.register(new RabbitAgent());
registry.register(new GitAgent());
```

---

# E aí vem a parte que mais gostei da sua ideia

O Planner não deveria conhecer nenhum agente.

Ele deveria conhecer apenas o Registry.

```ts
class PlannerAgent {
	constructor(private readonly registry: AgentRegistry) {}
}
```

Quando ele vai montar o prompt:

```ts
const catalog = registry.getAll().map(agent => ({
	name: agent.name,
	description: agent.description,
	capabilities: agent.capabilities,
}));
```

Ou seja, o prompt passa a ser dinâmico.

---

# E eu iria além

Separaria o catálogo do agente.

```ts
interface AgentMetadata {
	name: string;

	description: string;

	capabilities: string[];

	examples: string[];
}
```

e

```ts
interface Agent {

    metadata: AgentMetadata;

    handle(...): Promise<void>;
}
```

Porque o Ollama só precisa do metadata.

Ele nunca deveria receber o objeto inteiro do agente.

---

## Registry genérico

Na verdade, eu faria um Registry parecido com um container de DI.

```ts
registry.registerAgent(...)
registry.registerTool(...)
registry.registerProvider(...)
registry.registerMemory(...)
registry.registerPrompt(...)
```

Depois:

```ts
registry.getAgent('code-agent');

registry.getTool('git');

registry.getProvider('ollama');

registry.getMemory('sqlite');
```

---

## Mais uma evolução interessante

Eu faria o AgentRegistry emitir eventos também.

```ts
registry.register(...)
```

↓

```ts
eventBus.emit('agent.registered');
```

Assim o Planner nem precisa atualizar nada.

Quando um agente entra:

```text
Planner
    │
    ▼
Registry atualizado
    │
    ▼
Catálogo atualizado
```

Automaticamente.

---

# E a ideia que eu mais gostei

Se você seguir esse caminho, daqui alguns meses pode criar algo assim:

```ts
class WeatherAgent extends Agent {}

registry.register(new WeatherAgent());
```

Sem alterar **nenhuma linha** do Planner.

Na próxima pergunta do usuário:

> "Como está o tempo em São Paulo?"

O Planner verá automaticamente:

```text
weather-agent

Especialista em meteorologia.
```

e decidirá utilizá-lo.

---

## Minha única mudança na arquitetura

Eu faria uma pequena separação de responsabilidades:

```text
                Registry
                    │
     ┌──────────────┼──────────────┐
     ▼              ▼              ▼
 AgentRegistry  ToolRegistry  ProviderRegistry
```

Porque, conceitualmente, um **agente**, uma **ferramenta** e um **provider** têm papéis bem diferentes:

- **AgentRegistry** → "Quem pode pensar?" (`planner-agent`, `code-agent`, `rabbit-agent`...)
- **ToolRegistry** → "O que pode ser executado?" (`git`, `shell`, `filesystem`, `rabbitmq`, `azure-devops`...)
- **ProviderRegistry** → "Quem fornece inteligência?" (`Ollama`, `OpenAI`, `Claude`, `Gemini`...)

Essa separação vai deixar o restante da arquitetura muito mais limpa conforme o Don Agent crescer. Eu realmente seguiria por esse caminho.

## Prompt

06/07/2026, 18:29:09

Perfeito, vamos organizar este projeto, gere a estrutura base.

## Response

06/07/2026, 18:28:17

Vou organizar como uma base Node.js/TypeScript pensando no Don Agent: Event Bus, Registry, Providers, agentes, ferramentas e Chat Gateway. Vou deixar já num formato que permita crescer para RabbitMQ/WebSocket/Ollama sem bagunçar o core.

A estrutura base que eu seguiria:

```text
don-agent/
├── src/
│   ├── main.ts
│   │
│   ├── core/
│   │   ├── events/
│   │   │   ├── event-bus.ts
│   │   │   ├── event-envelope.ts
│   │   │   └── event-types.ts
│   │   │
│   │   ├── agents/
│   │   │   ├── agent.ts
│   │   │   ├── agent-registry.ts
│   │   │   └── agent-router.ts
│   │   │
│   │   ├── tools/
│   │   │   ├── tool.ts
│   │   │   └── tool-registry.ts
│   │   │
│   │   └── providers/
│   │       ├── llm-provider.ts
│   │       ├── provider-registry.ts
│   │       └── ollama-provider.ts
│   │
│   ├── agents/
│   │   ├── planner/
│   │   │   └── planner-agent.ts
│   │   ├── code/
│   │   │   └── code-agent.ts
│   │   ├── backlog/
│   │   │   └── backlog-agent.ts
│   │   └── summary/
│   │       └── summary-agent.ts
│   │
│   ├── tools/
│   │   ├── shell/
│   │   │   └── shell-tool.ts
│   │   ├── filesystem/
│   │   │   └── filesystem-tool.ts
│   │   └── rabbitmq/
│   │       └── rabbitmq-tool.ts
│   │
│   ├── gateway/
│   │   ├── chat-gateway.ts
│   │   └── command-parser.ts
│   │
│   ├── store/
│   │   ├── event-store.ts
│   │   └── in-memory-event-store.ts
│   │
│   └── config/
│       └── agents.config.ts
│
├── package.json
├── tsconfig.json
└── .env
```

## Conceito principal

```text
Chat → Gateway → EventBus → Router → Agent → Tool/Provider → EventBus → Chat
```

---

## Tipos base

```ts
// src/core/events/event-envelope.ts

export type EventEnvelope<TPayload = unknown> = {
	eventId: string;
	correlationId: string;

	conversationId: string;
	rootTaskId: string;
	taskId: string;
	parentTaskId?: string;

	type: string;
	source: string;
	target?: string;

	payload: TPayload;

	createdAt: string;
};
```

```ts
// src/core/events/event-types.ts

export type HumanInstructionPayload = {
	content: string;
};

export type AgentCommandPayload = {
	content: string;
	reason?: string;
};

export type AgentMessagePayload = {
	content: string;
};

export type AgentResultPayload = {
	status: 'completed' | 'failed';
	result: string;
};

export type ToolStartedPayload = {
	tool: string;
	input?: unknown;
};

export type ToolFinishedPayload = {
	tool: string;
	output?: unknown;
};
```

---

## Event Bus

```ts
// src/core/events/event-bus.ts

import { EventEmitter } from 'node:events';
import { EventEnvelope } from './event-envelope';

export class EventBus {
	private readonly emitter = new EventEmitter();

	publish<T>(event: EventEnvelope<T>) {
		this.emitter.emit(event.type, event);
		this.emitter.emit('*', event);
	}

	subscribe<T>(type: string, handler: (event: EventEnvelope<T>) => Promise<void> | void) {
		this.emitter.on(type, handler);
	}

	subscribeAll(handler: (event: EventEnvelope) => Promise<void> | void) {
		this.emitter.on('*', handler);
	}
}
```

---

## Interface de agente

```ts
// src/core/agents/agent.ts

import { EventEnvelope } from '../events/event-envelope';

export type AgentMetadata = {
	name: string;
	description: string;
	capabilities: string[];
	examples?: string[];
};

export interface Agent {
	metadata: AgentMetadata;

	handle(event: EventEnvelope): Promise<void>;
}
```

---

## Agent Registry

```ts
// src/core/agents/agent-registry.ts

import { Agent, AgentMetadata } from './agent';

export class AgentRegistry {
	private readonly agents = new Map<string, Agent>();

	register(agent: Agent) {
		this.agents.set(agent.metadata.name, agent);
	}

	get(name: string) {
		return this.agents.get(name);
	}

	has(name: string) {
		return this.agents.has(name);
	}

	getAll() {
		return [...this.agents.values()];
	}

	getCatalog(): AgentMetadata[] {
		return this.getAll().map(agent => agent.metadata);
	}
}
```

---

## Router

```ts
// src/core/agents/agent-router.ts

import { EventBus } from '../events/event-bus';
import { AgentRegistry } from './agent-registry';
import { EventEnvelope } from '../events/event-envelope';

export class AgentRouter {
	constructor(
		private readonly eventBus: EventBus,
		private readonly registry: AgentRegistry,
	) {}

	start() {
		this.eventBus.subscribe('agent.command', async event => {
			const target = event.target;

			if (!target) {
				this.publishError(event, 'Comando sem target.');
				return;
			}

			const agent = this.registry.get(target);

			if (!agent) {
				this.publishError(event, `Agente não encontrado: ${target}`);
				return;
			}

			await agent.handle(event);
		});
	}

	private publishError(event: EventEnvelope, error: string) {
		this.eventBus.publish({
			...event,
			eventId: crypto.randomUUID(),
			type: 'agent.error',
			source: 'agent-router',
			target: event.source,
			payload: { error },
			createdAt: new Date().toISOString(),
		});
	}
}
```

---

## Provider Ollama

```ts
// src/core/providers/llm-provider.ts

export type ChatMessage = {
	role: 'system' | 'user' | 'assistant';
	content: string;
};

export interface LlmProvider {
	name: string;

	chat(params: { model: string; messages: ChatMessage[]; format?: 'json' }): Promise<string>;
}
```

```ts
// src/core/providers/ollama-provider.ts

import ollama from 'ollama';
import { LlmProvider } from './llm-provider';

export class OllamaProvider implements LlmProvider {
	name = 'ollama';

	async chat(params: {
		model: string;
		messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
		format?: 'json';
	}) {
		const response = await ollama.chat({
			model: params.model,
			messages: params.messages,
			format: params.format,
		});

		return response.message.content;
	}
}
```

---

## Planner Agent

```ts
// src/agents/planner/planner-agent.ts

import { EventBus } from '../../core/events/event-bus';
import { Agent, AgentMetadata } from '../../core/agents/agent';
import { AgentRegistry } from '../../core/agents/agent-registry';
import { LlmProvider } from '../../core/providers/llm-provider';
import { EventEnvelope } from '../../core/events/event-envelope';

type PlannerStep = {
	target: string;
	reason: string;
	content: string;
};

type PlannerResponse = {
	steps: PlannerStep[];
};

export class PlannerAgent implements Agent {
	metadata: AgentMetadata = {
		name: 'planner-agent',
		description: 'Planeja tarefas, escolhe agentes e delega subtarefas.',
		capabilities: [
			'analisar pedido do usuário',
			'selecionar agentes',
			'criar subtarefas',
			'delegar execução',
		],
		examples: [
			'@planner levante o backlog pendente deste projeto',
			'@planner revise o projeto e rode os testes',
		],
	};

	constructor(
		private readonly eventBus: EventBus,
		private readonly registry: AgentRegistry,
		private readonly llm: LlmProvider,
	) {}

	async handle(event: EventEnvelope) {
		const content = String((event.payload as any).content ?? '');

		this.say(event, 'Vou analisar quais agentes devem ser acionados.');

		const plan = await this.createPlan(content);

		this.say(event, `Vou acionar: ${plan.steps.map(step => step.target).join(', ')}.`);

		for (const step of plan.steps) {
			this.dispatch(event, step);
		}
	}

	private async createPlan(userRequest: string): Promise<PlannerResponse> {
		const catalog = this.registry.getCatalog().filter(agent => agent.name !== this.metadata.name);

		const systemPrompt = `
Você é o PlannerAgent.

Sua função é decidir quais agentes devem ser acionados para atender o pedido do usuário.

Agentes disponíveis:
${catalog
	.map(agent => {
		return [
			`Nome: ${agent.name}`,
			`Descrição: ${agent.description}`,
			`Capacidades: ${agent.capabilities.join(', ')}`,
			agent.examples?.length ? `Exemplos: ${agent.examples.join(' | ')}` : '',
		]
			.filter(Boolean)
			.join('\n');
	})
	.join('\n\n')}

Responda somente em JSON válido:

{
  "steps": [
    {
      "target": "nome-do-agente",
      "reason": "por que este agente deve ser acionado",
      "content": "instrução objetiva para este agente"
    }
  ]
}

Regras:
- Use apenas agentes da lista.
- Não invente agentes.
- Para tarefas ambíguas, acione primeiro um agente capaz de identificar contexto.
- Se for necessário consolidar resposta final, acione summary-agent.
`;

		const response = await this.llm.chat({
			model: 'llama3.1',
			format: 'json',
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userRequest },
			],
		});

		return this.validatePlan(JSON.parse(response));
	}

	private validatePlan(plan: PlannerResponse): PlannerResponse {
		const availableAgents = new Set(this.registry.getCatalog().map(agent => agent.name));

		const validSteps = plan.steps.filter(step => {
			return availableAgents.has(step.target);
		});

		return {
			steps: validSteps,
		};
	}

	private dispatch(parentEvent: EventEnvelope, step: PlannerStep) {
		this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: parentEvent.correlationId,

			conversationId: parentEvent.conversationId,
			rootTaskId: parentEvent.rootTaskId,
			taskId: crypto.randomUUID(),
			parentTaskId: parentEvent.taskId,

			type: 'agent.command',
			source: this.metadata.name,
			target: step.target,

			payload: {
				content: step.content,
				reason: step.reason,
			},

			createdAt: new Date().toISOString(),
		});
	}

	private say(parentEvent: EventEnvelope, content: string) {
		this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: parentEvent.correlationId,

			conversationId: parentEvent.conversationId,
			rootTaskId: parentEvent.rootTaskId,
			taskId: parentEvent.taskId,
			parentTaskId: parentEvent.parentTaskId,

			type: 'agent.message',
			source: this.metadata.name,

			payload: {
				content,
			},

			createdAt: new Date().toISOString(),
		});
	}
}
```

---

## Backlog Agent fake, por enquanto

```ts
// src/agents/backlog/backlog-agent.ts

import { Agent, AgentMetadata } from '../../core/agents/agent';
import { EventBus } from '../../core/events/event-bus';
import { EventEnvelope } from '../../core/events/event-envelope';

export class BacklogAgent implements Agent {
	metadata: AgentMetadata = {
		name: 'backlog-agent',
		description: 'Consulta backlog, tarefas pendentes, status e prioridades.',
		capabilities: [
			'listar backlog',
			'identificar tarefas pendentes',
			'agrupar por status',
			'resumir prioridades',
		],
		examples: ['Levante tarefas pendentes', 'Liste backlog aberto', 'Mostre itens não concluídos'],
	};

	constructor(private readonly eventBus: EventBus) {}

	async handle(event: EventEnvelope) {
		this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: event.correlationId,

			conversationId: event.conversationId,
			rootTaskId: event.rootTaskId,
			taskId: event.taskId,
			parentTaskId: event.parentTaskId,

			type: 'agent.result',
			source: this.metadata.name,

			payload: {
				status: 'completed',
				result: 'Backlog fake: 3 itens pendentes encontrados.',
			},

			createdAt: new Date().toISOString(),
		});
	}
}
```

---

## Summary Agent fake

```ts
// src/agents/summary/summary-agent.ts

import { Agent, AgentMetadata } from '../../core/agents/agent';
import { EventBus } from '../../core/events/event-bus';
import { EventEnvelope } from '../../core/events/event-envelope';

export class SummaryAgent implements Agent {
	metadata: AgentMetadata = {
		name: 'summary-agent',
		description: 'Consolida resultados de outros agentes e responde ao usuário.',
		capabilities: ['resumir resultados', 'organizar resposta final', 'consolidar subtarefas'],
	};

	constructor(private readonly eventBus: EventBus) {}

	async handle(event: EventEnvelope) {
		this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: event.correlationId,

			conversationId: event.conversationId,
			rootTaskId: event.rootTaskId,
			taskId: event.taskId,
			parentTaskId: event.parentTaskId,

			type: 'agent.message',
			source: this.metadata.name,

			payload: {
				content: 'Vou consolidar os resultados recebidos dos agentes.',
			},

			createdAt: new Date().toISOString(),
		});
	}
}
```

---

## Command Parser com `@`

```ts
// src/gateway/command-parser.ts

export type ParsedCommand = {
	target: string;
	content: string;
};

const mentions: Record<string, string> = {
	planner: 'planner-agent',
	backlog: 'backlog-agent',
	summary: 'summary-agent',
	code: 'code-agent',
};

export function parseCommand(input: string): ParsedCommand {
	const match = input.match(/^@(\w+),?\s+(.+)$/);

	if (!match) {
		return {
			target: 'planner-agent',
			content: input,
		};
	}

	const [, mention, content] = match;

	return {
		target: mentions[mention] ?? 'planner-agent',
		content,
	};
}
```

---

## Main

```ts
// src/main.ts

import { EventBus } from './core/events/event-bus';
import { AgentRegistry } from './core/agents/agent-registry';
import { AgentRouter } from './core/agents/agent-router';
import { OllamaProvider } from './core/providers/ollama-provider';

import { PlannerAgent } from './agents/planner/planner-agent';
import { BacklogAgent } from './agents/backlog/backlog-agent';
import { SummaryAgent } from './agents/summary/summary-agent';

import { parseCommand } from './gateway/command-parser';

async function bootstrap() {
	const eventBus = new EventBus();
	const registry = new AgentRegistry();

	const ollama = new OllamaProvider();

	registry.register(new BacklogAgent(eventBus));
	registry.register(new SummaryAgent(eventBus));
	registry.register(new PlannerAgent(eventBus, registry, ollama));

	const router = new AgentRouter(eventBus, registry);
	router.start();

	eventBus.subscribeAll(event => {
		console.log(`[${event.type}]`, {
			source: event.source,
			target: event.target,
			taskId: event.taskId,
			payload: event.payload,
		});
	});

	const input = '@planner levante o backlog pendente deste projeto';
	const parsed = parseCommand(input);

	const taskId = crypto.randomUUID();

	eventBus.publish({
		eventId: crypto.randomUUID(),
		correlationId: crypto.randomUUID(),

		conversationId: 'conv-local',
		rootTaskId: taskId,
		taskId,

		type: 'agent.command',
		source: 'chat-gateway',
		target: parsed.target,

		payload: {
			content: parsed.content,
		},

		createdAt: new Date().toISOString(),
	});
}

bootstrap();
```

---

## package.json

```json
{
	"name": "don-agent",
	"version": "0.1.0",
	"type": "module",
	"scripts": {
		"dev": "tsx src/main.ts",
		"build": "tsc",
		"start": "node dist/main.js"
	},
	"dependencies": {
		"ollama": "^0.5.17",
		"ws": "^8.18.0"
	},
	"devDependencies": {
		"@types/node": "^22.0.0",
		"@types/ws": "^8.5.0",
		"tsx": "^4.19.0",
		"typescript": "^5.7.0"
	}
}
```

## tsconfig.json

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"module": "NodeNext",
		"moduleResolution": "NodeNext",
		"strict": true,
		"esModuleInterop": true,
		"skipLibCheck": true,
		"outDir": "dist",
		"rootDir": "src"
	},
	"include": ["src"]
}
```

Com essa base, o próximo passo natural seria criar o `ChatGateway` via WebSocket para você mandar comandos pelo front e receber todos os eventos em tempo real.

## Prompt

06/07/2026, 18:49:49

implemente o websocket

## Response

06/07/2026, 18:48:55

Sim. Adicione este arquivo:

```ts id="3ta3ic"
// src/gateway/chat-gateway.ts

import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';

import { EventBus } from '../core/events/event-bus';
import { parseCommand } from './command-parser';
import { EventEnvelope } from '../core/events/event-envelope';

type ClientMessage = {
	conversationId?: string;
	content: string;
};

export class ChatGateway {
	private readonly clients = new Set<WebSocket>();

	constructor(
		private readonly eventBus: EventBus,
		private readonly port = 3001,
	) {}

	start() {
		const wss = new WebSocketServer({ port: this.port });

		wss.on('connection', socket => {
			this.clients.add(socket);

			socket.send(
				JSON.stringify({
					type: 'gateway.connected',
					payload: {
						message: 'Conectado ao Don Agent.',
					},
					createdAt: new Date().toISOString(),
				}),
			);

			socket.on('message', raw => {
				this.handleMessage(raw.toString(), socket);
			});

			socket.on('close', () => {
				this.clients.delete(socket);
			});
		});

		this.eventBus.subscribeAll(event => {
			this.broadcast(event);
		});

		console.log(`ChatGateway listening on ws://localhost:${this.port}`);
	}

	private handleMessage(raw: string, socket: WebSocket) {
		try {
			const message = JSON.parse(raw) as ClientMessage;

			if (!message.content?.trim()) {
				socket.send(
					JSON.stringify({
						type: 'gateway.error',
						payload: {
							error: 'Mensagem sem conteúdo.',
						},
						createdAt: new Date().toISOString(),
					}),
				);

				return;
			}

			const parsed = parseCommand(message.content);

			const taskId = randomUUID();

			const event: EventEnvelope = {
				eventId: randomUUID(),
				correlationId: randomUUID(),

				conversationId: message.conversationId ?? 'conv-local',
				rootTaskId: taskId,
				taskId,

				type: 'agent.command',
				source: 'chat-gateway',
				target: parsed.target,

				payload: {
					content: parsed.content,
				},

				createdAt: new Date().toISOString(),
			};

			this.eventBus.publish(event);
		} catch (error) {
			socket.send(
				JSON.stringify({
					type: 'gateway.error',
					payload: {
						error: 'Mensagem inválida. Envie JSON com { content: string }.',
					},
					createdAt: new Date().toISOString(),
				}),
			);
		}
	}

	private broadcast(event: EventEnvelope) {
		const message = JSON.stringify(event);

		for (const client of this.clients) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(message);
			}
		}
	}
}
```

Agora altere o `main.ts`:

```ts id="1zle7k"
// src/main.ts

import { EventBus } from './core/events/event-bus';
import { AgentRegistry } from './core/agents/agent-registry';
import { AgentRouter } from './core/agents/agent-router';
import { OllamaProvider } from './core/providers/ollama-provider';

import { PlannerAgent } from './agents/planner/planner-agent';
import { BacklogAgent } from './agents/backlog/backlog-agent';
import { SummaryAgent } from './agents/summary/summary-agent';

import { ChatGateway } from './gateway/chat-gateway';

async function bootstrap() {
	const eventBus = new EventBus();
	const registry = new AgentRegistry();

	const ollama = new OllamaProvider();

	registry.register(new BacklogAgent(eventBus));
	registry.register(new SummaryAgent(eventBus));
	registry.register(new PlannerAgent(eventBus, registry, ollama));

	const router = new AgentRouter(eventBus, registry);
	router.start();

	const chatGateway = new ChatGateway(eventBus, 3001);
	chatGateway.start();

	eventBus.subscribeAll(event => {
		console.log(`[${event.type}]`, {
			source: event.source,
			target: event.target,
			taskId: event.taskId,
			payload: event.payload,
		});
	});
}

bootstrap();
```

Teste com um client simples:

```ts id="xz1ats"
// scripts/ws-client.ts

import WebSocket from 'ws';

const socket = new WebSocket('ws://localhost:3001');

socket.on('open', () => {
	socket.send(
		JSON.stringify({
			conversationId: 'conv-001',
			content: '@planner levante o backlog pendente deste projeto',
		}),
	);
});

socket.on('message', data => {
	console.log('EVENT:', data.toString());
});
```

Adicione no `package.json`:

```json id="08jw40"
{
	"scripts": {
		"dev": "tsx src/main.ts",
		"client": "tsx scripts/ws-client.ts",
		"build": "tsc",
		"start": "node dist/main.js"
	}
}
```

Fluxo final:

```text id="brydhf"
Frontend/WebSocket
   ↓
ChatGateway
   ↓
agent.command
   ↓
PlannerAgent
   ↓
agent.command para outros agentes
   ↓
agent.message / agent.result
   ↓
ChatGateway broadcast
   ↓
Frontend
```

## Prompt

06/07/2026, 19:00:09

e se ajustarmos o parseCommand para utilizar os agentes do registry, assim ficaria dinâmico

## Response

06/07/2026, 18:59:15

Sim, ficaria melhor. O `parseCommand` deixa de ter um mapa fixo e passa a consultar o `AgentRegistry`.

```ts
// src/gateway/command-parser.ts

import { AgentRegistry } from '../core/agents/agent-registry';

export type ParsedCommand = {
	target: string;
	content: string;
};

export function parseCommand(input: string, registry: AgentRegistry): ParsedCommand {
	const match = input.match(/^@([\w-]+),?\s+(.+)$/);

	if (!match) {
		return {
			target: 'planner-agent',
			content: input,
		};
	}

	const [, mention, content] = match;

	const possibleNames = [mention, `${mention}-agent`];

	const target = possibleNames.find(name => registry.has(name));

	return {
		target: target ?? 'planner-agent',
		content,
	};
}
```

Agora ajuste o `ChatGateway` para receber o registry:

```ts
// src/gateway/chat-gateway.ts

import { AgentRegistry } from '../core/agents/agent-registry';

// ...

export class ChatGateway {
	private readonly clients = new Set<WebSocket>();

	constructor(
		private readonly eventBus: EventBus,
		private readonly registry: AgentRegistry,
		private readonly port = 3001,
	) {}

	// ...

	private handleMessage(raw: string, socket: WebSocket) {
		try {
			const message = JSON.parse(raw) as ClientMessage;

			if (!message.content?.trim()) {
				// ...
				return;
			}

			const parsed = parseCommand(message.content, this.registry);

			// restante igual
		} catch {
			// ...
		}
	}
}
```

E no `main.ts`:

```ts
const chatGateway = new ChatGateway(eventBus, registry, 3001);
chatGateway.start();
```

Assim, se você registrar:

```ts
registry.register(new BacklogAgent(eventBus));
registry.register(new PlannerAgent(eventBus, registry, ollama));
```

O chat aceita automaticamente:

```text
@backlog levante tarefas pendentes
@planner levante o backlog deste projeto
```

Sem precisar alterar o parser.

## Prompt

06/07/2026, 19:16:22

{
"conversationId": "string",
"content": "string"
}

## Prompt

06/07/2026, 19:16:36

ChatGateway listening on ws://localhost:3001
[ChatGateway] client connected
[ChatGateway] message {
conversationId: 'string',
content: '@backlog, Levante o backlog do projeto'
}
[agent.result] {
source: 'backlog-agent',
target: undefined,
taskId: '37825bec-472e-4f1a-8352-53ab3b5ad469',
payload: {
status: 'completed',
result: 'Backlog fake: 3 itens pendentes encontrados.'
}
}
[agent.command] {
source: 'chat-gateway',
target: 'backlog-agent',
taskId: '37825bec-472e-4f1a-8352-53ab3b5ad469',
payload: { content: 'Levante o backlog do projeto' }
}

## Response

06/07/2026, 19:15:43

Funcionou. O `@backlog` foi resolvido dinamicamente para `backlog-agent`.

Só tem um detalhe no log: o `agent.result` apareceu antes do `agent.command` porque seu `subscribeAll` provavelmente está registrando depois que o router já processou o evento, ou porque o `publish` emite o evento específico antes do `*`.

No seu `EventBus`, deve estar assim:

```ts
publish<T>(event: EventEnvelope<T>) {
  this.emitter.emit(event.type, event);
  this.emitter.emit("*", event);
}
```

Se quiser que o log/chat veja primeiro o evento original, inverta:

```ts
publish<T>(event: EventEnvelope<T>) {
  this.emitter.emit("*", event);
  this.emitter.emit(event.type, event);
}
```

A ordem passaria a ser:

```text
[agent.command]
[agent.result]
```

E está correto o resultado:

```text
@backlog → backlog-agent → agent.result
```

Agora o próximo teste seria:

```json
{
	"conversationId": "conv-001",
	"content": "@planner, Levante o backlog do projeto"
}
```

Nesse caso o esperado é:

```text
agent.command → planner-agent
agent.message → planner analisando
agent.command → backlog-agent
agent.result → backlog fake
```

## Prompt

06/07/2026, 19:22:03

estou pensando em uma auditoria, como poderia registrar os eventos, além de log?

## Response

06/07/2026, 19:21:10

Para auditoria, eu faria um **Event Store**: além de publicar no `EventBus`, todo evento também é persistido.

```text id="57ly1s"
EventBus.publish(event)
        │
        ├── salva no EventStore
        └── emite para agentes/chat
```

A primeira versão pode ser SQLite. Depois você troca por Postgres sem mexer no resto.

## Interface

```ts id="i7g04d"
// src/store/event-store.ts

import { EventEnvelope } from '../core/events/event-envelope';

export interface EventStore {
	append(event: EventEnvelope): Promise<void>;

	listByConversation(conversationId: string): Promise<EventEnvelope[]>;

	listByTask(taskId: string): Promise<EventEnvelope[]>;

	listByCorrelation(correlationId: string): Promise<EventEnvelope[]>;
}
```

## SQLite Event Store

```ts id="awfedh"
// src/store/sqlite-event-store.ts

import Database from 'better-sqlite3';
import { EventEnvelope } from '../core/events/event-envelope';
import { EventStore } from './event-store';

export class SqliteEventStore implements EventStore {
	private readonly db: Database.Database;

	constructor(path = 'don-agent-events.db') {
		this.db = new Database(path);

		this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY,
        correlation_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        root_task_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        parent_task_id TEXT,
        type TEXT NOT NULL,
        source TEXT NOT NULL,
        target TEXT,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_conversation
        ON events(conversation_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_events_task
        ON events(task_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_events_root_task
        ON events(root_task_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_events_correlation
        ON events(correlation_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_events_type
        ON events(type, created_at);
    `);
	}

	async append(event: EventEnvelope): Promise<void> {
		this.db
			.prepare(
				`
        INSERT INTO events (
          event_id,
          correlation_id,
          conversation_id,
          root_task_id,
          task_id,
          parent_task_id,
          type,
          source,
          target,
          payload,
          created_at
        )
        VALUES (
          @eventId,
          @correlationId,
          @conversationId,
          @rootTaskId,
          @taskId,
          @parentTaskId,
          @type,
          @source,
          @target,
          @payload,
          @createdAt
        )
      `,
			)
			.run({
				eventId: event.eventId,
				correlationId: event.correlationId,
				conversationId: event.conversationId,
				rootTaskId: event.rootTaskId,
				taskId: event.taskId,
				parentTaskId: event.parentTaskId ?? null,
				type: event.type,
				source: event.source,
				target: event.target ?? null,
				payload: JSON.stringify(event.payload),
				createdAt: event.createdAt,
			});
	}

	async listByConversation(conversationId: string): Promise<EventEnvelope[]> {
		const rows = this.db
			.prepare(
				`
        SELECT * FROM events
        WHERE conversation_id = ?
        ORDER BY created_at ASC
      `,
			)
			.all(conversationId);

		return rows.map(this.toEvent);
	}

	async listByTask(taskId: string): Promise<EventEnvelope[]> {
		const rows = this.db
			.prepare(
				`
        SELECT * FROM events
        WHERE task_id = ? OR root_task_id = ?
        ORDER BY created_at ASC
      `,
			)
			.all(taskId, taskId);

		return rows.map(this.toEvent);
	}

	async listByCorrelation(correlationId: string): Promise<EventEnvelope[]> {
		const rows = this.db
			.prepare(
				`
        SELECT * FROM events
        WHERE correlation_id = ?
        ORDER BY created_at ASC
      `,
			)
			.all(correlationId);

		return rows.map(this.toEvent);
	}

	private toEvent(row: any): EventEnvelope {
		return {
			eventId: row.event_id,
			correlationId: row.correlation_id,
			conversationId: row.conversation_id,
			rootTaskId: row.root_task_id,
			taskId: row.task_id,
			parentTaskId: row.parent_task_id ?? undefined,
			type: row.type,
			source: row.source,
			target: row.target ?? undefined,
			payload: JSON.parse(row.payload),
			createdAt: row.created_at,
		};
	}
}
```

## Ajuste no EventBus

```ts id="ydnbd6"
// src/core/events/event-bus.ts

import { EventEmitter } from 'node:events';
import { EventEnvelope } from './event-envelope';
import { EventStore } from '../../store/event-store';

export class EventBus {
	private readonly emitter = new EventEmitter();

	constructor(private readonly eventStore?: EventStore) {}

	async publish<T>(event: EventEnvelope<T>) {
		await this.eventStore?.append(event);

		this.emitter.emit('*', event);
		this.emitter.emit(event.type, event);
	}

	subscribe<T>(type: string, handler: (event: EventEnvelope<T>) => Promise<void> | void) {
		this.emitter.on(type, handler);
	}

	subscribeAll(handler: (event: EventEnvelope) => Promise<void> | void) {
		this.emitter.on('*', handler);
	}
}
```

Como agora `publish` virou async, ajuste chamadas importantes para `await` quando fizer sentido:

```ts id="833bp7"
await this.eventBus.publish(event);
```

## Main

```ts id="lf0l9i"
// src/main.ts

import { SqliteEventStore } from './store/sqlite-event-store';

const eventStore = new SqliteEventStore('don-agent-events.db');
const eventBus = new EventBus(eventStore);
```

## Dependência

```bash id="btbvyl"
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

## O que isso te dá

Você passa a conseguir:

```text id="60cexb"
- reconstruir uma conversa inteira;
- auditar cada ação;
- ver qual agente acionou qual agente;
- rastrear tool output;
- depurar falhas;
- fazer replay de uma task;
- montar uma timeline no frontend.
```

O chat pode carregar o histórico assim:

```text id="2yn8hy"
GET /conversations/:conversationId/events
GET /tasks/:taskId/events
GET /correlations/:correlationId/events
```

Eu faria isso antes de adicionar RabbitMQ externo. O `EventStore` vira a memória/auditoria central do Don Agent.

## Prompt

06/07/2026, 19:27:52

> toEvent(row: any)

gostaria que este método estivesse devidamente tipado e que sempre que possível, evite any

## Response

06/07/2026, 19:26:59

Sim. Troque o `any` por um tipo representando a linha do SQLite:

```ts
type EventRow = {
	event_id: string;
	correlation_id: string;
	conversation_id: string;
	root_task_id: string;
	task_id: string;
	parent_task_id: string | null;
	type: string;
	source: string;
	target: string | null;
	payload: string;
	created_at: string;
};
```

E ajuste o método:

```ts
private toEvent(row: EventRow): EventEnvelope {
  return {
    eventId: row.event_id,
    correlationId: row.correlation_id,
    conversationId: row.conversation_id,
    rootTaskId: row.root_task_id,
    taskId: row.task_id,
    parentTaskId: row.parent_task_id ?? undefined,
    type: row.type,
    source: row.source,
    target: row.target ?? undefined,
    payload: JSON.parse(row.payload) as unknown,
    createdAt: row.created_at
  };
}
```

E nos métodos de listagem, tipa o retorno do `all()`:

```ts
async listByConversation(conversationId: string): Promise<EventEnvelope[]> {
  const rows = this.db
    .prepare<[string], EventRow>(`
      SELECT * FROM events
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `)
    .all(conversationId);

  return rows.map(row => this.toEvent(row));
}
```

Mesma ideia para os outros:

```ts
async listByTask(taskId: string): Promise<EventEnvelope[]> {
  const rows = this.db
    .prepare<[string, string], EventRow>(`
      SELECT * FROM events
      WHERE task_id = ? OR root_task_id = ?
      ORDER BY created_at ASC
    `)
    .all(taskId, taskId);

  return rows.map(row => this.toEvent(row));
}

async listByCorrelation(correlationId: string): Promise<EventEnvelope[]> {
  const rows = this.db
    .prepare<[string], EventRow>(`
      SELECT * FROM events
      WHERE correlation_id = ?
      ORDER BY created_at ASC
    `)
    .all(correlationId);

  return rows.map(row => this.toEvent(row));
}
```

Se quiser manter o `EventEnvelope` genérico, pode deixar assim:

```ts
private toEvent(row: EventRow): EventEnvelope<unknown> {
  return {
    eventId: row.event_id,
    correlationId: row.correlation_id,
    conversationId: row.conversation_id,
    rootTaskId: row.root_task_id,
    taskId: row.task_id,
    parentTaskId: row.parent_task_id ?? undefined,
    type: row.type,
    source: row.source,
    target: row.target ?? undefined,
    payload: JSON.parse(row.payload) as unknown,
    createdAt: row.created_at
  };
}
```

Esse é o ajuste mais limpo para remover o `any`.

## Prompt

06/07/2026, 19:31:05

> O chat pode carregar o histórico assim:
>
>     GET /conversations/:conversationId/eventsGET /tasks/:taskId/eventsGET /correlations/:correlationId/events

para implementar, deveria instanciar apis, certo?

## Response

06/07/2026, 19:30:11

Exatamente. E aqui eu faria uma pequena mudança na arquitetura que vai te beneficiar bastante no futuro.

Em vez de pensar em **"instanciar APIs"**, pense em **Adapters**.

Eu dividiria o Don Agent em 4 camadas:

```text
                Don Agent

        ┌────────────────────────┐
        │      Adapters          │
        │                        │
        │ REST API               │
        │ WebSocket              │
        │ RabbitMQ               │
        │ CLI                    │
        │ Discord                │
        │ Telegram               │
        └─────────────┬──────────┘
                      │
               chama Services
                      │
        ┌─────────────▼──────────┐
        │        Services        │
        │                        │
        │ ConversationService    │
        │ TaskService            │
        │ AgentService           │
        │ EventService           │
        └─────────────┬──────────┘
                      │
                Repository
                      │
        ┌─────────────▼──────────┐
        │     EventStore         │
        │ SQLite / Postgres      │
        └────────────────────────┘
```

## Por quê?

Porque amanhã você vai querer fazer isso:

```text
WebSocket
      │
      ▼
EventService.listConversation()
```

e também

```text
REST

GET /conversations/123/events

      │
      ▼
EventService.listConversation()
```

e também

```text
CLI

don events conversation 123

      │
      ▼
EventService.listConversation()
```

Todos usam o mesmo serviço.

---

# Eu criaria um EventService

```ts
export class EventService {
	constructor(private readonly store: EventStore) {}

	listConversation(conversationId: string) {
		return this.store.listByConversation(conversationId);
	}

	listTask(taskId: string) {
		return this.store.listByTask(taskId);
	}

	listCorrelation(correlationId: string) {
		return this.store.listByCorrelation(correlationId);
	}
}
```

---

# Depois um REST Adapter

Exemplo usando Express:

```ts
router.get('/conversations/:conversationId/events', async (req, res) => {
	const events = await eventService.listConversation(req.params.conversationId);

	res.json(events);
});
```

Outro:

```ts
router.get('/tasks/:taskId/events', async (req, res) => {
	const events = await eventService.listTask(req.params.taskId);

	res.json(events);
});
```

Outro:

```ts
router.get('/correlations/:correlationId/events', async (req, res) => {
	const events = await eventService.listCorrelation(req.params.correlationId);

	res.json(events);
});
```

---

# E o WebSocket?

O WebSocket pode pedir histórico também.

```json
{
	"action": "history",
	"conversationId": "123"
}
```

O Gateway faz:

```ts
const events = await eventService.listConversation(conversationId);

socket.send(events);
```

---

# Mais interessante ainda

Eu faria o WebSocket suportar **subscribe**.

```json
{
	"action": "subscribe",
	"conversationId": "123"
}
```

A partir daí:

```text
Cliente

↓

subscribe conversation 123

↓

Gateway registra inscrição

↓

novo evento chega

↓

Gateway envia somente para inscritos
```

Isso escala muito melhor.

---

# Eu criaria um módulo Gateway

```text
gateway/
│
├── websocket/
│     chat.gateway.ts
│
├── rest/
│     events.controller.ts
│     tasks.controller.ts
│
└── cli/
      cli.gateway.ts
```

Todos chamando os mesmos Services.

---

# E tem uma ideia que acho que combina muito com o Don Agent

Ao invés de pensar em uma REST API tradicional, pense em uma **API orientada a eventos**.

Exemplo:

```http
POST /commands
```

```json
{
	"conversationId": "123",
	"content": "@planner levante o backlog"
}
```

O servidor responde imediatamente:

```json
{
	"taskId": "abc",
	"status": "accepted"
}
```

E todo o restante chega pelo WebSocket.

Isso é muito parecido com sistemas como:

- GitHub Actions
- Temporal
- LangGraph
- OpenAI Assistants
- Claude Code

Todos eles tratam o comando como algo **assíncrono**.

---

## Minha recomendação para o Don Agent

Se eu estivesse começando hoje, faria exatamente assim:

```
src/

core/
services/
repositories/
gateways/
agents/
tools/
providers/
```

Onde:

- **Repositories**: persistência (`EventStore`, `ConversationStore`...)
- **Services**: regras de negócio (`EventService`, `TaskService`...)
- **Gateways**: formas de entrada/saída (REST, WebSocket, CLI, RabbitMQ...)
- **Core**: EventBus, Registry, contratos e tipos
- **Agents**: Planner, Code, Rabbit...
- **Tools**: Shell, Git, Filesystem...
- **Providers**: Ollama, OpenAI, Claude...

Na minha opinião, essa separação vai deixar o Don Agent com uma arquitetura muito próxima de um framework, em vez de uma aplicação única. E isso vai facilitar bastante quando você começar a adicionar integrações como Monday, Azure DevOps, GitHub, RabbitMQ, Discord e outras fontes de eventos.

## Prompt

06/07/2026, 19:36:01

Como eu já comecei o projeto com as instruções anteriores, qual o proximo passo indicado?

## Response

06/07/2026, 19:35:06

> **Relembrando**
>
> Confirmando preferências arquiteturais
>
> **Relembrando**
>
> Identificando decisões anteriores
>
> **Relembrando**
>
> Verificando componentes escolhidos
>
> **Relembrando**
>
> Avaliando próximos passos
>
> ---
>
> Pensou por 6s

Pelo ponto em que você chegou, eu **pararia de adicionar funcionalidades** e começaria a consolidar o kernel do Don Agent.

Até agora você já possui:

- ✅ EventBus
- ✅ EventEnvelope
- ✅ AgentRegistry
- ✅ AgentRouter
- ✅ PlannerAgent
- ✅ WebSocket
- ✅ EventStore
- ✅ OllamaProvider
- ✅ Estrutura inicial dos agentes

Isso já é um bom MVP do core.

Agora, na minha opinião, a evolução deve ser **horizontal**, fortalecendo a arquitetura, e não criando mais agentes.

## Ordem que eu seguiria

### 1. Dependency Injection (prioridade máxima)

Hoje seu `main.ts` provavelmente faz isso:

```ts
const eventBus = new EventBus();
const registry = new AgentRegistry();

registry.register(...);
```

Eu criaria um `Bootstrap`.

```text
src/
    bootstrap/
        bootstrap.ts
```

Algo assim:

```ts
export class Bootstrap {

    static create() {

        const eventStore = new SqliteEventStore();

        const eventBus = new EventBus(eventStore);

        const registry = new AgentRegistry();

        const providerRegistry = new ProviderRegistry();

        ...

        return {
            eventBus,
            registry,
            providerRegistry
        };
    }

}
```

Assim o `main.ts` vira praticamente:

```ts
const app = Bootstrap.create();

app.start();
```

---

# 2. Criar um Service Layer

Hoje o ChatGateway provavelmente faz:

```text
recebe websocket

↓

parse

↓

eventBus.publish(...)
```

Eu criaria:

```text
CommandService
```

Fluxo:

```text
Gateway

↓

CommandService

↓

EventBus
```

Assim amanhã você pode receber comandos por:

- REST

- CLI

- RabbitMQ

- Discord

- Telegram

sem duplicar código.

---

# 3. ConversationService

Hoje você trabalha apenas com eventos.

Mas logo vai querer perguntar:

> quais conversas existem?

Então criaria:

```text
ConversationService
```

Responsável por:

```text
abrir conversa

listar conversas

buscar histórico

fechar conversa
```

---

# 4. TaskService

Mesmo raciocínio.

Responsável por:

```text
criar task

cancelar task

buscar task

listar subtasks
```

---

# 5. Agent Runtime

Esse acho que vai ser o maior ganho.

Hoje:

```text
Router

↓

agent.handle()
```

Eu faria:

```text
Router

↓

AgentRuntime

↓

Agent
```

Porque o Runtime consegue fazer coisas automaticamente.

Exemplo:

```text
AgentRuntime

↓

publica AgentStarted

↓

executa agente

↓

publica AgentCompleted

↓

captura exceções

↓

publica AgentError
```

O agente fica extremamente limpo.

Hoje:

```ts
class Planner {

    async handle() {

        publish("started");

        ...

        publish("completed");

    }

}
```

Depois:

```ts
class Planner {

    async execute() {

        ...

    }

}
```

Quem publica started/completed é o Runtime.

---

# 6. Tool Runtime

Mesma ideia.

Ao invés de:

```text
CodeAgent

↓

ShellTool
```

Fica:

```text
CodeAgent

↓

ToolRuntime

↓

ShellTool
```

O ToolRuntime automaticamente publica:

```text
ToolStarted

ToolOutput

ToolCompleted

ToolError
```

---

# 7. Tool Registry

Esse eu faria logo.

```ts
registry.registerTool(...)
```

Porque daqui pouco você vai ter:

```text
Filesystem

Git

Shell

RabbitMQ

Monday

Azure

GitHub
```

Todos iguais.

---

# 8. Provider Registry

Mesma ideia.

```text
registry.registerProvider(...)
```

Depois:

```text
planner

↓

providerRegistry.get("ollama")
```

---

# 9. Melhorar o Planner

Hoje ele envia apenas:

```text
target

content
```

Eu faria ele gerar:

```json
{
	"steps": [
		{
			"id": "step-1",
			"dependsOn": [],
			"target": "code-agent"
		},
		{
			"id": "step-2",
			"dependsOn": ["step-1"],
			"target": "summary-agent"
		}
	]
}
```

Isso permite dependências.

---

# 10. Criar o primeiro Tool real

Não criaria mais agentes.

Criaria ferramentas.

Por exemplo:

```text
FilesystemTool
```

Com:

```text
readFile

writeFile

listDirectory

exists

delete
```

Depois:

```text
GitTool

ShellTool
```

---

# 11. Frontend

Só depois.

Porque aí o frontend só vai consumir eventos.

---

# Minha visão do projeto daqui a alguns dias

```text
Don Agent

├── Gateway
│
├── Services
│
├── EventBus
│
├── Runtime
│   ├── AgentRuntime
│   └── ToolRuntime
│
├── Registry
│   ├── AgentRegistry
│   ├── ToolRegistry
│   └── ProviderRegistry
│
├── Providers
│
├── Agents
│
├── Tools
│
└── EventStore
```

---

## O passo que eu faria amanhã

Se estivéssemos desenvolvendo isso juntos, eu escolheria **apenas um objetivo**:

> **Implementar o `AgentRuntime`.**

Ele parece uma pequena refatoração, mas vai simplificar todo o restante do projeto.

Imagine que você registre um agente assim:

```ts
registry.register(new PlannerAgent(...));
```

A partir daí, o `AgentRuntime` passa a cuidar automaticamente de:

- publicar `agent.started`;
- medir tempo de execução;
- capturar exceções e publicar `agent.error`;
- publicar `agent.completed`;
- persistir métricas (tempo, consumo de tokens, modelo utilizado);
- alimentar o `EventStore`.

Com isso, os agentes passam a conter **somente a lógica de negócio** (`execute()`), enquanto toda a infraestrutura fica centralizada em um único lugar. Essa separação tende a manter o código muito mais limpo conforme o número de agentes crescer.

## Prompt

06/07/2026, 19:37:30

estruture um backlog simples

## Response

06/07/2026, 19:36:36

Eu montaria o backlog em **épicos**, seguindo uma ordem que permita ter um produto funcionando desde cedo e que evite retrabalho.

---

# MVP 1 — Core

> Objetivo: ter um kernel de agentes funcionando.

| ID       | Item                   | Prioridade | Status |
| -------- | ---------------------- | ---------- | ------ |
| CORE-001 | Bootstrap da aplicação | Alta       | ⬜     |
| CORE-002 | EventBus               | ✅         |
| CORE-003 | EventEnvelope          | ✅         |
| CORE-004 | EventStore SQLite      | ✅         |
| CORE-005 | AgentRegistry          | ✅         |
| CORE-006 | AgentRouter            | ✅         |
| CORE-007 | ProviderRegistry       | ⬜         |
| CORE-008 | ToolRegistry           | ⬜         |
| CORE-009 | Configuração (.env)    | ⬜         |

---

# MVP 2 — Runtime

> Objetivo: centralizar a execução.

| ID      | Item                          | Prioridade | Status |
| ------- | ----------------------------- | ---------- | ------ |
| RUN-001 | AgentRuntime                  | 🔥         | ⬜     |
| RUN-002 | ToolRuntime                   | Alta       | ⬜     |
| RUN-003 | Tratamento global de exceções | Alta       | ⬜     |
| RUN-004 | Timeout de agentes            | Média      | ⬜     |
| RUN-005 | Cancelamento de Tasks         | Média      | ⬜     |
| RUN-006 | Retry Policy                  | Média      | ⬜     |

---

# MVP 3 — Planner

> Objetivo: tornar o Planner realmente inteligente.

| ID       | Item                            | Prioridade | Status |
| -------- | ------------------------------- | ---------- | ------ |
| PLAN-001 | Prompt dinâmico usando Registry | 🔥         | ⬜     |
| PLAN-002 | Geração de plano JSON           | Alta       | ⬜     |
| PLAN-003 | Validação do JSON               | Alta       | ⬜     |
| PLAN-004 | Dependência entre Steps         | Média      | ⬜     |
| PLAN-005 | Paralelismo de Steps            | Média      | ⬜     |
| PLAN-006 | Estratégia de Replanejamento    | Baixa      | ⬜     |

---

# MVP 4 — Providers

| ID      | Item                         | Prioridade | Status |
| ------- | ---------------------------- | ---------- | ------ |
| LLM-001 | Ollama Provider              | ✅         |
| LLM-002 | OpenAI Provider              | ⬜         |
| LLM-003 | Claude Provider              | ⬜         |
| LLM-004 | Gemini Provider              | ⬜         |
| LLM-005 | Seleção dinâmica de Provider | ⬜         |

---

# MVP 5 — Ferramentas

| ID       | Item              | Prioridade | Status |
| -------- | ----------------- | ---------- | ------ |
| TOOL-001 | ShellTool         | 🔥         | ⬜     |
| TOOL-002 | FilesystemTool    | 🔥         | ⬜     |
| TOOL-003 | GitTool           | Alta       | ⬜     |
| TOOL-004 | HTTPTool          | Alta       | ⬜     |
| TOOL-005 | RabbitMQTool      | Média      | ⬜     |
| TOOL-006 | MondayTool        | Média      | ⬜     |
| TOOL-007 | Azure DevOps Tool | Média      | ⬜     |

---

# MVP 6 — Gateway

| ID     | Item              | Prioridade | Status |
| ------ | ----------------- | ---------- | ------ |
| GW-001 | WebSocket         | ✅         |
| GW-002 | REST API          | 🔥         | ⬜     |
| GW-003 | CLI               | Alta       | ⬜     |
| GW-004 | RabbitMQ Consumer | Média      | ⬜     |
| GW-005 | Discord Gateway   | Baixa      | ⬜     |
| GW-006 | Telegram Gateway  | Baixa      | ⬜     |

---

# MVP 7 — Serviços

| ID      | Item                | Prioridade | Status |
| ------- | ------------------- | ---------- | ------ |
| SRV-001 | CommandService      | 🔥         | ⬜     |
| SRV-002 | ConversationService | Alta       | ⬜     |
| SRV-003 | TaskService         | Alta       | ⬜     |
| SRV-004 | EventService        | Média      | ⬜     |

---

# MVP 8 — Auditoria

| ID      | Item                 | Prioridade | Status |
| ------- | -------------------- | ---------- | ------ |
| AUD-001 | Timeline de eventos  | 🔥         | ⬜     |
| AUD-002 | Replay de Tasks      | Alta       | ⬜     |
| AUD-003 | Replay de Conversas  | Alta       | ⬜     |
| AUD-004 | Export JSON          | Média      | ⬜     |
| AUD-005 | Métricas de execução | Média      | ⬜     |

---

# MVP 9 — Frontend

| ID     | Item                              | Prioridade | Status |
| ------ | --------------------------------- | ---------- | ------ |
| UI-001 | Lista de Conversas                | Alta       | ⬜     |
| UI-002 | Chat                              | Alta       | ⬜     |
| UI-003 | Timeline de Eventos               | 🔥         | ⬜     |
| UI-004 | Visualização de Tasks             | Alta       | ⬜     |
| UI-005 | Visualização de Árvore de Agentes | Alta       | ⬜     |
| UI-006 | Console de Ferramentas            | Média      | ⬜     |

---

# MVP 10 — Agentes

| ID     | Item    | Prioridade | Status |
| ------ | ------- | ---------- | ------ |
| AG-001 | Planner | 🔥         | 🚧     |
| AG-002 | Summary | 🚧         | 🚧     |
| AG-003 | Code    | Alta       | ⬜     |
| AG-004 | Git     | Média      | ⬜     |
| AG-005 | Rabbit  | Média      | ⬜     |
| AG-006 | Backlog | Média      | ⬜     |

---

# Ordem que eu seguiria

```text
Sprint 1
────────
CORE
RUN
GW
```

↓

```text
Sprint 2
────────
SERVICES
PLANNER
```

↓

```text
Sprint 3
────────
TOOLS
```

↓

```text
Sprint 4
────────
FRONTEND
```

↓

```text
Sprint 5
────────
Novos agentes
```

---

## O que eu colocaria como primeira milestone

> **Don Agent Core v0.1**

Critérios de aceite:

- Usuário envia `@planner`.
- O Planner consulta o Ollama.
- O Planner gera um plano em JSON.
- O Planner publica comandos para outros agentes.
- Os agentes executam suas tarefas.
- Todos os eventos são persistidos no `EventStore`.
- O WebSocket transmite os eventos em tempo real.
- O histórico pode ser recuperado pela conversa (`conversationId`) ou pela tarefa (`rootTaskId`).

Quando essa milestone estiver pronta, você terá um **kernel completo e extensível**. A partir daí, adicionar um novo agente ou uma nova ferramenta passa a ser uma tarefa de baixo impacto, sem necessidade de alterar a infraestrutura principal. Na minha visão, esse é o ponto em que o Don Agent deixa de ser um protótipo e passa a ser uma plataforma.

## Prompt

06/07/2026, 19:38:35

~/workspace$ pnpm dev

> @rocordeiro/don-server@0.0.1 dev /home/runner/workspace
> tsx watch src/main.ts

/home/runner/workspace/node_modules/.pnpm/bindings@1.5.0/node_modules/bindings/bindings.js:126
err = new Error(
^

Error: Could not locate the bindings file. Tried:
→ /home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/build/better_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/build/Debug/better_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/build/Release/better_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/out/Debug/better_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/Debug/better_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/out/Release/better_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/Release/better_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/build/default/better_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/compiled/24.13.0/linux/x64/better_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/addon-build/release/install-root/better_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/addon-build/debug/install-root/better_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/addon-build/default/install-root/better_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/lib/binding/node-v137-linux-x64/better_sqlite3.node
at bindings (/home/runner/workspace/node_modules/.pnpm/bindings@1.5.0/node_modules/bindings/bindings.js:126:9)
at new Database (/home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/lib/database.js:48:64)
at new SqliteEventStore (/home/runner/workspace/src/store/sqlite-event-store.ts:24:15)
at bootstrap (/home/runner/workspace/src/main.ts:17:22)
at <anonymous> (/home/runner/workspace/src/main.ts:47:1)
at Object.<anonymous> (/home/runner/workspace/src/main.ts:47:11)
at Module._compile (node:internal/modules/cjs/loader:1761:14)
at Object.transformer (/home/runner/workspace/node_modules/.pnpm/tsx@4.23.0/node_modules/tsx/dist/register-BLUABhh3.cjs:9:3252)
at Module.load (node:internal/modules/cjs/loader:1481:32)
at Module._load (node:internal/modules/cjs/loader:1300:12) {
tries: [
'/home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/build/better_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/build/Debug/better_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/build/Release/better_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/out/Debug/better_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/Debug/better_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/out/Release/better_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/Release/better_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/build/default/better_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/compiled/24.13.0/linux/x64/better_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/addon-build/release/install-root/better_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/addon-build/debug/install-root/better_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/addon-build/default/install-root/better_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3/lib/binding/node-v137-linux-x64/better_sqlite3.node'
]
}

Node.js v24.13.0

## Response

06/07/2026, 19:37:41

Esse erro é do `better-sqlite3`: ele usa **binding nativo** e não encontrou/compilou o `.node` para seu ambiente. O detalhe importante é que você está em **Node.js v24.13.0**, que costuma quebrar libs nativas com mais facilidade.

Eu faria uma destas duas opções:

## Opção recomendada: trocar para `sqlite`

Use SQLite assíncrono sem depender do `better-sqlite3`.

```bash id="fbppmn"
pnpm remove better-sqlite3 @types/better-sqlite3
pnpm add sqlite sqlite3
```

Depois ajuste o store para async:

```ts id="wsgr57"
// src/store/sqlite-event-store.ts

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { EventEnvelope } from '../core/events/event-envelope';
import { EventStore } from './event-store';

type EventRow = {
	event_id: string;
	correlation_id: string;
	conversation_id: string;
	root_task_id: string;
	task_id: string;
	parent_task_id: string | null;
	type: string;
	source: string;
	target: string | null;
	payload: string;
	created_at: string;
};

export class SqliteEventStore implements EventStore {
	private db!: Database<sqlite3.Database, sqlite3.Statement>;

	static async create(path = 'don-agent-events.db') {
		const store = new SqliteEventStore();
		store.db = await open({
			filename: path,
			driver: sqlite3.Database,
		});

		await store.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY,
        correlation_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        root_task_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        parent_task_id TEXT,
        type TEXT NOT NULL,
        source TEXT NOT NULL,
        target TEXT,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_conversation
        ON events(conversation_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_events_task
        ON events(task_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_events_root_task
        ON events(root_task_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_events_correlation
        ON events(correlation_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_events_type
        ON events(type, created_at);
    `);

		return store;
	}

	async append(event: EventEnvelope): Promise<void> {
		await this.db.run(
			`
      INSERT INTO events (
        event_id,
        correlation_id,
        conversation_id,
        root_task_id,
        task_id,
        parent_task_id,
        type,
        source,
        target,
        payload,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
			[
				event.eventId,
				event.correlationId,
				event.conversationId,
				event.rootTaskId,
				event.taskId,
				event.parentTaskId ?? null,
				event.type,
				event.source,
				event.target ?? null,
				JSON.stringify(event.payload),
				event.createdAt,
			],
		);
	}

	async listByConversation(conversationId: string): Promise<EventEnvelope[]> {
		const rows = await this.db.all<EventRow[]>(
			`
      SELECT * FROM events
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      `,
			conversationId,
		);

		return rows.map(row => this.toEvent(row));
	}

	async listByTask(taskId: string): Promise<EventEnvelope[]> {
		const rows = await this.db.all<EventRow[]>(
			`
      SELECT * FROM events
      WHERE task_id = ? OR root_task_id = ?
      ORDER BY created_at ASC
      `,
			taskId,
			taskId,
		);

		return rows.map(row => this.toEvent(row));
	}

	async listByCorrelation(correlationId: string): Promise<EventEnvelope[]> {
		const rows = await this.db.all<EventRow[]>(
			`
      SELECT * FROM events
      WHERE correlation_id = ?
      ORDER BY created_at ASC
      `,
			correlationId,
		);

		return rows.map(row => this.toEvent(row));
	}

	private toEvent(row: EventRow): EventEnvelope<unknown> {
		return {
			eventId: row.event_id,
			correlationId: row.correlation_id,
			conversationId: row.conversation_id,
			rootTaskId: row.root_task_id,
			taskId: row.task_id,
			parentTaskId: row.parent_task_id ?? undefined,
			type: row.type,
			source: row.source,
			target: row.target ?? undefined,
			payload: JSON.parse(row.payload) as unknown,
			createdAt: row.created_at,
		};
	}
}
```

No `main.ts`, como agora a criação é async:

```ts id="lv2mez"
const eventStore = await SqliteEventStore.create('don-agent-events.db');
const eventBus = new EventBus(eventStore);
```

## Opção alternativa: manter `better-sqlite3`

Tente usar Node LTS, por exemplo Node 22:

```bash id="so0n08"
nvm install 22
nvm use 22
pnpm rebuild better-sqlite3
pnpm dev
```

Eu seguiria com a primeira opção agora para evitar dor com binding nativo durante o desenvolvimento.

## Prompt

06/07/2026, 19:43:20

vamos atuar na CORE-001

## Response

06/07/2026, 19:42:26

Boa. CORE-001 deve deixar o `main.ts` limpo e concentrar a montagem da aplicação em um único lugar: stores, bus, registries, providers, agentes, router e gateways.

Vamos implementar a **CORE-001 — Bootstrap da aplicação**.

## Objetivo

Tirar isso do `main.ts`:

```ts
const eventBus = ...
const registry = ...
registry.register(...)
router.start()
gateway.start()
```

E mover para:

```text
src/bootstrap/bootstrap.ts
```

---

## Estrutura

```text
src/
├── bootstrap/
│   ├── bootstrap.ts
│   └── app-context.ts
```

---

## `app-context.ts`

```ts
// src/bootstrap/app-context.ts

import { EventBus } from '../core/events/event-bus';
import { AgentRegistry } from '../core/agents/agent-registry';
import { AgentRouter } from '../core/agents/agent-router';
import { ChatGateway } from '../gateway/chat-gateway';
import { LlmProvider } from '../core/providers/llm-provider';
import { EventStore } from '../store/event-store';

export type AppContext = {
	eventStore: EventStore;
	eventBus: EventBus;
	agentRegistry: AgentRegistry;
	agentRouter: AgentRouter;
	chatGateway: ChatGateway;
	llmProvider: LlmProvider;
};
```

---

## `bootstrap.ts`

```ts
// src/bootstrap/bootstrap.ts

import { EventBus } from '../core/events/event-bus';
import { AgentRegistry } from '../core/agents/agent-registry';
import { AgentRouter } from '../core/agents/agent-router';

import { OllamaProvider } from '../core/providers/ollama-provider';
import { SqliteEventStore } from '../store/sqlite-event-store';

import { PlannerAgent } from '../agents/planner/planner-agent';
import { BacklogAgent } from '../agents/backlog/backlog-agent';
import { SummaryAgent } from '../agents/summary/summary-agent';

import { ChatGateway } from '../gateway/chat-gateway';
import { AppContext } from './app-context';

export class Bootstrap {
	static async create(): Promise<AppContext> {
		const eventStore = await SqliteEventStore.create('don-agent-events.db');

		const eventBus = new EventBus(eventStore);

		const agentRegistry = new AgentRegistry();

		const llmProvider = new OllamaProvider();

		agentRegistry.register(new BacklogAgent(eventBus));
		agentRegistry.register(new SummaryAgent(eventBus));
		agentRegistry.register(new PlannerAgent(eventBus, agentRegistry, llmProvider));

		const agentRouter = new AgentRouter(eventBus, agentRegistry);

		const chatGateway = new ChatGateway(eventBus, agentRegistry, 3001);

		return {
			eventStore,
			eventBus,
			agentRegistry,
			agentRouter,
			chatGateway,
			llmProvider,
		};
	}

	static async start(): Promise<AppContext> {
		const context = await Bootstrap.create();

		context.agentRouter.start();

		context.chatGateway.start();

		context.eventBus.subscribeAll(event => {
			console.log(`[${event.type}]`, {
				source: event.source,
				target: event.target,
				taskId: event.taskId,
				payload: event.payload,
			});
		});

		return context;
	}
}
```

---

## Novo `main.ts`

```ts
// src/main.ts

import { Bootstrap } from './bootstrap/bootstrap';

Bootstrap.start().catch(error => {
	console.error('[bootstrap.error]', error);
	process.exit(1);
});
```

---

## Resultado

Agora o `main.ts` fica limpo:

```text
main.ts
  ↓
Bootstrap.start()
  ↓
monta aplicação
  ↓
sobe router
  ↓
sobe websocket
```

---

## Critério de aceite da CORE-001

- `pnpm dev` inicia a aplicação.
- `main.ts` não instancia dependências diretamente.
- `Bootstrap.create()` monta o contexto da aplicação.
- `Bootstrap.start()` inicia router e gateway.
- O WebSocket continua funcionando em `ws://localhost:3001`.
- Os agentes continuam registrados dinamicamente no `AgentRegistry`.

Próximo item natural: **CORE-007 — ProviderRegistry**.

## Prompt

06/07/2026, 19:50:22

> @rocordeiro/don-server@0.0.1 dev /home/runner/workspace
> tsx watch src/main.ts

/home/runner/workspace/node_modules/.pnpm/bindings@1.5.0/node_modules/bindings/bindings.js:126
err = new Error(
^

Error: Could not locate the bindings file. Tried:
→ /home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/build/node_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/build/Debug/node_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/build/Release/node_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/out/Debug/node_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/Debug/node_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/out/Release/node_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/Release/node_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/build/default/node_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/compiled/24.13.0/linux/x64/node_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/addon-build/release/install-root/node_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/addon-build/debug/install-root/node_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/addon-build/default/install-root/node_sqlite3.node
→ /home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/lib/binding/node-v137-linux-x64/node_sqlite3.node
at bindings (/home/runner/workspace/node_modules/.pnpm/bindings@1.5.0/node_modules/bindings/bindings.js:126:9)
at Object.<anonymous> (/home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/lib/sqlite3-binding.js:1:37)
at Module._compile (node:internal/modules/cjs/loader:1761:14)
at Object.transformer (/home/runner/workspace/node_modules/.pnpm/tsx@4.23.0/node_modules/tsx/dist/register-BLUABhh3.cjs:9:3252)
at Module.load (node:internal/modules/cjs/loader:1481:32)
at Module._load (node:internal/modules/cjs/loader:1300:12)
at TracingChannel.traceSync (node:diagnostics_channel:328:14)
at wrapModuleLoad (node:internal/modules/cjs/loader:245:24)
at Module.require (node:internal/modules/cjs/loader:1504:12)
at require (node:internal/modules/helpers:152:16) {
tries: [
'/home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/build/node_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/build/Debug/node_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/build/Release/node_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/out/Debug/node_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/Debug/node_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/out/Release/node_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/Release/node_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/build/default/node_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/compiled/24.13.0/linux/x64/node_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/addon-build/release/install-root/node_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/addon-build/debug/install-root/node_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/addon-build/default/install-root/node_sqlite3.node',
'/home/runner/workspace/node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3/lib/binding/node-v137-linux-x64/node_sqlite3.node'
]
}

Node.js v24.13.0

## Response

06/07/2026, 19:49:27

O problema continua pelo mesmo motivo: `sqlite3` também usa binding nativo. Com **Node 24**, isso tende a falhar.

Para destravar agora, eu trocaria o `EventStore` para **arquivo JSONL**, sem dependência nativa. Depois você migra para SQLite/Postgres.

## 1. Remova SQLite por enquanto

```bash
pnpm remove sqlite sqlite3 better-sqlite3 @types/better-sqlite3
```

## 2. Crie `FileEventStore`

```ts
// src/store/file-event-store.ts

import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { EventEnvelope } from '../core/events/event-envelope';
import { EventStore } from './event-store';

export class FileEventStore implements EventStore {
	constructor(private readonly path = 'data/events.jsonl') {}

	async append(event: EventEnvelope): Promise<void> {
		await mkdir(dirname(this.path), { recursive: true });

		await appendFile(this.path, `${JSON.stringify(event)}\n`, 'utf-8');
	}

	async listByConversation(conversationId: string): Promise<EventEnvelope[]> {
		const events = await this.readAll();

		return events.filter(event => {
			return event.conversationId === conversationId;
		});
	}

	async listByTask(taskId: string): Promise<EventEnvelope[]> {
		const events = await this.readAll();

		return events.filter(event => {
			return event.taskId === taskId || event.rootTaskId === taskId;
		});
	}

	async listByCorrelation(correlationId: string): Promise<EventEnvelope[]> {
		const events = await this.readAll();

		return events.filter(event => {
			return event.correlationId === correlationId;
		});
	}

	private async readAll(): Promise<EventEnvelope[]> {
		try {
			const content = await readFile(this.path, 'utf-8');

			return content
				.split('\n')
				.filter(Boolean)
				.map(line => JSON.parse(line) as EventEnvelope);
		} catch (error) {
			if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
				return [];
			}

			throw error;
		}
	}
}
```

## 3. Ajuste o Bootstrap

```ts
// src/bootstrap/bootstrap.ts

import { FileEventStore } from '../store/file-event-store';

// ...

const eventStore = new FileEventStore('data/events.jsonl');
const eventBus = new EventBus(eventStore);
```

## 4. Resultado esperado

Agora deve subir sem binding nativo:

```bash
pnpm dev
```

O arquivo de auditoria será gerado aqui:

```text
data/events.jsonl
```

Esse é um bom caminho para o MVP. Para produção, eu migraria depois para Postgres, evitando `sqlite3`/`better-sqlite3` no Node 24.

## Prompt

06/07/2026, 20:33:38

Funcionou com o jsonl. Qual a diferença entre jsonl e json?

## Response

06/07/2026, 20:33:38

Excelente! E, curiosamente, para o tipo de sistema que você está construindo (eventos), **JSONL é até mais adequado que JSON**.

A diferença é simples:

## JSON

É um único documento JSON válido.

```json
[
	{
		"eventId": "1",
		"type": "agent.command"
	},
	{
		"eventId": "2",
		"type": "agent.result"
	}
]
```

Problema:

Toda vez que chega um novo evento, você precisa:

1. Ler o arquivo inteiro.
2. Fazer o parse.
3. Adicionar um item.
4. Serializar tudo novamente.
5. Reescrever o arquivo inteiro.

Com 100 mil eventos isso fica lento.

---

## JSONL (JSON Lines)

É uma coleção de JSONs independentes.

```text
{"eventId":"1","type":"agent.command"}
{"eventId":"2","type":"agent.result"}
{"eventId":"3","type":"tool.started"}
{"eventId":"4","type":"tool.finished"}
```

Cada linha é um JSON válido.

Então adicionar um evento é simplesmente:

```ts
appendFile(...);
```

Você nunca reescreve o arquivo.

---

# Por que bancos de log usam isso?

Porque log é **append-only**.

Você nunca faz:

```text
editar evento 123
```

Você faz:

```text
evento 124 aconteceu
evento 125 aconteceu
evento 126 aconteceu
```

É exatamente igual ao Git.

O Git nunca altera um commit.

Ele adiciona outro.

---

# No Don Agent isso é perfeito

Imagine essa conversa:

```text
@planner faça X
```

O arquivo fica:

```text
{"type":"human.instruction"}
{"type":"agent.started"}
{"type":"planner.message"}
{"type":"agent.command"}
{"type":"agent.started"}
{"type":"tool.started"}
{"type":"tool.finished"}
{"type":"agent.completed"}
```

É praticamente um log de auditoria.

---

# Outra vantagem

Ele pode crescer para milhões de eventos.

Depois você consegue fazer:

```bash
grep planner events.jsonl
```

ou

```bash
tail -f events.jsonl
```

ou

```bash
jq '.type' events.jsonl
```

Sem precisar carregar tudo na memória.

---

# Inclusive

Eu faria uma pequena mudança no `FileEventStore`.

Hoje você tem:

```text
data/events.jsonl
```

Eu faria:

```text
data/

    conversations/

        conv-001.jsonl

        conv-002.jsonl

        conv-003.jsonl
```

Porque aí:

```text
Conversation

↓

arquivo
```

Fica muito mais simples.

Quando o usuário abre a conversa:

```text
GET conversation
```

Você lê apenas:

```text
conv-001.jsonl
```

---

# Ou melhor ainda

Separaria por dia.

```text
data/

    2026/

        07/

            06/

                conv-001.jsonl
```

Depois fica fácil arquivar.

---

# E a ideia que eu mais gostei pensando no Don Agent

Como você já possui um `EventEnvelope`, eu faria os arquivos serem literalmente um **Event Stream**.

```text
events/

    conv-001/

        000001.json

        000002.json

        000003.json
```

ou

```text
conv-001.jsonl
```

Isso permite fazer **Replay**.

Exemplo:

```text
Replay Conversation

↓

lê linha 1

↓

publica EventBus

↓

lê linha 2

↓

publica EventBus

↓

...
```

Seu sistema "revive" uma conversa inteira.

---

## Minha recomendação

Para o **MVP**, eu manteria exatamente o `jsonl`.

Ele tem várias vantagens para o seu caso:

- Não depende de bibliotecas nativas.
- É extremamente rápido para escrita (append).
- Funciona muito bem como trilha de auditoria.
- Facilita replay e depuração.
- É simples de inspecionar manualmente.

Quando o projeto crescer, a migração para um banco será tranquila porque você já abstraiu tudo atrás da interface `EventStore`. Você só troca a implementação (`FileEventStore` → `PostgresEventStore`, por exemplo) sem alterar os agentes, o `EventBus` ou os gateways.

Na verdade, eu manteria o `FileEventStore` mesmo depois da migração, mas como uma implementação útil para desenvolvimento e testes locais.

## Prompt

06/07/2026, 20:36:06

Nao identifiquei no log de auditoria o type de human interaction, pelo que observei só estamos logando eventos publicados no eventbus, nao temos logs de mensagens como o human interaction. Ou eu que encherguei errado?

## Response

06/07/2026, 20:36:08

Você enxergou certo.

Hoje o `ChatGateway` provavelmente está publicando direto:

```ts
type: 'agent.command';
source: 'chat-gateway';
target: parsed.target;
```

Ou seja, a mensagem humana **vira comando**, mas não existe um evento separado registrando:

```ts
type: 'human.instruction';
```

Para auditoria, eu corrigiria isso criando **dois eventos**:

```text
1. human.instruction  → registra o input original do usuário
2. agent.command      → comando roteado para o agente
```

Exemplo no `ChatGateway`:

```ts
const parsed = parseCommand(message.content, this.registry);

const taskId = randomUUID();
const correlationId = randomUUID();

const base = {
	correlationId,
	conversationId: message.conversationId ?? 'conv-local',
	rootTaskId: taskId,
	taskId,
	createdAt: new Date().toISOString(),
};

await this.eventBus.publish({
	...base,
	eventId: randomUUID(),
	type: 'human.instruction',
	source: 'user',
	target: parsed.target,
	payload: {
		rawContent: message.content,
		content: parsed.content,
		mention: parsed.mention,
	},
});

await this.eventBus.publish({
	...base,
	eventId: randomUUID(),
	type: 'agent.command',
	source: 'chat-gateway',
	target: parsed.target,
	payload: {
		content: parsed.content,
	},
	createdAt: new Date().toISOString(),
});
```

Para isso, eu ajustaria também o `ParsedCommand`:

```ts
export type ParsedCommand = {
	target: string;
	content: string;
	mention?: string;
};
```

E o parser:

```ts
export function parseCommand(input: string, registry: AgentRegistry): ParsedCommand {
	const match = input.match(/^@([\w-]+),?\s+(.+)$/);

	if (!match) {
		return {
			target: 'planner-agent',
			content: input,
		};
	}

	const [, mention, content] = match;

	const possibleNames = [mention, `${mention}-agent`];

	const target = possibleNames.find(name => registry.has(name));

	return {
		target: target ?? 'planner-agent',
		content,
		mention,
	};
}
```

Assim o JSONL passa a ficar mais correto:

```json
{"type":"human.instruction","source":"user","target":"backlog-agent","payload":{"rawContent":"@backlog, Levante o backlog do projeto","content":"Levante o backlog do projeto","mention":"backlog"}}
{"type":"agent.command","source":"chat-gateway","target":"backlog-agent","payload":{"content":"Levante o backlog do projeto"}}
{"type":"agent.result","source":"backlog-agent","payload":{"status":"completed","result":"Backlog fake: 3 itens pendentes encontrados."}}
```

Esse modelo é melhor porque separa:

```text
human.instruction = o que o usuário realmente digitou
agent.command     = o comando normalizado que o sistema enviou ao agente
```

Para auditoria, essa diferença é importante. O primeiro evento registra a intenção humana original; o segundo registra a decisão do sistema de roteamento.

## Prompt

06/07/2026, 20:43:50

Me explique a proxima task?

## Response

06/07/2026, 20:43:51

A próxima task indicada é:

## CORE-007 — ProviderRegistry

Hoje o `PlannerAgent` recebe direto:

```ts
new PlannerAgent(eventBus, agentRegistry, ollamaProvider);
```

Isso funciona, mas deixa o projeto preso ao Ollama.

A ideia do **ProviderRegistry** é criar um catálogo de provedores de IA:

```text
ollama
openai
claude
gemini
```

Assim o agente não precisa saber como o provider foi instanciado. Ele só pede:

```ts
providerRegistry.get('ollama');
```

## Por que essa task agora?

Porque você já tem:

```text
EventBus
AgentRegistry
ChatGateway
EventStore
Bootstrap
```

Agora falta organizar a camada de LLM da mesma forma que organizou agentes.

## Resultado esperado

Você vai sair disso:

```ts
const ollama = new OllamaProvider();

registry.register(new PlannerAgent(eventBus, agentRegistry, ollama));
```

Para isso:

```ts
const providerRegistry = new ProviderRegistry();

providerRegistry.register(new OllamaProvider());

registry.register(new PlannerAgent(eventBus, agentRegistry, providerRegistry));
```

E dentro do Planner:

```ts
const llm = this.providerRegistry.get('ollama');
```

## Estrutura da task

```text
src/core/providers/
├── llm-provider.ts
├── ollama-provider.ts
└── provider-registry.ts
```

## Critério de aceite

- Criar `ProviderRegistry`.
- Registrar `OllamaProvider` no bootstrap.
- Alterar `PlannerAgent` para usar o registry.
- Remover dependência direta do Planner com `OllamaProvider`.
- A aplicação continuar respondendo `@planner`.

Essa task prepara o projeto para usar outros modelos depois, sem reescrever os agentes.

## Prompt

06/07/2026, 20:45:55

Porque a proxima task indicada é a core-007 e nao a core-002?

## Response

06/07/2026, 20:45:55

Boa observação. Na verdade, **não deveria ser**. Eu pulei porque, durante a conversa, fomos implementando partes do core sem seguir rigidamente a numeração do backlog.

Se olharmos o backlog que eu propus:

| ID       | Item             | Status atual            |
| -------- | ---------------- | ----------------------- |
| CORE-001 | Bootstrap        | 🚧 Em andamento         |
| CORE-002 | EventBus         | ✅ Implementado         |
| CORE-003 | EventEnvelope    | ✅ Implementado         |
| CORE-004 | EventStore       | ✅ Implementado (JSONL) |
| CORE-005 | AgentRegistry    | ✅ Implementado         |
| CORE-006 | AgentRouter      | ✅ Implementado         |
| CORE-007 | ProviderRegistry | ⬜                      |
| CORE-008 | ToolRegistry     | ⬜                      |
| CORE-009 | Configuração     | ⬜                      |

Na prática, nós implementamos antes:

- EventBus
- EventEnvelope
- EventStore
- Registry
- Router

e só depois começamos o Bootstrap.

Então a numeração acabou ficando "fora de ordem".

---

# O que eu faria agora

Na verdade, eu reorganizaria o backlog.

Porque depois de conversar bastante sobre a arquitetura, eu mudaria a prioridade.

## Fase 1 — Kernel

```text
CORE-001 Bootstrap
CORE-002 EventBus
CORE-003 EventEnvelope
CORE-004 EventStore
CORE-005 Registry
CORE-006 Router
```

**Tudo isso já existe.**

---

## Fase 2 — Runtime

Aqui está, na minha opinião, o maior ganho.

```text
RUN-001 AgentRuntime
RUN-002 ToolRuntime
RUN-003 EventPublisher
RUN-004 ExceptionHandler
```

Eu faria isso **antes** de ProviderRegistry.

---

## Por quê?

Olha como está hoje:

```text
Router

↓

PlannerAgent

↓

publish()

↓

publish()

↓

publish()
```

Cada agente precisa lembrar de publicar:

```ts
agent.started;

agent.completed;

agent.error;
```

Isso vai se repetir em **todos** os agentes.

---

Com um Runtime:

```text
Router

↓

AgentRuntime

↓

PlannerAgent.execute()
```

O Runtime faz automaticamente:

```text
agent.started

↓

execute()

↓

agent.completed

↓

agent.error
```

Então o agente fica assim:

```ts
class PlannerAgent {

    async execute(...) {

        ...

    }

}
```

Muito menor.

---

## Depois sim

```text
ProviderRegistry
ToolRegistry
CommandService
ConversationService
```

---

# Minha proposta de reorganização

Eu faria assim:

```text
CORE
│
├── Bootstrap ✔
├── EventBus ✔
├── EventEnvelope ✔
├── EventStore ✔
├── Registry ✔
└── Router ✔
```

↓

```text
RUNTIME
│
├── AgentRuntime
├── ToolRuntime
├── ExceptionHandler
└── Metrics
```

↓

```text
SERVICES
│
├── CommandService
├── ConversationService
├── TaskService
└── EventService
```

↓

```text
REGISTRIES
│
├── ProviderRegistry
├── ToolRegistry
└── MemoryRegistry
```

↓

```text
TOOLS
```

↓

```text
FRONTEND
```

---

# Se fosse meu projeto

Depois dessa conversa toda, eu mudaria completamente o backlog.

Porque eu percebi uma coisa: **o coração do Don Agent não é o Planner**.

É o **Runtime**.

O Planner é só mais um agente.

O Runtime é quem faz:

- auditoria;
- métricas;
- tratamento de erros;
- publicação de eventos;
- timeout;
- retry;
- cancelamento;
- tracing.

Ou seja, todos os agentes passam por ele.

## Minha recomendação

Eu deixaria o backlog assim:

1. ✅ Bootstrap
2. ✅ EventBus
3. ✅ EventStore
4. ✅ Registry
5. **➡️ AgentRuntime**
6. ToolRuntime
7. CommandService
8. ProviderRegistry
9. ToolRegistry

Essa mudança vai te poupar muito retrabalho. Quando você começar a criar `CodeAgent`, `GitAgent`, `RabbitAgent`, `MondayAgent` e outros, todos eles herdarão o mesmo ciclo de vida gerenciado pelo Runtime, sem duplicar código de infraestrutura em cada agente. Na minha visão, esse é o próximo grande passo para transformar o Don Agent em uma plataforma sólida.

## Prompt

06/07/2026, 20:48:16

Saquei. E em que parte disso entra o service layer que comentamos anteriormente?

## Response

06/07/2026, 20:48:18

O **Service Layer** entra entre os **Gateways** e o **Core**.

```text id="oapktz"
WebSocket / REST / CLI / RabbitMQ
              ↓
        Service Layer
              ↓
   EventBus / Runtime / Store / Registry
              ↓
            Agents
```

Hoje seu `ChatGateway` provavelmente faz coisas demais:

```text id="byw8qi"
recebe mensagem
parseia comando
gera IDs
publica human.instruction
publica agent.command
```

Isso deveria ir para um serviço:

```text id="936a1d"
ChatGateway
    ↓
CommandService
    ↓
EventBus
```

## Onde cada peça fica

```text id="c1n3j7"
Gateways
- recebem entrada externa
- WebSocket, REST, CLI, RabbitMQ
- validam o mínimo
- chamam Services

Services
- criam taskId/correlationId
- criam eventos
- consultam histórico
- aplicam regras de negócio
- chamam EventBus/EventStore

Core
- EventBus
- AgentRegistry
- AgentRouter
- AgentRuntime
- EventEnvelope

Agents
- lógica especializada
```

## Exemplo prático

O `ChatGateway` ficaria simples:

```ts id="mf8li2"
await this.commandService.handleUserMessage({
	conversationId: message.conversationId,
	content: message.content,
	source: 'websocket',
});
```

E o `CommandService` faria o trabalho pesado:

```ts id="85zy0c"
export class CommandService {
	constructor(
		private readonly eventBus: EventBus,
		private readonly agentRegistry: AgentRegistry,
	) {}

	async handleUserMessage(input: { conversationId?: string; content: string; source: string }) {
		const parsed = parseCommand(input.content, this.agentRegistry);

		const taskId = crypto.randomUUID();
		const correlationId = crypto.randomUUID();

		await this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId,
			conversationId: input.conversationId ?? 'conv-local',
			rootTaskId: taskId,
			taskId,
			type: 'human.instruction',
			source: input.source,
			target: parsed.target,
			payload: {
				rawContent: input.content,
				content: parsed.content,
				mention: parsed.mention,
			},
			createdAt: new Date().toISOString(),
		});

		await this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId,
			conversationId: input.conversationId ?? 'conv-local',
			rootTaskId: taskId,
			taskId,
			type: 'agent.command',
			source: 'command-service',
			target: parsed.target,
			payload: {
				content: parsed.content,
			},
			createdAt: new Date().toISOString(),
		});

		return {
			taskId,
			correlationId,
		};
	}
}
```

## Então a ordem ideal ficaria

Antes do `AgentRuntime`, eu faria:

```text id="25nghd"
SRV-001 CommandService
```

Porque ele limpa o gateway e centraliza a criação dos eventos humanos.

Depois:

```text id="bjqkir"
RUN-001 AgentRuntime
```

A sequência que eu seguiria agora:

```text id="qis2kf"
1. CommandService
2. AgentRuntime
3. ToolRegistry
4. ToolRuntime
5. ProviderRegistry
```

Resumo: **Gateway adapta protocolo; Service aplica fluxo do sistema; Core executa infraestrutura; Agent resolve a tarefa.**

## Prompt

06/07/2026, 20:49:49

Refatore o backlog de acordo

## Response

06/07/2026, 20:49:51

Backlog refatorado:

## Fase 1 — Kernel

| ID       | Item                         | Status |
| -------- | ---------------------------- | ------ |
| CORE-001 | Bootstrap da aplicação       | ✅     |
| CORE-002 | EventEnvelope                | ✅     |
| CORE-003 | EventBus                     | ✅     |
| CORE-004 | EventStore JSONL             | ✅     |
| CORE-005 | AgentRegistry                | ✅     |
| CORE-006 | AgentRouter                  | ✅     |
| CORE-007 | CommandParser com `@mention` | ✅     |

## Fase 2 — Service Layer

| ID      | Item                | Status |
| ------- | ------------------- | ------ |
| SRV-001 | CommandService      | ⬜     |
| SRV-002 | EventService        | ⬜     |
| SRV-003 | ConversationService | ⬜     |
| SRV-004 | TaskService         | ⬜     |

## Fase 3 — Runtime

| ID      | Item                            | Status |
| ------- | ------------------------------- | ------ |
| RUN-001 | AgentRuntime                    | ⬜     |
| RUN-002 | Agent lifecycle events          | ⬜     |
| RUN-003 | Global agent exception handling | ⬜     |
| RUN-004 | Agent execution metrics         | ⬜     |
| RUN-005 | Agent timeout                   | ⬜     |
| RUN-006 | Task cancellation               | ⬜     |

## Fase 4 — Registries

| ID      | Item             | Status |
| ------- | ---------------- | ------ |
| REG-001 | ProviderRegistry | ⬜     |
| REG-002 | ToolRegistry     | ⬜     |
| REG-003 | MemoryRegistry   | ⬜     |

## Fase 5 — Tool Runtime

| ID         | Item                         | Status |
| ---------- | ---------------------------- | ------ |
| TOOLRT-001 | ToolRuntime                  | ⬜     |
| TOOLRT-002 | Tool lifecycle events        | ⬜     |
| TOOLRT-003 | Tool exception handling      | ⬜     |
| TOOLRT-004 | Tool permission/safety layer | ⬜     |

## Fase 6 — Providers

| ID      | Item                               | Status |
| ------- | ---------------------------------- | ------ |
| LLM-001 | OllamaProvider                     | ✅     |
| LLM-002 | OpenAIProvider                     | ⬜     |
| LLM-003 | ClaudeProvider                     | ⬜     |
| LLM-004 | Seleção dinâmica de provider/model | ⬜     |

## Fase 7 — Ferramentas

| ID       | Item            | Status |
| -------- | --------------- | ------ |
| TOOL-001 | FilesystemTool  | ⬜     |
| TOOL-002 | ShellTool       | ⬜     |
| TOOL-003 | GitTool         | ⬜     |
| TOOL-004 | HttpTool        | ⬜     |
| TOOL-005 | RabbitMQTool    | ⬜     |
| TOOL-006 | MondayTool      | ⬜     |
| TOOL-007 | AzureDevOpsTool | ⬜     |

## Fase 8 — Gateways

| ID     | Item             | Status |
| ------ | ---------------- | ------ |
| GW-001 | WebSocketGateway | ✅     |
| GW-002 | REST API         | ⬜     |
| GW-003 | CLI Gateway      | ⬜     |
| GW-004 | RabbitMQ Gateway | ⬜     |

## Fase 9 — Agentes

| ID     | Item         | Status  |
| ------ | ------------ | ------- |
| AG-001 | PlannerAgent | 🚧      |
| AG-002 | SummaryAgent | 🚧      |
| AG-003 | BacklogAgent | 🚧 fake |
| AG-004 | CodeAgent    | ⬜      |
| AG-005 | GitAgent     | ⬜      |
| AG-006 | RabbitAgent  | ⬜      |

## Fase 10 — Auditoria e UI

| ID      | Item                           | Status |
| ------- | ------------------------------ | ------ |
| AUD-001 | Timeline por conversa          | ⬜     |
| AUD-002 | Timeline por task/rootTask     | ⬜     |
| AUD-003 | Replay de eventos              | ⬜     |
| AUD-004 | Export JSON/JSONL              | ⬜     |
| UI-001  | Frontend de chat               | ⬜     |
| UI-002  | Visualização de eventos        | ⬜     |
| UI-003  | Árvore de execução dos agentes | ⬜     |

## Próximas 5 tasks recomendadas

```text
SRV-001 CommandService
RUN-001 AgentRuntime
RUN-002 Agent lifecycle events
REG-001 ProviderRegistry
REG-002 ToolRegistry
```

A próxima implementação que eu faria é **SRV-001 CommandService**, porque ela remove regra de negócio do `ChatGateway` e centraliza a criação de `human.instruction` e `agent.command`.

## Prompt

06/07/2026, 20:51:28

Ordene o backlog em questão de prioridade. Quebre cada tarefa no menor entregável possível, separe por sprints de no máximo cinco tarefas, respeitando os entregáveis.

## Response

06/07/2026, 20:51:28

Essa é exatamente a forma como eu gerenciaria esse projeto. Em vez de épicos grandes, eu quebraria em **vertical slices**, onde cada sprint entrega algo utilizável.

O objetivo é que **ao final de cada sprint o Don Agent esteja melhor do que estava antes**, e não apenas "mais estruturado".

---

# Sprint 1 — Kernel

**Objetivo:** inicializar a plataforma.

| ID       | Tarefa                 | Entregável                             |
| -------- | ---------------------- | -------------------------------------- |
| CORE-001 | Bootstrap da aplicação | `main.ts` reduzido apenas ao bootstrap |
| CORE-002 | EventEnvelope          | Modelo único para todos os eventos     |
| CORE-003 | EventBus               | Publicação e assinatura funcionando    |
| CORE-004 | FileEventStore (JSONL) | Persistência de eventos                |
| CORE-005 | AgentRegistry          | Registro dinâmico de agentes           |

**Entrega**

```text
✓ EventBus funcionando
✓ Auditoria em JSONL
✓ Registro de agentes
```

---

# Sprint 2 — Comunicação

**Objetivo:** permitir conversar com os agentes.

| ID       | Tarefa                      | Entregável                |
| -------- | --------------------------- | ------------------------- |
| GW-001   | WebSocket Gateway           | Cliente conecta           |
| SRV-001  | CommandService              | Entrada única de comandos |
| CORE-006 | AgentRouter                 | Roteamento por target     |
| CORE-007 | CommandParser               | Parser usando Registry    |
| AUD-001  | Registrar human.instruction | Entrada auditada          |

**Entrega**

```text
WebSocket

↓

CommandService

↓

human.instruction

↓

agent.command
```

---

# Sprint 3 — Primeiro agente

**Objetivo:** executar uma tarefa completa.

| ID       | Tarefa                       | Entregável             |
| -------- | ---------------------------- | ---------------------- |
| AG-001   | PlannerAgent básico          | Recebe comandos        |
| LLM-001  | OllamaProvider               | Comunicação com Ollama |
| REG-001  | ProviderRegistry             | Providers registrados  |
| PLAN-001 | Catálogo dinâmico de agentes | Prompt usa Registry    |
| PLAN-002 | Planner gera plano JSON      | Plano válido           |

**Entrega**

```text
@planner

↓

Ollama

↓

JSON

↓

agent.command
```

---

# Sprint 4 — Runtime

**Objetivo:** tirar infraestrutura dos agentes.

| ID      | Tarefa           | Entregável        |
| ------- | ---------------- | ----------------- |
| RUN-001 | AgentRuntime     | Executa agentes   |
| RUN-002 | agent.started    | Evento automático |
| RUN-003 | agent.completed  | Evento automático |
| RUN-004 | agent.error      | Captura exceções  |
| RUN-005 | Medição de tempo | durationMs        |

**Entrega**

O agente passa de:

```ts
publish(...)
execute()
publish(...)
```

para

```ts
execute();
```

---

# Sprint 5 — Ferramentas

**Objetivo:** permitir ações reais.

| ID         | Tarefa         | Entregável            |
| ---------- | -------------- | --------------------- |
| REG-002    | ToolRegistry   | Registro dinâmico     |
| TOOLRT-001 | ToolRuntime    | Execução centralizada |
| TOOLRT-002 | tool.started   | Evento                |
| TOOLRT-003 | tool.completed | Evento                |
| TOOL-001   | FilesystemTool | Primeira ferramenta   |

**Entrega**

```text
Agent

↓

ToolRuntime

↓

Filesystem
```

---

# Sprint 6 — Code Agent

**Objetivo:** primeiro agente útil.

| ID       | Tarefa              | Entregável       |
| -------- | ------------------- | ---------------- |
| AG-002   | CodeAgent           | Criado           |
| TOOL-002 | ShellTool           | Executa comandos |
| TOOL-003 | GitTool             | Git              |
| AG-003   | SummaryAgent        | Consolidação     |
| PLAN-003 | Planner usa Summary | Fluxo completo   |

**Entrega**

```text
@planner

↓

CodeAgent

↓

Shell

↓

Summary
```

---

# Sprint 7 — Serviços

**Objetivo:** organizar regras de negócio.

| ID      | Tarefa                | Entregável       |
| ------- | --------------------- | ---------------- |
| SRV-002 | EventService          | Consulta eventos |
| SRV-003 | ConversationService   | Conversas        |
| SRV-004 | TaskService           | Tasks            |
| AUD-002 | Timeline por conversa | Histórico        |
| AUD-003 | Timeline por task     | Histórico        |

---

# Sprint 8 — REST

**Objetivo:** consultar dados.

| ID      | Tarefa                  | Entregável      |
| ------- | ----------------------- | --------------- |
| GW-002  | REST API                | Express/Fastify |
| API-001 | GET conversations       | Endpoint        |
| API-002 | GET conversation/events | Endpoint        |
| API-003 | GET task/events         | Endpoint        |
| API-004 | GET tasks               | Endpoint        |

---

# Sprint 9 — Planejamento avançado

**Objetivo:** melhorar o Planner.

| ID       | Tarefa                   | Entregável     |
| -------- | ------------------------ | -------------- |
| PLAN-004 | Dependências entre Steps | DAG            |
| PLAN-005 | Paralelismo              | Execução       |
| PLAN-006 | Validação forte          | JSON Schema    |
| PLAN-007 | Replanejamento           | Retry          |
| PLAN-008 | Agentes opcionais        | Melhor seleção |

---

# Sprint 10 — Auditoria

**Objetivo:** observabilidade.

| ID      | Tarefa           | Entregável          |
| ------- | ---------------- | ------------------- |
| AUD-004 | Replay           | Reexecutar conversa |
| AUD-005 | Export JSONL     | Download            |
| AUD-006 | Métricas         | Estatísticas        |
| AUD-007 | Tracing          | CorrelationId       |
| AUD-008 | Dashboard básico | Logs                |

---

# Sprint 11 — Frontend

**Objetivo:** interface.

| ID     | Tarefa                 | Entregável |
| ------ | ---------------------- | ---------- |
| UI-001 | Chat                   | Conversa   |
| UI-002 | Timeline               | Eventos    |
| UI-003 | Árvore de Tasks        | Visual     |
| UI-004 | Console de ferramentas | Visual     |
| UI-005 | Monitor de agentes     | Visual     |

---

# Sprint 12 — Integrações

| ID       | Tarefa            | Entregável |
| -------- | ----------------- | ---------- |
| TOOL-004 | HTTP Tool         | HTTP       |
| TOOL-005 | RabbitMQ Tool     | Rabbit     |
| TOOL-006 | Azure DevOps Tool | Azure      |
| TOOL-007 | Monday Tool       | Monday     |
| GW-003   | CLI               | CLI        |

---

# O que eu mudaria em relação ao backlog anterior

Tem uma mudança importante que eu faria: **eu não implementaria o `ProviderRegistry` antes do `AgentRuntime`**.

O motivo é simples:

Hoje existe **um único provider** (`Ollama`).

Existe **mais de um agente**.

Então, do ponto de vista arquitetural, o gargalo atual está na execução dos agentes, não na seleção de provedores. O `AgentRuntime` elimina duplicação em todos os agentes que você criar daqui para frente, enquanto o `ProviderRegistry` resolve um problema que ainda não existe.

## Roadmap resumido

```text
Sprint 1  Kernel
Sprint 2  Comunicação
Sprint 3  Planner + Ollama
Sprint 4  Runtime
Sprint 5  Ferramentas
Sprint 6  Code Agent
Sprint 7  Services
Sprint 8  REST
Sprint 9  Planner avançado
Sprint 10 Auditoria
Sprint 11 Frontend
Sprint 12 Integrações
```

Essa ordem tem uma característica que eu gosto bastante: **cada sprint termina com uma funcionalidade demonstrável**. Você consegue subir a aplicação, testar uma capacidade nova e validar a arquitetura antes de seguir para a próxima etapa, reduzindo bastante o risco de grandes refatorações no meio do projeto.

## Prompt

06/07/2026, 20:53:31

A sprint 1 ja pode ser considerada concluida?

## Response

06/07/2026, 20:53:31

Sim, com uma ressalva: **pela implementação atual, eu consideraria a Sprint 1 concluída.** 🎉

Vamos validar item por item.

| ID       | Tarefa                 | Status | Observação                              |
| -------- | ---------------------- | ------ | --------------------------------------- |
| CORE-001 | Bootstrap              | ✅     | `main.ts` apenas inicializa a aplicação |
| CORE-002 | EventEnvelope          | ✅     | Envelope único para todos os eventos    |
| CORE-003 | EventBus               | ✅     | Publish/Subscribe funcionando           |
| CORE-004 | FileEventStore (JSONL) | ✅     | Persistindo eventos                     |
| CORE-005 | AgentRegistry          | ✅     | Registro dinâmico funcionando           |

Critérios de aceite:

- ✅ Aplicação sobe (`pnpm dev`)
- ✅ Existe um único `EventBus`
- ✅ Eventos possuem um envelope padronizado
- ✅ Eventos são persistidos
- ✅ Agentes podem ser registrados dinamicamente

Então eu marcaria a Sprint 1 como **Done**.

---

## Mas eu abriria uma Sprint 1.1 (Hardening)

Não impediria a Sprint 2, mas existem alguns pequenos ajustes técnicos que eu faria antes do projeto crescer.

### HARD-001 — IDs tipados

Hoje usamos vários `string`.

Eu criaria aliases:

```ts
type ConversationId = string;
type TaskId = string;
type CorrelationId = string;
type EventId = string;
type AgentName = string;
```

É simples, mas melhora muito a legibilidade.

---

### HARD-002 — EventType

Hoje:

```ts
type: 'agent.command';
```

Eu faria:

```ts
export enum EventType {
	HumanInstruction = 'human.instruction',
	AgentCommand = 'agent.command',
	AgentStarted = 'agent.started',
	AgentCompleted = 'agent.completed',
	AgentError = 'agent.error',
	AgentMessage = 'agent.message',
	ToolStarted = 'tool.started',
	ToolCompleted = 'tool.completed',
	ToolError = 'tool.error',
}
```

Assim evita typos.

---

### HARD-003 — Source e Target tipados

Hoje:

```ts
source: string;
target: string;
```

Eu faria:

```ts
type AgentName = `${string}-agent`;
```

ou

```ts
type Source = 'user' | 'chat-gateway' | AgentName;
```

---

### HARD-004 — Logger

Hoje usa `console.log`.

Criaria:

```ts
Logger.info(...)
Logger.warn(...)
Logger.error(...)
```

Mesmo que por baixo ainda use `console`.

---

### HARD-005 — Config

Hoje temos:

```ts
3001;
```

Passaria tudo para:

```env
WS_PORT=3001

OLLAMA_MODEL=llama3.1

EVENT_STORE=data/events.jsonl
```

---

# Eu faria uma pequena alteração no roadmap

Depois dessa Sprint 1, eu abriria uma sprint curtinha:

```text
Sprint 1.5

- Hardening
- Tipagem
- Logger
- Config
```

Leva poucas horas e deixa a base muito mais sólida.

---

## Minha sugestão para o próximo passo

Em vez de ir direto para a Sprint 2, eu faria um pequeno ajuste na arquitetura que acho que vai valer muito a pena: criar um **`ApplicationContext`**.

Hoje você já tem um `Bootstrap`, mas daqui a pouco terá:

- `EventBus`
- `EventStore`
- `AgentRegistry`
- `ToolRegistry`
- `ProviderRegistry`
- `CommandService`
- `ConversationService`
- `TaskService`
- `Logger`
- `Config`

Se cada componente começar a receber tudo isso por construtor, o bootstrap vai crescer bastante.

Eu faria um `ApplicationContext` que concentra esses componentes compartilhados. Ele não substitui a injeção de dependência, mas funciona como um contêiner da aplicação. O `Bootstrap` monta esse contexto uma única vez e o restante da aplicação recebe apenas o que precisa.

Na minha experiência, esse pequeno investimento agora evita que o bootstrap vire um arquivo enorme quando você chegar na Sprint 6 ou 7.

## Prompt

06/07/2026, 20:56:15

Aplique o Applicatio Context

## Response

06/07/2026, 20:56:18

Aplique assim, mantendo o Bootstrap como montador da aplicação.

## 1. Crie o `ApplicationContext`

```ts
// src/bootstrap/application-context.ts

import { EventBus } from '../core/events/event-bus';
import { AgentRegistry } from '../core/agents/agent-registry';
import { AgentRouter } from '../core/agents/agent-router';
import { ChatGateway } from '../gateway/chat-gateway';
import { LlmProvider } from '../core/providers/llm-provider';
import { EventStore } from '../store/event-store';

export type ApplicationContext = {
	eventStore: EventStore;
	eventBus: EventBus;

	agentRegistry: AgentRegistry;
	agentRouter: AgentRouter;

	chatGateway: ChatGateway;

	llmProvider: LlmProvider;
};
```

Se você já criou `app-context.ts`, pode renomear para `application-context.ts`.

## 2. Ajuste o Bootstrap

```ts
// src/bootstrap/bootstrap.ts

import { EventBus } from '../core/events/event-bus';
import { AgentRegistry } from '../core/agents/agent-registry';
import { AgentRouter } from '../core/agents/agent-router';

import { OllamaProvider } from '../core/providers/ollama-provider';
import { FileEventStore } from '../store/file-event-store';

import { PlannerAgent } from '../agents/planner/planner-agent';
import { BacklogAgent } from '../agents/backlog/backlog-agent';
import { SummaryAgent } from '../agents/summary/summary-agent';

import { ChatGateway } from '../gateway/chat-gateway';
import { ApplicationContext } from './application-context';

export class Bootstrap {
	static async create(): Promise<ApplicationContext> {
		const eventStore = new FileEventStore('data/events.jsonl');
		const eventBus = new EventBus(eventStore);

		const agentRegistry = new AgentRegistry();

		const llmProvider = new OllamaProvider();

		agentRegistry.register(new BacklogAgent(eventBus));
		agentRegistry.register(new SummaryAgent(eventBus));
		agentRegistry.register(new PlannerAgent(eventBus, agentRegistry, llmProvider));

		const agentRouter = new AgentRouter(eventBus, agentRegistry);
		const chatGateway = new ChatGateway(eventBus, agentRegistry, 3001);

		return {
			eventStore,
			eventBus,
			agentRegistry,
			agentRouter,
			chatGateway,
			llmProvider,
		};
	}

	static async start(): Promise<ApplicationContext> {
		const context = await Bootstrap.create();

		context.agentRouter.start();
		context.chatGateway.start();

		context.eventBus.subscribeAll(event => {
			console.log(`[${event.type}]`, {
				source: event.source,
				target: event.target,
				taskId: event.taskId,
				payload: event.payload,
			});
		});

		return context;
	}
}
```

## 3. Mantenha o `main.ts` limpo

```ts
// src/main.ts

import { Bootstrap } from './bootstrap/bootstrap';

Bootstrap.start().catch(error => {
	console.error('[bootstrap.error]', error);
	process.exit(1);
});
```

## 4. Resultado

Agora o contexto da aplicação está centralizado:

```ts
const context = await Bootstrap.create();
```

E daqui pra frente, quando você adicionar:

```ts
commandService;
eventService;
providerRegistry;
toolRegistry;
logger;
config;
```

basta incluir no `ApplicationContext`, sem bagunçar o `main.ts`.

## Prompt

06/07/2026, 20:59:43

Vamos atuar na sprint 2, me explique gw-001

## Response

06/07/2026, 20:59:43

Na verdade... **GW-001 já está concluída**. 😄

Isso aconteceu porque, durante a conversa, nós implementamos o WebSocket antes de reorganizar o backlog.

Então eu ajustaria a Sprint 2.

---

# Sprint 2 (Atualizada)

| ID       | Tarefa            | Status |
| -------- | ----------------- | ------ |
| GW-001   | WebSocket Gateway | ✅     |
| SRV-001  | CommandService    | ⬜     |
| CORE-006 | AgentRouter       | ✅     |
| CORE-007 | CommandParser     | ✅     |
| AUD-001  | human.instruction | 🚧     |

Ou seja, a próxima task real é **SRV-001**.

---

# Mas vamos falar do GW-001

O objetivo dele não era "abrir um websocket".

Era criar um **Gateway**.

Essa diferença é importante.

## O que é um Gateway?

Na arquitetura do Don Agent, um Gateway é qualquer coisa que permite alguém conversar com o sistema.

Exemplo:

```text
WebSocket

REST

RabbitMQ

CLI

Discord

Telegram

Teams
```

Todos são Gateways.

Todos fazem a mesma coisa.

Recebem uma entrada externa.

---

# O que um Gateway NÃO faz

Um Gateway não deve:

- criar Task
- criar Conversation
- gerar IDs
- parsear comandos
- decidir agente
- consultar banco
- chamar Ollama

Ele apenas adapta o protocolo.

Pensa nele como um tradutor.

---

## Exemplo

Cliente envia:

```json
{
	"conversationId": "123",
	"content": "@planner gere um backlog"
}
```

O Gateway transforma isso em:

```ts
commandService.handle(...)
```

E acabou.

Nada mais.

---

# O Gateway ideal

Hoje provavelmente ele faz:

```text
Recebe JSON

↓

parseCommand

↓

gera taskId

↓

publish

↓

publish
```

O Gateway ideal faz:

```text
Recebe JSON

↓

CommandService
```

Só isso.

---

# Isso traz uma vantagem enorme

Amanhã você cria REST.

```text
POST /commands
```

Faz exatamente:

```ts
commandService.handle(...)
```

CLI?

```bash
don "@planner gere backlog"
```

Também.

RabbitMQ?

```text
fila

↓

CommandService
```

Discord?

```text
Bot

↓

CommandService
```

Telegram?

Também.

Ou seja:

```text
               CommandService
                    ▲
        ┌───────────┼───────────┐
        │           │           │
     WebSocket     REST        CLI
```

---

# O Gateway deveria conhecer apenas

```ts
class ChatGateway {
	constructor(private readonly commandService: CommandService) {}
}
```

Mais nada.

Nem Registry.

Nem EventBus.

Nem Store.

Nem Ollama.

---

# E eu iria além

Eu faria uma interface.

```ts
export interface Gateway {
	start(): Promise<void>;

	stop(): Promise<void>;
}
```

Então:

```text
WebSocketGateway

RestGateway

RabbitGateway

DiscordGateway

TelegramGateway
```

Todos iguais.

---

# O Bootstrap

Fica lindo.

```ts
const gateways = [

    new WebSocketGateway(...),

    new RestGateway(...),

    new CliGateway(...)

];
```

Depois:

```ts
for (const gateway of gateways) {
	await gateway.start();
}
```

Nunca mais muda.

---

# E aí vem uma ideia que acho que combina MUITO com o Don Agent

Eu faria um **GatewayRegistry**.

Assim como existe:

```text
AgentRegistry

ToolRegistry

ProviderRegistry
```

Teria:

```text
GatewayRegistry
```

Porque daqui um ano você pode instalar plugins.

```text
plugins/

    telegram

    discord

    slack

    teams
```

Todos fazem:

```ts
registry.registerGateway(...)
```

E automaticamente aparecem.

---

# Então eu mudaria o backlog

Na verdade eu removeria GW-001.

Porque ele já está entregue.

A Sprint 2 ficaria:

```text
SRV-001 CommandService

AUD-001 human.instruction

SRV-002 EventService

SRV-003 ConversationService

SRV-004 TaskService
```

---

## Minha sugestão

Eu faria uma pequena mudança no backlog antes de começar a Sprint 2:

**fundiria `AUD-001` dentro de `SRV-001`.**

Por quê?

Porque registrar `human.instruction` não é uma responsabilidade de auditoria. É uma responsabilidade do fluxo de entrada de comandos.

Então o `CommandService` deveria:

1. Receber o comando.
2. Gerar `taskId` e `correlationId`.
3. Publicar `human.instruction`.
4. Publicar `agent.command`.
5. Retornar os IDs gerados.

Isso faz com que o Gateway fique extremamente simples e a auditoria aconteça naturalmente como parte do fluxo de processamento, sem uma etapa separada. Na minha opinião, essa divisão deixa as responsabilidades mais claras e evita espalhar a lógica de criação de eventos entre várias classes.

## Prompt

06/07/2026, 21:01:45

Vamos seguir para a srv-001

## Response

06/07/2026, 21:01:46

Perfeito. A **SRV-001 — CommandService** vai tirar a lógica de comando do `ChatGateway`.

## Objetivo

Antes:

```text id="mxi4br"
ChatGateway
  ├── parseia comando
  ├── gera IDs
  ├── publica human.instruction
  └── publica agent.command
```

Depois:

```text id="02mu8o"
ChatGateway
  └── chama CommandService
```

---

## 1. Crie a pasta

```text id="0xr99p"
src/services/
└── command-service.ts
```

---

## 2. Implemente o `CommandService`

```ts id="fgx3br"
// src/services/command-service.ts

import { randomUUID } from 'node:crypto';

import { EventBus } from '../core/events/event-bus';
import { AgentRegistry } from '../core/agents/agent-registry';
import { parseCommand } from '../gateway/command-parser';

export type HandleUserCommandInput = {
	conversationId?: string;
	content: string;
	source: string;
};

export type HandleUserCommandResult = {
	conversationId: string;
	taskId: string;
	correlationId: string;
	target: string;
};

export class CommandService {
	constructor(
		private readonly eventBus: EventBus,
		private readonly agentRegistry: AgentRegistry,
	) {}

	async handleUserCommand(input: HandleUserCommandInput): Promise<HandleUserCommandResult> {
		const parsed = parseCommand(input.content, this.agentRegistry);

		const conversationId = input.conversationId ?? 'conv-local';
		const taskId = randomUUID();
		const correlationId = randomUUID();
		const createdAt = new Date().toISOString();

		await this.eventBus.publish({
			eventId: randomUUID(),
			correlationId,
			conversationId,
			rootTaskId: taskId,
			taskId,
			type: 'human.instruction',
			source: input.source,
			target: parsed.target,
			payload: {
				rawContent: input.content,
				content: parsed.content,
				mention: parsed.mention,
			},
			createdAt,
		});

		await this.eventBus.publish({
			eventId: randomUUID(),
			correlationId,
			conversationId,
			rootTaskId: taskId,
			taskId,
			type: 'agent.command',
			source: 'command-service',
			target: parsed.target,
			payload: {
				content: parsed.content,
			},
			createdAt: new Date().toISOString(),
		});

		return {
			conversationId,
			taskId,
			correlationId,
			target: parsed.target,
		};
	}
}
```

---

## 3. Ajuste o `ChatGateway`

O `ChatGateway` deve receber o `CommandService`, não mais o `AgentRegistry`.

```ts id="bauy4c"
// src/gateway/chat-gateway.ts

import { WebSocketServer, WebSocket } from 'ws';
import { EventBus } from '../core/events/event-bus';
import { EventEnvelope } from '../core/events/event-envelope';
import { CommandService } from '../services/command-service';

type ClientMessage = {
	conversationId?: string;
	content: string;
};

export class ChatGateway {
	private readonly clients = new Set<WebSocket>();

	constructor(
		private readonly eventBus: EventBus,
		private readonly commandService: CommandService,
		private readonly port = 3001,
	) {}

	start() {
		const wss = new WebSocketServer({ port: this.port });

		wss.on('connection', socket => {
			this.clients.add(socket);

			console.log('[ChatGateway] client connected');

			socket.send(
				JSON.stringify({
					type: 'gateway.connected',
					payload: {
						message: 'Conectado ao Don Agent.',
					},
					createdAt: new Date().toISOString(),
				}),
			);

			socket.on('message', raw => {
				void this.handleMessage(raw.toString(), socket);
			});

			socket.on('close', () => {
				this.clients.delete(socket);
			});
		});

		this.eventBus.subscribeAll(event => {
			this.broadcast(event);
		});

		console.log(`ChatGateway listening on ws://localhost:${this.port}`);
	}

	private async handleMessage(raw: string, socket: WebSocket): Promise<void> {
		try {
			const message = JSON.parse(raw) as ClientMessage;

			if (!message.content?.trim()) {
				this.sendGatewayError(socket, 'Mensagem sem conteúdo.');
				return;
			}

			const result = await this.commandService.handleUserCommand({
				conversationId: message.conversationId,
				content: message.content,
				source: 'websocket',
			});

			socket.send(
				JSON.stringify({
					type: 'gateway.accepted',
					payload: result,
					createdAt: new Date().toISOString(),
				}),
			);
		} catch {
			this.sendGatewayError(socket, 'Mensagem inválida. Envie JSON com { content: string }.');
		}
	}

	private broadcast(event: EventEnvelope): void {
		const message = JSON.stringify(event);

		for (const client of this.clients) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(message);
			}
		}
	}

	private sendGatewayError(socket: WebSocket, error: string): void {
		socket.send(
			JSON.stringify({
				type: 'gateway.error',
				payload: { error },
				createdAt: new Date().toISOString(),
			}),
		);
	}
}
```

---

## 4. Ajuste o `ApplicationContext`

```ts id="kkjxzv"
// src/bootstrap/application-context.ts

import { CommandService } from '../services/command-service';

// adicionar:
commandService: CommandService;
```

Exemplo completo do tipo:

```ts id="h79d0s"
export type ApplicationContext = {
	eventStore: EventStore;
	eventBus: EventBus;

	agentRegistry: AgentRegistry;
	agentRouter: AgentRouter;

	commandService: CommandService;
	chatGateway: ChatGateway;

	llmProvider: LlmProvider;
};
```

---

## 5. Ajuste o `Bootstrap`

```ts id="5vfebe"
// src/bootstrap/bootstrap.ts

import { CommandService } from '../services/command-service';

// ...

const commandService = new CommandService(eventBus, agentRegistry);

const chatGateway = new ChatGateway(eventBus, commandService, 3001);
```

E no retorno:

```ts id="qst9qr"
return {
	eventStore,
	eventBus,
	agentRegistry,
	agentRouter,
	commandService,
	chatGateway,
	llmProvider,
};
```

---

## Critério de aceite da SRV-001

Ao enviar:

```json id="o8tabo"
{
	"conversationId": "conv-001",
	"content": "@backlog, Levante o backlog do projeto"
}
```

O `data/events.jsonl` deve conter algo assim:

```json id="7xwucy"
{"type":"human.instruction","source":"websocket","target":"backlog-agent"}
{"type":"agent.command","source":"command-service","target":"backlog-agent"}
{"type":"agent.result","source":"backlog-agent"}
```

E o `ChatGateway` não deve mais chamar `parseCommand` diretamente.

## Prompt

06/07/2026, 21:08:35

E se levar a responsabilidade de armazenar o human input para o gateway, separando asism a auditoria dos logs do gateway e dos logs do agent

## Response

06/07/2026, 21:08:36

Eu evitaria isso.

O **Gateway não deveria auditar regra de negócio**. Ele pode ter logs técnicos próprios, mas o evento `human.instruction` faz parte do **domínio do Don Agent**, não do WebSocket.

Separaria assim:

```text
Gateway logs
- cliente conectou
- cliente desconectou
- JSON inválido
- erro de socket
- IP/origem
- ping/pong

Event audit
- human.instruction
- agent.command
- agent.result
- tool.started
- tool.finished
```

Então o fluxo ideal continua:

```text
ChatGateway
  ↓
CommandService
  ↓
human.instruction
  ↓
agent.command
```

O motivo principal: amanhã você terá REST, CLI ou RabbitMQ.

Se `human.instruction` ficar no Gateway, você terá que repetir essa lógica em todos:

```text
WebSocketGateway → cria human.instruction
RestGateway      → cria human.instruction
CliGateway       → cria human.instruction
RabbitGateway    → cria human.instruction
```

Com `CommandService`, fica único:

```text
WebSocketGateway ┐
RestGateway      ├── CommandService → human.instruction
CliGateway       │
RabbitGateway    ┘
```

O que eu faria é criar **dois tipos de auditoria/log**:

```text
1. Operational logs
   ficam no gateway/logger
   não entram necessariamente no EventStore

2. Domain events
   ficam no EventStore
   representam a história real da execução
```

Exemplo no Gateway:

```ts
console.log('[ChatGateway] message received', {
	conversationId: message.conversationId,
});
```

Exemplo no CommandService:

```ts
await eventBus.publish({
	type: 'human.instruction',
	source: 'websocket',
	payload: {
		rawContent: input.content,
		content: parsed.content,
		mention: parsed.mention,
	},
});
```

Então minha recomendação é:

**não leve `human.instruction` para o Gateway.**

Deixe no `CommandService`, mas use `source: "websocket"` para saber de onde veio.

Assim você separa corretamente:

```text
Gateway = log técnico do canal
CommandService = auditoria do comando humano
Agent = eventos de execução
```

## Prompt

06/07/2026, 23:14:38

Marque srv-001 como concluida

## Response

06/07/2026, 23:14:38

Perfeito. Com a implementação do `CommandService`, eu considero a **SRV-001 concluída**. ✅

## Sprint 2

| ID       | Tarefa            | Status |
| -------- | ----------------- | ------ |
| GW-001   | WebSocket Gateway | ✅     |
| SRV-001  | CommandService    | ✅     |
| CORE-006 | AgentRouter       | ✅     |
| CORE-007 | CommandParser     | ✅     |

### Entrega da Sprint até agora

Você saiu de uma arquitetura onde o `ChatGateway` era responsável por boa parte da lógica para uma arquitetura em camadas:

```text
WebSocketGateway
        │
        ▼
CommandService
        │
        ▼
EventBus
        │
        ▼
AgentRouter
        │
        ▼
PlannerAgent / BacklogAgent / ...
```

Isso trouxe alguns ganhos importantes:

- ✅ O Gateway ficou responsável apenas pelo protocolo WebSocket.
- ✅ Toda a criação de `conversationId`, `taskId` e `correlationId` ficou centralizada.
- ✅ A publicação de eventos de domínio (`human.instruction` e `agent.command`) acontece em um único lugar.
- ✅ REST, CLI, RabbitMQ e outros gateways poderão reutilizar exatamente o mesmo fluxo.

---

## Backlog atualizado

### Sprint 1 — Kernel ✅

- ✅ CORE-001 Bootstrap
- ✅ CORE-002 EventEnvelope
- ✅ CORE-003 EventBus
- ✅ CORE-004 FileEventStore
- ✅ CORE-005 AgentRegistry

### Sprint 2 — Comunicação 🚧

- ✅ GW-001 WebSocket Gateway
- ✅ SRV-001 CommandService
- ✅ CORE-006 AgentRouter
- ✅ CORE-007 CommandParser
- ⬜ AUD-001 Auditoria do fluxo de entrada (na prática já parcialmente atendida pelo `human.instruction`)

---

## Minha sugestão

Na verdade, eu removeria o item **AUD-001** do backlog.

O motivo é que, depois da implementação da SRV-001, a publicação de `human.instruction` deixou de ser uma tarefa de auditoria e passou a ser **parte natural do fluxo de processamento de comandos**.

Então eu simplificaria a Sprint 2 para:

- ✅ GW-001
- ✅ SRV-001
- ✅ CORE-006
- ✅ CORE-007

E a consideraria **100% concluída**. 🎉

Isso deixa a próxima sprint bem definida: começar a estruturar o **Planner** e a integração com o **Ollama**, preparando o terreno para, logo depois, introduzir o `AgentRuntime`. Esse passo vai consolidar a arquitetura antes da chegada dos próximos agentes e ferramentas.

## Prompt

06/07/2026, 23:15:24

Podemos seguir assim, traga a proxima sprint

## Response

06/07/2026, 23:15:25

Perfeito. A partir daqui eu faria uma pequena mudança em relação ao backlog anterior.

Até agora construímos a **infraestrutura**. Agora vamos construir o **primeiro fluxo inteligente**.

Eu renomearia a Sprint 3 para **Planejamento**, porque ela vai consolidar a ideia de que o Planner é apenas um consumidor do kernel.

---

# Sprint 3 — Planejamento

**Objetivo da sprint**

Ao final desta sprint, o usuário deverá conseguir executar:

```text
@planner levante o backlog deste projeto
```

E o fluxo deverá ser:

```text
Human

↓

CommandService

↓

human.instruction

↓

PlannerAgent

↓

Ollama

↓

ExecutionPlan

↓

AgentCommands

↓

BacklogAgent

↓

SummaryAgent
```

Ainda não teremos Runtime nem Tools.

---

# PLAN-001 — ProviderRegistry

### Objetivo

Desacoplar o Planner do Ollama.

Hoje:

```ts
PlannerAgent

↓

new OllamaProvider()
```

Depois:

```text
PlannerAgent

↓

ProviderRegistry

↓

OllamaProvider
```

**Entregável**

```ts
providerRegistry.get('ollama');
```

---

# PLAN-002 — Agent Catalog

Hoje o Planner provavelmente conhece o Registry.

Queremos que ele consiga montar automaticamente:

```json
[
  {
    "name":"backlog-agent",
    "description":"Consulta backlog",
    "capabilities":[...]
  }
]
```

Esse catálogo será enviado ao modelo.

**Entregável**

```ts
registry.getCatalog();
```

---

# PLAN-003 — Planner Prompt Builder

Hoje o prompt provavelmente está dentro do Planner.

Eu moveria isso para:

```text
planner/

    planner-prompt-builder.ts
```

Responsável por:

```text
Registry

↓

Prompt
```

---

# PLAN-004 — ExecutionPlan

Essa eu considero muito importante.

Hoje o Ollama devolve um JSON qualquer.

Eu criaria um tipo.

```ts
export interface ExecutionPlan {
	steps: ExecutionStep[];
}
```

e

```ts
export interface ExecutionStep {
	id: string;

	target: string;

	instruction: string;

	reason: string;
}
```

Nada de JSON solto.

---

# PLAN-005 — Plan Validator

Hoje fazemos:

```ts
JSON.parse();
```

Quero algo assim:

```text
Ollama

↓

JSON

↓

ExecutionPlan

↓

Validation

↓

Planner
```

Se vier:

```json
{
	"target": "super-agent"
}
```

Ele rejeita.

---

# Resultado esperado

Quando enviar:

```text
@planner faça X
```

O log ficará:

```text
human.instruction

↓

agent.command

↓

planner.message

↓

planner.plan.created

↓

agent.command

↓

agent.command
```

---

# O que NÃO faremos ainda

Nada de:

- Runtime
- ToolRegistry
- ToolRuntime
- Retry
- Timeout
- Paralelismo

Esses assuntos pertencem à Sprint seguinte.

---

# Estrutura que nascerá

```text
planner/

    planner-agent.ts

    planner-prompt-builder.ts

    execution-plan.ts

    execution-plan-validator.ts
```

---

# Por que essa ordem?

Porque quando chegarmos ao Runtime, o Planner já estará retornando um objeto fortemente tipado.

O Runtime apenas executará.

---

# Minha única alteração

Depois de refletir sobre tudo o que construímos, eu faria uma pequena mudança no backlog.

Eu criaria um novo conceito chamado **Contracts**.

```text
src/

    contracts/

        execution-plan.ts

        execution-step.ts

        tool-result.ts

        agent-result.ts

        planner-result.ts
```

Por quê?

Porque esses objetos serão compartilhados entre:

- Planner
- Runtime
- Tools
- EventStore
- Frontend

Se eles nascerem dentro do `planner/`, daqui algumas sprints você vai começar a importá-los em vários lugares e o domínio ficará misturado.

Na minha visão, o Don Agent começa a ganhar forma como uma plataforma quando esses contratos deixam de pertencer a um agente específico e passam a representar a linguagem comum entre todos os componentes do sistema. Isso facilita bastante a evolução futura e mantém as dependências mais limpas.

## Prompt

06/07/2026, 23:18:26

Esses contracts seriam as interfaces?

## Response

06/07/2026, 23:18:26

Exatamente. E eu diria que esse é um ponto muito importante para a arquitetura.

A palavra **Contracts** aqui não significa apenas "interfaces do TypeScript". Ela representa o **contrato de comunicação entre os módulos do Don Agent**.

Pensa assim:

```text
ChatGateway
        │
        ▼
CommandService
        │
        ▼
PlannerAgent
        │
        ▼
AgentRuntime
        │
        ▼
BacklogAgent
```

Nenhum desses deveria conhecer a implementação do outro.

Eles deveriam conhecer apenas os contratos.

---

## Um exemplo

Hoje provavelmente temos algo assim:

```ts
class PlannerAgent {
	async handle(event: EventEnvelope) {}
}
```

Mas o que é o resultado do Planner?

Hoje é um JSON qualquer.

Eu criaria um contrato.

```ts
export interface ExecutionPlan {
	steps: ExecutionStep[];
}
```

e

```ts
export interface ExecutionStep {
	id: string;

	target: string;

	instruction: string;

	reason: string;
}
```

Agora o Planner não devolve "qualquer coisa".

Ele devolve um contrato.

---

## Outro exemplo

O CodeAgent.

Hoje ele pode retornar:

```ts
{
    files:[...]
}
```

Amanhã:

```ts
{
	output: '...';
}
```

Depois:

```ts
{
	diff: '...';
}
```

Fica inconsistente.

Então criamos:

```ts
export interface AgentResult {
	success: boolean;

	message?: string;

	data?: unknown;
}
```

Todo agente retorna isso.

---

## Ferramentas

Mesma ideia.

Ao invés de cada Tool inventar um retorno.

```ts
FilesystemTool

↓

{
    path:"..."
}
```

```ts
ShellTool

↓

{
    stdout:"..."
}
```

Criamos:

```ts
export interface ToolResult {
	success: boolean;

	output?: unknown;

	error?: string;
}
```

Agora todas seguem o mesmo padrão.

---

# O EventEnvelope também é um Contract

Na verdade, ele foi o primeiro.

```ts
export interface EventEnvelope<T> {}
```

Ele é o contrato do EventBus.

---

# Eu faria uma pasta assim

```text
src/

    contracts/

        events/

            event-envelope.ts

            event-types.ts

        planner/

            execution-plan.ts

            execution-step.ts

        agents/

            agent-result.ts

        tools/

            tool-result.ts

        chat/

            user-command.ts

            parsed-command.ts
```

Repare que eu **não colocaria tudo em um único diretório**.

Organizaria por domínio.

---

# Uma regra que gosto muito

Interfaces usadas por **apenas uma classe** ficam perto da classe.

Exemplo:

```text
planner/

    planner-agent.ts

    planner-options.ts
```

Só o Planner usa.

---

Interfaces usadas por **mais de um módulo** vão para Contracts.

Exemplo:

```text
ExecutionPlan
```

É usado por:

- Planner
- Runtime
- Frontend
- Auditoria

Então pertence ao domínio.

---

# Eu faria mais uma pequena mudança

Em vez de chamar de **contracts**, eu chamaria de **domain**.

```text
src/

    domain/

        planner/

        agents/

        events/

        tools/
```

Porque essas interfaces não são apenas contratos.

Elas representam o modelo do Don Agent.

Exemplo:

```text
ExecutionPlan
```

Não é um contrato técnico.

É um conceito do domínio.

---

# Minha recomendação

Depois de acompanhar a evolução do projeto, eu faria essa separação:

```text
src/

    core/
        EventBus
        Registry
        Runtime

    domain/
        Events
        Planner
        Agents
        Tools
        Conversations
        Tasks

    services/

    gateways/

    providers/

    agents/

    tools/
```

A diferença é sutil, mas importante:

- **core** → infraestrutura da plataforma.
- **domain** → linguagem e conceitos do Don Agent.
- **services** → orquestração do fluxo.
- **agents** → implementações concretas.

Na minha opinião, isso vai deixar a arquitetura muito mais próxima de uma plataforma do que de uma aplicação. Quando você adicionar um Frontend, uma CLI ou novos agentes, todos falarão a mesma "linguagem" através dos contratos do domínio, sem depender das implementações concretas.

---

Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)
