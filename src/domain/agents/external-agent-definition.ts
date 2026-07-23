export type ExternalAgentTransport =
	| {
			type: 'http';
			url: string;
	  }
	| {
			type: 'cli';
			command: string;
			args?: string[];
	  };

export type ExternalAgentDefinition = {
	name: string;
	description: string;
	transport: ExternalAgentTransport;
	capabilities?: string[];
	examples?: string[];
	limits?: {
		timeoutMs?: number;
	};
};
