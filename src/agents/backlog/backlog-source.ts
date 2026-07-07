import { readFile } from 'node:fs/promises';

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
}

export function parseBacklogMarkdown(content: string): BacklogSprint[] {
	const sprints: BacklogSprint[] = [];
	let currentSprint: BacklogSprint | undefined;

	for (const line of content.split(/\r?\n/)) {
		if (line.match(/^## Sprint \d+ - .+$/)) {
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
