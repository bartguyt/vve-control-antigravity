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
    Icon
} from '@tremor/react';
import { bankService } from './bankService';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, ArrowsRightLeftIcon, CreditCardIcon, CircleStackIcon } from '@heroicons/react/24/outline';

interface Account {
    id: string;
    name: string;
    iban: string;
    balance_amount: number;
    currency: string;
    account_type?: 'PAYMENT' | 'SAVINGS';
}

interface Transaction {
    id: string;
    booking_date: string;
    creditor_name?: string;
    debtor_name?: string;
    description: string;
    amount: number;
    currency: string;
    transaction_type: string;
}

export const BankAccountPage: React.FC = () => {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAccounts();
    }, []);

    useEffect(() => {
        if (accounts.length > 0) {
            loadTransactions(accounts[selectedAccountIndex].id);
        }
    }, [accounts, selectedAccountIndex]);

    const loadAccounts = async () => {
        try {
            setLoading(true);
            const data = await bankService.getAccounts();
            setAccounts(data);
        } catch (error) {
            console.error('Error loading accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTransactions = async (accountId: string) => {
        try {
            const data = await bankService.getTransactions(accountId);
            setTransactions(data);
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    };

    if (loading) {
        return <div className="p-6">Laden...</div>;
    }

    if (accounts.length === 0) {
        return (
            <div className="p-6">
                <Title>Bankrekeningen</Title>
                <Text>Er zijn nog geen bankrekeningen gekoppeld.</Text>
                <div className="mt-6">
                    <Button icon={PlusIcon} onClick={() => navigate('/settings')}>
                        Rekening toevoegen
                    </Button>
                </div>
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
                <Button variant="secondary" icon={ArrowsRightLeftIcon} onClick={() => navigate('/settings')}>
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
                                    <Title>Transacties</Title>
                                    <Table className="mt-4">
                                        <TableHead>
                                            <TableRow>
                                                <TableHeaderCell>Datum</TableHeaderCell>
                                                <TableHeaderCell>Tegenpartij</TableHeaderCell>
                                                <TableHeaderCell>Omschrijving</TableHeaderCell>
                                                <TableHeaderCell>Bedrag</TableHeaderCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {transactions.map((tx) => (
                                                <TableRow key={tx.id}>
                                                    <TableCell>
                                                        {new Date(tx.booking_date).toLocaleDateString('nl-NL')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Text className="font-medium text-gray-900">
                                                            {tx.creditor_name || tx.debtor_name || 'Onbekend'}
                                                        </Text>
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
                                                </TableRow>
                                            ))}
                                            {transactions.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={4}>Geen transacties gevonden.</TableCell>
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
        </div>
    );
};
