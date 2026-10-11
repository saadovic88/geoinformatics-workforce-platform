import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { RoleId } from '../../types';
import { Lock, Shield, Check, X, Save } from 'lucide-react';
import { DEFAULT_PERMISSION_MATRIX } from '../../data/seedData';

export const RolesPermissionsView: React.FC = () => {
  const { isFullAccessUser } = useAuth();
  const { t, isRtl } = useLanguage();
  const [matrix, setMatrix] = useState(DEFAULT_PERMISSION_MATRIX);
  const [selectedRole, setSelectedRole] = useState<RoleId>('gis_manager');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const canManage = isFullAccessUser;

  const roles: { id: RoleId; nameEn: string; nameAr: string }[] = [
    { id: 'ceo', nameEn: '1. CEO (Dr. Mohamed Badawy)', nameAr: '1. الرئيس التنفيذي (د. محمد بدوي)' },
    { id: 'co_founder', nameEn: '2. Co-Founder (Eng. Mohamed Omar & Dr. Ghada)', nameAr: '2. المؤسسون المشاركون (م. محمد عمر و د. غادة)' },
    { id: 'admin_manager', nameEn: '3. Administrative Manager (Amr El Soghayar)', nameAr: '3. المدير الإداري (أ. عمرو الصغير)' },
    { id: 'tech_manager', nameEn: '4. Technical Manager (Eng. Badr El Din Salama)', nameAr: '4. المدير التقني (م. بدر الدين سلامة)' },
    { id: 'gis_manager', nameEn: '5. GIS Manager (Eng. Saad Barghouth)', nameAr: '5. مدير نظم المعلومات (م. سعد برغوث)' },
    { id: 'training_manager', nameEn: '6. Training Manager (Eng. Kyrillos Talaat)', nameAr: '6. مدير التدريب والتأهيل (م. كيرلس طلعت)' },
    { id: 'rs_manager', nameEn: '7. Remote Sensing Manager (Eng. Sherif Younes)', nameAr: '7. مدير الاستشعار عن بعد (م. شريف يونس)' },
    { id: 'senior_specialist', nameEn: '8. Senior Specialist (Eng. Ahmed Salah, Eng. Abdelrahman Nassar)', nameAr: '8. أخصائي أول (م. أحمد صلاح، م. عبدالرحمن نصار)' },
    { id: 'gis_specialist', nameEn: '9. GIS Specialist (Eng. Mostafa Nasser, Eng. Youssef Osama, etc.)', nameAr: '9. أخصائي GIS (م. مصطفى ناصر، م. يوسف أسامة)' },
    { id: 'rs_specialist', nameEn: '10. Remote Sensing Specialist (Eng. Ahmed Badr)', nameAr: '10. أخصائي استشعار عن بعد (م. أحمد بدر)' },
    { id: 'admin_specialist', nameEn: '11. Administrative Specialist', nameAr: '11. أخصائي إداري' },
    { id: 'hr_officer', nameEn: '12. HR / Attendance Officer', nameAr: '12. مسؤول الموارد البشرية والحضور' },
    { id: 'sys_admin', nameEn: '13. System Administrator', nameAr: '13. مدير النظام' },
  ];

  const modules = [
    { id: 'dashboard', nameEn: 'Dashboard', nameAr: 'لوحة التحكم' },
    { id: 'attendance', nameEn: 'Attendance & Geofencing', nameAr: 'الحضور والسياج الجغرافي' },
    { id: 'tasks', nameEn: 'Tasks & GIS Projects', nameAr: 'المهام ومشاريع GIS' },
    { id: 'leaves', nameEn: 'Leaves & Approvals', nameAr: 'الإجازات والاعتمادات' },
    { id: 'kpi', nameEn: 'KPI Performance', nameAr: 'مؤشرات الأداء KPI' },
    { id: 'directory', nameEn: 'Employee Directory', nameAr: 'دليل الموظفين' },
    { id: 'settings', nameEn: 'Company Settings', nameAr: 'إعدادات الشركة' },
    { id: 'reports', nameEn: 'Reports Center', nameAr: 'مركز التقارير' },
  ];

  const actions = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'manage'] as const;

  const togglePerm = (modId: string, act: typeof actions[number]) => {
    if (!canManage) return;
    setMatrix((prev) => {
      const currentRoleObj = prev[selectedRole] || {};
      const currentModObj = currentRoleObj[modId] || {
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
        export: false,
        manage: false,
      };

      return {
        ...prev,
        [selectedRole]: {
          ...currentRoleObj,
          [modId]: {
            ...currentModObj,
            [act]: !currentModObj[act],
          },
        },
      };
    });
  };

  const handleSave = () => {
    if (!canManage) return;
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      {!canManage && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">Read-only access. Only the CEO and System Administrator can change role permissions.</div>}
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">{t('roleMatrixTitle')}</h1>
          </div>
          <p className="text-xs text-slate-500">
            {isRtl
              ? 'تكوين مصفوفة الصلاحيات لجميع الأدوار الـ 13: العرض، الإضافة، التعديل، الحذف، الاعتماد، والتصدير.'
              : 'Configurable Role-Based Access Control matrix for all 13 organizational roles.'}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={!canManage}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{t('save')}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{isRtl ? 'تم حفظ وتحديث مصفوفة الصلاحيات بنجاح' : 'Permissions matrix saved successfully.'}</span>
        </div>
      )}

      {/* Role Selection Dropdown / Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {roles.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRole(r.id)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedRole === r.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {isRtl ? r.nameAr : r.nameEn}
          </button>
        ))}
      </div>

      {/* Permissions Matrix Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="font-bold text-slate-900 text-xs">
            {isRtl ? 'تحديد الصلاحيات للدور: ' : 'Configuring Permissions for: '}
            <b className="text-blue-700 uppercase font-mono">{selectedRole.replace('_', ' ')}</b>
          </span>
          <span className="text-[11px] text-slate-400">
            {isRtl ? 'انقر على المربعات لتفعيل أو إلغاء الصلاحية' : 'Click checkboxes to toggle'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3 text-start">{isRtl ? 'الوحدة / النظام' : 'Module'}</th>
                {actions.map((act) => (
                  <th key={act} className="p-3 text-center capitalize">
                    {t(`${act}Perm` as any)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modules.map((mod) => {
                const roleObj = matrix[selectedRole] || {};
                const modPerms = roleObj[mod.id] || {
                  view: false,
                  create: false,
                  edit: false,
                  delete: false,
                  approve: false,
                  export: false,
                  manage: false,
                };

                return (
                  <tr key={mod.id} className="hover:bg-slate-50/70">
                    <td className="p-3 font-bold text-slate-900">{isRtl ? mod.nameAr : mod.nameEn}</td>
                    {actions.map((act) => {
                      const isGranted = !!modPerms[act];
                      return (
                        <td key={act} className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isGranted}
                            onChange={() => togglePerm(mod.id, act)}
                            disabled={!canManage}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
