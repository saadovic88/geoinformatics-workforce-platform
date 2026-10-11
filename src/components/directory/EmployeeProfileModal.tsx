import React, { useState } from 'react';
import { User, LeaveBalance } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  X,
  User as UserIcon,
  Shield,
  Clock,
  Wallet,
  CheckSquare,
  Award,
  FileText,
  History,
  Phone,
  Mail,
  Calendar,
  Building,
  CheckCircle,
  AlertCircle,
  Download,
  Printer,
  Camera,
} from 'lucide-react';
import { exportIndividualEmployeeDossierCSV, triggerPrintReport } from '../../utils/exportUtils';
import { UserAvatar } from '../common/UserAvatar';

interface EmployeeProfileModalProps {
  user: User | null;
  onClose: () => void;
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({ user, onClose }) => {
  const { attendanceRecords, leaveBalances, leaveRequests, tasks, kpiRecords, auditLogs } = useData();
  const { currentUser, updateUser, isFullAccessUser } = useAuth();
  const { t, isRtl } = useLanguage();

  const [activeTab, setActiveTab] = useState<
    'personal' | 'permissions' | 'attendance' | 'leaves' | 'tasks' | 'kpi' | 'documents' | 'activity'
  >('personal');

  // Editable fields state for HR/Admin
  const canEdit = isFullAccessUser || currentUser.roleId === 'admin_manager' || currentUser.id === user?.id;
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          updateUser({ ...user, avatarUrl: dataUrl });
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 2500);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const userAttendance = attendanceRecords.filter((r) => r.employeeId === user.id);
  const userBalances = leaveBalances.filter((b) => b.employeeId === user.id);
  const userLeaves = leaveRequests.filter((r) => r.employeeId === user.id);
  const userTasks = tasks.filter((t) => t.assigneeIds.includes(user.id));
  const userKpi = kpiRecords.find((k) => k.employeeId === user.id && k.month === 9);
  const userLogs = auditLogs.filter((a) => a.userId === user.id);

  const handleSaveProfile = () => {
    updateUser({
      ...user,
      phone,
      email,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const tabs = [
    { id: 'personal', label: isRtl ? 'المعلومات الشخصية والوظيفية' : 'Personal & Employment', icon: UserIcon },
    { id: 'permissions', label: isRtl ? 'الصلاحيات والنظام' : 'Role & Permissions', icon: Shield },
    { id: 'attendance', label: isRtl ? 'الحضور والانصراف' : 'Attendance Summary', icon: Clock },
    { id: 'leaves', label: isRtl ? 'أرصدة الإجازات' : 'Leave Balances', icon: Wallet },
    { id: 'tasks', label: isRtl ? 'المهام ومشاريع GIS' : 'Tasks & Deliverables', icon: CheckSquare },
    { id: 'kpi', label: isRtl ? 'تقييم الأداء KPI' : 'KPI Performance', icon: Award },
    { id: 'documents', label: isRtl ? 'المستندات والمرفقات' : 'Documents', icon: FileText },
    { id: 'activity', label: isRtl ? 'سجل العمليات' : 'Activity Logs', icon: History },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <UserAvatar
                src={user.avatarUrl}
                name={isRtl ? user.nameAr : user.nameEn}
                size="xl"
                rounded="2xl"
                className="border-2 border-white/20 shadow-md"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title={isRtl ? 'رفع / تغيير صورة الموظف' : 'Upload / Change photo'}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg border-2 border-slate-900 transition flex items-center justify-center cursor-pointer group-hover:scale-105"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {isRtl ? user.nameAr : user.nameEn}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-xs font-mono font-bold border border-blue-400/30">
                  {user.employeeCode}
                </span>
              </div>
              <p className="text-xs text-blue-200">
                {isRtl ? user.jobTitleAr : user.jobTitleEn} • {user.departmentId.toUpperCase()}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 text-[11px] text-blue-300 hover:text-white flex items-center gap-1.5 transition underline underline-offset-2"
              >
                <Camera className="w-3 h-3" />
                <span>{isRtl ? 'تغيير صورة الموظف من جهازك' : 'Change photo from device'}</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                exportIndividualEmployeeDossierCSV(
                  user,
                  userAttendance,
                  userLeaves,
                  userBalances,
                  userTasks,
                  userKpi
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition"
              title={isRtl ? 'تنزيل ملف الموظف الشامل (CSV)' : 'Download Employee Dossier (CSV)'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تنزيل الملف (CSV)' : 'Export Dossier'}</span>
            </button>
            <button
              onClick={triggerPrintReport}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              title={isRtl ? 'طباعة / حفظ PDF' : 'Print / PDF'}
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{t('success')}</span>
            </div>
          )}

          {/* TAB 1: PERSONAL & EMPLOYMENT */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2">
                    {isRtl ? 'البيانات الشخصية والاتصال' : 'Personal & Contact Information'}
                  </h4>
                  <div>
                    <span className="text-slate-400 block mb-1">{isRtl ? 'الاسم بالإنجليزية' : 'Full Name (EN)'}</span>
                    <span className="font-semibold text-slate-800">{user.nameEn}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">{isRtl ? 'الاسم بالعربية' : 'Full Name (AR)'}</span>
                    <span className="font-semibold text-slate-800">{user.nameAr}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">{t('usernameOrEmail')}</span>
                    <input
                      type="email"
                      value={email}
                      disabled={!canEdit}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">{isRtl ? 'رقم الهاتف' : 'Phone Number'}</span>
                    <input
                      type="text"
                      value={phone}
                      disabled={!canEdit}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2">
                    {isRtl ? 'البيانات الوظيفية والمقر' : 'Employment & Organization'}
                  </h4>
                  <div>
                    <span className="text-slate-400 block mb-1">{isRtl ? 'كود الموظف' : 'Employee Code'}</span>
                    <span className="font-bold font-mono text-blue-700">{user.employeeCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">{isRtl ? 'المسمى الوظيفي' : 'Job Title'}</span>
                    <span className="font-semibold text-slate-800">{isRtl ? user.jobTitleAr : user.jobTitleEn}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">{isRtl ? 'القسم المؤسسي' : 'Department'}</span>
                    <span className="font-semibold text-slate-800 uppercase">{user.departmentId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">{isRtl ? 'تاريخ التعيين' : 'Joining Date'}</span>
                    <span className="font-semibold text-slate-800">{user.joiningDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">{isRtl ? 'جهة الاتصال في الطوارئ' : 'Emergency Contact'}</span>
                    <span className="font-medium text-slate-700">
                      {user.emergencyContact.name} ({user.emergencyContact.relationship}) - {user.emergencyContact.phone}
                    </span>
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
                  >
                    {t('save')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block mb-0.5">{isRtl ? 'الدور النظامي المخصص' : 'System Role'}</span>
                  <span className="font-bold text-slate-900 text-sm uppercase">{user.roleId.replace('_', ' ')}</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {user.status === 'active' ? (isRtl ? 'حساب نشط' : 'Active Account') : (isRtl ? 'غير نشط' : 'Inactive')}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <h4 className="font-bold text-slate-800">
                  {isRtl ? 'الصلاحيات المخولة على المنظومة' : 'Authorized Module Permissions'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <span className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700">
                    {isRtl ? '✓ استعراض الحضور' : '✓ View Attendance'}
                  </span>
                  <span className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700">
                    {isRtl ? '✓ تقديم الإجازات' : '✓ Submit Leaves'}
                  </span>
                  <span className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700">
                    {isRtl ? '✓ تنفيذ مهام GIS' : '✓ Execute Tasks'}
                  </span>
                  <span className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700">
                    {isRtl ? '✓ استعراض تقييم الأداء' : '✓ View Private KPI'}
                  </span>
                  {user.roleId.includes('manager') && (
                    <>
                      <span className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                        {isRtl ? '✓ مراجعة مهام الفريق' : '✓ Review Team Tasks'}
                      </span>
                      <span className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                        {isRtl ? '✓ تقييم مؤشرات الأداء' : '✓ Score Monthly KPI'}
                      </span>
                    </>
                  )}
                  {['emp_omar', 'emp_ghada'].includes(user.id) && (
                    <span className="p-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 font-bold">
                      {isRtl ? '★ معتمد ثنائي إلزامي' : '★ Mandatory Dual Signatory'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-slate-400 block mb-1">{isRtl ? 'إجمالي السجلات' : 'Total Records'}</span>
                  <span className="text-xl font-black text-slate-900">{userAttendance.length}</span>
                </div>
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
                  <span className="text-emerald-700 block mb-1">{isRtl ? 'حاضر داخل المقر' : 'Present Inside'}</span>
                  <span className="text-xl font-black text-emerald-800">
                    {userAttendance.filter((r) => r.status === 'present_inside').length}
                  </span>
                </div>
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100 text-center">
                  <span className="text-amber-700 block mb-1">{isRtl ? 'مرات التأخير' : 'Late Arrivals'}</span>
                  <span className="text-xl font-black text-amber-800">
                    {userAttendance.filter((r) => r.lateMinutes > 0).length}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-start">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-2.5 text-start">{t('date')}</th>
                      <th className="p-2.5 text-start">{t('checkedInAt')}</th>
                      <th className="p-2.5 text-start">{t('netHours')}</th>
                      <th className="p-2.5 text-start">{t('overtimeHours')}</th>
                      <th className="p-2.5 text-start">{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userAttendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60">
                        <td className="p-2.5 font-medium">{rec.date}</td>
                        <td className="p-2.5">{rec.checkInTime}</td>
                        <td className="p-2.5 font-bold text-blue-700">{rec.netWorkedHours}h</td>
                        <td className="p-2.5 font-bold text-emerald-700">{rec.overtimeHours}h</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {t(rec.status as any)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: LEAVE BALANCES */}
          {activeTab === 'leaves' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {userBalances.map((bal, i) => (
                  <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-slate-500 uppercase tracking-wider block font-semibold">
                      {isRtl ? t(`leave_${bal.leaveType}` as any) : bal.leaveType}
                    </span>
                    <span className="text-xl font-black text-slate-900 block">{bal.remaining}</span>
                    <span className="text-[10px] text-slate-400">
                      {isRtl ? `المستحق: ${bal.entitlement} • المستهلك: ${bal.used}` : `Entitled: ${bal.entitlement} • Used: ${bal.used}`}
                    </span>
                  </div>
                ))}
              </div>

              <h4 className="font-bold text-slate-800 pt-2">{isRtl ? 'سجل طلبات الإجازة' : 'Leave Requests History'}</h4>
              <div className="space-y-2">
                {userLeaves.map((lr) => (
                  <div key={lr.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 capitalize">
                        {isRtl ? t(`leave_${lr.leaveType}` as any) : `${lr.leaveType} Leave`}
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {lr.startDate} to {lr.endDate} ({lr.durationUnits} {isRtl ? (lr.unit === 'hours' ? 'ساعة' : 'يوم') : lr.unit})
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        lr.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : lr.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {lr.status === 'approved'
                        ? (isRtl ? 'معتمد' : 'APPROVED')
                        : lr.status === 'rejected'
                        ? (isRtl ? 'مرفوض' : 'REJECTED')
                        : (isRtl ? 'معلق' : 'PENDING')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-3 text-xs">
              {userTasks.map((t) => (
                <div key={t.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{t.title}</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">
                      {t.status}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px]">{t.projectName}</p>
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-slate-400">{isRtl ? 'موعد التسليم: ' : 'Due: '}{t.dueDate}</span>
                    <span className="font-bold text-blue-700">{t.progressPercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 6: KPI */}
          {activeTab === 'kpi' && userKpi && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-blue-200 block text-xs">{isRtl ? 'تقييم شهر سبتمبر 2026' : 'September 2026 KPI'}</span>
                  <span className="text-2xl font-black">{userKpi.totalScore}%</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                  {isRtl ? 'معتمد ومنشور' : 'Published'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block mb-1">{t('kpiCategoryAttendance')}</span>
                  <span className="font-bold text-slate-800 text-base">{userKpi.attendanceScore.scoreOutOfWeight} / 20</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block mb-1">{t('kpiCategoryWork')}</span>
                  <span className="font-bold text-slate-800 text-base">{userKpi.workScore.scoreOutOfWeight} / 40</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block mb-1">{t('kpiCategoryBehavior')}</span>
                  <span className="font-bold text-slate-800 text-base">{userKpi.behaviorScore.scoreOutOfWeight} / 20</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block mb-1">{t('kpiCategorySelfDev')}</span>
                  <span className="font-bold text-slate-800 text-base">{userKpi.selfDevScore.scoreOutOfWeight} / 20</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="font-bold text-slate-800 block">Employment_Contract.pdf</span>
                    <span className="text-slate-400 text-[10px]">Verified • Signed on {user.joiningDate}</span>
                  </div>
                </div>
                <button className="text-xs text-blue-600 font-bold hover:underline">Download</button>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-slate-800 block">National_ID_Passport_Copy.pdf</span>
                    <span className="text-slate-400 text-[10px]">HR Verified</span>
                  </div>
                </div>
                <button className="text-xs text-blue-600 font-bold hover:underline">Download</button>
              </div>
            </div>
          )}

          {/* TAB 8: ACTIVITY LOGS */}
          {activeTab === 'activity' && (
            <div className="space-y-2 text-xs">
              {userLogs.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No recent activity logged.</p>
              ) : (
                userLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{log.details}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
