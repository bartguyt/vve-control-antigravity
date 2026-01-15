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
    Badge,
    Button,
    Select,
    SelectItem,
    NumberInput,
    Dialog,
    DialogPanel,
    TextInput,
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
    ArrowUturnLeftIcon,
    PencilSquareIcon,
    InformationCircleIcon
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

    // Forms
    const [newYear, setNewYear] = useState(new Date().getFullYear());
    const [newDefaultAmount, setNewDefaultAmount] = useState(150);
    const [newBaseRateName, setNewBaseRateName] = useState('Standaard');
    const [newGroupAmounts, setNewGroupAmounts] = useState<Record<string, number>>({});
    const [newGroupName, setNewGroupName] = useState('');

    // Settings Modal State
    const [tempBaseRateName, setTempBaseRateName] = useState('');
    const [tempDefaultAmount, setTempDefaultAmount] = useState(0);
    const [tempGroupAmounts, setTempGroupAmounts] = useState<Record<string, number>>({});

    // Group Edit State
    const [editingGroup, setEditingGroup] = useState<ContributionGroup | null>(null);
    const [tempGroupName, setTempGroupName] = useState('');

    // Transaction Details State
    const [selectedMemberTx, setSelectedMemberTx] = useState<{ member: Profile; txs: any[] } | null>(null);
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);

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
        } finally {
            // No loading state used
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
    }, [selectedYearId]);

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
            // If explicit empty string passed (from select clear), treat as null? 
            // Tremor Select might pass empty string.
            const gid = groupId === '' ? null : groupId;
            await contributionService.assignMemberToGroup(memberId, gid);
            toast.success('Toewijzing opgeslagen');

            // Sync contributions to reflect group change in overview/rate
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
            // 1. Save Base Rate
            await contributionService.updateBaseAmount(selectedYearId, tempDefaultAmount, tempBaseRateName);

            // 2. Save Group Amounts (only those that changed actually need saving, but safe to upsert all or just loop)
            // We can just loop through tempGroupAmounts
            const promises = Object.entries(tempGroupAmounts).map(([groupId, amount]) =>
                contributionService.updateGroupAmount(selectedYearId, groupId, amount)
            );
            await Promise.all(promises);

            // 3. Sync Amounts (re-calculate amount_due for existing records)
            await contributionService.syncContributionAmounts(selectedYearId);

            // Update main state
            setYears(prev => prev.map(y => y.id === selectedYearId ? {
                ...y,
                default_amount: tempDefaultAmount,
                base_rate_name: tempBaseRateName
            } : y));
            // Refresh contributions to show new amounts
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
            // Refresh
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
            // Also sync contributions because the group name changed
            await contributionService.syncContributionAmounts(selectedYearId);
            const ref = await contributionService.getContributions(selectedYearId);
            setContributions(ref);
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
                                    <div className="w-48">
                                        <Select value={selectedYearId} onValueChange={setSelectedYearId} enableClear={false}>
                                            {years.map(y => (
                                                <SelectItem key={y.id} value={y.id}>
                                                    {y.year}
                                                </SelectItem>
                                            ))}
                                        </Select>
                                    </div>
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

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card decoration="top" decorationColor="indigo">
                                    <Text>Totaal Verwacht</Text>
                                    <Title>€ {totalDue.toFixed(2)}</Title>
                                </Card>
                                <Card decoration="top" decorationColor="emerald">
                                    <Text>Ontvangen</Text>
                                    <Title>€ {totalPaid.toFixed(2)}</Title>
                                </Card>
                                <Card decoration="top" decorationColor="blue">
                                    <Text>Voortgang</Text>
                                    <Title>{progress.toFixed(0)}%</Title>
                                </Card>
                            </div>

                            <Card>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableHeaderCell>Lid</TableHeaderCell>
                                            <TableHeaderCell>Groep</TableHeaderCell>
                                            <TableHeaderCell>Status</TableHeaderCell>
                                            <TableHeaderCell className="text-right">Bedrag</TableHeaderCell>
                                            <TableHeaderCell className="text-right">Betaald</TableHeaderCell>
                                            <TableHeaderCell className="text-right">Openstaand</TableHeaderCell>
                                            <TableHeaderCell>Acties</TableHeaderCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {contributions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center">
                                                    <Text>Geen bijdrages gevonden.</Text>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            contributions.map(c => (
                                                <TableRow key={c.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{c.member?.first_name} {c.member?.last_name}</div>
                                                        <div className="text-xs text-gray-500">{c.member?.straat} {c.member?.huisnummer}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {c.group ? (
                                                            <Badge color="blue" size="xs">{c.group.name}</Badge>
                                                        ) : (
                                                            <Text className="text-xs text-gray-400">
                                                                {c.year?.base_rate_name || 'Standaard'}
                                                            </Text>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge color={
                                                            c.status === 'PAID' ? 'emerald' :
                                                                c.status === 'PARTIAL' ? 'yellow' :
                                                                    c.status === 'OVERDUE' ? 'red' : 'gray'
                                                        }>
                                                            {c.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">€ {c.amount_due?.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">€ {c.amount_paid?.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Text color={(c.amount_due || 0) - (c.amount_paid || 0) > 0 ? "red" : "emerald"}>
                                                            € {((c.amount_due || 0) - (c.amount_paid || 0))?.toFixed(2)}
                                                        </Text>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            {c.status !== 'PAID' && (
                                                                <Button size="xs" variant="secondary" onClick={() => handleMarkPaid(c)}>
                                                                    Betaald
                                                                </Button>
                                                            )}
                                                            {c.status === 'PAID' && (
                                                                <Button size="xs" variant="light" color="red" icon={ArrowUturnLeftIcon} onClick={() => handleUndoPaid(c)}>
                                                                    Ongedaan
                                                                </Button>
                                                            )}
                                                            {c.member && (
                                                                <Button size="xs" variant="light" icon={InformationCircleIcon} onClick={() => handleOpenTxDetails(c.member!)} />
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </Card>
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
                                                    <TableCell>{m.straat} {m.huisnummer}</TableCell>
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

            {/* MODAL: CREATE YEAR */}
            <Dialog open={isCreateYearOpen} onClose={() => setIsCreateYearOpen(false)} static={true}>
                <DialogPanel className="p-6">
                    <Title className="mb-4">Nieuw Boekjaar</Title>
                    <div className="space-y-4">
                        <div>
                            <Text>Jaar</Text>
                            <NumberInput value={newYear} onValueChange={setNewYear} min={2020} max={2030} />
                        </div>

                        <div className="border-b pb-4 mb-4">
                            <Text className="font-medium mb-2">Standaard / Groep 1</Text>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Text className="text-xs mb-1">Naam</Text>
                                    <TextInput value={newBaseRateName} onValueChange={setNewBaseRateName} placeholder="Naam (bv. Groep 1)" />
                                </div>
                                <div>
                                    <Text className="text-xs mb-1">Bedrag (€)</Text>
                                    <NumberInput value={newDefaultAmount} onValueChange={setNewDefaultAmount} min={0} />
                                </div>
                            </div>
                        </div>

                        {groups.length > 0 && (
                            <div className="pt-2">
                                <Text className="font-medium mb-2">Overige Groepen</Text>
                                <div className="space-y-2">
                                    {groups.map(g => (
                                        <div key={g.id} className="flex justify-between items-center">
                                            <Text>{g.name}</Text>
                                            <div className="w-32">
                                                <NumberInput
                                                    placeholder="Bedrag"
                                                    value={newGroupAmounts[g.id] ?? 0} // Fix NaN by defaulting to 0 or undefined only if handled
                                                    onValueChange={(val) => setNewGroupAmounts(prev => ({ ...prev, [g.id]: val }))}
                                                    min={0}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="secondary" onClick={() => setIsCreateYearOpen(false)}>Annuleer</Button>
                            <Button onClick={handleCreateYear}>Aanmaken</Button>
                        </div>
                    </div>
                </DialogPanel>
            </Dialog>

            {/* MODAL: YEAR SETTINGS (GROUP AMOUNTS) */}
            <Dialog open={isGroupSettingsOpen} onClose={() => setIsGroupSettingsOpen(false)} static={true}>
                <DialogPanel className="p-6">
                    <Title className="mb-4">Instellingen Boekjaar</Title>
                    {selectedYear && (
                        <div className="space-y-4">
                            <div className="border-b pb-4 mb-4">
                                <Text className="font-medium mb-2">Standaard / Groep 1</Text>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Text className="text-xs mb-1">Naam</Text>
                                        <TextInput
                                            value={tempBaseRateName}
                                            onValueChange={setTempBaseRateName}
                                            placeholder="Naam"
                                        />
                                    </div>
                                    <div>
                                        <Text className="text-xs mb-1">Bedrag (€)</Text>
                                        <NumberInput
                                            value={tempDefaultAmount}
                                            onValueChange={setTempDefaultAmount}
                                            min={0}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Text className="font-medium mb-2">Overige Groepen</Text>
                                {groups.map(g => {
                                    // Find existing amount
                                    // We need to fetch amounts for this year if not in state?
                                    // Actually we load all data in loadData? No, getYearAmounts is called but not stored in a map.
                                    // We'll trust the user to reload page or we fetch specifically.
                                    // Ideally we fetch amounts when opening this modal.
                                    return (
                                        <div key={g.id} className="flex justify-between items-center py-2 border-b last:border-0 border-gray-100">
                                            <Text>{g.name}</Text>
                                            <div className="w-32">
                                                <NumberInput
                                                    placeholder="Bedrag"
                                                    value={tempGroupAmounts[g.id] ?? 0}
                                                    onValueChange={(val) => setTempGroupAmounts(prev => ({ ...prev, [g.id]: val }))}
                                                    min={0}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <Button variant="secondary" onClick={() => setIsGroupSettingsOpen(false)}>Annuleer</Button>
                                <Button onClick={handleSaveSettings}>Opslaan</Button>
                            </div>
                        </div>
                    )}
                </DialogPanel>
            </Dialog>

            {/* MODAL: EDIT GROUP NAME */}
            <Dialog open={!!editingGroup} onClose={() => setEditingGroup(null)} static={true}>
                <DialogPanel className="p-6">
                    <Title className="mb-4">Groep Naam Wijzigen</Title>
                    <TextInput
                        placeholder="Nieuwe naam..."
                        value={tempGroupName}
                        onValueChange={setTempGroupName}
                    />
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="secondary" onClick={() => setEditingGroup(null)}>Annuleer</Button>
                        <Button onClick={handleUpdateGroupName}>Bijwerken</Button>
                    </div>
                </DialogPanel>
            </Dialog>

            {/* MODAL: TRANSACTION DETAILS */}
            <Dialog open={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} static={true}>
                <DialogPanel className="p-6 max-w-2xl">
                    <Title className="mb-2">Gekoppelde Transacties</Title>
                    <Text className="mb-6">{selectedMemberTx?.member.first_name} {selectedMemberTx?.member.last_name}</Text>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {selectedMemberTx?.txs.length === 0 ? (
                            <Text className="text-center py-8 text-gray-500 italic">
                                Geen overeenkomende transacties gevonden voor dit jaar.
                            </Text>
                        ) : (
                            selectedMemberTx?.txs.map((tx, idx) => (
                                <div key={idx} className="p-3 border rounded-lg bg-gray-50 flex justify-between items-start">
                                    <div className="space-y-1">
                                        <Text className="font-semibold">{tx.description || '(Geen omschrijving)'}</Text>
                                        <Text className="text-xs text-gray-400">{new Date(tx.booking_date).toLocaleDateString()}</Text>
                                    </div>
                                    <Badge color="emerald" size="xs">€ {tx.amount.toFixed(2)}</Badge>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-8 flex justify-end pt-4 border-t">
                        <Button variant="secondary" onClick={() => setIsTxModalOpen(false)}>Sluiten</Button>
                    </div>
                </DialogPanel>
            </Dialog>

            {/* MODAL: CREATE GROUP */}
            <Dialog open={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} static={true}>
                <DialogPanel className="p-6">
                    <Title className="mb-4">Nieuwe Groep</Title>
                    <TextInput placeholder="Groep naam (bv. Appartementen)" value={newGroupName} onValueChange={setNewGroupName} />
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="secondary" onClick={() => setIsCreateGroupOpen(false)}>Annuleer</Button>
                        <Button onClick={handleCreateGroup}>Opslaan</Button>
                    </div>
                </DialogPanel>
            </Dialog>
        </div>
    );
};
