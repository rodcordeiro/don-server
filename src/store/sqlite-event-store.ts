// src/store/sqlite-event-store.ts

import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import type { EventEnvelope } from '../core/events/event-envelope';
import type { EventStore } from './event-store';

type EventRow = {
	event_id: string;
	correlation_id: string;
	conversation_id: string;
	project_id: string | null;
	root_task_id: string;
	task_id: string;
	parent_task_id: string | null;
	type: string;
	source: string;
	target: string | null;
	payload: string;
	created_at: string;
};

export class SqliteEventStore implements EventStore {
	private db!: Database<sqlite3.Database, sqlite3.Statement>;

	static async create(path = 'don-agent-events.db') {
		const store = new SqliteEventStore();
		store.db = await open({
			filename: path,
			driver: sqlite3.Database,
		});

		await store.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY,
        correlation_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        project_id TEXT,
        root_task_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        parent_task_id TEXT,
        type TEXT NOT NULL,
        source TEXT NOT NULL,
        target TEXT,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_conversation
        ON events(conversation_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_events_task
        ON events(task_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_events_root_task
        ON events(root_task_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_events_correlation
        ON events(correlation_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_events_type
        ON events(type, created_at);
    `);

		await store.ensureProjectColumn();
		await store.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_events_project
        ON events(project_id, created_at);
    `);

		return store;
	}

	async append(event: EventEnvelope): Promise<void> {
		await this.db.run(
			`
      INSERT INTO events (
        event_id,
        correlation_id,
        conversation_id,
        project_id,
        root_task_id,
        task_id,
        parent_task_id,
        type,
        source,
        target,
        payload,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
			[
				event.eventId,
				event.correlationId,
				event.conversationId,
				event.projectId ?? null,
				event.rootTaskId,
				event.taskId,
				event.parentTaskId ?? null,
				event.type,
				event.source,
				event.target ?? null,
				JSON.stringify(event.payload),
				event.createdAt,
			],
		);
	}

	async listByConversation(conversationId: string): Promise<EventEnvelope[]> {
		const rows = await this.db.all<EventRow[]>(
			`
      SELECT * FROM events
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      `,
			conversationId,
		);

		return rows.map(row => this.toEvent(row));
	}

	async listByProject(projectId: string): Promise<EventEnvelope[]> {
		const rows = await this.db.all<EventRow[]>(
			`
      SELECT * FROM events
      WHERE project_id = ?
      ORDER BY created_at ASC
      `,
			projectId,
		);

		return rows.map(row => this.toEvent(row));
	}

	async listByTask(taskId: string): Promise<EventEnvelope[]> {
		const rows = await this.db.all<EventRow[]>(
			`
      SELECT * FROM events
      WHERE task_id = ? OR root_task_id = ?
      ORDER BY created_at ASC
      `,
			taskId,
			taskId,
		);

		return rows.map(row => this.toEvent(row));
	}

	async listByCorrelation(correlationId: string): Promise<EventEnvelope[]> {
		const rows = await this.db.all<EventRow[]>(
			`
      SELECT * FROM events
      WHERE correlation_id = ?
      ORDER BY created_at ASC
      `,
			correlationId,
		);

		return rows.map(row => this.toEvent(row));
	}

	private toEvent(row: EventRow): EventEnvelope<unknown> {
		return {
			eventId: row.event_id,
			correlationId: row.correlation_id,
			conversationId: row.conversation_id,
			...(row.project_id !== null ? { projectId: row.project_id } : {}),
			rootTaskId: row.root_task_id,
			taskId: row.task_id,
			parentTaskId: row.parent_task_id ?? undefined,
			type: row.type,
			source: row.source,
			target: row.target ?? undefined,
			payload: JSON.parse(row.payload) as unknown,
			createdAt: row.created_at,
		} as EventEnvelope;
	}

	private async ensureProjectColumn(): Promise<void> {
		try {
			await this.db.exec('ALTER TABLE events ADD COLUMN project_id TEXT;');
		} catch (error) {
			if (error instanceof Error && error.message.includes('duplicate column name')) {
				return;
			}

			throw error;
		}
	}
}
