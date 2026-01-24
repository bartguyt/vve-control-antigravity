import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@tremor/react';

interface TagInputProps {
    value: string[];
    onChange: (value: string[]) => void;
    suggestions: string[];
    confirmNewTag?: boolean;
    placeholder?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
    value,
    onChange,
    suggestions,
    confirmNewTag = false,
    placeholder = 'Type en druk op Enter...'
}) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingTag, setPendingTag] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!inputValue.trim()) {
            setSuggestion(null);
            return;
        }

        const lowerInput = inputValue.toLowerCase();
        // Find first match that starts with input and isn't already selected
        const match = suggestions.find(s =>
            s.toLowerCase().startsWith(lowerInput) &&
            !value.includes(s)
        );

        setSuggestion(match || null);
    }, [inputValue, suggestions, value]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab') {
            if (suggestion) {
                e.preventDefault();
                addTag(suggestion);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestion) {
                addTag(suggestion);
            } else if (inputValue.trim()) {
                const newTag = inputValue.trim();
                if (!value.includes(newTag)) {
                    if (confirmNewTag && !suggestions.some(s => s.toLowerCase() === newTag.toLowerCase())) {
                        setPendingTag(newTag);
                        setShowConfirm(true);
                    } else {
                        addTag(newTag);
                    }
                } else {
                    setInputValue(''); // Already exists, just clear
                }
            }
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            // Optional: remove last tag on backspace if input is empty
            const newValue = [...value];
            newValue.pop();
            onChange(newValue);
        }
    };

    const addTag = (tag: string) => {
        onChange([...value, tag]);
        setInputValue('');
        setSuggestion(null);
    };

    const removeTag = (tagToRemove: string) => {
        onChange(value.filter(tag => tag !== tagToRemove));
    };

    const confirmAdd = () => {
        if (pendingTag) {
            addTag(pendingTag);
            setPendingTag(null);
            setShowConfirm(false);
        }
    };

    return (
        <div className="relative">
            <div className="flex flex-wrap gap-2 mb-2">
                {value.map(tag => (
                    <span key={tag} className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-indigo-100 text-indigo-700">
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-indigo-400 hover:text-indigo-600 focus:outline-none"
                        >
                            <XMarkIcon className="h-3 w-3" />
                        </button>
                    </span>
                ))}
            </div>

            <div className="relative">
                <div className="relative flex items-center">
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white text-gray-900 placeholder:text-gray-400"
                        placeholder={value.length === 0 ? placeholder : ''}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />

                    {/* Tooltip Suggestion Overlay */}
                    {suggestion && (
                        <div
                            className="absolute z-10 left-0 -bottom-10 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg flex items-center gap-2 cursor-pointer"
                            onClick={() => addTag(suggestion)}
                        >
                            <span>Suggestie: <span className="font-bold text-indigo-300">{suggestion}</span></span>
                            <span className="bg-gray-700 px-1 rounded text-[10px] text-gray-400">TAB</span>
                        </div>
                    )}
                </div>

                {inputValue && !suggestion && (
                    <div className="absolute right-2 top-2 text-xs text-gray-400 hidden sm:block">
                        Druk op Enter om toe te voegen
                    </div>
                )}
            </div>

            {/* Confirmation Modal (Simple inline absolute for now, or fixed overlay) */}
            {showConfirm && (
                <div className="absolute top-10 left-0 z-50 w-64 bg-white border border-gray-200 rounded-lg shadow-xl p-4 animate-in fade-in zoom-in duration-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Nieuwe tag toevoegen?</h4>
                    <p className="text-xs text-gray-500 mb-3">"{pendingTag}" is nog geen bestaande categorie.</p>
                    <div className="flex justify-end gap-2">
                        <Button size="xs" variant="secondary" onClick={() => setShowConfirm(false)}>
                            Annuleren
                        </Button>
                        <Button size="xs" onClick={confirmAdd}>
                            Toevoegen
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
