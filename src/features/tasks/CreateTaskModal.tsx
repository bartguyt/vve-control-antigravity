import React, { useState, Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Button, TextInput, Textarea, Select, SelectItem, Title } from '@tremor/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { taskService, type MaintenanceTask, type TaskPriority, type TaskStatus } from './taskService';
import { memberService } from '../members/memberService';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    taskToEdit?: MaintenanceTask;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onSuccess, taskToEdit }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [status, setStatus] = useState<TaskStatus>('open');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (taskToEdit) {
            setTitle(taskToEdit.title);
            setDescription(taskToEdit.description || '');
            setPriority(taskToEdit.priority);
            setStatus(taskToEdit.status);
        } else {
            setTitle('');
            setDescription('');
            setPriority('medium');
            setStatus('open');
        }
    }, [taskToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const profile = await memberService.getCurrentProfile();
            if (!profile?.association_id) return;

            const taskData = {
                association_id: profile.association_id,
                title,
                description,
                priority,
                status
            };

            if (taskToEdit) {
                await taskService.updateTask(taskToEdit.id, taskData);
            } else {
                await taskService.createTask(taskData);
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to save task:', error);
            // Handle error (toast/alert)
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
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-4">
                                    <Title className="dark:text-gray-100">{taskToEdit ? 'Taak Bewerken' : 'Nieuwe Taak'}</Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titel</label>
                                        <TextInput
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Bijv. Lekkage dakgoot"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Omschrijving</label>
                                        <Textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Beschrijf het probleem of de taak..."
                                            rows={3}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioriteit</label>
                                            <Select value={priority} onValueChange={(val) => setPriority(val as TaskPriority)}>
                                                <SelectItem value="low">Laag</SelectItem>
                                                <SelectItem value="medium">Normaal</SelectItem>
                                                <SelectItem value="high">Hoog</SelectItem>
                                                <SelectItem value="urgent">Urgent</SelectItem>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                                            <Select value={status} onValueChange={(val) => setStatus(val as TaskStatus)}>
                                                <SelectItem value="open">Open</SelectItem>
                                                <SelectItem value="scheduled">Gepland</SelectItem>
                                                <SelectItem value="completed">Afgerond</SelectItem>
                                                <SelectItem value="cancelled">Geannuleerd</SelectItem>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end space-x-3">
                                        <Button variant="secondary" onClick={onClose} type="button">
                                            Annuleren
                                        </Button>
                                        <Button type="submit" loading={loading} color="indigo">
                                            {taskToEdit ? 'Opslaan' : 'Aanmaken'}
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
