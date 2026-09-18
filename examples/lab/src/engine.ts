/**
 * engine.ts — the deterministic core the lab measures.
 *
 * It mirrors, mechanically, the exact role-signal ladder the @testable-ui
 * engine uses at build time (and that an LLM test-agent walks at PROMPT time):
 *
 *     ROLE_SIGNAL_PRIORITY: predict the element's semantic role from its
 *     accessible-name source in priority order —
 *       aria-labelledby → aria-label → <label> → title → text → inputType →
 *       placeholder → handlerName
 *
 * Two ARMS, one engine, one corpus. The ONLY difference between arms is
 * whether the engine injected its deterministic `data-testid` at build time
 * ("with") or did not ("without"). Every locator the agent proposes is ranked
 * the SAME way (ladder order). The resolver then walks the corpus' real DOM
 * (a barrier-faithful model of the site's built DOM, incl. equivocal siblings)
 * and records, per task: did the FIRST-choice locator hit the unique correct
 * target (success@1)? was the match ambiguous? did it land on the wrong
 * sibling (wrong-target)? how many attempts until a correct+unique resolve?
 *
 * Because everything here is pure + deterministic, the lab is reproducible on
 * any machine and in CI — there are no LLM calls, no browser, no flake. The
 * parity between the two arms' KPI deltas is what the published report proves,
 * and it is attributable to testable-ui because ONLY the injected attribute
 * changed between arms.
 */
import type {
  ElementSignals,
  CorpusElement,
} from './corpus.js';

/**
 * Arm identity — 'with' = deterministic data-testid present;
 * 'without' = same DOM/signals, no data-testid (agent falls back to the
 * accessible-name ladder alone).
 */
export type ArmId = 'with' | 'without';

/** A resolved node inside one arm's DOM model. */
export interface ArmNode {
  nodeId: number;
  signals: ElementSignals;
  testId: string;
  hasTestId: boolean;
}

/** The DOM model one arm proposes against. */
export interface ArmContext {
  arm: ArmId;
  nodes: ArmNode[];
}

/** One task's resolution: how the FIRST locator and each subsequent one did. */
export interface Resolution {
  /** Did the agent's FIRST proposed locator hit the single correct node? */
  firstHit: boolean;
  /** Did that first locator resolve to exactly ONE node (unambiguous)? */
  firstUnique: boolean;
  /** Total attempts (proposed locators) until the first correct+unique match. */
  attempts: number;
  /** 0 = correct target, else the nodeId it wrongly hit at any attempt. */
  wrongTargetId: number | null;
  /** True if any proposed locator matched more than one node. */
  ambiguousEver: boolean;
}

/** Per-arm KPI result — the numbers the report + CI gates consume. */
export interface ArmResult {
  arm: ArmId;
  successAt1: number; // tasks where first locator → correct+unique
  successAt1Rate: number;
  ambiguityRate: number; // tasks where first locator matched >1 node
  wrongTargetRate: number; // tasks that ever resolved onto the wrong sibling
  meanAttempts: number;
  medianAttempts: number;
  deterministicPct: number; // 1.0 by construction (pure engine)
  editStablePct: number; // KPI_SUITE stability gate parity
  kpiPassed: number;
  kpiTotal: number;
  kpiPassRate: number;
}

export interface KpiCheck {
  arm: ArmId;
  kind: 'stability' | 'parity';
  passed: boolean;
  label: string;
}

/**
 * The role-signal ladder — the contract that names elements. Mirrors
 * mobile/TOOLS naming order, expressed as the signal fields consulted in
 * priority order when deriving an element's understand semantics.
 */
export const ROLE_SIGNAL_PRIORITY = [
  'componentName',
  'elementType',
  'fileName',
  'ariaLabelledby',
  'ariaLabel',
  'label',
  'title',
  'text',
  'inputType',
  'placeholder',
  'handlerName',
] as const;

type SignalKey = (typeof ROLE_SIGNAL_PRIORITY)[number];

/** Build both arms from the corpus (same elements, same DOM, only the
 *  injected attribute differs). The engine joins ground-truth target ids
 *  from the corpus' own `testId` fields — parity, not hand-modeling. */
export function buildArms(corpus: CorpusElement[]): Record<ArmId, ArmContext> {
  const mkArm = (arm: ArmId): ArmContext => ({
    arm,
    nodes: corpus.map((c, i) => ({
      nodeId: i,
      signals: c.signals,
      testId: arm === 'with' ? (c.testId || '') : '', // deterministic id only in the with-arm
      hasTestId: arm === 'with' && !!c.testId,
    })),
  });
  return { with: mkArm('with'), without: mkArm('without') };
}

/** A candidate locator an agent might propose. Order in the array is the
 *  agent's preference (its "first choice" is index 0). */
export type ProposedLocator =
  | { kind: 'attr'; testId: string }
  | { kind: 'role'; role: string; name: string }
  | { kind: 'ariaLabelledby'; name: string }
  | { kind: 'ariaLabel'; name: string }
  | { kind: 'label'; name: string }
  | { kind: 'title'; name: string }
  | { kind: 'text'; name: string }
  | { kind: 'inputType'; type: string }
  | { kind: 'placeholder'; text: string }
  | { kind: 'handler'; name: string };

function orals(s: ElementSignals): Record<SignalKey, string> {
  return {
    componentName: s.componentName ?? '',
    elementType: s.elementType ?? '',
    fileName: s.fileName ?? '',
    ariaLabelledby: s.ariaLabelledby ?? '',
    ariaLabel: s.ariaLabel ?? '',
    label: s.label ?? '',
    title: s.title ?? '',
    text: s.text ?? '',
    inputType: s.inputType ?? '',
    placeholder: s.placeholder ?? '',
    handlerName: s.handlerName ?? '',
  };
}

/**
 * proposeLocators — the agent's proposal function, mirroring how an LLM
 * test-agent builds a Playwright locator from a task instruction: it walks
 * the ROLE_SIGNAL_PRIORITY ladder and emits ONE candidate per available
 * signal (role+name first, then aria/label/title/text/inputType/placeholder/
 * handler), in priority order. The engine's injected `data-testid` is simply
 * a first, highest-priority candidate in the WITH arm — which is EXACTLY the
 * "deterministic semantic id" the thesis claims short-circuits the ladder.
 */
export function proposeLocators(
  signals: ElementSignals,
  arm: ArmId,
  testId?: string,
): ProposedLocator[] {
  const s = orals(signals);
  const out: ProposedLocator[] = [];

  if (arm === 'with' && testId) {
    out.push({ kind: 'attr', testId });
  }

  if (s.ariaLabelledby) out.push({ kind: 'ariaLabelledby', name: s.ariaLabelledby });
  if (s.ariaLabel) out.push({ kind: 'ariaLabel', name: s.ariaLabel });
  if (s.label) out.push({ kind: 'label', name: s.label });
  if (s.title) out.push({ kind: 'title', name: s.title });
  if (s.text) out.push({ kind: 'text', name: s.text });
  if (s.inputType) out.push({ kind: 'inputType', type: s.inputType });
  if (s.placeholder) out.push({ kind: 'placeholder', text: s.placeholder });
  if (s.handlerName) out.push({ kind: 'handler', name: s.handlerName });

  // Role+name is the agent's semantic anchor. It is first without an id and
  // follows the injected attribute in the with arm.
  const roleLoc = buildRoleLocator(s);
  if (roleLoc) out.splice(arm === 'with' && testId ? 1 : 0, 0, roleLoc);
  return out;
}

function buildRoleLocator(
  s: Record<SignalKey, string>,
): ProposedLocator | null {
  const name = accessibleName(s);
  if (!name) return null;
  return { kind: 'role', role: s.elementType || 'generic', name };
}

/** Resolve every proposed locator against the modeled DOM. */
export function resolveLocators(
  context: ArmContext,
  locators: ProposedLocator[],
  targetNodeId: number,
): Resolution {
  let firstHit = false;
  let firstUnique = false;
  let ambiguousEver = false;
  let attempts = 0;
  let wrongTargetId: number | null = null;

  for (const locator of locators) {
    attempts += 1;
    const matches = context.nodes.filter((node) => matchesLocator(node, locator));
    const unique = matches.length === 1;

    if (attempts === 1) {
      firstUnique = unique;
      firstHit = unique && matches[0]?.nodeId === targetNodeId;
    }
    if (matches.length > 1) ambiguousEver = true;
    if (unique && matches[0].nodeId !== targetNodeId && wrongTargetId === null) {
      wrongTargetId = matches[0].nodeId;
    }
    if (unique && matches[0].nodeId === targetNodeId) break;
  }

  return { firstHit, firstUnique, attempts, wrongTargetId, ambiguousEver };
}

function matchesLocator(node: ArmNode, locator: ProposedLocator): boolean {
  const signals = orals(node.signals);
  switch (locator.kind) {
    case 'attr':
      return node.hasTestId && node.testId === locator.testId;
    case 'role':
      return signals.elementType === locator.role && accessibleName(signals) === locator.name;
    case 'ariaLabelledby':
      return signals.ariaLabelledby === locator.name;
    case 'ariaLabel':
      return signals.ariaLabel === locator.name;
    case 'label':
      return signals.label === locator.name;
    case 'title':
      return signals.title === locator.name;
    case 'text':
      return signals.text === locator.name;
    case 'inputType':
      return signals.inputType === locator.type;
    case 'placeholder':
      return signals.placeholder === locator.text;
    case 'handler':
      return signals.handlerName === locator.name;
  }
}

function accessibleName(s: Record<SignalKey, string>): string {
  return s.ariaLabelledby || s.ariaLabel || s.label || s.title || s.text || s.placeholder || s.handlerName;
}
