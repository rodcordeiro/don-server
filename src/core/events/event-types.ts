// src/core/events/event-types.ts

export type HumanInstructionPayload = {
  content: string;
};

export type AgentCommandPayload = {
  content: string;
  reason?: string;
};

export type AgentMessagePayload = {
  content: string;
};

export type AgentResultPayload = {
  status: "completed" | "failed";
  result: string;
};

export type ToolStartedPayload = {
  tool: string;
  input?: unknown;
};

export type ToolFinishedPayload = {
  tool: string;
  output?: unknown;
};
