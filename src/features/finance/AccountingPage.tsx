import React, { useState, useEffect } from 'react';
import { Title, Text, TabGroup, TabList, Tab, TabPanels, TabPanel, Card, Button, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell, Badge, TextInput, DateRangePicker, Grid, Metric } from '@tremor/react';
import type { DateRangePickerValue } from '@tremor/react';
import { PlusIcon, PencilIcon, TrashIcon, BookOpenIcon, TagIcon, ChartPieIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { bookkeepingService } from './bookkeepingService';
import type { LedgerAccount, FinancialCategory } from '../../types/database';
import { BaseModal } from '../../components/ui/BaseModal';
import { toast } from 'sonner';
import { startOfYear, endOfYear } from 'date-fns';
import { nl } from 'date-fns/locale';

export const AccountingPage: React.FC = () => {
    const [selectedView, setSelectedView] = useState(0); // 0=Overview, 1=Categories, 2=Ledger
    const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
    const [categories, setCategories] = useState<FinancialCategory[]>([]);

    // Report State
    const [reportDateRange, setReportDateRange] = useState<DateRangePickerValue>({
        from: startOfYear(new Date()),
        to: endOfYear(new Date())
    });
    const [balanceSheet, setBalanceSheet] = useState<any[]>([]);
    const [profitLoss, setProfitLoss] = useState<any[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);

    // Modal States
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
    const [editingLedger, setEditingLedger] = useState<LedgerAccount | null>(null);

    // Form States
    const [catName, setCatName] = useState('');
    const [catLedgerId, setCatLedgerId] = useState('');

    // Ledger Form
    const [ledName, setLedName] = useState('');
    const [ledCode, setLedCode] = useState('');
    const [ledType, setLedType] = useState('EXPENSE');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedView === 0) {
            loadReports();
        }
    }, [selectedView, reportDateRange]);

    const loadData = async () => {
        try {
            const [accs, cats] = await Promise.all([
                bookkeepingService.getLedgerAccounts(),
                bookkeepingService.getCategories()
            ]);
            setLedgerAccounts(accs);
            setCategories(cats);
        } catch (e) {
            console.error(e);
            toast.error('Fout bij laden boekhouding');
        }
    };

    const checkDuplicates = (items: any[], context: string) => {
        const ids = items.map(i => i.ledger_account_id);
        const uniqueIds = new Set(ids);
        if (uniqueIds.size !== ids.length) {
            console.error(`Duplicate IDs found in ${context}!`, items);
            toast.error(`⚠️ Data integriteit waarschuwing: Dubbele IDs in ${context}`);
            const duplicates = ids.filter((item, index) => ids.indexOf(item) !== index);
            console.warn('Duplicates:', duplicates);
        }
    };

    const loadReports = async () => {
        if (!reportDateRange.from || !reportDateRange.to) return;

        try {
            setLoadingReports(true);
            const [bs, pl] = await Promise.all([
                bookkeepingService.getBalanceSheet(reportDateRange.to),
                bookkeepingService.getProfitLoss(reportDateRange.from, reportDateRange.to)
            ]);

            checkDuplicates(bs, 'Balans');
            checkDuplicates(pl, 'W&V');

            setBalanceSheet(bs);
            setProfitLoss(pl);
        } catch (e) {
            console.error(e);
            toast.error('Kan rapportages niet laden');
        } finally {
            setLoadingReports(false);
        }
    };

    // --- Category Handlers ---
    const handleOpenCategoryModal = (cat?: FinancialCategory) => {
        if (cat) {
            setEditingCategory(cat);
            setCatName(cat.name);
            setCatLedgerId(cat.ledger_account_id);
        } else {
            setEditingCategory(null);
            setCatName('');
            setCatLedgerId('');
        }
        setIsCategoryModalOpen(true);
    };

    const handleSaveCategory = async () => {
        if (!catName || !catLedgerId) {
            toast.error('Vul alle velden in');
            return;
        }
        try {
            if (editingCategory) {
                await bookkeepingService.updateCategory(editingCategory.id, {
                    name: catName,
                    ledger_account_id: catLedgerId
                });
                toast.success('Categorie bijgewerkt');
            } else {
                await bookkeepingService.createCategory({
                    name: catName,
                    ledger_account_id: catLedgerId
                });
                toast.success('Categorie aangemaakt');
            }
            setIsCategoryModalOpen(false);
            loadData();
        } catch (e) {
            console.error(e);
            toast.error('Opslaan mislukt');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Weet u zeker dat u deze categorie wilt verwijderen?')) return;
        try {
            await bookkeepingService.deleteCategory(id);
            toast.success('Categorie verwijderd');
            loadData();
        } catch (e) {
            console.error(e);
            toast.error('Verwijderen mislukt (mogelijk in gebruik)');
        }
    };

    // --- Ledger Handlers ---
    const handleOpenLedgerModal = (led?: LedgerAccount) => {
        if (led) {
            setEditingLedger(led);
            setLedCode(led.code.toString());
            setLedName(led.name);
            setLedType(led.type);
        } else {
            setEditingLedger(null);
            setLedCode('');
            setLedName('');
            setLedType('EXPENSE');
        }
        setIsLedgerModalOpen(true);
    };

    const handleSaveLedger = async () => {
        if (!ledCode || !ledName || !ledType) {
            toast.error('Vul alle velden in');
            return;
        }
        try {
            const codeNum = parseInt(ledCode);
            if (isNaN(codeNum)) {
                toast.error('Code moet een getal zijn');
                return;
            }

            if (editingLedger) {
                await bookkeepingService.updateLedgerAccount(editingLedger.id, {
                    code: codeNum,
                    name: ledName,
                    type: ledType as any
                });
                toast.success('Grootboekrekening bijgewerkt');
            } else {
                await bookkeepingService.createLedgerAccount({
                    code: codeNum,
                    name: ledName,
                    type: ledType as any,
                    is_system: false
                });
                toast.success('Grootboekrekening aangemaakt');
            }
            setIsLedgerModalOpen(false);
            loadData();
        } catch (e) {
            console.error(e);
            toast.error('Opslaan mislukt');
        }
    };

    // --- Report Calculation Helpers ---
    const calculateTotal = (data: any[], type: string) => {
        return data
            .filter(item => item.type === type)
            .reduce((sum, item) => sum + Number(item.balance || item.amount || 0), 0);
    };

    const totalAssets = calculateTotal(balanceSheet, 'ASSET');
    const totalLiabilities = calculateTotal(balanceSheet, 'LIABILITY');
    const totalEquity = calculateTotal(balanceSheet, 'EQUITY');

    // Check if balanced: Assets = Liabilities + Equity
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

    const totalRevenue = calculateTotal(profitLoss, 'REVENUE');
    const totalExpenses = calculateTotal(profitLoss, 'EXPENSE');
    const netResult = totalRevenue - totalExpenses;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(val);
    };

    const handleExport = () => {
        if (!balanceSheet.length && !profitLoss.length) return;

        const formatDate = (d: Date | undefined) => d ? d.toLocaleDateString() : '';
        const periodStr = `${formatDate(reportDateRange.from)} - ${formatDate(reportDateRange.to)}`;

        // 1. Profit & Loss CSV
        let csvContent = `Winst- en Verliesrekening (${periodStr})\n`;
        csvContent += `Type;Code;Naam;Bedrag\n`;
        profitLoss.forEach(item => {
            csvContent += `${item.type};${item.code};"${item.name}";${item.amount}\n`;
        });

        // 2. Balance Sheet CSV
        csvContent += `\n\nBalans (Per ${formatDate(reportDateRange.to)})\n`;
        csvContent += `Type;Code;Naam;Saldo\n`;
        balanceSheet.forEach(item => {
            csvContent += `${item.type};${item.code};"${item.name}";${item.balance}\n`;
        });

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `boekhouding_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Title>Boekhouding</Title>
                    <Text>Beheer van financiële instellingen en rapportages</Text>
                </div>
            </div>

            <TabGroup index={selectedView} onIndexChange={setSelectedView}>
                <TabList className="mb-6">
                    <Tab icon={ChartPieIcon}>Overzicht & Rapportages</Tab>
                    <Tab icon={TagIcon}>Categorieën</Tab>
                    <Tab icon={BookOpenIcon}>Grootboekschema</Tab>
                </TabList>
                <TabPanels>
                    {/* DASHBOARD PANEL */}
                    <TabPanel>
                        <div className="mb-6 flex justify-between items-center">
                            <DateRangePicker
                                className="max-w-md mx-auto"
                                value={reportDateRange}
                                onValueChange={setReportDateRange}
                                locale={nl}
                                placeholder="Selecteer periode..."
                            />

                            <Button variant="secondary" icon={ArrowDownTrayIcon} onClick={handleExport} disabled={loadingReports}>
                                Exporteer CSV
                            </Button>
                        </div>

                        {loadingReports ? (
                            <div className="text-center py-12 text-gray-500">Rapporten genereren...</div>
                        ) : (
                            <div className="space-y-6">
                                {/* Profit & Loss Card */}
                                <Card>
                                    <Title>Winst- en Verliesrekening</Title>
                                    <Text>Periode: {reportDateRange.from?.toLocaleDateString()} - {reportDateRange.to?.toLocaleDateString()}</Text>

                                    <Grid numItems={1} numItemsSm={3} className="gap-6 mt-6">
                                        <Card decoration="top" decorationColor="emerald">
                                            <Text>Totale Omzet</Text>
                                            <Metric>{formatCurrency(totalRevenue)}</Metric>
                                        </Card>
                                        <Card decoration="top" decorationColor="blue">
                                            <Text>Totale Kosten</Text>
                                            <Metric>{formatCurrency(totalExpenses)}</Metric>
                                        </Card>
                                        <Card decoration="top" decorationColor={netResult >= 0 ? "emerald" : "red"}>
                                            <Text>Netto Resultaat</Text>
                                            <Metric>{formatCurrency(netResult)}</Metric>
                                        </Card>
                                    </Grid>

                                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <Title className="mb-4 text-sm uppercase tracking-wide text-gray-500">Omzet</Title>
                                            <Table>
                                                <TableBody>
                                                    {profitLoss.filter(i => i.type === 'REVENUE').map(item => (
                                                        <TableRow key={item.ledger_account_id}>
                                                            <TableCell>{item.name}</TableCell>
                                                            <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    {profitLoss.filter(i => i.type === 'REVENUE').length === 0 && (
                                                        <TableRow key="empty-revenue"><TableCell className="text-gray-400 italic">Geen omzet geboekt</TableCell></TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                        <div>
                                            <Title className="mb-4 text-sm uppercase tracking-wide text-gray-500">Kosten</Title>
                                            <Table>
                                                <TableBody>
                                                    {profitLoss.filter(i => i.type === 'EXPENSE').map(item => (
                                                        <TableRow key={item.ledger_account_id}>
                                                            <TableCell>{item.name}</TableCell>
                                                            <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    {profitLoss.filter(i => i.type === 'EXPENSE').length === 0 && (
                                                        <TableRow key="empty-expense"><TableCell className="text-gray-400 italic">Geen kosten geboekt</TableCell></TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </Card>

                                {/* Balance Sheet Card */}
                                <Card>
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <Title>Balans</Title>
                                            <Text>Per datum: {reportDateRange.to?.toLocaleDateString()}</Text>
                                        </div>
                                        {!isBalanced && (
                                            <Badge color="red">Balans niet in evenwicht! Verschil: {formatCurrency(totalAssets - (totalLiabilities + totalEquity))}</Badge>
                                        )}
                                        {isBalanced && <Badge color="emerald">In evenwicht</Badge>}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Activa */}
                                        <div>
                                            <div className="bg-gray-50 p-3 rounded-t-md border-b text-sm font-semibold uppercase tracking-wide text-gray-600 flex justify-between">
                                                <span>Activa</span>
                                                <span>{formatCurrency(totalAssets)}</span>
                                            </div>
                                            <Table className="mt-2">
                                                <TableBody>
                                                    {balanceSheet.filter(i => i.type === 'ASSET').map(item => (
                                                        <TableRow key={item.ledger_account_id}>
                                                            <TableCell>{item.code} {item.name}</TableCell>
                                                            <TableCell className="text-right">{formatCurrency(item.balance)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        {/* Passiva */}
                                        <div>
                                            <div className="bg-gray-50 p-3 rounded-t-md border-b text-sm font-semibold uppercase tracking-wide text-gray-600 flex justify-between">
                                                <span>Passiva</span>
                                                <span>{formatCurrency(totalLiabilities + totalEquity)}</span>
                                            </div>
                                            <Table className="mt-2">
                                                <TableBody>
                                                    {[
                                                        <TableRow key="header-equity">
                                                            <TableCell className="font-medium text-gray-900" colSpan={2}>Eigen Vermogen</TableCell>
                                                        </TableRow>,
                                                        ...balanceSheet.filter(i => i.type === 'EQUITY').map(item => (
                                                            <TableRow key={item.ledger_account_id}>
                                                                <TableCell className="pl-6">{item.code} {item.name}</TableCell>
                                                                <TableCell className="text-right">{formatCurrency(item.balance)}</TableCell>
                                                            </TableRow>
                                                        )),
                                                        <TableRow key="header-liabilities">
                                                            <TableCell className="font-medium text-gray-900 pt-4" colSpan={2}>Vreemd Vermogen (Schulden)</TableCell>
                                                        </TableRow>,
                                                        ...balanceSheet.filter(i => i.type === 'LIABILITY').map(item => (
                                                            <TableRow key={item.ledger_account_id}>
                                                                <TableCell className="pl-6">{item.code} {item.name}</TableCell>
                                                                <TableCell className="text-right">{formatCurrency(item.balance)}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    ]}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </TabPanel>

                    {/* CATEGORIES PANEL */}
                    <TabPanel>
                        <div className="flex justify-end mb-4">
                            <Button icon={PlusIcon} onClick={() => handleOpenCategoryModal()}>
                                Nieuwe Categorie
                            </Button>
                        </div>
                        <Card>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableHeaderCell>Categorie Naam</TableHeaderCell>
                                        <TableHeaderCell>Gekoppeld Grootboek</TableHeaderCell>
                                        <TableHeaderCell>Acties</TableHeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {categories.map((cat) => (
                                        <TableRow key={cat.id}>
                                            <TableCell className="font-medium text-gray-900">{cat.name}</TableCell>
                                            <TableCell>
                                                {cat.ledger_account ? (
                                                    <span className="flex items-center space-x-2">
                                                        <Badge color="slate" size="xs">{cat.ledger_account.code}</Badge>
                                                        <span>{cat.ledger_account.name}</span>
                                                    </span>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button size="xs" variant="secondary" icon={PencilIcon} onClick={() => handleOpenCategoryModal(cat)}>Bewerk</Button>
                                                    <Button size="xs" variant="secondary" color="red" icon={TrashIcon} onClick={() => handleDeleteCategory(cat.id)} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabPanel>

                    {/* LEDGER ACCOUNTS PANEL */}
                    <TabPanel>
                        <div className="flex justify-end mb-4">
                            <Button icon={PlusIcon} onClick={() => handleOpenLedgerModal()}>
                                Nieuwe Grootboekrekening
                            </Button>
                        </div>
                        <Card>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableHeaderCell>Code</TableHeaderCell>
                                        <TableHeaderCell>Naam</TableHeaderCell>
                                        <TableHeaderCell>Type</TableHeaderCell>
                                        <TableHeaderCell>Status</TableHeaderCell>
                                        <TableHeaderCell>Acties</TableHeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {ledgerAccounts.map((acc) => (
                                        <TableRow key={acc.id}>
                                            <TableCell>
                                                <Badge color="slate">{acc.code}</Badge>
                                            </TableCell>
                                            <TableCell className="font-medium text-gray-900">{acc.name}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    color={
                                                        acc.type === 'ASSET' ? 'emerald' :
                                                            acc.type === 'LIABILITY' ? 'orange' :
                                                                acc.type === 'EQUITY' ? 'blue' :
                                                                    acc.type === 'REVENUE' ? 'green' : 'red'
                                                    }
                                                >
                                                    {acc.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {acc.is_system && <Badge size="xs" color="gray">Systeem</Badge>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button size="xs" variant="secondary" icon={PencilIcon} onClick={() => handleOpenLedgerModal(acc)}>Bewerk</Button>
                                                    {!acc.is_system && (
                                                        <Button size="xs" variant="secondary" color="red" icon={TrashIcon} onClick={() => handleDeleteCategory(acc.id)} />
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabPanel>
                </TabPanels>
            </TabGroup>

            {/* CATEGORY MODAL */}
            <BaseModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                title={editingCategory ? "Categorie Bewerken" : "Nieuwe Categorie"}
                footer={
                    <div className="flex justify-end space-x-2">
                        <Button variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>Annuleren</Button>
                        <Button onClick={handleSaveCategory}>Opslaan</Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Naam</label>
                        <TextInput value={catName} onChange={(e) => setCatName(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Koppel Grootboekrekening</label>
                        <select
                            value={catLedgerId}
                            onChange={(e) => setCatLedgerId(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        >
                            <option value="" disabled>Selecteer...</option>
                            {ledgerAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.code} - {acc.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </BaseModal>

            {/* LEDGER MODAL */}
            <BaseModal
                isOpen={isLedgerModalOpen}
                onClose={() => setIsLedgerModalOpen(false)}
                title={editingLedger ? "Grootboekrekening Bewerken" : "Nieuwe Grootboekrekening"}
                footer={
                    <div className="flex justify-end space-x-2">
                        <Button variant="secondary" onClick={() => setIsLedgerModalOpen(false)}>Annuleren</Button>
                        <Button onClick={handleSaveLedger}>Opslaan</Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Code</label>
                        <TextInput value={ledCode} onChange={(e) => setLedCode(e.target.value)} placeholder="Bijv. 4000" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Naam</label>
                        <TextInput value={ledName} onChange={(e) => setLedName(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Type</label>
                        <select
                            value={ledType}
                            onChange={(e) => setLedType(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        >
                            <option value="ASSET">Activa (Bezittingen)</option>
                            <option value="LIABILITY">Passiva (Schulden)</option>
                            <option value="EQUITY">Eigen Vermogen</option>
                            <option value="REVENUE">Omzet (Winst)</option>
                            <option value="EXPENSE">Kosten (Verlies)</option>
                        </select>
                    </div>
                    {editingLedger?.is_system && (
                        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                            Let op: Dit is een systeemrekening. Wees voorzichtig met wijzigingen.
                        </div>
                    )}
                </div>
            </BaseModal>
        </div>
    );
};
