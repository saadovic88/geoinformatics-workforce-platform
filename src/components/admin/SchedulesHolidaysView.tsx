import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { Calendar, Clock, Plus, CheckCircle } from 'lucide-react';

export const SchedulesHolidaysView: React.FC = () => {
  const { workSchedules, holidays, addHoliday } = useData();
  const { t, isRtl } = useLanguage();

  const [showAddHol, setShowAddHol] = useState(false);
  const [holNameEn, setHolNameEn] = useState('');
  const [holNameAr, setHolNameAr] = useState('');
  const [holDate, setHolDate] = useState('2026-10-06');

  const handleAddHolidaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holNameEn.trim()) return;
    addHoliday({
      nameEn: holNameEn,
      nameAr: holNameAr || holNameEn,
      date: holDate,
      isRecurring: true,
    });
    setShowAddHol(false);
    setHolNameEn('');
    setHolNameAr('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">{t('navSchedules')}</h1>
          </div>
          <p className="text-xs text-slate-500">
            {isRtl
              ? 'تحديد جداول الدوام الرسمي للشركة (8 ساعات يومياً) وسجل العطلات والإجازات الرسمية.'
              : 'Work schedules, required daily hours (8h default), grace periods, and official company holidays.'}
          </p>
        </div>

        <button
          onClick={() => setShowAddHol(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isRtl ? 'إضافة عطلة رسمية' : 'Add Holiday'}</span>
        </button>
      </div>

      {/* Schedules Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workSchedules.map((sched) => (
          <div key={sched.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm">{isRtl ? sched.nameAr : sched.nameEn}</h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
                {sched.requiredDailyHours}h / day
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-slate-600">
              <div>
                <span className="text-slate-400 block mb-0.5">{isRtl ? 'بداية الدوام:' : 'Official Start:'}</span>
                <span className="font-bold text-slate-800 text-sm font-mono">{sched.officialStartTime}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">{isRtl ? 'نهاية الدوام:' : 'Official End:'}</span>
                <span className="font-bold text-slate-800 text-sm font-mono">{sched.officialEndTime}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">{isRtl ? 'مدة الاستراحة:' : 'Break Duration:'}</span>
                <span className="font-bold text-slate-800 font-mono">{sched.breakDurationMinutes} {isRtl ? 'دقيقة' : 'mins'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">{isRtl ? 'فترة السماح:' : 'Grace Period:'}</span>
                <span className="font-bold text-emerald-700 font-mono">{sched.gracePeriodMinutes} {isRtl ? 'دقيقة' : 'mins'}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 pt-1">
              {isRtl
                ? 'أيام العمل الرسمية: الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس (أسبوع العمل المصري الرسمي).'
                : 'Working Days: Sunday, Monday, Tuesday, Wednesday, Thursday (Egyptian standard week).'}
            </p>
          </div>
        ))}
      </div>

      {/* Holidays List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            {isRtl ? 'قائمة العطلات الرسمية المعتمدة لعام 2026' : 'Official Recognized Holidays (2026)'}
          </h3>
          <span className="text-xs text-slate-400">{holidays.length} {isRtl ? 'عطلة رسمية' : 'Holidays'}</span>
        </div>

        <table className="w-full text-xs text-start">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
            <tr>
              <th className="p-3 text-start">{t('date')}</th>
              <th className="p-3 text-start">{isRtl ? 'اسم العطلة (إنجليزي)' : 'Holiday Name (EN)'}</th>
              <th className="p-3 text-start">{isRtl ? 'اسم العطلة (عربي)' : 'Holiday Name (AR)'}</th>
              <th className="p-3 text-start">{isRtl ? 'التصنيف' : 'Type'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {holidays.map((hol) => (
              <tr key={hol.id} className="hover:bg-slate-50/70">
                <td className="p-3 font-mono font-bold text-blue-700">{hol.date}</td>
                <td className="p-3 font-semibold text-slate-900">{hol.nameEn}</td>
                <td className="p-3 font-semibold text-slate-900">{hol.nameAr}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                    {isRtl ? 'عطلة رسمية معتمدة' : 'Official Public Holiday'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Holiday Modal */}
      {showAddHol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 text-xs text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Add Company Holiday</h3>
              <button onClick={() => setShowAddHol(false)}>✕</button>
            </div>

            <form onSubmit={handleAddHolidaySubmit} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Holiday Name (EN)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Revolution Day"
                  value={holNameEn}
                  onChange={(e) => setHolNameEn(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Holiday Name (AR)</label>
                <input
                  type="text"
                  placeholder="اسم العطلة بالعربية"
                  value={holNameAr}
                  onChange={(e) => setHolNameAr(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">{t('date')}</label>
                <input
                  type="date"
                  required
                  value={holDate}
                  onChange={(e) => setHolDate(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddHol(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
