import React, { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
    Row,
    getFacetedRowModel,
    getFilteredRowModel,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSupaStore, RowData } from '@/store/useSupaStore';
import { EditableCell } from './EditableCell';
import { ColumnSettingsModal } from './ColumnSettingsModal';
import { Settings, Plus, Sparkles } from 'lucide-react';
import styles from './SupaTable.module.css';

// Helper component for indeterminate checkbox
function IndeterminateCheckbox({
    indeterminate,
    className = '',
    ...rest
}: { indeterminate?: boolean } & React.HTMLProps<HTMLInputElement>) {
    const ref = React.useRef<HTMLInputElement>(null)
    React.useEffect(() => {
        if (typeof indeterminate === 'boolean' && ref.current) {
            ref.current.indeterminate = !rest.checked && indeterminate
        }
    }, [ref, indeterminate, rest.checked])
    return <input type="checkbox" ref={ref} className={className + ' cursor-pointer'} {...rest} />
}

export const SupaTable: React.FC = () => {
    const storeColumns = useSupaStore((state) => state.columns);
    const rows = useSupaStore((state) => state.rows);
    const selectedRowIds = useSupaStore((state) => state.selectedRowIds);
    const toggleRowSelection = useSupaStore((state) => state.toggleRowSelection);
    const toggleAllSelection = useSupaStore((state) => state.toggleAllSelection);
    const addRow = useSupaStore((state) => state.addRow);

    const [globalFilter, setGlobalFilter] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeColId, setActiveColId] = useState<string | undefined>(undefined);

    // Setup TanStack table columns
    const columns = useMemo<ColumnDef<RowData>[]>(() => {
        const cols: ColumnDef<RowData>[] = [
            {
                id: 'selection',
                header: ({ table }) => {
                    const isAllSelected = rows.length > 0 && selectedRowIds.size === rows.length;
                    const isSomeSelected = selectedRowIds.size > 0 && selectedRowIds.size < rows.length;
                    return (
                        <div className={styles.checkboxHeader}>
                            <IndeterminateCheckbox
                                checked={isAllSelected}
                                indeterminate={isSomeSelected}
                                onChange={() => toggleAllSelection(!isAllSelected)}
                            />
                        </div>
                    );
                },
                cell: ({ row }) => (
                    <div className={styles.checkboxCell}>
                        <IndeterminateCheckbox
                            checked={selectedRowIds.has(row.original.id)}
                            disabled={!row.getCanSelect()}
                            onChange={() => toggleRowSelection(row.original.id)}
                        />
                    </div>
                ),
                size: 50,
                enableResizing: false,
            },
            ...storeColumns.map((col) => ({
                accessorKey: col.id,
                id: col.id,
                header: () => (
                    <div
                        className={styles.colHeaderWrapper}
                        style={{ position: 'relative' }}
                    >
                        <span className={styles.colHeaderName}>{col.name}</span>
                        <div className={styles.headerActions}>
                            {col.type === 'ai' && (
                                <button
                                    className={styles.colSettingsBtn}
                                    title="AI 字段设定"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveColId(col.id);
                                        setIsModalOpen(true);
                                    }}
                                >
                                    <Sparkles size={14} color="#8b5cf6" />
                                </button>
                            )}
                            <button
                                className={styles.colSettingsBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveColId(col.id);
                                    setIsModalOpen(true);
                                }}
                            >
                                <Settings size={14} />
                            </button>
                        </div>
                    </div>
                ),
                cell: (info: any) => {
                    return (
                        <EditableCell
                            rowId={info.row.original.id}
                            column={col}
                            initialValue={info.getValue()}
                        />
                    );
                },
                size: 150,
            })),
            {
                id: 'add-column',
                header: () => (
                    <div
                        className={styles.addColumnHeader}
                        onClick={() => {
                            setActiveColId(undefined);
                            setIsModalOpen(true);
                        }}
                    >
                        <Plus size={16} />
                    </div>
                ),
                cell: () => null,
                size: 50,
            }
        ];
        return cols;
    }, [storeColumns, rows.length, selectedRowIds, toggleAllSelection, toggleRowSelection]);

    const table = useReactTable({
        data: rows,
        columns,
        state: {
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        enableRowSelection: true,
    });

    const { rows: tableRows } = table.getRowModel();

    // Virtualization
    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: tableRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 40, // default row height
        overscan: 10,
    });

    const virtualRows = virtualizer.getVirtualItems();

    return (
        <div className={styles.tableWrapper}>
            <div
                ref={parentRef}
                className={styles.scrollContainer}
            >
                <table className={styles.table} style={{ width: table.getTotalSize() }}>
                    <thead className={styles.thead} style={{ width: '100%' }}>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className={styles.tr} style={{ width: '100%' }}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        style={{
                                            width: header.getSize(),
                                            flex: `0 0 ${header.getSize()}px`,
                                        }}
                                        className={styles.th}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody
                        style={{
                            height: `${virtualizer.getTotalSize()}px`,
                            position: 'relative',
                            display: 'block',
                            width: '100%',
                        }}
                    >
                        {virtualRows.map((virtualRow) => {
                            const row = tableRows[virtualRow.index];
                            return (
                                <tr
                                    key={row.id}
                                    data-index={virtualRow.index}
                                    ref={virtualizer.measureElement}
                                    className={styles.tr}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            style={{
                                                width: cell.column.getSize(),
                                                flex: `0 0 ${cell.column.getSize()}px`,
                                            }}
                                            className={styles.td}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className={styles.addRowContainer}>
                <button className={styles.addRowBtn} onClick={() => addRow()}>
                    <Plus size={16} /> 新增一行
                </button>
            </div>

            <ColumnSettingsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                columnId={activeColId}
            />
        </div>
    );
};
