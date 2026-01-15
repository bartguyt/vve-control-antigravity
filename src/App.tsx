import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { MemberListPage } from './features/members/MemberListPage';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { RoleProtectedRoute } from './components/layout/RoleProtectedRoute';
import { SidebarLayout } from './components/layout/SidebarLayout';
import { OverviewPage } from './features/overview/OverviewPage';
import { DocumentListPage } from './features/documents/DocumentListPage';
import { AgendaPage } from './features/agenda/AgendaPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { BankAccountPage } from './features/finance/BankAccountPage';
import {
  AccountingPage,
  MemberContributionPage,
  VotingPage,
  NotificationsPage,
  TasksPage,
  SuppliersPage,
  AssignmentsPage
} from './features/placeholders/PlaceholderPages';
import { AdminDashboardPage } from './features/admin/AdminDashboardPage';

// ... other imports

// ... inside Routes
<Route path="/settings" element={<SettingsPage />} />

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<SidebarLayout />}>
            {/* Public/General Member Routes */}
            <Route path="/" element={<OverviewPage />} />
            <Route path="/members" element={<MemberListPage />} />
            <Route path="/documents" element={<DocumentListPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/voting" element={<VotingPage />} />

            {/* Finance Committee Routes */}
            <Route element={<RoleProtectedRoute allowedRoles={['board', 'audit_comm', 'admin', 'manager']} />}>
              <Route path="/bank" element={<BankAccountPage />} />
              <Route path="/accounting" element={<AccountingPage />} />
              <Route path="/contributions" element={<MemberContributionPage />} />
            </Route>

            {/* Technical Committee (Maintenance) Routes */}
            <Route element={<RoleProtectedRoute allowedRoles={['board', 'tech_comm', 'admin', 'manager']} />}>
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/assignments" element={<AssignmentsPage />} />
            </Route>

            {/* Board / Admin Settings */}
            <Route element={<RoleProtectedRoute allowedRoles={['board', 'admin', 'manager']} />}>
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Super Admin Route */}
            <Route element={<RoleProtectedRoute allowedRoles={[]} requireSuperAdmin={true} />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
