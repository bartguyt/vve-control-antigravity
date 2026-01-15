import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { memberService } from '../../features/members/memberService';
import type { Profile } from '../../types/database';
import { CreateVveModal } from '../../features/vve/CreateVveModal';
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
    ArrowLeftOnRectangleIcon,
    BuildingOffice2Icon,
    ChevronUpDownIcon,
    PlusIcon,
    EyeIcon
} from '@heroicons/react/24/outline';
import { Listbox, Transition, Menu } from '@headlessui/react';
import { DebugBar } from '../common/DebugBar';

interface NavItem {
    name: string;
    path: string;
    icon: any;
}

const mainNav: NavItem[] = [
    { name: 'Overzicht', path: '/', icon: HomeIcon },
    { name: 'Leden', path: '/members', icon: UsersIcon },
    { name: 'Documenten', path: '/documents', icon: DocumentDuplicateIcon },
    { name: 'Agenda', path: '/agenda', icon: CalendarIcon },
    { name: 'Taken', path: '/tasks', icon: CheckCircleIcon },
    { name: 'Leveranciers', path: '/suppliers', icon: TruckIcon },
    { name: 'Opdrachten', path: '/assignments', icon: BriefcaseIcon },
];

const restrictedPaths: Record<string, string[]> = {
    '/bank': ['admin', 'manager', 'board', 'audit_comm'],
    '/accounting': ['admin', 'manager', 'board', 'audit_comm'],
    '/contributions': ['admin', 'manager', 'board', 'audit_comm'],
    '/tasks': ['admin', 'manager', 'board', 'tech_comm'],
    '/suppliers': ['admin', 'manager', 'board', 'tech_comm'],
    '/assignments': ['admin', 'manager', 'board', 'tech_comm'],
    '/settings': ['admin', 'manager', 'board'],
};

const futureNav: NavItem[] = [
    { name: 'Bankrekening', path: '/bank', icon: CreditCardIcon },
    { name: 'Boekhouding', path: '/accounting', icon: BookOpenIcon },
    { name: 'Ledenbijdrage', path: '/contributions', icon: CurrencyEuroIcon },
    { name: 'Stemmen', path: '/voting', icon: HandRaisedIcon },
    { name: 'Meldingen', path: '/notifications', icon: BellIcon },
    { name: 'Instellingen', path: '/settings', icon: Cog6ToothIcon },
];

const availableRoles = [
    { id: 'admin', name: 'Beheerder' },
    { id: 'manager', name: 'Beheerder (Manager)' },
    { id: 'board', name: 'Bestuur' },
    { id: 'audit_comm', name: 'Kascommissie' },
    { id: 'tech_comm', name: 'Tech. Cie' },
    { id: 'member', name: 'Lid' },
];

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
        } finally {
            // Loading state removed
        }
    };

    const handleSwitchVve = async (vveId: string) => {
        if (!profile || profile.vve_id === vveId) return;

        try {
            await supabase
                .from('profiles')
                .update({ vve_id: vveId })
                .eq('id', profile.id);

            window.location.reload();
        } catch (e) {
            console.error('Failed to switch VvE', e);
        }
    };

    const handleCreateSuccess = (_newVveId: string) => {
        window.location.reload();
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const activeMembership = profile?.vve_memberships?.find(m => m.vve_id === profile.vve_id);
    const realRole = activeMembership?.role || 'member';

    // Effective role is the simulated one (if set) OR the real one
    const activeRole = simulatedRole || realRole;

    const isSuperAdmin = profile?.is_super_admin || false;
    const activeVveName = activeMembership?.vves?.name || 'Mijn VvE';
    const memberships = profile?.vve_memberships || [];

    const filterNav = (items: NavItem[]) => {
        let filtered = items;
        // Even if Super Admin, we respect the 'simulated' role for filtering logic
        // But if NO simulation is active, Super Admin sees everything (or based on standard logic? 
        // Usually Super Admin has bypass, but let's say if NOT simulating, we follow regular super admin rules).
        // If simulating, we strictly follow the simulated role permissions.

        if (isSuperAdmin && !simulatedRole) {
            return items; // Super Admin sees all by default
        }

        // Normal filtering (or Simulated filtering)
        filtered = items.filter(item => {
            const allowedRoles = restrictedPaths[item.path];
            if (!allowedRoles) return true;
            return allowedRoles.includes(activeRole);
        });

        return filtered;
    };

    const filteredMainNav = filterNav(mainNav);
    const filteredFutureNav = filterNav(futureNav);

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
        }`;

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <CreateVveModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleCreateSuccess}
            />

            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out">
                <div className="flex flex-col px-4 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center mb-4">
                        <span className="text-xl font-bold text-indigo-600">VvE Control</span>
                    </div>

                    <div className="mb-4 px-1">
                        <p className="text-sm font-semibold text-gray-900 truncate" title={profile?.email || ''}>{profile?.email}</p>
                        <div className="flex items-center mt-1 flex-wrap gap-2">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize ${simulatedRole
                                ? 'bg-amber-50 text-amber-700 ring-amber-700/10'
                                : 'bg-indigo-50 text-indigo-700 ring-indigo-700/10'
                                }`}>
                                {activeRole === 'admin' ? 'Beheerder' :
                                    activeRole === 'board' ? 'Bestuur' :
                                        activeRole === 'manager' ? 'Beheerder' :
                                            activeRole === 'member' ? 'Lid' : activeRole}
                                {simulatedRole && ' (Sim)'}
                            </span>
                            {isSuperAdmin && (
                                <span className="inline-flex items-center rounded-md bg-fuchsia-50 px-2 py-1 text-xs font-medium text-fuchsia-700 ring-1 ring-inset ring-fuchsia-700/10">
                                    Super Admin
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* VvE Switcher */}
                        <Listbox value={profile?.vve_id || ''} onChange={(val) => {
                            if (val === 'NEW') {
                                setIsCreateModalOpen(true);
                            } else {
                                handleSwitchVve(val);
                            }
                        }}>
                            <div className="relative">
                                <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-sm border border-gray-200 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 sm:text-sm">
                                    <span className="block truncate font-medium text-gray-900">{activeVveName}</span>
                                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                        <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                    </span>
                                </Listbox.Button>
                                <Transition
                                    as={React.Fragment}
                                    leave="transition ease-in duration-100"
                                    leaveFrom="opacity-100"
                                    leaveTo="opacity-0"
                                >
                                    <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                                        {memberships.map((m) => (
                                            <Listbox.Option
                                                key={m.id}
                                                className={({ active }) =>
                                                    `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'}`
                                                }
                                                value={m.vve_id}
                                            >
                                                {({ selected }) => (
                                                    <>
                                                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                            {m.vves?.name || 'Naamloos'}
                                                        </span>
                                                        {selected ? (
                                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                                                <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
                                                            </span>
                                                        ) : null}
                                                    </>
                                                )}
                                            </Listbox.Option>
                                        ))}
                                        <div className="border-t border-gray-100 my-1"></div>
                                        <Listbox.Option
                                            key="new"
                                            className={({ active }) =>
                                                `relative cursor-pointer select-none py-2 pl-10 pr-4 text-indigo-600 font-medium ${active ? 'bg-indigo-50' : ''}`
                                            }
                                            value="NEW"
                                        >
                                            <div className="flex items-center">
                                                <PlusIcon className="mr-2 h-4 w-4" />
                                                <span className="block truncate">Nieuwe VvE</span>
                                            </div>
                                        </Listbox.Option>
                                    </Listbox.Options>
                                </Transition>
                            </div>
                        </Listbox>

                        {/* Super Admin: Role Switcher */}
                        {isSuperAdmin && (
                            <Listbox value={simulatedRole || 'SUPER'} onChange={(val) => setSimulatedRole(val === 'SUPER' ? null : val)}>
                                <div className="relative">
                                    <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-amber-50 py-1.5 pl-3 pr-10 text-left shadow-sm border border-amber-200 focus:outline-none focus-visible:border-amber-500 sm:text-xs">
                                        <span className="block truncate font-medium text-amber-900 ml-6">
                                            {simulatedRole ? `View: ${availableRoles.find(r => r.id === simulatedRole)?.name}` : 'View: Super Admin'}
                                        </span>
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-amber-600">
                                            <EyeIcon className="h-4 w-4" />
                                        </span>
                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                            <ChevronUpDownIcon className="h-4 w-4 text-amber-400" aria-hidden="true" />
                                        </span>
                                    </Listbox.Button>
                                    <Transition
                                        as={React.Fragment}
                                        leave="transition ease-in duration-100"
                                        leaveFrom="opacity-100"
                                        leaveTo="opacity-0"
                                    >
                                        <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-xs z-50">
                                            <Listbox.Option
                                                className={({ active }) =>
                                                    `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'}`
                                                }
                                                value="SUPER"
                                            >
                                                {({ selected }) => (
                                                    <>
                                                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                            Super Admin (Default)
                                                        </span>
                                                        {selected ? (
                                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                                                                <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
                                                            </span>
                                                        ) : null}
                                                    </>
                                                )}
                                            </Listbox.Option>
                                            {availableRoles.map((role) => (
                                                <Listbox.Option
                                                    key={role.id}
                                                    className={({ active }) =>
                                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'}`
                                                    }
                                                    value={role.id}
                                                >
                                                    {({ selected }) => (
                                                        <>
                                                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                                {role.name}
                                                            </span>
                                                            {selected ? (
                                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                                                    <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
                                                                </span>
                                                            ) : null}
                                                        </>
                                                    )}
                                                </Listbox.Option>
                                            ))}
                                        </Listbox.Options>
                                    </Transition>
                                </div>
                            </Listbox>
                        )}
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-8">
                    <div className="space-y-1">
                        {isSuperAdmin && !simulatedRole && (
                            <NavLink to="/admin" className={({ isActive }) => `${navLinkClass({ isActive })} mb-4 border-b border-gray-100 pb-2`}>
                                <div className="flex items-center">
                                    <BuildingOffice2Icon className="mr-3 h-5 w-5 flex-shrink-0 text-fuchsia-600" />
                                    <span className="text-fuchsia-700 font-medium">Beheer Dashboard</span>
                                </div>
                            </NavLink>
                        )}

                        {filteredMainNav.map((item) => (
                            <NavLink key={item.path} to={item.path} className={navLinkClass}>
                                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                                {item.name}
                            </NavLink>
                        ))}
                    </div>

                    <div>
                        <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Toekomstig
                        </h3>
                        <div className="space-y-1">
                            {filteredFutureNav.map((item) => (
                                <NavLink key={item.path} to={item.path} className={navLinkClass}>
                                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                                    {item.name}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                        <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5" />
                        Uitloggen
                    </button>
                    {/* DEBUG INFO REMOVED */}
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto focus:outline-none bg-gray-50 pb-20">
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <Outlet />
                </div>
            </main>
            <DebugBar />
        </div>
    );
};
