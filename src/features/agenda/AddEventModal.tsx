import React, { useState, useEffect } from 'react';
import { agendaService } from './agendaService';
import type { AgendaEvent, EventCategory } from './agendaService';
import { memberService } from '../members/memberService';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button, TextInput, Textarea, Title } from '@tremor/react';
import { TagInput } from '../../components/ui/TagInput';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onEventSaved: () => void;
    event?: AgendaEvent | null; // If provided, we are editing
}

// Helper to keep local datetime strings simple
const toLocalISO = (dateStr?: string) => {
    const date = dateStr ? new Date(dateStr) : new Date();
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
};

export const AddEventModal: React.FC<Props> = ({ isOpen, onClose, onEventSaved, event }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [categories, setCategories] = useState<EventCategory[]>([]);
    const [startTime, setStartTime] = useState(toLocalISO());
    const [endTime, setEndTime] = useState(toLocalISO(new Date(Date.now() + 3600000).toISOString()));
    const [location, setLocation] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmTags, setConfirmTags] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Reset or populate form when modal opens or event changes
    useEffect(() => {
        if (isOpen) {
            loadData();
            if (event) {
                // Editing mode
                setTitle(event.title);
                setDescription(event.description || '');
                setStartTime(toLocalISO(event.start_time));
                setEndTime(toLocalISO(event.end_time || undefined));
                setLocation(event.location || '');

                // For categories, we might need to fetch the junction data or rely on what's passed
                // For now assuming we parse them from a separate fetch or if the event object has them.
                // NOTE: The current getEvents returns `event_categories!category_id` which implies single category?
                // Actually the migration changed it to many-to-many but existing fetch might need adjustment.
                // Let's assume for now we might only have the old one or we need to fetch specific categories for this event.
                // See below for fetching categories for this event.
                fetchEventCategories(event.id);

            } else {
                // Create mode: reset
                resetForm();
            }
        }
    }, [isOpen, event]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setSelectedCategories([]);
        setStartTime(toLocalISO());
        setEndTime(toLocalISO(new Date(Date.now() + 3600000).toISOString()));
        setLocation('');
        setError(null);
    };

    const loadData = async () => {
        try {
            const [cats, profile] = await Promise.all([
                agendaService.getCategories(),
                memberService.getCurrentProfile()
            ]);
            setCategories(cats);
            if (profile?.preferences?.confirm_tags) {
                setConfirmTags(true);
            }
        } catch (err) {
            console.error('Failed to load data', err);
        }
    };

    const fetchEventCategories = async (eventId: string) => {
        // We need a way to get categories for this specific event.
        // Since getEvents might not return all of them if the query isn't perfect yet for M2M.
        // Let's do a quick client-side fetch or assuming the passed event object *could* have them if we fix getEvents.
        // For now, let's just fetch them directly from the junction table to be safe/accurate.
        // Actually, we can just use the supabase client here temporarily or add a method to agendaService.
        // Let's add the logic here for speed.
        try {
            const { agendaService } = await import('./agendaService'); // dynamic import or just use the imported one.
            // Oh wait, I can just use the imported agendaService if I add a method, 
            // OR I can lazily query here if I had the supabase client.
            // Let's just assume we start with empty and let user add, OR better:
            // The user wants to see existing tags.
            // I'll assume for now `event` *might* have them if I updated getEvents, but I haven't updated `getEvents` query fully for M2M array yet.
            // I will update the `getEvents` query in agendaService next.
            // For now, if event has `event_categories` (singular from old join) we use that, otherwise empty.
            if (event?.event_categories) {
                // @ts-ignore
                if (Array.isArray(event.event_categories)) {
                    // @ts-ignore
                    setSelectedCategories(event.event_categories.map(c => c.name));
                } else {
                    // Old single object
                    setSelectedCategories([event.event_categories.name]);
                }
            }

            // BETTER: Let's fetch the actual categories for this event
            const { supabase } = await import('../../lib/supabase');
            const { data } = await supabase
                .from('agenda_event_categories')
                .select('event_categories(name)')
                .eq('event_id', eventId);

            if (data) {
                // @ts-ignore
                const names = data.map(d => d.event_categories?.name).filter(Boolean);
                setSelectedCategories(names);
            }

        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload = {
                title,
                description,
                categoryNames: selectedCategories.length > 0 ? selectedCategories : ['Algemeen'],
                start_time: new Date(startTime).toISOString(),
                end_time: new Date(endTime).toISOString(),
                location,
                image_url: null
            };

            if (event) {
                await agendaService.updateEvent(event.id, payload);
            } else {
                await agendaService.createEvent(payload);
            }

            onEventSaved();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!event) return;

        setLoading(true);
        try {
            await agendaService.deleteEvent(event.id, event.title);
            onEventSaved();
            onClose();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isEditing = !!event;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-visible shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-6">
                            <Title>{isEditing ? 'Evenement Bewerken' : 'Evenement Toevoegen'}</Title>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                                <TextInput
                                    required
                                    value={title}
                                    onValueChange={setTitle}
                                    placeholder="Bijv: Algemene Ledenvergadering"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Begin</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Eind</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categorieën</label>
                                <TagInput
                                    value={selectedCategories}
                                    onChange={setSelectedCategories}
                                    suggestions={categories.map(c => c.name)}
                                    confirmNewTag={confirmTags}
                                    placeholder="Typ een categorie (bijv. Vergadering)..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Locatie</label>
                                <TextInput
                                    value={location}
                                    onValueChange={setLocation}
                                    placeholder="Online / Gemeenschappelijke Ruimte"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
                                <Textarea
                                    rows={3}
                                    value={description}
                                    onValueChange={setDescription}
                                    placeholder="Details over het evenement..."
                                />
                            </div>

                            {/* Audit Info */}
                            {isEditing && event && (
                                <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                                    <p>
                                        <span className="font-medium">Aangemaakt door:</span>{' '}
                                        {event.profiles?.email || 'Onbekend'} op {new Date(event.created_at).toLocaleString()}
                                    </p>
                                    {event.updated_at && (
                                        <p>
                                            <span className="font-medium">Laatst gewijzigd:</span>{' '}
                                            {new Date(event.updated_at).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            )}

                            {error && <p className="text-sm text-red-600">{error}</p>}

                            <div className="mt-5 sm:mt-6 flex items-center justify-between">
                                <div>
                                    {isEditing && (
                                        <>
                                            {!showDeleteConfirm ? (
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    color="red"
                                                    icon={TrashIcon}
                                                    onClick={() => setShowDeleteConfirm(true)}
                                                    loading={loading}
                                                >
                                                    Verwijderen
                                                </Button>
                                            ) : (
                                                <div className="flex items-center space-x-2 animate-fadeIn">
                                                    <span className="text-sm text-red-600 font-medium">Zeker weten?</span>
                                                    <Button
                                                        type="button"
                                                        size="xs"
                                                        color="red"
                                                        onClick={handleDelete}
                                                        loading={loading}
                                                    >
                                                        Ja, verwijder
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="xs"
                                                        variant="secondary"
                                                        onClick={() => setShowDeleteConfirm(false)}
                                                        disabled={loading}
                                                    >
                                                        Annuleer
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="flex space-x-3">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={onClose}
                                        disabled={loading}
                                    >
                                        Sluiten
                                    </Button>
                                    <Button
                                        type="submit"
                                        loading={loading}
                                        disabled={showDeleteConfirm} // Prevent save while deleting
                                    >
                                        {isEditing ? 'Opslaan' : 'Aanmaken'}
                                    </Button>

                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
