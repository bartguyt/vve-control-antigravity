import React from 'react';
import { Select, SelectItem } from '@tremor/react';
import { CalendarIcon } from '@heroicons/react/24/outline';

interface Year {
    id: string;
    year: number;
}

interface YearSelectorProps {
    years: Year[];
    selectedYearId: string;
    onYearChange: (id: string) => void;
    placeholder?: string;
    className?: string;
}

export const YearSelector: React.FC<YearSelectorProps> = ({
    years,
    selectedYearId,
    onYearChange,
    placeholder = "Select year...",
    className = "max-w-xs"
}) => {
    return (
        <Select
            value={selectedYearId}
            onValueChange={onYearChange}
            enableClear={false}
            icon={CalendarIcon}
            placeholder={placeholder}
            className={className}
        >
            {years.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                    {y.year}
                </SelectItem>
            ))}
        </Select>
    );
};
