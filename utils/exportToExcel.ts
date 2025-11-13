
import * as XLSX from 'xlsx';
import type { Registro } from '../types';

export const exportToExcel = (data: Registro[], fileName: string) => {
  const worksheetData = data.map(({ id, user_id, created_at, ...rest }) => ({
    Fecha: rest.fecha,
    BEO: rest.beo || '',
    Salón: rest.salon,
    Compañía: rest.compania,
    Ítem: rest.item,
    Tipo: rest.tipo,
    Valor: rest.valor,
    Cantidad: rest.cantidad,
    Total: rest.total,
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros');
  
  // Auto-fit columns
  const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
    wch: Math.max(...worksheetData.map(row => (row as any)[key]?.toString().length || 10), key.length)
  }));
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
