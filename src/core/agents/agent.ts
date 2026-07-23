// src/core/agents/agent.ts

import type { EventEnvelope } from '../events/event-envelope';
import type { LlmSelection } from '../providers/provider-registry';

export type AgentMetadata = {
	name: string;
	description: string;
	capabilities?: string[];
	examples?: string[];
	llm?: LlmSelection;
	limits?: {
		timeoutMs?: number;
	};
	source?: 'static' | 'dynamic' | 'external';
};

export interface Agent {
	metadata: AgentMetadata;

	handle(event: EventEnvelope): Promise<void>;
}
