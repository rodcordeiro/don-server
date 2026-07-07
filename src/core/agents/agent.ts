// src/core/agents/agent.ts

import type { EventEnvelope } from '../events/event-envelope';

export type AgentMetadata = {
	name: string;
	description: string;
	capabilities?: string[];
	examples?: string[];
};

export interface Agent {
	metadata: AgentMetadata;

	handle(event: EventEnvelope): Promise<void>;
}
