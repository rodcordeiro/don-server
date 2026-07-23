import type { LlmSelection } from '../../core/providers/provider-registry';

export type AgentDefinition = {
	name: string;
	description: string;
	instruction: string;
	capabilities?: string[];
	examples?: string[];
	llm?: LlmSelection;
	limits?: {
		timeoutMs?: number;
	};
};
