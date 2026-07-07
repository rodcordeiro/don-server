// src/gateway/command-parser.ts

import { type AgentRegistry } from '../core/agents/agent-registry';
import type { ParsedCommand } from '../domain';

export function parseCommand(input: string, registry: AgentRegistry): ParsedCommand {
	const match = input.match(/^@([\w-]+),?\s+(.+)$/);

	if (!match) {
		return {
			target: 'planner-agent',
			content: input,
		};
	}

	const mention = match[1]!;
	const content = match[2]!;

	const possibleNames = [mention, `${mention}-agent`];

	const target = possibleNames.find(name => registry.has(name));

	return {
		target: target ?? 'planner-agent',
		content,
		mention,
	};
}
