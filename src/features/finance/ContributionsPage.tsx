import React, { useEffect, useState } from 'react';
import {
    Title,
    Text,
    Card,
    Table,
    TableHead,
    TableRow,
    TableHeaderCell,
    TableBody,
    TableCell,
    Button,
    Select,
    SelectItem,
    Tab,
    TabGroup,
    TabList,
    TabPanel,
    TabPanels
} from '@tremor/react';
import {
    PlusIcon,
    BanknotesIcon,
    ArrowPathIcon,
    UserGroupIcon,
    CalculatorIcon,
    Cog6ToothIcon,
    PencilSquareIcon
} from '@heroicons/react/24/outline';
import { contributionService } from './contributionService';
import { memberService } from '../members/memberService';
import type {
    ContributionYear,
    MemberContribution,
    ContributionGroup,
    Profile,
    MemberGroupAssignment
} from '../../types/database';
import { toast } from 'sonner';
import { YearSelector } from '../../components/ui/YearSelector';
import { ContributionSummary } from './components/ContributionSummary';
import { ContributionTable } from './components/ContributionTable';
import { CreateYearModal } from './modals/CreateYearModal';
import { YearSettingsModal } from './modals/YearSettingsModal';
import { EditGroupNameModal } from './modals/EditGroupNameModal';
import { TransactionDetailsModal } from './modals/TransactionDetailsModal';
import { CreateGroupModal } from './modals/CreateGroupModal';

export const ContributionsPage: React.FC = () => {
    // Data State
    const [years, setYears] = useState<ContributionYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>('');
    const [contributions, setContributions] = useState<MemberContribution[]>([]);
    const [groups, setGroups] = useState<ContributionGroup[]>([]);
    const [members, setMembers] = useState<Profile[]>([]);
    const [assignments, setAssignments] = useState<MemberGroupAssignment[]>([]);

    // UI State
    const [isCreateYearOpen, setIsCreateYearOpen] = useState(false);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);

    // Form State (New Year)
    const [newYear, setNewYear] = useState(new Date().getFullYear());
    const [newDefaultAmount, setNewDefaultAmount] = useState(150);
    const [newBaseRateName, setNewBaseRateName] = useState('Standaard');
    const [newGroupAmounts, setNewGroupAmounts] = useState<Record<string, number>>({});
    const [newGroupName, setNewGroupName] = useState('');

    // Settings Modal State (Temp)
    const [tempBaseRateName, setTempBaseRateName] = useState('');
    const [tempDefaultAmount, setTempDefaultAmount] = useState(0);
    const [tempGroupAmounts, setTempGroupAmounts] = useState<Record<string, number>>({});

    // Group Edit State
    const [editingGroup, setEditingGroup] = useState<ContributionGroup | null>(null);
    const [tempGroupName, setTempGroupName] = useState('');

    // Transaction Details State
    const [selectedMemberTx, setSelectedMemberTx] = useState<{ member: Profile; txs: any[] } | null>(null);

    const loadData = async () => {
        try {
            const [fetchedYears, fetchedGroups, fetchedMembers, fetchedAssignments] = await Promise.all([
                contributionService.getYears(),
                contributionService.getGroups(),
                memberService.getMembers(),
                contributionService.getAssignments()
            ]);

            setYears(fetchedYears);
            setGroups(fetchedGroups);
            setMembers(fetchedMembers);
            setAssignments(fetchedAssignments);

            if (fetchedYears.length > 0) {
                const yearId = selectedYearId || fetchedYears[0].id;
                setSelectedYearId(yearId);
                const fetchedContribs = await contributionService.getContributions(yearId);
                setContributions(fetchedContribs);

                // Fetch amounts for settings
                const amounts = await contributionService.getYearAmounts(yearId);
                const amtMap: Record<string, number> = {};
                amounts.forEach((a: any) => amtMap[a.group_id] = a.amount);

                // Init temp state
                const currentYear = fetchedYears.find(y => y.id === yearId);
                if (currentYear) {
                    setTempBaseRateName(currentYear.base_rate_name);
                    setTempDefaultAmount(currentYear.default_amount);
                    setTempGroupAmounts(amtMap);
                }
            }
        } catch (e) {
            console.error(e);
            toast.error('Kon gegevens niet laden');
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedYearId) {
            contributionService.getContributions(selectedYearId)
                .then(setContributions)
                .catch(console.error);

            contributionService.getYearAmounts(selectedYearId)
                .then(amounts => {
                    const amtMap: Record<string, number> = {};
                    amounts.forEach((a: any) => amtMap[a.group_id] = a.amount);
                    setTempGroupAmounts(amtMap); // Sync temp state on switch
                })
                .catch(console.error);

            // Sync base fields
            const currentYear = years.find(y => y.id === selectedYearId);
            if (currentYear) {
                setTempBaseRateName(currentYear.base_rate_name);
                setTempDefaultAmount(currentYear.default_amount);
            }
        }
    }, [selectedYearId, years]);

    // --- Actions ---

    const handleCreateYear = async () => {
        try {
            await contributionService.createYear(newYear, newDefaultAmount, newBaseRateName, newGroupAmounts);
            toast.success(`Jaar ${newYear} aangemaakt`);
            setIsCreateYearOpen(false);
            loadData();
        } catch (e: any) {
            toast.error(e.message || 'Fout bij aanmaken jaar');
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName) return;
        try {
            await contributionService.createGroup(newGroupName);
            toast.success('Groep aangemaakt');
            setIsCreateGroupOpen(false);
            setNewGroupName('');
            const g = await contributionService.getGroups();
            setGroups(g);
        } catch (e: any) {
            toast.error('Fout bij maken groep');
        }
    };

    const handleGenerate = async () => {
        if (!selectedYearId) return;
        try {
            const result = await contributionService.generateForYear(selectedYearId);
            toast.success(`${result.created} bijdrages geupdate/aangemaakt`);
            const fetched = await contributionService.getContributions(selectedYearId);
            setContributions(fetched);
        } catch (e: any) {
            toast.error(e.message || 'Kon bijdrages niet genereren');
        }
    };

    const handleAssignGroup = async (memberId: string, groupId: string) => {
        try {
            const gid = groupId === '' ? null : groupId;
            await contributionService.assignMemberToGroup(memberId, gid);
            toast.success('Toewijzing opgeslagen');

            if (selectedYearId) {
                await contributionService.syncContributionAmounts(selectedYearId);
                const ref = await contributionService.getContributions(selectedYearId);
                setContributions(ref);
            }

            const a = await contributionService.getAssignments();
            setAssignments(a);
        } catch (e) {
            toast.error('Kon toewijzing niet opslaan');
        }
    };

    const handleMarkPaid = async (c: MemberContribution) => {
        try {
            await contributionService.updateContribution(c.id, {
                status: 'PAID',
                amount_paid: c.amount_due // Assume full payment
            });
            toast.success('Gemarkeerd als betaald');
            setContributions(prev => prev.map(item =>
                item.id === c.id ? { ...item, status: 'PAID', amount_paid: c.amount_due } : item
            ));
        } catch (e) {
            toast.error('Kon status niet updaten');
        }
    };

    const handleUndoPaid = async (c: MemberContribution) => {
        try {
            await contributionService.updateContribution(c.id, {
                status: 'PENDING',
                amount_paid: 0
            });
            toast.success('Betaling ongedaan gemaakt');
            setContributions(prev => prev.map(item =>
                item.id === c.id ? { ...item, status: 'PENDING', amount_paid: 0 } : item
            ));
        } catch (e) {
            toast.error('Kon status niet updaten');
        }
    };

    const handleSaveSettings = async () => {
        if (!selectedYearId) return;
        try {
            await contributionService.updateBaseAmount(selectedYearId, tempDefaultAmount, tempBaseRateName);
            const promises = Object.entries(tempGroupAmounts).map(([groupId, amount]) =>
                contributionService.updateGroupAmount(selectedYearId, groupId, amount)
            );
            await Promise.all(promises);
            await contributionService.syncContributionAmounts(selectedYearId);

            setYears(prev => prev.map(y => y.id === selectedYearId ? {
                ...y,
                default_amount: tempDefaultAmount,
                base_rate_name: tempBaseRateName
            } : y));
            const refreshedContribs = await contributionService.getContributions(selectedYearId);
            setContributions(refreshedContribs);

            setIsGroupSettingsOpen(false);
            toast.success('Instellingen opgeslagen en bijdragen bijgewerkt');
        } catch (e) {
            console.error(e);
            toast.error('Fout bij opslaan instellingen');
        }
    };

    const handleReconcile = async () => {
        if (!selectedYearId) return;
        try {
            const res = await contributionService.reconcileYear(selectedYearId);
            toast.success(`${res.processed} gecontroleerd, ${res.updated} geupdate`);
            const fetched = await contributionService.getContributions(selectedYearId);
            setContributions(fetched);
        } catch (e: any) {
            toast.error(e.message || 'Fout bij verwerken');
        }
    };

    const handleOpenTxDetails = async (member: Profile) => {
        if (!selectedYearId) return;
        try {
            const txs = await contributionService.getLinkedTransactions(member.id, selectedYearId);
            setSelectedMemberTx({ member, txs });
            setIsTxModalOpen(true);
        } catch (e) {
            toast.error('Kon transacties niet laden');
        }
    };

    const handleUpdateGroupName = async () => {
        if (!editingGroup || !tempGroupName) return;
        try {
            await contributionService.updateGroup(editingGroup.id, tempGroupName);
            toast.success('Groep naam bijgewerkt');
            setEditingGroup(null);
            setGroups(prev => prev.map(g => g.id === editingGroup.id ? { ...g, name: tempGroupName } : g));
            if (selectedYearId) {
                await contributionService.syncContributionAmounts(selectedYearId);
                const ref = await contributionService.getContributions(selectedYearId);
                setContributions(ref);
            }
        } catch (e) {
            toast.error('Fout bij bijwerken groep');
        }
    };

    // --- Computed ---
    const selectedYear = years.find(y => y.id === selectedYearId);
    const totalDue = contributions.reduce((sum, c) => sum + (c.amount_due || 0), 0);
    const totalPaid = contributions.reduce((sum, c) => sum + (c.amount_paid || 0), 0);
    const progress = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

    return (
        <div className="p-6 space-y-6">
            <header className="flex justify-between items-start">
                <div>
                    <Title>Ledenbijdragen</Title>
                    <Text>Beheer groepen, toewijzingen en jaarlijkse bijdragen.</Text>
                </div>
            </header>

            <TabGroup>
                <TabList>
                    <Tab icon={BanknotesIcon}>Bijdragen</Tab>
                    <Tab icon={UserGroupIcon}>Groepen & Toewijzingen</Tab>
                </TabList>
                <TabPanels>
                    {/* --- CONTRIBUTIONS TAB --- */}
                    <TabPanel>
                        <div className="space-y-6 mt-6">
                            <div className="flex gap-4 items-center justify-between">
                                <div className="flex gap-4 items-center">
                                    <YearSelector
                                        years={years}
                                        selectedYearId={selectedYearId}
                                        onYearChange={setSelectedYearId}
                                        className="w-48"
                                    />
                                    {selectedYear && (
                                        <>
                                            <Button variant="secondary" icon={Cog6ToothIcon} onClick={() => setIsGroupSettingsOpen(true)}>
                                                Instellingen
                                            </Button>
                                            <Button variant="secondary" icon={CalculatorIcon} onClick={handleReconcile}>
                                                Verwerk Transacties
                                            </Button>
                                            <Button variant="secondary" icon={ArrowPathIcon} onClick={handleGenerate}>
                                                Update Lijst
                                            </Button>
                                        </>
                                    )}
                                </div>
                                <Button icon={PlusIcon} onClick={() => setIsCreateYearOpen(true)}>
                                    Nieuw Boekjaar
                                </Button>
                            </div>

                            <ContributionSummary
                                totalDue={totalDue}
                                totalPaid={totalPaid}
                                progress={progress}
                            />

                            <ContributionTable
                                contributions={contributions}
                                onMarkPaid={handleMarkPaid}
                                onUndoPaid={handleUndoPaid}
                                onViewDetails={handleOpenTxDetails}
                            />
                        </div>
                    </TabPanel>

                    {/* --- GROUPS & ASSIGNMENTS TAB --- */}
                    <TabPanel>
                        <div className="space-y-6 mt-6">
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div>
                                    <Title>Beheergroepen</Title>
                                    <Text>Elke groep kan een eigen bijdrage hebben per jaar.</Text>
                                </div>
                                <Button icon={PlusIcon} variant="secondary" onClick={() => setIsCreateGroupOpen(true)}>
                                    Nieuwe Groep
                                </Button>
                            </div>

                            <Card>
                                <Title className="mb-4">Overzicht Groepen</Title>
                                <div className="space-y-2">
                                    {groups.map(g => (
                                        <div key={g.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <UserGroupIcon className="w-5 h-5 text-gray-400" />
                                                <Text className="font-medium">{g.name}</Text>
                                            </div>
                                            <Button
                                                variant="light"
                                                icon={PencilSquareIcon}
                                                onClick={() => {
                                                    setEditingGroup(g);
                                                    setTempGroupName(g.name);
                                                }}
                                            >
                                                Wijzig naam
                                            </Button>
                                        </div>
                                    ))}
                                    {groups.length === 0 && (
                                        <Text className="text-center text-gray-500 py-4">Geen groepen aangemaakt.</Text>
                                    )}
                                </div>
                            </Card>

                            <Card>
                                <Title className="mb-4">Leden Toewijzingen</Title>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableHeaderCell>Lid</TableHeaderCell>
                                            <TableHeaderCell>Adres</TableHeaderCell>
                                            <TableHeaderCell>Toegewezen Groep</TableHeaderCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {members.map(m => {
                                            const assign = assignments.find(a => a.member_id === m.id);
                                            return (
                                                <TableRow key={m.id}>
                                                    <TableCell>{m.first_name} {m.last_name}</TableCell>
                                                    <TableCell>{m.street} {m.house_number}</TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={assign?.group_id || ''}
                                                            onValueChange={(val) => handleAssignGroup(m.id, val)}
                                                            placeholder="Standaard (Geen groep)"
                                                        >
                                                            <SelectItem value="">Standaard (Geen groep)</SelectItem>
                                                            {groups.map(g => (
                                                                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                                            ))}
                                                        </Select>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    </TabPanel>
                </TabPanels>
            </TabGroup>

            <CreateYearModal
                isOpen={isCreateYearOpen}
                onClose={() => setIsCreateYearOpen(false)}
                onSave={handleCreateYear}
                year={newYear}
                setYear={setNewYear}
                defaultAmount={newDefaultAmount}
                setDefaultAmount={setNewDefaultAmount}
                baseRateName={newBaseRateName}
                setBaseRateName={setNewBaseRateName}
                groupAmounts={newGroupAmounts}
                setGroupAmounts={setNewGroupAmounts}
                groups={groups}
            />

            <YearSettingsModal
                isOpen={isGroupSettingsOpen}
                onClose={() => setIsGroupSettingsOpen(false)}
                onSave={handleSaveSettings}
                selectedYear={selectedYear}
                baseRateName={tempBaseRateName}
                setBaseRateName={setTempBaseRateName}
                defaultAmount={tempDefaultAmount}
                setDefaultAmount={setTempDefaultAmount}
                groupAmounts={tempGroupAmounts}
                setGroupAmounts={setTempGroupAmounts}
                groups={groups}
            />

            <EditGroupNameModal
                editingGroup={editingGroup}
                onClose={() => setEditingGroup(null)}
                onSave={handleUpdateGroupName}
                groupName={tempGroupName}
                setGroupName={setTempGroupName}
            />

            <TransactionDetailsModal
                isOpen={isTxModalOpen}
                onClose={() => setIsTxModalOpen(false)}
                selectedMemberTx={selectedMemberTx}
            />

            <CreateGroupModal
                isOpen={isCreateGroupOpen}
                onClose={() => setIsCreateGroupOpen(false)}
                onSave={handleCreateGroup}
                groupName={newGroupName}
                setGroupName={setNewGroupName}
            />
        </div>
    );
};
