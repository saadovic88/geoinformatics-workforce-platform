import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { LeaveType, LeaveRequest } from '../../types';
import {
  ShieldCheck,
  Send,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserCheck,
  FileText,
  MapPin,
  Calendar,
  Building,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';

interface LeaveManagementProps {
  initialTab?: 'requests' | 'balances' | 'dual_approval' | 'wfh_field';
}

export const LeaveManagement: React.FC<LeaveManagementProps> = ({ initialTab = 'requests' }) => {
  const { currentUser, users, isFullAccessUser } = useAuth();
  const {
    leaveRequests,
    leaveBalances,
    createLeaveRequest,
    handleLeaveApproval,
    cancelLeaveRequest,
  } = useData();
  const { t, isRtl } = useLanguage();

  const [activeTab, setActiveTab] = useState<'requests' | 'balances' | 'dual_approval' | 'wfh_field'>(initialTab);
  const [showNewModal, setShowNewModal] = useState(false);

  // Form states
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationUnits, setDurationUnits] = useState(1);
  const [reason, setReason] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [contactWhileAway, setContactWhileAway] = useState('');
  // Field site specifics
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [siteLocation, setSiteLocation] = useState('');

  // Rejection/Approval comment input
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});

  // Balances for current user
  const myBalances = leaveBalances.filter((b) => b.employeeId === currentUser.id);
  const selectedBalance = myBalances.find((b) => b.leaveType === leaveType);
  const availableBal = selectedBalance ? selectedBalance.remaining : 21;
  const balanceAfter = Math.max(0, availableBal - durationUnits);

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    createLeaveRequest({
      employeeId: currentUser.id,
      leaveType,
      startDate,
      endDate,
      durationUnits: Number(durationUnits),
      unit: ['late_arrival', 'early_leave', 'short_hourly'].includes(leaveType) ? 'hours' : 'days',
      reason,
      handoverNotes,
      contactWhileAway,
      externalSiteDetails:
        leaveType === 'external_site'
          ? {
              clientName,
              projectName,
              siteLocation,
            }
          : undefined,
    });

    setShowNewModal(false);
    setReason('');
    setHandoverNotes('');
    setContactWhileAway('');
  };

  // Pending for dual approval
  const pendingDual = leaveRequests.filter(
    (r) => r.status === 'pending_approval' || r.status === 'partially_approved'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900">{t('navLeaves')}</h1>
          </div>
          <p className="text-xs text-slate-500">
            {isRtl
              ? 'إدارة الإجازات والأذونات مع مسار الاعتماد الثنائي الإلزامي (م. محمد عمر و د. غادة).'
              : 'Leave management with mandatory dual approval workflow (Eng. Mohamed Omar & Dr. Ghada).'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t('requestLeaveBtn')}</span>
          </button>
        </div>
      </div>

      {/* Mandatory Dual Approval Policy Notice */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white shadow-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 font-bold border border-white/10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-bold text-sm">{t('leaveApprovalWorkflow')}</h3>
            <p className="text-xs text-blue-200/80 max-w-2xl leading-relaxed">
              {t('approvalRequirementText')}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold">
            1. {t('approverOmar')}
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold">
            2. {t('approverGhada')}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === 'requests'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t('navLeaveRequests')} ({leaveRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('dual_approval')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'dual_approval'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>{t('navDualApproval')}</span>
          {pendingDual.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px]">
              {pendingDual.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('balances')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === 'balances'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t('navLeaveBalances')}
        </button>
        <button
          onClick={() => setActiveTab('wfh_field')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === 'wfh_field'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t('navWfhField')}
        </button>
      </div>

      {/* TAB 1: ALL LEAVE REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3 text-start">{isRtl ? 'الموظف' : 'Employee'}</th>
                    <th className="p-3 text-start">{t('requestType')}</th>
                    <th className="p-3 text-start">{isRtl ? 'المدة' : 'Duration'}</th>
                    <th className="p-3 text-start">{isRtl ? 'التواريخ' : 'Dates'}</th>
                    <th className="p-3 text-start">{t('reason')}</th>
                    <th className="p-3 text-start">{isRtl ? 'الاعتماد الثنائي' : 'Dual Signatures'}</th>
                    <th className="p-3 text-start">{t('status')}</th>
                    <th className="p-3 text-start">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveRequests.map((req) => {
                    const requester = users.find((u) => u.id === req.employeeId);
                    const isMyRequest = req.employeeId === currentUser.id;

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              src={requester?.avatarUrl}
                              name={requester ? (isRtl ? requester.nameAr : requester.nameEn) : ''}
                              size="sm"
                              rounded="full"
                            />
                            <div>
                              <span className="font-bold text-slate-900 block truncate">
                                {requester ? (isRtl ? requester.nameAr : requester.nameEn) : req.employeeId}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {requester?.employeeCode}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-semibold uppercase text-slate-800">
                          {req.leaveType.replace('_', ' ')}
                        </td>
                        <td className="p-3 font-bold text-blue-700">
                          {req.durationUnits} {req.unit}
                        </td>
                        <td className="p-3 whitespace-nowrap text-slate-600">
                          {req.startDate} {req.startDate !== req.endDate ? `→ ${req.endDate}` : ''}
                        </td>
                        <td className="p-3 max-w-xs truncate text-slate-600" title={req.reason}>
                          {req.reason}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="space-y-1 text-[11px]">
                            {req.approvalSteps.map((s, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-700 truncate max-w-[120px]">
                                  {s.approverName.split(' ')[0]}:
                                </span>
                                <span
                                  className={`font-bold ${
                                    s.status === 'approved'
                                      ? 'text-emerald-600'
                                      : s.status === 'rejected'
                                      ? 'text-rose-600'
                                      : 'text-amber-600'
                                  }`}
                                >
                                  {s.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              req.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.status === 'partially_approved'
                                ? 'bg-blue-100 text-blue-800'
                                : req.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : req.status === 'cancelled'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {req.status === 'partially_approved'
                              ? t('partiallyApprovedMsg')
                              : req.status === 'approved'
                              ? t('fullyApprovedMsg')
                              : req.status === 'rejected'
                              ? t('rejectedMsg')
                              : req.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {isMyRequest && req.status !== 'cancelled' && req.status !== 'rejected' && (
                            <button
                              onClick={() => cancelLeaveRequest(req.id)}
                              className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-semibold transition"
                            >
                              {t('cancel')}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DUAL APPROVAL CENTER */}
      {activeTab === 'dual_approval' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              {isRtl ? 'طلبات الإجازة والأذونات بانتظار التوقيع والاعتماد' : 'Pending Requests Requiring Signatures'}
            </h3>
            <span className="text-xs text-slate-500">
              {isRtl ? 'المستخدم الحالي: ' : 'Active User: '}<b>{isRtl ? currentUser.nameAr : currentUser.nameEn}</b> ({isRtl ? currentUser.jobTitleAr : currentUser.roleId})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingDual.length === 0 ? (
              <div className="col-span-2 p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                {isRtl
                  ? 'تمت معالجة كافة الطلبات من قبل م. محمد عمر ود. غادة.'
                  : 'All requests have been finalized by Eng. Mohamed Omar and Dr. Ghada.'}
              </div>
            ) : (
              pendingDual.map((req) => {
                const requester = users.find((u) => u.id === req.employeeId);
                const step1 = req.approvalSteps[0];
                const step2 = req.approvalSteps[1];

                // Permission rule: user cannot approve their own request!
                const isRequester = currentUser.id === req.employeeId;

                // Check which step currentUser can sign
                const canSignStep1 = isFullAccessUser || currentUser.id === step1?.approverId || currentUser.roleId === 'ceo';
                const canSignStep2 = isFullAccessUser || currentUser.id === step2?.approverId || currentUser.roleId === 'ceo';

                const notes = approvalNotes[req.id] || '';

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={requester?.avatarUrl}
                          name={requester ? (isRtl ? requester.nameAr : requester.nameEn) : ''}
                          size="md"
                          rounded="xl"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">
                            {requester ? (isRtl ? requester.nameAr : requester.nameEn) : 'Requester'}
                          </h4>
                          <p className="text-slate-400 text-[11px]">
                            {requester?.employeeCode} • {isRtl ? requester?.jobTitleAr : requester?.jobTitleEn}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold uppercase text-[10px]">
                        {req.leaveType} ({req.durationUnits} {req.unit})
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-slate-700">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">{isRtl ? 'الفترة الزمنية:' : 'Duration Period:'}</span>
                        <span className="font-semibold text-slate-900">{req.startDate} to {req.endDate}</span>
                      </div>
                      <p className="text-xs pt-1 text-slate-800"><b>{isRtl ? 'السبب:' : 'Reason:'}</b> {req.reason}</p>
                      {req.handoverNotes && (
                        <p className="text-[11px] text-slate-500"><b>{isRtl ? 'تسليم المهام:' : 'Handover:'}</b> {req.handoverNotes}</p>
                      )}
                    </div>

                    {/* Dual Approvers Status Boxes */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {/* Step 1: Omar */}
                      <div
                        className={`p-2.5 rounded-xl border ${
                          step1?.status === 'approved'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-amber-50/70 border-amber-200 text-amber-800'
                        }`}
                      >
                        <span className="font-bold block truncate">{step1?.approverName}</span>
                        <span className="text-[10px] block mt-0.5">
                          {isRtl ? 'الحالة: ' : 'Status: '}
                          <b>{step1?.status === 'approved' ? (isRtl ? 'معتمد' : 'APPROVED') : (isRtl ? 'معلق' : 'PENDING')}</b>
                        </span>
                        {step1?.notes && <p className="text-[10px] text-slate-500 italic mt-1">"{step1.notes}"</p>}
                      </div>

                      {/* Step 2: Ghada */}
                      <div
                        className={`p-2.5 rounded-xl border ${
                          step2?.status === 'approved'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-amber-50/70 border-amber-200 text-amber-800'
                        }`}
                      >
                        <span className="font-bold block truncate">{step2?.approverName}</span>
                        <span className="text-[10px] block mt-0.5">
                          {isRtl ? 'الحالة: ' : 'Status: '}
                          <b>{step2?.status === 'approved' ? (isRtl ? 'معتمد' : 'APPROVED') : (isRtl ? 'معلق' : 'PENDING')}</b>
                        </span>
                        {step2?.notes && <p className="text-[10px] text-slate-500 italic mt-1">"{step2.notes}"</p>}
                      </div>
                    </div>

                    {/* Action Controls for Approvers */}
                    {!isRequester ? (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <input
                          type="text"
                          placeholder={isRtl ? 'ملاحظات الموافقة أو الرفض...' : 'Signatory remarks or reason...'}
                          value={notes}
                          onChange={(e) =>
                            setApprovalNotes({ ...approvalNotes, [req.id]: e.target.value })
                          }
                          className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                        />

                        <div className="grid grid-cols-2 gap-2">
                          {/* Sign as Step 1 (Eng. Omar) */}
                          <div className="flex gap-1">
                            <button
                              disabled={step1?.status === 'approved'}
                              onClick={() => handleLeaveApproval(req.id, step1.approverId, 'approved', notes)}
                              className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] shadow-xs"
                            >
                              {isRtl ? 'توقيع م. عمر ✓' : 'Sign as Omar ✓'}
                            </button>
                            <button
                              disabled={step1?.status === 'approved'}
                              onClick={() => handleLeaveApproval(req.id, step1.approverId, 'rejected', notes)}
                              className="px-2 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px]"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Sign as Step 2 (Dr. Ghada) */}
                          <div className="flex gap-1">
                            <button
                              disabled={step2?.status === 'approved'}
                              onClick={() => handleLeaveApproval(req.id, step2.approverId, 'approved', notes)}
                              className="flex-1 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-[11px] shadow-xs"
                            >
                              {isRtl ? 'توقيع د. غادة ✓' : 'Sign as Ghada ✓'}
                            </button>
                            <button
                              disabled={step2?.status === 'approved'}
                              onClick={() => handleLeaveApproval(req.id, step2.approverId, 'rejected', notes)}
                              className="px-2 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px]"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg italic">
                        {isRtl
                          ? 'لا يمكنك اعتماد طلبك الخاص؛ في انتظار توقيع الشركاء المؤسسين.'
                          : 'You cannot sign off on your own leave request.'}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LEAVE BALANCES */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {myBalances.map((bal, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                  {bal.leaveType} Leave
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{bal.remaining}</span>
                  <span className="text-xs text-slate-400">/ {bal.entitlement} {bal.unit}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${(bal.remaining / bal.entitlement) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                  <span>Used: {bal.used}</span>
                  <span>Pending: {bal.pending}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: WFH & FIELD PERMITS */}
      {activeTab === 'wfh_field' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {isRtl ? 'تصاريح العمل عن بُعد والمهام الميدانية' : 'Remote Work & External Field Site Permissions'}
              </h3>
              <p className="text-slate-500 text-xs">
                {isRtl
                  ? 'التصاريح المعتمدة تمنع تلقائياً مخالفة النطاق الجغرافي (500م) وتسجل الحضور كنظامي.'
                  : 'Approved requests automatically permit check-in from outside office geofence without attendance penalty.'}
              </p>
            </div>
            <button
              onClick={() => {
                setLeaveType('wfh');
                setShowNewModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              + {isRtl ? 'طلب تصريح جديد' : 'New Permit'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leaveRequests
              .filter((r) => r.leaveType === 'wfh' || r.leaveType === 'external_site')
              .map((permit) => {
                const requester = users.find((u) => u.id === permit.employeeId);
                return (
                  <div key={permit.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {requester ? (isRtl ? requester.nameAr : requester.nameEn) : permit.employeeId}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          permit.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {permit.status.toUpperCase()}
                      </span>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">
                      {permit.leaveType.replace('_', ' ')}
                    </span>
                    <p className="text-slate-600 text-[11px]">{permit.reason}</p>
                    {permit.externalSiteDetails && (
                      <div className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] space-y-0.5">
                        <p><b>Client:</b> {permit.externalSiteDetails.clientName}</p>
                        <p><b>Site:</b> {permit.externalSiteDetails.siteLocation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* REQUEST LEAVE MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 text-xs text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">{t('requestLeaveBtn')}</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="space-y-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t('requestType')}</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium"
                >
                  <option value="annual">Annual Leave (إجازة اعتيادية)</option>
                  <option value="casual">Casual / Daily Leave (إجازة عارضة)</option>
                  <option value="sick">Sick Leave (إجازة مرضية)</option>
                  <option value="emergency">Emergency Leave (إجازة طارئة)</option>
                  <option value="wfh">Work From Home (عمل عن بُعد - يمنع مخالفة السياج)</option>
                  <option value="external_site">External Site / Field Work (مهمة موقع ميداني)</option>
                  <option value="late_arrival">Late Arrival Permission (إذن تأخير رسمي)</option>
                  <option value="early_leave">Early Leave Permission (إذن انصراف مبكر)</option>
                  <option value="short_hourly">Short Hourly Permission (إذن ساعي)</option>
                </select>
              </div>

              {/* Dynamic Balance Indicator */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block">{isRtl ? 'الرصيد المتاح:' : 'Available Balance:'}</span>
                  <span className="font-bold text-blue-900">{availableBal} {isRtl ? 'يوم' : 'days'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isRtl ? 'المدة المطلوبة:' : 'Requested:'}</span>
                  <span className="font-bold text-slate-900">{durationUnits} {isRtl ? (['late_arrival', 'early_leave', 'short_hourly'].includes(leaveType) ? 'ساعة' : 'يوم') : (['late_arrival', 'early_leave', 'short_hourly'].includes(leaveType) ? 'hours' : 'days')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isRtl ? 'الرصيد بعد الخصم:' : 'Balance After Approval:'}</span>
                  <span className="font-bold text-emerald-700">{balanceAfter} {isRtl ? 'يوم' : 'days'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t('startDate')}</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t('endDate')}</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Duration Units ({['late_arrival', 'early_leave', 'short_hourly'].includes(leaveType) ? 'Hours' : 'Days'})
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={durationUnits}
                  onChange={(e) => setDurationUnits(parseFloat(e.target.value) || 1)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              {leaveType === 'external_site' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block">External Field Work Specifics</span>
                  <input
                    type="text"
                    placeholder="Client Name (e.g. Survey Authority)"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full p-2 rounded-lg bg-white border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Project Name (e.g. Cadastral Boundary Survey)"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full p-2 rounded-lg bg-white border border-slate-200 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Site Location / Coordinates"
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value)}
                    className="w-full p-2 rounded-lg bg-white border border-slate-200 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t('reason')}</label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain justification for leave or permit..."
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t('handoverPlan')}</label>
                <input
                  type="text"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Task handover details during absence..."
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                <b>{isRtl ? 'تنبيه الاعتماد الثنائي:' : 'Dual Approval Notice:'}</b>{' '}
                {isRtl
                  ? 'سيتم تحويل هذا الطلب آلياً إلى كلا الشريكين المؤسسين (م. محمد عمر و د. غادة) للاعتماد.'
                  : 'This request will be routed to both Eng. Mohamed Omar and Dr. Ghada.'}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
                >
                  {isRtl ? 'إرسال الطلب للاعتماد الثنائي' : 'Submit for Dual Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
