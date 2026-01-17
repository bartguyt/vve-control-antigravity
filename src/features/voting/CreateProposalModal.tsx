import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Title, Text, TextInput, Textarea, Button, Select, SelectItem } from '@tremor/react';
import { votingService } from './votingService';
import type { Meeting } from '../../types/database';
import { toast } from 'sonner';

interface CreateProposalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProposalCreated: () => void;
}

export const CreateProposalModal: React.FC<CreateProposalModalProps> = ({
    isOpen,
    onClose,
    onProposalCreated
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('NORMAL');
    const [meetingId, setMeetingId] = useState<string>('');
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadMeetings();
        }
    }, [isOpen]);

    const loadMeetings = async () => {
        try {
            const data = await votingService.getMeetings('PLANNED');
            setMeetings(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await votingService.createProposal({
                title,
                description,
                type: type as any,
                meeting_id: meetingId || null,
                status: 'OPEN' // Default to OPEN for now, or DRAFT? Let's say OPEN for MVP.
            });
            toast.success('Voorstel aangemaakt');
            onProposalCreated();
            onClose();
            // Reset form
            setTitle('');
            setDescription('');
            setType('NORMAL');
            setMeetingId('');
        } catch (error: any) {
            console.error(error);
            toast.error('Fout bij aanmaken: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} static={true}>
            <DialogPanel className="max-w-lg">
                <Title>Nieuw Voorstel</Title>
                <Text className="mb-4">
                    Maak een nieuw stemming onderwerp aan voor de VvE.
                </Text>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Text className="text-sm font-medium mb-1">Titel</Text>
                        <TextInput
                            required
                            placeholder="Bijv. Vervangen dakbedekking"
                            value={title}
                            onValueChange={setTitle}
                        />
                    </div>

                    <div>
                        <Text className="text-sm font-medium mb-1">Omschrijving</Text>
                        <Textarea
                            required
                            rows={4}
                            placeholder="Toelichting op het voorstel..."
                            value={description}
                            onValueChange={setDescription}
                        />
                    </div>

                    <div>
                        <Text className="text-sm font-medium mb-1">Type Stemming</Text>
                        <Select value={type} onValueChange={setType}>
                            <SelectItem value="NORMAL">Normaal (&gt;50%)</SelectItem>
                            <SelectItem value="SPECIAL">Gekwalificeerd (&gt;66%)</SelectItem>
                            <SelectItem value="UNANIMOUS">Unaniem (100%)</SelectItem>
                        </Select>
                    </div>

                    <div>
                        <Text className="text-sm font-medium mb-1">Koppel aan Vergadering (Optioneel)</Text>
                        <Select value={meetingId} onValueChange={setMeetingId}>
                            <SelectItem value="">Geen vergadering</SelectItem>
                            {meetings.map(m => (
                                <SelectItem key={m.id} value={m.id}>
                                    {m.name} ({new Date(m.date).toLocaleDateString()})
                                </SelectItem>
                            ))}
                        </Select>
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                        <Button variant="secondary" color="gray" onClick={onClose} type="button">
                            Annuleren
                        </Button>
                        <Button loading={loading} type="submit" color="indigo">
                            Aanmaken
                        </Button>
                    </div>
                </form>
            </DialogPanel>
        </Dialog>
    );
};
