/** Removes test users left behind by an interrupted run before a new run starts. */
import { deleteStaleTestUsers } from './db';

export default async function globalSetup() {
  const n = await deleteStaleTestUsers(60);
  if (n) console.log(`▶  money-flow: removed ${n} stale test user(s)`);
}
