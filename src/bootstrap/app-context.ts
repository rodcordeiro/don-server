// src/bootstrap/app-context.ts

import type { EventBus } from '../core/events/event-bus';
import type { AgentRegistry } from '../core/agents/agent-registry';
import type { AgentRuntime } from '../core/agents/agent-runtime';
import type { AgentRouter } from '../core/agents/agent-router';
import type { ToolRegistry, ToolRuntime } from '../core/tools';
import type { ChatGateway } from '../gateway/chat-gateway';
import type { HttpGateway } from '../gateway/http-gateway';
import type { RestGateway } from '../gateway/rest-gateway';
import type { LlmProvider } from '../core/providers/llm-provider';
import type { ProviderRegistry } from '../core/providers/provider-registry';
import type { EventStore } from '../store/event-store';
import { type CommandService } from '../services/command-service';
import type { EventService } from '../services/event-service';
export type AppContext = {
	eventStore: EventStore;
	eventBus: EventBus;
	agentRegistry: AgentRegistry;
	toolRegistry: ToolRegistry;
	agentRuntime: AgentRuntime;
	toolRuntime: ToolRuntime;
	agentRouter: AgentRouter;
	httpGateway: HttpGateway;
	chatGateway: ChatGateway;
	restGateway: RestGateway;
	llmProvider: LlmProvider;
	providerRegistry: ProviderRegistry;
	commandService: CommandService;
	eventService: EventService;
};
