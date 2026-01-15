import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { memberService } from '../../features/members/memberService';
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export const DebugBar: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [session, setSession] = useState<any>(null);
    const location = useLocation();

    // Check visibility preference
    useEffect(() => {
        const checkVisibility = () => {
            const enabled = localStorage.getItem('vve_debug_mode') === 'true';
            setIsVisible(enabled);
        };

        checkVisibility();
        window.addEventListener('storage', checkVisibility);
        return () => window.removeEventListener('storage', checkVisibility);
    }, []);

    const refreshData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        try {
            const p = await memberService.getCurrentProfile();
            setProfile(p);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (isVisible) refreshData();
    }, [isVisible, location.pathname]);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-green-400 font-mono text-xs p-2 z-[9999] border-t border-green-800 shadow-2xl opacity-95 hover:opacity-100 transition-opacity">
            <div className="flex justify-between items-start max-w-7xl mx-auto">
                <div className="flex gap-8 overflow-x-auto whitespace-nowrap pb-2">
                    {/* AUTH SECTION */}
                    <div className="flex flex-col gap-1">
                        <span className="text-gray-500 font-bold uppercase tracking-wider">Auth</span>
                        <div>UID: <span className="text-white select-all">{session?.user?.id}</span></div>
                        <div>Email: <span className="text-white select-all">{session?.user?.email}</span></div>
                        <div>Role: <span className="text-white">{session?.user?.role}</span></div>
                    </div>

                    {/* PROFILE SECTION */}
                    <div className="flex flex-col gap-1">
                        <span className="text-gray-500 font-bold uppercase tracking-wider">Profile</span>
                        <div>PID: <span className="text-white select-all">{profile?.id}</span></div>
                        <div>User ID: <span className="text-white select-all">{profile?.user_id}</span></div>
                        <div>VvE ID: <span className="text-white select-all">{profile?.vve_memberships?.[0]?.vve_id}</span></div>
                    </div>

                    {/* PERMISSIONS SECTION */}
                    <div className="flex flex-col gap-1">
                        <span className="text-gray-500 font-bold uppercase tracking-wider">Perms</span>
                        <div>Super Admin: <span className={profile?.is_super_admin ? 'text-green-300 font-bold' : 'text-red-400'}>{profile?.is_super_admin ? 'YES' : 'NO'}</span></div>
                        <div>Membership: <span className="text-white">{profile?.vve_memberships?.[0]?.role || 'NONE'}</span></div>
                    </div>

                    {/* ROUTE SECTION */}
                    <div className="flex flex-col gap-1">
                        <span className="text-gray-500 font-bold uppercase tracking-wider">Route</span>
                        <div>Path: <span className="text-white">{location.pathname}</span></div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={refreshData} className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white" title="Refresh Data">
                        <ArrowPathIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => {
                        localStorage.setItem('vve_debug_mode', 'false');
                        setIsVisible(false);
                        window.dispatchEvent(new Event('storage'));
                    }} className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white" title="Close Debug Bar">
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
