import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Button, TextInput, Textarea, Title } from '@tremor/react';
import { memberService } from '../members/memberService';
import { supplierService, type Supplier } from './supplierService';

interface CreateSupplierModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    supplierToEdit?: Supplier;
}

export const CreateSupplierModal: React.FC<CreateSupplierModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    supplierToEdit
}) => {
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (supplierToEdit) {
            setFormData({
                name: supplierToEdit.name,
                category: supplierToEdit.category || '',
                email: supplierToEdit.email || '',
                phone: supplierToEdit.phone || '',
                website: supplierToEdit.website || '',
                address: supplierToEdit.address || '',
                notes: supplierToEdit.notes || ''
            });
        } else {
            setFormData({
                name: '',
                category: '',
                email: '',
                phone: '',
                website: '',
                address: '',
                notes: ''
            });
        }
    }, [supplierToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const profile = await memberService.getCurrentProfile();
            if (!profile?.vve_id) throw new Error('No VvE found');

            if (supplierToEdit) {
                await supplierService.updateSupplier(supplierToEdit.id, formData);
            } else {
                await supplierService.createSupplier({
                    ...formData,
                    vve_id: profile.vve_id
                });
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving supplier:', error);
            alert('Er ging iets mis bij het opslaan van de leverancier.');
        } finally {
            setLoading(false);
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
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
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
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                                    {supplierToEdit ? 'Leverancier Bewerken' : 'Nieuwe Leverancier'}
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
                                        <TextInput
                                            value={formData.name}
                                            onValueChange={(val) => setFormData({ ...formData, name: val })}
                                            required
                                            placeholder="Bijv. Mulder Schilderwerken"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
                                        <TextInput
                                            value={formData.category}
                                            onValueChange={(val) => setFormData({ ...formData, category: val })}
                                            placeholder="Bijv. Schilder, Loodgieter"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <TextInput
                                                value={formData.email}
                                                onValueChange={(val) => setFormData({ ...formData, email: val })}
                                                type="email"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
                                            <TextInput
                                                value={formData.phone}
                                                onValueChange={(val) => setFormData({ ...formData, phone: val })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                                        <TextInput
                                            value={formData.address}
                                            onValueChange={(val) => setFormData({ ...formData, address: val })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                                        <TextInput
                                            value={formData.website}
                                            onValueChange={(val) => setFormData({ ...formData, website: val })}
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
                                        <Textarea
                                            value={formData.notes}
                                            onValueChange={(val) => setFormData({ ...formData, notes: val })}
                                        />
                                    </div>

                                    <div className="mt-6 flex justify-end space-x-3">
                                        <Button variant="secondary" onClick={onClose} type="button">
                                            Annuleren
                                        </Button>
                                        <Button type="submit" loading={loading} color="indigo">
                                            {supplierToEdit ? 'Opslaan' : 'Toevoegen'}
                                        </Button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};
