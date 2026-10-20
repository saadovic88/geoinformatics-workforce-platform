// One-off provisioning: never changes an existing employee or password.
import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing Supabase server credentials.');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: conflicts, error: conflictError } = await client.from('profiles').select('id').or('username.eq.adel.ahmed,email.eq.adel.ahmed@geoinformatics.com,employee_code.eq.GEO-017');
if (conflictError) throw conflictError;
if (conflicts?.length) throw new Error('Employee code, username, or email already exists. Nothing changed.');
const { data: manager, error: managerError } = await client.from('profiles').select('id').eq('email', 'amr.soghayar@geoinformatics.com').single();
if (managerError || !manager) throw new Error('The administrative manager could not be found. Nothing changed.');
const filename = process.env.ADEL_RECOVERY_FILE || `private-password-reset-adel-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}.md`;
const password = process.env.ADEL_RECOVERY_FILE ? (await readFile(filename, 'utf8')).match(/^Temporary password: (.+)$/m)?.[1] : `AdelAhmed${randomInt(100, 1000)}`;
if (!password) throw new Error('Recovery file does not contain the temporary password.');
if (!process.env.ADEL_RECOVERY_FILE) await writeFile(filename, `# Private temporary login\n\nAccount: adel.ahmed\nEmail: adel.ahmed@geoinformatics.com\nTemporary password: ${password}\n\nStatus: Pending; do not use until provisioning succeeds.\n`, { flag: 'wx', mode: 0o600 });
console.log(`Private recovery file: ${filename}`);
const metadata = { employee_code: 'GEO-017', username: 'adel.ahmed', name_en: 'Adel Ahmed', name_ar: 'عادل أحمد', job_title_en: 'Administrative Specialist', job_title_ar: 'أخصائي إداري', role_id: 'admin_specialist', department_id: 'administrative' };
let data;
if (process.env.ADEL_RECOVERY_FILE) {
  const result = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (result.error) throw result.error;
  const user = result.data.users.find(u => u.email === 'adel.ahmed@geoinformatics.com' && u.user_metadata?.employee_code === 'GEO-017');
  if (!user) throw new Error('Matching partially created account not found.');
  data = { user };
} else {
  const result = await client.auth.admin.createUser({
  email: 'adel.ahmed@geoinformatics.com', password, email_confirm: true,
  user_metadata: metadata,
  });
  if (result.error || !result.data.user) throw result.error || new Error('Account creation failed.');
  data = result.data;
}
const { error: profileError } = await client.from('profiles').upsert({ id: data.user.id, ...metadata, email: 'adel.ahmed@geoinformatics.com', manager_id: manager.id, avatar_url: '/assets/employees/9efc801b-06d5-4d39-81f0-742a21bbae1c.jpg', joining_date: null }, { onConflict: 'id' });
if (profileError) throw profileError;
const { error: balanceError } = await client.from('leave_balances').insert([
  { employee_id: data.user.id, leave_type: 'annual', entitlement: 21, used: 0, pending: 0, carried_over: 0, unit: 'days' },
  { employee_id: data.user.id, leave_type: 'casual', entitlement: 7, used: 0, pending: 0, carried_over: 0, unit: 'days' },
  { employee_id: data.user.id, leave_type: 'sick', entitlement: 14, used: 0, pending: 0, carried_over: 0, unit: 'days' },
  { employee_id: data.user.id, leave_type: 'emergency', entitlement: 5, used: 0, pending: 0, carried_over: 0, unit: 'days' },
]);
if (balanceError) throw balanceError;
await writeFile(filename, `# Private temporary login\n\nAccount: adel.ahmed\nEmail: adel.ahmed@geoinformatics.com\nTemporary password: ${password}\n\nStatus: Created. Please change this password after signing in.\n`, { mode: 0o600 });
console.log('Account, profile, manager and default leave balances created.');
