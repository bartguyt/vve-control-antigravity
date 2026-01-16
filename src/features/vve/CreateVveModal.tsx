import React, { useState } from 'react';
import { Button, TextInput, Text } from '@tremor/react';
import { vveService } from './vveService';
import { supabase } from '../../lib/supabase';
import { BaseModal } from '../../components/ui/BaseModal';

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

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
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
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Nieuwe VvE Starten"
            footer={(
                <>
                    <Button variant="secondary" onClick={onClose} type="button">
                        Annuleren
                    </Button>
                    <Button type="button" loading={loading} disabled={!name} onClick={() => handleSubmit()}>
                        Aanmaken & Starten
                    </Button>
                </>
            )}
        >
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
                        onValueChange={setName}
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
                        onValueChange={setKvk}
                    />
                </div>

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {error}
                    </div>
                )}
            </form>
        </BaseModal>
    );
};
