import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Holiday, WorkSchedule } from '../../types';
import { Calendar, Clock, Pencil, Plus, Save, Trash2, X } from 'lucide-react';

const blankSchedule = (): Omit<WorkSchedule, 'id'> => ({
  nameEn: '', nameAr: '', requiredDailyHours: 8, officialStartTime: '09:00', officialEndTime: '17:00', breakDurationMinutes: 60, gracePeriodMinutes: 15, workingDays: [0, 1, 2, 3, 4],
});

export const SchedulesHolidaysView: React.FC = () => {
  const { workSchedules, holidays, addHoliday, updateHoliday, deleteHoliday, addWorkSchedule, updateWorkSchedule, deleteWorkSchedule } = useData();
  const { t, isRtl } = useLanguage();
  const { isFullAccessUser } = useAuth();
  const [holidayEditor, setHolidayEditor] = useState<Holiday | Omit<Holiday, 'id'> | null>(null);
  const [scheduleEditor, setScheduleEditor] = useState<WorkSchedule | Omit<WorkSchedule, 'id'> | null>(null);
  const activeSchedules = workSchedules.filter((schedule) => !schedule.archivedAt);
  const activeHolidays = holidays.filter((holiday) => !holiday.archivedAt);

  const saveHoliday = (event: React.FormEvent) => {
    event.preventDefault();
    if (!holidayEditor || !holidayEditor.nameEn.trim()) return;
    if ('id' in holidayEditor) updateHoliday(holidayEditor);
    else addHoliday({ ...holidayEditor, nameAr: holidayEditor.nameAr || holidayEditor.nameEn });
    setHolidayEditor(null);
  };
  const saveSchedule = (event: React.FormEvent) => {
    event.preventDefault();
    if (!scheduleEditor || !scheduleEditor.nameEn.trim()) return;
    if ('id' in scheduleEditor) updateWorkSchedule(scheduleEditor);
    else addWorkSchedule({ ...scheduleEditor, nameAr: scheduleEditor.nameAr || scheduleEditor.nameEn });
    setScheduleEditor(null);
  };
  const confirmDeleteSchedule = (schedule: WorkSchedule) => {
    if (!window.confirm(`Archive the schedule "${schedule.nameEn}"? It will be retained in company records. Assigned employees must be moved first.`)) return;
    if (!deleteWorkSchedule(schedule.id)) window.alert('This schedule is assigned to an employee, or it is the last active schedule. Reassign employees first.');
  };

  return <div className="space-y-6">
    <header className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      <div><div className="flex items-center gap-2 mb-1"><Calendar className="w-5 h-5 text-blue-600" /><h1 className="text-xl font-bold text-slate-900">{t('navSchedules')}</h1></div><p className="text-xs text-slate-500">{isRtl ? 'إدارة جداول الدوام والعطلات الرسمية. كل تغيير يُسجّل في سجل التدقيق.' : 'Manage work schedules and official holidays. Every change is recorded in the audit log.'}</p></div>
      {isFullAccessUser && <div className="flex gap-2"><button onClick={() => setScheduleEditor(blankSchedule())} className="px-4 py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold text-xs flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Add schedule</button><button onClick={() => setHolidayEditor({ nameEn: '', nameAr: '', date: new Date().toISOString().slice(0, 10), isRecurring: false })} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />Add holiday</button></div>}
    </header>

    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">{activeSchedules.map((schedule) => <article key={schedule.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3 text-xs"><div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2"><div><h3 className="font-bold text-slate-900 text-sm">{isRtl ? schedule.nameAr : schedule.nameEn}</h3><p className="text-slate-400 mt-0.5">{schedule.workingDays.length} working days · {schedule.requiredDailyHours}h/day</p></div>{isFullAccessUser && <div className="flex gap-1"><button onClick={() => setScheduleEditor(schedule)} aria-label="Edit schedule" className="p-2 rounded-lg text-blue-700 hover:bg-blue-50"><Pencil className="w-4 h-4" /></button><button onClick={() => confirmDeleteSchedule(schedule)} aria-label="Archive schedule" className="p-2 rounded-lg text-amber-700 hover:bg-amber-50"><Trash2 className="w-4 h-4" /></button></div>}</div><div className="grid grid-cols-2 gap-3 text-slate-600"><Metric label="Start" value={schedule.officialStartTime} /><Metric label="End" value={schedule.officialEndTime} /><Metric label="Break" value={`${schedule.breakDurationMinutes} mins`} /><Metric label="Grace" value={`${schedule.gracePeriodMinutes} mins`} /></div></article>)}</section>

    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"><div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between"><h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Official holidays</h3><span className="text-xs text-slate-400">{activeHolidays.length} holidays</span></div><div className="overflow-x-auto"><table className="w-full text-xs text-start"><thead className="bg-slate-50 border-b border-slate-200 text-slate-500"><tr><th className="p-3 text-start">Date</th><th className="p-3 text-start">Name (EN)</th><th className="p-3 text-start">Name (AR)</th><th className="p-3 text-start">Repeat</th>{isFullAccessUser && <th className="p-3 text-end">Actions</th>}</tr></thead><tbody className="divide-y divide-slate-100">{activeHolidays.map((holiday) => <tr key={holiday.id} className="hover:bg-slate-50/70"><td className="p-3 font-mono font-bold text-blue-700">{holiday.date}</td><td className="p-3 font-semibold text-slate-900">{holiday.nameEn}</td><td className="p-3 font-semibold text-slate-900">{holiday.nameAr}</td><td className="p-3 text-slate-600">{holiday.isRecurring ? 'Annual' : 'One time'}</td>{isFullAccessUser && <td className="p-3"><div className="flex justify-end gap-1"><button onClick={() => setHolidayEditor(holiday)} className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg" aria-label="Edit holiday"><Pencil className="w-4 h-4" /></button><button onClick={() => { if (window.confirm(`Archive "${holiday.nameEn}"? It will be retained in company records.`)) deleteHoliday(holiday.id); }} className="p-2 text-amber-700 hover:bg-amber-50 rounded-lg" aria-label="Archive holiday"><Trash2 className="w-4 h-4" /></button></div></td>}</tr>)}</tbody></table></div></section>

    {holidayEditor && <Modal title={'id' in holidayEditor ? 'Edit holiday' : 'Add holiday'} onClose={() => setHolidayEditor(null)}><form onSubmit={saveHoliday} className="space-y-3"><Field label="Holiday name (English)" value={holidayEditor.nameEn} onChange={(value) => setHolidayEditor({ ...holidayEditor, nameEn: value })} required /><Field label="Holiday name (Arabic)" value={holidayEditor.nameAr} onChange={(value) => setHolidayEditor({ ...holidayEditor, nameAr: value })} /><Field label="Date" type="date" value={holidayEditor.date} onChange={(value) => setHolidayEditor({ ...holidayEditor, date: value })} required /><label className="flex gap-2 items-center text-xs font-semibold"><input type="checkbox" checked={holidayEditor.isRecurring} onChange={(event) => setHolidayEditor({ ...holidayEditor, isRecurring: event.target.checked })} />Repeat annually</label><Submit /></form></Modal>}
    {scheduleEditor && <Modal title={'id' in scheduleEditor ? 'Edit work schedule' : 'Add work schedule'} onClose={() => setScheduleEditor(null)}><form onSubmit={saveSchedule} className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Schedule name (English)" value={scheduleEditor.nameEn} onChange={(value) => setScheduleEditor({ ...scheduleEditor, nameEn: value })} required /><Field label="Schedule name (Arabic)" value={scheduleEditor.nameAr} onChange={(value) => setScheduleEditor({ ...scheduleEditor, nameAr: value })} /><Field label="Start time" type="time" value={scheduleEditor.officialStartTime} onChange={(value) => setScheduleEditor({ ...scheduleEditor, officialStartTime: value })} required /><Field label="End time" type="time" value={scheduleEditor.officialEndTime} onChange={(value) => setScheduleEditor({ ...scheduleEditor, officialEndTime: value })} required /><Field label="Required daily hours" type="number" value={String(scheduleEditor.requiredDailyHours)} onChange={(value) => setScheduleEditor({ ...scheduleEditor, requiredDailyHours: Number(value) })} required /><Field label="Break minutes" type="number" value={String(scheduleEditor.breakDurationMinutes)} onChange={(value) => setScheduleEditor({ ...scheduleEditor, breakDurationMinutes: Number(value) })} required /><Field label="Grace minutes" type="number" value={String(scheduleEditor.gracePeriodMinutes)} onChange={(value) => setScheduleEditor({ ...scheduleEditor, gracePeriodMinutes: Number(value) })} required /><div className="sm:col-span-2"><Submit /></div></form></Modal>}
  </div>;
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div><span className="text-slate-400 block">{label}</span><b className="font-mono text-slate-800">{value}</b></div>;
const Field: React.FC<{ label: string; value: string; type?: string; required?: boolean; onChange: (value: string) => void }> = ({ label, value, type = 'text', required, onChange }) => <label className="block text-xs font-semibold text-slate-700">{label}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-normal" /></label>;
const Submit = () => <button type="submit" className="w-full mt-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex justify-center gap-2"><Save className="w-4 h-4" />Save changes</button>;
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm"><div role="dialog" aria-modal="true" className="bg-white w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl p-4 sm:p-6 shadow-2xl"><div className="flex justify-between items-center border-b pb-3 mb-4"><h2 className="font-bold text-slate-900">{title}</h2><button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-900" aria-label="Close"><X className="w-5 h-5" /></button></div>{children}</div></div>;
