import { readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const request = JSON.parse(readFileSync(0, 'utf8'));
const outputFile = join(tmpdir(), `testable-ui-codex-${process.pid}-${Date.now()}.json`);
const prompt = `
You are evaluating a UI locator task. Return ONLY valid JSON in this exact shape:
{"locators":[{"kind":"attr","testId":"..."}]}

Allowed locator kinds:
- attr: { kind, testId }
- role: { kind, role, name }
- ariaLabelledby: { kind, name }
- ariaLabel: { kind, name }
- label: { kind, name }
- title: { kind, name }
- text: { kind, name }
- inputType: { kind, type }
- placeholder: { kind, text }
- handler: { kind, name }

Choose one or more candidates for the requested element. Prefer a generated
test id when one is present. Otherwise use the strongest semantic locator.
Do not invent a target node id, and do not include markdown.

Request:
${JSON.stringify(request)}
`;

const result = spawnSync('codex', [
  'exec',
  '--ephemeral',
  '--skip-git-repo-check',
  '--sandbox',
  'read-only',
  '--output-last-message',
  outputFile,
  '-',
], { input: prompt, encoding: 'utf8' });

try {
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `codex exited with ${result.status}`);
  }
  const answer = readFileSync(outputFile, 'utf8').trim().replace(/^```json\s*|\s*```$/g, '');
  JSON.parse(answer);
  process.stdout.write(answer);
} finally {
  try { unlinkSync(outputFile); } catch {}
}
