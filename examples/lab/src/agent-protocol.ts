import type { ElementSignals } from './corpus.js';
import type { ArmId, ProposedLocator } from './engine.js';

export interface AgentNode {
  nodeId: number;
  signals: ElementSignals;
  testId?: string;
}

export interface AgentTaskRequest {
  taskId: string;
  instruction: string;
  arm: ArmId;
  nodes: AgentNode[];
}

export interface AgentTaskResponse {
  locators: ProposedLocator[];
}

export function parseAgentResponse(stdout: string): AgentTaskResponse {
  const parsed: unknown = JSON.parse(stdout);
  const locators = Array.isArray(parsed) ? parsed : (parsed as { locators?: unknown })?.locators;
  if (!Array.isArray(locators)) {
    throw new Error('agent response must be an array or an object with a locators array');
  }
  return { locators: locators as ProposedLocator[] };
}
