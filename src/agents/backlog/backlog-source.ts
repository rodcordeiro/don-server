import { readFile, writeFile } from 'node:fs/promises';

export type BacklogTask = {
	id: string;
	title: string;
	status: string;
	deliverable: string;
	sprint: string;
};

export type BacklogSprint = {
	title: string;
	tasks: BacklogTask[];
};

export class BacklogSource {
	constructor(private readonly filePath = 'docs/backlog.md') {}

	async read(): Promise<BacklogSprint[]> {
		const content = await readFile(this.filePath, 'utf8');
		return parseBacklogMarkdown(content);
	}

	async addTask(input: {
		sprint: string;
		id: string;
		title: string;
		status: string;
		deliverable: string;
	}): Promise<BacklogMutationResult> {
		const content = await readFile(this.filePath, 'utf8');
		const next = addTaskToMarkdown(content, input);

		await writeFile(this.filePath, next.content);

		return next;
	}

	async updateTask(
		id: string,
		patch: {
			title?: string;
			status?: string;
			deliverable?: string;
		},
	): Promise<BacklogMutationResult> {
		const content = await readFile(this.filePath, 'utf8');
		const next = updateTaskInMarkdown(content, id, patch);

		await writeFile(this.filePath, next.content);

		return next;
	}

	async removeTask(id: string): Promise<BacklogMutationResult> {
		const content = await readFile(this.filePath, 'utf8');
		const next = removeTaskFromMarkdown(content, id);

		await writeFile(this.filePath, next.content);

		return next;
	}
}

export type BacklogMutationResult = {
	content: string;
	summary: string;
	before?: BacklogTask;
	after?: BacklogTask;
};

export function parseBacklogMarkdown(content: string): BacklogSprint[] {
	const sprints: BacklogSprint[] = [];
	let currentSprint: BacklogSprint | undefined;

	for (const line of content.split(/\r?\n/)) {
		if (line.match(/^## Sprint \d+(?:\.\d+)? - .+$/)) {
			currentSprint = {
				title: line.replace(/^##\s+/, '').trim(),
				tasks: [],
			};
			sprints.push(currentSprint);
			continue;
		}

		if (!currentSprint || !line.startsWith('|')) {
			continue;
		}

		const task = parseTaskRow(line, currentSprint.title);

		if (task) {
			currentSprint.tasks.push(task);
		}
	}

	return sprints;
}

function parseTaskRow(line: string, sprint: string): BacklogTask | undefined {
	const columns = line
		.split('|')
		.slice(1, -1)
		.map(column => column.trim());

	if (columns.length < 4) {
		return undefined;
	}

	const [id, title, status, deliverable] = columns;

	if (!id || id === 'ID' || id.startsWith('-')) {
		return undefined;
	}

	return {
		id,
		title: title ?? '',
		status: status ?? '',
		deliverable: deliverable ?? '',
		sprint,
	};
}

function addTaskToMarkdown(
	content: string,
	input: {
		sprint: string;
		id: string;
		title: string;
		status: string;
		deliverable: string;
	},
): BacklogMutationResult {
	const lines = content.split(/\r?\n/);
	const existing = parseBacklogMarkdown(content)
		.flatMap(sprint => sprint.tasks)
		.find(task => sameTaskId(task.id, input.id));

	if (existing) {
		throw new Error(`Tarefa ja existe: ${input.id}.`);
	}

	const sprintRange = findSprintRange(lines, input.sprint);

	if (!sprintRange) {
		throw new Error(`Sprint nao encontrada: ${input.sprint}.`);
	}

	const tableEnd = findTaskTableEnd(lines, sprintRange.start, sprintRange.end);

	if (tableEnd === undefined) {
		throw new Error(`Tabela de tarefas nao encontrada em ${input.sprint}.`);
	}

	const row = formatTaskRow({
		id: input.id,
		title: input.title,
		status: input.status,
		deliverable: input.deliverable,
		sprint: input.sprint,
	});

	lines.splice(tableEnd, 0, row);

	return {
		content: lines.join('\n'),
		summary: `Tarefa adicionada: ${input.id}.`,
		after: {
			id: input.id,
			title: input.title,
			status: input.status,
			deliverable: input.deliverable,
			sprint: input.sprint,
		},
	};
}

function updateTaskInMarkdown(
	content: string,
	id: string,
	patch: {
		title?: string;
		status?: string;
		deliverable?: string;
	},
): BacklogMutationResult {
	const lines = content.split(/\r?\n/);
	const located = findTaskLine(lines, id);

	if (!located) {
		throw new Error(`Tarefa nao encontrada: ${id}.`);
	}

	const after = {
		...located.task,
		...(patch.title !== undefined ? { title: patch.title } : {}),
		...(patch.status !== undefined ? { status: patch.status } : {}),
		...(patch.deliverable !== undefined ? { deliverable: patch.deliverable } : {}),
	};

	lines[located.index] = formatTaskRow(after);

	return {
		content: lines.join('\n'),
		summary: `Tarefa atualizada: ${id}.`,
		before: located.task,
		after,
	};
}

function removeTaskFromMarkdown(content: string, id: string): BacklogMutationResult {
	const lines = content.split(/\r?\n/);
	const located = findTaskLine(lines, id);

	if (!located) {
		throw new Error(`Tarefa nao encontrada: ${id}.`);
	}

	lines.splice(located.index, 1);

	return {
		content: lines.join('\n'),
		summary: `Tarefa removida: ${id}.`,
		before: located.task,
	};
}

function findSprintRange(
	lines: string[],
	sprintQuery: string,
): { start: number; end: number; title: string } | undefined {
	const normalizedQuery = normalizeSprint(sprintQuery);

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? '';

		if (!line.match(/^## Sprint \d+(?:\.\d+)? - .+$/)) {
			continue;
		}

		const title = line.replace(/^##\s+/, '').trim();

		if (!normalizeSprint(title).startsWith(normalizedQuery)) {
			continue;
		}

		const nextSprint = lines.findIndex(
			(nextLine, nextIndex) => nextIndex > index && /^## Sprint \d+(?:\.\d+)? - .+$/.test(nextLine),
		);

		return {
			start: index,
			end: nextSprint === -1 ? lines.length : nextSprint,
			title,
		};
	}

	return undefined;
}

function findTaskTableEnd(lines: string[], start: number, end: number): number | undefined {
	let seenHeader = false;
	let lastTaskRow: number | undefined;

	for (let index = start + 1; index < end; index += 1) {
		const line = lines[index] ?? '';

		if (!line.startsWith('|')) {
			if (seenHeader && lastTaskRow !== undefined) {
				return lastTaskRow + 1;
			}

			continue;
		}

		if (line.includes('| ID') || line.includes('| -------')) {
			seenHeader = true;
			continue;
		}

		if (seenHeader) {
			lastTaskRow = index;
		}
	}

	return lastTaskRow !== undefined ? lastTaskRow + 1 : undefined;
}

function findTaskLine(
	lines: string[],
	id: string,
): { index: number; task: BacklogTask } | undefined {
	let currentSprint = '';

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? '';

		if (line.match(/^## Sprint \d+(?:\.\d+)? - .+$/)) {
			currentSprint = line.replace(/^##\s+/, '').trim();
			continue;
		}

		const task = parseTaskRow(line, currentSprint);

		if (task && sameTaskId(task.id, id)) {
			return { index, task };
		}
	}

	return undefined;
}

function formatTaskRow(task: BacklogTask): string {
	return `| ${task.id} | ${task.title} | ${task.status} | ${task.deliverable} |`;
}

function sameTaskId(left: string, right: string): boolean {
	return left.toUpperCase() === right.toUpperCase();
}

function normalizeSprint(sprint: string): string {
	return sprint
		.toLowerCase()
		.replace(/^sprint\s+/, 'sprint ')
		.trim();
}
