import { execSync } from 'child_process';
import path from 'path';

export default async function globalSetup() {
  const projectRoot = path.resolve(__dirname, '..');
  console.log('\n▶  E2E global setup: seeding database…');
  execSync('pnpm seed:e2e', {
    stdio: 'inherit',
    cwd: projectRoot,
  });
}
