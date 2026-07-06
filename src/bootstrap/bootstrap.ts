// src/bootstrap/bootstrap.ts

import { EventBus } from "../core/events/event-bus";
import { AgentRegistry } from "../core/agents/agent-registry";
import { AgentRouter } from "../core/agents/agent-router";

import { OllamaProvider } from "../core/providers/ollama-provider";
import { FileEventStore } from "../store/file-event-store";
import { PlannerAgent } from "../agents/planner/planner-agent";
import { BacklogAgent } from "../agents/backlog/backlog-agent";
import { SummaryAgent } from "../agents/summary/summary-agent";

import { ChatGateway } from "../gateway/chat-gateway";
import { AppContext } from "./app-context";
import { env } from "node:process";

export class Bootstrap {
  static async create(): Promise<AppContext> {
    // const eventStore = await SqliteEventStore.create("don-agent-events.db");
    const eventStore = new FileEventStore("data/events.jsonl");

    const eventBus = new EventBus(eventStore);

    const agentRegistry = new AgentRegistry();

    const llmProvider = new OllamaProvider();

    agentRegistry.register(new BacklogAgent(eventBus));
    agentRegistry.register(new SummaryAgent(eventBus));
    agentRegistry.register(
      new PlannerAgent(eventBus, agentRegistry, llmProvider),
    );

    const agentRouter = new AgentRouter(eventBus, agentRegistry);

    const chatGateway = new ChatGateway(
      eventBus,
      agentRegistry,
      +(env.PORT ?? 3001),
    );

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

    context.eventBus.subscribeAll((event) => {
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
