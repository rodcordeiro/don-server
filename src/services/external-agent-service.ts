import { ExternalAgent } from '../agents/external/external-agent';
import type { AgentRegistry } from '../core/agents/agent-registry';
import type { EventBus } from '../core/events/event-bus';
import type { ExternalAgentDefinition } from '../domain';
import type { DynamicAgentRegistrationResult } from './dynamic-agent-service';

export class ExternalAgentService {
	constructor(
		private readonly agentRegistry: AgentRegistry,
		private readonly eventBus: EventBus,
	) {}

	register(rawDefinition: unknown): DynamicAgentRegistrationResult {
		const definition = validateExternalAgentDefinition(rawDefinition);

		if (this.agentRegistry.has(definition.name)) {
			throw new Error(`Agente ja registrado: ${definition.name}.`);
		}

		this.agentRegistry.register(new ExternalAgent(definition, this.eventBus));

		return {
			name: definition.name,
			description: definition.description,
		};
	}
}

function validateExternalAgentDefinition(rawDefinition: unknown): ExternalAgentDefinition {
	if (!rawDefinition || typeof rawDefinition !== 'object') {
		throw new Error('Definicao de agente externo precisa ser um objeto JSON.');
	}

	const definition = rawDefinition as Record<string, unknown>;
	const name = readRequiredString(definition, 'name');
	const description = readRequiredString(definition, 'description');

	if (!/^[a-z][a-z0-9-]{2,60}$/.test(name)) {
		throw new Error(
			'Nome de agente externo deve usar kebab-case, iniciar com letra e ter 3 a 60 caracteres.',
		);
	}

	return {
		name,
		description,
		transport: readTransport(definition['transport']),
		...readStringArray(definition, 'capabilities'),
		...readStringArray(definition, 'examples'),
		...readLimits(definition),
	};
}

function readTransport(value: unknown): ExternalAgentDefinition['transport'] {
	if (!value || typeof value !== 'object') {
		throw new Error('Campo transport deve ser um objeto.');
	}

	const transport = value as Record<string, unknown>;

	if (transport['type'] === 'http') {
		return {
			type: 'http',
			url: readRequiredString(transport, 'url'),
		};
	}

	if (transport['type'] === 'cli') {
		return {
			type: 'cli',
			command: readRequiredString(transport, 'command'),
			...readArgs(transport),
		};
	}

	throw new Error('Campo transport.type deve ser http ou cli.');
}

function readRequiredString(definition: Record<string, unknown>, key: string): string {
	const value = definition[key];

	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`Campo obrigatorio ausente ou invalido: ${key}.`);
	}

	return value.trim();
}

function readArgs(
	transport: Record<string, unknown>,
): Pick<Extract<ExternalAgentDefinition['transport'], { type: 'cli' }>, 'args'> {
	const value = transport['args'];

	if (value === undefined) {
		return {};
	}

	if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
		throw new Error('Campo transport.args deve ser lista de strings.');
	}

	return { args: value };
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

function readLimits(
	definition: Record<string, unknown>,
): Partial<Pick<ExternalAgentDefinition, 'limits'>> {
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
