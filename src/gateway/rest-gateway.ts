import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthenticatedActor } from '../domain';
import type { CommandService } from '../services/command-service';
import type { EventService } from '../services/event-service';
import type { AuthService } from '../services/auth-service';
import type { ProjectService } from '../services/project-service';
import type { AgentRegistry } from '../core/agents/agent-registry';
import type { DynamicAgentService } from '../services/dynamic-agent-service';

type CommandRequest = {
	conversationId?: string;
	projectId?: string;
	content?: string;
};

export class RestGateway {
	constructor(
		private readonly commandService: CommandService,
		private readonly eventService: EventService,
		private readonly authService: AuthService,
		private readonly projectService: ProjectService,
		private readonly agentRegistry: AgentRegistry,
		private readonly dynamicAgentService: DynamicAgentService,
	) {}

	async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
		const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

		try {
			const actor = await this.authenticate(request, response, url);

			if (!actor) {
				return true;
			}

			if (request.method === 'POST' && url.pathname === '/commands') {
				await this.handleCommand(request, response, actor);
				return true;
			}

			if (request.method === 'POST' && url.pathname === '/agents') {
				await this.handleAgentRegistration(request, response);
				return true;
			}

			if (request.method === 'GET') {
				if (url.pathname === '/agents') {
					this.sendJson(response, 200, { agents: this.agentRegistry.getCatalog() });
					return true;
				}

				if (await this.handleProjectQuery(url, response)) {
					return true;
				}

				if (await this.handleEventQuery(url, response)) {
					return true;
				}
			}

			return false;
		} catch (error) {
			this.sendJson(response, 500, {
				error: error instanceof Error ? error.message : 'Erro interno.',
			});
			return true;
		}
	}

	private async handleCommand(
		request: IncomingMessage,
		response: ServerResponse,
		actor: AuthenticatedActor,
	): Promise<void> {
		const body = (await this.readJson(request)) as CommandRequest;

		if (typeof body.content !== 'string' || !body.content.trim()) {
			this.sendJson(response, 400, { error: 'Envie JSON com { content: string }.' });
			return;
		}

		const result = await this.commandService.handleUserCommand({
			...(body.conversationId !== undefined ? { conversationId: body.conversationId } : {}),
			...(body.projectId !== undefined ? { projectId: body.projectId } : {}),
			content: body.content,
			source: 'rest',
			actor,
		});

		this.sendJson(response, 202, result);
	}

	private async handleAgentRegistration(
		request: IncomingMessage,
		response: ServerResponse,
	): Promise<void> {
		const result = this.dynamicAgentService.register(await this.readJson(request));

		this.sendJson(response, 201, result);
	}

	private async handleProjectQuery(url: URL, response: ServerResponse): Promise<boolean> {
		if (url.pathname === '/projects') {
			this.sendJson(response, 200, { projects: await this.projectService.listProjects() });
			return true;
		}

		const projectEventsMatch = url.pathname.match(/^\/projects\/([^/]+)\/events$/);

		if (projectEventsMatch?.[1]) {
			const events = await this.eventService.listByProject(
				decodeURIComponent(projectEventsMatch[1]),
			);
			this.sendJson(response, 200, { events });
			return true;
		}

		return false;
	}

	private async handleEventQuery(url: URL, response: ServerResponse): Promise<boolean> {
		const conversationMatch = url.pathname.match(/^\/conversations\/([^/]+)\/events$/);

		if (conversationMatch?.[1]) {
			const events = await this.eventService.listByConversation(
				decodeURIComponent(conversationMatch[1]),
			);
			this.sendJson(response, 200, { events });
			return true;
		}

		const taskMatch = url.pathname.match(/^\/tasks\/([^/]+)\/events$/);

		if (taskMatch?.[1]) {
			const events = await this.eventService.listByTask(decodeURIComponent(taskMatch[1]));
			this.sendJson(response, 200, { events });
			return true;
		}

		const correlationMatch = url.pathname.match(/^\/correlations\/([^/]+)\/events$/);

		if (correlationMatch?.[1]) {
			const events = await this.eventService.listByCorrelation(
				decodeURIComponent(correlationMatch[1]),
			);
			this.sendJson(response, 200, { events });
			return true;
		}

		return false;
	}

	private async readJson(request: IncomingMessage): Promise<unknown> {
		let raw = '';

		for await (const chunk of request) {
			raw += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
		}

		if (!raw.trim()) {
			return {};
		}

		return JSON.parse(raw) as unknown;
	}

	private sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
		response.writeHead(statusCode, {
			'content-type': 'application/json; charset=utf-8',
		});
		response.end(JSON.stringify(payload));
	}

	private async authenticate(
		request: IncomingMessage,
		response: ServerResponse,
		url: URL,
	): Promise<AuthenticatedActor | undefined> {
		const result = this.authService.authenticate(
			extractToken(request),
			'rest',
			extractUserId(request),
		);

		if (result.success) {
			return result.actor;
		}

		await this.authService.publishFailure({
			reason: result.reason,
			channel: 'rest',
			path: url.pathname,
			...(request.socket.remoteAddress !== undefined
				? { remoteAddress: request.socket.remoteAddress }
				: {}),
		});

		this.sendJson(response, 401, { error: 'Autenticacao obrigatoria.' });
		return undefined;
	}
}

function extractUserId(request: IncomingMessage): string | undefined {
	const userId = request.headers['x-don-user-id'];

	return typeof userId === 'string' ? userId : undefined;
}

function extractToken(request: IncomingMessage): string | undefined {
	const authorization = request.headers.authorization;

	if (authorization?.startsWith('Bearer ')) {
		return authorization.slice('Bearer '.length);
	}

	const headerToken = request.headers['x-don-token'];

	return typeof headerToken === 'string' ? headerToken : undefined;
}
