import React, { useEffect, useState } from 'react';
import { adminService } from './adminService';
import type { AdminUser, AdminStats } from './adminService';
import type { VvE } from '../../types/database';
import {
    Card,
    Title,
    Text,
    Metric,
    Grid,
    Button,
    Table,
    TableHead,
    TableRow,
    TableHeaderCell,
    TableBody,
    TableCell,
    TabGroup,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Badge
} from '@tremor/react';
import { supabase } from '../../lib/supabase';
import {
    BuildingOfficeIcon,
    UserGroupIcon,
    ServerIcon,
    ArrowRightOnRectangleIcon,
    ChartPieIcon,
    UsersIcon
} from '@heroicons/react/24/outline';

const roles = [
    { value: 'admin', label: 'Beheerder' },
    { value: 'board', label: 'Bestuur' },
    { value: 'manager', label: 'Beheerder (Manager)' },
    { value: 'audit_comm', label: 'Kascommissie' },
    { value: 'tech_comm', label: 'Tech. Cie' },
    { value: 'member', label: 'Lid' },
];

export const AdminDashboardPage: React.FC = () => {
    const [vves, setVves] = useState<VvE[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [vveList, userList, fetchedStats] = await Promise.all([
                adminService.getAllVves(),
                adminService.getAllUsers(), // Fetch users
                adminService.getStats()
            ]);
            setVves(vveList);
            setUsers(userList);
            setStats(fetchedStats);
        } catch (error) {
            console.error('Error loading admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleImpersonateStart = async (vveId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase
                .from('profiles')
                .update({ vve_id: vveId })
                .eq('user_id', user.id);

            window.location.href = '/';
        } catch (e) {
            console.error("Failed to switch context", e);
        }
    };

    const handleRoleChange = async (membershipId: string, newRole: string) => {
        try {
            await adminService.updateMembershipRole(membershipId, newRole);
            // Optimistic update or reload? Let's verify by reload for now or fetch single user...
            // Simple: just reload all for consistency
            loadData();
        } catch (e) {
            console.error("Failed to update role", e);
        }
    };

    if (loading) {
        return <div className="text-center p-10">Laden...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <Title>Super Admin Dashboard</Title>
                <Text>Platform breed beheer en statistieken.</Text>
            </div>

            <TabGroup>
                <TabList>
                    <Tab icon={ChartPieIcon}>Overzicht & VvE's</Tab>
                    <Tab icon={UsersIcon}>Ledenbeheer ({users.length})</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        {/* KPI Cards */}
                        <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6 mt-6">
                            <Card decoration="top" decorationColor="indigo">
                                <div className="flex items-center space-x-4">
                                    <div className="p-2 bg-indigo-50 rounded-full">
                                        <BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <Text>Totaal VvE's</Text>
                                        <Metric>{stats?.totalVves}</Metric>
                                    </div>
                                </div>
                            </Card>
                            <Card decoration="top" decorationColor="fuchsia">
                                <div className="flex items-center space-x-4">
                                    <div className="p-2 bg-fuchsia-50 rounded-full">
                                        <UserGroupIcon className="h-6 w-6 text-fuchsia-600" />
                                    </div>
                                    <div>
                                        <Text>Totaal Gebruikers</Text>
                                        <Metric>{stats?.totalUsers}</Metric>
                                    </div>
                                </div>
                            </Card>
                            <Card decoration="top" decorationColor="emerald">
                                <div className="flex items-center space-x-4">
                                    <div className="p-2 bg-emerald-50 rounded-full">
                                        <ServerIcon className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <Text>Actieve Logins (30d)</Text>
                                        <Metric>{stats?.activeLoginsLast30Days}</Metric>
                                    </div>
                                </div>
                            </Card>
                        </Grid>

                        {/* VvE List */}
                        <Card className="mt-6">
                            <Title>VvE Beheer</Title>
                            <Table className="mt-5">
                                <TableHead>
                                    <TableRow>
                                        <TableHeaderCell>Naam</TableHeaderCell>
                                        <TableHeaderCell>ID</TableHeaderCell>
                                        <TableHeaderCell>Aangemaakt op</TableHeaderCell>
                                        <TableHeaderCell>Actie</TableHeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {vves.map((vve) => (
                                        <TableRow key={vve.id}>
                                            <TableCell>
                                                <span className="font-medium text-gray-900">{vve.name}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Text className="font-mono text-xs">{vve.id}</Text>
                                            </TableCell>
                                            <TableCell>
                                                <Text>{new Date(vve.created_at).toLocaleDateString()}</Text>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="xs"
                                                    variant="secondary"
                                                    icon={ArrowRightOnRectangleIcon}
                                                    onClick={() => handleImpersonateStart(vve.id)}
                                                >
                                                    Beheer als Bestuur
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabPanel>

                    {/* USERS TAB */}
                    <TabPanel>
                        <Card className="mt-6">
                            <Title>Geregistreerde Gebruikers</Title>
                            <Text>Alle gebruikers en hun koppelingen.</Text>

                            <Table className="mt-5">
                                <TableHead>
                                    <TableRow>
                                        <TableHeaderCell>Gebruiker</TableHeaderCell>
                                        <TableHeaderCell>Super Admin</TableHeaderCell>
                                        <TableHeaderCell>Lidmaatschappen</TableHeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{user.email}</span>
                                                    {(user.first_name || user.last_name) && (
                                                        <span className="text-xs text-gray-500">
                                                            {user.first_name} {user.last_name}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-gray-400 font-mono">{user.id}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {user.is_super_admin ? (
                                                    <Badge color="fuchsia">Ja</Badge>
                                                ) : (
                                                    <Text>Nee</Text>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-2">
                                                    {user.vve_memberships?.map(m => (
                                                        <div key={m.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-100">
                                                            <div className="text-sm">
                                                                <span className="font-semibold text-gray-700 block">{m.vves?.name || 'Onbekend'}</span>
                                                                <span className="text-gray-500 text-xs">{m.vve_id}</span>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                {/* Using a native select for density, or Tremor Select if preferred but native fits better in compact tables */}
                                                                <select
                                                                    className="text-xs border-gray-300 rounded shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                                    value={m.role}
                                                                    onChange={(e) => handleRoleChange(m.id, e.target.value)}
                                                                >
                                                                    {roles.map(r => (
                                                                        <option key={r.value} value={r.value}>{r.label}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(!user.vve_memberships || user.vve_memberships.length === 0) && (
                                                        <Text className="italic text-gray-400">Geen VvE koppelingen</Text>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabPanel>
                </TabPanels>
            </TabGroup>
        </div>
    );
};
