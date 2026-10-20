/**
 * Creates the platform's Auth users and their profiles using the Supabase Admin API.
 * Run only on your computer/server; never expose SUPABASE_SERVICE_ROLE_KEY to Vite.
 *
 * Required environment variables:
 *   SUPABASE_URL=https://<project-ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<a newly-rotated secret key>
 *   ADMIN_EMAIL=your-real-email@example.com
 *   INITIAL_PASSWORD=<temporary strong password, at least 12 characters>
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_EMAIL', 'INITIAL_PASSWORD'];
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}. Put it in a local .env file, never .env.local for Vite.`);
if (process.env.INITIAL_PASSWORD.length < 12) throw new Error('INITIAL_PASSWORD must contain at least 12 characters.');

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const employees = [
  ['GEO-001','dr.badawy','Dr. Mohamed Badawy','CEO','ceo','executive','m.badawy@geoinformatics.com',null],
  ['GEO-002','eng.omar','Eng. Mohamed Omar','Co-Founder','co_founder','executive','m.omar@geoinformatics.com',null],
  ['GEO-003','dr.ghada','Dr. Ghada','Co-Founder','co_founder','executive','dr.ghada@geoinformatics.com',null],
  ['GEO-004','amr.soghayar','Amr El Soghayar','Administrative Manager','admin_manager','administrative','amr.soghayar@geoinformatics.com',null],
  ['GEO-005','badr.salama','Eng. Badr El Din Salama','Technical Manager','tech_manager','technical','badr.salama@geoinformatics.com',null],
  ['GEO-006','saad.barghouth','Eng. Saad Barghouth','GIS Manager','gis_manager','gis','saad.barghouth@geoinformatics.com',null],
  ['GEO-007','kyrillos.talaat','Eng. Kyrillos Talaat','Training Manager','training_manager','training','kyrillos.talaat@geoinformatics.com',null],
  ['GEO-008','sherif.younes','Eng. Sherif Younes','Remote Sensing Manager','rs_manager','remote_sensing','sherif.younes@geoinformatics.com',null],
  ['GEO-009','ahmed.salah','Eng. Ahmed Salah','Senior Remote Sensing Specialist','senior_specialist','remote_sensing','ahmed.salah@geoinformatics.com','sherif.younes@geoinformatics.com'],
  ['GEO-010','abdelrahman.nassar','Eng. Abdelrahman Nassar','Senior Remote Sensing Specialist','senior_specialist','remote_sensing','abdelrahman.nassar@geoinformatics.com','sherif.younes@geoinformatics.com'],
  ['GEO-011','ahmed.badr','Eng. Ahmed Badr','Remote Sensing Specialist','rs_specialist','remote_sensing','ahmed.badr@geoinformatics.com','sherif.younes@geoinformatics.com'],
  ['GEO-012','mostafa.nasser','Eng. Mostafa Nasser','GIS Specialist','gis_specialist','gis','mostafa.nasser@geoinformatics.com','saad.barghouth@geoinformatics.com'],
  ['GEO-013','youssef.osama','Eng. Youssef Osama','GIS Specialist','gis_specialist','gis','youssef.osama@geoinformatics.com','saad.barghouth@geoinformatics.com'],
  ['GEO-014','abdelrahman.mostafa','Eng. Abdelrahman Mostafa','GIS Specialist','gis_specialist','gis','abdelrahman.mostafa@geoinformatics.com','saad.barghouth@geoinformatics.com'],
  ['GEO-015','ahmed.tammam','Eng. Ahmed Tammam','GIS Specialist','gis_specialist','gis','ahmed.tammam@geoinformatics.com','saad.barghouth@geoinformatics.com'],
  ['GEO-016','mohamed.mokhtar','Eng. Mohamed Mokhtar','GIS Specialist','gis_specialist','gis','mohamed.mokhtar@geoinformatics.com','saad.barghouth@geoinformatics.com'],
  ['GEO-017','adel.ahmed','Adel Ahmed','Administrative Specialist','admin_specialist','administrative','adel.ahmed@geoinformatics.com','amr.soghayar@geoinformatics.com'],
];

// Public employee portraits bundled with the application. Keeping this map in
// provisioning guarantees directory, profile, task and report views all use
// the same image after a fresh database setup.
const avatarByUsername = {
  'dr.badawy': '/assets/employees/dr-mohamed-badawy.png',
  'eng.omar': '/assets/employees/mohamed-omar.png',
  'dr.ghada': '/assets/employees/dr-ghada.png',
  'amr.soghayar': '/assets/employees/amr-el-soghayar.png',
  'badr.salama': '/assets/employees/badr-el-din-salama.png',
  'saad.barghouth': '/assets/employees/saad-barghouth.png',
  'kyrillos.talaat': '/assets/employees/kyrillos-talaat.jpg',
  'sherif.younes': '/assets/employees/sherif-younes.jpg',
  'ahmed.salah': '/assets/employees/ahmed-salah.png',
  'abdelrahman.nassar': '/assets/employees/abdelrahman-nassar.jpg',
  'ahmed.badr': '/assets/employees/ahmed-badr.jpg',
  'mostafa.nasser': '/assets/employees/mostafa-nasser.jpg',
  'youssef.osama': '/assets/employees/youssef-osama.jpg',
  'abdelrahman.mostafa': '/assets/employees/abdelrahman-mostafa.png',
  'ahmed.tammam': '/assets/employees/ahmed-tammam.png',
  'mohamed.mokhtar': '/assets/employees/mohamed-mokhtar.png',
  'adel.ahmed': '/assets/employees/9efc801b-06d5-4d39-81f0-742a21bbae1c.jpg',
};

const userMetadata = ([employeeCode, username, nameEn, jobTitleEn, roleId, departmentId]) => ({
  employee_code: employeeCode, username, name_en: nameEn, name_ar: nameEn,
  job_title_en: jobTitleEn, job_title_ar: jobTitleEn, role_id: roleId, department_id: departmentId,
});

const users = [
  ['GEO-000', 'admin', process.env.ADMIN_NAME || 'Platform Administrator', 'System Administrator', 'sys_admin', 'executive', process.env.ADMIN_EMAIL, null],
  ...employees,
];

for (const row of users) {
  const [employeeCode, username, nameEn, jobTitleEn, roleId, departmentId, email] = row;
  const { error } = await admin.auth.admin.createUser({
    email, password: process.env.INITIAL_PASSWORD, email_confirm: true,
    user_metadata: userMetadata(row),
  });
  // The operation is safely repeatable: existing accounts are left unchanged.
  if (error && !/already been registered|already exists/i.test(error.message)) throw new Error(`${email}: ${error.message}`);
  console.log(error ? `Skipped existing: ${email}` : `Created: ${email} (${roleId})`);
}

// The migration normally creates a profile via an auth.users trigger. Upsert
// profiles here as well so a partially applied migration can be repaired safely.
const { data: authPage, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (authError) throw authError;
const authByEmail = new Map(authPage.users.map((user) => [user.email, user]));
const profileRows = users.map((row) => {
  const [employeeCode, username, nameEn, jobTitleEn, roleId, departmentId, email] = row;
  const authUser = authByEmail.get(email);
  if (!authUser) throw new Error(`Could not find Auth user for ${email}`);
  const metadata = authUser.user_metadata || {};
  return {
    id: authUser.id, employee_code: employeeCode, username,
    name_en: nameEn, name_ar: metadata.name_ar || nameEn,
    email, job_title_en: jobTitleEn, job_title_ar: metadata.job_title_ar || jobTitleEn,
    role_id: roleId, department_id: departmentId, avatar_url: avatarByUsername[username] || null,
    joining_date: new Date().toISOString().slice(0, 10),
  };
});
const { error: profileUpsertError } = await admin.from('profiles').upsert(profileRows, { onConflict: 'id' });
if (profileUpsertError) throw profileUpsertError;

const { data: profiles, error: profilesError } = await admin.from('profiles').select('id,email');
if (profilesError) throw profilesError;
const idByEmail = new Map(profiles.map((profile) => [profile.email, profile.id]));

for (const row of employees) {
  const employeeId = idByEmail.get(row[6]);
  const managerId = row[7] ? idByEmail.get(row[7]) : null;
  if (employeeId && managerId) {
    const { error } = await admin.from('profiles').update({ manager_id: managerId }).eq('id', employeeId);
    if (error) throw error;
  }
}

const balances = profiles.flatMap(({ id }) => [
  { employee_id: id, leave_type: 'annual', entitlement: 21, used: 0, pending: 0, carried_over: 0, unit: 'days' },
  { employee_id: id, leave_type: 'casual', entitlement: 7, used: 0, pending: 0, carried_over: 0, unit: 'days' },
  { employee_id: id, leave_type: 'sick', entitlement: 14, used: 0, pending: 0, carried_over: 0, unit: 'days' },
  { employee_id: id, leave_type: 'emergency', entitlement: 5, used: 0, pending: 0, carried_over: 0, unit: 'days' },
]);
const { error: balancesError } = await admin.from('leave_balances').upsert(balances, { onConflict: 'employee_id,leave_type', ignoreDuplicates: true });
if (balancesError) throw balancesError;
console.log(`Done. ${profiles.length} profiles and their leave balances are ready.`);
