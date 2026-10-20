/**
 * Exports account identifiers only. Supabase passwords cannot be read back,
 * and the script must never pretend the current INITIAL_PASSWORD belongs to
 * every account after employees have changed their passwords.
 *
 * Run: npm run export:credentials
 */
import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing ${key} in .env`);
}

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: authData, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (authError) throw authError;

const { data: profiles, error: profilesError } = await admin
  .from('profiles')
  .select('id, employee_code, username, name_en, role_id, email')
  .order('employee_code');
if (profilesError) throw profilesError;

const authByEmail = new Set(authData.users.map((user) => user.email?.toLowerCase()));
const rows = (profiles ?? [])
  .filter((profile) => authByEmail.has(profile.email.toLowerCase()))
  .map((profile) => [
    profile.employee_code,
    profile.name_en,
    profile.username,
    profile.email,
    profile.role_id,
    'Active — password is private and cannot be exported',
  ]);

const escapeCell = (value) => String(value ?? '').replaceAll('|', '\\|');
const content = [
  '# Geoinformatics Workforce – Private login credentials',
  '',
  `Generated: ${new Date().toLocaleString('en-GB')}`,
  '',
  '> Account inventory only. Passwords are deliberately not exported because Supabase stores them securely and they may have been changed by employees.',
  '',
  '| Employee code | Name | Username | Email | Role | Account status |',
  '| --- | --- | --- | --- | --- | --- |',
  ...rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`),
  '',
].join('\n');

await writeFile('private-user-credentials.md', content, 'utf8');
console.log(`Created private-user-credentials.md for ${rows.length} users.`);
