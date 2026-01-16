import React, { useState, useEffect } from 'react';
import { Button, TextInput, Textarea, Select, SelectItem } from '@tremor/react';
import { assignmentService, type Assignment, type AssignmentStatus } from './assignmentService';
import { supplierService, type Supplier } from '../suppliers/supplierService';
import { documentService, type Document } from '../documents/documentService';
import { memberService } from '../members/memberService';
import { BaseModal } from '../../components/ui/BaseModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    assignmentToEdit?: Assignment;
}

export const CreateAssignmentModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, assignmentToEdit }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [documentId, setDocumentId] = useState('');
    const [status, setStatus] = useState<AssignmentStatus>('concept');
    const [amount, setAmount] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadDependencies();
        }
    }, [isOpen]);

    useEffect(() => {
        if (assignmentToEdit) {
            setTitle(assignmentToEdit.title);
            setDescription(assignmentToEdit.description || '');
            setSupplierId(assignmentToEdit.supplier_id || '');
            setDocumentId(assignmentToEdit.document_id || '');
            setStatus(assignmentToEdit.status);
            setAmount(assignmentToEdit.amount?.toString() || '');
            setScheduledDate(assignmentToEdit.scheduled_date || '');
        } else {
            setTitle('');
            setDescription('');
            setSupplierId('');
            setDocumentId('');
            setStatus('concept');
            setAmount('');
            setScheduledDate('');
        }
    }, [assignmentToEdit, isOpen]);

    const loadDependencies = async () => {
        try {
            const profile = await memberService.getCurrentProfile();
            if (profile?.vve_id) {
                const [sups, docs] = await Promise.all([
                    supplierService.getSuppliers(profile.vve_id),
                    documentService.getDocuments() // This fetches documents for current VvE context (via RLS/Filter)
                ]);
                setSuppliers(sups);
                setDocuments(docs);
            }
        } catch (e) {
            console.error('Error loading dependencies', e);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const profile = await memberService.getCurrentProfile();
            if (!profile?.vve_id) return;

            const payload = {
                vve_id: profile.vve_id,
                title,
                description,
                supplier_id: supplierId || null,
                document_id: documentId || null,
                status,
                amount: amount ? parseFloat(amount) : null,
                scheduled_date: scheduledDate || null
            };

            if (assignmentToEdit) {
                await assignmentService.updateAssignment(assignmentToEdit.id, payload);
            } else {
                await assignmentService.createAssignment(payload);
            }

            onSuccess();
            onClose();
        } catch (e) {
            console.error(e);
            alert('Fout bij opslaan opdracht');
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={assignmentToEdit ? 'Opdracht Bewerken' : 'Nieuwe Opdracht'}
            size="lg"
            footer={(
                <>
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Annuleren
                    </Button>
                    <Button type="button" loading={loading} disabled={!title} onClick={() => handleSubmit()}>
                        {assignmentToEdit ? 'Opslaan' : 'Aanmaken'}
                    </Button>
                </>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving *</label>
                    <TextInput
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Korte omschrijving (bijv. Dakgoot reparatie)"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Leverancier</label>
                        <Select value={supplierId} onValueChange={setSupplierId} placeholder="Kies leverancier...">
                            {suppliers.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name} ({s.category})</SelectItem>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <Select value={status} onValueChange={(val) => setStatus(val as AssignmentStatus)}>
                            <SelectItem value="concept">Concept</SelectItem>
                            <SelectItem value="sent">Verzonden</SelectItem>
                            <SelectItem value="accepted">Geaccepteerd</SelectItem>
                            <SelectItem value="completed">Uitgevoerd</SelectItem>
                            <SelectItem value="paid">Betaald</SelectItem>
                            <SelectItem value="refused">Geweigerd</SelectItem>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bedrag (€)</label>
                        <TextInput
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Datum Uitvoering</label>
                        <input
                            type="date"
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Koppel Document (Offerte/Factuur)</label>
                    <Select value={documentId} onValueChange={setDocumentId} placeholder="Kies document...">
                        {documents.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                        ))}
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                        Upload het bestand eerst via 'Documenten' om het hier te kiezen.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Toelichting</label>
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Details over de opdracht, afspraken, etc."
                    />
                </div>
            </form>
        </BaseModal>
    );
};
