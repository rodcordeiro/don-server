// scripts/ws-client.ts

import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import WebSocket from 'ws';

if (existsSync('.env')) {
	loadEnvFile('.env');
}

const socket = new WebSocket('ws://localhost:3001', {
	headers: {
		authorization: `Bearer ${process.env['DON_SERVER_TOKEN'] ?? ''}`,
		'x-don-user-id': process.env['DON_SERVER_USER_ID'] ?? 'local-user',
	},
});

socket.on('open', () => {
	socket.send(
		JSON.stringify({
			conversationId: 'conv-history-test',
			content: '@backlog levante o backlog pendente deste projeto',
		}),
	);
});

// socket.on('message', data => {
// 	console.log('EVENT:', data.toString());
// });
import { Bootstrap } from '../src/bootstrap/bootstrap';

const app = Bootstrap.create();

const events = await app.eventService.listByConversation('conv-history-test');

console.log(
	events.map(event => ({
		type: event.type,
		source: event.source,
		taskId: event.taskId,
		createdAt: event.createdAt,
	})),
);
