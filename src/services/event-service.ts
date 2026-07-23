import type { EventEnvelope } from '../core/events/event-envelope';
import type { EventStore } from '../store/event-store';

export type EventQueryFilters = {
	conversationId?: string;
	projectId?: string;
	taskId?: string;
	correlationId?: string;
};

export type EventMetrics = {
	total: number;
	byType: Record<string, number>;
	bySource: Record<string, number>;
	byTarget: Record<string, number>;
	failures: number;
	averageDurationMs?: number;
};

export class EventService {
	constructor(private readonly eventStore: EventStore) {}

	async exportEvents(filters: EventQueryFilters = {}): Promise<EventEnvelope[]> {
		return this.toTimeline(await this.listByFilters(filters));
	}

	async getMetrics(filters: EventQueryFilters = {}): Promise<EventMetrics> {
		const events = await this.exportEvents(filters);
		const durations = events
			.map(event => readDurationMs(event.payload))
			.filter((duration): duration is number => duration !== undefined);
		const averageDurationMs =
			durations.length > 0
				? Math.round(durations.reduce((total, duration) => total + duration, 0) / durations.length)
				: undefined;

		return {
			total: events.length,
			byType: countBy(events, event => event.type),
			bySource: countBy(events, event => event.source),
			byTarget: countBy(events, event => event.target ?? 'none'),
			failures: events.filter(isFailureEvent).length,
			...(averageDurationMs !== undefined ? { averageDurationMs } : {}),
		};
	}

	async replayTask(taskId: string): Promise<{ taskId: string; events: EventEnvelope[] }> {
		return {
			taskId,
			events: await this.listByTask(taskId),
		};
	}

	async replayConversation(
		conversationId: string,
	): Promise<{ conversationId: string; events: EventEnvelope[] }> {
		return {
			conversationId,
			events: await this.listByConversation(conversationId),
		};
	}

	async listFailures(filters: EventQueryFilters = {}): Promise<EventEnvelope[]> {
		return (await this.exportEvents(filters)).filter(isFailureEvent);
	}

	async listByConversation(conversationId: string): Promise<EventEnvelope[]> {
		return this.toTimeline(await this.eventStore.listByConversation(conversationId));
	}

	async listByProject(projectId: string): Promise<EventEnvelope[]> {
		return this.toTimeline(await this.eventStore.listByProject(projectId));
	}

	async listByTask(taskId: string): Promise<EventEnvelope[]> {
		return this.toTimeline(await this.eventStore.listByTask(taskId));
	}

	async listByCorrelation(correlationId: string): Promise<EventEnvelope[]> {
		return this.toTimeline(await this.eventStore.listByCorrelation(correlationId));
	}

	private async listByFilters(filters: EventQueryFilters): Promise<EventEnvelope[]> {
		const baseEvents = await this.getBaseEvents(filters);

		return baseEvents.filter(event => {
			return (
				(filters.conversationId === undefined || event.conversationId === filters.conversationId) &&
				(filters.projectId === undefined || event.projectId === filters.projectId) &&
				(filters.taskId === undefined ||
					event.taskId === filters.taskId ||
					event.rootTaskId === filters.taskId) &&
				(filters.correlationId === undefined || event.correlationId === filters.correlationId)
			);
		});
	}

	private async getBaseEvents(filters: EventQueryFilters): Promise<EventEnvelope[]> {
		if (filters.conversationId) {
			return await this.eventStore.listByConversation(filters.conversationId);
		}

		if (filters.projectId) {
			return await this.eventStore.listByProject(filters.projectId);
		}

		if (filters.taskId) {
			return await this.eventStore.listByTask(filters.taskId);
		}

		if (filters.correlationId) {
			return await this.eventStore.listByCorrelation(filters.correlationId);
		}

		return await this.eventStore.listAll();
	}

	private toTimeline(events: EventEnvelope[]): EventEnvelope[] {
		return [...events].sort((left, right) => {
			return Date.parse(left.createdAt) - Date.parse(right.createdAt);
		});
	}
}

function countBy(
	events: EventEnvelope[],
	readKey: (event: EventEnvelope) => string,
): Record<string, number> {
	return events.reduce<Record<string, number>>((counts, event) => {
		const key = readKey(event);
		counts[key] = (counts[key] ?? 0) + 1;
		return counts;
	}, {});
}

function readDurationMs(payload: unknown): number | undefined {
	if (!payload || typeof payload !== 'object') {
		return undefined;
	}

	const durationMs = (payload as Record<string, unknown>)['durationMs'];
	return typeof durationMs === 'number' ? durationMs : undefined;
}

function isFailureEvent(event: EventEnvelope): boolean {
	return (
		event.type === 'agent.error' || event.type === 'tool.error' || event.type === 'security.failure'
	);
}
