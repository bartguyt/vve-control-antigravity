import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { memberService } from '../../features/members/memberService';
import { debugUtils } from '../../utils/debugUtils';

interface Props {
    allowedRoles: string[];
    requireSuperAdmin?: boolean;
    allowMember?: boolean;
    children?: React.ReactNode;
}

export const RoleProtectedRoute: React.FC<Props> = ({
    allowedRoles,
    requireSuperAdmin = false,
    allowMember = false,
    children
}) => {
    // const [profile, setProfile] = useState<Profile | null>(null); // Unused
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = async () => {
        try {
            const p = await memberService.getCurrentProfile();
            debugUtils.log('[DEBUG-AUTH] Profile fetch:', p?.id || 'null', p?.email);

            if (!p) {
                debugUtils.warn('[DEBUG-AUTH] No profile found!');
                setLoading(false);
                return;
            }

            if (requireSuperAdmin) {
                if (p.is_super_admin) {
                    debugUtils.log('[DEBUG-AUTH] Super Admin Access GRANTED');
                    setAuthorized(true);
                } else {
                    debugUtils.warn('[DEBUG-AUTH] Super Admin Access DENIED');
                }
            } else {
                // Check VvE Role
                const activeMembership = p.association_memberships?.find(m => m.association_id === p.association_id);
                const activeRole = activeMembership?.role || 'member';

                debugUtils.log('[DEBUG-AUTH] Check Role:', {
                    allowed: allowedRoles,
                    activeRole,
                    allowMember,
                    isSuper: p.is_super_admin
                });

                if (p.is_super_admin) {
                    setAuthorized(true);
                } else if (allowedRoles.includes(activeRole)) {
                    setAuthorized(true);
                } else if (allowMember && activeRole === 'member') {
                    setAuthorized(true);
                } else {
                    debugUtils.warn('[DEBUG-AUTH] Role Access DENIED');
                }
            }

        } catch (e) {
            debugUtils.error('[DEBUG-AUTH] Error:', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4 text-center">Rechten controleren...</div>;

    if (!authorized) {
        return <Navigate to="/" replace />; // Redirect to dashboard if unauthorized
    }

    if (children) {
        return <>{children}</>;
    }

    return <Outlet />;
};
