// src/bootstrap/bootstrap.ts

import { EventBus } from '../core/events/event-bus';
import { AgentRegistry } from '../core/agents/agent-registry';
import { AgentRuntime } from '../core/agents/agent-runtime';
import { AgentRouter } from '../core/agents/agent-router';
import { CommandService } from '../services/command-service';
import { EventService } from '../services/event-service';
import { OllamaProvider } from '../core/providers/ollama-provider';
import { ProviderRegistry } from '../core/providers/provider-registry';
import { FileEventStore } from '../store/file-event-store';
import { PlannerAgent } from '../agents/planner/planner-agent';
import { BacklogAgent } from '../agents/backlog/backlog-agent';
import { SummaryAgent } from '../agents/summary/summary-agent';

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

		const llmProvider = new OllamaProvider();
		const providerRegistry = new ProviderRegistry();

		providerRegistry.register(llmProvider);

		agentRegistry.register(new BacklogAgent(eventBus));
		agentRegistry.register(new SummaryAgent(eventBus));
		agentRegistry.register(new PlannerAgent(eventBus, agentRegistry, providerRegistry));

		const agentRuntime = new AgentRuntime(eventBus, +(env.AGENT_TIMEOUT_MS ?? 30_000));
		const agentRouter = new AgentRouter(eventBus, agentRegistry, agentRuntime);
		const commandService = new CommandService(eventBus, agentRegistry);
		const eventService = new EventService(eventStore);

		const httpGateway = new HttpGateway(+(env.PORT ?? 3001));
		const chatGateway = new ChatGateway(eventBus, commandService, httpGateway.getServer());
		const restGateway = new RestGateway(commandService, eventService);

		httpGateway.register((request, response) => {
			return restGateway.handleRequest(request, response);
		});

		return {
			eventStore,
			eventBus,
			agentRegistry,
			agentRuntime,
			agentRouter,
			httpGateway,
			chatGateway,
			restGateway,
			llmProvider,
			providerRegistry,
			commandService,
			eventService,
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
