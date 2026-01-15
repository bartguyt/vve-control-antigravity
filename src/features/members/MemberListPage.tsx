import React, { useEffect, useState } from 'react';
import { memberService } from './memberService';
import type { Profile } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { AddMemberModal } from './AddMemberModal';
import { EditMemberModal } from './EditMemberModal';
import { toast } from 'sonner';
import {
    Card,
    Table,
    TableHead,
    TableRow,
    TableHeaderCell,
    TableBody,
    TableCell,
    Text,
    Badge,
    Button,
    TextInput,
    Icon
} from '@tremor/react';
import {
    MagnifyingGlassIcon,
    UserIcon,
    PencilSquareIcon,
    ArrowRightOnRectangleIcon,
    TrashIcon,
    ShieldCheckIcon,
    Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { useColumnConfig } from '../../hooks/useColumnConfig';

export const MemberListPage: React.FC = () => {
    const [members, setMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editProfile, setEditProfile] = useState<Profile | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<string>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const DEFAULT_COLUMNS = [
        { id: 'name', label: 'Naam', visible: true, order: 0 },
        { id: 'address', label: 'Adres', visible: true, order: 1 },
        { id: 'lid_nummer', label: 'Lid Nummer', visible: true, order: 2 },
        { id: 'email', label: 'Email', visible: true, order: 3 },
        { id: 'role', label: 'Rol', visible: true, order: 4 },
    ];

    const { columns } = useColumnConfig('member_column_config', DEFAULT_COLUMNS);

    const visibleColumns = columns.filter(c => c.visible).sort((a, b) => a.order - b.order);

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
            toast.error('Kon leden niet laden');
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const renderSortIcon = (column: string) => {
        if (sortColumn !== column) return null;
        return <span className="ml-1 text-gray-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const filteredMembers = members.filter(member =>
        member.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.straat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.huisnummer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.stad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        let valA = '';
        let valB = '';

        switch (sortColumn) {
            case 'name':
                valA = `${a.first_name} ${a.last_name}`.trim().toLowerCase();
                valB = `${b.first_name} ${b.last_name}`.trim().toLowerCase();
                break;
            case 'address':
                valA = `${a.straat} ${a.huisnummer} ${a.stad}`.trim().toLowerCase();
                valB = `${b.straat} ${b.huisnummer} ${b.stad}`.trim().toLowerCase();
                break;
            case 'lid_nummer':
                valA = (a.lid_nummer || '').toLowerCase();
                valB = (b.lid_nummer || '').toLowerCase();
                break;
            case 'email':
                valA = (a.email || '').toLowerCase();
                valB = (b.email || '').toLowerCase();
                break;
            case 'role':
                valA = (a.role || '').toLowerCase();
                valB = (b.role || '').toLowerCase();
                break;
            default:
                return 0;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const canManageMembers = (() => {
        if (!members.length) return false;
        return userRole === 'admin' || userRole === 'bestuur' || userRole === 'manager' || userRole === 'board';
    })();

    const isMemberDeletable = (member: Profile) => {
        const txCount = member.bank_transactions?.[0]?.count || 0;
        return txCount === 0;
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        const deletableMembers = filteredMembers.filter(m => isMemberDeletable(m));

        if (selectedIds.size === deletableMembers.length && selectedIds.size > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(deletableMembers.map(m => m.id)));
        }
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
                <Button
                    icon={Cog6ToothIcon}
                    variant="secondary"
                    onClick={() => navigate('/settings?tab=1')}
                >
                    Instellingen
                </Button>
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
                        placeholder="Zoek op naam, adres, stad of email..."
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
                                {canManageMembers && (
                                    <TableHeaderCell className="w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            checked={
                                                filteredMembers.length > 0 &&
                                                selectedIds.size === filteredMembers.filter(m => isMemberDeletable(m)).length
                                            }
                                            onChange={toggleAll}
                                        />
                                    </TableHeaderCell>
                                )}

                                {visibleColumns.map(col => (
                                    <TableHeaderCell
                                        key={col.id}
                                        onClick={() => handleSort(col.id)}
                                        className="cursor-pointer"
                                    >
                                        {col.label} {renderSortIcon(col.id)}
                                    </TableHeaderCell>
                                ))}
                                {canManageMembers && <TableHeaderCell>Acties</TableHeaderCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredMembers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center">
                                        <Text>Geen leden gevonden</Text>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMembers.map((member) => {
                                    const deletable = isMemberDeletable(member);
                                    return (
                                        <TableRow
                                            key={member.id}
                                            onClick={() => navigate(`/members/${member.id}`)}
                                            onMouseEnter={() => setHoveredRow(member.id)}
                                            onMouseLeave={() => setHoveredRow(null)}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            {canManageMembers && (
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className={`rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${!deletable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                        checked={selectedIds.has(member.id)}
                                                        onChange={() => toggleSelection(member.id)}
                                                        disabled={!deletable}
                                                    />
                                                </TableCell>
                                            )}

                                            {visibleColumns.map(col => {
                                                switch (col.id) {
                                                    case 'name':
                                                        return (
                                                            <TableCell key={col.id}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="p-2 bg-indigo-50 rounded-full">
                                                                        <Icon icon={UserIcon} size="xs" color="indigo" variant="simple" />
                                                                    </div>
                                                                    <div>
                                                                        <Text className="font-medium text-gray-900">
                                                                            {member.first_name} {member.last_name}
                                                                        </Text>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                        );
                                                    case 'address':
                                                        return (
                                                            <TableCell key={col.id}>
                                                                <Text>
                                                                    {member.straat} {member.huisnummer}
                                                                </Text>
                                                                <Text className="text-xs">
                                                                    {member.postcode} {member.stad}
                                                                </Text>
                                                            </TableCell>
                                                        );
                                                    case 'lid_nummer':
                                                        return (
                                                            <TableCell key={col.id}>
                                                                <Text>{member.lid_nummer || '-'}</Text>
                                                            </TableCell>
                                                        );
                                                    case 'email':
                                                        return (
                                                            <TableCell key={col.id}>
                                                                <Text>{member.email || '-'}</Text>
                                                            </TableCell>
                                                        );
                                                    case 'role':
                                                        return (
                                                            <TableCell key={col.id}>
                                                                <Badge color={member.role === 'admin' ? 'red' : 'gray'}>
                                                                    {member.role}
                                                                </Badge>
                                                            </TableCell>
                                                        );
                                                    default:
                                                        return <TableCell key={col.id}><Text>-</Text></TableCell>;
                                                }
                                            })}
                                            {canManageMembers && (
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center space-x-2 h-8">
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

                                                        {!deletable ? (
                                                            <div className="p-1 cursor-help" title="Kan niet verwijderd worden (gekoppelde transacties)">
                                                                <Icon
                                                                    icon={ShieldCheckIcon}
                                                                    variant="simple"
                                                                    color="slate"
                                                                    size="sm"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className={`transition-opacity duration-200 ${hoveredRow === member.id ? 'opacity-100' : 'opacity-0'}`}>
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
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                )}

            </Card >

            <AddMemberModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onMemberAdded={loadMembers}
            />

            {
                editProfile && (
                    <EditMemberModal
                        isOpen={true}
                        onClose={() => setEditProfile(null)}
                        onMemberUpdated={loadMembers}
                        member={editProfile}
                    />
                )
            }
        </div >
    );
};
