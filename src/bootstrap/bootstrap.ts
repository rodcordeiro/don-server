// src/bootstrap/bootstrap.ts

import { EventBus } from "../core/events/event-bus";
import { AgentRegistry } from "../core/agents/agent-registry";
import { AgentRouter } from "../core/agents/agent-router";
import { CommandService } from "../services/command-service";
import { OllamaProvider } from "../core/providers/ollama-provider";
import { ProviderRegistry } from "../core/providers/provider-registry";
import { FileEventStore } from "../store/file-event-store";
import { PlannerAgent } from "../agents/planner/planner-agent";
import { BacklogAgent } from "../agents/backlog/backlog-agent";
import { SummaryAgent } from "../agents/summary/summary-agent";

import { ChatGateway } from "../gateway/chat-gateway";
import type { AppContext } from "./app-context";
import { env } from "node:process";

export class Bootstrap {
  static create(): AppContext {
    // const eventStore = await SqliteEventStore.create("don-agent-events.db");
    const eventStore = new FileEventStore("data/events.jsonl");

    const eventBus = new EventBus(eventStore);

    const agentRegistry = new AgentRegistry();

    const llmProvider = new OllamaProvider();
    const providerRegistry = new ProviderRegistry();

    providerRegistry.register(llmProvider);

    agentRegistry.register(new BacklogAgent(eventBus));
    agentRegistry.register(new SummaryAgent(eventBus));
    agentRegistry.register(new PlannerAgent(eventBus, agentRegistry, providerRegistry));

    const agentRouter = new AgentRouter(eventBus, agentRegistry);
    const commandService = new CommandService(eventBus, agentRegistry);

    const chatGateway = new ChatGateway(eventBus, commandService, +(env.PORT ?? 3001));

    return {
      eventStore,
      eventBus,
      agentRegistry,
      agentRouter,
      chatGateway,
      llmProvider,
      providerRegistry,
      commandService,
    };
  }

  static start(): AppContext {
    const context = Bootstrap.create();

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
