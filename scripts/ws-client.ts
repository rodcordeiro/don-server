// scripts/ws-client.ts

import WebSocket from "ws";

const socket = new WebSocket("ws://localhost:3001");

socket.on("open", () => {
  socket.send(
    JSON.stringify({
      conversationId: "conv-001",
      content: "@planner levante o backlog pendente deste projeto",
    }),
  );
});

socket.on("message", data => {
  console.log("EVENT:", data.toString());
});
