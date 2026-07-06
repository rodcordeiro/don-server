// src/gateway/chat-gateway.ts

import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";

import { EventBus } from "../core/events/event-bus";
import { parseCommand } from "./command-parser";
import type { EventEnvelope } from "../core/events/event-envelope";
import { AgentRegistry } from "../core/agents/agent-registry";

type ClientMessage = {
  conversationId?: string;
  content: string;
};

export class ChatGateway {
  private readonly clients = new Set<WebSocket>();

  constructor(
    private readonly eventBus: EventBus,
    private readonly registry: AgentRegistry,
    private readonly port = 3001,
  ) {}

  start() {
    const wss = new WebSocketServer({ port: this.port });

    wss.on("connection", (socket) => {
      this.clients.add(socket);
      console.debug(`[ChatGateway] client connected`);
      socket.send(
        JSON.stringify({
          type: "gateway.connected",
          payload: {
            message: "Conectado ao Don Agent.",
          },
          createdAt: new Date().toISOString(),
        }),
      );

      socket.on("message", (raw) => {
        this.handleMessage(raw.toString(), socket);
      });

      socket.on("close", () => {
        this.clients.delete(socket);
      });
    });

    this.eventBus.subscribeAll((event) => {
      this.broadcast(event);
    });

    console.log(`ChatGateway listening on ws://localhost:${this.port}`);
  }

  private handleMessage(raw: string, socket: WebSocket) {
    try {
      const message = JSON.parse(raw) as ClientMessage;
      console.debug("[ChatGateway] message", message);
      if (!message.content?.trim()) {
        socket.send(
          JSON.stringify({
            type: "gateway.error",
            payload: {
              error: "Mensagem sem conteúdo.",
            },
            createdAt: new Date().toISOString(),
          }),
        );

        return;
      }

      const parsed = parseCommand(message.content, this.registry);

      const taskId = randomUUID();

      const event: EventEnvelope = {
        eventId: randomUUID(),
        correlationId: randomUUID(),

        conversationId: message.conversationId ?? "conv-local",
        rootTaskId: taskId,
        taskId,

        type: "agent.command",
        source: "chat-gateway",
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
          type: "gateway.error",
          payload: {
            error: "Mensagem inválida. Envie JSON com { content: string }.",
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
