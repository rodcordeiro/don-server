import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CommandService } from '../services/command-service';
import type { EventService } from '../services/event-service';

type CommandRequest = {
	conversationId?: string;
	content?: string;
};

export class RestGateway {
	constructor(
		private readonly commandService: CommandService,
		private readonly eventService: EventService,
	) {}

	async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
		const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

		try {
			if (request.method === 'POST' && url.pathname === '/commands') {
				await this.handleCommand(request, response);
				return true;
			}

			if (request.method === 'GET') {
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

	private async handleCommand(request: IncomingMessage, response: ServerResponse): Promise<void> {
		const body = (await this.readJson(request)) as CommandRequest;

		if (typeof body.content !== 'string' || !body.content.trim()) {
			this.sendJson(response, 400, { error: 'Envie JSON com { content: string }.' });
			return;
		}

		const result = await this.commandService.handleUserCommand({
			...(body.conversationId !== undefined ? { conversationId: body.conversationId } : {}),
			content: body.content,
			source: 'rest',
		});

		this.sendJson(response, 202, result);
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
}
