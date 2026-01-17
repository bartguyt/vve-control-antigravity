import React, { useState, useEffect } from 'react';
import { Title, Text, Card, Grid, Badge } from '@tremor/react';
import { PencilIcon, TrashIcon, DocumentTextIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { assignmentService, type Assignment } from './assignmentService';
import { memberService } from '../members/memberService';
import { CreateAssignmentModal } from './CreateAssignmentModal';
import { PageHeader } from '../../components/ui/PageHeader';

const statusColors: Record<string, "gray" | "blue" | "green" | "emerald" | "red" | "orange"> = {
    concept: "gray",
    sent: "blue",
    accepted: "orange",
    completed: "green",
    paid: "emerald",
    refused: "red"
};

const statusLabels: Record<string, string> = {
    concept: "Concept",
    sent: "Verzonden",
    accepted: "Geaccepteerd",
    completed: "Uitgevoerd",
    paid: "Betaald",
    refused: "Geweigerd"
};

export const AssignmentsPage: React.FC = () => {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | undefined>(undefined);
    const [canEdit, setCanEdit] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const profile = await memberService.getCurrentProfile();
            if (!profile?.association_id) return;

            const data = await assignmentService.getAssignments(profile.association_id);
            setAssignments(data);

            // Check permissions
            const role = profile.association_memberships?.find(m => m.association_id === profile.association_id)?.role;
            const isSuperAdmin = profile.is_super_admin;
            // Board, Manager, Tech Comm, Admin can edit
            const hasEditRights = isSuperAdmin || ['bestuur', 'board', 'manager', 'admin', 'tech_comm'].includes(role || '');
            setCanEdit(hasEditRights);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedAssignment(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (assignment: Assignment) => {
        setSelectedAssignment(assignment);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Weet je zeker dat je deze opdracht wilt verwijderen?')) return;
        try {
            await assignmentService.deleteAssignment(id);
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <PageHeader
                title="Opdrachten & Werkbonnen"
                description="Beheer opdrachten voor leveranciers, van offerte tot betaling."
                onAdd={canEdit ? handleCreate : undefined}
                addLabel="Nieuwe Opdracht"
            />

            <CreateAssignmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadData}
                assignmentToEdit={selectedAssignment}
            />

            {loading ? (
                <Text>Laden...</Text>
            ) : assignments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <Title className="mt-2 text-gray-500">Geen opdrachten gevonden</Title>
                    <Text>Maak een nieuwe opdracht aan om te beginnen.</Text>
                </div>
            ) : (
                <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6">
                    {assignments.map((assignment) => (
                        <Card key={assignment.id} className="flex flex-col h-full ring-blue-500/20">
                            <div className="flex justify-between items-start mb-4">
                                <Badge color={statusColors[assignment.status] || "gray"}>
                                    {statusLabels[assignment.status] || assignment.status}
                                </Badge>
                                <Text className="font-mono font-medium">
                                    {assignment.amount ? `€ ${assignment.amount.toFixed(2)}` : '-'}
                                </Text>
                            </div>

                            <Title className="truncate mb-1">{assignment.title}</Title>

                            {assignment.suppliers && (
                                <Text className="text-sm text-gray-500 mb-2">
                                    {assignment.suppliers.name}
                                </Text>
                            )}

                            <div className="flex-1">
                                <Text className="line-clamp-3 text-sm">
                                    {assignment.description || "Geen toelichting"}
                                </Text>
                            </div>

                            {assignment.documents && (
                                <div className="mt-4 p-2 bg-gray-50 rounded text-xs flex items-center space-x-2 text-indigo-600 truncate">
                                    <DocumentTextIcon className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{assignment.documents.title}</span>
                                </div>
                            )}

                            <div className="border-t pt-4 mt-4 flex justify-between items-center text-sm text-gray-500">
                                <span>{assignment.scheduled_date ? new Date(assignment.scheduled_date).toLocaleDateString('nl-NL') : 'Niet gepland'}</span>
                                {canEdit && (
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(assignment)}
                                            className="p-1 hover:bg-gray-100 rounded-full text-indigo-600 transition-colors"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(assignment.id)}
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
