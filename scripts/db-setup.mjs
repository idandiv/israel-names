// One-time / repeatable database setup for NameMatch realtime, run from a terminal:
//   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/db-setup.mjs
// Uses the Supabase Management API over HTTPS (no direct Postgres connection needed):
//   1) runs every SQL file in supabase/migrations (idempotent), 2) enables anonymous sign-ins and turns off e-mail sign-up.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['.env.local', '.env']) {            // tiny .env loader
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || JSON.parse(fs.readFileSync(path.join(root, 'supabase.config.json'), 'utf8')).url;
const ref = new URL(url).hostname.split('.')[0];
if (!token) { console.error('Missing SUPABASE_ACCESS_TOKEN'); process.exit(1); }
const api = async (method, p, body) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}${p}`, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status}: ${text.slice(0, 400)}`);
  try { return JSON.parse(text); } catch { return text; }
};

const dir = path.join(root, 'supabase', 'migrations');
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
  await api('POST', '/database/query', { query: fs.readFileSync(path.join(dir, f), 'utf8') });
  console.log('applied', f);
}
await api('PATCH', '/config/auth', { external_anonymous_users_enabled: true, external_email_enabled: false });
console.log('anonymous sign-ins: enabled, e-mail sign-up: disabled');
const check = await api('POST', '/database/query', { query: `
  select c.relname as table, c.relrowsecurity as rls,
         exists(select 1 from pg_publication_tables p where p.pubname='supabase_realtime' and p.tablename=c.relname) as realtime
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in ('rooms','room_members','swipes') order by 1;` });
console.table(check);
