import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { User } from '../../types';
import {
  Search,
  Filter,
  Users,
  Building,
  Phone,
  Mail,
  UserCheck,
  ExternalLink,
  Download,
  Camera,
} from 'lucide-react';
import { EmployeeProfileModal } from './EmployeeProfileModal';
import { exportToCSV, exportIndividualEmployeeDossierCSV } from '../../utils/exportUtils';
import { UserAvatar } from '../common/UserAvatar';

export const EmployeeDirectory: React.FC = () => {
  const { users, switchUserById, updateUser } = useAuth();
  const { attendanceRecords, kpiRecords, leaveBalances, leaveRequests, tasks } = useData();
  const { t, isRtl } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);
  const [uploadingEmpId, setUploadingEmpId] = useState<string | null>(null);
  const cardFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCardPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingEmpId) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const targetUser = users.find((u) => u.id === uploadingEmpId);
        if (dataUrl && targetUser) {
          updateUser({ ...targetUser, avatarUrl: dataUrl });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.nameAr.includes(searchQuery) ||
      u.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.jobTitleEn.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'all' || u.departmentId === selectedDept;
    return matchesSearch && matchesDept;
  });

  const handleExportDirectory = () => {
    const headers = ['Code', 'Name EN', 'Name AR', 'Job Title', 'Department', 'Email', 'Phone', 'Joining Date'];
    const rows = filteredUsers.map((u) => [
      u.employeeCode,
      u.nameEn,
      u.nameAr,
      u.jobTitleEn,
      u.departmentId,
      u.email,
      u.phone,
      u.joiningDate,
    ]);
    exportToCSV('Geoinformatics_Employee_Directory', headers, rows);
  };

  const departments = [
    { id: 'all', label: t('all') },
    { id: 'executive', label: isRtl ? 'الإدارة التنفيذية' : 'Executive' },
    { id: 'gis', label: isRtl ? 'نظم المعلومات الجغرافية' : 'GIS' },
    { id: 'remote_sensing', label: isRtl ? 'الاستشعار عن بعد' : 'Remote Sensing' },
    { id: 'technical', label: isRtl ? 'التقنية' : 'Technical' },
    { id: 'training', label: isRtl ? 'التدريب' : 'Training' },
    { id: 'administrative', label: isRtl ? 'الإدارية' : 'Administrative' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">{t('navEmployeeDir')}</h1>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
              {users.length} {isRtl ? 'موظفاً' : 'Employees'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {isRtl
              ? 'دليل فريق العمل المتكامل لشركة جيوانفورماتكس مع بيانات الاتصال والملفات الوظيفية.'
              : 'Complete Geoinformatics workforce roster with role profiles and credentials.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className={`w-4 h-4 text-slate-400 absolute top-2.5 ${isRtl ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full py-2 ${
                isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
              } rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          <button
            onClick={handleExportDirectory}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('exportCsv')}</span>
          </button>
        </div>
      </div>

      {/* Department Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {departments.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedDept(d.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedDept === d.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((employee) => {
          const kpi = kpiRecords.find((k) => k.employeeId === employee.id && k.month === 9);
          const att = attendanceRecords.find((a) => a.employeeId === employee.id);

          return (
            <div
              key={employee.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="relative group shrink-0">
                  <UserAvatar
                    src={employee.avatarUrl}
                    name={isRtl ? employee.nameAr : employee.nameEn}
                    size="lg"
                    rounded="xl"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadingEmpId(employee.id);
                      cardFileInputRef.current?.click();
                    }}
                    title={isRtl ? 'رفع أو تغيير صورة الموظف' : 'Change employee photo'}
                    className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md border border-white transition flex items-center justify-center cursor-pointer opacity-80 group-hover:opacity-100 hover:scale-110"
                  >
                    <Camera className="w-2.5 h-2.5" />
                  </button>
                </div>
                <div className="flex-1 truncate">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-mono font-bold text-blue-700">
                      {employee.employeeCode}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      {isRtl ? employee.jobTitleAr.split(' ')[0] : employee.roleId.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm truncate">
                    {isRtl ? employee.nameAr : employee.nameEn}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {isRtl ? employee.jobTitleAr : employee.jobTitleEn}
                  </p>
                </div>
              </div>

              {/* Contact info mini */}
              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{employee.email}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono">{employee.phone}</span>
                </div>
              </div>

              {/* Metrics Pills */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="p-2 bg-slate-50 rounded-lg text-center">
                  <span className="text-[10px] text-slate-400 block">{isRtl ? 'تقييم سبتمبر' : 'Sept KPI'}</span>
                  <span className="font-bold text-blue-900">{kpi?.totalScore ?? 92}%</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg text-center">
                  <span className="text-[10px] text-slate-400 block">{isRtl ? 'القسم' : 'Department'}</span>
                  <span className="font-semibold text-slate-700 uppercase text-[10px] truncate block">
                    {isRtl ? t(`dept_${employee.departmentId}` as any) : employee.departmentId}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={() => setSelectedUserForModal(employee)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition text-center"
                >
                  {isRtl ? 'عرض الملف' : 'Profile'}
                </button>
                <button
                  onClick={() => {
                    const empAtt = attendanceRecords.filter((r) => r.employeeId === employee.id);
                    const empLeaves = leaveRequests.filter((l) => l.employeeId === employee.id);
                    const empBalances = leaveBalances.filter((b) => b.employeeId === employee.id);
                    const empTasks = tasks.filter((t) => t.assigneeIds.includes(employee.id));
                    const empKpi = kpiRecords.find((k) => k.employeeId === employee.id && k.month === 9);
                    exportIndividualEmployeeDossierCSV(employee, empAtt, empLeaves, empBalances, empTasks, empKpi);
                  }}
                  title={isRtl ? 'تنزيل الملف الوظيفي الشامل (CSV)' : 'Download Employee Dossier (CSV)'}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => switchUserById(employee.id)}
                  title="Switch to this user session"
                  className="px-2.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden sm:inline">{isRtl ? 'دخول' : 'Act As'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Profile Modal */}
      <EmployeeProfileModal
        user={selectedUserForModal}
        onClose={() => setSelectedUserForModal(null)}
      />

      <input
        ref={cardFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCardPhotoUpload}
      />
    </div>
  );
};
