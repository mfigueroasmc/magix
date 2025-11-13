import * as XLSX from 'xlsx';
import type { Registro } from '../types';

interface MonthlySummary {
  Mes: string;
  'Total Venta': number;
  'Venta Iluminación': number;
  'Subarriendo Iluminación': number;
}

export const exportSummaryToExcel = (data: Registro[], fileName: string) => {
  const summaries: { [key: string]: MonthlySummary } = {};

  data.forEach(registro => {
    const parts = registro.fecha.split('-').map(p => parseInt(p, 10));
    const date = new Date(parts[0], parts[1] - 1, parts[2]);

    const year = date.getFullYear();
    const month = date.getMonth();
    
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    if (!summaries[monthKey]) {
      const monthName = date.toLocaleString('es-CL', { month: 'long', year: 'numeric' });
      summaries[monthKey] = {
        'Mes': monthName.charAt(0).toUpperCase() + monthName.slice(1),
        'Total Venta': 0,
        'Venta Iluminación': 0,
        'Subarriendo Iluminación': 0,
      };
    }

    const summary = summaries[monthKey];
    const tipoNormalizado = registro.tipo.toLowerCase().trim();
    const itemNormalizado = registro.item.toLowerCase();

    if (tipoNormalizado === 'venta') {
      summary['Total Venta'] += registro.total;
      if (itemNormalizado.includes('iluminación')) {
        summary['Venta Iluminación'] += registro.total;
      }
    } else if (tipoNormalizado === 'subarriendo') {
      if (itemNormalizado.includes('iluminación')) {
        summary['Subarriendo Iluminación'] += registro.total;
      }
    }
  });

  const sortedSummaries = Object.values(summaries).sort((a, b) => {
    const aKey = Object.keys(summaries).find(key => summaries[key] === a)!;
    const bKey = Object.keys(summaries).find(key => summaries[key] === b)!;
    return bKey.localeCompare(aKey); // Descending order
  });

  if (sortedSummaries.length === 0) {
    alert("No hay datos para generar el resumen en el rango de fechas seleccionado.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(sortedSummaries);

  const currencyFormat = '"$"#,##0';
  const range = XLSX.utils.decode_range(worksheet['!ref']!);
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    for (let C = 1; C <= 3; ++C) { // Columns B, C, D
      const cellAddress = XLSX.utils.encode_cell({c: C, r: R});
      const cell = worksheet[cellAddress];
      if (cell && cell.v !== undefined) {
        cell.t = 'n';
        cell.z = currencyFormat;
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen Mensual');
  
  const colWidths = (sortedSummaries[0] ? Object.keys(sortedSummaries[0]) : []).map(key => ({
    wch: Math.max(...sortedSummaries.map(row => (row as any)[key]?.toString().length || 10), key.length) + 2
  }));
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};