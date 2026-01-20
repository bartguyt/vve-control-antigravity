import React, { useEffect, useState } from 'react';
import {
    Title,
    Text,
    Card,
    Metric,
    TabGroup,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Table,
    TableHead,
    TableRow,
    TableHeaderCell,
    TableBody,
    TableCell,
    Badge,
    Button,
    Select,
    SelectItem
} from '@tremor/react';
import { bankService } from './bankService';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, ArrowsRightLeftIcon, CreditCardIcon, CircleStackIcon, LinkIcon, UserIcon, TagIcon } from '@heroicons/react/24/outline';
import { LinkTransactionModal } from './LinkTransactionModal';
import { memberService } from '../members/memberService';
import { associationService } from '../../lib/association';
import { contributionService } from './contributionService';
import { bookkeepingService } from './bookkeepingService';
import type { BankTransaction, Profile, ContributionYear, FinancialCategory } from '../../types/database';
import { toast } from 'sonner';

interface Account {
    id: string;
    association_id: string;
    name: string;
    iban: string;
    balance_amount: number;
    currency: string;
    account_type?: 'PAYMENT' | 'SAVINGS';
}

interface Transaction extends BankTransaction {
    linked_member_name?: string;
}

export const BankAccountPage: React.FC = () => {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [years, setYears] = useState<ContributionYear[]>([]);
    const [categories, setCategories] = useState<FinancialCategory[]>([]);

    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [accs, profile, yearsData, catsData] = await Promise.all([
                bankService.getAccounts(),
                associationService.getCurrentProfile(),
                contributionService.getYears(),
                bookkeepingService.getCategories()
            ]);
            setAccounts(accs);
            setUserProfile(profile);
            setYears(yearsData);
            setCategories(catsData);
        } catch (error) {
            console.error('Error loading initial data:', error);
            toast.error('Error loading account data');
        } finally {
            setLoading(false);
        }
    };

    const loadTransactions = async (accountId: string) => {
        try {
            const data = await bankService.getTransactions(accountId);
            const members = await memberService.getMembers();
            const dataWithNames = data.map((tx: any) => ({
                ...tx,
                linked_member_name: tx.linked_member_id
                    ? members.find(m => m.id === tx.linked_member_id)?.last_name
                    : undefined
            }));

            setTransactions(dataWithNames);
        } catch (error) {
            console.error('Error loading transactions:', error);
            toast.error('Error loading transactions');
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (accounts.length > 0) {
            loadTransactions(accounts[selectedAccountIndex].id);
        }
    }, [accounts, selectedAccountIndex]);

    const openLinkModal = (tx: Transaction) => {
        setSelectedTx(tx);
        setLinkModalOpen(true);
    };

    const handleLinkSuccess = () => {
        if (accounts.length > 0) {
            loadTransactions(accounts[selectedAccountIndex].id);
        }
    };

    const handleCategoryChange = async (txId: string, categoryId: string | null) => {
        try {
            // Find selected category object
            // const cat = categories.find(c => c.id === categoryId);

            // For backward compatibility / display, we might want to store the name in 'category' column if we still use it.
            // But relying on financial_category_id is better.
            // bankService.updateTransactionCategory handles both.

            await bankService.updateTransactionCategory(txId, null, null, categoryId);
            toast.success('Categorie bijgewerkt');
            loadTransactions(accounts[selectedAccountIndex].id);
        } catch (error) {
            toast.error('Kon categorie niet bijwerken');
        }
    };

    const handleYearChange = async (txId: string, yearId: string | null) => {
        try {
            // Find current tx to get its current financial category
            const tx = transactions.find(t => t.id === txId);
            if (!tx) return;

            await bankService.updateTransactionCategory(txId, null, yearId, tx.financial_category_id);
            toast.success('Boekjaar bijgewerkt');
            loadTransactions(accounts[selectedAccountIndex].id);
        } catch (error) {
            toast.error('Kon boekjaar niet bijwerken');
        }
    };

    const handleAutoCategorize = async () => {
        const accountId = accounts[selectedAccountIndex]?.id;
        if (!accountId) return;

        setLoading(true);
        try {
            const count = await bankService.autoCategorizeAccountTransactions(accountId);
            toast.success(`${count} transacties automatisch gecategoriseerd`);
            await loadTransactions(accountId);
        } catch (error) {
            toast.error('Fout bij automatisch categoriseren');
        } finally {
            setLoading(false);
        }
    };

    const canEditCategory = (() => {
        if (!userProfile) return false;
        if (userProfile.is_super_admin) return true;
        const currentAssociationId = accounts[selectedAccountIndex]?.association_id;
        const membership = userProfile.association_memberships?.find(m => m.association_id === currentAssociationId);
        return membership && ['admin', 'bestuur'].includes(membership.role);
    })();

    if (loading) {
        return <div className="p-6 text-center text-gray-500">Bankoverzicht laden...</div>;
    }

    if (accounts.length === 0) {
        return (
            <div className="p-6">
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <Title>Bankrekeningen</Title>
                        <Text>Er zijn nog geen bankrekeningen gekoppeld.</Text>
                    </div>
                    <Button variant="secondary" icon={ArrowsRightLeftIcon} onClick={() => navigate('/system/settings')}>
                        Instellingen
                    </Button>
                </header>
                <Card className="text-center p-12">
                    <Text>Configureer uw bankkoppeling in de instellingen om transacties te bekijken.</Text>
                    <div className="mt-6">
                        <Button icon={PlusIcon} onClick={() => navigate('/system/settings')}>
                            Rekening toevoegen
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <Title>Bankrekeningen</Title>
                    <Text>Overzicht van uw gekoppelde zakelijke rekeningen en transacties.</Text>
                </div>
                <Button variant="secondary" icon={ArrowsRightLeftIcon} onClick={() => navigate('/system/settings')}>
                    Instellingen
                </Button>
            </header>

            <TabGroup index={selectedAccountIndex} onIndexChange={setSelectedAccountIndex}>
                <TabList variant="solid">
                    {accounts.map((acc) => (
                        <Tab
                            key={acc.id}
                            icon={acc.account_type === 'SAVINGS' ? CircleStackIcon : CreditCardIcon}
                            className="flex flex-col items-start text-left py-2"
                        >
                            <span className="font-semibold block">{acc.name}</span>
                            <span className="text-xs opacity-75 font-normal">{acc.iban}</span>
                        </Tab>
                    ))}
                </TabList>
                <TabPanels>
                    {accounts.map((acc) => (
                        <TabPanel key={acc.id}>
                            <div className="mt-6 space-y-6">
                                {/* Account Stats */}
                                <Card decoration="top" decorationColor={acc.account_type === 'SAVINGS' ? 'cyan' : 'indigo'}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <Text>Huidig Saldo</Text>
                                            <Metric>€ {acc.balance_amount.toFixed(2)}</Metric>
                                        </div>
                                        <Badge color={acc.account_type === 'SAVINGS' ? 'cyan' : 'indigo'}>
                                            {acc.account_type === 'SAVINGS' ? 'Spaarrekening' : 'Betaalrekening'}
                                        </Badge>
                                    </div>
                                    <Text className="mt-2 text-xs text-gray-500">
                                        IBAN: {acc.iban}
                                    </Text>
                                </Card>

                                {/* Transactions Table */}
                                <Card>
                                    <div className="flex justify-between items-center">
                                        <Title>Transacties</Title>
                                        {canEditCategory && (
                                            <Button
                                                size="xs"
                                                variant="secondary"
                                                icon={TagIcon}
                                                onClick={handleAutoCategorize}
                                            >
                                                Automatisch categoriseren
                                            </Button>
                                        )}
                                    </div>
                                    <Table className="mt-4">
                                        <TableHead>
                                            <TableRow>
                                                <TableHeaderCell>Datum</TableHeaderCell>
                                                <TableHeaderCell>Tegenpartij</TableHeaderCell>
                                                <TableHeaderCell>Betaalkenmerk</TableHeaderCell>
                                                <TableHeaderCell>Bedrag</TableHeaderCell>
                                                <TableHeaderCell>Type</TableHeaderCell>
                                                <TableHeaderCell>Lid</TableHeaderCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {transactions.map((tx) => (
                                                <TableRow key={tx.id} className="hover:bg-gray-50">
                                                    <TableCell>
                                                        {new Date(tx.booking_date).toLocaleDateString('nl-NL')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <Text className="font-medium text-gray-900">
                                                                {tx.creditor_name || tx.debtor_name || 'Onbekend'}
                                                            </Text>
                                                            {tx.counterparty_iban && (
                                                                <Text className="text-xs text-gray-400 font-mono">
                                                                    {tx.counterparty_iban}
                                                                </Text>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Text className="truncate max-w-xs" title={tx.description}>{tx.description}</Text>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            color={tx.amount > 0 ? "emerald" : "red"}
                                                            size="xs"
                                                        >
                                                            {tx.amount > 0 ? '+' : ''} € {Math.abs(tx.amount).toFixed(2)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {canEditCategory ? (
                                                            <>
                                                                <Select
                                                                    value={tx.financial_category_id || ''}
                                                                    onValueChange={(val) => handleCategoryChange(tx.id, val || null)}
                                                                    placeholder="Kies type..."
                                                                    enableClear
                                                                    className="w-40"
                                                                >
                                                                    {categories.map((cat) => (
                                                                        <SelectItem key={cat.id} value={cat.id}>
                                                                            {cat.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </Select>

                                                                {/* Show year selector if category is 'Ledenbijdrage' (check by name or code if we have it) */}
                                                                {(() => {
                                                                    const selectedCat = categories.find(c => c.id === tx.financial_category_id);
                                                                    if (selectedCat && selectedCat.name.toLowerCase() === 'ledenbijdrage') {
                                                                        return (
                                                                            <div className="mt-2">
                                                                                <Select
                                                                                    value={tx.contribution_year_id || ''}
                                                                                    onValueChange={(val) => handleYearChange(tx.id, val || null)}
                                                                                    placeholder="Boekjaar (auto)"
                                                                                    enableClear
                                                                                    className="w-40"
                                                                                >
                                                                                    {years.map(y => (
                                                                                        <SelectItem key={y.id} value={y.id}>
                                                                                            {y.year}
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </Select>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </>
                                                        ) : (
                                                            tx.financial_category_id ? (
                                                                <div className="flex flex-col items-start gap-1">
                                                                    <Badge size="xs" color="gray" icon={TagIcon}>
                                                                        {categories.find(c => c.id === tx.financial_category_id)?.name || 'Onbekend'}
                                                                    </Badge>
                                                                    {/* Show year badge if category is Ledenbijdrage */}
                                                                    {(() => {
                                                                        const catName = categories.find(c => c.id === tx.financial_category_id)?.name.toLowerCase();
                                                                        if (catName === 'ledenbijdrage' && tx.contribution_year_id) {
                                                                            return (
                                                                                <Badge size="xs" color="blue">
                                                                                    {years.find(y => y.id === tx.contribution_year_id)?.year}
                                                                                </Badge>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </div>
                                                            ) : (
                                                                <Text className="text-xs text-gray-400 italic">Nog te beoordelen</Text>
                                                            )
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {tx.linked_member_id ? (
                                                            <div className="flex items-center space-x-2">
                                                                <Badge size="xs" color="blue" icon={UserIcon}>
                                                                    {tx.linked_member_name || 'Lid'}
                                                                </Badge>
                                                                <button
                                                                    className="text-gray-400 hover:text-blue-600"
                                                                    onClick={() => openLinkModal(tx)}
                                                                >
                                                                    <ArrowsRightLeftIcon className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                size="xs"
                                                                variant="light"
                                                                icon={LinkIcon}
                                                                onClick={() => openLinkModal(tx)}
                                                            >
                                                                Koppel
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {transactions.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                                        Geen transacties gevonden voor deze rekening.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </Card>
                            </div>
                        </TabPanel>
                    ))}
                </TabPanels>
            </TabGroup>

            {selectedTx && (
                <LinkTransactionModal
                    isOpen={linkModalOpen}
                    onClose={() => setLinkModalOpen(false)}
                    onSuccess={handleLinkSuccess}
                    transactionId={selectedTx.id}
                    transactionDescription={selectedTx.description}
                    transactionAmount={selectedTx.amount}
                    counterpartyIban={selectedTx.counterparty_iban}
                    associationId={selectedTx.association_id}
                />
            )}
        </div>
    );
};
