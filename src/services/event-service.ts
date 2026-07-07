import type { EventEnvelope } from '../core/events/event-envelope';
import type { EventStore } from '../store/event-store';

export class EventService {
	constructor(private readonly eventStore: EventStore) {}

	async listByConversation(conversationId: string): Promise<EventEnvelope[]> {
		return this.toTimeline(await this.eventStore.listByConversation(conversationId));
	}

	async listByTask(taskId: string): Promise<EventEnvelope[]> {
		return this.toTimeline(await this.eventStore.listByTask(taskId));
	}

	async listByCorrelation(correlationId: string): Promise<EventEnvelope[]> {
		return this.toTimeline(await this.eventStore.listByCorrelation(correlationId));
	}

	private toTimeline(events: EventEnvelope[]): EventEnvelope[] {
		return [...events].sort((left, right) => {
			return Date.parse(left.createdAt) - Date.parse(right.createdAt);
		});
	}
}
