import type { ToolResult } from '../../domain';
import type {
	AgentCommandPayload,
	AgentErrorPayload,
	AgentMessagePayload,
	AgentResultPayload,
	HumanInstructionPayload,
	ToolFinishedPayload,
	ToolStartedPayload,
} from './event-types';

// src/core/events/event-envelope.ts
type BaseEnvelope = {
	eventId: string;
	correlationId: string;

	conversationId: string;
	rootTaskId: string;
	taskId: string;
	parentTaskId?: string;
	source: string;
	target?: string;
	createdAt: string;
};
export type EventEnvelope<TPayload = unknown> = BaseEnvelope &
	(
		| {
				type: 'human.instruction';

				payload: HumanInstructionPayload;
		  }
		| {
				type: 'agent.command';
				payload: AgentCommandPayload;
		  }
		| {
				type: 'agent.message';
				payload: AgentMessagePayload;
		  }
		| {
				type: 'agent.result';
				payload: AgentResultPayload;
		  }
		| {
				type: 'agent.error';
				payload: AgentErrorPayload;
		  }
		| {
				type: 'tool.started';
				payload: ToolStartedPayload;
		  }
		| {
				type: 'tool.result';
				payload: ToolResult<TPayload>;
		  }
		| {
				type: 'tool.finished';
				payload: ToolFinishedPayload;
		  }
	);
