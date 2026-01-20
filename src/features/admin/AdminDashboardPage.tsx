import React, { useEffect, useState } from 'react';
import { adminService } from './adminService';
import type { AdminUser, AdminStats } from './adminService';
import type { Association as VvE } from '../../types/database';
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
import { debugUtils } from '../../utils/debugUtils';
import {
    BuildingOfficeIcon,
    UserGroupIcon,
    ServerIcon,
    ArrowRightOnRectangleIcon,
    ChartPieIcon,
    UsersIcon,
    ServerStackIcon,
    ArrowPathIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { superAdminService, type EmailLog } from '../superadmin/superAdminService';
import { toast } from 'sonner';

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
    const [emailQueue, setEmailQueue] = useState<EmailLog[]>([]);
    const [timeLeft, setTimeLeft] = useState(60);
    const [batchLoading, setBatchLoading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // 1. Critical Data
            const [vveList, userList, fetchedStats] = await Promise.all([
                adminService.getAllVves(),
                adminService.getAllUsers(),
                adminService.getStats()
            ]);
            setVves(vveList);
            setUsers(userList);
            setStats(fetchedStats);

            // 2. Non-critical Data (Email Queue) - Fail gracefully
            try {
                const emailQueueList = await superAdminService.getEmailQueue();
                setEmailQueue(emailQueueList);
            } catch (e) {
                debugUtils.warn('Could not fetch email queue:', e);
                // toast.error('Email wachtrij niet bereikbaar'); // Optional
            }
        } catch (error) {
            console.error('Error loading admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Timer countdown effect
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) return 60; // Reset loop
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleRunBatch = async () => {
        setBatchLoading(true);
        try {
            const result = await superAdminService.triggerEmailBatch();

            // Check for failures in the result
            const failures = result.results?.filter((r: any) => r.status === 'failed');
            if (failures && failures.length > 0) {
                console.error("Batch failures:", failures);
                toast.error(`Er zijn ${failures.length} emails mislukt. Zie console voor details.`);
                // Show first error reason
                if (failures[0].error) {
                    toast.error(`Reden: ${failures[0].error}`);
                }
            } else {
                toast.success(`Batch verwerkt: ${result.processed} emails`);
            }

            loadData();
            setTimeLeft(60); // Reset timer
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || 'Fout bij verwerken batch');
        } finally {
            setBatchLoading(false);
        }
    };

    const handleImpersonateStart = async (vveId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase
                .from('profiles')
                .update({ association_id: vveId }) // Wait, vveId variable might still be named vveId, but column is association_id
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
                    <Tab icon={ServerStackIcon}>Email Wachtrij ({emailQueue.filter(e => e.status === 'pending').length})</Tab>
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
                                        <Metric>{stats?.totalAssociations}</Metric>
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
                                                    {user.association_memberships?.map(m => (
                                                        <div key={m.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-100">
                                                            <div className="text-sm">
                                                                <span className="font-semibold text-gray-700 block">{m.associations?.name || 'Onbekend'}</span>
                                                                <span className="text-gray-500 text-xs">{m.association_id}</span>
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
                                                    {(!user.association_memberships || user.association_memberships.length === 0) && (
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

                    {/* EMAIL QUEUE TAB */}
                    <TabPanel>
                        <div className="mt-6 space-y-6">
                            <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6">
                                <Card>
                                    <Text>Wachtrij</Text>
                                    <Metric>{emailQueue.filter(e => e.status === 'pending').length}</Metric>
                                </Card>
                                <Card>
                                    <Text>Verstuurd Vandaag</Text>
                                    <Metric>
                                        {emailQueue.filter(e =>
                                            e.status === 'sent' &&
                                            new Date(e.sent_at!).toDateString() === new Date().toDateString()
                                        ).length}
                                    </Metric>
                                </Card>
                                <Card>
                                    <div className="flex flex-col h-full justify-between">
                                        <div>
                                            <Text>Volgende Batch</Text>
                                            <div className="flex items-baseline mt-2">
                                                <Metric>{timeLeft}s</Metric>
                                                <Text className="ml-2">tot uitvoering</Text>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Grid>

                            <Card>
                                <div className="flex justify-between items-center mb-4">
                                    <Title>Email Logboek</Title>
                                    <div className="flex gap-2">
                                        {emailQueue.some(e => e.status === 'failed') && (
                                            <Button
                                                variant="secondary"
                                                color="amber"
                                                onClick={async () => {
                                                    if (!confirm('Alle mislukte emails opnieuw proberen?')) return;
                                                    try {
                                                        await superAdminService.retryAllFailed();
                                                        toast.success('Alle mislukte emails zijn gereset naar wachtrij');
                                                        loadData();
                                                    } catch (e) {
                                                        toast.error('Kon niet resetten');
                                                    }
                                                }}
                                            >
                                                Herstel Fouten
                                            </Button>
                                        )}
                                        <Button
                                            variant="secondary"
                                            icon={ArrowPathIcon}
                                            onClick={loadData}
                                            tooltip="Verversen"
                                        />
                                        <Button
                                            onClick={handleRunBatch}
                                            loading={batchLoading}
                                            icon={ServerStackIcon}
                                        >
                                            Verwerk Wachtrij Nu
                                        </Button>
                                    </div>
                                </div>

                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableHeaderCell>Ontvanger</TableHeaderCell>
                                            <TableHeaderCell>VvE</TableHeaderCell>
                                            <TableHeaderCell>Onderwerp</TableHeaderCell>
                                            <TableHeaderCell>Status</TableHeaderCell>
                                            <TableHeaderCell>Tijdstip</TableHeaderCell>
                                            <TableHeaderCell></TableHeaderCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {emailQueue.map(log => (
                                            <TableRow key={log.id}>
                                                <TableCell>
                                                    <div className="font-medium">
                                                        {log.recipient?.first_name} {log.recipient?.last_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{log.recipient_email}</div>
                                                </TableCell>
                                                <TableCell>{log.association?.name || '-'}</TableCell>
                                                <TableCell className="max-w-xs truncate" title={log.subject}>{log.subject}</TableCell>
                                                <TableCell>
                                                    <Badge color={
                                                        log.status === 'sent' ? 'green' :
                                                            log.status === 'failed' ? 'red' : 'yellow'
                                                    }>
                                                        {log.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {new Date(log.created_at).toLocaleString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {log.status === 'failed' && (
                                                        <Button
                                                            size="xs"
                                                            variant="light"
                                                            color="amber"
                                                            onClick={async () => {
                                                                try {
                                                                    await superAdminService.retryEmails([log.id]);
                                                                    toast.success('Email gereset');
                                                                    loadData();
                                                                } catch (e) {
                                                                    toast.error('Fout bij herstellen');
                                                                }
                                                            }}
                                                        >
                                                            Opnieuw
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {emailQueue.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center">
                                                    <Text>Geen emails gevonden.</Text>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    </TabPanel>
                </TabPanels>
            </TabGroup>
        </div>
    );
};
