import { NotificationCenter } from '../ui/NotificationCenter';
import { Fragment } from 'react';
import { Listbox, Transition, Menu } from '@headlessui/react';
import {
    ChevronUpDownIcon,
    CheckCircleIcon,
    PlusIcon,
    EyeIcon,
    ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';
import type { Profile } from '../../types/database';

interface TopBarProps {
    profile: Profile | null;
    activeRole: string;
    simulatedRole: string | null;
    isSuperAdmin: boolean;
    onSwitchAssociation: (id: string) => void;
    onCreateAssociation: () => void;
    onLogout: () => void;
    onSimulateRole: (role: string | null) => void;
}

const availableRoles = [
    { id: 'admin', name: 'Beheerder' },
    { id: 'manager', name: 'Beheerder (Manager)' },
    { id: 'board', name: 'Bestuur' },
    { id: 'audit_comm', name: 'Kascommissie' },
    { id: 'tech_comm', name: 'Tech. Cie' },
    { id: 'member', name: 'Lid' },
];

export const TopBar: React.FC<TopBarProps> = ({
    profile,
    activeRole,
    simulatedRole,
    isSuperAdmin,
    onSwitchAssociation,
    onCreateAssociation,
    onLogout,
    onSimulateRole
}) => {
    const activeMembership = profile?.association_memberships?.find(m => m.association_id === profile.association_id);
    const activeAssociationName = activeMembership?.associations?.name || 'Mijn Vereniging';
    const memberships = profile?.association_memberships || [];

    return (
        <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 h-16 flex items-center justify-between px-6 shrink-0 z-30">
            {/* Left: Brand */}
            <div className="flex items-center">
                <span className="text-xl font-bold text-indigo-600 tracking-tight">VvE Control</span>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-4">

                {/* Notification Center */}
                <NotificationCenter />

                {/* Super Admin Role Switcher */}
                {isSuperAdmin && (
                    <Listbox value={simulatedRole || 'SUPER'} onChange={(val) => onSimulateRole(val === 'SUPER' ? null : val)}>
                        <div className="relative w-48 hidden md:block">
                            <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-amber-50 py-1.5 pl-3 pr-10 text-left shadow-sm border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:text-xs">
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
                                as={Fragment}
                                leave="transition ease-in duration-100"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <Listbox.Options className="absolute right-0 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-xs z-50">
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
                                                {selected && (
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                                                        <CheckCircleIcon className="h-4 w-4" />
                                                    </span>
                                                )}
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
                                                    {selected && (
                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                                            <CheckCircleIcon className="h-4 w-4" />
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            </Transition>
                        </div>
                    </Listbox>
                )}

                {/* Association Switcher */}
                <div className="w-56 hidden md:block">
                    <Listbox value={profile?.association_id || ''} onChange={(val) => {
                        if (val === 'NEW') onCreateAssociation();
                        else onSwitchAssociation(val);
                    }}>
                        <div className="relative">
                            <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-gray-50 dark:bg-slate-800 py-1.5 pl-3 pr-10 text-left border border-gray-200 dark:border-slate-700 hover:border-indigo-400 focus:outline-none sm:text-sm transition-colors">
                                <span className="block truncate font-medium text-gray-700 dark:text-gray-200">{activeAssociationName}</span>
                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </span>
                            </Listbox.Button>
                            <Transition
                                as={Fragment}
                                leave="transition ease-in duration-100"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <Listbox.Options className="absolute right-0 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                                    {memberships.map((m) => (
                                        <Listbox.Option
                                            key={m.id}
                                            className={({ active }) =>
                                                `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100'}`
                                            }
                                            value={m.association_id}
                                        >
                                            {({ selected }) => (
                                                <>
                                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                        {m.associations?.name}
                                                    </span>
                                                    {selected && (
                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                                            <CheckCircleIcon className="h-5 w-5" />
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </Listbox.Option>
                                    ))}
                                    <div className="border-t border-gray-100 dark:border-slate-700 my-1"></div>
                                    <Listbox.Option
                                        key="new"
                                        className={({ active }) =>
                                            `relative cursor-pointer select-none py-2 pl-10 pr-4 text-indigo-600 font-medium ${active ? 'bg-indigo-50' : ''}`
                                        }
                                        value="NEW"
                                    >
                                        <div className="flex items-center">
                                            <PlusIcon className="mr-2 h-4 w-4" />
                                            Nieuwe Vereniging
                                        </div>
                                    </Listbox.Option>
                                </Listbox.Options>
                            </Transition>
                        </div>
                    </Listbox>
                </div>

                {/* Profile Dropdown */}
                <Menu as="div" className="relative ml-3">
                    <Menu.Button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                        <span className="sr-only">Open user menu</span>
                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <span className="font-bold text-sm">
                                {profile?.first_name?.charAt(0) || profile?.email?.charAt(0)}
                            </span>
                        </div>
                        <div className="hidden md:flex flex-col items-start">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 leading-tight">
                                {profile?.first_name} {profile?.last_name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                {activeRole === 'admin' ? 'Beheerder' :
                                    activeRole === 'tech_comm' ? 'Tech. Cie' :
                                        activeRole === 'audit_comm' ? 'Kascommissie' : activeRole}
                            </span>
                        </div>
                    </Menu.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-slate-800 py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                            <Menu.Item>
                                {({ active }) => (
                                    <button
                                        onClick={onLogout}
                                        className={`${active ? 'bg-gray-100 dark:bg-slate-700' : ''
                                            } flex w-full items-center px-4 py-2 text-sm text-red-600`}
                                    >
                                        <ArrowLeftOnRectangleIcon className="mr-2 h-4 w-4" />
                                        Uitloggen
                                    </button>
                                )}
                            </Menu.Item>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>
        </header>
    );
};
