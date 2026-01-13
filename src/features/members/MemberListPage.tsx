import React, { useEffect, useState } from 'react';
import { memberService } from './memberService';
import { AddMemberModal } from './AddMemberModal';
import { EditMemberModal } from './EditMemberModal';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types/database';

export const MemberListPage: React.FC = () => {
    const [members, setMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<Profile | null>(null);

    // Current User State
    const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [membersData, myProfile] = await Promise.all([
                memberService.getMembers(),
                memberService.getCurrentProfile()
            ]);
            setMembers(membersData);
            setCurrentUserProfile(myProfile);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMemberAdded = () => {
        loadData();
    };

    const handleMemberUpdated = () => {
        loadData();
    };

    const openEditModal = (member: Profile) => {
        setSelectedMember(member);
        setIsEditModalOpen(true);
    };

    const canAdd = currentUserProfile?.role === 'admin';

    // Helper to check if can edit a specific row
    const canEdit = (member: Profile) => {
        if (!currentUserProfile) return false;
        if (currentUserProfile.role === 'admin') return true;
        // Basic check: is this me? (using user_id match if available)
        return member.user_id === currentUserProfile.user_id;
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-800';
            case 'bestuur': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">VvE Overzicht</h1>
                <button
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-700"
                >
                    Uitloggen
                </button>
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Ledenlijst</h2>
                {canAdd && (
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Lid Toevoegen
                    </button>
                )}
            </div>

            <AddMemberModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onMemberAdded={handleMemberAdded}
            />

            <EditMemberModal
                isOpen={isEditModalOpen}
                onClose={() => { setSelectedMember(null); setIsEditModalOpen(false); }}
                onMemberUpdated={handleMemberUpdated}
                member={selectedMember}
                currentUserRole={currentUserProfile?.role || null}
                currentUserId={currentUserProfile?.user_id || null}
            />

            {loading ? (
                <div className="text-center py-10">
                    <p className="text-gray-500">Leden laden...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 p-4 border border-red-200 rounded-md">
                    <p className="text-red-700">Fout: {error}</p>
                </div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Lidm. #
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Adres
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rol
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contact
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Acties</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {members.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 text-sm">
                                        Geen leden gevonden in deze VvE.
                                    </td>
                                </tr>
                            ) : (
                                members.map((member) => (
                                    <tr key={member.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {member.lid_nummer || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div>{member.straat} {member.huisnummer}</div>
                                            <div className="text-xs text-gray-400">{member.postcode} {member.stad}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(member.role)}`}>
                                                {member.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div>{member.email}</div>
                                            <div className="text-xs">{member.telefoon}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {canEdit(member) && (
                                                <button
                                                    onClick={() => openEditModal(member)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                    Bewerk
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
