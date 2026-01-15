import React, { useEffect, useState } from 'react';
import { memberService } from './memberService';
import type { Profile } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { AddMemberModal } from './AddMemberModal';
import { EditMemberModal } from './EditMemberModal';
import {
    Card,
    Table,
    TableHead,
    TableRow,
    TableHeaderCell,
    TableBody,
    TableCell,
    Text,
    Title,
    Badge,
    Button,
    TextInput,
    Icon,
    Flex
} from '@tremor/react';
import {
    MagnifyingGlassIcon,
    UserIcon,
    PencilSquareIcon,
    UserPlusIcon,
    ArrowRightOnRectangleIcon,
    EyeIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';

export const MemberListPage: React.FC = () => {
    const [members, setMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editProfile, setEditProfile] = useState<Profile | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadMembers();
    }, []);

    const loadMembers = async () => {
        try {
            const [data, profile] = await Promise.all([
                memberService.getMembers(),
                memberService.getCurrentProfile()
            ]);
            setMembers(data);

            // Get role from vve_memberships
            const currentVveMembership = profile?.vve_memberships?.find(m => m.vve_id === profile.vve_id);
            const effectiveRole = profile?.is_super_admin ? 'admin' : (currentVveMembership?.role || null);
            setUserRole(effectiveRole);
        } catch (error) {
            console.error('Error loading members:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const filteredMembers = members.filter(member =>
        member.straat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.huisnummer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.stad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );



    const canManageMembers = (() => {
        if (!members.length) return false;
        // Check current profile from service (or refetch if needed, but we don't store full profile in state here easily without refactor)
        // Better: store the current user's role in state after load
        return userRole === 'admin' || userRole === 'bestuur' || userRole === 'manager' || userRole === 'board';
    })();

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="Ledenoverzicht"
                onAdd={canManageMembers ? () => setIsAddModalOpen(true) : undefined}
                addLabel="Lid Toevoegen"
            >
                <Button
                    icon={ArrowRightOnRectangleIcon}
                    variant="secondary"
                    onClick={handleLogout}
                >
                    Uitloggen
                </Button>
            </PageHeader>

            <Card>
                <div className="mb-4">
                    <TextInput
                        icon={MagnifyingGlassIcon}
                        placeholder="Zoek op adres, stad of email..."
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                    />
                </div>

                {loading ? (
                    <Text className="text-center py-8">Laden...</Text>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeaderCell>Adres</TableHeaderCell>
                                <TableHeaderCell>Lid Nummer</TableHeaderCell>
                                <TableHeaderCell>Email</TableHeaderCell>
                                <TableHeaderCell>Rol</TableHeaderCell>
                                {canManageMembers && <TableHeaderCell>Acties</TableHeaderCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredMembers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">
                                        <Text>Geen leden gevonden</Text>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMembers.map((member) => (
                                    <TableRow
                                        key={member.id}
                                        onClick={() => navigate(`/members/${member.id}`)}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <TableCell>
                                            <Flex justifyContent="start" className="space-x-3">
                                                <div className="p-2 bg-indigo-50 rounded-full">
                                                    <Icon icon={UserIcon} size="xs" color="indigo" variant="simple" />
                                                </div>
                                                <div>
                                                    <Text className="font-medium text-gray-900">
                                                        {member.straat} {member.huisnummer}
                                                    </Text>
                                                    <Text className="text-xs">
                                                        {member.postcode} {member.stad}
                                                    </Text>
                                                </div>
                                            </Flex>
                                        </TableCell>
                                        <TableCell>
                                            <Text>{member.lid_nummer || '-'}</Text>
                                        </TableCell>
                                        <TableCell>
                                            <Text>{member.email || '-'}</Text>
                                        </TableCell>
                                        <TableCell>
                                            <Badge color={member.role === 'admin' ? 'red' : 'gray'}>
                                                {member.role}
                                            </Badge>
                                        </TableCell>
                                        {canManageMembers && (
                                            <TableCell>
                                                <Button
                                                    size="xs"
                                                    variant="light"
                                                    icon={PencilSquareIcon}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditProfile(member);
                                                    }}
                                                >
                                                    Bewerk
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="secondary"
                                                    icon={EyeIcon}
                                                    onClick={() => navigate(`/members/${member.id}`)}
                                                >
                                                    Bekijk
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </Card>

            <AddMemberModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onMemberAdded={loadMembers}
            />

            {editProfile && (
                <EditMemberModal
                    isOpen={true}
                    onClose={() => setEditProfile(null)}
                    onMemberUpdated={loadMembers}
                    member={editProfile}
                />
            )}
        </div>
    );
};
