import React, { useState, useEffect } from 'react';
import { Title, Text, Card, Grid, Badge, TextInput } from '@tremor/react';
import { PencilIcon, TrashIcon, MapPinIcon, PhoneIcon, EnvelopeIcon, GlobeAltIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { supplierService, type Supplier } from './supplierService';
import { memberService } from '../members/memberService';
import { CreateSupplierModal } from './CreateSupplierModal';
import { PageHeader } from '../../components/ui/PageHeader';

export const SuppliersPage: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>(undefined);
    const [canEdit, setCanEdit] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const profile = await memberService.getCurrentProfile();
            if (!profile?.association_id) return;

            const fetchedSuppliers = await supplierService.getSuppliers(profile.association_id);
            setSuppliers(fetchedSuppliers);

            // Permission check: Tech Comm, Board, Manager, Admin
            const role = profile.association_memberships?.find(m => m.association_id === profile.association_id)?.role;
            const isSuperAdmin = profile.is_super_admin;
            const hasEditRights = isSuperAdmin || ['tech_comm', 'board', 'bestuur', 'manager', 'admin'].includes(role || '');
            setCanEdit(hasEditRights);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedSupplier(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Weet je zeker dat je deze leverancier wilt verwijderen?')) return;
        try {
            await supplierService.deleteSupplier(id);
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <PageHeader
                title="Leveranciers"
                description="Beheer uw netwerk van aannemers en leveranciers."
                onAdd={canEdit ? handleCreate : undefined}
                addLabel="Nieuwe Leverancier"
            />

            <CreateSupplierModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadData}
                supplierToEdit={selectedSupplier}
            />

            <div className="mb-6">
                <TextInput
                    icon={MagnifyingGlassIcon}
                    placeholder="Zoek op naam, categorie of email..."
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                />
            </div>

            {loading ? (
                <Text>Laden...</Text>
            ) : filteredSuppliers.length === 0 ? (
                <Text className="text-center py-8 italic">Geen leveranciers gevonden.</Text>
            ) : (
                <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6">
                    {filteredSuppliers.map((supplier) => (
                        <Card key={supplier.id} className="flex flex-col h-full">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <Title className="truncate">{supplier.name}</Title>
                                    <Badge size="xs" color="indigo" className="mt-1">
                                        {supplier.category || 'Geen categorie'}
                                    </Badge>
                                </div>
                                {canEdit && (
                                    <div className="flex space-x-1">
                                        <button onClick={() => handleEdit(supplier)} className="p-1 hover:bg-gray-100 rounded text-indigo-600">
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDelete(supplier.id)} className="p-1 hover:bg-gray-100 rounded text-red-600">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 space-y-2 flex-1">
                                {supplier.address && (
                                    <div className="flex items-start space-x-2 text-sm text-gray-600">
                                        <MapPinIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        <span>{supplier.address}</span>
                                    </div>
                                )}
                                {supplier.phone && (
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <PhoneIcon className="h-4 w-4 flex-shrink-0" />
                                        <span>{supplier.phone}</span>
                                    </div>
                                )}
                                {supplier.email && (
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
                                        <a href={`mailto:${supplier.email}`} className="hover:underline">{supplier.email}</a>
                                    </div>
                                )}
                                {supplier.website && (
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <GlobeAltIcon className="h-4 w-4 flex-shrink-0" />
                                        <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-600">
                                            Website
                                        </a>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </Grid>
            )}
        </div>
    );
};
