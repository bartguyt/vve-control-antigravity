import React, { useState } from 'react';
import { documentService } from './documentService';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button, TextInput, Textarea, Title } from '@tremor/react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onDocumentUploaded: () => void;
}

export const UploadDocumentModal: React.FC<Props> = ({ isOpen, onClose, onDocumentUploaded }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Selecteer een bestand');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await documentService.uploadDocument(file, title, description);
            onDocumentUploaded();
            resetAndClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const resetAndClose = () => {
        setTitle('');
        setDescription('');
        setFile(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" onClick={resetAndClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <Title>Document Uploaden</Title>
                            <button onClick={resetAndClose} className="text-gray-400 hover:text-gray-500">
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
                                    placeholder="Bijv: Jaarverslag 2023"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
                                <Textarea
                                    rows={3}
                                    value={description}
                                    onValueChange={setDescription}
                                    placeholder="Korte omschrijving van het document..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bestand</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-400 transition-colors">
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <div className="flex text-sm text-gray-600 justify-center">
                                            <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                                <span>Upload een bestand</span>
                                                <input
                                                    type="file"
                                                    className="sr-only"
                                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                                />
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {file ? file.name : 'PDF, Word, Excel, JPG, PNG tot 50MB'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {error && <p className="text-sm text-red-600">{error}</p>}

                            <div className="mt-5 sm:mt-6 flex space-x-3 justify-end">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={resetAndClose}
                                >
                                    Annuleren
                                </Button>
                                <Button
                                    type="submit"
                                    loading={loading}
                                    disabled={!file}
                                >
                                    Uploaden
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
