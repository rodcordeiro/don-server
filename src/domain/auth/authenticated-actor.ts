export type AuthenticatedActor = {
	userId: string;
	authMethod: 'static-token';
	channel: 'rest' | 'websocket';
};
