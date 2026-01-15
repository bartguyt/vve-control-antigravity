import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { memberService } from '../../features/members/memberService';

interface Props {
    allowedRoles: string[];
    requireSuperAdmin?: boolean;
}

export const RoleProtectedRoute: React.FC<Props> = ({ allowedRoles, requireSuperAdmin = false }) => {
    // const [profile, setProfile] = useState<Profile | null>(null); // Unused
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = async () => {
        try {
            const p = await memberService.getCurrentProfile();
            // setProfile(p);

            if (!p) {
                setLoading(false);
                return;
            }

            if (requireSuperAdmin) {
                if (p.is_super_admin) {
                    setAuthorized(true);
                }
            } else {
                // Check VvE Role
                const activeMembership = p.vve_memberships?.find(m => m.vve_id === p.vve_id);
                const activeRole = activeMembership?.role || 'member';

                // Super admins always have access (override)? 
                // Usually yes, but let's stick to explicit roles + super admin bypass if needed.
                // For now, if you are super admin, you can probably access everything, 
                // BUT the logic "impersonate" means you HAVE a role in that VvE context (added via impersonation logic if needed).
                // Actually, our RLS fix allows super admins to see everything, relying on `vve_memberships` might return nothing if they strictly don't have a row.
                // But the "Impersonate" button in AdminDashboard DOES switch context. 
                // Does it create a membership? No. 
                // So Super Admin might NOT have a membership row.

                if (p.is_super_admin) {
                    setAuthorized(true);
                } else if (allowedRoles.includes(activeRole)) {
                    setAuthorized(true);
                }
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4 text-center">Rechten controleren...</div>;

    if (!authorized) {
        return <Navigate to="/" replace />; // Redirect to dashboard if unauthorized
    }

    return <Outlet />;
};
