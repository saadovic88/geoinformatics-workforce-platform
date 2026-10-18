import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Bell,
  Globe,
  LogOut,
  MapPin,
  Clock,
  CheckCircle2,
  ChevronDown,
  UserCheck,
  Building2,
  AlertCircle,
  Menu,
  Sun,
  Moon,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { CompanyLogo } from '../common/CompanyLogo';
import { UserAvatar } from '../common/UserAvatar';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenCheckOutModal?: () => void;
  onNotificationAction?: (actionUrl?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onOpenCheckOutModal, onNotificationAction }) => {
  const { currentUser, users, logout } = useAuth();
  const { todayAttendance, checkIn, notifications, markNotificationRead, markAllNotificationsRead } = useData();
  const { language, setLanguage, t, isRtl } = useLanguage();
  const { isDark, toggleTheme } = useTheme();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(() => localStorage.getItem('geo_notification_sound') !== 'off');
  const knownUnreadIds = useRef<Set<string> | null>(null);
  const notificationAudioContext = useRef<AudioContext | null>(null);
  const notificationAudioUnlocked = useRef(false);

  // Notifications are private to the intended recipient (or company-wide).
  const visibleNotifications = notifications.filter((n) => n.userId === currentUser.id || n.userId === 'all');
  const unreadNotifs = visibleNotifications.filter((n) => !n.isRead);

  const getNotificationAudioContext = () => {
    if (!notificationAudioContext.current) {
      notificationAudioContext.current = new AudioContext();
    }
    return notificationAudioContext.current;
  };

  // Chrome/Edge intentionally block audio created outside a user gesture.
  // Unlock it once when the employee first touches the application so every
  // later workflow alert can sound even while the notification menu is shut.
  const unlockNotificationAudio = async () => {
    try {
      const context = getNotificationAudioContext();
      if (context.state === 'suspended') await context.resume();
      notificationAudioUnlocked.current = context.state === 'running';
    } catch {
      notificationAudioUnlocked.current = false;
    }
  };

  useEffect(() => {
    const unlock = () => { void unlockNotificationAudio(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const playNotificationTone = () => {
    try {
      if (!notificationAudioUnlocked.current) return;
      const context = getNotificationAudioContext();
      if (context.state !== 'running') return;
      const now = context.currentTime;
      [880, 1174].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.12);
        gain.gain.setValueAtTime(0.0001, now + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.075, now + index * 0.12 + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.35);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + index * 0.12);
        oscillator.stop(now + index * 0.12 + 0.37);
      });
    } catch {
      // Browsers may defer audio until an interaction; notifications still work normally.
    }
  };

  const toggleNotificationSound = () => {
    const nextValue = !notificationSoundEnabled;
    setNotificationSoundEnabled(nextValue);
    localStorage.setItem('geo_notification_sound', nextValue ? 'on' : 'off');
    if (nextValue) void unlockNotificationAudio().then(playNotificationTone);
  };

  useEffect(() => {
    const currentUnreadIds = new Set(unreadNotifs.map((notification) => notification.id));
    const previousUnreadIds = knownUnreadIds.current;
    if (previousUnreadIds) {
      const hasNewNotification = [...currentUnreadIds].some((id) => !previousUnreadIds.has(id));
      if (hasNewNotification && notificationSoundEnabled) playNotificationTone();
    }
    knownUnreadIds.current = currentUnreadIds;
  }, [notificationSoundEnabled, unreadNotifs]);

  const isCheckedIn = !!todayAttendance;
  const isCheckedOut = !!todayAttendance?.checkOutTime;
  const canViewGeofenceTelemetry = ['ceo', 'admin_manager', 'tech_manager', 'gis_manager', 'rs_manager', 'training_manager'].includes(currentUser.roleId);
  const [timerNow, setTimerNow] = useState(() => Date.now());

  // The start time lives in the attendance record (and therefore in local
  // storage). Rebuilding the elapsed time from that timestamp means closing
  // the browser, a power cut, or a refresh never pauses the work clock.
  useEffect(() => {
    if (!isCheckedIn || isCheckedOut) return undefined;
    setTimerNow(Date.now());
    const interval = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isCheckedIn, isCheckedOut, todayAttendance?.checkInTime, todayAttendance?.date]);

  const elapsedWorkTime = useMemo(() => {
    if (!todayAttendance || isCheckedOut) return null;
    const [year, month, day] = todayAttendance.date.split('-').map(Number);
    const [hour, minute, second = 0] = todayAttendance.checkInTime.split(':').map(Number);
    const startedAt = new Date(year, month - 1, day, hour, minute, second).getTime();
    const elapsedSeconds = Math.max(0, Math.floor((timerNow - startedAt) / 1000));
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [todayAttendance, isCheckedOut, timerNow]);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 shadow-xs backdrop-blur-md px-3 sm:px-6 py-2 transition-colors">
      <div className="flex min-w-0 items-center justify-between gap-1.5 sm:gap-4">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:block"><CompanyLogo size="md" showText={true} /></div>
          <div className="sm:hidden"><CompanyLogo size="sm" showText={false} /></div>
        </div>

        {/* Center: Live Attendance Chip & Quick Actions */}
        <div className="hidden md:flex items-center gap-2">
          {isCheckedIn && !isCheckedOut ? (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium">
                {t('checkedInAt')} {todayAttendance.checkInTime}
              </span>
              <span className="font-mono font-bold tabular-nums text-emerald-900" title={isRtl ? 'مدة العمل المستمرة' : 'Live work duration'}>
                {elapsedWorkTime}
              </span>
              <span className="text-emerald-400">|</span>
              <button
                onClick={onOpenCheckOutModal}
                className="font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 transition"
              >
                {t('checkOut')}
              </button>
            </div>
          ) : isCheckedOut ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{t('checkedOutAt')} {todayAttendance.checkOutTime}</span>
            </div>
          ) : (
            <button
              onClick={() => checkIn()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t('checkIn')}</span>
            </button>
          )}

          {/* Office Geofence Status Pill */}
          {canViewGeofenceTelemetry && <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
            <MapPin className="w-3 h-3 text-blue-600" />
            <span>{isRtl ? 'نطاق 500م نشط' : '500m Geofence Active'}</span>
          </div>}
        </div>

        {/* Right: personal controls only. Account switching is deliberately disabled. */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2.5">
          {/* Quick Demo Role Switcher Dropdown */}
          {false && <div className="relative hidden md:block">
            <button
              onClick={() => setShowSwitchMenu(!showSwitchMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition"
              title="Switch user to test any of the 16 roles"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{t('quickDemoSwitch')}</span>
              <span className="font-bold">{isRtl ? currentUser.nameAr.split(' ').slice(0, 2).join(' ') : currentUser.nameEn.split(' ')[0]}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showSwitchMenu && (
              <div
                className={`absolute ${
                  isRtl ? 'left-0' : 'right-0'
                } mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 max-h-96 overflow-y-auto animate-in fade-in`}
              >
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {isRtl ? 'اختر مستخدم للتجربة (16 موظفاً):' : 'Select Team Member to Demo:'}
                  </p>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        void u;
                        setShowSwitchMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-start flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition text-xs ${
                        u.id === currentUser.id ? 'bg-blue-50/70 dark:bg-blue-950/60 font-semibold text-blue-900 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <UserAvatar
                        src={u.avatarUrl}
                        name={isRtl ? u.nameAr : u.nameEn}
                        size="sm"
                        rounded="full"
                      />
                      <div className="truncate flex-1">
                        <div className="truncate font-medium">{isRtl ? u.nameAr : u.nameEn}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-400 truncate">{isRtl ? u.jobTitleAr : u.jobTitleEn}</div>
                      </div>
                      {u.id === currentUser.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="grid h-10 w-10 place-items-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            title={isDark ? (isRtl ? 'التبديل إلى الوضع الفاتح' : 'Switch to Light Mode') : (isRtl ? 'التبديل إلى الوضع الداكن' : 'Switch to Dark Mode')}
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            )}
          </button>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex h-10 w-10 items-center justify-center gap-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5"
            title="Switch Language (English / العربية)"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden font-semibold sm:inline">{language === 'en' ? 'العربية' : 'English'}</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                void unlockNotificationAudio();
                setShowNotifMenu(!showNotifMenu);
              }}
              className="relative grid h-10 w-10 place-items-center rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
                  {unreadNotifs.length}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div
                className={`absolute ${
                  isRtl ? 'left-0' : 'right-0'
                } mt-2 w-[calc(100vw-1.5rem)] max-w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-in fade-in`}
              >
                <div className="px-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t('navNotifications')}</h4>
                    {unreadNotifs.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                        {unreadNotifs.length} {isRtl ? 'جديد' : 'new'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleNotificationSound}
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-300 transition"
                      title={notificationSoundEnabled ? (isRtl ? 'إيقاف صوت الإشعارات' : 'Turn notification sound off') : (isRtl ? 'تشغيل صوت الإشعارات' : 'Turn notification sound on')}
                      aria-label="Toggle notification sound"
                    >
                      {notificationSoundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                    </button>
                    {unreadNotifs.length > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        {t('markAllRead')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleNotifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-400">
                      {t('noNotifications')}
                    </div>
                  ) : (
                    visibleNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markNotificationRead(notif.id);
                          setShowNotifMenu(false);
                          onNotificationAction?.(notif.actionUrl);
                        }}
                        className={`p-3.5 text-xs hover:bg-blue-50 dark:hover:bg-slate-800/80 transition cursor-pointer flex gap-3 ${
                          !notif.isRead ? 'bg-blue-50/40 dark:bg-blue-950/30' : ''
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            !notif.isRead ? 'bg-blue-600 dark:bg-blue-400' : 'bg-transparent'
                          }`}
                        />
                        <div className="space-y-1 flex-1">
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            {isRtl ? notif.titleAr : notif.titleEn}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            {isRtl ? notif.messageAr : notif.messageEn}
                          </p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-400 block">
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Signout */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex h-10 items-center gap-2 p-1 pl-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <UserAvatar
                src={currentUser.avatarUrl}
                name={isRtl ? currentUser.nameAr : currentUser.nameEn}
                size="sm"
                rounded="full"
              />
              <span className="hidden md:block text-xs font-semibold text-slate-800 dark:text-slate-200 pr-1">
                {isRtl ? currentUser.nameAr : currentUser.nameEn}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 mr-1" />
            </button>

            {showUserMenu && (
              <div
                className={`absolute ${
                  isRtl ? 'left-0' : 'right-0'
                } mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in`}
              >
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                    {isRtl ? currentUser.nameAr : currentUser.nameEn}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                    {isRtl ? currentUser.jobTitleAr : currentUser.jobTitleEn}
                  </span>
                </div>

                <div className="p-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full px-3 py-2 text-start rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('signOut')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
