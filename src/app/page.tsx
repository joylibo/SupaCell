'use client';

import React, { useEffect } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Toolbar } from '@/components/layout/Toolbar';
import { SupaTable } from '@/components/table/SupaTable';
import { useSupaStore } from '@/store/useSupaStore';
import { aiScheduler } from '@/utils/aiScheduler';
import './globals.css';

export default function Home() {
  const columns = useSupaStore(state => state.columns);

  useEffect(() => {
    // Listen for manual cell generation triggers
    const triggerListener = (e: any) => {
      const { rowId, colId } = e.detail;
      const currentColumns = useSupaStore.getState().columns;
      const column = currentColumns.find(c => c.id === colId);
      if (column && column.aiConfig) {
        aiScheduler.pushTask({
          rowId,
          colId,
          promptTemplate: column.aiConfig.prompt,
          model: column.aiConfig.model,
        });
      }
    };

    window.addEventListener('trigger-ai-generate', triggerListener);
    return () => window.removeEventListener('trigger-ai-generate', triggerListener);
  }, []);

  // Warn before unload if table has data to prevent accidental dataloss
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const rows = useSupaStore.getState().rows;
      if (rows.length > 0) {
        e.preventDefault();
        e.returnValue = ''; // Required for generic browser warning prompt
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f1f5f9' }}>
      <AppHeader />
      <Toolbar />
      <main style={{ flex: 1, padding: '24px', minHeight: 0 }}>
        <SupaTable />
      </main>
    </div>
  );
}
