// src/main.ts

import { env } from "node:process";
import { EventBus } from "./core/events/event-bus";
import { AgentRegistry } from "./core/agents/agent-registry";
import { AgentRouter } from "./core/agents/agent-router";
import { OllamaProvider } from "./core/providers/ollama-provider";

import { PlannerAgent } from "./agents/planner/planner-agent";
import { BacklogAgent } from "./agents/backlog/backlog-agent";
import { SummaryAgent } from "./agents/summary/summary-agent";

import { ChatGateway } from "./gateway/chat-gateway";
import { SqliteEventStore } from "./store/sqlite-event-store";

async function bootstrap() {
  const eventStore = await SqliteEventStore.create("don-agent-events.db");
  const eventBus = new EventBus(eventStore);
  const registry = new AgentRegistry();

  const ollama = new OllamaProvider();

  registry.register(new BacklogAgent(eventBus));
  registry.register(new SummaryAgent(eventBus));
  registry.register(new PlannerAgent(eventBus, registry, ollama));

  const router = new AgentRouter(eventBus, registry);
  router.start();

  const chatGateway = new ChatGateway(
    eventBus,
    registry,
    +(env.port ?? 3001) as number,
  );
  chatGateway.start();

  eventBus.subscribeAll((event) => {
    console.debug(`[${event.type}]`, {
      source: event.source,
      target: event.target,
      taskId: event.taskId,
      payload: event.payload,
    });
  });
}

bootstrap();
