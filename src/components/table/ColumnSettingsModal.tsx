import React, { useState, useEffect } from 'react';
import { ColumnDef, useSupaStore, ColumnType, AIConfig } from '@/store/useSupaStore';
import { X, Search } from 'lucide-react';
import styles from './ColumnSettingsModal.module.css';

interface FieldOptionsProps {
    options: string[];
    setOptions: (opts: string[]) => void;
}

const FieldOptionsInput: React.FC<FieldOptionsProps> = ({ options, setOptions }) => {
    const [val, setVal] = useState(options.join(', '));
    return (
        <div className={styles.formGroup}>
            <label>选项 (以逗号分隔)</label>
            <input
                value={val}
                onChange={e => setVal(e.target.value)}
                onBlur={() => setOptions(val.split(',').map(s => s.trim()).filter(Boolean))}
                className={styles.input}
                placeholder="选项1, 选项2"
            />
        </div>
    );
};

export interface ColumnSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    columnId?: string; // If provided, Edit mode. Otherwise, Add mode.
}

export const ColumnSettingsModal: React.FC<ColumnSettingsModalProps> = ({ isOpen, onClose, columnId }) => {
    const allColumns = useSupaStore(state => state.columns);
    const addColumn = useSupaStore(state => state.addColumn);
    const updateColumn = useSupaStore(state => state.updateColumn);
    const removeColumn = useSupaStore(state => state.removeColumn);

    const existingCol = columnId ? allColumns.find(c => c.id === columnId) : null;

    const [name, setName] = useState('');
    const [type, setType] = useState<ColumnType>('text');
    const [options, setOptions] = useState<string[]>([]);
    const [aiModel, setAiModel] = useState<'deepseek3.2' | 'qwen3.5-plus'>('deepseek3.2');
    const [aiPrompt, setAiPrompt] = useState('');
    const [generateMode, setGenerateMode] = useState<'none' | 10 | 50 | 'all'>('none');

    const [showRefModal, setShowRefModal] = useState(false);
    const [searchRef, setSearchRef] = useState('');

    const rows = useSupaStore(state => state.rows); // Needed for counting and triggering generation

    useEffect(() => {
        if (isOpen) {
            if (existingCol) {
                setName(existingCol.name);
                setType(existingCol.type);
                setOptions(existingCol.options || []);
                if (existingCol.aiConfig) {
                    setAiModel(existingCol.aiConfig.model);
                    setAiPrompt(existingCol.aiConfig.prompt);
                }
            } else {
                setName('');
                setType('text');
                setOptions([]);
                setAiModel('deepseek3.2');
                setAiPrompt('');
            }
        }
    }, [isOpen, existingCol]);

    if (!isOpen) return null;

    // Circular Dependency Checking
    const checkCircularParams = (promptToCheck: string, colNameToExclude: string) => {
        // Very basic check: does this prompt reference a column which references this column?
        // A robust graph check is better, but since it's an in-memory graph of strings we can traverse paths.
        const getRefs = (prompt: string): string[] => {
            const matches = prompt.match(/{{([^}]+)}}/g);
            return matches ? matches.map(m => m.slice(2, -2)) : [];
        };

        // Check if `colNameToExclude` is eventually referenced.
        // We will do a simple BFS/DFS.
        const visited = new Set<string>();
        const queue = getRefs(promptToCheck);

        while (queue.length > 0) {
            const refName = queue.shift()!;
            if (refName === colNameToExclude) return true; // Deadlock!
            if (!visited.has(refName)) {
                visited.add(refName);
                const refCol = allColumns.find(c => c.name === refName);
                if (refCol && refCol.aiConfig) {
                    queue.push(...getRefs(refCol.aiConfig.prompt));
                }
            }
        }
        return false;
    };

    const handleSave = () => {
        if (!name.trim()) {
            alert("列名不能为空");
            return;
        }

        if (!existingCol && allColumns.some(c => c.name === name)) {
            alert("列名已存在");
            return;
        }

        if (type === 'ai') {
            if (checkCircularParams(aiPrompt, name)) {
                alert("检测到循环依赖！Prompt 中不能引用依赖于当前列的字段。");
                return;
            }
        }

        const targetColId = existingCol ? existingCol.id : `col_${Date.now()}`;
        const colData = {
            id: targetColId,
            name,
            type,
            options: ['select', 'multiselect'].includes(type) ? options : undefined,
            aiConfig: type === 'ai' ? { model: aiModel, prompt: aiPrompt } : undefined
        };

        if (existingCol) {
            // If name changed, we should ideally update other prompts here.
            if (existingCol.name !== name) {
                // Auto-replace references in other AI columns
                allColumns.forEach(c => {
                    if (c.id !== existingCol.id && c.aiConfig && c.aiConfig.prompt.includes(`{{${existingCol.name}}}`)) {
                        const newPrompt = c.aiConfig.prompt.replace(new RegExp(`{{${existingCol.name}}}`, 'g'), `{{${name}}}`);
                        updateColumn(c.id, { aiConfig: { ...c.aiConfig, prompt: newPrompt } });
                    }
                });
            }
            updateColumn(existingCol.id, colData);
        } else {
            addColumn(colData);
        }

        // Trigger AI Generation if applicable
        if (type === 'ai' && generateMode !== 'none') {
            let count = 0;
            for (const row of rows) {
                if (generateMode !== 'all' && count >= generateMode) break;
                const val = row[targetColId];
                if (!val) { // Generate if empty
                    count++;
                    const event = new CustomEvent('trigger-ai-generate', { detail: { rowId: row.id, colId: targetColId } });
                    window.dispatchEvent(event);
                }
            }
        }

        onClose();
    };

    const handleDelete = () => {
        if (!existingCol) return;

        // Check if any other AI col references this
        const referencingCols = allColumns.filter(c =>
            c.id !== existingCol.id &&
            c.aiConfig &&
            c.aiConfig.prompt.includes(`{{${existingCol.name}}}`)
        );

        if (referencingCols.length > 0) {
            const refNames = referencingCols.map(c => c.name).join(', ');
            const confirmed = window.confirm(`警告：以下 AI 列正在引用此表头：\n[${refNames}]\n\n如果您删除此列，这些列中对其的引用 ({{${existingCol.name}}}) 将会被清空。确定继续吗？`);
            if (!confirmed) return;

            // Auto cleanup 
            referencingCols.forEach(c => {
                const cleanedPrompt = c.aiConfig!.prompt.replace(new RegExp(`{{${existingCol.name}}}`, 'g'), '');
                updateColumn(c.id, { aiConfig: { ...c.aiConfig!, prompt: cleanedPrompt } });
            });
        }

        removeColumn(existingCol.id);
        onClose();
    };

    const handleInsertRef = (fieldName: string) => {
        setAiPrompt(prev => prev + `{{${fieldName}}}`);
        setShowRefModal(false);
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>{existingCol ? '编辑表头' : '添加表头'}</h3>
                    <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
                </div>

                <div className={styles.body}>
                    <div className={styles.formGroup}>
                        <label>字段名称</label>
                        <input
                            className={styles.input}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="例如：邮箱地址"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>字段类型</label>
                        <select
                            className={styles.input}
                            value={type}
                            onChange={e => setType(e.target.value as ColumnType)}
                        >
                            <option value="text">文本 (Text)</option>
                            <option value="number">数字 (Number)</option>
                            <option value="date">日期 (Date)</option>
                            <option value="select">单选 (Select)</option>
                            <option value="multiselect">多选 (Multiselect)</option>
                            <option value="ai">AI 自动生成</option>
                        </select>
                    </div>

                    {['select', 'multiselect'].includes(type) && (
                        <FieldOptionsInput options={options} setOptions={setOptions} />
                    )}

                    {type === 'ai' && (
                        <div className={styles.aiConfigBox}>
                            <div className={styles.formGroup}>
                                <label>分配模型</label>
                                <select
                                    className={styles.input}
                                    value={aiModel}
                                    onChange={e => setAiModel(e.target.value as any)}
                                >
                                    <option value="deepseek3.2">DeepSeek V3.2</option>
                                    <option value="qwen3.5-plus">通义千问 3.5 Plus</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <div className={styles.promptHeader}>
                                    <label>Prompt 定义</label>
                                    <button className={styles.refBtn} onClick={() => setShowRefModal(true)}>+ 引用字段</button>
                                </div>
                                <textarea
                                    className={styles.textarea}
                                    value={aiPrompt}
                                    onChange={e => setAiPrompt(e.target.value)}
                                    placeholder="示例：请根据 {{Name}} 写一段简短的介绍"
                                    rows={4}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>生成选项 (保存时触发)</label>
                                <select
                                    className={styles.input}
                                    value={generateMode}
                                    onChange={e => setGenerateMode(e.target.value === 'none' || e.target.value === 'all' ? e.target.value as any : Number(e.target.value))}
                                >
                                    <option value="none">暂不生成 (仅保存配置)</option>
                                    <option value={10}>保存并生成前 10 行空数据</option>
                                    <option value={50}>保存并生成前 50 行空数据</option>
                                    <option value="all">保存并生成整列所有空数据</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    {existingCol && (
                        <button className={styles.deleteBtn} onClick={handleDelete}>删除该列</button>
                    )}
                    <div className={styles.rightActions}>
                        <button className={styles.cancelBtn} onClick={onClose}>取消</button>
                        <button className={styles.saveBtn} onClick={handleSave}>确定</button>
                    </div>
                </div>
            </div>

            {showRefModal && (
                <div className={styles.overlay} style={{ zIndex: 1001 }}>
                    <div className={styles.refModal}>
                        <div className={styles.header}>
                            <h4>选择要引用的表头字段</h4>
                            <button className={styles.closeBtn} onClick={() => setShowRefModal(false)}><X size={16} /></button>
                        </div>
                        <div className={styles.searchBox}>
                            <Search size={14} className={styles.searchIcon} />
                            <input
                                className={styles.searchInput}
                                value={searchRef}
                                onChange={e => setSearchRef(e.target.value)}
                                placeholder="搜索表头..."
                            />
                        </div>
                        <div className={styles.refList}>
                            {allColumns
                                .filter(c => c.name.toLowerCase().includes(searchRef.toLowerCase()) && c.id !== columnId)
                                .map(c => (
                                    <div key={c.id} className={styles.refItem} onClick={() => handleInsertRef(c.name)}>
                                        {c.name} <span className={styles.refType}>({c.type})</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
