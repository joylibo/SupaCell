import React, { useState } from 'react';
import { useSupaStore } from '@/store/useSupaStore';
import { Settings, Download, Upload } from 'lucide-react';
import styles from './AppHeader.module.css';

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const currentSettings = useSupaStore(state => state.settings);
    const updateSettings = useSupaStore(state => state.updateSettings);

    const [concurrency, setConcurrency] = useState(currentSettings.aiConcurrency);
    const [ds, setDs] = useState(currentSettings.deepSeekSettings);
    const [qw, setQw] = useState(currentSettings.qwenSettings);

    if (!isOpen) return null;

    const handleSave = () => {
        let c = parseInt(concurrency as any, 10);
        if (isNaN(c) || c < 1) c = 1;
        if (c > 3) c = 3; // Max 3
        updateSettings({
            aiConcurrency: c,
            deepSeekSettings: ds,
            qwenSettings: qw
        });
        onClose();
    };

    const renderModelForm = (name: string, modelObj: any, setModelObj: any) => (
        <div className={styles.modelSection}>
            <h4 className={styles.sectionTitle}>{name} 设置</h4>
            <div className={styles.paramGrid}>
                <div className={styles.formGroup}>
                    <label>max_tokens</label>
                    <input type="number" className={styles.input} value={modelObj.max_tokens} onChange={e => setModelObj({ ...modelObj, max_tokens: parseInt(e.target.value) || 0 })} />
                </div>
                <div className={styles.formGroup}>
                    <label>temperature</label>
                    <input type="number" step="0.1" className={styles.input} value={modelObj.temperature} onChange={e => setModelObj({ ...modelObj, temperature: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className={styles.formGroup}>
                    <label>top_p</label>
                    <input type="number" step="0.1" className={styles.input} value={modelObj.top_p} onChange={e => setModelObj({ ...modelObj, top_p: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className={styles.formGroup}>
                    <label>frequency_penalty</label>
                    <input type="number" step="0.1" className={styles.input} value={modelObj.frequency_penalty} onChange={e => setModelObj({ ...modelObj, frequency_penalty: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className={styles.formGroup}>
                    <label>presence_penalty</label>
                    <input type="number" step="0.1" className={styles.input} value={modelObj.presence_penalty} onChange={e => setModelObj({ ...modelObj, presence_penalty: parseFloat(e.target.value) || 0 })} />
                </div>
            </div>
        </div>
    );

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3>系统设置</h3>
                </div>
                <div className={styles.modalBody}>
                    <div className={styles.formGroup} style={{ marginBottom: 16 }}>
                        <label>AI 任务并发限制</label>
                        <input
                            type="number"
                            min={1}
                            max={3}
                            className={styles.input}
                            value={concurrency}
                            onChange={e => setConcurrency(parseInt(e.target.value) || 1)}
                        />
                        <small>控制可以同时运行多少个 LLM 请求。最小：1，最大：3。</small>
                    </div>

                    <div className={styles.splitForms}>
                        {renderModelForm('DeepSeek3.2', ds, setDs)}
                        {renderModelForm('Qwen3.5 Plus', qw, setQw)}
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <button className={styles.cancelBtn} onClick={onClose}>取消</button>
                    <button className={styles.saveBtn} onClick={handleSave}>保存设置</button>
                </div>
            </div>
        </div>
    );
};

export const AppHeader: React.FC = () => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <>
            <header className={styles.header}>
                <div className={styles.logo}>SupaCell</div>
                <div className={styles.actions}>
                    <button className={styles.iconBtn} onClick={() => setIsSettingsOpen(true)}>
                        <Settings size={18} />
                        <span>设置</span>
                    </button>
                </div>
            </header>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    );
};
