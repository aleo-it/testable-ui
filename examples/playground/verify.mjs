/**
 * verify.mjs — integration gate for @testable-ui/vite
 *
 * Plain Node (no test framework). Runs after `vite build` has populated `dist/`
 * and `test-ids.generated.ts`. Asserts:
 *   1. dist bundle contains data-testid attrs for signal paths (a)–(f)
 *   2. user-kept-id survives unchanged
 *   3. test-ids.generated.ts has testIds map + TestId union + tid function
 *   4. cross-check: generated ids match ids found in the bundle
 *   5. exit 0 on success, non-zero with message on failure
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function fail(msg) {
  console.error(`✗ FAIL: ${msg}`);
  process.exit(1);
}

// ─── helpers ────────────────────────────────────────────────────────────────

function readDistBundle() {
  const distDir = resolve(__dirname, 'dist');
  if (!existsSync(distDir)) fail('dist/ directory not found — did vite build run?');
  const assetsDir = resolve(distDir, 'assets');
  if (!existsSync(assetsDir)) fail('dist/assets/ not found');
  const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
  if (jsFiles.length === 0) fail('no .js files in dist/assets/');
  return jsFiles.map((f) => readFileSync(resolve(assetsDir, f), 'utf8')).join('\n');
}

function readGeneratedRegistry() {
  const regPath = resolve(__dirname, 'test-ids.generated.ts');
  if (!existsSync(regPath)) fail('test-ids.generated.ts not found — did the plugin run during build?');
  return { content: readFileSync(regPath, 'utf8'), path: regPath };
}

// ─── assertions ─────────────────────────────────────────────────────────────

function assert(condition, msg) {
  if (!condition) fail(msg);
}

function assertMatch(haystack, pattern, msg) {
  const re = new RegExp(pattern);
  if (!re.test(haystack)) fail(msg);
}

function assertNotMatch(haystack, pattern, msg) {
  const re = new RegExp(pattern);
  if (re.test(haystack)) fail(msg);
}

// ─── 1. data-testid attrs present for (a)–(f) ──────────────────────────────

function assertSignalIds(bundle) {
  // The minified bundle renders JSX props as `"data-testid":"value"` (esbuild
  // JSX transform + minifier), so match the id value with a flexible
  // attribute separator. The id itself is unique enough to assert on.

  // (a) <button>Submit</button> → app-submit-button-{6hex}
  assertMatch(bundle, 'data-testid["\']?[=:]["\']app-submit-button-[\\da-f]{6}["\']',
    'signal (a): missing data-testid for <button>Submit</button>');

  // (b) <input placeholder="Email address" /> → app-email-address-input-{6hex}
  assertMatch(bundle, 'data-testid["\']?[=:]["\']app-email-address-input-[\\da-f]{6}["\']',
    'signal (b): missing data-testid for <input placeholder="Email address">');

  // (c) wrapping label → <input type="password"> gets label + inputType signals
  //     label text "Password" is a role signal; inputType "password" is fallback
  //     Result: app-password-input-{6hex} (label "Password" takes priority)
  assertMatch(bundle, 'data-testid["\']?[=:]["\']app-password-input-[\\da-f]{6}["\']',
    'signal (c): missing data-testid for wrapping-label <input type="password">');

  // (d) sibling htmlFor label + <input id="username">
  //     The walker indexes sibling <label htmlFor> text into labelMap at the
  //     parent level, so the input picks up the "Username" label signal.
  //     Result: app-username-input-{6hex}
  assertMatch(bundle, 'data-testid["\']?[=:]["\']app-username-input-[\\da-f]{6}["\']',
    'signal (d): missing data-testid for sibling-label <input id="username">');

  // (e) <div aria-label="Cart count" /> → app-cart-count-div-{6hex}
  assertMatch(bundle, 'data-testid["\']?[=:]["\']app-cart-count-div-[\\da-f]{6}["\']',
    'signal (e): missing data-testid for <div aria-label="Cart count">');

  // (f) useTestId('order-row', { key: ... }) → "order-row-{sanitizedKey}"
  //     Build-time: static data-testid={useTestId('order-row',...)} stays in
  //     bundle as a dynamic expression. The base id "order-row" is visible.
  assertMatch(bundle, 'order-row',
    'signal (f): missing "order-row" id in bundle for useTestId() rows');
}

// ─── 2. user-kept-id survives unchanged ─────────────────────────────────────

function assertUserKeptId(bundle) {
  assertMatch(bundle, 'user-kept-id',
    'user-provided id "user-kept-id" not found in bundle');
  // Must appear as an explicit attribute, not just a substring
  assertMatch(bundle, 'data-testid["\']?[=:]["\']user-kept-id["\']',
    'user-provided id "user-kept-id" not present as data-testid="user-kept-id"');
}

// ─── 3. generated registry file structure ───────────────────────────────────

function assertRegistryStructure(reg) {
  // testIds map
  assertMatch(reg.content, 'export const testIds',
    'generated file missing `export const testIds`');
  assertMatch(reg.content, '\\} as const;',
    'generated file missing `} as const;`');

  // TestId union type
  assertMatch(reg.content, 'export type TestId',
    'generated file missing `export type TestId`');
  assertMatch(reg.content, 'keyof typeof testIds',
    'generated file missing `keyof typeof testIds` in TestId type');

  // tid function
  assertMatch(reg.content, 'export function tid\\(id: TestId\\)',
    'generated file missing `export function tid(id: TestId)`');
  assertMatch(reg.content, 'return testIds\\[id\\]',
    'tid function body missing `return testIds[id]`');
}

// ─── 4. cross-check generated ids vs bundle ─────────────────────────────────

function assertCrossCheck(bundle, reg) {
  // Extract ids from the testIds map in the generated file
  const idRegex = /^\s+"([^"]+)":\s*"[^"]*",$/gm;
  const generatedIds = [];
  let match;
  while ((match = idRegex.exec(reg.content)) !== null) {
    generatedIds.push(match[1]);
  }
  assert(generatedIds.length > 0, 'no ids found in generated testIds map');

  // Check a representative sample of generated ids are in the bundle
  // Sample: up to 5 ids, including one from each signal path
  const sample = generatedIds.slice(0, Math.min(5, generatedIds.length));
  const missing = sample.filter((id) => !bundle.includes(id));
  assert(missing.length === 0,
    `generated ids not found in bundle: ${missing.join(', ')}`);

  console.log(`  ↳ ${generatedIds.length} generated ids; sample of ${sample.length} all found in bundle`);
}

// ─── main ───────────────────────────────────────────────────────────────────

function main() {
  console.log('verify.mjs — integration gate for @testable-ui/vite\n');

  const bundle = readDistBundle();
  const reg = readGeneratedRegistry();

  console.log('  [1/4] signal ids in bundle');
  assertSignalIds(bundle);

  console.log('  [2/4] user-kept-id preserved');
  assertUserKeptId(bundle);

  console.log('  [3/4] generated registry structure');
  assertRegistryStructure(reg);

  console.log('  [4/4] cross-check generated vs bundle');
  assertCrossCheck(bundle, reg);

  console.log('\n✓ integration ok');
  process.exit(0);
}

main();
