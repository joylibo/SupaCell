import Papa from 'papaparse';
import * as XLSX from 'xlsx-js-style';
// @ts-ignore
import readXlsxFile from 'read-excel-file/browser';
import { v4 as uuidv4 } from 'uuid';
import { ColumnDef, RowData } from '@/store/useSupaStore';

export interface ParseResult {
    columns: ColumnDef[];
    rows: RowData[];
    error?: string;
}

function processRawData(data: any[]): ParseResult {
    if (!data || data.length === 0) {
        return { columns: [], rows: [], error: '文件内容为空' };
    }

    if (data.length > 1000) {
        return { columns: [], rows: [], error: '超出最大限制（1000 行）。请上传较小的数据文件。' };
    }

    // Assume first row is headers if it's an array of arrays, else keys of first object
    let headerNames: string[] = [];
    let rawRows: any[] = [];

    if (Array.isArray(data[0])) {
        headerNames = data[0].map(String);
        rawRows = data.slice(1);
    } else {
        headerNames = Object.keys(data[0] || {});
        rawRows = data;
    }

    // Generate ColumnDefs
    const columns: ColumnDef[] = headerNames.map(name => ({
        id: uuidv4(),
        name: name || 'Unnamed Column',
        type: 'text' // default to text for imports as per requirements
    }));

    const rows: RowData[] = rawRows.map(rawRow => {
        const rowObj: RowData = { id: uuidv4() };
        if (Array.isArray(rawRow)) {
            columns.forEach((col, idx) => {
                rowObj[col.id] = rawRow[idx] !== undefined ? rawRow[idx] : '';
            });
        } else {
            columns.forEach(col => {
                rowObj[col.id] = rawRow[col.name] !== undefined ? rawRow[col.name] : '';
            });
        }
        return rowObj;
    });

    return { columns, rows };
}

export const parseCSV = (file: File): Promise<ParseResult> => {
    return new Promise((resolve) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                resolve(processRawData(results.data));
            },
            error: (error) => {
                resolve({ columns: [], rows: [], error: error.message });
            }
        });
    });
};

export const parseExcel = async (file: File): Promise<ParseResult> => {
    try {
        const rows = await readXlsxFile(file);
        return processRawData(rows);
    } catch (err: any) {
        return { columns: [], rows: [], error: '解析 Excel 文件失败: ' + err.message };
    }
};

export const exportToCSV = (columns: ColumnDef[], rows: RowData[], filename = 'export.csv') => {
    const data = rows.map(row => {
        const obj: any = {};
        columns.forEach(col => {
            obj[col.name] = row[col.id];
        });
        return obj;
    });

    const csv = Papa.unparse(data);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
};

export const exportToExcel = (columns: ColumnDef[], rows: RowData[], filename = 'export.xlsx') => {
    const data = rows.map(row => {
        const obj: any = {};
        columns.forEach(col => {
            obj[col.name] = row[col.id];
        });
        return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, filename);
};
