import React, { useEffect, useState } from 'react';
import { documentService, type Document } from './documentService';
import { UploadDocumentModal } from './UploadDocumentModal';
import { memberService } from '../members/memberService';
import {
    Card,
    Table,
    TableHead,
    TableRow,
    TableHeaderCell,
    TableBody,
    TableCell,
    Text,
    TextInput,
    Icon,
    Flex
} from '@tremor/react';
import {
    MagnifyingGlassIcon,
    DocumentIcon,
    TrashIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '../../components/ui/PageHeader';

export const DocumentListPage: React.FC = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [docsData, profile] = await Promise.all([
                documentService.getDocuments(),
                memberService.getCurrentProfile()
            ]);
            setDocuments(docsData);


            // Get role from vve_memberships
            const currentVveMembership = profile?.vve_memberships?.find(m => m.vve_id === profile.vve_id);
            const effectiveRole = profile?.is_super_admin ? 'admin' : (currentVveMembership?.role || null);
            setUserRole(effectiveRole);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, url: string, title: string) => {
        if (!window.confirm(`Weet je zeker dat je "${title}" wilt verwijderen?`)) return;
        try {
            await documentService.deleteDocument(id, url, title);
            loadData();
        } catch (error) {
            alert('Fout bij verwijderen: ' + error);
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatSize = (bytes: number | null) => {
        if (!bytes) return '-';
        const kb = bytes / 1024;
        if (kb < 1024) return kb.toFixed(1) + ' KB';
        return (kb / 1024).toFixed(1) + ' MB';
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('nl-NL', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const canUpload = userRole === 'admin' || userRole === 'bestuur' || userRole === 'manager' || userRole === 'board';

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="Documenten"
                description="Beheer en deel documenten veilig binnen de VvE."
                onAdd={canUpload ? () => setIsUploadModalOpen(true) : undefined}
                addLabel="Nieuw Document"
            />

            <Card>
                <div className="mb-4">
                    <TextInput
                        icon={MagnifyingGlassIcon}
                        placeholder="Zoeken..."
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                    />
                </div>

                {loading ? (
                    <Text className="text-center py-8">Laden...</Text>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeaderCell>Bestand</TableHeaderCell>
                                <TableHeaderCell>Omschrijving</TableHeaderCell>
                                <TableHeaderCell>Grootte</TableHeaderCell>
                                <TableHeaderCell>Datum</TableHeaderCell>
                                <TableHeaderCell>Acties</TableHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredDocuments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">
                                        <Text>Geen documenten gevonden</Text>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredDocuments.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell>
                                            <Flex justifyContent="start" className="space-x-3">
                                                <Icon icon={DocumentIcon} size="sm" variant="simple" color="indigo" />
                                                <Text className="font-medium text-gray-900">{doc.title}</Text>
                                            </Flex>
                                        </TableCell>
                                        <TableCell>
                                            <Text className="truncate max-w-xs">{doc.description || '-'}</Text>
                                        </TableCell>
                                        <TableCell>
                                            <Text>{formatSize(doc.file_size)}</Text>
                                        </TableCell>
                                        <TableCell>
                                            <Text>{formatDate(doc.created_at)}</Text>
                                        </TableCell>
                                        <TableCell>
                                            <Flex justifyContent="start" className="space-x-2">
                                                <a
                                                    href={doc.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                                                >
                                                    <Icon icon={ArrowDownTrayIcon} size="md" variant="simple" color="gray" tooltip="Downloaden" />
                                                </a>
                                                {userRole === 'admin' && (
                                                    <button
                                                        onClick={() => handleDelete(doc.id, doc.file_url, doc.title)}
                                                        className="p-1 hover:bg-red-50 rounded-md transition-colors"
                                                    >
                                                        <Icon icon={TrashIcon} size="md" variant="simple" color="red" tooltip="Verwijderen" />
                                                    </button>
                                                )}
                                            </Flex>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </Card>

            <UploadDocumentModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onDocumentUploaded={loadData}
            />
        </div>
    );
};
