import { createServer } from "http";
import app from "./app";
import { createWebSocketServer } from "./ws";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);

createWebSocketServer(server);

server.on("error", (err) => {
  logger.error({ err }, "Server error");
  process.exit(1);
});

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
