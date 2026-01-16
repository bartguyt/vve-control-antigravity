import React, { useState } from 'react';
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
    Button
} from '@tremor/react';
import {
    MagnifyingGlassIcon,
    Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useColumnConfig, type ColumnConfig } from '../../hooks/useColumnConfig';

interface DataTableProps<T> {
    data: T[];
    columns: ColumnConfig[];
    storageKey: string;
    searchPlaceholder?: string;
    onRowClick?: (item: T) => void;
    renderCell: (item: T, columnId: string) => React.ReactNode;
    canManage?: boolean;
    renderActions?: (item: T) => React.ReactNode;
    loading?: boolean;
    onSettingsClick?: () => void;
    bulkActions?: React.ReactNode;
    selectable?: boolean;
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
    isItemDeletable?: (item: T) => boolean;
}

export function DataTable<T extends { id: string }>({
    data,
    columns: defaultColumns,
    storageKey,
    searchPlaceholder = "Search...",
    onRowClick,
    renderCell,
    renderActions,
    loading,
    onSettingsClick,
    bulkActions,
    selectable,
    selectedIds,
    onSelectionChange,
    isItemDeletable
}: DataTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState('');
    const { columns } = useColumnConfig(storageKey, defaultColumns);
    const visibleColumns = columns.filter(c => c.visible).sort((a, b) => a.order - b.order);

    const filteredData = data.filter(item => {
        // Basic search across all string properties
        const searchStr = searchTerm.toLowerCase();
        return Object.values(item).some(val =>
            typeof val === 'string' && val.toLowerCase().includes(searchStr)
        );
    });

    const toggleAll = () => {
        if (!onSelectionChange || !selectedIds) return;
        const deletableItems = isItemDeletable ? filteredData.filter(isItemDeletable) : filteredData;

        if (selectedIds.size === deletableItems.length && selectedIds.size > 0) {
            onSelectionChange(new Set());
        } else {
            onSelectionChange(new Set(deletableItems.map(i => i.id)));
        }
    };

    const toggleOne = (id: string) => {
        if (!onSelectionChange || !selectedIds) return;
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        onSelectionChange(newSet);
    };

    return (
        <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                <div className="relative w-full sm:max-w-xs">
                    <TextInput
                        icon={MagnifyingGlassIcon}
                        placeholder={searchPlaceholder}
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                    />
                </div>
                <div className="flex items-center gap-2">
                    {bulkActions}
                    {onSettingsClick && (
                        <Button
                            icon={Cog6ToothIcon}
                            variant="secondary"
                            onClick={onSettingsClick}
                            size="sm"
                        >
                            Columns
                        </Button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center">
                    <Text className="animate-pulse">Loading data...</Text>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHead>
                            <TableRow className="bg-gray-50/50">
                                {selectable && (
                                    <TableHeaderCell className="w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            checked={
                                                filteredData.length > 0 &&
                                                selectedIds?.size === (isItemDeletable ? filteredData.filter(isItemDeletable).length : filteredData.length)
                                            }
                                            onChange={toggleAll}
                                        />
                                    </TableHeaderCell>
                                )}
                                {visibleColumns.map(col => (
                                    <TableHeaderCell key={col.id}>{col.label}</TableHeaderCell>
                                ))}
                                {renderActions && <TableHeaderCell className="text-right">Actions</TableHeaderCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={visibleColumns.length + (selectable ? 1 : 0) + (renderActions ? 1 : 0)} className="text-center py-12">
                                        <Text color="slate">No items found.</Text>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        onClick={() => onRowClick?.(item)}
                                        className={onRowClick ? "hover:bg-gray-50/50 cursor-pointer transition-colors" : ""}
                                    >
                                        {selectable && (
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    checked={selectedIds?.has(item.id)}
                                                    onChange={() => toggleOne(item.id)}
                                                    disabled={isItemDeletable && !isItemDeletable(item)}
                                                />
                                            </TableCell>
                                        )}
                                        {visibleColumns.map(col => (
                                            <TableCell key={col.id}>
                                                {renderCell(item, col.id)}
                                            </TableCell>
                                        ))}
                                        {renderActions && (
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                {renderActions(item)}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </Card>
    );
}
