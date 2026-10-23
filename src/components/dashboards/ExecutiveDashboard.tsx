import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Building,
  BarChart,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { exportToCSV } from '../../utils/exportUtils';
import { TaskPerformanceInsights } from '../tasks/TaskPerformanceInsights';
import { DepartmentKPITrendsVisualizer } from '../kpi/DepartmentKPITrendsVisualizer';

interface ExecutiveDashboardProps {
  onNavigate: (page: any) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onNavigate }) => {
  const { users, currentUser, isFullAccessUser } = useAuth();
  const { attendanceRecords, leaveRequests, tasks, kpiRecords } = useData();
  const { t, isRtl } = useLanguage();

  const [selectedDept, setSelectedDept] = useState<string>('all');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceRecords.filter((r) => r.date === todayStr);

  const presentInsideCount = todayAttendance.filter((r) => r.status === 'present_inside' || r.status === 'late').length;
  const remoteFieldCount = todayAttendance.filter((r) => r.status === 'remote_approved' || r.status === 'external_approved').length;
  const outsideReviewCount = todayAttendance.filter((r) => r.status === 'outside_review' || r.status === 'outside_exception').length;
  const onLeaveCount = leaveRequests.filter((r) => r.status === 'approved' && r.startDate <= todayStr && r.endDate >= todayStr).length;
  const totalEmployees = users.length;
  const absentCount = Math.max(0, totalEmployees - (presentInsideCount + remoteFieldCount + outsideReviewCount + onLeaveCount));

  // Overtime accumulated
  const totalOvertime = attendanceRecords.reduce((acc, r) => acc + (r.overtimeHours || 0), 0);

  // Even leaders with broad dashboard access see only leave requests directly
  // assigned to them. Leave ownership never follows executive visibility.
  const pendingLeaves = leaveRequests.filter((request) =>
    (request.status === 'pending_approval' || request.status === 'partially_approved') &&
    request.approvalSteps.some((step) => step.approverId === currentUser.id && step.status === 'pending')
  );

  // Department statistics
  const departments = [
    { id: 'gis', nameEn: 'GIS & Geomatics', nameAr: 'نظم المعلومات الجغرافية' },
    { id: 'remote_sensing', nameEn: 'Remote Sensing & Satellites', nameAr: 'الاستشعار عن بعد' },
    { id: 'technical', nameEn: 'Technical & Architecture', nameAr: 'البنية التقنية' },
    { id: 'training', nameEn: 'Training Academy', nameAr: 'التدريب الأكاديمي' },
    { id: 'administrative', nameEn: 'Administration & HR', nameAr: 'الشؤون الإدارية' },
  ];

  const handleExportExecutiveReport = () => {
    const headers = ['Employee Code', 'Name', 'Department', 'Role', 'Status Today', 'September KPI'];
    const rows = users.map((u) => {
      const att = todayAttendance.find((a) => a.employeeId === u.id);
      const kpi = kpiRecords.find((k) => k.employeeId === u.id && k.month === 9);
      return [
        u.employeeCode,
        isRtl ? u.nameAr : u.nameEn,
        u.departmentId,
        isRtl ? u.jobTitleAr : u.jobTitleEn,
        att?.status ? t(att.status as any) : 'Absent',
        `${kpi?.totalScore ?? 92}%`,
      ];
    });
    exportToCSV(`Geoinformatics_Executive_Summary_${todayStr}`, headers, rows);
  };

  return (
    <div className="space-y-8">
      {/* Executive Header */}
      <div className="bg-white rounded-xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-xl bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
              {isRtl ? 'الإدارة العليا' : 'Executive Overview'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {isRtl ? 'لوحة تحكم د. محمد بدوي والشركاء المؤسسين' : 'Dr. Mohamed Badawy & Co-Founders Dashboard'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isRtl ? 'لوحة القيادة التنفيذية لمؤسسة الجيوانفورماتكس' : 'Executive Workforce & Operations Dashboard'}
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            {isRtl
              ? 'متابعة شاملة للقوى العاملة، مؤشرات الأداء، الحضور عبر السياج الجغرافي، ومسار الاعتماد الثنائي.'
              : 'Holistic workforce oversight: spatial geofence attendance, divisional KPIs, and department-owned leave approvals.'}
          </p>
        </div>

        {isFullAccessUser && <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportExecutiveReport}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition flex items-center gap-2 border border-slate-300 shadow-2xs hover:shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>{t('exportCsv')}</span>
          </button>
          <button
            onClick={() => onNavigate('leaves_dual_approval')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isRtl ? 'اعتمادات قسمي' : 'My Department Approvals'} ({pendingLeaves.length})</span>
          </button>
        </div>}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Workforce */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-2">{isRtl ? 'إجمالي الموظفين' : 'Total Staff'}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{totalEmployees}</span>
            <span className="text-xs text-slate-400 font-medium">{isRtl ? 'نشط' : 'active'}</span>
          </div>
        </div>

        {/* Present Inside Geofence */}
        <div className="bg-emerald-50/70 p-5 rounded-xl border border-emerald-200/80 shadow-xs hover:shadow-md transition-all duration-200">
          <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider block mb-2">{isRtl ? 'داخل المقر' : 'Inside Zone'}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">{presentInsideCount}</span>
            <span className="text-xs text-emerald-600 font-medium">{isRtl ? 'موظفاً' : 'staff'}</span>
          </div>
        </div>

        {/* Remote / Field Approved */}
        <div className="bg-blue-50/70 p-5 rounded-xl border border-blue-200/80 shadow-xs hover:shadow-md transition-all duration-200">
          <span className="text-xs text-blue-800 font-semibold uppercase tracking-wider block mb-2">{isRtl ? 'عمل عن بُعد' : 'Remote / Field'}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight">{remoteFieldCount}</span>
            <span className="text-xs text-blue-600 font-medium">{isRtl ? 'معتمد' : 'approved'}</span>
          </div>
        </div>

        {/* Outside Zone Review */}
        <div className="bg-amber-50/70 p-5 rounded-xl border border-amber-200/80 shadow-xs hover:shadow-md transition-all duration-200">
          <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider block mb-2">{isRtl ? 'خارج النطاق' : 'Outside Zone'}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight">{outsideReviewCount}</span>
            <span className="text-xs text-amber-600 font-medium">{isRtl ? 'مراجعة' : 'review'}</span>
          </div>
        </div>

        {/* On Leave */}
        <div className="bg-purple-50/70 p-5 rounded-xl border border-purple-200/80 shadow-xs hover:shadow-md transition-all duration-200">
          <span className="text-xs text-purple-800 font-semibold uppercase tracking-wider block mb-2">{isRtl ? 'في إجازة' : 'On Leave'}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-700 tracking-tight">{onLeaveCount}</span>
            <span className="text-xs text-purple-600 font-medium">{isRtl ? 'إجازة' : 'vacation'}</span>
          </div>
        </div>

        {/* Overtime Total */}
        <div className="bg-slate-900 text-white p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200">
          <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider block mb-2">{isRtl ? 'ساعات إضافية' : 'Overtime'}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">{totalOvertime.toFixed(1)}</span>
            <span className="text-xs text-slate-400 font-medium">{isRtl ? 'ساعة' : 'hours'}</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className={`grid grid-cols-1 gap-6 ${isFullAccessUser ? 'lg:grid-cols-3' : ''}`}>
        {/* Left 2 Cols: Department Health & Performance */}
        <div className={`${isFullAccessUser ? 'lg:col-span-2' : ''} space-y-6`}>
          {/* Department Breakdown */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-slate-900 text-base tracking-tight">
                {isRtl ? 'مؤشرات الأداء والحضور حسب الأقسام' : 'Department Workforce & KPI Benchmarks'}
              </h2>
              <span className="text-xs text-slate-500 font-medium">{isRtl ? '5 أقسام رسمية' : '5 Official Divisions'}</span>
            </div>

            <div className="space-y-4">
              {departments.map((dept) => {
                const deptUsers = users.filter((u) => u.departmentId === dept.id);
                const avgKpi = 93.4; // sample high GIS performance

                return (
                  <div key={dept.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Building className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-slate-800 text-sm">
                          {isRtl ? dept.nameAr : dept.nameEn}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500 font-medium">{deptUsers.length} {isRtl ? 'أعضاء' : 'members'}</span>
                        <span className="font-black text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-lg">
                          KPI: {avgKpi}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${avgKpi}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Spatial Tasks Progress */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-slate-900 text-base tracking-tight">
                {isRtl ? 'أبرز مشاريع ومهام الاستشعار و GIS' : 'High-Priority GIS & Earth Observation Projects'}
              </h2>
              {isFullAccessUser && <button
                onClick={() => onNavigate('tasks_team')}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold transition"
              >
                {isRtl ? 'عرض كافة المشاريع' : 'Manage All'}
              </button>}
            </div>

            <div className="space-y-3">
              {tasks.slice(0, 4).map((task) => (
                <div key={task.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs">
                  <div className="space-y-0.5 max-w-md truncate">
                    <span className="font-bold text-slate-800 text-sm truncate block">{task.title}</span>
                    <span className="text-slate-500 text-xs block">{task.projectName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-blue-700 text-sm">{task.progressPercent}%</span>
                    <span
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                        task.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : task.status === 'submitted'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {t(`status_${task.status}` as any)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Department-owned approvals queue */}
        {isFullAccessUser && <div className="space-y-6">
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-slate-900 text-base tracking-tight">
                  {isRtl ? 'طلبات قسمي بانتظار الاعتماد' : 'My Department Approval Queue'}
                </h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold">
                {pendingLeaves.length} {isRtl ? 'معلق' : 'pending'}
              </span>
            </div>

            <div className="space-y-3.5">
              {pendingLeaves.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  {isRtl ? 'لا توجد طلبات معلقة حالياً' : 'All leave requests processed.'}
                </p>
              ) : (
                pendingLeaves.map((lr) => {
                  const requester = users.find((u) => u.id === lr.employeeId);
                  return (
                    <div key={lr.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5 text-xs shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">
                          {requester ? (isRtl ? requester.nameAr : requester.nameEn) : 'Employee'}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold text-[10px]">
                          {isRtl ? t(`leave_${lr.leaveType}` as any) : lr.leaveType.toUpperCase()} ({lr.durationUnits} {isRtl ? (lr.unit === 'hours' ? 'ساعة' : 'يوم') : lr.unit})
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">{lr.reason}</p>

                      {/* Assigned department approver */}
                      <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-600">
                          {isRtl ? 'المسؤول: ' : 'Owner: '}
                          <b className="text-amber-600 font-bold">
                            {lr.approvalSteps.find((step) => step.approverId === currentUser.id)?.approverName || (isRtl ? 'مسؤول القسم' : 'Department owner')}
                          </b>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => onNavigate('leaves_dual_approval')}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition"
            >
              {isRtl ? 'فتح مركز اعتماد القسم' : 'Open Department Approval Center'}
            </button>
          </div>
        </div>}
      </div>

      {/* Department KPI 12-Month Trends & Seasonal Diagnostics (Multi-Line Chart) */}
      <div className="pt-2">
        <DepartmentKPITrendsVisualizer allowExport={isFullAccessUser} />
      </div>

      {/* Task Performance Insights: Recharts Analytics */}
      <div className="pt-2">
        <TaskPerformanceInsights embeddedInDashboard={true} allowExport={isFullAccessUser} />
      </div>
    </div>
  );
};
