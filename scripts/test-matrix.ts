/**
 * Lists every TC-… case id in the test-cases matrix that has no test with that id in its title.
 * Run with: pnpm test:matrix
 */
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
// Node 22+ has glob in fs/promises; this script runs with tsx which uses Node's native glob
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { glob } = require('node:fs/promises') as typeof import('fs/promises') & { glob: (pattern: string, opts: { cwd: string }) => Promise<string[]> };

const MATRIX_DIR = join(process.cwd(), '.scratch', 'fintrack-bd-mvp', 'test-cases');
const TEST_DIRS = [
  join(process.cwd(), 'packages'),
  join(process.cwd(), 'tests'),
  join(process.cwd(), 'components'),
  join(process.cwd(), 'e2e'),
];

async function getMatrixIds(): Promise<{ id: string; file: string; priority: string }[]> {
  const files = await readdir(MATRIX_DIR);
  const ids: { id: string; file: string; priority: string }[] = [];
  for (const file of files) {
    if (!file.endsWith('.md') || file === 'README.md') continue;
    const content = await readFile(join(MATRIX_DIR, file), 'utf-8');
    // Match rows like: | TC-FND-001 | ... | P1 |
    for (const match of content.matchAll(/\|\s*(TC-[A-Z]+-\d+)\s*\|[^|]*\|[^|]*\|[^|]*\|\s*(P\d)\s*\|/g)) {
      ids.push({ id: match[1], file, priority: match[2] });
    }
  }
  return ids;
}

async function getTestedIds(): Promise<Set<string>> {
  const testedIds = new Set<string>();
  for (const dir of TEST_DIRS) {
    try {
      const files = await glob('**/*.test.{ts,tsx}', { cwd: dir });
      for (const file of files) {
        const content = await readFile(join(dir, file), 'utf-8');
        for (const match of content.matchAll(/TC-[A-Z]+-\d+/g)) {
          testedIds.add(match[0]);
        }
      }
    } catch {
      // Directory may not exist yet
    }
  }
  return testedIds;
}

async function main() {
  const matrixIds = await getMatrixIds();
  const testedIds = await getTestedIds();

  const untested = matrixIds.filter(({ id }) => !testedIds.has(id));

  if (untested.length === 0) {
    console.log('✅ All matrix cases have tests.');
    process.exit(0);
  }

  const p1Missing = untested.filter((u) => u.priority === 'P1');
  const p2Missing = untested.filter((u) => u.priority !== 'P1');

  if (p1Missing.length > 0) {
    console.error('❌ Missing tests for P1 cases:');
    for (const { id, file } of p1Missing) {
      console.error(`  ${id}  (${file})`);
    }
  }
  if (p2Missing.length > 0) {
    console.warn('⚠️  Missing tests for non-P1 cases:');
    for (const { id, file, priority } of p2Missing) {
      console.warn(`  ${id} [${priority}]  (${file})`);
    }
  }

  console.log(`\nTotal missing: ${untested.length} (${p1Missing.length} P1, ${p2Missing.length} P2/P3)`);
  if (p1Missing.length > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
