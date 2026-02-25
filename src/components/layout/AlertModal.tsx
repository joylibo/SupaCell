import React from 'react';
import styles from './AppHeader.module.css';

interface AlertModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
    isOpen,
    title,
    message,
    onClose
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} style={{ zIndex: 3000 }}>
            <div className={styles.modal} style={{ width: '400px' }}>
                <div className={styles.modalHeader}>
                    <h3 style={{ color: '#dc2626', margin: 0, fontSize: '16px' }}>{title}</h3>
                </div>
                <div className={styles.modalBody}>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: '#334155' }}>
                        {message}
                    </p>
                </div>
                <div className={styles.modalFooter}>
                    <button
                        className={styles.saveBtn}
                        onClick={onClose}
                    >
                        确定
                    </button>
                </div>
            </div>
        </div>
    );
};
