import React, { useState } from 'react';
import { Dialog, DialogPanel, Title, Text, Button, TextInput } from '@tremor/react';
import { vveService } from './vveService';
import { supabase } from '../../lib/supabase';

interface CreateVveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newVveId: string) => void;
}

export const CreateVveModal: React.FC<CreateVveModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [kvk, setKvk] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const newVve = await vveService.createVve(name, kvk);

            // Switch context immediately to the new VvE
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('profiles')
                    .update({ vve_id: newVve.id })
                    .eq('user_id', user.id);
            }

            onSuccess(newVve.id);
            onClose();
            setName('');
            setKvk('');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Kon VvE niet aanmaken.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} static={true}>
            <DialogPanel>
                <Title>Nieuwe VvE Starten</Title>
                <Text className="mb-4">
                    Maak een nieuwe omgeving aan voor je Vereniging van Eigenaren.
                </Text>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            VvE Naam <span className="text-red-500">*</span>
                        </label>
                        <TextInput
                            placeholder="Bijv. VvE De Goudkust"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            KvK Nummer (Optioneel)
                        </label>
                        <TextInput
                            placeholder="12345678"
                            value={kvk}
                            onChange={(e) => setKvk(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end space-x-2 mt-6">
                        <Button variant="secondary" onClick={onClose} type="button">
                            Annuleren
                        </Button>
                        <Button type="submit" loading={loading} disabled={!name}>
                            Aanmaken & Starten
                        </Button>
                    </div>
                </form>
            </DialogPanel>
        </Dialog>
    );
};
