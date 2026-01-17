import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { RoleProtectedRoute } from './components/layout/RoleProtectedRoute';
import { SidebarLayout } from './components/layout/SidebarLayout';
import { LoginPage } from './features/auth/LoginPage'; // Keep generic auth static for speed

// Lazy Load Pages for Performance
const OverviewPage = React.lazy(() => import('./features/overview/OverviewPage').then(module => ({ default: module.OverviewPage })));
const MemberListPage = React.lazy(() => import('./features/members/MemberListPage').then(module => ({ default: module.MemberListPage })));
const MemberDetailPage = React.lazy(() => import('./features/members/MemberDetailPage').then(module => ({ default: module.MemberDetailPage })));
const DocumentListPage = React.lazy(() => import('./features/documents/DocumentListPage').then(module => ({ default: module.DocumentListPage })));
const AgendaPage = React.lazy(() => import('./features/agenda/AgendaPage').then(module => ({ default: module.AgendaPage })));
const SettingsPage = React.lazy(() => import('./features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const BankAccountPage = React.lazy(() => import('./features/finance/BankAccountPage').then(module => ({ default: module.BankAccountPage })));
const TasksPage = React.lazy(() => import('./features/tasks/TasksPage').then(module => ({ default: module.TasksPage })));
const SuppliersPage = React.lazy(() => import('./features/suppliers/SuppliersPage').then(module => ({ default: module.SuppliersPage })));
const ContributionsPage = React.lazy(() => import('./features/finance/ContributionsPage').then(module => ({ default: module.ContributionsPage })));
const AccountingPage = React.lazy(() => import('./features/finance/AccountingPage').then(module => ({ default: module.AccountingPage })));
const AssignmentsPage = React.lazy(() => import('./features/assignments/AssignmentsPage').then(module => ({ default: module.AssignmentsPage })));
const AdminDashboardPage = React.lazy(() => import('./features/admin/AdminDashboardPage').then(module => ({ default: module.AdminDashboardPage })));

// Placeholders
const PlaceholderDefault = () => <div className="p-4">Deze pagina is nog in ontwikkeling.</div>;
const ProposalsPage = React.lazy(() => import('./features/voting/ProposalsPage').then(module => ({ default: module.ProposalsPage })));
const NotificationsPage = React.lazy(() => import('./features/placeholders/PlaceholderPages').then(module => ({ default: module.NotificationsPage || PlaceholderDefault })));

import { ThemeProvider } from './components/providers/ThemeProvider';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Suspense fallback={
          <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        }>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<SidebarLayout />}>
                {/* Dashboard */}
                <Route path="/" element={<OverviewPage />} />

                {/* Leden */}
                <Route path="/members" element={<MemberListPage />} />
                <Route path="/members/:id" element={<MemberDetailPage />} />

                {/* Finance */}
                <Route element={<RoleProtectedRoute allowedRoles={['board', 'audit_comm', 'admin', 'manager']} />}>
                  <Route path="/bank" element={<BankAccountPage />} />
                  <Route path="/accounting" element={<AccountingPage />} />
                  <Route path="/contributions" element={<ContributionsPage />} />
                </Route>

                {/* Beheer - Technical */}
                <Route element={<RoleProtectedRoute allowedRoles={['board', 'tech_comm', 'admin', 'manager']} />}>
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/assignments" element={<AssignmentsPage />} />
                </Route>

                {/* Beheer - General */}
                <Route path="/documents" element={<DocumentListPage />} />
                <Route path="/agenda" element={<AgendaPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/voting" element={<ProposalsPage />} />

                {/* Tasks - Accessible to all members now (as per new nav structure request) */}
                <Route path="/tasks" element={<TasksPage />} />

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
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
