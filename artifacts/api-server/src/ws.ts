import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server } from "http";
import { logger } from "./lib/logger";

export function createWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket: WebSocket, req: IncomingMessage) => {
    const clientIp = req.socket.remoteAddress ?? "unknown";
    logger.info({ clientIp }, "WebSocket client connected");

    // Send a welcome message on connect
    socket.send(JSON.stringify({ type: "connected", message: "Welcome to the WebSocket server" }));

    socket.on("message", (data) => {
      const raw = data.toString();
      logger.info({ clientIp, data: raw }, "WebSocket message received");

      // Echo the message back to the sender
      try {
        const parsed = JSON.parse(raw);
        socket.send(JSON.stringify({ type: "echo", payload: parsed }));
      } catch {
        socket.send(JSON.stringify({ type: "echo", payload: raw }));
      }
    });

    socket.on("close", (code, reason) => {
      logger.info({ clientIp, code, reason: reason.toString() }, "WebSocket client disconnected");
    });

    socket.on("error", (err) => {
      logger.error({ clientIp, err }, "WebSocket error");
    });
  });

  wss.on("error", (err) => {
    logger.error({ err }, "WebSocketServer error");
  });

  logger.info("WebSocket server attached at /ws");

  return wss;
}

/** Broadcast a message to all connected clients. */
export function broadcast(wss: WebSocketServer, data: unknown): void {
  const message = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
