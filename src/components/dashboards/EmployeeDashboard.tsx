import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Clock,
  MapPin,
  Calendar,
  CheckSquare,
  Award,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  Send,
  Plus,
} from 'lucide-react';
import { LeafletMap } from '../common/LeafletMap';
import { canSubmitOwnLeave } from '../../utils/leavePolicy';

interface EmployeeDashboardProps {
  onNavigate: (page: any) => void;
  onOpenCheckOutModal: () => void;
  onRequestLeave: () => void;
  onCreateTask: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  onNavigate,
  onOpenCheckOutModal,
  onRequestLeave,
  onCreateTask,
}) => {
  const { currentUser, hasPermission, isFullAccessUser } = useAuth();
  const { todayAttendance, checkIn, geofenceZones, tasks, kpiRecords } = useData();
  const { t, isRtl } = useLanguage();

  const [isSimulatingLocation, setIsSimulatingLocation] = useState(false);

  // My tasks
  // This is a personal workspace, regardless of rank. Executive work is shown
  // in ExecutiveDashboard instead of silently turning "My tasks" into every task.
  const myTasks = tasks.filter((t) => t.assigneeIds.includes(currentUser.id));
  const activeTasks = myTasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');

  // My current KPI record
  const myKpi = kpiRecords.find((k) => k.employeeId === currentUser.id && k.month === 9 && k.year === 2026);

  // Simulate outside zone check-in
  const handleSimulateOutsideZone = () => {
    // 7.5km away in Heliopolis
    checkIn({ latitude: 30.0821, longitude: 31.3204 });
  };

  const handleSimulateInsideZone = () => {
    // Exact Cairo HQ
    checkIn({ latitude: 30.0444, longitude: 31.2357 });
  };

  const isCheckedIn = !!todayAttendance;
  const isCheckedOut = !!todayAttendance?.checkOutTime;
  const canRequestLeave = canSubmitOwnLeave(currentUser);
  const canCreateTask = hasPermission('tasks', 'create');
  // Exact location telemetry is an operational control for the three named
  // company leaders only; validation continues silently for every employee.
  const canViewGeofenceTelemetry = isFullAccessUser;

  return (
    <div className="space-y-6">
      {/* Top Banner & Welcome */}
      <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              {currentUser.employeeCode}
            </span>
            <span className="text-xs text-blue-200">
              {isRtl ? currentUser.jobTitleAr : currentUser.jobTitleEn}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('welcomeBack')}, {isRtl ? currentUser.nameAr : currentUser.nameEn}
          </h1>
          <p className="text-xs text-slate-300 max-w-xl">
            {isRtl
              ? 'مرحباً بك في منصة القوى العاملة ومشاريع نظم المعلومات والاستشعار. يمكنك متابعة ساعات العمل، إنجاز المهام، ومؤشر الأداء.'
              : 'Workforce portal: monitor your attendance, GIS deliverables, and performance score.'}
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {canRequestLeave && <button
            onClick={onRequestLeave}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs border border-white/20 transition flex items-center gap-2 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t('requestLeaveBtn')}</span>
          </button>}
          {canCreateTask && <button
            onClick={onCreateTask}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('createTask')}</span>
          </button>}
        </div>
      </div>

      {/* Outside Geofence Alert Banner if outside zone */}
      {canViewGeofenceTelemetry && todayAttendance?.status === 'outside_review' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 flex-1">
            <p className="font-bold">{t('geofenceAlert')}</p>
            <p className="text-amber-800">
              {isRtl
                ? `تم تسجيل الحضور من على بعد ${todayAttendance.distanceMeters || '7,400'} متر من مقر الشركة. يتطلب هذا السجل مراجعة إدارة الموارد البشرية أو تقديم إذن عمل عن بُعد/ميداني.`
                : `Your check-in was registered ${todayAttendance.distanceMeters || '7,400'}m from the office geofence. Status: "Outside Zone - Requires Review".`}
            </p>
          </div>
          <button
            onClick={() => onNavigate('leaves_wfh_field')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 transition"
          >
            {isRtl ? 'طلب تصريح WFH' : 'Request WFH Permit'}
          </button>
        </div>
      )}

      {/* Grid: Attendance Quick Status & Geofence Map */}
      <div className={canViewGeofenceTelemetry ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : 'max-w-xl'}>
        {/* Attendance Action Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-slate-800 text-sm">{t('navMyAttendance')}</h2>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                isCheckedIn && !isCheckedOut
                  ? 'bg-emerald-100 text-emerald-800'
                  : isCheckedOut
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {todayAttendance?.status ? t(todayAttendance.status as any) : isRtl ? 'لم يتم الحضور بعد' : 'Not Checked In'}
            </span>
          </div>

          {/* Time & Hours Stats */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block mb-0.5">{t('checkedInAt')}</span>
              <span className="font-bold text-slate-800 text-sm">
                {todayAttendance?.checkInTime || '--:--'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block mb-0.5">{t('checkedOutAt')}</span>
              <span className="font-bold text-slate-800 text-sm">
                {todayAttendance?.checkOutTime || '--:--'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
              <span className="text-blue-700 font-semibold block mb-0.5">{t('netHours')}</span>
              <span className="font-bold text-blue-900 text-base">
                {todayAttendance?.netWorkedHours ?? 2.5} <span className="text-[10px] font-normal">/ 8h</span>
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-emerald-700 font-semibold block mb-0.5">{t('overtimeHours')}</span>
              <span className="font-bold text-emerald-900 text-base">
                {todayAttendance?.overtimeHours ?? 0} <span className="text-[10px] font-normal">hrs</span>
              </span>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            {!isCheckedIn ? (
              <button
                onClick={() => checkIn()}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                <span>{t('checkIn')}</span>
              </button>
            ) : !isCheckedOut ? (
              <button
                onClick={onOpenCheckOutModal}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                <span>{t('checkOut')} ({isRtl ? 'وعرض ملخص الساعات' : 'Show Hours Summary'})</span>
              </button>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs text-center font-medium">
                {isRtl ? 'تم إنهاء ساعات العمل لليوم بنجاح' : 'Daily attendance session completed.'}
              </div>
            )}
          </div>

          {/* Geofence Testing Simulation Tools */}
          {canViewGeofenceTelemetry && <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block mb-2">
              {isRtl ? 'أدوات اختبار السياج الجغرافي (تجربة عملية):' : 'Geofence Test Simulator (Demo):'}
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                onClick={handleSimulateInsideZone}
                className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 transition text-center"
              >
                {isRtl ? 'محاكاة: داخل المقر (25م)' : 'Simulate: Inside Zone (25m)'}
              </button>
              <button
                onClick={handleSimulateOutsideZone}
                className="px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold border border-amber-200 transition text-center"
              >
                {isRtl ? 'محاكاة: خارج النطاق (7.4كم)' : 'Simulate: Outside Zone (7.4km)'}
              </button>
            </div>
          </div>}
        </div>

        {/* Live Geofence Mini Map Card */}
        {canViewGeofenceTelemetry && <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-slate-800 text-sm">
                {isRtl ? 'نطاق السياج الجغرافي المعتمد (500 متر)' : 'Office Geofence Zone (500m Radius)'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                {todayAttendance?.distanceMeters !== undefined
                  ? `${todayAttendance.distanceMeters}m ${isRtl ? 'عن المقر' : 'from HQ'}`
                  : (isRtl ? 'ضمن نطاق 500م' : 'Within 500m')}
              </span>
              <button
                onClick={() => onNavigate('geofence_settings')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                {isRtl ? 'الإعدادات الكاملة' : 'Full Map'}
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[220px]">
            <LeafletMap
              zones={geofenceZones}
              userLat={todayAttendance?.checkInLatitude}
              userLon={todayAttendance?.checkInLongitude}
              height="230px"
            />
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              {isRtl ? geofenceZones[0]?.nameAr : geofenceZones[0]?.nameEn}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {isRtl ? 'الإحداثيات:' : 'Coordinates:'} {geofenceZones[0]?.latitude.toFixed(4)}, {geofenceZones[0]?.longitude.toFixed(4)}
            </span>
          </div>
        </div>}
      </div>

      {/* KPI Snapshot. Leave balances remain in the dedicated leave section. */}
      <div className="max-w-md">
        {/* Monthly KPI Score Card */}
        <div
          onClick={() => onNavigate('kpi_my')}
          className="bg-slate-900 p-4 rounded-2xl text-white shadow-sm cursor-pointer hover:bg-slate-800 hover:shadow-md transition space-y-2 border border-slate-800"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-200 font-medium">{t('monthlyKPIScore')}</span>
            <Award className="w-4 h-4 text-amber-300" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{myKpi?.totalScore ?? 94.5}%</span>
            <span className="text-xs text-emerald-300 font-bold flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +2.1%
            </span>
          </div>
          <p className="text-[11px] text-blue-200 truncate">
            {isRtl ? 'حضور 20% + مهام 40% + سلوك 20% + تطوير 20%' : 'Attendance 20% + Tasks 40% + Behavior 20% + Skills 20%'}
          </p>
        </div>
      </div>

      {/* Bottom Grid: Assigned Tasks & Recent Dual Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Tasks Widget */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-slate-800 text-sm">{t('navMyTasks')} ({activeTasks.length})</h2>
            </div>
            <button
              onClick={() => onNavigate('tasks_my')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              {isRtl ? 'عرض كل المهام' : 'View All'}
            </button>
          </div>

          <div className="space-y-3">
            {activeTasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                {isRtl ? 'لا توجد مهام جارية مكلف بها حالياً.' : 'No active tasks assigned.'}
              </p>
            ) : (
              activeTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  onClick={() => onNavigate('tasks_kanban')}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-sm truncate max-w-md">
                      {task.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                        task.priority === 'critical'
                          ? 'bg-rose-100 text-rose-700'
                          : task.priority === 'high'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-slate-500 truncate">{task.projectName}</p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'التسليم: ' : 'Due: '}{task.dueDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">{task.progressPercent}%</span>
                      <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${task.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Department-owned leave policy */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-slate-800 text-sm">{t('leaveApprovalWorkflow')}</h2>
          </div>

          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-2">
            <p className="font-bold">
              {isRtl ? 'سياسة الاعتماد حسب القسم:' : 'Department-owned approval:'}
            </p>
            <p className="text-[11px] leading-relaxed text-blue-800">
              {isRtl
                ? 'كل طلب يُرسل لمسؤول القسم فقط. محمد عمر ود. غادة حسابات مراقبة ولا يملكان أي صلاحية اعتماد.'
                : 'Each request goes to one accountable department owner only. Mohamed Omar and Dr. Ghada are monitoring-only and cannot approve requests.'}
            </p>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">{isRtl ? 'الإدارة: أ. عمرو الصغير' : 'Administration: Mr. Amr Elsagher'}</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {isRtl ? 'مسؤول القسم' : 'Department owner'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-medium text-slate-700">{isRtl ? 'التقنية/التدريب: بدر • GIS: سعد • الاستشعار: شريف' : 'Technical/training: Badr • GIS: Saad • Remote sensing: Sherif'}</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {isRtl ? 'توجيه تلقائي' : 'Automatic routing'}
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('leaves_requests')}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
          >
            {isRtl ? 'فتح الإجازات والأذونات' : 'Open Leaves & Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
};
