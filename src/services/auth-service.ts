import { timingSafeEqual } from 'node:crypto';

import type { EventBus } from '../core/events/event-bus';
import type { AuthenticatedActor } from '../domain';

export type AuthChannel = AuthenticatedActor['channel'];

export type AuthenticationFailureReason = 'missing-token' | 'invalid-token' | 'auth-not-configured';

export type AuthenticationResult =
	| {
			success: true;
			actor: AuthenticatedActor;
	  }
	| {
			success: false;
			reason: AuthenticationFailureReason;
	  };

export type SecurityFailureInput = {
	reason: AuthenticationFailureReason;
	channel: AuthChannel;
	path?: string;
	remoteAddress?: string;
};

export class AuthService {
	constructor(
		private readonly eventBus: EventBus,
		private readonly expectedToken: string | undefined,
		private readonly userId = 'local-user',
	) {}

	authenticate(
		token: string | undefined,
		channel: AuthChannel,
		requestedUserId?: string,
	): AuthenticationResult {
		if (!this.expectedToken?.trim()) {
			return { success: false, reason: 'auth-not-configured' };
		}

		if (!token?.trim()) {
			return { success: false, reason: 'missing-token' };
		}

		if (!constantTimeEquals(token, this.expectedToken)) {
			return { success: false, reason: 'invalid-token' };
		}

		return {
			success: true,
			actor: {
				userId: normalizeUserId(requestedUserId) ?? this.userId,
				authMethod: 'static-token',
				channel,
			},
		};
	}

	async publishFailure(input: SecurityFailureInput): Promise<void> {
		const taskId = crypto.randomUUID();

		await this.eventBus.publish({
			eventId: crypto.randomUUID(),
			correlationId: crypto.randomUUID(),
			conversationId: 'security',
			rootTaskId: taskId,
			taskId,
			type: 'security.failure',
			source: `${input.channel}-gateway`,
			payload: {
				reason: input.reason,
				channel: input.channel,
				...(input.path !== undefined ? { path: input.path } : {}),
				...(input.remoteAddress !== undefined ? { remoteAddress: input.remoteAddress } : {}),
			},
			createdAt: new Date().toISOString(),
		});
	}
}

function normalizeUserId(userId: string | undefined): string | undefined {
	const normalized = userId?.trim();

	if (!normalized) {
		return undefined;
	}

	if (!/^[a-zA-Z0-9._@-]{1,80}$/.test(normalized)) {
		return undefined;
	}

	return normalized;
}

function constantTimeEquals(value: string, expected: string): boolean {
	const valueBuffer = Buffer.from(value);
	const expectedBuffer = Buffer.from(expected);

	if (valueBuffer.length !== expectedBuffer.length) {
		return false;
	}

	return timingSafeEqual(valueBuffer, expectedBuffer);
}
