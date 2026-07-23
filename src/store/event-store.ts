// src/store/event-store.ts

import type { EventEnvelope } from '../core/events/event-envelope';

export interface EventStore {
	append(event: EventEnvelope): Promise<void>;

	listAll(): Promise<EventEnvelope[]>;

	listByConversation(conversationId: string): Promise<EventEnvelope[]>;

	listByProject(projectId: string): Promise<EventEnvelope[]>;

	listByTask(taskId: string): Promise<EventEnvelope[]>;

	listByCorrelation(correlationId: string): Promise<EventEnvelope[]>;
}
