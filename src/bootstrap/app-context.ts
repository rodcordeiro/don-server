// src/bootstrap/app-context.ts

import type { EventBus } from "../core/events/event-bus";
import type { AgentRegistry } from "../core/agents/agent-registry";
import type { AgentRouter } from "../core/agents/agent-router";
import type { ChatGateway } from "../gateway/chat-gateway";
import type { LlmProvider } from "../core/providers/llm-provider";
import type { EventStore } from "../store/event-store";
import { type CommandService } from "../services/command-service";
export type AppContext = {
  eventStore: EventStore;
  eventBus: EventBus;
  agentRegistry: AgentRegistry;
  agentRouter: AgentRouter;
  chatGateway: ChatGateway;
  llmProvider: LlmProvider;
  commandService: CommandService;
};
