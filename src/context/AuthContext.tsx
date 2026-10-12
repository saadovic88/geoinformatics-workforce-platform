import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, RoleId } from '../types';
import { INITIAL_USERS, DEFAULT_PERMISSION_MATRIX } from '../data/seedData';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  currentUser: User;
  users: User[];
  /** Used only by the offline local-demo fallback; never rendered with Supabase enabled. */
  setCurrentUser: (user: User) => void;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'manage') => boolean;
  updateUser: (updatedUser: User) => void;
  isAuthenticated: boolean;
  pendingLogoutSummary: boolean;
  setPendingLogoutSummary: (val: boolean) => void;
  completeLogout: () => void;
  isFullAccessUser: boolean;
}

export const FULL_ACCESS_EMAILS = new Set([
  'm.badawy@geoinformatics.com',
  'amr.soghayar@geoinformatics.com',
  'badr.salama@geoinformatics.com',
]);

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function migrateUsersList(existing: User[]): User[] {
  return INITIAL_USERS.map((initUser) => {
    const match = existing.find(
      (u) =>
        u.id === initUser.id ||
        (initUser.id === 'emp_ghada' && (u.id === 'emp_ragab' || u.username === 'dr.ragab')) ||
        (initUser.id === 'emp_salama' && (u.id === 'emp_barfan' || u.username === 'badr.barfan')) ||
        (initUser.id === 'emp_sherif' && (u.username === 'sherif.mostafa' || u.nameEn.includes('Sherif Mostafa'))) ||
        (initUser.id === 'emp_nassar_senior' && (u.id === 'emp_nassar' || u.nameEn === 'Eng. Nassar')) ||
        (initUser.id === 'emp_ahmed_badr' && (u.nameEn.includes('Ahmed Badr El Din') || u.username === 'ahmed.badreldin')) ||
        (initUser.id === 'emp_mostafa_nasser' && (u.id === 'emp_mostafa_nassar' || u.username === 'mostafa.nassar' || u.nameEn.includes('Mostafa Nassar'))) ||
        (initUser.id === 'emp_youssef_osama' && (u.id === 'emp_youssef' || u.username === 'youssef.mohamed' || u.nameEn.includes('Youssef Mohamed'))) ||
        u.employeeCode === initUser.employeeCode
    );

    if (match) {
      return {
        ...match,
        id: initUser.id,
        employeeCode: initUser.employeeCode,
        nameEn: initUser.nameEn,
        nameAr: initUser.nameAr,
        jobTitleEn: initUser.jobTitleEn,
        jobTitleAr: initUser.jobTitleAr,
        departmentId: initUser.departmentId,
        avatarUrl: match.avatarUrl?.startsWith('data:') ? match.avatarUrl : initUser.avatarUrl,
        email: initUser.email,
        phone: initUser.phone,
        username: initUser.username,
      };
    }
    return initUser;
  });
}

type ProfileRow = {
  id: string; employee_code: string; username: string; name_en: string; name_ar: string;
  email: string; phone: string | null; job_title_en: string; job_title_ar: string;
  role_id: RoleId; department_id: User['departmentId']; manager_id: string | null;
  status: User['status']; avatar_url: string | null; joining_date: string | null;
  work_schedule_id: string | null; emergency_contact: User['emergencyContact'] | null;
  last_login_at: string | null; first_login_password_changed: boolean | null;
};

const fromProfile = (profile: ProfileRow): User => ({
  id: profile.id, employeeCode: profile.employee_code, username: profile.username,
  nameEn: profile.name_en, nameAr: profile.name_ar, email: profile.email, phone: profile.phone || '',
  jobTitleEn: profile.job_title_en, jobTitleAr: profile.job_title_ar, roleId: profile.role_id,
  departmentId: profile.department_id, managerId: profile.manager_id || undefined, status: profile.status,
  avatarUrl: profile.avatar_url || '', joiningDate: profile.joining_date || '',
  workScheduleId: profile.work_schedule_id || '', emergencyContact: profile.emergency_contact || { name: '', relationship: '', phone: '' },
  lastLogin: profile.last_login_at || undefined, firstLoginPasswordChanged: profile.first_login_password_changed || false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    if (supabase) return [];
    const saved = localStorage.getItem('geo_users_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return migrateUsersList(parsed);
        }
      } catch (e) {
        console.error('Failed to parse saved users', e);
      }
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUserState] = useState<User>(() => {
    const savedUserId = localStorage.getItem('geo_current_user_id');
    const effectiveId =
      savedUserId === 'emp_ragab'
        ? 'emp_ghada'
        : savedUserId === 'emp_barfan'
        ? 'emp_salama'
        : savedUserId === 'emp_mostafa_nassar'
        ? 'emp_mostafa_nasser'
        : savedUserId === 'emp_youssef'
        ? 'emp_youssef_osama'
        : savedUserId === 'emp_adel'
        ? 'emp_badawy'
        : savedUserId;

    const matched = users.find((u) => u.id === effectiveId);
    return matched || users[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !supabase && localStorage.getItem('geo_is_authenticated') !== 'false');

  const [pendingLogoutSummary, setPendingLogoutSummary] = useState(false);
  // Company-wide access is deliberately limited to the three named leaders.
  // A technical system administrator does not automatically receive HR/KPI data.
  const isFullAccessUser = FULL_ACCESS_EMAILS.has(currentUser?.email?.toLowerCase());

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let alive = true;
    const loadSession = async () => {
      const { data: { session } } = await client.auth.getSession();
      if (!session || !alive) return;
      const [{ data: profile }, { data: directory }] = await Promise.all([
        client.from('profiles').select('*').eq('id', session.user.id).single(),
        client.from('profiles').select('*').order('name_en'),
      ]);
      if (!alive || !profile) return;
      setCurrentUserState(fromProfile(profile as ProfileRow));
      setUsers((directory || []).map((row) => fromProfile(row as ProfileRow)));
      setIsAuthenticated(true);
    };
    loadSession();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!session) setIsAuthenticated(false);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (supabase) return;
    localStorage.setItem('geo_users_data', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('geo_current_user_id', currentUser.id);
    }
  }, [currentUser]);

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    setIsAuthenticated(true);
    localStorage.setItem('geo_is_authenticated', 'true');
  };

  const login = async (usernameOrEmail: string, pass: string): Promise<boolean> => {
    if (supabase) {
      // Supabase Auth signs in with an email. Anonymous clients cannot query
      // profiles directly under RLS, so the narrowly-scoped RPC resolves a
      // username or employee code without exposing the profiles table.
      const identity = usernameOrEmail.trim();
      const isEmail = identity.includes('@');
      const { data: resolvedEmail, error: resolveError } = isEmail
        ? { data: identity, error: null }
        : await supabase.rpc('resolve_login_email', { identity_input: identity });
      if (resolveError || !resolvedEmail) return false;
      const email = resolvedEmail;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error || !data.user) return false;
      const [{ data: profile }, { data: directory }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', data.user.id).single(),
        supabase.from('profiles').select('*').order('name_en'),
      ]);
      if (!profile) return false;
      const mapped = fromProfile(profile as ProfileRow);
      setCurrentUser(mapped);
      setUsers((directory || []).map((row) => fromProfile(row as ProfileRow)));
      await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id);
      return true;
    }
    const clean = usernameOrEmail.trim().toLowerCase();
    const found = users.find(
      (u) =>
        u.username.toLowerCase() === clean ||
        u.email.toLowerCase() === clean ||
        u.employeeCode.toLowerCase() === clean
    );
    if (found) {
      setCurrentUser(found);
      return true;
    }
    return false;
  };

  const logout = () => {
    // Triggers daily summary modal first if needed
    setPendingLogoutSummary(true);
  };

  const completeLogout = () => {
    setPendingLogoutSummary(false);
    setIsAuthenticated(false);
    localStorage.setItem('geo_is_authenticated', 'false');
    if (supabase) void supabase.auth.signOut();
  };

  const hasPermission = (
    module: string,
    action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'manage'
  ): boolean => {
    if (!currentUser) return false;
    if (isFullAccessUser) return true;

    const rolePerms = DEFAULT_PERMISSION_MATRIX[currentUser.roleId];
    // An unknown role or module must never silently gain access. This keeps the
    // client-side affordances aligned with the database policy model.
    if (!rolePerms) return false;

    const modPerms = rolePerms[module];
    if (!modPerms) return false;

    return !!modPerms[action];
  };

  const updateUser = (updatedUser: User) => {
    if (!isFullAccessUser) return;
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser.id === updatedUser.id) {
      setCurrentUserState(updatedUser);
    }
    if (supabase) {
      void supabase.from('profiles').update({
        phone: updatedUser.phone, avatar_url: updatedUser.avatarUrl, job_title_en: updatedUser.jobTitleEn,
        job_title_ar: updatedUser.jobTitleAr, department_id: updatedUser.departmentId,
        role_id: updatedUser.roleId, manager_id: updatedUser.managerId || null,
        emergency_contact: updatedUser.emergencyContact,
      }).eq('id', updatedUser.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        setCurrentUser,
        login,
        logout,
        hasPermission,
        updateUser,
        isAuthenticated,
        pendingLogoutSummary,
        setPendingLogoutSummary,
        completeLogout,
        isFullAccessUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
