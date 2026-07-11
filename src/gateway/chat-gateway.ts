// src/gateway/chat-gateway.ts

import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage, Server } from 'node:http';
import { type EventBus } from '../core/events/event-bus';
import type { EventEnvelope } from '../core/events/event-envelope';
import { type CommandService } from '../services/command-service';
import type { AuthService } from '../services/auth-service';
import type { AuthenticatedActor } from '../domain';

type ClientMessage = {
	conversationId?: string;
	content: string;
};

export class ChatGateway {
	private readonly clients = new Set<WebSocket>();
	private readonly actors = new WeakMap<WebSocket, AuthenticatedActor>();

	constructor(
		private readonly eventBus: EventBus,
		private readonly commandService: CommandService,
		private readonly server: Server,
		private readonly authService: AuthService,
	) {}

	start() {
		const wss = new WebSocketServer({ server: this.server, autoPong: true });

		wss.on('connection', (socket, request) => {
			const actor = this.authenticateConnection(socket, request);

			if (!actor) {
				return;
			}

			this.clients.add(socket);
			this.actors.set(socket, actor);

			console.debug('[ChatGateway] client connected');

			socket.send(
				JSON.stringify({
					type: 'gateway.connected',
					payload: {
						message: 'Conectado ao Don Agent.',
					},
					createdAt: new Date().toISOString(),
				}),
			);

			socket.on('message', raw => {
				const text = Buffer.isBuffer(raw)
					? raw.toString('utf-8')
					: raw instanceof ArrayBuffer
						? Buffer.from(raw).toString('utf-8')
						: Buffer.concat(raw).toString('utf-8');
				void this.handleMessage(text, socket);
			});

			socket.on('close', () => {
				this.clients.delete(socket);
			});
		});

		this.eventBus.subscribeAll(event => {
			this.broadcast(event);
		});

		console.debug('ChatGateway attached to shared HTTP server');
	}

	private async handleMessage(raw: string, socket: WebSocket): Promise<void> {
		try {
			const actor = this.actors.get(socket);

			if (!actor) {
				this.sendGatewayError(socket, 'Conexao nao autenticada.');
				socket.close(1008, 'unauthorized');
				return;
			}

			const message = JSON.parse(raw) as ClientMessage;

			if (!message.content?.trim()) {
				this.sendGatewayError(socket, 'Mensagem sem conteudo.');
				return;
			}

			const result = await this.commandService.handleUserCommand({
				conversationId: message.conversationId as string,
				content: message.content,
				source: 'websocket',
				actor,
			});

			socket.send(
				JSON.stringify({
					type: 'gateway.accepted',
					payload: result,
					createdAt: new Date().toISOString(),
				}),
			);
		} catch {
			this.sendGatewayError(socket, 'Mensagem invalida. Envie JSON com { content: string }.');
		}
	}

	private broadcast(event: EventEnvelope): void {
		const message = JSON.stringify(event);

		for (const client of this.clients) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(message);
			}
		}
	}

	private sendGatewayError(socket: WebSocket, error: string): void {
		socket.send(
			JSON.stringify({
				type: 'gateway.error',
				payload: { error },
				createdAt: new Date().toISOString(),
			}),
		);
	}

	private authenticateConnection(
		socket: WebSocket,
		request: IncomingMessage,
	): AuthenticatedActor | undefined {
		const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
		const result = this.authService.authenticate(
			extractToken(request, url),
			'websocket',
			extractUserId(request),
		);

		if (result.success) {
			return result.actor;
		}

		void this.authService.publishFailure({
			reason: result.reason,
			channel: 'websocket',
			path: url.pathname,
			...(request.socket.remoteAddress !== undefined
				? { remoteAddress: request.socket.remoteAddress }
				: {}),
		});

		if (socket.readyState === WebSocket.OPEN) {
			this.sendGatewayError(socket, 'Autenticacao obrigatoria.');
		}

		socket.close(1008, 'unauthorized');
		return undefined;
	}
}

function extractUserId(request: IncomingMessage): string | undefined {
	const userId = request.headers['x-don-user-id'];

	return typeof userId === 'string' ? userId : undefined;
}

function extractToken(request: IncomingMessage, url: URL): string | undefined {
	const authorization = request.headers.authorization;

	if (authorization?.startsWith('Bearer ')) {
		return authorization.slice('Bearer '.length);
	}

	const headerToken = request.headers['x-don-token'];

	if (typeof headerToken === 'string') {
		return headerToken;
	}

	return url.searchParams.get('token') ?? undefined;
}
