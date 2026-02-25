import React, { useRef, useState } from 'react';
import { useSupaStore } from '@/store/useSupaStore';
import { Download, Upload, Filter } from 'lucide-react';
import { parseCSV, parseExcel, exportToCSV, exportToExcel } from '@/utils/parser';
import { ConfirmModal } from './ConfirmModal';
import { AlertModal } from './AlertModal';
import styles from './Toolbar.module.css';

export const Toolbar: React.FC = () => {
    const storeColumns = useSupaStore(state => state.columns);
    const rows = useSupaStore(state => state.rows);
    const resetTable = useSupaStore(state => state.resetTable);
    const selectedRowIds = useSupaStore(state => state.selectedRowIds);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });

    const showAlert = (title: string, message: string) => {
        setAlertConfig({ isOpen: true, title, message });
    };

    const handleImportClick = () => {
        if (rows.length > 0) {
            setIsConfirmOpen(true);
            return;
        }
        fileInputRef.current?.click();
    };

    const handleConfirmImport = () => {
        setIsConfirmOpen(false);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input so the same file can be selected again
        e.target.value = '';

        const isExcel = file.name.endsWith('.xlsx');
        const isCsv = file.name.endsWith('.csv');

        if (!isExcel && !isCsv) {
            showAlert("文件格式错误", "仅支持 .csv 和 .xlsx 格式的文件。");
            return;
        }

        let parsedResult;
        if (isCsv) {
            parsedResult = await parseCSV(file);
        } else {
            parsedResult = await parseExcel(file);
        }

        if (parsedResult.error) {
            showAlert("解析失败", parsedResult.error);
            return;
        }

        if (parsedResult.rows.length > 1000) {
            showAlert("超出限制", "超过了最大 1000 行的限制。请上传较小的文件。");
            return;
        }

        resetTable(parsedResult.columns, parsedResult.rows);
    };

    const selectedRows = rows.filter(r => selectedRowIds.has(r.id));
    const exportData = selectedRows.length > 0 ? selectedRows : rows;
    const exportLabel = selectedRows.length > 0 ? `导出 (${selectedRows.length}行)` : '导出全部';

    const handleExportCSV = () => {
        exportToCSV(storeColumns, exportData, 'supacell-export.csv');
    };

    const handleExportExcel = () => {
        exportToExcel(storeColumns, exportData, 'supacell-export.xlsx');
    };

    return (
        <div className={styles.toolbar}>
            <div className={styles.leftGroup}>
                <input
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
                <button className={styles.toolBtn} onClick={handleImportClick}>
                    <Upload size={16} /> 导入数据
                </button>

                <div className={styles.dropdown}>
                    <button className={styles.toolBtn}>
                        <Download size={16} /> {exportLabel}
                    </button>
                    <div className={styles.dropdownMenu}>
                        <div className={styles.menuItem} onClick={handleExportCSV}>导出为 CSV</div>
                        <div className={styles.menuItem} onClick={handleExportExcel}>导出为 Excel (.xlsx)</div>
                    </div>
                </div>
            </div>

            <div className={styles.rightGroup}>
                <div className={styles.filterBox}>
                    <Filter size={16} color="#64748b" />
                    <input
                        className={styles.searchInput}
                        placeholder="在表格中全局搜索..."
                    />
                </div>
            </div>

            <ConfirmModal
                isOpen={isConfirmOpen}
                title="警告：导入覆盖确认"
                message="导入新文件将会完全覆盖并清空现有的表头结构和所有表格数据。此操作不可逆。您确定要继续吗？"
                onConfirm={handleConfirmImport}
                onCancel={() => setIsConfirmOpen(false)}
            />

            <AlertModal
                isOpen={alertConfig.isOpen}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};
