// src/bootstrap/bootstrap.ts

import { EventBus } from '../core/events/event-bus';
import { AgentRegistry } from '../core/agents/agent-registry';
import { AgentRuntime } from '../core/agents/agent-runtime';
import { AgentRouter } from '../core/agents/agent-router';
import { ToolRegistry, ToolRuntime } from '../core/tools';
import { CommandService } from '../services/command-service';
import { EventService } from '../services/event-service';
import { AuthService } from '../services/auth-service';
import { ProjectService } from '../services/project-service';
import { OllamaProvider } from '../core/providers/ollama-provider';
import { OpenAIProvider } from '../core/providers/openai-provider';
import { CliLlmProvider } from '../core/providers/cli-llm-provider';
import { ProviderRegistry } from '../core/providers/provider-registry';
import { FileEventStore } from '../store/file-event-store';
import { PlannerAgent } from '../agents/planner/planner-agent';
import { BacklogAgent } from '../agents/backlog/backlog-agent';
import { BacklogSource } from '../agents/backlog/backlog-source';
import { SummaryAgent } from '../agents/summary/summary-agent';
import { FilesystemTool, ShellTool } from '../tools';

import { ChatGateway } from '../gateway/chat-gateway';
import { HttpGateway } from '../gateway/http-gateway';
import { RestGateway } from '../gateway/rest-gateway';
import type { AppContext } from './app-context';
import { env } from 'node:process';

export class Bootstrap {
	static create(): AppContext {
		// const eventStore = await SqliteEventStore.create("don-agent-events.db");
		const eventStore = new FileEventStore('data/events.jsonl');

		const eventBus = new EventBus(eventStore);

		const agentRegistry = new AgentRegistry();
		const toolRegistry = new ToolRegistry();
		const projectService = new ProjectService();

		const llmProvider = new OllamaProvider();
		const providerRegistry = new ProviderRegistry(
			definedOptions({
				defaultProviderName: readEnv('LLM_PROVIDER'),
				defaultModel: readEnv('LLM_MODEL') ?? 'llama3.1',
				fallbackProviderName: readEnv('LLM_FALLBACK_PROVIDER'),
				fallbackModel: readEnv('LLM_FALLBACK_MODEL'),
			}),
		);

		providerRegistry.register(llmProvider);
		providerRegistry.register(new OpenAIProvider());
		registerCliProviders(providerRegistry);
		toolRegistry.register(new FilesystemTool());
		toolRegistry.register(new ShellTool());

		agentRegistry.register(
			new BacklogAgent(eventBus, new BacklogSource(undefined, projectService), providerRegistry),
		);
		agentRegistry.register(new SummaryAgent(eventBus));
		agentRegistry.register(new PlannerAgent(eventBus, agentRegistry, providerRegistry));

		const agentRuntime = new AgentRuntime(eventBus, +(env.AGENT_TIMEOUT_MS ?? 30_000));
		const toolRuntime = new ToolRuntime(eventBus);
		const agentRouter = new AgentRouter(eventBus, agentRegistry, agentRuntime);
		const commandService = new CommandService(eventBus, agentRegistry);
		const eventService = new EventService(eventStore);
		const authService = new AuthService(eventBus, env.DON_SERVER_TOKEN, env.DON_SERVER_USER_ID);

		const httpGateway = new HttpGateway(+(env.PORT ?? 3001));
		const chatGateway = new ChatGateway(
			eventBus,
			commandService,
			httpGateway.getServer(),
			authService,
		);
		const restGateway = new RestGateway(commandService, eventService, authService, projectService);

		httpGateway.register((request, response) => {
			return restGateway.handleRequest(request, response);
		});

		return {
			eventStore,
			eventBus,
			agentRegistry,
			toolRegistry,
			agentRuntime,
			toolRuntime,
			agentRouter,
			httpGateway,
			chatGateway,
			restGateway,
			llmProvider,
			providerRegistry,
			projectService,
			commandService,
			eventService,
			authService,
		};
	}

	static start(): AppContext {
		const context = Bootstrap.create();

		context.agentRouter.start();

		context.chatGateway.start();

		context.httpGateway.start();

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

function registerCliProviders(providerRegistry: ProviderRegistry): void {
	const commonOptions = {
		cwd: readEnv('LLM_CLI_CWD'),
		timeoutMs: readNumberEnv('LLM_CLI_TIMEOUT_MS'),
		maxOutputBytes: readNumberEnv('LLM_CLI_MAX_OUTPUT_BYTES'),
	};

	providerRegistry.register(
		new CliLlmProvider({
			name: 'cursor',
			command: readEnv('CURSOR_CLI_COMMAND') ?? 'cursor',
			args: parseCliArgs(readEnv('CURSOR_CLI_ARGS') ?? readEnv('LLM_CLI_ARGS')),
			...definedOptions(commonOptions),
		}),
	);
	providerRegistry.register(
		new CliLlmProvider({
			name: 'codex',
			command: readEnv('CODEX_CLI_COMMAND') ?? 'codex',
			args: parseCliArgs(readEnv('CODEX_CLI_ARGS') ?? readEnv('LLM_CLI_ARGS')),
			...definedOptions(commonOptions),
		}),
	);

	const customCommand = readEnv('LLM_CLI_COMMAND');

	if (customCommand) {
		providerRegistry.register(
			new CliLlmProvider({
				name: readEnv('LLM_CLI_PROVIDER_NAME') ?? 'cli',
				command: customCommand,
				args: parseCliArgs(readEnv('LLM_CLI_ARGS')),
				...definedOptions(commonOptions),
			}),
		);
	}
}

function readEnv(name: string): string | undefined {
	const value = env[name]?.trim();
	return value ? value : undefined;
}

function readNumberEnv(name: string): number | undefined {
	const value = readEnv(name);

	if (!value) {
		return undefined;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseCliArgs(value: string | undefined): string[] {
	if (!value) {
		return [];
	}

	const parsed = parseJsonArgs(value);

	if (parsed) {
		return parsed;
	}

	return value.split(' ').filter(Boolean);
}

function parseJsonArgs(value: string): string[] | undefined {
	try {
		const parsed = JSON.parse(value) as unknown;

		if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
			return parsed;
		}
	} catch {
		return undefined;
	}

	return undefined;
}

function definedOptions<TOptions extends object>(options: TOptions): Partial<TOptions> {
	return Object.fromEntries(
		Object.entries(options).filter(([, value]) => value !== undefined),
	) as Partial<TOptions>;
}
