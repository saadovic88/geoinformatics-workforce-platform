import React, { useEffect, useRef, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';

import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActivePage } from './components/layout/Sidebar';
import { LoginView } from './components/auth/LoginView';
import { CheckOutSummaryModal } from './components/attendance/CheckOutSummaryModal';

import { EmployeeDashboard } from './components/dashboards/EmployeeDashboard';
import { ExecutiveDashboard } from './components/dashboards/ExecutiveDashboard';
import { EmployeeDirectory } from './components/directory/EmployeeDirectory';
import { OrgStructureView } from './components/admin/OrgStructureView';
import { AttendanceDashboard } from './components/attendance/AttendanceDashboard';
import { GeofenceSettingsView } from './components/admin/GeofenceSettingsView';
import { SchedulesHolidaysView } from './components/admin/SchedulesHolidaysView';
import { TasksView } from './components/tasks/TasksView';
import { LeaveManagement } from './components/leaves/LeaveManagement';
import { KPIDashboard } from './components/kpi/KPIDashboard';
import { ReportsCenter } from './components/reports/ReportsCenter';
import { RolesPermissionsView } from './components/admin/RolesPermissionsView';
import { AutomationsView } from './components/admin/AutomationsView';
import { CompanySettingsView } from './components/admin/CompanySettingsView';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, pendingLogoutSummary, setPendingLogoutSummary, currentUser, isFullAccessUser } = useAuth();
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [manualCheckoutModal, setManualCheckoutModal] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState<{ page: ActivePage; itemId?: string } | null>(null);
  const mainViewportRef = useRef<HTMLElement>(null);

  // A navigation action should always reveal the new page header. Without this,
  // an administrator who navigates while scrolled down can appear to remain on
  // the previous page even though React has rendered the destination.
  useEffect(() => {
    mainViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activePage]);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const adminFallback = () => (
    <EmployeeDashboard
      onNavigate={(page) => setActivePage(page)}
      onOpenCheckOutModal={() => setManualCheckoutModal(true)}
      onRequestLeave={() => setActivePage('leaves_requests')}
      onCreateTask={() => setActivePage('tasks_kanban')}
    />
  );

  const renderActiveView = () => {
    switch (activePage) {
      case 'dashboard':
        if (isFullAccessUser) {
          return <ExecutiveDashboard onNavigate={(page) => setActivePage(page)} />;
        }
        return (
          <EmployeeDashboard
            onNavigate={(page) => setActivePage(page)}
            onOpenCheckOutModal={() => setManualCheckoutModal(true)}
            onRequestLeave={() => setActivePage('leaves_requests')}
            onCreateTask={() => setActivePage('tasks_kanban')}
          />
        );
      case 'executive':
        return isFullAccessUser ? <ExecutiveDashboard onNavigate={(page) => setActivePage(page)} /> : adminFallback();
      case 'directory':
        return isFullAccessUser ? <EmployeeDirectory /> : <EmployeeDashboard
          onNavigate={(page) => setActivePage(page)}
          onOpenCheckOutModal={() => setManualCheckoutModal(true)}
          onRequestLeave={() => setActivePage('leaves_requests')}
          onCreateTask={() => setActivePage('tasks_kanban')}
        />;
      case 'orgchart':
        return isFullAccessUser ? <OrgStructureView /> : adminFallback();
      case 'attendance_my':
        return <AttendanceDashboard key={activePage} scope="my" />;
      case 'attendance_team':
        return isFullAccessUser ? <AttendanceDashboard key={activePage} scope="team" /> : adminFallback();
      case 'geofence_settings':
        return isFullAccessUser ? <GeofenceSettingsView /> : adminFallback();
      case 'schedules':
        return isFullAccessUser ? <SchedulesHolidaysView /> : adminFallback();
      case 'tasks_my':
        return <TasksView key={`${activePage}-${notificationTarget?.itemId || ''}`} filterScope="my" initialViewMode="list" initialTaskId={notificationTarget?.itemId} />;
      case 'tasks_team':
        return isFullAccessUser ? <TasksView key={activePage} filterScope="team" initialViewMode="kanban" /> : adminFallback();
      case 'tasks_kanban':
        return <TasksView key={activePage} initialViewMode="kanban" />;
      case 'task_insights':
        return isFullAccessUser ? <TasksView key={activePage} filterScope="team" initialViewMode="insights" /> : adminFallback();
      case 'leaves_requests':
        return <LeaveManagement key={activePage} initialTab="requests" />;
      case 'leaves_balances':
        return <LeaveManagement key={activePage} initialTab="balances" />;
      case 'leaves_dual_approval':
        return <LeaveManagement key={activePage} initialTab="dual_approval" />;
      case 'leaves_wfh_field':
        return <LeaveManagement key={activePage} initialTab="wfh_field" />;
      case 'kpi_my':
        return <KPIDashboard key={activePage} initialMode="my" />;
      case 'kpi_team':
        return isFullAccessUser ? <KPIDashboard key={activePage} initialMode="team" /> : adminFallback();
      case 'kpi_reports':
        return isFullAccessUser ? <KPIDashboard key={activePage} initialMode="reports" /> : adminFallback();
      case 'reports_center':
        return isFullAccessUser ? <ReportsCenter key={activePage} /> : adminFallback();
      case 'audit_logs':
        return isFullAccessUser ? <ReportsCenter key={activePage} initialReport="audit" /> : adminFallback();
      case 'roles_matrix':
        return isFullAccessUser ? <RolesPermissionsView /> : adminFallback();
      case 'automations':
        return isFullAccessUser ? <AutomationsView /> : adminFallback();
      case 'company_settings':
        return isFullAccessUser ? <CompanySettingsView /> : adminFallback();
      default:
        return (
          <EmployeeDashboard
            onNavigate={(page) => setActivePage(page)}
            onOpenCheckOutModal={() => setManualCheckoutModal(true)}
            onRequestLeave={() => setActivePage('leaves_requests')}
            onCreateTask={() => setActivePage('tasks_kanban')}
          />
        );
    }
  };

  return (
    <div className="flex h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onSelectPage={(p) => setActivePage(p)}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
          onOpenCheckOutModal={() => setManualCheckoutModal(true)}
          onNotificationAction={(actionUrl) => {
            const [kind, itemId] = (actionUrl || '').split(':');
            const page: ActivePage = kind === 'task' || kind === 'tasks' ? 'tasks_my'
              : kind === 'leave' || kind === 'leaves' ? 'leaves_requests'
              : kind === 'attendance' ? 'attendance_my'
              : kind === 'kpi' ? 'kpi_my'
              : 'dashboard';
            setNotificationTarget({ page, itemId });
            setActivePage(page);
          }}
        />

        {/* Scrollable Viewport */}
        <main ref={mainViewportRef} className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-5 lg:p-8">
          <div className="max-w-7xl mx-auto">{renderActiveView()}</div>
        </main>
      </div>

      {/* Daily Summary & Check-out Modal (Sign-out automated trigger) */}
      <CheckOutSummaryModal
        isOpen={pendingLogoutSummary}
        onClose={() => setPendingLogoutSummary(false)}
        isLogoutFlow={true}
      />

      {/* Manual Check-out Modal */}
      <CheckOutSummaryModal
        isOpen={manualCheckoutModal}
        onClose={() => setManualCheckoutModal(false)}
        isLogoutFlow={false}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <DataProvider>
            <MainAppContent />
            <PwaInstallPrompt />
          </DataProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
