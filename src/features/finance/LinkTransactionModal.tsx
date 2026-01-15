import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Button, TextInput, Title, Text, List, ListItem, Badge } from '@tremor/react';
import { XMarkIcon, MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline';
import { memberService } from '../members/memberService';
import { bankService } from './bankService';
import type { Profile } from '../../types/database';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    transactionId: string;
    transactionDescription: string;
    transactionAmount: number;
    counterpartyIban?: string; // Optional
    vveId: string;
}

export const LinkTransactionModal: React.FC<Props> = ({
    isOpen,
    onClose,
    onSuccess,
    transactionId,
    transactionDescription,
    transactionAmount,
    counterpartyIban,
    vveId
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [members, setMembers] = useState<Profile[]>([]);
    const [filteredMembers, setFilteredMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [linking, setLinking] = useState(false);
    const [linkAll, setLinkAll] = useState(true); // Default to true if IBAN exists

    useEffect(() => {
        if (isOpen) {
            loadMembers();
            setSearchTerm('');
            setLinkAll(!!counterpartyIban); // Reset checkbox based on IBAN presence
        }
    }, [isOpen]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredMembers(members.slice(0, 5)); // Show first 5 initially
        } else {
            const lower = searchTerm.toLowerCase();
            const filtered = members.filter(m =>
                m.first_name.toLowerCase().includes(lower) ||
                m.last_name.toLowerCase().includes(lower) ||
                (m.straat && m.straat.toLowerCase().includes(lower)) ||
                (m.huisnummer && m.huisnummer.includes(lower))
            );
            setFilteredMembers(filtered.slice(0, 10));
        }
    }, [searchTerm, members]);

    const loadMembers = async () => {
        try {
            setLoading(true);
            const data = await memberService.getMembers();
            setMembers(data);
            setFilteredMembers(data.slice(0, 5));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLink = async (memberId: string) => {
        try {
            setLinking(true);

            if (linkAll && counterpartyIban) {
                await bankService.linkTransactionsByIban(counterpartyIban, vveId, memberId);
            } else {
                await bankService.linkTransaction(transactionId, memberId);
            }

            onSuccess();
            onClose();
        } catch (e) {
            console.error(e);
            alert('Fout bij koppelen');
        } finally {
            setLinking(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-visible rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-4">
                                    <Title>Koppel Transactie</Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-md mb-4 text-sm border border-gray-100">
                                    <div className="flex justify-between font-medium">
                                        <span>{transactionDescription}</span>
                                        <Badge color={transactionAmount > 0 ? "emerald" : "red"}>
                                            € {transactionAmount.toFixed(2)}
                                        </Badge>
                                    </div>
                                </div>



                                {counterpartyIban && (
                                    <div className="mb-4 flex items-start space-x-2 p-3 bg-blue-50 text-blue-900 rounded-md text-sm">
                                        <input
                                            type="checkbox"
                                            id="linkAll"
                                            checked={linkAll}
                                            onChange={(e) => setLinkAll(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <label htmlFor="linkAll" className="cursor-pointer select-none">
                                            <span className="font-semibold block">Koppel alle transacties van dit IBAN</span>
                                            <span className="text-xs opacity-75">
                                                Toekomstige en eerdere transacties van <strong>{counterpartyIban}</strong> worden ook aan dit lid gekoppeld.
                                            </span>
                                        </label>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <TextInput
                                        icon={MagnifyingGlassIcon}
                                        placeholder="Zoek op naam of adres..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="max-h-60 overflow-y-auto border rounded-md border-gray-100">
                                    {loading ? (
                                        <div className="p-4 text-center text-sm text-gray-500">Leden laden...</div>
                                    ) : (
                                        <List>
                                            {filteredMembers.map(member => (
                                                <ListItem key={member.id} className="flex justify-between items-center p-2 hover:bg-gray-50 cursor-pointer">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="bg-indigo-50 p-1.5 rounded-full">
                                                            <UserIcon className="h-4 w-4 text-indigo-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {member.first_name} {member.last_name}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {member.straat} {member.huisnummer}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="xs"
                                                        variant="secondary"
                                                        loading={linking}
                                                        onClick={() => handleLink(member.id)}
                                                    >
                                                        Koppelen
                                                    </Button>
                                                </ListItem>
                                            ))}
                                            {filteredMembers.length === 0 && (
                                                <div className="p-4 text-center text-sm text-gray-500">
                                                    Geen leden gevonden.
                                                </div>
                                            )}
                                        </List>
                                    )}
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <Button variant="light" onClick={onClose}>Sluiten</Button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition >
    );
};
