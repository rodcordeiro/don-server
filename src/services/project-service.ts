import { readFile } from 'node:fs/promises';
import { cwd } from 'node:process';
import type { Project } from '../domain';

type ProjectIndex = {
	projects?: unknown;
};

export const DEFAULT_PROJECT_ID = 'default';

export class ProjectService {
	constructor(
		private readonly indexPath = 'data/projects.json',
		private readonly fallbackProject: Project = {
			projectId: DEFAULT_PROJECT_ID,
			name: 'Don Server',
			origin: 'local',
			repository: cwd(),
			backlogPath: 'docs/backlog.md',
		},
	) {}

	async listProjects(): Promise<Project[]> {
		const projects = await this.readConfiguredProjects();

		if (projects.some(project => project.projectId === this.fallbackProject.projectId)) {
			return projects;
		}

		return [this.fallbackProject, ...projects];
	}

	async getProject(projectId?: string): Promise<Project> {
		const normalizedProjectId = normalizeProjectId(projectId);

		if (!normalizedProjectId || normalizedProjectId === this.fallbackProject.projectId) {
			return this.fallbackProject;
		}

		const project = (await this.listProjects()).find(candidate => {
			return candidate.projectId === normalizedProjectId;
		});

		if (!project) {
			throw new Error(`Projeto nao encontrado: ${normalizedProjectId}.`);
		}

		return project;
	}

	async resolveBacklogPath(projectId?: string): Promise<string> {
		return (await this.getProject(projectId)).backlogPath;
	}

	private async readConfiguredProjects(): Promise<Project[]> {
		try {
			const content = await readFile(this.indexPath, 'utf8');
			const parsed = JSON.parse(content) as ProjectIndex;
			const projects = Array.isArray(parsed.projects) ? parsed.projects : [];

			return projects.filter(isProject);
		} catch (error) {
			if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
				return [];
			}

			throw error;
		}
	}
}

function normalizeProjectId(projectId: string | undefined): string | undefined {
	const trimmed = projectId?.trim();
	return trimmed ? trimmed : undefined;
}

function isProject(value: unknown): value is Project {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const candidate = value as Record<string, unknown>;

	return (
		typeof candidate['projectId'] === 'string' &&
		typeof candidate['name'] === 'string' &&
		(candidate['origin'] === 'local' || candidate['origin'] === 'remote') &&
		typeof candidate['backlogPath'] === 'string' &&
		(candidate['repository'] === undefined || typeof candidate['repository'] === 'string')
	);
}
