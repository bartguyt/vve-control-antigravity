import React, { useEffect, useState } from 'react';
import { agendaService, type AgendaEvent } from './agendaService';
import { AddEventModal } from './AddEventModal';
import { memberService } from '../members/memberService';
import {
    Card,
    Title,
    Text,
    TabGroup,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Button,
    List,
    ListItem,
    Badge,
    Icon,
    Flex
} from '@tremor/react';
import {
    CalendarIcon,
    ListBulletIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    MapPinIcon,
    ClockIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';

export const AgendaPage: React.FC = () => {
    const [events, setEvents] = useState<AgendaEvent[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [eventsData] = await Promise.all([
                agendaService.getEvents(),
                memberService.getCurrentProfile()
            ]);
            setEvents(eventsData);
        } catch (error) {
            console.error('Error loading events:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calendar Helper Functions
    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const totalDays = daysInMonth(year, month);
        const startDay = (firstDayOfMonth(year, month) + 6) % 7; // Adjust to start Monday
        const days = [];

        // Padding
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`pad-${i}`} className="h-32 border-b border-r bg-gray-50/50"></div>);
        }

        // Days
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.start_time.startsWith(dateStr));
            const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

            days.push(
                <div key={d} className="h-32 border-b border-r p-2 hover:bg-gray-50 transition-colors group relative overflow-y-auto">
                    <span className={`text-sm font-semibold rounded-full w-7 h-7 flex items-center justify-center ${isToday ? 'bg-indigo-600 text-white' : 'text-gray-700'}`}>
                        {d}
                    </span>
                    <div className="mt-1 space-y-1">
                        {dayEvents.map(e => (
                            <div
                                key={e.id}
                                className="text-[10px] p-1 bg-indigo-100 text-indigo-700 rounded truncate font-medium cursor-pointer hover:bg-indigo-200 transition-colors"
                                title={e.title}
                                onClick={(ev) => {
                                    ev.stopPropagation();
                                    handleEditEvent(e);
                                }}
                            >
                                {e.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return days;
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('nl-NL', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);

    const handleEditEvent = (event: AgendaEvent) => {
        setSelectedEvent(event);
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setSelectedEvent(null);
    };

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="Agenda"
                onAdd={() => {
                    setSelectedEvent(null);
                    setIsAddModalOpen(true);
                }}
                addLabel="Nieuw Evenement"
            />

            <TabGroup>
                <TabList className="mt-4">
                    <Tab icon={CalendarIcon}>Kalender</Tab>
                    <Tab icon={ListBulletIcon}>Lijst</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                        <Card className="mt-4 p-0 overflow-hidden">
                            <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-white">
                                <Title className="capitalize">
                                    {currentMonth.toLocaleString('nl-NL', { month: 'long', year: 'numeric' })}
                                </Title>
                                <div className="flex space-x-2">
                                    <Button variant="secondary" icon={ChevronLeftIcon} onClick={prevMonth} />
                                    <Button variant="secondary" icon={ChevronRightIcon} onClick={nextMonth} />
                                </div>
                            </div>
                            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
                                {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(day => (
                                    <div key={day} className="py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-widest">{day}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 bg-white">
                                {renderCalendar()}
                            </div>
                        </Card>
                    </TabPanel>
                    <TabPanel>
                        <Card className="mt-4">
                            {loading ? (
                                <Text className="text-center py-8">Laden...</Text>
                            ) : events.length === 0 ? (
                                <Text className="text-center py-8 italic">Geen geplande evenementen.</Text>
                            ) : (
                                <List>
                                    {events.map(event => (
                                        <ListItem
                                            key={event.id}
                                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                                            onClick={() => handleEditEvent(event)}
                                        >
                                            <Flex justifyContent="start" alignItems="start" className="space-x-4 w-full">
                                                <div className="flex-shrink-0 w-16 h-16 bg-indigo-50 rounded-lg flex flex-col items-center justify-center text-indigo-600 ring-1 ring-indigo-100">
                                                    <span className="text-xs font-bold uppercase">{new Date(event.start_time).toLocaleString('nl-NL', { month: 'short' })}</span>
                                                    <span className="text-xl font-bold">{new Date(event.start_time).getDate()}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <Flex justifyContent="start" className="space-x-2">
                                                        {event.categories && event.categories.length > 0 ? (
                                                            <div className="flex gap-1 flex-wrap">
                                                                {event.categories.map(cat => (
                                                                    <Badge key={cat.id} size="xs" color="gray">
                                                                        {cat.name}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            // Fallback for partial data or legacy
                                                            event.event_categories?.name && (
                                                                <Badge size="xs" color="gray">
                                                                    {event.event_categories.name}
                                                                </Badge>
                                                            )
                                                        )}
                                                        <Text className="font-bold text-gray-900">{event.title}</Text>
                                                    </Flex>
                                                    <Text className="mt-1 text-sm line-clamp-1">{event.description}</Text>
                                                    <div className="flex items-center space-x-4 mt-2">
                                                        <Flex justifyContent="start" className="space-x-1" alignItems="center">
                                                            <Icon icon={ClockIcon} size="xs" color="gray" />
                                                            <Text className="text-xs">{formatTime(event.start_time)}</Text>
                                                        </Flex>
                                                        {event.location && (
                                                            <Flex justifyContent="start" className="space-x-1" alignItems="center">
                                                                <Icon icon={MapPinIcon} size="xs" color="gray" />
                                                                <Text className="text-xs">{event.location}</Text>
                                                            </Flex>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-gray-400">
                                                    <ChevronRightIcon className="h-5 w-5" />
                                                </div>
                                            </Flex>
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </Card>
                    </TabPanel>
                </TabPanels>
            </TabGroup>

            {isAddModalOpen && (
                <AddEventModal
                    isOpen={isAddModalOpen}
                    onClose={handleCloseModal}
                    onEventSaved={loadData}
                    event={selectedEvent}
                />
            )}
        </div>
    );
};
