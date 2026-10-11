/**
 * Generates a private local login handover file from the current Supabase users.
 * The generated file is deliberately ignored by Git.
 *
 * Run: npm run export:credentials
 */
import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'INITIAL_PASSWORD'];
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
    process.env.INITIAL_PASSWORD,
  ]);

const escapeCell = (value) => String(value ?? '').replaceAll('|', '\\|');
const content = [
  '# Geoinformatics Workforce – Private login credentials',
  '',
  `Generated: ${new Date().toLocaleString('en-GB')}`,
  '',
  '> Private file: do not upload, email, or commit this file. Every password below is the initial shared password from `.env`; reset each user password after first sign-in.',
  '',
  '| Employee code | Name | Username | Email | Role | Initial password |',
  '| --- | --- | --- | --- | --- | --- |',
  ...rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`),
  '',
].join('\n');

await writeFile('private-user-credentials.md', content, 'utf8');
console.log(`Created private-user-credentials.md for ${rows.length} users.`);
