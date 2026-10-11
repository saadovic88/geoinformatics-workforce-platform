import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { Lock, Mail, Globe, CheckCircle, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { CompanyLogo } from '../common/CompanyLogo';
import { supabase } from '../../lib/supabase';

export const LoginView: React.FC = () => {
  const { login, users, setCurrentUser } = useAuth();
  const { t, language, setLanguage, isRtl } = useLanguage();

  const [username, setUsername] = useState('dr.badawy');
  const [password, setPassword] = useState('••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [forgotModal, setForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const success = await login(username, password);
    if (!success) {
      setErrorMessage(
        isRtl
          ? 'بيانات الدخول غير صحيحة، يرجى التحقق من اسم المستخدم أو البريد الإلكتروني.'
          : 'Invalid credentials. Please enter a valid username, email, or employee code.'
      );
    }
  };

  const handleQuickDemoLogin = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetSuccess(true);
    setTimeout(() => {
      setResetSuccess(false);
      setForgotModal(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white">
      {/* Top right language switch */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
        >
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </button>
      </div>

      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <CompanyLogo size="xl" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">GEOINFORMATICS</h1>
            <p className="text-xs text-blue-300/80 font-medium max-w-xs mx-auto mt-1">
              {isRtl
                ? 'منظومة إدارة القوى العاملة، الحضور والسياج الجغرافي، ومؤشرات الأداء'
                : 'Workforce, Geofencing, Dual Approval Leaves & KPI Performance Platform'}
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-xs text-slate-300">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white">{t('loginTitle')}</h2>
            <p className="text-slate-400 text-[11px]">{t('loginSubtitle')}</p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                {t('usernameOrEmail')}
              </label>
              <div className="relative">
                <Mail className={`w-4 h-4 text-slate-500 absolute top-3 ${isRtl ? 'right-3' : 'left-3'}`} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. dr.badawy or m.badawy@geoinformatics.com"
                  className={`w-full py-2.5 ${
                    isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
                  } rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-hidden focus:border-blue-500`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-300">{t('password')}</label>
                <button
                  type="button"
                  onClick={() => setForgotModal(true)}
                  className="text-blue-400 hover:text-blue-300 text-[11px]"
                >
                  {t('forgotPassword')}
                </button>
              </div>
              <div className="relative">
                <Lock className={`w-4 h-4 text-slate-500 absolute top-3 ${isRtl ? 'right-3' : 'left-3'}`} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full py-2.5 ${
                    isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'
                  } rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-hidden focus:border-blue-500`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                />
                <span className="text-slate-400 text-xs">{t('rememberMe')}</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2"
            >
              <span>{t('signIn')}</span>
              <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          </form>

          {/* Quick Demo Role Clickers are intentionally unavailable with production authentication. */}
          {!supabase && <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              {isRtl ? 'دخول سريع لتجربة الأدوار (1-Click Demo):' : 'Quick 1-Click Role Login Demo:'}
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('emp_badawy')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-start text-blue-400 font-semibold border border-slate-800 truncate"
              >
                {isRtl ? '1. د. محمد بدوي (الرئيس التنفيذي)' : '1. Dr. Badawy (CEO)'}
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('emp_omar')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-start text-emerald-400 font-semibold border border-slate-800 truncate"
              >
                {isRtl ? '2. م. محمد عمر (مؤسس شريك)' : '2. Eng. Omar (Co-Founder)'}
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('emp_ghada')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-start text-purple-400 font-semibold border border-slate-800 truncate"
              >
                {isRtl ? '3. د. غادة (مؤسس شريك)' : '3. Dr. Ghada (Co-Founder)'}
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('emp_barghouth')}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-start text-amber-400 font-semibold border border-slate-800 truncate"
              >
                {isRtl ? '4. م. سعد برغوث (مدير GIS)' : '4. Saad (GIS Manager)'}
              </button>
            </div>
          </div>}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-xs text-slate-300 space-y-4">
            <h3 className="text-base font-bold text-white">{t('resetPassword')}</h3>
            <p className="text-slate-400 leading-relaxed">
              {isRtl
                ? 'أدخل بريدك الإلكتروني المؤسسي لتلقي تعليمات ورابط إعادة تعيين كلمة المرور.'
                : 'Enter your work email address to receive password reset instructions.'}
            </p>

            {resetSuccess ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-center font-bold">
                {isRtl ? 'تم إرسال رابط إعادة الضبط إلى بريدك الإلكتروني المسجل.' : 'Reset link dispatched to registered email.'}
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="name@geoinformatics.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModal(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                  >
                    {isRtl ? 'إرسال التعليمات' : 'Send Instructions'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
