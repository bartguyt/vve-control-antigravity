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
    Icon
} from '@tremor/react';
import {
    UserGroupIcon,
    DocumentIcon,
    CalendarIcon,
    ArrowRightOnRectangleIcon,
    PencilSquareIcon,
    TrashIcon,
    UserIcon,
    PlusCircleIcon
} from '@heroicons/react/24/outline';

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
                // In a real app we'd have a specific stats endpoint
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
        <div className="p-6 space-y-6 animate-fade-in bg-gray-50 min-h-screen">
            <header className="mb-8">
                <Title>Welkom, {profile?.email?.split('@')[0]}</Title>
                <Text>Overzicht van uw Vereniging portal</Text>
            </header>

            {/* KPI Grid */}
            <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6">
                <Card decoration="top" decorationColor="indigo">
                    <Flex justifyContent="start" className="space-x-4">
                        <Icon icon={UserGroupIcon} variant="light" size="xl" color="indigo" />
                        <div className="truncate">
                            <Text>Totaal Leden</Text>
                            <Metric>{stats.members}</Metric>
                        </div>
                    </Flex>
                </Card>
                <Card decoration="top" decorationColor="fuchsia">
                    <Flex justifyContent="start" className="space-x-4">
                        <Icon icon={DocumentIcon} variant="light" size="xl" color="fuchsia" />
                        <div className="truncate">
                            <Text>Documenten</Text>
                            <Metric>{stats.documents}</Metric>
                        </div>
                    </Flex>
                </Card>
                <Card decoration="top" decorationColor="emerald">
                    <Flex justifyContent="start" className="space-x-4">
                        <Icon icon={CalendarIcon} variant="light" size="xl" color="emerald" />
                        <div className="truncate">
                            <Text>Agenda Items</Text>
                            <Metric>{stats.events}</Metric>
                        </div>
                    </Flex>
                </Card>
            </Grid>

            {/* Activity Feeds */}
            <Grid numItems={1} numItemsLg={2} className="gap-6 mt-6">
                <Card>
                    <Title>Laatste Acties</Title>
                    <List className="mt-4 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {activities.length === 0 ? (
                            <Text className="italic p-4">Nog geen activiteiten.</Text>
                        ) : (
                            activities.map((activity) => (
                                <ListItem key={activity.id}>
                                    <Flex justifyContent="start" className="space-x-4 truncate">
                                        {getActionIcon(activity.action_type)}
                                        <div className="truncate">
                                            <Text className="truncate font-medium text-gray-900">{activity.description}</Text>
                                            <Text className="truncate text-xs">
                                                {activity.profiles?.email || 'System'}
                                            </Text>
                                        </div>
                                    </Flex>
                                    <Badge size="xs" color="gray">
                                        {formatDate(activity.created_at)}
                                    </Badge>
                                </ListItem>
                            ))
                        )}
                    </List>
                </Card>

                <Card>
                    <Title>Recent Ingelogd</Title>
                    <List className="mt-4 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {logins.length === 0 ? (
                            <Text className="italic p-4">Nog geen logins.</Text>
                        ) : (
                            logins.map((login) => (
                                <ListItem key={login.id}>
                                    <Flex justifyContent="start" className="space-x-4 truncate">
                                        <Icon icon={ArrowRightOnRectangleIcon} size="sm" variant="simple" color="violet" />
                                        <Text className="truncate font-medium">{login.profiles?.email}</Text>
                                    </Flex>
                                    <Text className="truncate text-xs">
                                        {formatDate(login.created_at)}
                                    </Text>
                                </ListItem>
                            ))
                        )}
                    </List>
                </Card>
            </Grid>
        </div>
    );
};
