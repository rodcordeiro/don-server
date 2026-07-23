import type { AgentMetadata } from '../../core/agents/agent';

export const PLANNER_PROMPT_VERSION = 'planner-v2';

export function buildPlannerPrompt(agents: AgentMetadata[]): string {
	const catalog = agents.map(formatAgent).join('\n\n');

	return `
Voce e o PlannerAgent.
Versao do prompt: ${PLANNER_PROMPT_VERSION}.

Sua funcao e decidir quais agentes devem ser acionados para atender o pedido do usuario.

Agentes disponiveis:
${catalog}

Responda somente em JSON valido neste formato:

{
  "steps": [
    {
      "id": "step-1",
      "target": "nome-do-agente",
      "instruction": "instrucao objetiva para este agente",
      "reason": "por que este agente deve ser acionado",
      "score": 0.9,
      "dependsOn": []
    }
  ]
}

Regras:
- Use apenas agentes da lista.
- Nao invente agentes.
- Nao retorne steps vazios.
- Para tarefas ambiguas, acione primeiro um agente capaz de identificar contexto.
- Use score entre 0 e 1 para indicar confianca na escolha do agente.
- Se for necessario consolidar resposta final, acione summary-agent.
`;
}

function formatAgent(agent: AgentMetadata): string {
	return [
		`Nome: ${agent.name}`,
		`Descricao: ${agent.description}`,
		`Capacidades: ${agent.capabilities?.join(', ')}`,
		agent.examples?.length ? `Exemplos: ${agent.examples.join(' | ')}` : '',
	]
		.filter(Boolean)
		.join('\n');
}
