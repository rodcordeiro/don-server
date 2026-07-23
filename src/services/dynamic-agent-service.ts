import { DynamicAgent } from '../agents/dynamic/dynamic-agent';
import type { AgentRegistry } from '../core/agents/agent-registry';
import type { EventBus } from '../core/events/event-bus';
import type { ProviderRegistry } from '../core/providers/provider-registry';
import type { AgentDefinition } from '../domain';

export type DynamicAgentRegistrationResult = {
	name: string;
	description: string;
};

export class DynamicAgentService {
	constructor(
		private readonly agentRegistry: AgentRegistry,
		private readonly eventBus: EventBus,
		private readonly providerRegistry: ProviderRegistry,
	) {}

	register(rawDefinition: unknown): DynamicAgentRegistrationResult {
		const definition = validateAgentDefinition(rawDefinition);

		if (this.agentRegistry.has(definition.name)) {
			throw new Error(`Agente ja registrado: ${definition.name}.`);
		}

		this.agentRegistry.register(new DynamicAgent(definition, this.eventBus, this.providerRegistry));

		return {
			name: definition.name,
			description: definition.description,
		};
	}
}

function validateAgentDefinition(rawDefinition: unknown): AgentDefinition {
	if (!rawDefinition || typeof rawDefinition !== 'object') {
		throw new Error('Definicao de agente precisa ser um objeto JSON.');
	}

	const definition = rawDefinition as Record<string, unknown>;
	const name = readRequiredString(definition, 'name');
	const description = readRequiredString(definition, 'description');
	const instruction = readRequiredString(definition, 'instruction');

	if (!/^[a-z][a-z0-9-]{2,60}$/.test(name)) {
		throw new Error(
			'Nome de agente deve usar kebab-case, iniciar com letra e ter 3 a 60 caracteres.',
		);
	}

	return {
		name,
		description,
		instruction,
		...readStringArray(definition, 'capabilities'),
		...readStringArray(definition, 'examples'),
		...readLlmSelection(definition),
		...readLimits(definition),
	};
}

function readRequiredString(definition: Record<string, unknown>, key: string): string {
	const value = definition[key];

	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`Campo obrigatorio ausente ou invalido: ${key}.`);
	}

	return value.trim();
}

function readStringArray(
	definition: Record<string, unknown>,
	key: string,
): {
	capabilities?: string[];
	examples?: string[];
} {
	const value = definition[key];

	if (value === undefined) {
		return {};
	}

	if (!Array.isArray(value) || !value.every(item => typeof item === 'string' && item.trim())) {
		throw new Error(`Campo ${key} deve ser uma lista de strings.`);
	}

	const items = (value as string[]).map(item => item.trim());

	return key === 'capabilities' ? { capabilities: items } : { examples: items };
}

function readLlmSelection(
	definition: Record<string, unknown>,
): Partial<Pick<AgentDefinition, 'llm'>> {
	const value = definition['llm'];

	if (value === undefined) {
		return {};
	}

	if (!value || typeof value !== 'object') {
		throw new Error('Campo llm deve ser um objeto.');
	}

	const llm = value as Record<string, unknown>;

	return {
		llm: {
			...(typeof llm['providerName'] === 'string' && llm['providerName'].trim()
				? { providerName: llm['providerName'].trim() }
				: {}),
			...(typeof llm['model'] === 'string' && llm['model'].trim()
				? { model: llm['model'].trim() }
				: {}),
		},
	};
}

function readLimits(definition: Record<string, unknown>): Partial<Pick<AgentDefinition, 'limits'>> {
	const value = definition['limits'];

	if (value === undefined) {
		return {};
	}

	if (!value || typeof value !== 'object') {
		throw new Error('Campo limits deve ser um objeto.');
	}

	const limits = value as Record<string, unknown>;
	const timeoutMs = Number(limits['timeoutMs']);

	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		throw new Error('Campo limits.timeoutMs deve ser numero positivo.');
	}

	return {
		limits: {
			timeoutMs,
		},
	};
}
