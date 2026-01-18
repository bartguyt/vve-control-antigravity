import React, { useEffect, useState } from 'react';
import {
    Card,
    Title,
    Text,
    Badge,
    Button,
    TabGroup,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
} from '@tremor/react';
import {
    BellIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArchiveBoxIcon,
    ClipboardDocumentListIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { notificationService, type AppNotification } from '../../services/notificationService';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
        } catch (e) {
            toast.error('Kon meldingen niet laden');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        const channel = supabase
            .channel('notifications-full-page')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications'
                },
                () => {
                    loadData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleMarkRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            toast.success('Gemarkeerd als gelezen');
            loadData();
        } catch (e) {
            toast.error('Fout bij bijwerken');
        }
    };

    const handleMarkUnread = async (id: string) => {
        try {
            await notificationService.markAsUnread(id);
            toast.success('Gemarkeerd als ongelezen');
            loadData();
        } catch (e) {
            toast.error('Fout bij bijwerken');
        }
    };

    const handleConvertToTask = async (n: AppNotification) => {
        try {
            await notificationService.convertToTask(n);
            toast.success('Taak aangemaakt');
            loadData();
            setSelectedNotification(null);
        } catch (e) {
            toast.error('Fout bij maken taak');
        }
    };

    const NotificationListItem = ({ notification }: { notification: AppNotification }) => {
        const isSelected = selectedNotification?.id === notification.id;
        const isUnread = notification.status === 'unread';

        return (
            <div
                onClick={() => setSelectedNotification(notification)}
                className={`p-4 border-b cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50'} ${isUnread ? 'bg-blue-50/50' : ''}`}
            >
                <div className="flex items-start gap-3">
                    <div className="mt-1">
                        {notification.priority === 'urgent' ? (
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                        ) : (
                            <BellIcon className="h-5 w-5 text-blue-500" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                {notification.title}
                            </h3>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                {new Date(notification.created_at).toLocaleDateString('nl-NL')}
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                        </p>
                        <div className="flex gap-2 mt-2">
                            <Badge color={notification.type === 'financial_dispute' ? 'red' : 'blue'} size="xs">
                                {notification.type === 'financial_dispute' ? 'Geschil' : 'Systeem'}
                            </Badge>
                            {notification.priority === 'urgent' && (
                                <Badge color="red" size="xs">Urgent</Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const NotificationDetail = ({ notification }: { notification: AppNotification }) => {
        const metadata = notification.metadata || {};

        return (
            <div className="h-full flex flex-col">
                <div className="flex items-start justify-between p-6 border-b">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            {notification.priority === 'urgent' ? (
                                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                            ) : (
                                <BellIcon className="h-6 w-6 text-blue-500" />
                            )}
                            <Title>{notification.title}</Title>
                        </div>
                        <div className="flex gap-2 items-center text-sm text-gray-500">
                            <span>{new Date(notification.created_at).toLocaleString('nl-NL')}</span>
                            <span>•</span>
                            <Badge color={notification.type === 'financial_dispute' ? 'red' : 'blue'}>
                                {notification.type === 'financial_dispute' ? 'Financieel Geschil' : 'Systeem'}
                            </Badge>
                            {notification.priority === 'urgent' && (
                                <>
                                    <span>•</span>
                                    <Badge color="red">Urgent</Badge>
                                </>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedNotification(null)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="prose max-w-none">
                        <Text className="text-base whitespace-pre-wrap">{notification.message}</Text>
                    </div>

                    {Object.keys(metadata).length > 0 && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Details</h4>
                            <dl className="space-y-2">
                                {metadata.sender_name && (
                                    <div className="flex justify-between text-sm">
                                        <dt className="text-gray-600">Van:</dt>
                                        <dd className="font-medium text-gray-900">{metadata.sender_name}</dd>
                                    </div>
                                )}
                                {metadata.association_name && (
                                    <div className="flex justify-between text-sm">
                                        <dt className="text-gray-600">VvE:</dt>
                                        <dd className="font-medium text-gray-900">{metadata.association_name}</dd>
                                    </div>
                                )}
                                {metadata.amount !== undefined && (
                                    <div className="flex justify-between text-sm">
                                        <dt className="text-gray-600">Bedrag:</dt>
                                        <dd className="font-medium text-gray-900">€{metadata.amount}</dd>
                                    </div>
                                )}
                                {metadata.item && (
                                    <div className="flex justify-between text-sm">
                                        <dt className="text-gray-600">Betreft:</dt>
                                        <dd className="font-medium text-gray-900">{metadata.item}</dd>
                                    </div>
                                )}
                                {metadata.dispute_date && (
                                    <div className="flex justify-between text-sm">
                                        <dt className="text-gray-600">Datum geschil:</dt>
                                        <dd className="font-medium text-gray-900">
                                            {new Date(metadata.dispute_date).toLocaleString('nl-NL')}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t bg-gray-50 flex gap-3">
                    {notification.status === 'unread' ? (
                        <Button
                            variant="secondary"
                            icon={CheckCircleIcon}
                            onClick={() => handleMarkRead(notification.id)}
                        >
                            Markeer als gelezen
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            icon={BellIcon}
                            onClick={() => handleMarkUnread(notification.id)}
                        >
                            Markeer als ongelezen
                        </Button>
                    )}
                    <Button
                        variant="primary"
                        icon={ClipboardDocumentListIcon}
                        onClick={() => handleConvertToTask(notification)}
                    >
                        Maak taak
                    </Button>
                </div>
            </div>
        );
    };

    const unreadNotifications = notifications.filter(n => n.status === 'unread');
    const readNotifications = notifications.filter(n => n.status !== 'unread');

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-end">
                <div>
                    <Title>Meldingen</Title>
                    <Text>Beheer alle meldingen en acties voor uw VvE.</Text>
                </div>
                <Button variant="secondary" onClick={loadData}>Verversen</Button>
            </header>

            <TabGroup>
                <TabList className="mt-8">
                    <Tab icon={BellIcon}>Ongelezen ({unreadNotifications.length})</Tab>
                    <Tab icon={CheckCircleIcon}>Gelezen</Tab>
                    <Tab icon={ArchiveBoxIcon}>Alle ({notifications.length})</Tab>
                </TabList>
                <TabPanels>
                    {[unreadNotifications, readNotifications, notifications].map((list, idx) => (
                        <TabPanel key={idx}>
                            <Card className="mt-6 p-0 overflow-hidden">
                                <div className="grid grid-cols-1 lg:grid-cols-2 divide-x min-h-[600px]">
                                    {/* List */}
                                    <div className="overflow-y-auto max-h-[600px]">
                                        {list.length === 0 ? (
                                            <div className="p-10 text-center">
                                                <BellIcon className="mx-auto h-12 w-12 text-gray-300" />
                                                <Text className="mt-4 text-gray-500">Geen meldingen</Text>
                                            </div>
                                        ) : (
                                            list.map(n => (
                                                <NotificationListItem key={n.id} notification={n} />
                                            ))
                                        )}
                                    </div>

                                    {/* Detail */}
                                    <div className="bg-white">
                                        {selectedNotification ? (
                                            <NotificationDetail notification={selectedNotification} />
                                        ) : (
                                            <div className="h-full flex items-center justify-center p-10 text-center">
                                                <div>
                                                    <BellIcon className="mx-auto h-16 w-16 text-gray-200" />
                                                    <Text className="mt-4 text-gray-400">
                                                        Selecteer een melding om details te bekijken
                                                    </Text>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </TabPanel>
                    ))}
                </TabPanels>
            </TabGroup>
        </div>
    );
};
