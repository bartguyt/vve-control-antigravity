import React, { useState } from 'react';
import { memberService } from './memberService';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button, TextInput, Title } from '@tremor/react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onMemberAdded: () => void;
}

export const AddMemberModal: React.FC<Props> = ({ isOpen, onClose, onMemberAdded }) => {
    const [lidNummer, setLidNummer] = useState('');
    const [bouwnummer, setBouwnummer] = useState('');
    const [straat, setStraat] = useState('');
    const [huisnummer, setHuisnummer] = useState('');
    const [postcode, setPostcode] = useState('');
    const [stad, setStad] = useState('');
    const [email, setEmail] = useState('');
    const [telefoon, setTelefoon] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await memberService.createMemberProfile({
                lid_nummer: lidNummer,
                bouwnummer: bouwnummer,
                straat,
                huisnummer,
                postcode,
                stad,
                email: email || null, // Optional
                telefoon: telefoon || null, // Optional
                role: 'lid'
            });
            onMemberAdded();
            resetAndClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const resetAndClose = () => {
        setLidNummer('');
        setBouwnummer('');
        setStraat('');
        setHuisnummer('');
        setPostcode('');
        setStad('');
        setEmail('');
        setTelefoon('');
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" onClick={resetAndClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-6">
                            <Title>Nieuw Lid Toevoegen</Title>
                            <button onClick={resetAndClose} className="text-gray-400 hover:text-gray-500">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lid Nummer</label>
                                    <TextInput
                                        required
                                        value={lidNummer}
                                        onValueChange={setLidNummer}
                                        placeholder="001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bouwnummer</label>
                                    <TextInput
                                        value={bouwnummer}
                                        onValueChange={setBouwnummer}
                                        placeholder="B-12"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Straat</label>
                                    <TextInput
                                        required
                                        value={straat}
                                        onValueChange={setStraat}
                                        placeholder="Hoofdstraat"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Huisnr.</label>
                                    <TextInput
                                        required
                                        value={huisnummer}
                                        onValueChange={setHuisnummer}
                                        placeholder="1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                                    <TextInput
                                        value={postcode}
                                        onValueChange={setPostcode}
                                        placeholder="1234 AB"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Stad</label>
                                    <TextInput
                                        value={stad}
                                        onValueChange={setStad}
                                        placeholder="Amsterdam"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <TextInput
                                        type="email"
                                        value={email}
                                        onValueChange={setEmail}
                                        placeholder="Optioneel"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
                                    <TextInput
                                        value={telefoon}
                                        onValueChange={setTelefoon}
                                        placeholder="Optioneel"
                                    />
                                </div>
                            </div>

                            {error && <p className="text-sm text-red-600">{error}</p>}

                            <div className="mt-5 sm:mt-6 flex space-x-3 justify-end">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={resetAndClose}
                                >
                                    Annuleren
                                </Button>
                                <Button
                                    type="submit"
                                    loading={loading}
                                >
                                    Opslaan
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
