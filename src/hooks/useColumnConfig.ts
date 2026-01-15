import { useState, useEffect } from 'react';

export interface ColumnConfig {
    id: string;
    label: string;
    visible: boolean;
    order: number;
}

export const useColumnConfig = (storageKey: string, defaultColumns: ColumnConfig[]) => {
    const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);

    // Initial Load
    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge with default to handle new columns in future updates
                // For now, simpler: just use parsed if valid length, else default
                if (Array.isArray(parsed) && parsed.length === defaultColumns.length) {
                    setColumns(parsed);
                }
            } catch (e) {
                console.error('Failed to parse column config', e);
            }
        }
    }, [storageKey]);

    const save = (newCols: ColumnConfig[]) => {
        setColumns(newCols);
        localStorage.setItem(storageKey, JSON.stringify(newCols));
    };

    const toggleColumn = (id: string) => {
        const newCols = columns.map(c =>
            c.id === id ? { ...c, visible: !c.visible } : c
        );
        save(newCols);
    };

    const reorderColumns = (newOrder: ColumnConfig[]) => {
        // Ensure order index is correct
        const ordered = newOrder.map((c, i) => ({ ...c, order: i }));
        save(ordered);
    };

    return {
        columns,
        setColumns: save,
        toggleColumn,
        reorderColumns
    };
};
