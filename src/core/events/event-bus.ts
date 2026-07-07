// src/core/events/event-bus.ts

import { EventEmitter } from 'node:events';
import type { EventEnvelope } from './event-envelope';
import type { EventStore } from '../../store/event-store';

export class EventBus {
	private readonly emitter = new EventEmitter();

	constructor(private readonly eventStore?: EventStore) {}

	async publish<T>(event: EventEnvelope<T>) {
		await this.eventStore?.append(event);

		this.emitter.emit('*', event);
		this.emitter.emit(event.type, event);
	}

	subscribe<T>(type: string, handler: (event: EventEnvelope<T>) => Promise<void> | void) {
		this.emitter.on(type, (event: unknown) => {
			void Promise.resolve(handler(event as EventEnvelope<T>));
		});
	}

	subscribeAll(handler: (event: EventEnvelope) => Promise<void> | void) {
		this.emitter.on('*', (event: unknown) => {
			void Promise.resolve(handler(event as EventEnvelope));
		});
	}
}
