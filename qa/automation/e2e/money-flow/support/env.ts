/**
 * Loads the same environment the app uses (.env, then .env.local) so the test process
 * talks to the same database as the running app. Import this before anything that reads
 * process.env.DATABASE_URL (lib/prisma does so at import time).
 */
import { config } from 'dotenv';
import path from 'path';

const root = path.resolve(__dirname, '../../../../..');
config({ path: path.join(root, '.env') });
config({ path: path.join(root, '.env.local'), override: true });

export const ROOT = root;
