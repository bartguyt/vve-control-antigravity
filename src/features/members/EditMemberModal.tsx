import React, { useState, useEffect } from 'react';
import { memberService } from './memberService';
import type { Profile } from '../../types/database';
import { Button, TextInput, Select, SelectItem, Switch } from '@tremor/react';
import { BaseModal } from '../../components/ui/BaseModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onMemberUpdated: () => void;
    member: Profile;
}

export const EditMemberModal: React.FC<Props> = ({ isOpen, onClose, onMemberUpdated, member }) => {
    const [formData, setFormData] = useState({
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        member_number: member.member_number || '',
        building_number: member.building_number || '',
        street: member.street || '',
        house_number: member.house_number || '',
        zip_code: member.zip_code || '',
        city: member.city || '',
        email: member.email || '',
        phone_number: member.phone_number || '',
    });

    const [role, setRole] = useState(member.vve_memberships?.[0]?.role || 'member');
    const [isActive, setIsActive] = useState(member.vve_memberships?.[0]?.is_active ?? true);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setFormData({
            first_name: member.first_name || '',
            last_name: member.last_name || '',
            member_number: member.member_number || '',
            building_number: member.building_number || '',
            street: member.street || '',
            house_number: member.house_number || '',
            zip_code: member.zip_code || '',
            city: member.city || '',
            email: member.email || '',
            phone_number: member.phone_number || '',
        });
    }, [member]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await memberService.updateMember(member.id, formData);
            const membership = member.vve_memberships?.[0];
            if (membership) {
                await memberService.updateMembership(membership.id, {
                    role,
                    is_active: isActive
                });
            }
            onMemberUpdated();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this member? This action cannot be undone.")) {
            try {
                setLoading(true);
                await memberService.deleteMember(member.id);
                onMemberUpdated();
                onClose();
                window.location.href = '/members';
            } catch (e: any) {
                console.error(e);
                setError(e.message);
                setLoading(false);
            }
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Member"
            footer={
                <div className="flex w-full justify-between items-center">
                    <Button
                        type="button"
                        variant="light"
                        color="red"
                        onClick={handleDelete}
                        loading={loading}
                    >
                        Delete
                    </Button>
                    <div className="flex space-x-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="edit-member-form"
                            loading={loading}
                        >
                            Save
                        </Button>
                    </div>
                </div>
            }
        >
            <form id="edit-member-form" onSubmit={handleSubmit} className="space-y-4">
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

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <TextInput
                            value={formData.first_name}
                            onValueChange={(v) => setFormData({ ...formData, first_name: v })}
                            placeholder="Jan"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <TextInput
                            value={formData.last_name}
                            onValueChange={(v) => setFormData({ ...formData, last_name: v })}
                            placeholder="Jansen"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <Select
                            value={role}
                            onValueChange={(val) => setRole(val as any)}
                            enableClear={false}
                        >
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="board">Board</SelectItem>
                            <SelectItem value="audit_comm">Audit Committee</SelectItem>
                            <SelectItem value="tech_comm">Technical Committee</SelectItem>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <div className="flex items-center gap-2 mt-2">
                            <Switch checked={isActive} onChange={setIsActive} />
                            <span className="text-sm text-gray-600">{isActive ? 'Active' : 'Inactive'}</span>
                        </div>
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
