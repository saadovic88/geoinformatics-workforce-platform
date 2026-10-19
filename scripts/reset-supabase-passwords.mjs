/**
 * Resets the password for every active workforce profile through the Supabase
 * Admin API. This is intentionally guarded because it affects company access.
 *
 * Required local .env values:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   INITIAL_PASSWORD (at least 12 characters)
 *
 * Run only after explicitly setting:
 *   RESET_ALL_PASSWORDS=CONFIRM_COMPANY_PASSWORD_RESET
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'INITIAL_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing ${key} in the local .env file.`);
}

if (process.env.INITIAL_PASSWORD.length < 12) {
  throw new Error('INITIAL_PASSWORD must contain at least 12 characters.');
}

if (process.env.RESET_ALL_PASSWORDS !== 'CONFIRM_COMPANY_PASSWORD_RESET') {
  throw new Error(
    'Password reset blocked. Set RESET_ALL_PASSWORDS=CONFIRM_COMPANY_PASSWORD_RESET only when you are ready to reset every active employee account.',
  );
}

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profiles, error: profilesError } = await admin
  .from('profiles')
  .select('id, employee_code, email, name_en')
  .eq('status', 'active')
  .order('employee_code');

if (profilesError) throw profilesError;
if (!profiles?.length) throw new Error('No active workforce profiles were found. Nothing was changed.');

const failures = [];
for (const profile of profiles) {
  const { error } = await admin.auth.admin.updateUserById(profile.id, {
    password: process.env.INITIAL_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    failures.push(`${profile.employee_code} (${profile.email}): ${error.message}`);
  } else {
    console.log(`Password reset: ${profile.employee_code} — ${profile.name_en}`);
  }
}

if (failures.length) {
  throw new Error(`Password reset failed for ${failures.length} account(s):\n${failures.join('\n')}`);
}

const { error: profileUpdateError } = await admin
  .from('profiles')
  .update({ first_login_password_changed: false })
  .in('id', profiles.map((profile) => profile.id));

if (profileUpdateError) throw profileUpdateError;
console.log(`Completed password reset for ${profiles.length} active workforce accounts.`);
