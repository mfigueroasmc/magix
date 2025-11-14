import * as XLSX from 'xlsx';
import type { Registro } from '../types';

const columnMapping: { [key: string]: keyof Omit<Registro, 'id' | 'user_id' | 'created_at' | 'total'> } = {
  'fecha': 'fecha',
  'beo': 'beo',
  'codigo evento': 'beo',
  'codigo_evento': 'beo',
  'salon': 'salon',
  'compania': 'compania',
  'item': 'item',
  'tipo': 'tipo',
  'valor': 'valor',
  'cantidad': 'cantidad',
};

const formatDate = (date: Date): string => {
    const d = new Date(date);
    // Adjust for timezone offset to prevent date changes
    const adjustedDate = new Date(d.getTime() + Math.abs(d.getTimezoneOffset()*60000))
    return adjustedDate.toISOString().split('T')[0];
}

export const parseExcelFile = (file: File): Promise<Omit<Registro, 'id' | 'user_id' | 'created_at'>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            throw new Error("El archivo de Excel o CSV no contiene hojas.");
        }
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        const parsedData = jsonData.map((row, index) => {
          const newRow: any = {
              beo: '', // Default optional field
          };
          
          // Map columns from file to our object, case-insensitively and ignoring accents
          for(const rawHeader in row) {
              if (Object.prototype.hasOwnProperty.call(row, rawHeader)) {
                  // Normalize header: lowercase, trim, remove accents
                  const normalizedHeader = rawHeader.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  if (columnMapping[normalizedHeader]) {
                      const objKey = columnMapping[normalizedHeader];
                      newRow[objKey] = row[rawHeader];
                  }
              }
          }

          // Process and validate date
          if (newRow.fecha) {
              let date;
              if (newRow.fecha instanceof Date) {
                  date = newRow.fecha;
              } else {
                  const dateString = String(newRow.fecha);
                  // Try parsing DD-MM-YYYY or DD/MM/YYYY
                  const parts = dateString.split(/[-/]/);
                  if (parts.length === 3 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1])) && !isNaN(parseInt(parts[2]))) {
                      const day = parseInt(parts[0], 10);
                      const month = parseInt(parts[1], 10);
                      const year = parseInt(parts[2], 10);
                      // Basic sanity check for DD-MM-YYYY
                      if(year > 2000 && month > 0 && month <= 12 && day > 0 && day <= 31) {
                          date = new Date(year, month - 1, day);
                      }
                  }
                  // Fallback to native parser for other formats like YYYY-MM-DD
                  if (!date || isNaN(date.getTime())) {
                      date = new Date(dateString);
                  }
              }
              
              if (date && !isNaN(date.getTime())) {
                  newRow.fecha = formatDate(date);
              } else {
                  newRow.fecha = String(newRow.fecha);
              }
          }

          const valor = Number(newRow.valor) || 0;
          const cantidad = Number(newRow.cantidad) || 0;

          if (!newRow.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(newRow.fecha) || !newRow.salon || !newRow.compania || !newRow.item || !newRow.tipo || valor <= 0 || cantidad <= 0) {
             console.warn(`Omitiendo fila inválida (${index + 2}): ${JSON.stringify(row)}. Faltan datos requeridos o los valores son incorrectos.`);
             return null;
          }

          return {
            fecha: newRow.fecha,
            beo: newRow.beo || '',
            salon: newRow.salon,
            compania: newRow.compania,
            item: newRow.item,
            tipo: newRow.tipo,
            valor: valor,
            cantidad: cantidad,
            total: valor * cantidad,
          };
        }).filter(item => item !== null) as Omit<Registro, 'id' | 'user_id' | 'created_at'>[];

        resolve(parsedData);
      } catch (error) {
        if (error instanceof Error) {
            reject(new Error(`Error al procesar el archivo: ${error.message}`));
        } else {
            reject(new Error('Ocurrió un error inesperado al procesar el archivo.'));
        }
      }
    };
    reader.onerror = (error) => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsArrayBuffer(file);
  });
};