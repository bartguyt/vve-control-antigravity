import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { memberService } from '../../features/members/memberService';
import type { Profile } from '../../types/database';
import { CreateAssociationModal } from '../../features/associations/CreateAssociationModal';
import { TopBar } from './TopBar';
import {
    HomeIcon,
    UsersIcon,
    DocumentDuplicateIcon,
    CalendarIcon,
    CreditCardIcon,
    BookOpenIcon,
    CurrencyEuroIcon,
    HandRaisedIcon,
    BellIcon,
    CheckCircleIcon,
    TruckIcon,
    BriefcaseIcon,
    Cog6ToothIcon,
    BuildingOffice2Icon
} from '@heroicons/react/24/outline';
import { DebugBar } from '../common/DebugBar';
import { Toaster } from 'sonner';

interface NavItem {
    name: string;
    path: string;
    icon: any;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

const navGroups: NavGroup[] = [
    {
        title: 'Algemeen',
        items: [
            { name: 'Overzicht', path: '/', icon: HomeIcon },
            { name: 'Taken', path: '/general/tasks', icon: CheckCircleIcon },
            { name: 'Agenda', path: '/general/agenda', icon: CalendarIcon },
            { name: 'Documenten', path: '/general/documents', icon: DocumentDuplicateIcon },
            { name: 'Meldingen', path: '/general/notifications', icon: BellIcon },
        ]
    },
    {
        title: 'Financieel',
        items: [
            { name: 'Boekhouding', path: '/finance/accounting', icon: BookOpenIcon },
            { name: 'Bankrekening', path: '/finance/bank', icon: CreditCardIcon },
            { name: 'Ledenbijdragen', path: '/finance/contributions', icon: CurrencyEuroIcon },
        ]
    },
    {
        title: 'Beheer & Onderhoud',
        items: [
            { name: 'Opdrachten', path: '/maintenance/assignments', icon: BriefcaseIcon },
            { name: 'Leveranciers', path: '/maintenance/suppliers', icon: TruckIcon },
        ]
    },
    {
        title: 'Vereniging',
        items: [
            { name: 'Ledenlijst', path: '/association/members', icon: UsersIcon },
            { name: 'Stemmen', path: '/association/voting', icon: HandRaisedIcon },
        ]
    },
    {
        title: 'Systeem',
        items: [
            { name: 'Instellingen', path: '/system/settings', icon: Cog6ToothIcon },
            { name: 'Beheer Dashboard', path: '/system/admin', icon: BuildingOffice2Icon },
        ]
    }
];

const restrictedPaths: Record<string, string[]> = {
    '/finance/bank': ['admin', 'manager', 'board', 'audit_comm'],
    '/finance/accounting': ['admin', 'manager', 'board', 'audit_comm'],
    '/finance/contributions': ['admin', 'manager', 'board', 'audit_comm'],

    '/general/tasks': ['admin', 'manager', 'board', 'tech_comm', 'member'],

    '/maintenance/suppliers': ['admin', 'manager', 'board', 'tech_comm'],
    '/maintenance/assignments': ['admin', 'manager', 'board', 'tech_comm'],

    '/system/settings': ['admin', 'manager', 'board'],
    '/system/admin': [], // Special case: checked via isSuperAdmin
};

export const SidebarLayout: React.FC = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Role Simulation State
    const [simulatedRole, setSimulatedRole] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const p = await memberService.getCurrentProfile();
            setProfile(p);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSwitchAssociation = async (associationId: string) => {
        if (!profile || profile.association_id === associationId) return;

        try {
            await supabase
                .from('profiles')
                .update({ association_id: associationId })
                .eq('id', profile.id);

            window.location.reload();
        } catch (e) {
            console.error('Failed to switch Association', e);
        }
    };

    const handleCreateSuccess = (_newAssociationId: string) => {
        window.location.reload();
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const activeMembership = profile?.association_memberships?.find(m => m.association_id === profile.association_id);
    const realRole = activeMembership?.role || 'member';

    // Effective role is the simulated one (if set) OR the real one
    const activeRole = simulatedRole || realRole;
    const isSuperAdmin = profile?.is_super_admin || false;

    const filterNavGroups = (groups: NavGroup[]) => {
        if (isSuperAdmin && !simulatedRole) {
            return groups; // Super Admin sees everything
        }

        return groups.map(group => ({
            ...group,
            items: group.items.filter(item => {
                // Special case for Super Admin Dashboard
                if (item.path === '/system/admin') {
                    if (isSuperAdmin && !simulatedRole) return true;
                    return false;
                }

                const allowedRoles = restrictedPaths[item.path];
                if (!allowedRoles) return true;
                return allowedRoles.includes(activeRole);
            })
        })).filter(group => group.items.length > 0); // Remove empty groups
    };

    const filteredGroups = filterNavGroups(navGroups);

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'
        }`;

    return (
        <div className="flex h-screen flex-col bg-gray-50 dark:bg-slate-950 overflow-hidden">
            <CreateAssociationModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleCreateSuccess}
            />

            <TopBar
                profile={profile}
                activeRole={activeRole}
                simulatedRole={simulatedRole}
                isSuperAdmin={isSuperAdmin}
                onSwitchAssociation={handleSwitchAssociation}
                onCreateAssociation={() => setIsCreateModalOpen(true)}
                onLogout={handleLogout}
                onSimulateRole={setSimulatedRole}
            />

            <div className="flex flex-1 overflow-hidden">
                <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out">
                    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                        {
                            filteredGroups.map((group) => (
                                <div key={group.title}>
                                    <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        {group.title}
                                    </h3>
                                    <div className="space-y-1">
                                        {group.items.map((item) => (
                                            <NavLink key={item.path} to={item.path} className={navLinkClass}>
                                                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                                                {item.name}
                                            </NavLink>
                                        ))}
                                    </div>
                                </div>
                            ))
                        }
                    </nav >
                </aside >

                <main className="flex-1 overflow-y-auto focus:outline-none bg-gray-50 dark:bg-slate-950 pb-20">
                    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                        <Outlet />
                    </div>
                </main>
            </div>
            <Toaster position="top-right" richColors />
            <DebugBar />
        </div >
    );
};
