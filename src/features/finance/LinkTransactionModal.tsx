import React, { useState, useEffect } from 'react';
import { Button, TextInput, List, ListItem, Badge, TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import { MagnifyingGlassIcon, UserIcon, DocumentTextIcon, ClipboardDocumentListIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { memberService } from '../members/memberService';
import { assignmentService } from '../assignments/assignmentService';
import { documentService } from '../documents/documentService';
import { supplierService } from '../suppliers/supplierService';
import { bankService } from './bankService';
import type { Profile, Assignment, Document, Supplier } from '../../types/database';
import { BaseModal } from '../../components/ui/BaseModal';
import { toast } from 'sonner';

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
    const [loading, setLoading] = useState(false);

    // ... (rendering)


    const [linking, setLinking] = useState(false);

    // Data States
    const [members, setMembers] = useState<Profile[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    // Filtered States
    const [filteredMembers, setFilteredMembers] = useState<Profile[]>([]);
    const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
    const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
    const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);

    const [linkAll, setLinkAll] = useState(true); // Only for Members link-by-IBAN logic for now

    useEffect(() => {
        if (isOpen) {
            loadAllData();
            setSearchTerm('');
            setLinkAll(!!counterpartyIban);
        }
    }, [isOpen]);

    const loadAllData = async () => {
        try {
            setLoading(true);
            const [mem, ass, doc, sup] = await Promise.all([
                memberService.getMembers(),
                assignmentService.getAssignments(vveId),
                documentService.getDocuments(),
                supplierService.getSuppliers(vveId)
            ]);
            setMembers(mem);
            const validAssignments = ass.map(a => ({
                ...a,
                description: a.description || '',
                amount: a.amount === null ? undefined : a.amount
            }));
            setAssignments(validAssignments);
            setDocuments(doc);
            setSuppliers(sup);

            // Init filtered
            setFilteredMembers(mem.slice(0, 5));
            setFilteredAssignments(validAssignments.slice(0, 5));
            setFilteredDocuments(doc.slice(0, 5));
            setFilteredSuppliers(sup.slice(0, 5));

        } catch (e) {
            console.error(e);
            toast.error('Kan gegevens niet laden');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const lower = searchTerm.toLowerCase();

        // 1. Members
        setFilteredMembers(members.filter(m =>
            m.first_name.toLowerCase().includes(lower) ||
            m.last_name.toLowerCase().includes(lower) ||
            (m.street && m.street.toLowerCase().includes(lower))
        ).slice(0, 10));

        // 2. Assignments
        setFilteredAssignments(assignments.filter(a =>
            a.title.toLowerCase().includes(lower) ||
            (a.description && a.description.toLowerCase().includes(lower))
        ).slice(0, 10));

        // 3. Documents
        setFilteredDocuments(documents.filter(d =>
            d.title.toLowerCase().includes(lower)
        ).slice(0, 10));

        // 4. Suppliers
        setFilteredSuppliers(suppliers.filter(s =>
            s.name.toLowerCase().includes(lower) ||
            s.category.toLowerCase().includes(lower)
        ).slice(0, 10));

    }, [searchTerm, members, assignments, documents, suppliers]);


    const handleLinkMember = async (memberId: string) => {
        try {
            setLinking(true);
            if (linkAll && counterpartyIban) {
                await bankService.linkTransactionsByIban(counterpartyIban, vveId, memberId);
                toast.success('Alle transacties gekoppeld aan lid');
            } else {
                await bankService.linkTransaction(transactionId, memberId);
                toast.success('Transactie gekoppeld aan lid');
            }
            onSuccess();
            onClose();
        } catch (e) {
            console.error(e);
            toast.error('Fout bij koppelen');
        } finally {
            setLinking(false);
        }
    };

    const handleLinkEntity = async (type: 'assignment' | 'document' | 'supplier', id: string, entity?: any) => {
        try {
            setLinking(true);

            let financialCategoryId = null;

            // Logic to inherit category
            if (type === 'supplier' && entity?.default_financial_category_id) {
                financialCategoryId = entity.default_financial_category_id;
            }
            // Add other auto-category logic here if assignments/docs have categories

            await bankService.updateTransactionCategory(
                transactionId,
                null,
                null,
                financialCategoryId,
                type === 'assignment' ? id : null,
                type === 'document' ? id : null,
                type === 'supplier' ? id : null
            );

            toast.success(`Gekoppeld aan ${type === 'assignment' ? 'Opdracht' : type === 'document' ? 'Document' : 'Leverancier'}`);
            onSuccess();
            onClose();
        } catch (e) {
            console.error(e);
            toast.error('Fout bij koppelen');
        } finally {
            setLinking(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Koppel Transactie"
            // width="max-w-2xl"
            footer={<Button variant="light" onClick={onClose} disabled={loading}>Sluiten</Button>}
        >
            <div className="bg-gray-50 p-3 rounded-md mb-4 text-sm border border-gray-100 flex justify-between items-center">
                <span className="font-medium">{transactionDescription}</span>
                <Badge color={transactionAmount > 0 ? "emerald" : "red"}>
                    € {transactionAmount.toFixed(2)}
                </Badge>
            </div>

            <div className="mb-4">
                <TextInput
                    icon={MagnifyingGlassIcon}
                    placeholder="Zoek..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <TabGroup>
                <TabList className="mb-4">
                    <Tab icon={UserIcon}>Leden</Tab>
                    <Tab icon={ClipboardDocumentListIcon}>Opdrachten</Tab>
                    <Tab icon={DocumentTextIcon}>Facturen</Tab>
                    <Tab icon={BuildingStorefrontIcon}>Leveranciers</Tab>
                </TabList>
                <TabPanels>
                    {/* MEMBERS TAB */}
                    <TabPanel>
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
                        <List className="max-h-60 overflow-y-auto">
                            {filteredMembers.map(m => (
                                <ListItem key={m.id} className="cursor-pointer hover:bg-gray-50 p-2 rounded">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-indigo-50 p-1.5 rounded-full">
                                            <UserIcon className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">{m.first_name} {m.last_name}</div>
                                            <div className="text-xs text-gray-500">{m.street} {m.house_number}</div>
                                        </div>
                                    </div>
                                    <Button size="xs" variant="secondary" loading={linking} onClick={() => handleLinkMember(m.id)}>
                                        Koppelen
                                    </Button>
                                </ListItem>
                            ))}
                        </List>
                    </TabPanel>

                    {/* ASSIGNMENTS TAB */}
                    <TabPanel>
                        <List className="max-h-60 overflow-y-auto">
                            {filteredAssignments.map(a => (
                                <ListItem key={a.id} className="cursor-pointer hover:bg-gray-50 p-2 rounded">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-orange-50 p-1.5 rounded-full">
                                            <ClipboardDocumentListIcon className="h-4 w-4 text-orange-600" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">{a.title}</div>
                                            <div className="text-xs text-gray-500">{a.description || 'Geen beschrijving'}</div>
                                        </div>
                                    </div>
                                    <Button size="xs" variant="secondary" loading={linking} onClick={() => handleLinkEntity('assignment', a.id, a)}>
                                        Koppelen
                                    </Button>
                                </ListItem>
                            ))}
                        </List>
                    </TabPanel>

                    {/* DOCUMENTS TAB */}
                    <TabPanel>
                        <List className="max-h-60 overflow-y-auto">
                            {filteredDocuments.map(d => (
                                <ListItem key={d.id} className="cursor-pointer hover:bg-gray-50 p-2 rounded">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-50 p-1.5 rounded-full">
                                            <DocumentTextIcon className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">{d.title}</div>
                                            <div className="text-xs text-blue-500 underline truncate max-w-[200px]">{d.file_url}</div>
                                        </div>
                                    </div>
                                    <Button size="xs" variant="secondary" loading={linking} onClick={() => handleLinkEntity('document', d.id, d)}>
                                        Koppelen
                                    </Button>
                                </ListItem>
                            ))}
                        </List>
                    </TabPanel>

                    {/* SUPPLIERS TAB */}
                    <TabPanel>
                        <List className="max-h-60 overflow-y-auto">
                            {filteredSuppliers.map(s => (
                                <ListItem key={s.id} className="cursor-pointer hover:bg-gray-50 p-2 rounded">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-emerald-50 p-1.5 rounded-full">
                                            <BuildingStorefrontIcon className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium">{s.name}</div>
                                            <div className="text-xs text-gray-500">{s.category}</div>
                                        </div>
                                    </div>
                                    <Button size="xs" variant="secondary" loading={linking} onClick={() => handleLinkEntity('supplier', s.id, s)}>
                                        Koppelen
                                    </Button>
                                </ListItem>
                            ))}
                        </List>
                    </TabPanel>
                </TabPanels>
            </TabGroup>
        </BaseModal>
    );
};
