import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
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
    ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';

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
];

const futureNav: NavItem[] = [
    { name: 'Bankrekening', path: '/bank', icon: CreditCardIcon },
    { name: 'Boekhouding', path: '/accounting', icon: BookOpenIcon },
    { name: 'Ledenbijdrage', path: '/contributions', icon: CurrencyEuroIcon },
    { name: 'Stemmen', path: '/voting', icon: HandRaisedIcon },
    { name: 'Meldingen', path: '/notifications', icon: BellIcon },
    { name: 'Taken', path: '/tasks', icon: CheckCircleIcon },
    { name: 'Leveranciers', path: '/suppliers', icon: TruckIcon },
    { name: 'Opdrachten', path: '/assignments', icon: BriefcaseIcon },
    { name: 'Instellingen', path: '/settings', icon: Cog6ToothIcon },
];

export const SidebarLayout: React.FC = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
        }`;

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out">
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <span className="text-xl font-bold text-indigo-600">VvE Control</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-8">
                    {/* Primary Sections */}
                    <div className="space-y-1">
                        {mainNav.map((item) => (
                            <NavLink key={item.path} to={item.path} className={navLinkClass}>
                                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                                {item.name}
                            </NavLink>
                        ))}
                    </div>

                    {/* Future Modules */}
                    <div>
                        <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Toekomstig
                        </h3>
                        <div className="space-y-1">
                            {futureNav.map((item) => (
                                <NavLink key={item.path} to={item.path} className={navLinkClass}>
                                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                                    {item.name}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                </nav>

                {/* Footer / Logout */}
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                        <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5" />
                        Uitloggen
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto focus:outline-none bg-gray-50">
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
