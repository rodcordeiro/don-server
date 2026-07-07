// src/core/events/event-types.ts

export type HumanInstructionPayload = {
	rawContent: string;
	content: string;
	mention?: string;
};

export type AgentCommandPayload = {
	content: string;
	reason?: string;
	stepId?: string;
};

export type AgentMessagePayload = {
	content: string;
};

export type AgentResultPayload = {
	status: 'completed' | 'failed';
	result: string;
};

export type AgentErrorPayload = {
	error: string;
	durationMs?: number;
	timeoutMs?: number;
};

export type AgentStartedPayload = {
	agent: string;
};

export type AgentCompletedPayload = {
	agent: string;
	durationMs: number;
};

export type ToolStartedPayload = {
	tool: string;
	input?: unknown;
};

export type ToolFinishedPayload = {
	tool: string;
	output?: unknown;
};
