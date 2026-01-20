import React, { useEffect, useState } from 'react';
import { memberService } from './memberService';
import type { Profile } from '../../types/database';
import { AddMemberModal } from './AddMemberModal';
import { EditMemberModal } from './EditMemberModal';
import { toast } from 'sonner';
import {
    Card,
    Text,
    Badge,
    Button,
    Icon
} from '@tremor/react';
import {
    UserIcon,
    PencilSquareIcon,
    TrashIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { type ColumnConfig } from '../../hooks/useColumnConfig';

export const MemberListPage: React.FC = () => {
    const [members, setMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editProfile, setEditProfile] = useState<Profile | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const navigate = useNavigate();

    const DEFAULT_MEMBER_COLUMNS: ColumnConfig[] = [
        { id: 'name', label: 'Name', visible: true, order: 0 },
        { id: 'address', label: 'Address', visible: true, order: 1 },
        { id: 'member_number', label: 'Member Number', visible: true, order: 2 },
        { id: 'email', label: 'Email', visible: true, order: 3 },
        { id: 'role', label: 'Role', visible: true, order: 4 },
    ];

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

            const currentAssociationMembership = profile?.association_memberships?.find(m => m.association_id === profile.association_id);
            const effectiveRole = profile?.is_super_admin ? 'admin' : (currentAssociationMembership?.role || null);
            setUserRole(effectiveRole);
        } catch (error) {
            console.error('Error loading members:', error);
            toast.error('Kon leden niet laden');
        } finally {
            setLoading(false);
        }
    };

    const canManageMembers = (() => {
        const adminRoles = ['admin', 'manager', 'board'];
        return userRole && adminRoles.includes(userRole);
    })();

    const isMemberDeletable = (member: Profile) => {
        const txCount = member.bank_transactions?.[0]?.count || 0;
        return txCount === 0;
    };

    const handleDeleteMember = async (member: Profile) => {
        if (!isMemberDeletable(member)) {
            toast.error('Dit lid kan niet verwijderd worden omdat er banktransacties gekoppeld zijn.');
            return;
        }

        toast('Weet je zeker dat je dit lid wilt verwijderen?', {
            action: {
                label: 'Verwijder',
                onClick: async () => {
                    try {
                        await memberService.deleteMember(member.id);
                        toast.success('Lid verwijderd');
                        loadMembers();
                    } catch (e: any) {
                        toast.error(e.message);
                    }
                }
            },
            cancel: {
                label: 'Annuleer',
                onClick: () => { }
            }
        });
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        toast(`Weet je zeker dat je ${selectedIds.size} leden wilt verwijderen?`, {
            action: {
                label: 'Verwijder',
                onClick: async () => {
                    setLoading(true);
                    try {
                        const result = await memberService.bulkDeleteMembers(Array.from(selectedIds));

                        if (result.failed.length > 0) {
                            toast.warning(`${result.deleted.length} verwijderd. ${result.failed.length} overgeslagen (gekoppelde transacties).`);
                        } else {
                            toast.success(`${result.deleted.length} leden verwijderd.`);
                        }

                        setSelectedIds(new Set());
                        await loadMembers();
                    } catch (e: any) {
                        console.error(e);
                        toast.error('Fout bij verwijderen: ' + e.message);
                    } finally {
                        setLoading(false);
                    }
                }
            }
        });
    };

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="Ledenoverzicht"
                onAdd={canManageMembers ? () => setIsAddModalOpen(true) : undefined}
                addLabel="Lid Toevoegen"
            >
                {selectedIds.size > 0 && canManageMembers && (
                    <Button
                        icon={TrashIcon}
                        color="red"
                        variant="primary"
                        onClick={handleBulkDelete}
                        loading={loading}
                    >
                        Verwijder ({selectedIds.size})
                    </Button>
                )}
            </PageHeader>

            <Card>
                <DataTable
                    data={members}
                    columns={DEFAULT_MEMBER_COLUMNS}
                    storageKey="member_column_config"
                    searchPlaceholder="Search members..."
                    loading={loading}
                    onRowClick={(m) => navigate(`/members/${m.id}`)}
                    selectable={!!canManageMembers}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    isItemDeletable={isMemberDeletable}
                    renderCell={(member, colId) => {
                        const effectiveRole = member.association_memberships?.[0]?.role || 'member';
                        switch (colId) {
                            case 'name':
                                return (
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
                                            <UserIcon className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <Text className="font-medium text-gray-900">{member.first_name} {member.last_name}</Text>
                                    </div>
                                );
                            case 'address':
                                return (
                                    <>
                                        <Text>{member.street} {member.house_number}</Text>
                                        <Text className="text-xs text-gray-500">{member.zip_code} {member.city}</Text>
                                    </>
                                );
                            case 'member_number':
                                return <Text>{member.member_number || '-'}</Text>;
                            case 'email':
                                return <Text>{member.email || '-'}</Text>;
                            case 'role':
                                return (
                                    <Badge color={effectiveRole === 'admin' ? 'red' : 'gray'}>
                                        {effectiveRole}
                                    </Badge>
                                );
                            default:
                                return null;
                        }
                    }}
                    renderActions={canManageMembers ? (member) => (
                        <div className="flex items-center justify-end space-x-2 h-8">
                            <Button
                                size="xs"
                                variant="light"
                                icon={PencilSquareIcon}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditProfile(member);
                                }}
                            >
                                Edit
                            </Button>

                            {!isMemberDeletable(member) ? (
                                <div className="p-1 cursor-help" title="Cannot delete (linked transactions)">
                                    <Icon
                                        icon={ShieldCheckIcon}
                                        variant="simple"
                                        color="slate"
                                        size="sm"
                                    />
                                </div>
                            ) : (
                                <Button
                                    size="xs"
                                    variant="light"
                                    color="red"
                                    icon={TrashIcon}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMember(member);
                                    }}
                                />
                            )}
                        </div>
                    ) : undefined}
                />
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
