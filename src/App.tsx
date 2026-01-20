import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { RoleProtectedRoute } from './components/layout/RoleProtectedRoute';
import { SidebarLayout } from './components/layout/SidebarLayout';
import { LoginPage } from './features/auth/LoginPage'; // Keep generic auth static for speed
import { UpdatePasswordPage } from './features/auth/UpdatePasswordPage';

import { ThemeProvider } from './components/providers/ThemeProvider';

// Lazy Load Pages for Performance
const OverviewPage = React.lazy(() => import('./features/overview/OverviewPage').then(module => ({ default: module.OverviewPage })));
const MemberListPage = React.lazy(() => import('./features/members/MemberListPage').then(module => ({ default: module.MemberListPage })));
const MemberDetailPage = React.lazy(() => import('./features/members/MemberDetailPage').then(module => ({ default: module.MemberDetailPage })));
const DocumentListPage = React.lazy(() => import('./features/documents/DocumentListPage').then(module => ({ default: module.DocumentListPage })));
const AgendaPage = React.lazy(() => import('./features/agenda/AgendaPage').then(module => ({ default: module.AgendaPage })));
const BankAccountPage = React.lazy(() => import('./features/finance/BankAccountPage').then(module => ({ default: module.BankAccountPage })));
const TasksPage = React.lazy(() => import('./features/tasks/TasksPage').then(module => ({ default: module.TasksPage })));
const SuppliersPage = React.lazy(() => import('./features/suppliers/SuppliersPage').then(module => ({ default: module.SuppliersPage })));
const ContributionsPage = React.lazy(() => import('./features/finance/ContributionsPage').then(module => ({ default: module.ContributionsPage })));
const AccountingPage = React.lazy(() => import('./features/finance/AccountingPage').then(module => ({ default: module.AccountingPage })));
const SettingsPage = React.lazy(() => import('./features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const AssignmentsPage = React.lazy(() => import('./features/assignments/AssignmentsPage').then(module => ({ default: module.AssignmentsPage })));
const AdminDashboardPage = React.lazy(() => import('./features/admin/AdminDashboardPage').then(module => ({ default: module.AdminDashboardPage })));
const EnableBankingSandbox = React.lazy(() => import('./features/finance/EnableBankingSandbox').then(module => ({ default: module.EnableBankingSandbox })));

// Placeholders
const PlaceholderDefault = () => <div className="p-4">Deze pagina is nog in ontwikkeling.</div>;
const ProposalsPage = React.lazy(() => import('./features/voting/ProposalsPage').then(module => ({ default: module.ProposalsPage })));
const NotificationsPage = React.lazy(() => import('./features/general/NotificationsPage').then(module => ({ default: module.NotificationsPage })));

const SuperAdminPage = React.lazy(() => import('./features/superadmin/SuperAdminPage').then(module => ({ default: module.SuperAdminPage })));
const AcceptInvitePage = React.lazy(() => import('./features/superadmin/AcceptInvitePage').then(module => ({ default: module.AcceptInvitePage })));
const DisputePage = React.lazy(() => import('./features/finance/DisputePage').then(module => ({ default: module.DisputePage })));

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
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            <Route path="/accept-invite" element={<AcceptInvitePage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<SidebarLayout />}>
                {/* Algemeen - General */}
                <Route path="/" element={<OverviewPage />} />
                <Route path="general/docs" element={<Navigate to="general/documents" replace />} /> {/* Alias if needed */}
                <Route path="general/tasks" element={<TasksPage />} />
                <Route path="general/agenda" element={<AgendaPage />} />
                <Route path="general/documents" element={<DocumentListPage />} />
                <Route path="general/notifications" element={<NotificationsPage />} />

                {/* Association - Vereniging */}
                <Route path="finance/dispute" element={<DisputePage />} />

                <Route path="association/members" element={<MemberListPage />} />
                <Route path="association/members/:id" element={<MemberDetailPage />} />
                <Route path="association/voting" element={<ProposalsPage />} />

                {/* Finance - Financieel */}
                <Route element={<RoleProtectedRoute allowedRoles={['board', 'audit_comm', 'admin', 'manager']} />}>
                  <Route path="finance/bank" element={<BankAccountPage />} />
                </Route>
                <Route path="finance/contributions" element={
                  <RoleProtectedRoute allowedRoles={['admin', 'board', 'manager', 'audit_comm']} allowMember={true}>
                    <ContributionsPage />
                  </RoleProtectedRoute>
                } />
                <Route path="finance/accounting" element={
                  <RoleProtectedRoute allowedRoles={['admin', 'board', 'manager', 'audit_comm']}>
                    <AccountingPage />
                  </RoleProtectedRoute>
                } />
                <Route path="finance/enable-banking-dev" element={<EnableBankingSandbox />} />

                {/* Maintenance - Beheer & Onderhoud */}
                <Route element={<RoleProtectedRoute allowedRoles={['board', 'tech_comm', 'admin', 'manager']} />}>
                  <Route path="maintenance/suppliers" element={<SuppliersPage />} />
                  <Route path="maintenance/assignments" element={<AssignmentsPage />} />
                </Route>

                {/* System - Systeem */}
                <Route element={<RoleProtectedRoute allowedRoles={['board', 'admin', 'manager']} />}>
                  <Route path="system/settings" element={<SettingsPage />} />
                </Route>

                <Route element={<RoleProtectedRoute allowedRoles={[]} requireSuperAdmin={true} />}>
                  <Route path="system/admin" element={<AdminDashboardPage />} />
                  <Route path="system/super-admin" element={<SuperAdminPage />} />
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
