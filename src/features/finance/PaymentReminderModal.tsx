import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Button, TextInput, Textarea, Text } from '@tremor/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { associationService } from '../../lib/association';

interface PaymentReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberId: string;
    memberName: string;
    memberEmail: string;
    arrearsAmount: number;
    lastPaymentDate?: string;
}

export const PaymentReminderModal: React.FC<PaymentReminderModalProps> = ({
    isOpen,
    onClose,
    memberName,
    memberEmail,
    arrearsAmount,
    lastPaymentDate
}) => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSubject(`Betalingsherinnering: Openstaande bijdrage`);
            const disputeLink = `${window.location.origin}/finance/dispute?amount=${arrearsAmount.toFixed(2)}`;
            const generatedBody = `Beste ${memberName},

Hierbij sturen wij u een herinnering voor de openstaande VvE bijdrage.

Openstaand bedrag: €${arrearsAmount.toFixed(2)}
${lastPaymentDate ? `Laatste betaling ontvangen op: ${new Date(lastPaymentDate).toLocaleDateString('nl-NL')}` : 'Er zijn nog geen betalingen ontvangen dit jaar.'}

Wij verzoeken u vriendelijk doch dringend dit bedrag binnen 14 dagen over te maken.

Indien u het niet eens bent met deze berekening, kunt u eenvoudig een betalingsgeschil melden via deze link:
${disputeLink}

Met vriendelijke groet,
Het Bestuur`;
            setBody(generatedBody);
        }
    }, [isOpen, memberName, arrearsAmount, lastPaymentDate]);

    const handleSend = async () => {
        setSending(true);
        try {
            const associationId = await associationService.getCurrentAssociationId();
            if (!associationId) throw new Error("No active association");

            const { error } = await supabase
                .from('outbound_emails')
                .insert({
                    association_id: associationId,
                    recipient_email: memberEmail,
                    subject,
                    body,
                    status: 'pending' // System will pick it up
                });

            if (error) throw error;

            toast.success('Herinnering verzonden (in wachtrij)');
            onClose();
        } catch (e) {
            console.error(e);
            toast.error('Fout bij verzenden');
        } finally {
            setSending(false);
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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-4">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                        Betalingsherinnering versturen
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <Text>Aan:</Text>
                                        <TextInput value={memberEmail} disabled className="mt-1" />
                                    </div>
                                    <div>
                                        <Text>Onderwerp:</Text>
                                        <TextInput
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Text>Bericht:</Text>
                                        <Textarea
                                            value={body}
                                            onChange={(e) => setBody(e.target.value)}
                                            rows={12}
                                            className="mt-1 font-mono text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <Button variant="secondary" onClick={onClose}>
                                        Annuleren
                                    </Button>
                                    <Button onClick={handleSend} loading={sending}>
                                        Verstuur Herinnering
                                    </Button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};
