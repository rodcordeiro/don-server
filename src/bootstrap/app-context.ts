// src/bootstrap/app-context.ts

import { EventBus } from "../core/events/event-bus";
import { AgentRegistry } from "../core/agents/agent-registry";
import { AgentRouter } from "../core/agents/agent-router";
import { ChatGateway } from "../gateway/chat-gateway";
import { LlmProvider } from "../core/providers/llm-provider";
import { EventStore } from "../store/event-store";

export type AppContext = {
  eventStore: EventStore;
  eventBus: EventBus;
  agentRegistry: AgentRegistry;
  agentRouter: AgentRouter;
  chatGateway: ChatGateway;
  llmProvider: LlmProvider;
};