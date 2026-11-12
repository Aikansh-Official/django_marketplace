import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const target = process.argv[2];
if (!['client', 'admin'].includes(target)) {
  throw new Error('Choose client or admin: node scripts/build_pages.mjs client');
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = resolve(root, target);
const result = spawnSync(process.platform === 'win32' ? 'cmd.exe' : 'npm',
  process.platform === 'win32' ? ['/d', '/s', '/c', 'npm.cmd run build'] : ['run', 'build'], {
    cwd: app, stdio: 'inherit', env: { ...process.env, VITE_API_BASE_URL: '/api' },
  });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const output = resolve(app, 'dist');
mkdirSync(output, { recursive: true });
copyFileSync(resolve(root, 'deploy/cloudflare/pages-worker.js'), resolve(output, '_worker.js'));
writeFileSync(resolve(output, '_routes.json'), JSON.stringify({ version: 1,
  include: ['/api', '/api/*', '/media', '/media/*'], exclude: [] }, null, 2));
writeFileSync(resolve(output, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n');
console.log(`Pages upload ready: ${output}`);
