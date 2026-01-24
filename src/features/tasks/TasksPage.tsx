import React, { useState, useEffect } from 'react';
import { Title, Text, Card, Grid, Badge, TabGroup, TabList, Tab } from '@tremor/react';
import { PencilIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { taskService, type MaintenanceTask, type TaskStatus } from './taskService';
import { memberService } from '../members/memberService';
import { CreateTaskModal } from './CreateTaskModal';
import { PageHeader } from '../../components/ui/PageHeader';

const statusColors: Record<TaskStatus, "blue" | "yellow" | "green" | "gray" | "red"> = {
    open: "blue",
    scheduled: "yellow",
    completed: "green",
    cancelled: "gray"
};

const priorityColors: Record<string, "gray" | "blue" | "orange" | "red"> = {
    low: "gray",
    medium: "blue",
    high: "orange",
    urgent: "red"
};

const statusLabels: Record<TaskStatus, string> = {
    open: "Open",
    scheduled: "Gepland",
    completed: "Afgerond",
    cancelled: "Geannuleerd"
};

export const TasksPage: React.FC = () => {
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<MaintenanceTask | undefined>(undefined);
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [canEdit, setCanEdit] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const profile = await memberService.getCurrentProfile();
            if (!profile?.association_id) return;

            const fetchedTasks = await taskService.getTasks(profile.association_id);
            setTasks(fetchedTasks);

            // Check permissions (Tech Comm, Board, Manager, Admin)
            const role = profile.association_memberships?.find(m => m.association_id === profile.association_id)?.role;
            const isSuperAdmin = profile.is_super_admin;
            const hasEditRights = isSuperAdmin || ['tech_comm', 'board', 'bestuur', 'manager', 'admin'].includes(role || '');
            setCanEdit(hasEditRights);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedTask(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (task: MaintenanceTask) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Weet je zeker dat je deze taak wilt verwijderen?')) return;
        try {
            await taskService.deleteTask(id);
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    const filteredTasks = selectedStatus === 'all'
        ? tasks
        : tasks.filter(t => t.status === selectedStatus);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <PageHeader
                title="Onderhoud & Taken"
                description="Beheer meldingen, reparaties en onderhoudstaken."
                onAdd={canEdit ? handleCreate : undefined}
                addLabel="Nieuwe Taak"
            />

            <CreateTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadData}
                taskToEdit={selectedTask}
            />

            <TabGroup onIndexChange={(idx) => {
                const statuses = ['all', 'open', 'scheduled', 'completed', 'cancelled'];
                setSelectedStatus(statuses[idx]);
            }}>
                <TabList variant="solid" color="indigo" className="mb-6">
                    <Tab>Alles</Tab>
                    <Tab>Open</Tab>
                    <Tab>Gepland</Tab>
                    <Tab>Afgerond</Tab>
                    <Tab>Geannuleerd</Tab>
                </TabList>
            </TabGroup>

            {loading ? (
                <Text>Laden...</Text>
            ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <Title className="mt-2 text-gray-500">Geen taken gevonden</Title>
                    <Text>Er zijn geen taken met deze status.</Text>
                </div>
            ) : (
                <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6">
                    {filteredTasks.map((task) => (
                        <Card key={task.id} decoration="top" decorationColor={statusColors[task.status]}>
                            <div className="flex justify-between items-start mb-2">
                                <Badge color={statusColors[task.status]}>
                                    {statusLabels[task.status]}
                                </Badge>
                                <Badge color={priorityColors[task.priority]} size="xs">
                                    {task.priority.toUpperCase()}
                                </Badge>
                            </div>

                            <Title className="truncate mb-2">{task.title}</Title>
                            <Text className="line-clamp-3 mb-4 h-12">
                                {task.description || "Geen beschrijving"}
                            </Text>

                            <div className="border-t pt-4 mt-4 flex justify-between items-center text-sm text-gray-500">
                                <span>{new Date(task.created_at).toLocaleDateString('nl-NL')}</span>
                                {canEdit && (
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(task)}
                                            className="p-1 hover:bg-gray-100 rounded-full text-indigo-600 transition-colors"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(task.id)}
                                            className="p-1 hover:bg-gray-100 rounded-full text-red-600 transition-colors"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </Grid>
            )}
        </div>
    );
};
