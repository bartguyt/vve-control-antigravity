import React, { Fragment, useEffect, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { BellIcon, ClipboardDocumentListIcon, ExclamationTriangleIcon, } from '@heroicons/react/24/outline';
import { Badge, Icon, Text, Title } from '@tremor/react';
import { notificationService } from '../../services/notificationService';
import type { AppNotification } from '../../services/notificationService';
import { associationService } from '../../lib/association';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { formatRelativeTime } from '../../utils/dateUtils';
import { debugUtils } from '../../utils/debugUtils';

export const NotificationCenter: React.FC = () => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = async () => {
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
            const count = data.filter(n => n.status === 'unread').length;
            setUnreadCount(count);
        } catch (e) {
            debugUtils.error('Error loading notifications', e);
        }
    };

    useEffect(() => {
        loadNotifications();

        // Polling fallback (every 10 seconds) in case Realtime doesn't work
        const pollingInterval = setInterval(() => {
            loadNotifications();
        }, 10000);

        // Get current association for filtering
        let currentAssociationId: string | null = null;

        const setupRealtime = async () => {
            try {
                currentAssociationId = await associationService.getCurrentAssociationId();

                if (!currentAssociationId) {
                    debugUtils.warn('No association ID found for realtime subscription');
                    return null;
                }

                // Subscribe to changes in the notifications table for this association
                const channel = supabase
                    .channel('notifications-changes')
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'notifications',
                            filter: `association_id=eq.${currentAssociationId}`
                        },
                        (payload) => {
                            debugUtils.log('✅ Notification change received via Realtime!', payload);
                            loadNotifications();
                        }
                    )
                    .subscribe((status) => {
                        debugUtils.log('Realtime subscription status:', status);
                    });

                return channel;
            } catch (e) {
                debugUtils.error('Failed to setup realtime:', e);
                return null;
            }
        };

        const channelPromise = setupRealtime();

        return () => {
            clearInterval(pollingInterval);
            channelPromise.then(channel => {
                if (channel) {
                    supabase.removeChannel(channel);
                }
            });
        };
    }, []);

    const handleConvertToTask = async (notification: AppNotification) => {
        try {
            await notificationService.convertToTask(notification);
            toast.success('Taak aangemaakt');
            loadNotifications();
        } catch (e) {
            toast.error('Fout bij maken taak');
        }
    };

    const handleMarkRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            loadNotifications();
        } catch (e) {
            debugUtils.error(e);
        }
    };

    return (
        <Popover className="relative">
            {({ open }) => (
                <>
                    <Popover.Button className={`group inline-flex items-center rounded-md text-base font-medium hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${open ? 'text-gray-900' : 'text-gray-500'}`}>
                        <div className="relative p-2">
                            <BellIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" aria-hidden="true" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white" />
                            )}
                        </div>
                    </Popover.Button>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                    >
                        <Popover.Panel className="absolute right-0 z-50 mt-2 w-96 transform px-2 sm:px-0">
                            <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                                <div className="relative bg-white p-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <Title>Notificaties</Title>
                                        <Badge size="xs" color="gray">{notifications.length}</Badge>
                                    </div>

                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <Text className="text-center py-4 italic">Geen meldingen.</Text>
                                        ) : (
                                            <div className="space-y-3">
                                                {notifications.map((n) => (
                                                    <div key={n.id} className={`p-3 rounded-md border ${n.status === 'unread' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                                                        <div className="flex items-start gap-3">
                                                            {n.priority === 'urgent' ? (
                                                                <Icon icon={ExclamationTriangleIcon} color="red" size="sm" variant="simple" />
                                                            ) : (
                                                                <Icon icon={BellIcon} color="blue" size="sm" variant="simple" />
                                                            )}
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-start">
                                                                    <Text className={`text-sm ${n.status === 'unread' ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                                                                        {n.title}
                                                                    </Text>
                                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                                                        {formatRelativeTime(n.created_at)}
                                                                    </span>
                                                                </div>
                                                                <Text className="text-xs text-gray-500 mt-1">
                                                                    {n.message}
                                                                </Text>

                                                                <div className="flex gap-2 mt-2 justify-end">
                                                                    <a href="/general/notifications" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mr-auto">
                                                                        Bekijk details
                                                                    </a>
                                                                    {n.status === 'unread' && (
                                                                        <button onClick={() => handleMarkRead(n.id)} className="text-xs text-blue-600 hover:text-blue-800">
                                                                            Markeer gelezen
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleConvertToTask(n)}
                                                                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 border rounded px-2 py-1 bg-white hover:bg-gray-100 transition-colors"
                                                                    >
                                                                        <ClipboardDocumentListIcon className="h-3 w-3" />
                                                                        Maak taak
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 pt-2 border-t text-center">
                                        <a href="/general/notifications" className="text-xs text-indigo-600 font-medium hover:text-indigo-800">
                                            Alle meldingen bekijken &rarr;
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </Popover.Panel>
                    </Transition>
                </>
            )}
        </Popover>
    );
};
