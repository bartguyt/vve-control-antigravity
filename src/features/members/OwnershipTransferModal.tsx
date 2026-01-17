
import React, { useState } from 'react';
import { Dialog, DialogPanel, Title, Text, Button, Select, SelectItem, TextInput, SearchSelect, SearchSelectItem } from '@tremor/react';
import { memberService } from './memberService';
import { toast } from 'sonner';

interface OwnershipTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTransferComplete: () => void;
    memberId: string;
    currentOwnerName: string;
}

export const OwnershipTransferModal: React.FC<OwnershipTransferModalProps> = ({
    isOpen,
    onClose,
    onTransferComplete,
    memberId,
    currentOwnerName
}) => {
    const [step, setStep] = useState<'select' | 'confirm'>('select');
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const handleSearch = async (query: string) => {
        if (query.length < 2) return;
        try {
            const results = await memberService.searchProfiles(query);
            setSearchResults(results || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSelect = (value: string) => {
        setSelectedProfileId(value);
        const profile = searchResults.find(p => p.id === value);
        setSelectedProfile(profile);
    };

    const handleNext = () => {
        if (!selectedProfileId) {
            toast.error('Selecteer een nieuwe eigenaar.');
            return;
        }
        setStep('confirm');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        try {
            await memberService.transferOwnership(memberId, selectedProfileId, notes);
            toast.success('Eigendom succesvol overgedragen.');
            onTransferComplete();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error('Fout bij overdracht: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} static={true}>
            <DialogPanel className="max-w-lg">
                <Title>Eigendom Overdragen</Title>

                {step === 'select' ? (
                    <>
                        <Text className="mt-2 text-sm text-gray-500">
                            Zoek de nieuwe eigenaar in het systeem.
                        </Text>
                        <div className="mt-6 space-y-4">
                            <div>
                                <Text className="uppercase text-xs font-bold text-gray-500">Huidige Eigenaar</Text>
                                <div className="p-2 bg-gray-50 border rounded text-gray-700 font-medium">
                                    {currentOwnerName}
                                </div>
                            </div>

                            <div>
                                <Text className="uppercase text-xs font-bold text-gray-500 mb-1">Nieuwe Eigenaar</Text>
                                <SearchSelect
                                    value={selectedProfileId}
                                    onValueChange={handleSelect}
                                    onSearchValueChange={handleSearch}
                                    placeholder="Zoek op naam of email..."
                                >
                                    {searchResults.map(p => (
                                        <SearchSelectItem key={p.id} value={p.id}>
                                            {p.first_name} {p.last_name} ({p.email})
                                        </SearchSelectItem>
                                    ))}
                                </SearchSelect>
                            </div>

                            <div className="flex gap-2 justify-end mt-8 pt-4">
                                <Button variant="secondary" color="gray" onClick={onClose}>
                                    Annuleren
                                </Button>
                                <Button onClick={handleNext} disabled={!selectedProfileId}>
                                    Volgende
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
                            <Title className="text-orange-800 text-sm">Controleer de overdracht</Title>
                            <Text className="text-orange-700 mt-1 text-sm">
                                Je staat op het punt om het eigendom over te dragen. Dit kan niet ongedaan gemaakt worden via deze knop (alleen door Beheerder).
                            </Text>

                            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="block font-bold text-gray-500">Van:</span>
                                    {currentOwnerName}
                                </div>
                                <div>
                                    <span className="block font-bold text-gray-500">Naar:</span>
                                    {selectedProfile?.first_name} {selectedProfile?.last_name}
                                </div>
                            </div>
                        </div>

                        <div>
                            <Text className="uppercase text-xs font-bold text-gray-500 mb-1">Notitie (Optioneel)</Text>
                            <TextInput
                                value={notes}
                                onValueChange={setNotes}
                                placeholder="Reden van overdracht..."
                            />
                        </div>

                        <div className="flex gap-2 justify-end mt-8 border-t pt-4">
                            <Button variant="secondary" color="gray" onClick={() => setStep('select')} type="button">
                                Terug
                            </Button>
                            <Button loading={loading} type="submit" color="orange">
                                Definitief Overdragen
                            </Button>
                        </div>
                    </form>
                )}
            </DialogPanel>
        </Dialog>
    );
};
