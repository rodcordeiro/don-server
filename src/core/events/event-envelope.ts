// src/core/events/event-envelope.ts

export type EventEnvelope<TPayload = unknown> = {
  eventId: string;
  correlationId: string;

  conversationId: string;
  rootTaskId: string;
  taskId: string;
  parentTaskId?: string;

  type: string;
  source: string;
  target?: string;

  payload: TPayload;

  createdAt: string;
};
