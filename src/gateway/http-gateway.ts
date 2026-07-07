import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

export type HttpRequestHandler = (
	request: IncomingMessage,
	response: ServerResponse,
) => Promise<boolean> | boolean;

export class HttpGateway {
	private readonly handlers: HttpRequestHandler[] = [];
	private readonly server: Server;

	constructor(private readonly port = 3001) {
		this.server = createServer((request, response) => {
			void this.handleRequest(request, response);
		});
	}

	getServer(): Server {
		return this.server;
	}

	register(handler: HttpRequestHandler): void {
		this.handlers.push(handler);
	}

	start(): void {
		this.server.listen(this.port, () => {
			console.log(`HttpGateway listening on http://localhost:${this.port}`);
		});
	}

	private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
		for (const handler of this.handlers) {
			if (await handler(request, response)) {
				return;
			}
		}

		response.writeHead(404, {
			'content-type': 'application/json; charset=utf-8',
		});
		response.end(JSON.stringify({ error: 'Rota nao encontrada.' }));
	}
}
