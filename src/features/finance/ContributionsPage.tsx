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
    UserGroupIcon,
    Cog6ToothIcon,
    PencilSquareIcon
} from '@heroicons/react/24/outline';
import { debugUtils } from '../../utils/debugUtils';
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
import { PaymentReminderModal } from './PaymentReminderModal';

export const ContributionsPage: React.FC = () => {
    // Data State
    const [years, setYears] = useState<ContributionYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>('');
    const [contributions, setContributions] = useState<MemberContribution[]>([]);
    const [groups, setGroups] = useState<ContributionGroup[]>([]);
    const [members, setMembers] = useState<Profile[]>([]);
    const [assignments, setAssignments] = useState<MemberGroupAssignment[]>([]);
    const [paymentRecords, setPaymentRecords] = useState<any[]>([]);

    // UI State
    const [isCreateYearOpen, setIsCreateYearOpen] = useState(false);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'year' | 'prorated'>('year');

    // Reminder State
    const [isReminderOpen, setIsReminderOpen] = useState(false);
    const [reminderContribution, setReminderContribution] = useState<MemberContribution | null>(null);

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

                // Fetch direct transactions for live calculation
                const txs = await contributionService.getYearTransactions(yearId);
                setPaymentRecords(txs);

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

            // Fetch direct transactions
            contributionService.getYearTransactions(selectedYearId)
                .then(setPaymentRecords)
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

    // --- Actions ---

    // ... existing ...

    const handleRemind = async (c: MemberContribution) => {
        if (!selectedYearId || !c.member) return;
        try {
            // Fetch txns to get last payment date
            const txs = await contributionService.getLinkedTransactions(c.member.id, selectedYearId);
            // Assuming txs has date field. 'booking_date'
            // Sort desc
            txs.sort((a: any, b: any) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime());

            const lastDate = txs.length > 0 ? txs[0].booking_date : undefined;

            // Let's use a separate state variable for `reminderLastPaymentDate`
            setReminderLastPaymentDate(lastDate);
            setReminderContribution(c);
            // We'll pass lastDate to modal props
            // Store it in a temp state or use the hook in the modal? 
            // Better: store in a separate state for modal?
            // "reminderContribution" is strict type.
            // Let's us "selectedMemberTx" state? No that's for details modal.

            // Hack: add it to the c object as any for now or make a separate state
            // Let's use a separate state variable for `reminderLastPaymentDate`
            setReminderLastPaymentDate(lastDate);

            setIsReminderOpen(true);
        } catch (e) {
            console.error(e);
            toast.error('Kon transactie details niet ophalen');
            // Open anyway?
            setReminderContribution(c);
            setIsReminderOpen(true);
        }
    };

    // New state for this specific datum
    const [reminderLastPaymentDate, setReminderLastPaymentDate] = useState<string | undefined>(undefined);


    // ... existing ...


    // Reminders logic was here


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

    // Removed handleGenerate - member_contributions are now auto-created by database trigger

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

    // Removed handleReconcile - no longer needed with real-time calculation

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

    // Calculate paid amounts from payment records
    debugUtils.groupCollapsed('[ContributionsPage] Rendering Details');
    debugUtils.log('Payment Records (raw transactions):', paymentRecords.length);

    const paidByMember = new Map<string, number>();
    paymentRecords.forEach(record => {
        const current = paidByMember.get(record.member_id) || 0;
        paidByMember.set(record.member_id, current + (record.amount || 0));
    });
    debugUtils.log('PaidByMember Map Size:', paidByMember.size);
    if (paidByMember.size > 0) {
        debugUtils.log('Sample Payments:', Object.fromEntries(Array.from(paidByMember.entries()).slice(0, 5)));
    }

    // Enrich contributions with yearly amounts and payment data
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const paymentFrequency = selectedYear?.payment_frequency || 'monthly';

    const enrichedContributions = contributions.map(contrib => {
        // Get amount from the enriched groupAmount field (added by getContributions)
        const baseAmount = (contrib as any).groupAmount || 0;

        // Calculate monthly and yearly based on payment frequency setting
        const monthlyAmount = paymentFrequency === 'monthly' ? baseAmount : baseAmount / 12;
        const yearlyAmount = paymentFrequency === 'yearly' ? baseAmount : baseAmount * 12;
        const paidAmount = paidByMember.get(contrib.member_id) || 0;

        // Removed verbose logging - check base amounts if needed

        const expectedAmount = viewMode === 'year'
            ? yearlyAmount
            : monthlyAmount * currentMonth;

        return {
            ...contrib,
            amount_due: expectedAmount,
            amount_paid: paidAmount,
            yearlyAmount,
            monthlyAmount
        };
    });
    // Calculation complete

    const totalDue = enrichedContributions.reduce((sum, c) => sum + (c.amount_due || 0), 0);
    const totalPaid = enrichedContributions.reduce((sum, c) => sum + (c.amount_paid || 0), 0);
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
                                            {/* Removed Verwerk Transacties button - obsolete with real-time calculation */}
                                            {/* Removed Update Lijst button - member_contributions auto-created by trigger */}
                                        </>
                                    )}
                                </div>
                                <div className="flex gap-4 items-center">
                                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                        <button
                                            onClick={() => setViewMode('year')}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'year'
                                                ? 'bg-white text-blue-600 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                        >
                                            Jaar totaal
                                        </button>
                                        <button
                                            onClick={() => setViewMode('prorated')}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'prorated'
                                                ? 'bg-white text-blue-600 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                        >
                                            Tot nu toe
                                        </button>
                                    </div>
                                    <Button icon={PlusIcon} onClick={() => setIsCreateYearOpen(true)}>
                                        Nieuw Boekjaar
                                    </Button>
                                </div>
                            </div>

                            <ContributionSummary
                                totalDue={totalDue}
                                totalPaid={totalPaid}
                                progress={progress}
                            />

                            <ContributionTable
                                contributions={enrichedContributions.map(c => ({
                                    ...c,
                                    isGhost: !members.some(m => m.profile_id === c.member_id)
                                }))}
                                onMarkPaid={handleMarkPaid}
                                onUndoPaid={handleUndoPaid}
                                onViewDetails={handleOpenTxDetails}
                                onRemind={handleRemind}
                                onDelete={async (id) => {
                                    if (confirm('Weet u zeker dat u deze (spook)registratie wilt verwijderen?')) {
                                        try {
                                            await contributionService.deleteContribution(id);
                                            toast.success('Registratie verwijderd');
                                            loadData(); // Refresh
                                        } catch (e) {
                                            console.error(e);
                                            toast.error('Kon registratie niet verwijderen');
                                        }
                                    }
                                }}
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
                                            // CRITICAL FIX: Use profile_id (from profiles table) not id (unit_id from members table)
                                            // member_group_assignments.member_id references profiles.id
                                            const profileId = (m as any).profile_id || m.id;
                                            const assign = assignments.find(a => a.member_id === profileId);
                                            return (
                                                <TableRow key={m.id}>
                                                    <TableCell>{m.first_name} {m.last_name}</TableCell>
                                                    <TableCell>{m.street} {m.house_number}</TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={assign?.group_id || ''}
                                                            onValueChange={(val) => handleAssignGroup(profileId, val)}
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

            {reminderContribution && reminderContribution.member && (
                <PaymentReminderModal
                    isOpen={isReminderOpen}
                    onClose={() => setIsReminderOpen(false)}
                    memberId={reminderContribution.member!!.id}
                    memberName={`${reminderContribution.member!!.first_name} ${reminderContribution.member!!.last_name}`}
                    memberEmail={reminderContribution.member!!.email || ''}
                    arrearsAmount={(reminderContribution.amount_due || 0) - (reminderContribution.amount_paid || 0)}
                    lastPaymentDate={reminderLastPaymentDate}
                />
            )}
        </div>
    );
};
