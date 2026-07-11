import type { ProviderRegistry } from '../../core/providers/provider-registry';
import type { BacklogTask } from './backlog-source';

export type BacklogIntent =
	| {
			action: 'query';
			status?: string;
			sprint?: string;
			id?: string;
	  }
	| {
			action: 'add';
			sprint: string;
			id: string;
			title: string;
			status?: string;
			deliverable: string;
	  }
	| {
			action: 'complete';
			id: string;
	  }
	| {
			action: 'edit';
			id: string;
			title?: string;
			status?: string;
			deliverable?: string;
	  }
	| {
			action: 'remove';
			id: string;
	  };

export type BacklogIntentResult = {
	intent: BacklogIntent;
	interpreter: 'model' | 'deterministic';
};

export class BacklogIntentInterpreter {
	constructor(private readonly providerRegistry?: ProviderRegistry) {}

	async interpret(instruction: string, tasks: BacklogTask[]): Promise<BacklogIntentResult> {
		const modelIntent = await this.tryModel(instruction, tasks);

		if (modelIntent) {
			return {
				intent: modelIntent,
				interpreter: 'model',
			};
		}

		return {
			intent: parseDeterministicIntent(instruction),
			interpreter: 'deterministic',
		};
	}

	private async tryModel(
		instruction: string,
		tasks: BacklogTask[],
	): Promise<BacklogIntent | undefined> {
		const provider = this.providerRegistry?.get('ollama');

		if (!provider) {
			return undefined;
		}

		try {
			const response = await provider.chat({
				model: 'llama3.1',
				format: 'json',
				messages: [
					{ role: 'system', content: buildBacklogIntentPrompt(tasks) },
					{ role: 'user', content: instruction },
				],
			});

			return validateBacklogIntent(JSON.parse(response));
		} catch {
			return undefined;
		}
	}
}

function buildBacklogIntentPrompt(tasks: BacklogTask[]): string {
	const taskSummary = tasks
		.slice(0, 80)
		.map(task => `${task.id} | ${task.status} | ${task.sprint} | ${task.title}`)
		.join('\n');

	return [
		'Voce interpreta pedidos sobre um backlog Markdown.',
		'Responda apenas JSON valido com uma destas formas:',
		'{"action":"query","status":"Pendente|Parcial|Concluido","sprint":"Sprint 11","id":"AG-003.4"}',
		'{"action":"add","sprint":"Sprint 11","id":"AG-003.9","title":"Titulo","status":"Pendente","deliverable":"Entregavel"}',
		'{"action":"complete","id":"AG-003.4"}',
		'{"action":"edit","id":"AG-003.4","title":"Novo titulo","status":"Parcial","deliverable":"Novo entregavel"}',
		'{"action":"remove","id":"AG-003.4"}',
		'Use add/edit/remove/complete apenas quando houver ID explicito.',
		'Para consultas ambiguas, use action=query.',
		'Backlog conhecido:',
		taskSummary,
	].join('\n');
}

function parseDeterministicIntent(instruction: string): BacklogIntent {
	const normalized = instruction.toLowerCase();
	const id = extractTaskId(instruction);

	if (id && hasAny(normalized, ['remova', 'remover', 'delete', 'exclua', 'excluir'])) {
		return { action: 'remove', id };
	}

	if (
		id &&
		hasAny(normalized, ['conclua', 'concluir', 'marque como concluido', 'marcar como concluido'])
	) {
		return { action: 'complete', id };
	}

	if (id && hasAny(normalized, ['edite', 'editar', 'altere', 'alterar', 'atualize', 'atualizar'])) {
		return {
			action: 'edit',
			id,
			...extractOptionalFields(instruction),
		};
	}

	if (hasAny(normalized, ['adicione', 'adicionar', 'crie', 'criar', 'nova tarefa'])) {
		const addIntent = parseAddIntent(instruction);

		if (addIntent) {
			return addIntent;
		}
	}

	return {
		action: 'query',
		...(id ? { id } : {}),
		...extractQueryFilters(instruction),
	};
}

function parseAddIntent(instruction: string): BacklogIntent | undefined {
	const id = extractTaskId(instruction);
	const sprint = extractSprint(instruction);
	const fields = extractOptionalFields(instruction);

	if (!id || !sprint || !fields.title || !fields.deliverable) {
		return undefined;
	}

	return {
		action: 'add',
		id,
		sprint,
		title: fields.title,
		status: fields.status ?? 'Pendente',
		deliverable: fields.deliverable,
	};
}

function extractQueryFilters(
	instruction: string,
): Pick<Extract<BacklogIntent, { action: 'query' }>, 'status' | 'sprint'> {
	const normalized = instruction.toLowerCase();
	const sprint = extractSprint(instruction);
	let status: string | undefined;

	if (normalized.includes('pendente') || normalized.includes('aberto')) {
		status = 'Pendente';
	} else if (normalized.includes('parcial')) {
		status = 'Parcial';
	} else if (normalized.includes('concluido') || normalized.includes('concluido')) {
		status = 'Concluido';
	}

	return {
		...(status ? { status } : {}),
		...(sprint ? { sprint } : {}),
	};
}

function extractOptionalFields(instruction: string): {
	title?: string;
	status?: string;
	deliverable?: string;
} {
	return {
		...extractField(instruction, 'titulo', 'title'),
		...extractField(instruction, 'status', 'status'),
		...extractField(instruction, 'entregavel', 'deliverable'),
	};
}

function extractField<TName extends 'title' | 'status' | 'deliverable'>(
	instruction: string,
	label: string,
	name: TName,
): Record<TName, string> | object {
	const match = instruction.match(new RegExp(`${label}\\s*[:=]\\s*([^;\\n]+)`, 'i'));
	const value = match?.[1]?.trim();

	return value ? { [name]: value } : {};
}

function validateBacklogIntent(input: unknown): BacklogIntent | undefined {
	if (!isRecord(input) || typeof input['action'] !== 'string') {
		return undefined;
	}

	const action = input['action'];

	if (action === 'query') {
		return {
			action,
			...readOptionalString(input, 'status'),
			...readOptionalString(input, 'sprint'),
			...readOptionalString(input, 'id'),
		};
	}

	if (action === 'complete' || action === 'remove') {
		const id = readString(input, 'id');
		return id ? { action, id } : undefined;
	}

	if (action === 'edit') {
		const id = readString(input, 'id');

		if (!id) {
			return undefined;
		}

		return {
			action,
			id,
			...readOptionalString(input, 'title'),
			...readOptionalString(input, 'status'),
			...readOptionalString(input, 'deliverable'),
		};
	}

	if (action === 'add') {
		const id = readString(input, 'id');
		const sprint = readString(input, 'sprint');
		const title = readString(input, 'title');
		const deliverable = readString(input, 'deliverable');

		if (!id || !sprint || !title || !deliverable) {
			return undefined;
		}

		return {
			action,
			id,
			sprint,
			title,
			deliverable,
			...readOptionalString(input, 'status'),
		};
	}

	return undefined;
}

function readOptionalString(
	input: Record<string, unknown>,
	field: string,
): Record<string, string> | object {
	const value = readString(input, field);

	return value ? { [field]: value } : {};
}

function readString(input: Record<string, unknown>, field: string): string | undefined {
	const value = input[field];

	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function extractTaskId(instruction: string): string | undefined {
	return instruction.match(/\b[A-Z]{2,}-\d+(?:\.\d+)?\b/i)?.[0]?.toUpperCase();
}

function extractSprint(instruction: string): string | undefined {
	const match = instruction.match(/\bSprint\s+(\d+(?:\.\d+)?)\b/i);

	return match ? `Sprint ${match[1]}` : undefined;
}

function hasAny(input: string, terms: string[]): boolean {
	return terms.some(term => input.includes(term));
}

function isRecord(input: unknown): input is Record<string, unknown> {
	return typeof input === 'object' && input !== null;
}
