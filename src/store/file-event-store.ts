// src/store/file-event-store.ts

import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { EventEnvelope } from '../core/events/event-envelope';
import type { EventStore } from './event-store';

export class FileEventStore implements EventStore {
	constructor(private readonly path = 'data/events.jsonl') {}

	async append(event: EventEnvelope): Promise<void> {
		await mkdir(dirname(this.path), { recursive: true });

		await appendFile(this.path, `${JSON.stringify(event)}\n`, 'utf-8');
	}

	async listByConversation(conversationId: string): Promise<EventEnvelope[]> {
		const events = await this.readAll();

		return events.filter(event => {
			return event.conversationId === conversationId;
		});
	}

	async listByProject(projectId: string): Promise<EventEnvelope[]> {
		const events = await this.readAll();

		return events.filter(event => {
			return event.projectId === projectId;
		});
	}

	async listByTask(taskId: string): Promise<EventEnvelope[]> {
		const events = await this.readAll();

		return events.filter(event => {
			return event.taskId === taskId || event.rootTaskId === taskId;
		});
	}

	async listByCorrelation(correlationId: string): Promise<EventEnvelope[]> {
		const events = await this.readAll();

		return events.filter(event => {
			return event.correlationId === correlationId;
		});
	}

	private async readAll(): Promise<EventEnvelope[]> {
		try {
			const content = await readFile(this.path, 'utf-8');

			return content
				.split('\n')
				.filter(Boolean)
				.map(line => JSON.parse(line) as EventEnvelope);
		} catch (error) {
			if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
				return [];
			}

			throw error;
		}
	}
}
