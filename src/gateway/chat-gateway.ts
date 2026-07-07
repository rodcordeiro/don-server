// src/gateway/chat-gateway.ts

import { WebSocketServer, WebSocket } from "ws";
import { EventBus } from "../core/events/event-bus";
import type { EventEnvelope } from "../core/events/event-envelope";
import { CommandService } from "../services/command-service";

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

    wss.on("connection", (socket) => {
      this.clients.add(socket);

      console.log("[ChatGateway] client connected");

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
        void this.handleMessage(raw.toString(), socket);
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

  private async handleMessage(raw: string, socket: WebSocket): Promise<void> {
    try {
      const message = JSON.parse(raw) as ClientMessage;

      if (!message.content?.trim()) {
        this.sendGatewayError(socket, "Mensagem sem conteúdo.");
        return;
      }

      const result = await this.commandService.handleUserCommand({
        conversationId: message.conversationId as string,
        content: message.content,
        source: "websocket",
      });

      socket.send(
        JSON.stringify({
          type: "gateway.accepted",
          payload: result,
          createdAt: new Date().toISOString(),
        }),
      );
    } catch {
      this.sendGatewayError(
        socket,
        "Mensagem inválida. Envie JSON com { content: string }.",
      );
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
        type: "gateway.error",
        payload: { error },
        createdAt: new Date().toISOString(),
      }),
    );
  }
}
