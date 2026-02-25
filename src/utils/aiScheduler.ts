import { useSupaStore } from '@/store/useSupaStore';

interface QueuedTask {
    rowId: string;
    colId: string;
    promptTemplate: string;
    model: 'deepseek3.2' | 'qwen3.5-plus';
    resolve: (value: boolean) => void;
}

class AIScheduler {
    private queue: QueuedTask[] = [];
    private activeCount = 0;

    public async pushTask(task: Omit<QueuedTask, 'resolve'>): Promise<boolean> {
        return new Promise((resolve) => {
            this.queue.push({ ...task, resolve });
            this.processNext();
        });
    }

    private async processNext() {
        const concurrencyLimit = useSupaStore.getState().settings.aiConcurrency;
        if (this.activeCount >= concurrencyLimit || this.queue.length === 0) {
            return;
        }

        const task = this.queue.shift();
        if (!task) return;

        this.activeCount++;

        const setStatus = useSupaStore.getState().setCellAiStatus;
        const updateCell = useSupaStore.getState().updateCell;
        const { columns, rows, settings } = useSupaStore.getState();

        setStatus(task.rowId, task.colId, 'loading');

        try {
            // Prompt Interpolation
            let finalPrompt = task.promptTemplate;

            // Find row data
            const row = rows.find(r => r.id === task.rowId);
            if (!row) throw new Error('Row not found');

            // Regex to find all {{ColumnName}}
            const matches = finalPrompt.match(/{{([^}]+)}}/g);
            if (matches) {
                for (const match of matches) {
                    const colName = match.slice(2, -2);
                    const refCol = columns.find(c => c.name === colName);
                    if (!refCol) {
                        throw new Error(`Referenced column '${colName}' not found`);
                    }
                    const val = row[refCol.id];
                    finalPrompt = finalPrompt.replace(match, val !== undefined && val !== null ? String(val) : '');
                }
            }

            const modelConfig = task.model === 'deepseek3.2' ? settings.deepSeekSettings : settings.qwenSettings;

            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: task.model,
                    prompt: finalPrompt,
                    config: modelConfig
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || res.statusText);
            }

            const data = await res.json();
            updateCell(task.rowId, task.colId, data.result || '');
            setStatus(task.rowId, task.colId, 'success');
            task.resolve(true);

        } catch (err: any) {
            console.error(`AI Task Failed [${task.rowId}, ${task.colId}]:`, err);
            setStatus(task.rowId, task.colId, 'error', err.message);
            task.resolve(false);
        } finally {
            this.activeCount--;
            this.processNext();
        }
    }
}

export const aiScheduler = new AIScheduler();
