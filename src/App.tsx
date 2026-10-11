import React, { useState } from 'react';
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

const MainAppContent: React.FC = () => {
  const { isAuthenticated, pendingLogoutSummary, setPendingLogoutSummary } = useAuth();
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [manualCheckoutModal, setManualCheckoutModal] = useState(false);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <EmployeeDashboard
            onNavigate={(page) => setActivePage(page)}
            onOpenCheckOutModal={() => setManualCheckoutModal(true)}
            onRequestLeave={() => setActivePage('leaves_requests')}
            onCreateTask={() => setActivePage('tasks_kanban')}
          />
        );
      case 'executive':
        return <ExecutiveDashboard onNavigate={(page) => setActivePage(page)} />;
      case 'directory':
        return <EmployeeDirectory />;
      case 'orgchart':
        return <OrgStructureView />;
      case 'attendance_my':
      case 'attendance_team':
        return <AttendanceDashboard key={activePage} />;
      case 'geofence_settings':
        return <GeofenceSettingsView />;
      case 'schedules':
        return <SchedulesHolidaysView />;
      case 'tasks_my':
        return <TasksView key={activePage} filterScope="my" initialViewMode="kanban" />;
      case 'tasks_team':
        return <TasksView key={activePage} filterScope="team" initialViewMode="kanban" />;
      case 'tasks_kanban':
        return <TasksView key={activePage} initialViewMode="kanban" />;
      case 'task_insights':
        return <TasksView key={activePage} filterScope="team" initialViewMode="insights" />;
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
        return <KPIDashboard key={activePage} initialMode="team" />;
      case 'kpi_reports':
        return <KPIDashboard key={activePage} initialMode="reports" />;
      case 'reports_center':
        return <ReportsCenter key={activePage} />;
      case 'audit_logs':
        return <ReportsCenter key={activePage} initialReport="audit" />;
      case 'roles_matrix':
        return <RolesPermissionsView />;
      case 'automations':
        return <AutomationsView />;
      case 'company_settings':
        return <CompanySettingsView />;
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
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
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
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
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
          </DataProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
