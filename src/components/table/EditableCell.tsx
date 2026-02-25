import React, { useState, useEffect } from 'react';
import { ColumnDef, useSupaStore } from '@/store/useSupaStore';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import styles from './EditableCell.module.css';

interface EditableCellProps {
    rowId: string;
    column: ColumnDef;
    initialValue: any;
}

export const EditableCell: React.FC<EditableCellProps> = ({ rowId, column, initialValue }) => {
    const [value, setValue] = useState(initialValue ?? '');
    const updateCell = useSupaStore((state) => state.updateCell);

    // AI Cell Status
    const cellStatusObj = useSupaStore((state) => state.cellStatuses[`${rowId}_${column.id}`]);
    const isAiLoading = cellStatusObj?.status === 'loading';
    const aiError = cellStatusObj?.status === 'error' ? cellStatusObj.errorMessage : null;

    useEffect(() => {
        setValue(initialValue ?? '');
    }, [initialValue]);

    const handleBlur = () => {
        if (value !== initialValue) {
            updateCell(rowId, column.id, value);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setValue(e.target.value);
    };

    // Prevent edit while AI is loading
    const disabled = isAiLoading;

    // Single AI trigger
    const handleGenerateClick = () => {
        // Triggers global generation logic for a single cell. 
        // We will emit an event or call an AI scheduler queue function here later.
        const event = new CustomEvent('trigger-ai-generate', { detail: { rowId, colId: column.id } });
        window.dispatchEvent(event);
    };

    if (column.type === 'ai') {
        return (
            <div className={`${styles.cellContainer} ${isAiLoading ? styles.loadingCell : ''}`}>
                <textarea
                    className={styles.inputArea}
                    value={value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={disabled}
                    placeholder={isAiLoading ? '生成中...' : ''}
                    rows={Math.max(2, String(value).split('\n').length)}
                />
                {isAiLoading && <Loader2 className={styles.spinnerIcon} size={16} />}
                {!isAiLoading && (!value || aiError) && (
                    <button
                        className={styles.generateBtn}
                        onClick={handleGenerateClick}
                        title="生成此单元格"
                    >
                        <Sparkles size={14} />
                    </button>
                )}
                {aiError && (
                    <div className={styles.errorIndicator} title={aiError}>
                        <AlertCircle size={14} color="red" />
                    </div>
                )}
            </div>
        );
    }

    if (column.type === 'select' || column.type === 'multiselect') {
        return (
            <select
                value={value}
                onChange={(e) => {
                    handleChange(e);
                    updateCell(rowId, column.id, e.target.value); // update immediately
                }}
                disabled={disabled}
                className={styles.input}
            >
                <option value=""></option>
                {column.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        );
    }

    if (column.type === 'date') {
        return (
            <input
                type="date"
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={disabled}
                className={styles.input}
            />
        );
    }

    // Text / Number
    return (
        <input
            type={column.type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            className={styles.input}
        />
    );
};
