import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { AttendanceRecord } from '../../types';
import {
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Filter,
  Search,
  Download,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Check,
  X,
} from 'lucide-react';
import { LeafletMap } from '../common/LeafletMap';
import { exportToCSV } from '../../utils/exportUtils';
import { UserAvatar } from '../common/UserAvatar';

export const AttendanceDashboard: React.FC = () => {
  const { users, currentUser, isFullAccessUser } = useAuth();
  const {
    attendanceRecords,
    geofenceZones,
    todayAttendance,
    checkIn,
    checkOut,
    resolveAttendanceException,
  } = useData();
  const { t, isRtl } = useLanguage();

  const [searchEmployee, setSearchEmployee] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedException, setSelectedException] = useState<AttendanceRecord | null>(null);
  const [exceptionNotes, setExceptionNotes] = useState('');

  const filteredRecords = attendanceRecords.filter((rec) => {
    const emp = users.find((u) => u.id === rec.employeeId);
    const matchesSearch =
      !searchEmployee ||
      emp?.nameEn.toLowerCase().includes(searchEmployee.toLowerCase()) ||
      emp?.nameAr.includes(searchEmployee) ||
      emp?.employeeCode.toLowerCase().includes(searchEmployee.toLowerCase());
    const matchesStatus = statusFilter === 'all' || rec.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportAttendance = () => {
    const headers = [
      'Date',
      'Employee Code',
      'Employee Name',
      'Check In',
      'Check Out',
      'Net Hours',
      'Overtime',
      'Late (Mins)',
      'Status',
      'Distance (Meters)',
    ];
    const rows = filteredRecords.map((r) => {
      const emp = users.find((u) => u.id === r.employeeId);
      return [
        r.date,
        emp?.employeeCode || '',
        isRtl ? emp?.nameAr || '' : emp?.nameEn || '',
        r.checkInTime,
        r.checkOutTime || '--',
        r.netWorkedHours,
        r.overtimeHours,
        r.lateMinutes,
        t(r.status as any),
        r.distanceMeters ?? 0,
      ];
    });
    exportToCSV(`Geoinformatics_Attendance_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const handleConfirmException = (decision: 'approved' | 'rejected') => {
    if (!selectedException) return;
    resolveAttendanceException(selectedException.id, decision, exceptionNotes);
    setSelectedException(null);
    setExceptionNotes('');
  };

  const canReview = isFullAccessUser || currentUser.roleId === 'admin_manager' || currentUser.roleId === 'hr_officer';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">{t('navAttendance')}</h1>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
              {attendanceRecords.length} {isRtl ? 'سجلاً' : 'Records'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {isRtl
              ? 'متابعة الحضور والانصراف، التحقق من نطاق الـ 500 متر الجغرافي، واحتساب ساعات العمل الإضافي.'
              : 'Real-time attendance tracking, 500m geofence validation, and overtime engine.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportAttendance}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('exportCsv')}</span>
          </button>
        </div>
      </div>

      {/* Geofence Map Overview Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-slate-800 text-sm">
              {isRtl ? 'خريطة النطاقات الجغرافية ومواقع تسجيل الحضور' : 'Geofence Zones & Attendance Telemetry'}
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              {isRtl ? geofenceZones[0]?.nameAr : geofenceZones[0]?.nameEn} (500m)
            </span>
            <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              {isRtl ? geofenceZones[1]?.nameAr : geofenceZones[1]?.nameEn} (500m)
            </span>
          </div>
        </div>

        <LeafletMap
          zones={geofenceZones}
          userLat={todayAttendance?.checkInLatitude ?? 30.0444}
          userLon={todayAttendance?.checkInLongitude ?? 31.2357}
          height="280px"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className={`w-4 h-4 text-slate-400 absolute top-2.5 ${isRtl ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            placeholder={isRtl ? 'بحث باسم الموظف أو الكود...' : 'Search employee name or code...'}
            value={searchEmployee}
            onChange={(e) => setSearchEmployee(e.target.value)}
            className={`w-full py-1.5 ${
              isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
            } rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-hidden`}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['all', 'present_inside', 'remote_approved', 'external_approved', 'outside_review', 'late'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? t('all') : t(st as any)}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3 text-start">{t('date')}</th>
                <th className="p-3 text-start">{isRtl ? 'الموظف' : 'Employee'}</th>
                <th className="p-3 text-start">{t('checkedInAt')}</th>
                <th className="p-3 text-start">{t('checkedOutAt')}</th>
                <th className="p-3 text-start">{t('netHours')}</th>
                <th className="p-3 text-start">{t('overtimeHours')}</th>
                <th className="p-3 text-start">{t('lateMinutes')}</th>
                <th className="p-3 text-start">{t('geofenceStatus')}</th>
                <th className="p-3 text-start">{t('status')}</th>
                <th className="p-3 text-start">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    {isRtl ? 'لا توجد سجلات حضور تطابق معايير البحث الحالية.' : 'No attendance records match your filter criteria.'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const emp = users.find((u) => u.id === rec.employeeId);
                  const isOutside = rec.status === 'outside_review' || rec.status === 'outside_exception';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">{rec.date}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            src={emp?.avatarUrl}
                            name={emp ? (isRtl ? emp.nameAr : emp.nameEn) : ''}
                            size="sm"
                            rounded="full"
                          />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 block truncate">
                              {emp ? (isRtl ? emp.nameAr : emp.nameEn) : rec.employeeId}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {emp?.employeeCode}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono">{rec.checkInTime}</td>
                      <td className="p-3 font-mono">{rec.checkOutTime || '--:--'}</td>
                      <td className="p-3 font-bold text-blue-700">{rec.netWorkedHours}h</td>
                      <td className="p-3 font-bold text-emerald-700">
                        {rec.overtimeHours > 0 ? `+${rec.overtimeHours}h` : '0h'}
                      </td>
                      <td className="p-3">
                        {rec.lateMinutes > 0 ? (
                          <span className="text-amber-600 font-bold">{rec.lateMinutes}m</span>
                        ) : (
                          <span className="text-slate-400">0m</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {rec.distanceMeters !== undefined && (
                            <span
                              className={`font-semibold ${
                                rec.distanceMeters <= 500 ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {rec.distanceMeters}m
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {rec.distanceMeters !== undefined && rec.distanceMeters <= 500
                              ? '(Inside Zone)'
                              : '(Outside)'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            rec.status === 'present_inside'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'remote_approved'
                              ? 'bg-blue-100 text-blue-800'
                              : rec.status === 'external_approved'
                              ? 'bg-indigo-100 text-indigo-800'
                              : rec.status === 'outside_review'
                              ? 'bg-amber-100 text-amber-800'
                              : rec.status === 'late'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t(rec.status as any)}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {rec.status === 'outside_review' && canReview && (
                          <button
                            onClick={() => setSelectedException(rec)}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] shadow-xs"
                          >
                            {isRtl ? 'مراجعة الاستثناء' : 'Review Exception'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exception Review Modal for HR/Admins */}
      {selectedException && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 text-xs text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {isRtl ? 'مراجعة استثناء حضور خارج النطاق' : 'Review Outside-Zone Exception'}
                </h3>
              </div>
              <button onClick={() => setSelectedException(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 leading-relaxed">
              {isRtl
                ? `سجل الموظف الحضور على مسافة ${selectedException.distanceMeters || '7,400'} متر خارج النطاق. هل ترغب في اعتماد هذا الحضور كاستثناء رسمي (مهمة عمل) أو تحويله إلى غياب؟`
                : `Employee checked in ${selectedException.distanceMeters}m outside the 500m office zone. You can approve as authorized exception or reject.`}
            </p>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                {isRtl ? 'ملاحظات المراجعة وقرار الإدارة' : 'Manager / HR Review Notes'}
              </label>
              <textarea
                rows={3}
                value={exceptionNotes}
                onChange={(e) => setExceptionNotes(e.target.value)}
                placeholder={isRtl ? 'أدخل ملاحظات الموافقة أو سبب الرفض...' : 'Add reason for approval or rejection...'}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => handleConfirmException('rejected')}
                className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 font-bold hover:bg-rose-100 transition"
              >
                {t('reject')} (Mark Absent)
              </button>
              <button
                onClick={() => handleConfirmException('approved')}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
              >
                {t('approve')} (Authorize Exception)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
