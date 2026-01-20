import React, { useEffect, useState } from 'react';
import { memberService } from '../members/memberService';
import { activityService } from '../../services/activityService';
import { documentService } from '../documents/documentService';
import { agendaService } from '../agenda/agendaService';
import type { Profile } from '../../types/database';
import {
    Grid,
    Card,
    Text,
    Metric,
    Title,
    Flex,
    List,
    ListItem,
    Badge,
    Icon,
    Button
} from '@tremor/react';
import {
    UserGroupIcon,
    DocumentIcon,
    CalendarIcon,
    ArrowRightOnRectangleIcon,
    PencilSquareIcon,
    TrashIcon,
    UserIcon,
    PlusCircleIcon,
    Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { ContactsWidget } from './ContactsWidget';
import { AssociationsWidget } from './AssociationsWidget';
import { DashboardSettingsModal } from './DashboardSettingsModal';

interface DashboardConfig {
    showStats: boolean;
    showActivities: boolean;
    showLogins: boolean;
    showContacts: boolean;
    showAssociations: boolean;
}

const DEFAULT_CONFIG: DashboardConfig = {
    showStats: true,
    showActivities: true,
    showLogins: true,
    showContacts: true,
    showAssociations: true
};

export const OverviewPage: React.FC = () => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [activities, setActivities] = useState<any[]>([]);
    const [logins, setLogins] = useState<any[]>([]);
    const [stats, setStats] = useState({
        members: 0,
        documents: 0,
        events: 0
    });
    const [loading, setLoading] = useState(true);

    // Widget Config State
    const [config, setConfig] = useState<DashboardConfig>(() => {
        const saved = localStorage.getItem('dashboard_config');
        return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        const loadOverviewData = async () => {
            setLoading(true);
            try {
                // Fetch basic data
                const [myProfile, recentActivities, recentLogins] = await Promise.all([
                    memberService.getCurrentProfile(),
                    activityService.getRecentActivities(),
                    activityService.getRecentLogins()
                ]);

                // Parallel fetch for quick counts (not ideal for perf but fine for MVP)
                const [members, docs, events] = await Promise.all([
                    memberService.getMembers(),
                    documentService.getDocuments(),
                    agendaService.getEvents()
                ]);

                setProfile(myProfile);
                setActivities(recentActivities);
                setLogins(recentLogins);
                setStats({
                    members: members.length,
                    documents: docs.length,
                    events: events.length
                });

            } catch (error) {
                console.error('Error loading overview data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadOverviewData();
    }, []);

    const handleUpdateConfig = (newConfig: DashboardConfig) => {
        setConfig(newConfig);
        localStorage.setItem('dashboard_config', JSON.stringify(newConfig));
    };

    const getActionIcon = (type: string) => {
        switch (type) {
            case 'create': return <Icon icon={PlusCircleIcon} color="emerald" variant="solid" tooltip="Aangemaakt" size="sm" />;
            case 'update': return <Icon icon={PencilSquareIcon} color="blue" variant="solid" tooltip="Aangepast" size="sm" />;
            case 'delete': return <Icon icon={TrashIcon} color="red" variant="solid" tooltip="Verwijderd" size="sm" />;
            case 'login': return <Icon icon={ArrowRightOnRectangleIcon} color="violet" variant="solid" tooltip="Ingelogd" size="sm" />;
            default: return <Icon icon={UserIcon} color="gray" variant="solid" size="sm" />;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('nl-NL', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Dashboard laden...</div>;
    }

    return (
        <div className="p-6 space-y-6 animate-fade-in bg-sea-salt min-h-screen">
            <header className="mb-8 flex justify-between items-start">
                <div>
                    <Title className="font-heading text-slate-blue">Welkom, {profile?.email?.split('@')[0]}</Title>
                    <Text className="text-slate-blue/70">Overzicht van uw Vereniging portal</Text>
                </div>
                <Button
                    variant="secondary"
                    icon={Cog6ToothIcon}
                    onClick={() => setIsSettingsOpen(true)}
                    className="border-slate-blue/20 text-slate-blue hover:border-slate-blue hover:bg-slate-blue/5 rounded-xl"
                >
                    Aanpassen
                </Button>
            </header>

            {/* KPI Grid */}
            {config.showStats && (
                <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6">
                    <Card decoration="top" decorationColor="slate" className="rounded-card shadow-card ring-0 bg-white p-6">
                        <Flex justifyContent="start" className="space-x-4">
                            <div className="p-3 rounded-full bg-slate-100 text-slate-700">
                                <UserGroupIcon className="h-6 w-6" />
                            </div>
                            <div className="truncate">
                                <Text className="text-slate-blue/70">Totaal Leden</Text>
                                <Metric className="font-heading text-slate-blue tabular-nums">{stats.members}</Metric>
                            </div>
                        </Flex>
                    </Card>
                    <Card decoration="top" decorationColor="orange" className="rounded-card shadow-card ring-0 bg-white p-6">
                        <Flex justifyContent="start" className="space-x-4">
                            <div className="p-3 rounded-full bg-orange-50 text-orange-600">
                                <DocumentIcon className="h-6 w-6" />
                            </div>
                            <div className="truncate">
                                <Text className="text-slate-blue/70">Documenten</Text>
                                <Metric className="font-heading text-slate-blue tabular-nums">{stats.documents}</Metric>
                            </div>
                        </Flex>
                    </Card>
                    <Card decoration="top" decorationColor="emerald" className="rounded-card shadow-card ring-0 bg-white p-6">
                        <Flex justifyContent="start" className="space-x-4">
                            <div className="p-3 rounded-full bg-emerald-50 text-emerald-600">
                                <CalendarIcon className="h-6 w-6" />
                            </div>
                            <div className="truncate">
                                <Text className="text-slate-blue/70">Agenda Items</Text>
                                <Metric className="font-heading text-slate-blue tabular-nums">{stats.events}</Metric>
                            </div>
                        </Flex>
                    </Card>
                </Grid>
            )}

            {/* Widgets Grid */}
            <Grid numItems={1} numItemsLg={2} className="gap-6 mt-6">

                {config.showActivities && (
                    <Card className="rounded-card shadow-card ring-0 bg-white p-6">
                        <Title className="font-heading text-slate-blue">Laatste Acties</Title>
                        <List className="mt-4 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {activities.length === 0 ? (
                                <Text className="italic p-4 text-slate-blue/60">Nog geen activiteiten.</Text>
                            ) : (
                                activities.map((activity) => (
                                    <ListItem key={activity.id} className="border-slate-blue/10">
                                        <Flex justifyContent="start" className="space-x-4 truncate">
                                            {getActionIcon(activity.action_type)}
                                            <div className="truncate">
                                                <Text className="truncate font-medium text-slate-blue">{activity.description}</Text>
                                                <Text className="truncate text-xs text-slate-blue/60">
                                                    {activity.profiles?.email || 'System'}
                                                </Text>
                                            </div>
                                        </Flex>
                                        <Badge size="xs" color="gray" className="rounded-md">
                                            {formatDate(activity.created_at)}
                                        </Badge>
                                    </ListItem>
                                ))
                            )}
                        </List>
                    </Card>
                )}

                {config.showLogins && (
                    <Card className="rounded-card shadow-card ring-0 bg-white p-6">
                        <Title className="font-heading text-slate-blue">Recent Ingelogd</Title>
                        <List className="mt-4 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {logins.length === 0 ? (
                                <Text className="italic p-4 text-slate-blue/60">Nog geen logins.</Text>
                            ) : (
                                logins.map((login) => (
                                    <ListItem key={login.id} className="border-slate-blue/10">
                                        <Flex justifyContent="start" className="space-x-4 truncate">
                                            <Icon icon={ArrowRightOnRectangleIcon} size="sm" variant="simple" color="violet" />
                                            <Text className="truncate font-medium text-slate-blue">{login.profiles?.email}</Text>
                                        </Flex>
                                        <Text className="truncate text-xs text-slate-blue/60">
                                            {formatDate(login.created_at)}
                                        </Text>
                                    </ListItem>
                                ))
                            )}
                        </List>
                    </Card>
                )}

                {config.showAssociations && (
                    <AssociationsWidget />
                )}

                {config.showContacts && (
                    <ContactsWidget />
                )}

            </Grid>

            <DashboardSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                config={config}
                onUpdateConfig={handleUpdateConfig}
            />
        </div>
    );
};
