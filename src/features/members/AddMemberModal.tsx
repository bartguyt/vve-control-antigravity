import React, { useState } from 'react';
import { memberService } from './memberService';
import type { AppRole } from '../../types/database';

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMemberAdded: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, onMemberAdded }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [role, setRole] = useState<AppRole>('lid');
    const [lidNummer, setLidNummer] = useState('');
    const [straat, setStraat] = useState('');
    const [huisnummer, setHuisnummer] = useState('');
    const [postcode, setPostcode] = useState('');
    const [stad, setStad] = useState('');
    const [email, setEmail] = useState('');
    const [telefoon, setTelefoon] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await memberService.createMemberProfile({
                role,
                lid_nummer: lidNummer || null,
                straat: straat || null,
                huisnummer: huisnummer || null,
                postcode: postcode || null,
                stad: stad || null,
                email: email || null,
                telefoon: telefoon || null,
                bouwnummer: null,
            });
            onMemberAdded();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
                <h2 className="text-xl font-bold mb-4">Nieuw Lid Toevoegen</h2>

                {error && (
                    <div className="mb-4 bg-red-50 p-2 text-red-700 rounded text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Lidm. Nummer</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                value={lidNummer}
                                onChange={e => setLidNummer(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Rol</label>
                            <select
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                value={role}
                                onChange={e => setRole(e.target.value as AppRole)}
                            >
                                <option value="lid">Lid</option>
                                <option value="bestuur">Bestuur</option>
                                <option value="kascommissie">Kascommissie</option>
                                <option value="techcommissie">Techcommissie</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Straat</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                value={straat}
                                onChange={e => setStraat(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Huisnr.</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                value={huisnummer}
                                onChange={e => setHuisnummer(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Postcode</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                value={postcode}
                                onChange={e => setPostcode(e.target.value)}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Stad</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                value={stad}
                                onChange={e => setStad(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="optioneel voor uitnodiging later"
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Annuleren
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {loading ? 'Bezig...' : 'Opslaan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
