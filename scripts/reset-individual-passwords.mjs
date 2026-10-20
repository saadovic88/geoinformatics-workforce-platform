import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[key]) throw new Error(`Missing ${key}.`);
}
if (process.env.RESET_ALL_PASSWORDS !== 'CONFIRM_COMPANY_PASSWORD_RESET') throw new Error('Explicit reset confirmation is required.');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: profiles, error } = await client.from('profiles').select('id, employee_code, username, name_en, email').eq('status', 'active').order('employee_code');
if (error) throw error;
if (!profiles?.length) throw new Error('No active profiles found; nothing changed.');
const usedNumbers = new Set();
const rows = profiles.map(p => {
  let number;
  do { number = randomInt(100, 1000); } while (usedNumbers.has(number));
  usedNumbers.add(number);
  const name = p.name_en.replace(/\b(?:Dr|Eng|Mr|Mrs|Ms)\.?\s*/gi, '').replace(/[^a-z]/gi, '') || p.username.replace(/[^a-z]/gi, '');
  return { ...p, password: `${name}${number}`, status: 'Pending' };
});
const filename = `private-password-reset-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}.md`;
const contents = () => [
  '# Private company password reset', '',
  'Keep this file private. Pending or failed rows must not be assumed to have changed. Employees should choose their own password after signing in.', '',
  '| Employee | Username | Email | Temporary password | Status |', '| --- | --- | --- | --- | --- |',
  ...rows.map(r => `| ${r.name_en.replaceAll('|', '\\|')} | ${r.username} | ${r.email} | ${r.password} | ${r.status} |`), '',
].join('\n');
await writeFile(filename, contents(), { flag: 'wx', mode: 0o600 });
console.log(`Private recovery file created: ${filename}`);
let failures = 0;
for (const row of rows) {
  try {
    const { error: resetError } = await client.auth.admin.updateUserById(row.id, { password: row.password });
    if (resetError) throw resetError;
    row.status = 'Changed';
  } catch {
    row.status = 'Failed'; failures++;
  }
  await writeFile(filename, contents(), { mode: 0o600 });
}
console.log(`Completed: ${rows.length - failures} changed, ${failures} failed. See the private recovery file.`);
if (failures) process.exitCode = 1;
