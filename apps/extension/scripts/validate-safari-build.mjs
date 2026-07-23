import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const root = fileURLToPath(new URL('../dist/safari', import.meta.url));
const fail = (message) => { throw new Error(`Safari build validation failed: ${message}`); };
if (!fs.existsSync(root)) fail('dist/safari is missing');
const manifestPath = path.join(root, 'manifest.json');
if (!fs.existsSync(manifestPath)) fail('manifest.json is missing');
let manifest;
try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { fail('manifest.json is invalid JSON'); }
for (const file of ['background.js', 'content.js', 'popup.html', 'vault.html', 'options.html', 'unlock.html']) {
  if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
}
const referenced = [manifest.action?.default_popup, manifest.options_ui?.page, manifest.background?.service_worker, ...(manifest.content_scripts ?? []).flatMap((entry) => entry.js ?? [])].filter(Boolean);
for (const file of referenced) if (!fs.existsSync(path.join(root, file))) fail(`manifest references missing ${file}`);
if (manifest.content_security_policy?.extension_pages?.includes('http:') || manifest.content_security_policy?.extension_pages?.includes('https:')) fail('CSP allows remote scripts');
const files = [];
const walk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); entry.isDirectory() ? walk(full) : files.push(full); } };
walk(root);
for (const file of files) {
  const text = fs.readFileSync(file);
  const value = text.toString('utf8');
  if (path.basename(file).startsWith('.env') || file.endsWith('.map')) fail(`sensitive artifact copied: ${path.relative(root, file)}`);
  if (/service_role|SUPABASE_SERVICE_ROLE_KEY|localhost:5173|127\.0\.0\.1:5173/i.test(value)) fail(`forbidden development or privileged credential string in ${path.relative(root, file)}`);
}
if (files.some((file) => file.includes(`${path.sep}chrome${path.sep}`) || file.includes(`${path.sep}edge${path.sep}`))) fail('Chrome/Edge files mixed into Safari output');
console.log(`Safari build valid: ${files.length} files`);