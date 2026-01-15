import React, { useState, useEffect } from 'react';
import { memberService } from './memberService';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Profile } from '../../types/database';
import { Button, TextInput, Title, Select, SelectItem, Switch } from '@tremor/react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onMemberUpdated: () => void;
    member: Profile;
}

export const EditMemberModal: React.FC<Props> = ({ isOpen, onClose, onMemberUpdated, member }) => {
    const [lidNummer, setLidNummer] = useState(member.lid_nummer || '');
    const [bouwnummer, setBouwnummer] = useState(member.bouwnummer || '');
    const [straat, setStraat] = useState(member.straat || '');
    const [huisnummer, setHuisnummer] = useState(member.huisnummer || '');
    const [postcode, setPostcode] = useState(member.postcode || '');
    const [stad, setStad] = useState(member.stad || '');
    const [email, setEmail] = useState(member.email || '');
    const [telefoon, setTelefoon] = useState(member.telefoonnummer || ''); // Field name correction
    const [firstName, setFirstName] = useState(member.first_name || '');
    const [lastName, setLastName] = useState(member.last_name || '');

    // Membership specific fields
    const [role, setRole] = useState(member.vve_memberships?.[0]?.role || 'member');
    const [isActive, setIsActive] = useState(member.vve_memberships?.[0]?.is_active ?? true);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLidNummer(member.lid_nummer || '');
        setBouwnummer(member.bouwnummer || '');
        setStraat(member.straat || '');
        setHuisnummer(member.huisnummer || '');
        setPostcode(member.postcode || '');
        setStad(member.stad || '');
        setEmail(member.email || '');
        setTelefoon(member.telefoon || '');
        setFirstName(member.first_name || '');
        setLastName(member.last_name || '');
    }, [member]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Update Profile
            await memberService.updateMember(member.id, {
                lid_nummer: lidNummer,
                bouwnummer: bouwnummer,
                straat,
                huisnummer,
                postcode,
                stad,
                email: email || null,
                telefoonnummer: telefoon || null, // Field name correction
                first_name: firstName,
                last_name: lastName
            });

            // 2. Update Membership (Role / Active)
            // We assume 1 VvE for now, or just update the one we loaded.
            const membership = member.vve_memberships?.[0];
            if (membership) {
                await memberService.updateMembership(membership.id, {
                    role,
                    is_active: isActive
                });
            }

            onMemberUpdated();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-6">
                            <Title>Lid Bewerken</Title>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Voornaam</label>
                                    <TextInput
                                        value={firstName}
                                        onValueChange={setFirstName}
                                        placeholder="Jan"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Achternaam</label>
                                    <TextInput
                                        value={lastName}
                                        onValueChange={setLastName}
                                        placeholder="Jansen"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                    <Select
                                        value={role}
                                        onValueChange={(val) => setRole(val as any)}
                                        enableClear={false}
                                    >
                                        <SelectItem value="member">Lid</SelectItem>
                                        <SelectItem value="board">Bestuur</SelectItem>
                                        <SelectItem value="audit_comm">Kascommissie</SelectItem>
                                        <SelectItem value="tech_comm">Technische Cie</SelectItem>
                                        {/* Admin cannot be set here usually, but let's allow if user is super admin? For now simple roles. */}
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Switch checked={isActive} onChange={setIsActive} />
                                        <span className="text-sm text-gray-600">{isActive ? 'Actief' : 'Inactief'}</span>
                                    </div>
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

                            <div className="mt-5 sm:mt-6 flex justify-between items-center">
                                <Button
                                    type="button"
                                    variant="light"
                                    color="red"
                                    onClick={async () => {
                                        if (confirm("Weet je zeker dat je dit lid wilt verwijderen? Dit kan niet ongedaan worden gemaakt.")) {
                                            try {
                                                setLoading(true);
                                                await memberService.deleteMember(member.id);
                                                onMemberUpdated(); // Or callback to refresh list
                                                onClose();
                                                // If on detail page, parent should handle redirect, but generic callback is fine?
                                                // Actually onMemberUpdated might just reload current view. 
                                                // If we delete, we might need to navigate away if on detail page.
                                                // For now, let's assume calling onMemberUpdated is enough or we might need a specific onDelete prop.
                                                // But simplistic:
                                                window.location.href = '/members'; // Force redirect to list
                                            } catch (e: any) {
                                                console.error(e);
                                                setError(e.message);
                                                setLoading(false);
                                            }
                                        }
                                    }}
                                >
                                    Verwijder
                                </Button>
                                <div className="flex space-x-3">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={onClose}
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
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
