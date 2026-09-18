import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORPUS, EQUIVOCALS, type CorpusElement } from './corpus.js';
import { parseAgentResponse, type AgentTaskRequest } from './agent-protocol.js';
import { buildArms, resolveLocators, type ArmId, type Resolution } from './engine.js';

const command = process.env.TESTABLE_UI_AGENT_COMMAND;
if (!command) {
  console.error('Set TESTABLE_UI_AGENT_COMMAND to a JSON-over-stdin agent command.');
  process.exit(2);
}

const model: CorpusElement[] = CORPUS.concat(
  EQUIVOCALS.map((signals) => ({ instruction: 'equivocal sibling', signals })),
);
const tasks = CORPUS.map((element, targetNodeId) => ({
  taskId: `ground-truth-node-${targetNodeId}`,
  instruction: element.instruction,
  targetNodeId,
}));
const arms = buildArms(model);
const resolutions: Record<ArmId, Resolution[]> = { with: [], without: [] };

for (const arm of ['with', 'without'] as const) {
  for (const task of tasks) {
    const request: AgentTaskRequest = {
      taskId: task.taskId,
      instruction: task.instruction,
      arm,
      nodes: arms[arm].nodes.map(({ nodeId, signals, testId }) => ({
        nodeId,
        signals,
        ...(arm === 'with' && testId ? { testId } : {}),
      })),
    };
    const result = spawnSync(command, {
      input: JSON.stringify(request),
      encoding: 'utf8',
      shell: true,
    });
    if (result.status !== 0) {
      throw new Error(`agent failed for ${task.taskId} (${arm}): ${result.stderr.trim()}`);
    }
    const response = parseAgentResponse(result.stdout);
    resolutions[arm].push(resolveLocators(arms[arm], response.locators, task.targetNodeId));
  }
}

function summarize(arm: ArmId) {
  const results = resolutions[arm];
  const successAt1 = results.filter((result) => result.firstHit).length;
  const ambiguous = results.filter((result) => !result.firstUnique).length;
  const wrongTarget = results.filter((result) => result.wrongTargetId !== null).length;
  return {
    arm,
    successAt1,
    successAt1Rate: +(successAt1 / results.length).toFixed(3),
    ambiguityRate: +(ambiguous / results.length).toFixed(3),
    wrongTargetRate: +(wrongTarget / results.length).toFixed(3),
    meanAttempts: +(results.reduce((sum, result) => sum + result.attempts, 0) / results.length).toFixed(2),
  };
}

const report = {
  suite: 'testable-ui/kpi-lab/agent@1',
  agentCommand: command,
  taskCount: tasks.length,
  modelNodeCount: model.length,
  arms: { with: summarize('with'), without: summarize('without') },
};
const out = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'report');
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, 'agent-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
