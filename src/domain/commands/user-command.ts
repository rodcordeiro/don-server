import type { AuthenticatedActor } from '../auth';

export type UserCommand = {
	conversationId?: string;
	content: string;
	source: string;
	actor: AuthenticatedActor;
};
