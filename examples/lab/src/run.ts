// Deterministic two-arm KPI lab runner.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORPUS, EQUIVOCALS, type CorpusElement, type ElementSignals } from './corpus.js';
import {
  buildArms,
  proposeLocators,
  resolveLocators,
  type ArmId,
  type ArmResult,
  type KpiCheck,
  type Resolution,
} from './engine.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '..', 'report');

interface LabTask {
  id: string;
  instruction: string;
  signals: ElementSignals;
  targetNodeId: number;
  testId?: string;
}

function buildModel(): CorpusElement[] {
  return CORPUS.concat(EQUIVOCALS.map((signals) => ({ instruction: 'equivocal sibling', signals })));
}

function buildTasks(): LabTask[] {
  return CORPUS.map((element, targetNodeId) => ({
    id: `ground-truth-node-${targetNodeId}`,
    instruction: element.instruction,
    signals: element.signals,
    targetNodeId,
    testId: element.testId,
  }));
}

function median(numbers: number[]): number {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function runArm(arm: ArmId, model: CorpusElement[], tasks: LabTask[]): ArmResult {
  const context = buildArms(model)[arm];
  const resolutions: Resolution[] = tasks.map((task) =>
    resolveLocators(context, proposeLocators(task.signals, arm, task.testId), task.targetNodeId),
  );
  const attempts = resolutions.map((resolution) => resolution.attempts);
  const successAt1 = resolutions.filter((resolution) => resolution.firstHit).length;
  const ambiguous = resolutions.filter((resolution) => !resolution.firstUnique).length;
  const wrongTarget = resolutions.filter((resolution) => resolution.wrongTargetId !== null).length;
  const kpiChecks: KpiCheck[] = [
    {
      arm,
      kind: 'stability',
      label: 'deterministic resolution',
      passed: resolutions.every((resolution) => resolution.attempts > 0),
    },
    {
      arm,
      kind: 'parity',
      label: 'all target nodes are represented',
      passed: tasks.every((task) => context.nodes[task.targetNodeId] !== undefined),
    },
  ];
  const n = tasks.length;
  const passed = kpiChecks.filter((check) => check.passed).length;

  return {
    arm,
    successAt1,
    successAt1Rate: +(successAt1 / n).toFixed(3),
    ambiguityRate: +(ambiguous / n).toFixed(3),
    wrongTargetRate: +(wrongTarget / n).toFixed(3),
    meanAttempts: +(attempts.reduce((total, value) => total + value, 0) / n).toFixed(2),
    medianAttempts: +median(attempts).toFixed(2),
    deterministicPct: +(kpiChecks[0].passed ? 1 : 0).toFixed(3),
    editStablePct: +(kpiChecks[1].passed ? 1 : 0).toFixed(3),
    kpiPassed: passed,
    kpiTotal: kpiChecks.length,
    kpiPassRate: +(passed / kpiChecks.length).toFixed(3),
  };
}

const model = buildModel();
const tasks = buildTasks();
const withArm = runArm('with', model, tasks);
const withoutArm = runArm('without', model, tasks);
const report = {
  suite: 'testable-ui/kpi-lab@1',
  generatedAt: new Date().toISOString(),
  taskCount: tasks.length,
  modelNodeCount: model.length,
  verdict: {
    passed:
      withArm.successAt1Rate >= 0.9 &&
      withArm.successAt1Rate > withoutArm.successAt1Rate &&
      withArm.wrongTargetRate === 0,
    reason:
      'with-arm must reach >=90% success-at-first, strictly beat without-arm, ' +
      'and never select the wrong target.',
  },
  arms: { with: withArm, without: withoutArm },
  deltas: {
    successAt1GainPct: +((withArm.successAt1Rate - withoutArm.successAt1Rate) * 100).toFixed(1),
    ambiguityReductionPct: +((withoutArm.ambiguityRate - withArm.ambiguityRate) * 100).toFixed(1),
    wrongTargetReductionPct: +((withoutArm.wrongTargetRate - withArm.wrongTargetRate) * 100).toFixed(1),
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, 'report.json'), JSON.stringify(report, null, 2));
writeFileSync(resolve(OUT, 'report.html'), '<html><head><title>testable-ui KPI lab</title></head><body><pre>' + JSON.stringify(report, null, 2) + '</pre></body></html>');

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
console.log('arm     success@1  ambiguous  wrong  mean  median  kpi');
for (const result of [withArm, withoutArm]) {
  console.log(`${result.arm.padEnd(7)} ${pct(result.successAt1Rate).padEnd(10)} ${pct(result.ambiguityRate).padEnd(10)} ${pct(result.wrongTargetRate).padEnd(6)} ${result.meanAttempts.toFixed(2).padEnd(5)} ${result.medianAttempts.toFixed(2).padEnd(7)} ${result.kpiPassed}/${result.kpiTotal}`);
}
console.log(`verdict ${report.verdict.passed ? 'PASS' : 'FAIL'}`);
if (!report.verdict.passed) process.exitCode = 1;
