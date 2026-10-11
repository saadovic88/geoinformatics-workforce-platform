import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { Clock, CheckCircle, AlertTriangle, LogOut, ArrowRight, ShieldCheck } from 'lucide-react';

interface CheckOutSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLogoutFlow?: boolean;
}

export const CheckOutSummaryModal: React.FC<CheckOutSummaryModalProps> = ({
  isOpen,
  onClose,
  isLogoutFlow = false,
}) => {
  const { currentUser, completeLogout } = useAuth();
  const { todayAttendance, checkOut } = useData();
  const { t, isRtl } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  if (!isOpen) return null;

  const handlePerformCheckOut = async () => {
    setIsProcessing(true);
    try {
      const updated = await checkOut();
      setSummaryData(updated || todayAttendance);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = () => {
    if (isLogoutFlow) {
      completeLogout();
    } else {
      onClose();
    }
  };

  // If session is already closed or just closed, show numbers
  const record = summaryData || todayAttendance;
  const isAlreadyCheckedOut = !!record?.checkOutTime;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{t('dailySummary')}</h3>
                <p className="text-xs text-blue-200/80">
                  {isRtl ? currentUser.nameAr : currentUser.nameEn} ({currentUser.employeeCode})
                </p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-800/80 text-blue-200 border border-blue-700">
              {new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {!isAlreadyCheckedOut ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-slate-900">
                {isRtl ? 'هل تريد تسجيل الانصراف وحساب ساعات العمل الآن؟' : 'Ready to Check Out & Calculate Daily Hours?'}
              </h4>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                {isRtl
                  ? 'سيتم حساب صافي ساعات العمل، الساعات الأساسية، الإضافي (Overtime)، وفترة الاستراحة وفقاً لسياسة الشركة.'
                  : 'Total hours, break duration, regular working time and overtime will be computed automatically.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={handlePerformCheckOut}
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-sm hover:shadow"
                >
                  {isProcessing ? t('loading') : t('checkOut')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  {isRtl
                    ? 'تم تسجيل الانصراف بنجاح واحتساب إجمالي ساعات العمل لليوم.'
                    : 'Attendance check-out successfully recorded with automated hour calculation.'}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block mb-1">{t('checkedInAt')}</span>
                  <span className="font-bold text-slate-800 text-base">{record?.checkInTime || '--:--'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 block mb-1">{t('checkedOutAt')}</span>
                  <span className="font-bold text-slate-800 text-base">{record?.checkOutTime || '--:--'}</span>
                </div>
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                  <span className="text-xs text-blue-700 font-medium block mb-1">{t('netHours')}</span>
                  <span className="font-bold text-blue-900 text-lg">
                    {record?.netWorkedHours ?? 0} <span className="text-xs font-normal">{isRtl ? 'ساعة' : 'hrs'}</span>
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <span className="text-xs text-emerald-700 font-medium block mb-1">{t('overtimeHours')}</span>
                  <span className="font-bold text-emerald-900 text-lg">
                    {record?.overtimeHours ?? 0} <span className="text-xs font-normal">{isRtl ? 'ساعة' : 'hrs'}</span>
                  </span>
                </div>
              </div>

              {/* Secondary details */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between items-center">
                  <span>{t('breakTime')}:</span>
                  <span className="font-medium text-slate-800">{record?.breakDurationMinutes ?? 60} mins</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{t('lateMinutes')}:</span>
                  <span className={`font-medium ${record?.lateMinutes > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                    {record?.lateMinutes ?? 0} mins
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{t('earlyMinutes')}:</span>
                  <span className={`font-medium ${record?.earlyLeaveMinutes > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                    {record?.earlyLeaveMinutes ?? 0} mins
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span>{t('geofenceStatus')}:</span>
                  <span className="font-medium text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {record?.status ? t(record.status as any) : t('withinZone')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          {isAlreadyCheckedOut && (
            <button
              onClick={handleFinish}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition flex items-center gap-2 text-sm shadow-sm"
            >
              {isLogoutFlow ? (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>{t('signOut')}</span>
                </>
              ) : (
                <span>{t('confirm')}</span>
              )}
            </button>
          )}

          {!isAlreadyCheckedOut && (
            <button
              onClick={() => {
                if (isLogoutFlow) completeLogout();
                else onClose();
              }}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition"
            >
              {isLogoutFlow ? (isRtl ? 'تسجيل خروج دون انصراف' : 'Sign Out Without Checkout') : t('cancel')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
