import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import mockData from './mock.json';

export type ColumnType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'ai';

export interface AIConfig {
  model: 'deepseek3.2' | 'qwen3.5-plus';
  prompt: string;
}

export interface ColumnDef {
  id: string; // The immutable Column ID
  name: string; // The display name
  type: ColumnType;
  options?: string[]; // For select/multiselect
  aiConfig?: AIConfig;
  defaultValue?: string | number; // For non-AI fields
}

export type RowData = Record<string, any> & { id: string };

export type CellAiStatus = 'idle' | 'loading' | 'success' | 'error';
export interface CellStatus {
  status: CellAiStatus;
  errorMessage?: string;
}

export interface ModelSettings {
  max_tokens: number;
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

interface AppSettings {
  aiConcurrency: number;
  deepSeekSettings: ModelSettings;
  qwenSettings: ModelSettings;
}

interface SupaStoreState {
  columns: ColumnDef[];
  rows: RowData[];
  settings: AppSettings;
  selectedRowIds: Set<string>;
  cellStatuses: Record<string, CellStatus>; // Key: `${rowId}_${colId}`
}

interface SupaStoreActions {
  // Column actions
  setColumns: (columns: ColumnDef[]) => void;
  addColumn: (column: Omit<ColumnDef, 'id'> & { id?: string }) => void;
  updateColumn: (id: string, column: Partial<ColumnDef>) => void;
  removeColumn: (id: string) => void;

  // Row actions
  setRows: (rows: RowData[]) => void;
  addRow: () => void;
  addRows: (count: number) => void;
  updateCell: (rowId: string, colId: string, value: any) => void;

  // Selection
  toggleRowSelection: (rowId: string) => void;
  toggleAllSelection: (selectAll: boolean) => void;

  // Settings
  updateSettings: (settings: Partial<AppSettings>) => void;

  // AI Status
  setCellAiStatus: (rowId: string, colId: string, status: CellAiStatus, errorMessage?: string) => void;

  // Reset via import
  resetTable: (columns: ColumnDef[], rows: RowData[]) => void;
}

type SupaStore = SupaStoreState & SupaStoreActions;

const defaultColumns: ColumnDef[] = [
  { id: 'col_id', name: 'ID', type: 'text' },
  { id: 'col_name', name: '商品名称', type: 'text' },
  { id: 'col_gender', name: '适用人群', type: 'select', options: ['男士', '女士', '通用'] },
  { id: 'col_content', name: '营销文案', type: 'text' },
  { id: 'col_created_at', name: '创建时间', type: 'date' },
];

export const useSupaStore = create<SupaStore>((set) => ({
  columns: defaultColumns,
  rows: mockData as RowData[],
  settings: {
    aiConcurrency: 1,
    deepSeekSettings: {
      max_tokens: 2048,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
    },
    qwenSettings: {
      max_tokens: 2048,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
    }
  },
  selectedRowIds: new Set(),
  cellStatuses: {},

  setColumns: (columns) => set({ columns }),
  addColumn: (colInfo) => set((state) => ({
    columns: [...state.columns, { id: uuidv4(), ...colInfo }]
  })),
  updateColumn: (id, updates) => set((state) => ({
    columns: state.columns.map(c => c.id === id ? { ...c, ...updates } : c)
  })),
  removeColumn: (id) => set((state) => {
    // Note: Deletion protection validation should be verified in the UI layer before calling removeColumn
    return { columns: state.columns.filter(c => c.id !== id) };
  }),

  setRows: (rows) => set({ rows }),
  addRow: () => set((state) => ({
    rows: [...state.rows, { id: uuidv4() }]
  })),
  addRows: (count) => set((state) => {
    const newRows = Array.from({ length: count }).map(() => ({ id: uuidv4() }));
    return { rows: [...state.rows, ...newRows] };
  }),
  updateCell: (rowId, colId, value) => set((state) => ({
    rows: state.rows.map(row =>
      row.id === rowId ? { ...row, [colId]: value } : row
    )
  })),

  toggleRowSelection: (rowId) => set((state) => {
    const newSelection = new Set(state.selectedRowIds);
    if (newSelection.has(rowId)) {
      newSelection.delete(rowId);
    } else {
      newSelection.add(rowId);
    }
    return { selectedRowIds: newSelection };
  }),
  toggleAllSelection: (selectAll) => set((state) => ({
    selectedRowIds: selectAll ? new Set(state.rows.map(r => r.id)) : new Set()
  })),

  updateSettings: (updates) => set((state) => ({
    settings: { ...state.settings, ...updates }
  })),

  setCellAiStatus: (rowId, colId, status, errorMessage) => set((state) => ({
    cellStatuses: {
      ...state.cellStatuses,
      [`${rowId}_${colId}`]: { status, errorMessage }
    }
  })),

  resetTable: (columns, rows) => set({
    columns,
    rows,
    selectedRowIds: new Set(),
    cellStatuses: {}
  })
}));
