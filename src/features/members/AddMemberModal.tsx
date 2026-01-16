import React, { useState } from 'react';
import { memberService } from './memberService';
import { Button, TextInput } from '@tremor/react';
import { BaseModal } from '../../components/ui/BaseModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onMemberAdded: () => void;
}

export const AddMemberModal: React.FC<Props> = ({ isOpen, onClose, onMemberAdded }) => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        member_number: '',
        building_number: '',
        street: '',
        house_number: '',
        zip_code: '',
        city: '',
        email: '',
        phone_number: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await memberService.createMemberProfile({
                ...formData,
                role: 'member' as const
            });
            onMemberAdded();
            resetAndClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const resetAndClose = () => {
        setFormData({
            first_name: '',
            last_name: '',
            member_number: '',
            building_number: '',
            street: '',
            house_number: '',
            zip_code: '',
            city: '',
            email: '',
            phone_number: '',
        });
        setError(null);
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={resetAndClose}
            title="Add New Member"
            footer={
                <>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={resetAndClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="add-member-form"
                        loading={loading}
                    >
                        Save
                    </Button>
                </>
            }
        >
            <form id="add-member-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <TextInput
                            required
                            value={formData.first_name}
                            onValueChange={(v) => setFormData({ ...formData, first_name: v })}
                            placeholder="John"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <TextInput
                            required
                            value={formData.last_name}
                            onValueChange={(v) => setFormData({ ...formData, last_name: v })}
                            placeholder="Doe"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Member Number</label>
                        <TextInput
                            required
                            value={formData.member_number}
                            onValueChange={(v) => setFormData({ ...formData, member_number: v })}
                            placeholder="001"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Building Number</label>
                        <TextInput
                            value={formData.building_number}
                            onValueChange={(v) => setFormData({ ...formData, building_number: v })}
                            placeholder="B-12"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                        <TextInput
                            required
                            value={formData.street}
                            onValueChange={(v) => setFormData({ ...formData, street: v })}
                            placeholder="Main Street"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">House Number</label>
                        <TextInput
                            required
                            value={formData.house_number}
                            onValueChange={(v) => setFormData({ ...formData, house_number: v })}
                            placeholder="1"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                        <TextInput
                            value={formData.zip_code}
                            onValueChange={(v) => setFormData({ ...formData, zip_code: v })}
                            placeholder="1234 AB"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <TextInput
                            value={formData.city}
                            onValueChange={(v) => setFormData({ ...formData, city: v })}
                            placeholder="Amsterdam"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <TextInput
                            type="email"
                            value={formData.email}
                            onValueChange={(v) => setFormData({ ...formData, email: v })}
                            placeholder="Optional"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <TextInput
                            value={formData.phone_number}
                            onValueChange={(v) => setFormData({ ...formData, phone_number: v })}
                            placeholder="Optional"
                        />
                    </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
        </BaseModal>
    );
};
