import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Title, Text } from '@tremor/react';
import { Cog6ToothIcon, LinkIcon } from '@heroicons/react/24/outline';

export const SystemSettingsPage: React.FC = () => {
    const location = useLocation();

    // Determine active tab based on route
    const isGeneral = location.pathname === '/system/general' || location.pathname === '/system';
    const isConnections = location.pathname.startsWith('/system/connections');

    return (
        <div className="p-6 space-y-6">
            <header>
                <Title>Systeeminstellingen</Title>
                <Text>Beheer uw vereniging instellingen en koppelingen</Text>
            </header>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8" aria-label="Tabs">
                    <NavLink
                        to="/system/general"
                        className={({ isActive }) =>
                            `flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                isGeneral
                                    ? 'border-slate-blue text-slate-blue'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`
                        }
                    >
                        <Cog6ToothIcon className="h-5 w-5" />
                        Algemeen
                    </NavLink>
                    <NavLink
                        to="/system/connections/bank"
                        className={({ isActive }) =>
                            `flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                isConnections
                                    ? 'border-slate-blue text-slate-blue'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`
                        }
                    >
                        <LinkIcon className="h-5 w-5" />
                        Koppelingen
                    </NavLink>
                </nav>
            </div>

            {/* Content */}
            <div className="mt-6">
                <Outlet />
            </div>
        </div>
    );
};
