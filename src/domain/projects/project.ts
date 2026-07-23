export type ProjectOrigin = 'local' | 'remote';

export type Project = {
	projectId: string;
	name: string;
	origin: ProjectOrigin;
	repository?: string;
	backlogPath: string;
};
