import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Award,
  Database,
  User,
  Shield,
  Layers,
  FolderArchive,
  ArrowDownToLine,
  Building,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import {
  exportToCSV,
  exportToJSON,
  exportIndividualEmployeeDossierCSV,
  triggerPrintReport,
} from '../../utils/exportUtils';

interface ReportsCenterProps {
  initialReport?: 'daily_attendance' | 'audit';
}

export const ReportsCenter: React.FC<ReportsCenterProps> = ({ initialReport = 'daily_attendance' }) => {
  const { users, currentUser, isFullAccessUser } = useAuth();
  const { attendanceRecords, leaveRequests, leaveBalances, tasks, kpiRecords, auditLogs } = useData();
  const { t, isRtl } = useLanguage();
  const canAccessCompanyReports = isFullAccessUser;

  // Export Mode: 'all_data' (تنزيل المعلومات كلها) vs 'per_person' (تنزيل لكل شخص)
  const [downloadScope, setDownloadScope] = useState<'all_data' | 'per_person'>('all_data');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(users[0]?.id || 'emp_badawy');

  const [activeReport, setActiveReport] = useState<
    | 'daily_attendance'
    | 'timesheet'
    | 'overtime'
    | 'late_early'
    | 'geofence_exceptions'
    | 'leaves'
    | 'tasks'
    | 'kpi'
    | 'audit'
  >(initialReport);

  const [filterSearch, setFilterSearch] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const selectedUser = users.find((u) => u.id === selectedEmployeeId) || users[0];
  const selectedUserAttendance = attendanceRecords.filter((r) => r.employeeId === selectedUser?.id);
  const selectedUserLeaves = leaveRequests.filter((l) => l.employeeId === selectedUser?.id);
  const selectedUserBalances = leaveBalances.filter((b) => b.employeeId === selectedUser?.id);
  const selectedUserTasks = tasks.filter((t) => t.assigneeIds.includes(selectedUser?.id));
  const selectedUserKpi = kpiRecords.find((k) => k.employeeId === selectedUser?.id && k.month === 9);

  // Download All Company Data as single JSON archive
  const handleExportAllCompanyArchiveJSON = () => {
    const archiveData = {
      exportTimestamp: new Date().toISOString(),
      companyName: 'Geoinformatics (GIS & Earth Observation Solutions)',
      totalEmployees: users.length,
      employees: users,
      attendanceRecords,
      leaveBalances,
      leaveRequests,
      spatialTasks: tasks,
      kpiEvaluations: kpiRecords,
      securityAuditLogs: auditLogs,
    };
    exportToJSON(`Geoinformatics_Complete_Company_Archive_${todayStr}`, archiveData);
  };

  // Bulk Exports for individual modules
  const handleExportAllEmployeesCSV = () => {
    const headers = ['Code', 'Name EN', 'Name AR', 'Job Title', 'Department', 'Email', 'Phone', 'Joining Date', 'Status'];
    const rows = users.map((u) => [
      u.employeeCode,
      u.nameEn,
      u.nameAr,
      u.jobTitleEn,
      u.departmentId,
      u.email,
      u.phone,
      u.joiningDate,
      u.status,
    ]);
    exportToCSV(`Geoinformatics_All_Employees_Master_${todayStr}`, headers, rows);
  };

  const handleExportAllAttendanceCSV = () => {
    const headers = ['Date', 'Code', 'Employee', 'Department', 'Check In', 'Check Out', 'Geofence Notes', 'Net Hours', 'Required', 'Overtime', 'Status'];
    const rows = attendanceRecords.map((r) => {
      const u = users.find((emp) => emp.id === r.employeeId);
      return [
        r.date,
        u?.employeeCode || '',
        u?.nameEn || '',
        u?.departmentId || '',
        r.checkInTime,
        r.checkOutTime || '--',
        r.statusNotes || r.source,
        r.netWorkedHours,
        r.requiredDailyHours,
        r.overtimeHours,
        r.status,
      ];
    });
    exportToCSV(`Geoinformatics_All_Attendance_Records_${todayStr}`, headers, rows);
  };

  const handleExportAllLeavesCSV = () => {
    const headers = ['Request ID', 'Employee Code', 'Employee Name', 'Leave Type', 'Start Date', 'End Date', 'Duration', 'Omar Sign-off', 'Ghada Sign-off', 'Final Status'];
    const rows = leaveRequests.map((l) => {
      const u = users.find((emp) => emp.id === l.employeeId);
      return [
        l.id,
        u?.employeeCode || '',
        u?.nameEn || '',
        l.leaveType,
        l.startDate,
        l.endDate,
        `${l.durationUnits} ${l.unit}`,
        l.approvalSteps[0]?.status || 'pending',
        l.approvalSteps[1]?.status || 'pending',
        l.status,
      ];
    });
    exportToCSV(`Geoinformatics_All_Leaves_DualApproval_${todayStr}`, headers, rows);
  };

  const handleExportAllTasksCSV = () => {
    const headers = ['Task ID', 'Project Name', 'Task Title', 'Department', 'Priority', 'Status', 'Due Date', 'Progress (%)', 'Estimated Hours', 'Actual Hours'];
    const rows = tasks.map((t) => [
      t.id,
      t.projectName,
      t.title,
      t.departmentId,
      t.priority,
      t.status,
      t.dueDate,
      `${t.progressPercent}%`,
      t.estimatedHours,
      t.actualHours,
    ]);
    exportToCSV(`Geoinformatics_All_Spatial_Tasks_${todayStr}`, headers, rows);
  };

  const handleExportAllKPICSV = () => {
    const headers = [
      'Code',
      'Name',
      'Department',
      'Attendance (20%)',
      'Work Deliverables (40%)',
      'Behavior & Ethics (20%)',
      'Self-Development (20%)',
      'Total Score (%)',
      'Evaluation Month',
    ];
    const rows = users.map((u) => {
      const k = kpiRecords.find((rec) => rec.employeeId === u.id);
      return [
        u.employeeCode,
        u.nameEn,
        u.departmentId,
        k?.attendanceScore.scoreOutOfWeight ?? 18.5,
        k?.workScore.scoreOutOfWeight ?? 37.0,
        k?.behaviorScore.scoreOutOfWeight ?? 19.0,
        k?.selfDevScore.scoreOutOfWeight ?? 18.0,
        `${k?.totalScore ?? 92.5}%`,
        'September 2026',
      ];
    });
    exportToCSV(`Geoinformatics_All_KPI_Evaluations_${todayStr}`, headers, rows);
  };

  const handleExportAllAuditLogsCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Module', 'Details'];
    const rows = auditLogs.map((a) => [a.timestamp, a.userName, a.action, a.module, a.details]);
    exportToCSV(`Geoinformatics_All_Security_Audit_Logs_${todayStr}`, headers, rows);
  };

  // Export Individual Person Complete Dossier
  const handleExportSelectedEmployeeDossier = () => {
    if (!selectedUser) return;
    exportIndividualEmployeeDossierCSV(
      selectedUser,
      selectedUserAttendance,
      selectedUserLeaves,
      selectedUserBalances,
      selectedUserTasks,
      selectedUserKpi
    );
  };

  const handleExportCurrentTable = () => {
    if (activeReport === 'daily_attendance') handleExportAllAttendanceCSV();
    else if (activeReport === 'leaves') handleExportAllLeavesCSV();
    else if (activeReport === 'tasks') handleExportAllTasksCSV();
    else if (activeReport === 'kpi') handleExportAllKPICSV();
    else if (activeReport === 'audit') handleExportAllAuditLogsCSV();
    else handleExportAllAttendanceCSV();
  };

  const reportTypes = [
    { id: 'daily_attendance', label: isRtl ? 'تقرير الحضور اليومي' : 'Daily Attendance Report' },
    { id: 'timesheet', label: isRtl ? 'سجل الساعات الشهري (Timesheet)' : 'Monthly Timesheets' },
    { id: 'overtime', label: isRtl ? 'تقرير العمل الإضافي (Overtime)' : 'Overtime Report' },
    { id: 'late_early', label: isRtl ? 'التأخير والانصراف المبكر' : 'Late & Early Leave' },
    { id: 'geofence_exceptions', label: isRtl ? 'استثناءات النطاق الجغرافي (500م)' : 'Geofence Exceptions' },
    { id: 'leaves', label: isRtl ? 'تقرير أرصدة الإجازات' : 'Leave Balances & Usage' },
    { id: 'tasks', label: isRtl ? 'تقرير إنجاز المهام والمشاريع' : 'Tasks & Deliverables' },
    { id: 'kpi', label: isRtl ? 'تقرير تقييم الأداء الشامل KPI' : 'Master KPI Performance' },
    { id: 'audit', label: isRtl ? 'سجل العمليات والرقابة' : 'Security & Audit Logs' },
  ];

  if (!canAccessCompanyReports) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Shield className="mx-auto h-10 w-10 text-blue-600" />
        <h1 className="mt-4 text-lg font-bold text-slate-900">{isRtl ? 'تقارير الشركة محمية' : 'Company reports are protected'}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {isRtl ? 'يمكنك الاطلاع على بياناتك الشخصية من صفحات الحضور والمهام وتقييم الأداء فقط.' : 'Use Attendance, Tasks, and KPI pages for your own private records.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">
              {isRtl ? 'مركز التقارير وتنزيل البيانات الشاملة' : 'Reports & Comprehensive Data Export Center'}
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            {isRtl
              ? 'إمكانية تنزيل كافة معلومات وبيانات الشركة دفعة واحدة أو تنزيل ملف وظيفي شامل ومستقل لكل شخص.'
              : 'Export all company records in bulk or download 360° individual employee career dossiers.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={triggerPrintReport}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('exportPdf')}</span>
          </button>
          <button
            onClick={handleExportCurrentTable}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isRtl ? 'تصدير الجدول المعروض (CSV)' : 'Export Displayed Table'}</span>
          </button>
        </div>
      </div>

      {/* CORE DOWNLOAD CENTER PANEL: تنزيل المعلومات كلها أو لكل شخص */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                {isRtl ? 'خيارات تنزيل وتصدير البيانات' : 'Data Download & Export Capabilities'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRtl
                ? 'اختر بين تنزيل حزمة بيانات الشركة بالكامل أو تحديد موظف معين لتنزيل ملفه الشامل.'
                : 'Select between bulk company-wide data exports or downloading an individual employee dossier.'}
            </p>
          </div>

          {/* Toggle Switch: All Data vs Per Person */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold border border-slate-200">
            <button
              onClick={() => setDownloadScope('all_data')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                downloadScope === 'all_data'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تنزيل المعلومات كلها' : 'Download All Information'}</span>
            </button>
            <button
              onClick={() => setDownloadScope('per_person')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                downloadScope === 'per_person'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تنزيل لكل شخص' : 'Download Per Person'}</span>
            </button>
          </div>
        </div>

        {/* VIEW 1: تنزيل المعلومات كلها (All Data Export) */}
        {downloadScope === 'all_data' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Option 1: All Employees Master */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      {isRtl ? 'سجل الموظفين بالكامل' : 'All Employees Master Roster'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                      {users.length} members
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isRtl
                      ? 'البيانات الشخصية، الأكواد، الأقسام، الرتب الوظيفية، وبيانات الاتصال.'
                      : 'Complete roster with job titles, departments, emails, phones, and join dates.'}
                  </p>
                </div>
                <button
                  onClick={handleExportAllEmployeesCSV}
                  className="w-full py-2 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-blue-700 hover:bg-blue-50 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تنزيل سجل الموظفين (CSV)' : 'Export Employees (CSV)'}</span>
                </button>
              </div>

              {/* Option 2: All Attendance & Timesheets */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      {isRtl ? 'الحضور والانصراف والإضافي' : 'All Attendance & Overtime'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      {attendanceRecords.length} logs
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isRtl
                      ? 'ساعات الحضور والانصراف، الساعات الصافية، والإضافي، والسياج الجغرافي 500م.'
                      : 'Punch logs, required vs worked hours, overtime, and geofence locations.'}
                  </p>
                </div>
                <button
                  onClick={handleExportAllAttendanceCSV}
                  className="w-full py-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تنزيل سجلات الحضور (CSV)' : 'Export Attendance (CSV)'}</span>
                </button>
              </div>

              {/* Option 3: All Leaves & Dual Approval */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-purple-600" />
                      {isRtl ? 'الإجازات والاعتماد الثنائي' : 'All Leaves & Dual Approvals'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                      {leaveRequests.length} requests
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isRtl
                      ? 'أرصدة الإجازات، طلبات الإذن والعمل عن بعد، وتوقيعات م. محمد عمر ود. غادة.'
                      : 'Balances, WFH requests, and dual approval sign-offs with final status.'}
                  </p>
                </div>
                <button
                  onClick={handleExportAllLeavesCSV}
                  className="w-full py-2 rounded-lg bg-white border border-slate-200 hover:border-purple-400 text-purple-700 hover:bg-purple-50 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تنزيل سجل الإجازات (CSV)' : 'Export Leaves (CSV)'}</span>
                </button>
              </div>

              {/* Option 4: Spatial Tasks & GIS Projects */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      {isRtl ? 'مهام ومشاريع GIS والاستشعار' : 'All GIS & Spatial Tasks'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                      {tasks.length} tasks
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isRtl
                      ? 'حالة المهام، نسب الإنجاز، الساعات المقدرة والمسجلة، وتقييمات الجودة.'
                      : 'Task titles, spatial projects, progress %, actual hours, and review scores.'}
                  </p>
                </div>
                <button
                  onClick={handleExportAllTasksCSV}
                  className="w-full py-2 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-blue-700 hover:bg-blue-50 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تنزيل سجل المهام (CSV)' : 'Export Tasks (CSV)'}</span>
                </button>
              </div>

              {/* Option 5: Master KPI Performance */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      {isRtl ? 'تقييمات الأداء الشاملة KPI' : 'Master KPI Evaluations'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                      4 Pillars
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isRtl
                      ? 'درجات الحضور (20%)، الإنجاز (40%)، السلوك (20%)، والتطوير الذاتي (20%).'
                      : 'Scores across all 4 evaluation pillars with overall performance grades.'}
                  </p>
                </div>
                <button
                  onClick={handleExportAllKPICSV}
                  className="w-full py-2 rounded-lg bg-white border border-slate-200 hover:border-amber-400 text-amber-700 hover:bg-amber-50 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تنزيل تقييمات KPI (CSV)' : 'Export KPI Scores (CSV)'}</span>
                </button>
              </div>

              {/* Option 6: Security Audit Logs */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-rose-600" />
                      {isRtl ? 'سجل العمليات والرقابة Audit' : 'Security & Audit Logs'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                      {auditLogs.length} events
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isRtl
                      ? 'سجل التعديلات والاعتمادات وحركات تسجيل الدخول وتغييرات البيانات.'
                      : 'Timestamped administrative actions, approvals, and security events.'}
                  </p>
                </div>
                <button
                  onClick={handleExportAllAuditLogsCSV}
                  className="w-full py-2 rounded-lg bg-white border border-slate-200 hover:border-rose-400 text-rose-700 hover:bg-rose-50 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تنزيل سجل الرقابة (CSV)' : 'Export Audit Logs (CSV)'}</span>
                </button>
              </div>
            </div>

            {/* MASTER ONE-CLICK COMPLETE BACKUP BUNDLE (JSON) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-sm">
                    {isRtl ? 'تنزيل الحزمة الشاملة لكافة بيانات الشركة (Full JSON Archive)' : 'Full Company Data Archive (Complete JSON)'}
                  </h3>
                </div>
                <p className="text-xs text-slate-300">
                  {isRtl
                    ? 'تنزيل ملف واحد متكامل يحتوي على كافة الموظفين، الحضور، الإجازات، مهام GIS، ونتائج التقييمات.'
                    : 'Download a single structured JSON archive containing every table and record across the platform.'}
                </p>
              </div>
              <button
                onClick={handleExportAllCompanyArchiveJSON}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2 shrink-0"
              >
                <FolderArchive className="w-4 h-4" />
                <span>{isRtl ? 'تنزيل الحزمة الشاملة الآن' : 'Download Complete Archive'}</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: تنزيل لكل شخص (Individual Employee 360° Dossier) */}
        {downloadScope === 'per_person' && (
          <div className="space-y-4">
            {/* Person Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                {isRtl ? 'اختر الموظف المطلوب:' : 'Select Employee:'}
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="flex-1 py-1.5 px-3 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-hidden"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.employeeCode} - {isRtl ? u.nameAr : u.nameEn} ({u.jobTitleEn} - {u.departmentId.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Person 360° Overview Card */}
            {selectedUser && (
              <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/30 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <UserAvatar
                      src={selectedUser.avatarUrl}
                      name={isRtl ? selectedUser.nameAr : selectedUser.nameEn}
                      size="xl"
                      rounded="2xl"
                      className="border-2 border-white shadow-sm"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">
                          {isRtl ? selectedUser.nameAr : selectedUser.nameEn}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono font-bold text-xs">
                          {selectedUser.employeeCode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {isRtl ? selectedUser.jobTitleAr : selectedUser.jobTitleEn} •{' '}
                        <span className="font-semibold uppercase text-blue-700">{selectedUser.departmentId}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {selectedUser.email} • {selectedUser.phone}
                      </p>
                    </div>
                  </div>

                  {/* Individual Download Buttons */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleExportSelectedEmployeeDossier}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isRtl ? 'تنزيل الملف الوظيفي الشامل (CSV)' : 'Download Employee Dossier (CSV)'}</span>
                    </button>
                    <button
                      onClick={triggerPrintReport}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition flex items-center justify-center gap-1.5"
                      title={isRtl ? 'طباعة وحفظ كـ PDF' : 'Print / Save PDF'}
                    >
                      <Printer className="w-4 h-4" />
                      <span className="hidden sm:inline">{isRtl ? 'طباعة PDF' : 'Print PDF'}</span>
                    </button>
                  </div>
                </div>

                {/* 4 Summary Metric Badges for Selected Person */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-blue-100">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-medium block">
                      {isRtl ? 'ساعات العمل المسجلة' : 'Attendance Hours'}
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {selectedUserAttendance.reduce((acc, r) => acc + r.netWorkedHours, 0).toFixed(1)}h
                    </span>
                    <span className="text-[10px] text-emerald-600 block font-semibold">
                      {selectedUserAttendance.length} punch days
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-medium block">
                      {isRtl ? 'رصيد الإجازات المتبقي' : 'Leave Balance'}
                    </span>
                    <span className="text-lg font-black text-purple-700">
                      {selectedUserBalances.reduce((acc, b) => acc + b.remaining, 0)} days
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {selectedUserLeaves.length} requested
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-medium block">
                      {isRtl ? 'المهام ومشاريع GIS' : 'Assigned Spatial Tasks'}
                    </span>
                    <span className="text-lg font-black text-blue-700">{selectedUserTasks.length}</span>
                    <span className="text-[10px] text-slate-500 block">
                      {selectedUserTasks.filter((t) => t.status === 'completed').length} completed
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-medium block">
                      {isRtl ? 'تقييم الأداء (سبتمبر)' : 'Latest KPI Score'}
                    </span>
                    <span className="text-lg font-black text-amber-600">
                      {selectedUserKpi?.totalScore ?? 92.5}%
                    </span>
                    <span className="text-[10px] text-blue-600 font-bold block">Grade A</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reports Selector Tabs for Display Table */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {reportTypes.map((rep) => (
          <button
            key={rep.id}
            onClick={() => setActiveReport(rep.id as any)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeReport === rep.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {rep.label}
          </button>
        ))}
      </div>

      {/* Report Data Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            {reportTypes.find((r) => r.id === activeReport)?.label}
          </h3>
          <span className="text-[11px] text-slate-400">Generated on {todayStr}</span>
        </div>

        <div className="overflow-x-auto">
          {activeReport === 'daily_attendance' && (
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="p-3 text-start">{t('date')}</th>
                  <th className="p-3 text-start">{isRtl ? 'الكود' : 'Code'}</th>
                  <th className="p-3 text-start">{isRtl ? 'الموظف' : 'Employee'}</th>
                  <th className="p-3 text-start">{t('checkedInAt')}</th>
                  <th className="p-3 text-start">{t('checkedOutAt')}</th>
                  <th className="p-3 text-start">{t('netHours')}</th>
                  <th className="p-3 text-start">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {attendanceRecords.slice(0, 15).map((r) => {
                  const emp = users.find((u) => u.id === r.employeeId);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono">{r.date}</td>
                      <td className="p-3 font-mono font-bold text-blue-700">{emp?.employeeCode}</td>
                      <td className="p-3 font-bold text-slate-900">{isRtl ? emp?.nameAr : emp?.nameEn}</td>
                      <td className="p-3 font-mono text-emerald-700">{r.checkInTime}</td>
                      <td className="p-3 font-mono text-slate-500">{r.checkOutTime || '--'}</td>
                      <td className="p-3 font-mono font-bold">{r.netWorkedHours}h</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {t(r.status as any)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeReport === 'leaves' && (
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="p-3 text-start">{isRtl ? 'الكود' : 'Code'}</th>
                  <th className="p-3 text-start">{isRtl ? 'الموظف' : 'Employee'}</th>
                  <th className="p-3 text-start">{isRtl ? 'متبقي الاعتيادي' : 'Annual Remaining'}</th>
                  <th className="p-3 text-start">{isRtl ? 'متبقي العارضة' : 'Casual Remaining'}</th>
                  <th className="p-3 text-start">{isRtl ? 'متبقي المرضي' : 'Sick Remaining'}</th>
                  <th className="p-3 text-start">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => {
                  const bAnnual = leaveBalances.find((b) => b.employeeId === u.id && b.leaveType === 'annual')?.remaining ?? 13;
                  const bCasual = leaveBalances.find((b) => b.employeeId === u.id && b.leaveType === 'casual')?.remaining ?? 5;
                  const bSick = leaveBalances.find((b) => b.employeeId === u.id && b.leaveType === 'sick')?.remaining ?? 13;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-blue-700">{u.employeeCode}</td>
                      <td className="p-3 font-bold text-slate-900">{isRtl ? u.nameAr : u.nameEn}</td>
                      <td className="p-3 font-mono">{bAnnual} {isRtl ? 'يوم' : 'days'}</td>
                      <td className="p-3 font-mono">{bCasual} {isRtl ? 'يوم' : 'days'}</td>
                      <td className="p-3 font-mono">{bSick} {isRtl ? 'يوم' : 'days'}</td>
                      <td className="p-3">
                        <button
                          onClick={() => {
                            const empAtt = attendanceRecords.filter((r) => r.employeeId === u.id);
                            const empLeaves = leaveRequests.filter((l) => l.employeeId === u.id);
                            const empBalances = leaveBalances.filter((b) => b.employeeId === u.id);
                            const empTasks = tasks.filter((t) => t.assigneeIds.includes(u.id));
                            const empKpi = kpiRecords.find((k) => k.employeeId === u.id && k.month === 9);
                            exportIndividualEmployeeDossierCSV(u, empAtt, empLeaves, empBalances, empTasks, empKpi);
                          }}
                          className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{isRtl ? 'تنزيل ملفه' : 'Export Dossier'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeReport === 'kpi' && (
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="p-3 text-start">Code</th>
                  <th className="p-3 text-start">Employee</th>
                  <th className="p-3 text-start">Attendance (20%)</th>
                  <th className="p-3 text-start">Work (40%)</th>
                  <th className="p-3 text-start">Behavior (20%)</th>
                  <th className="p-3 text-start">Self-Dev (20%)</th>
                  <th className="p-3 text-start">Total (100%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => {
                  const k = kpiRecords.find((rec) => rec.employeeId === u.id);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-blue-700">{u.employeeCode}</td>
                      <td className="p-3 font-bold text-slate-900">{isRtl ? u.nameAr : u.nameEn}</td>
                      <td className="p-3 font-mono">{k?.attendanceScore.scoreOutOfWeight ?? 18.5}</td>
                      <td className="p-3 font-mono">{k?.workScore.scoreOutOfWeight ?? 37.0}</td>
                      <td className="p-3 font-mono">{k?.behaviorScore.scoreOutOfWeight ?? 19.0}</td>
                      <td className="p-3 font-mono">{k?.selfDevScore.scoreOutOfWeight ?? 18.0}</td>
                      <td className="p-3 font-mono font-black text-blue-900">{k?.totalScore ?? 92.5}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeReport === 'tasks' && (
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="p-3 text-start">Project Name</th>
                  <th className="p-3 text-start">Task Title</th>
                  <th className="p-3 text-start">Department</th>
                  <th className="p-3 text-start">Progress</th>
                  <th className="p-3 text-start">Status</th>
                  <th className="p-3 text-start">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="p-3 font-bold text-slate-900">{t.projectName}</td>
                    <td className="p-3 text-slate-800">{t.title}</td>
                    <td className="p-3 font-mono uppercase text-slate-500">{t.departmentId}</td>
                    <td className="p-3 font-bold text-blue-700">{t.progressPercent}%</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">{t.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'audit' && (
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="p-3 text-start">Timestamp</th>
                  <th className="p-3 text-start">User</th>
                  <th className="p-3 text-start">Module</th>
                  <th className="p-3 text-start">Action</th>
                  <th className="p-3 text-start">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.slice(0, 15).map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70">
                    <td className="p-3 font-mono text-slate-500">{a.timestamp}</td>
                    <td className="p-3 font-bold text-slate-900">{a.userName}</td>
                    <td className="p-3 font-mono uppercase text-blue-700">{a.module}</td>
                    <td className="p-3 font-semibold text-slate-800">{a.action}</td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">{a.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
