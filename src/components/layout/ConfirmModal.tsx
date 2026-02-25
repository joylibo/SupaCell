import React from 'react';
import styles from './AppHeader.module.css';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ width: '400px' }}>
                <div className={styles.modalHeader}>
                    <h3 style={{ color: '#dc2626' }}>{title}</h3>
                </div>
                <div className={styles.modalBody}>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: '#334155' }}>
                        {message}
                    </p>
                </div>
                <div className={styles.modalFooter}>
                    <button className={styles.cancelBtn} onClick={onCancel}>取消</button>
                    <button
                        className={styles.saveBtn}
                        style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                        onClick={onConfirm}
                    >
                        确认覆盖
                    </button>
                </div>
            </div>
        </div>
    );
};
