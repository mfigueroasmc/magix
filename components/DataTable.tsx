
import React, { useState, useMemo, useEffect } from 'react';
import type { Registro } from '../types';
import { SortAscIcon, SortDescIcon, TrashIcon, EditIcon } from './ui/Icons';

interface DataTableProps {
  data: Registro[];
  onDelete: (id: number) => void;
  onEdit: (registro: Registro) => void;
}

type SortKey = keyof Registro;
const RECORDS_PER_PAGE = 10;

const DataTable: React.FC<DataTableProps> = ({ data, onDelete, onEdit }) => {
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'fecha', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredData = useMemo(() => {
    let items = data;

    // Date filtering
    if (startDate || endDate) {
        items = items.filter(item => {
            const itemDate = item.fecha;
            const startMatch = startDate ? itemDate >= startDate : true;
            const endMatch = endDate ? itemDate <= endDate : true;
            return startMatch && endMatch;
        });
    }

    // Text filtering
    if (filter) {
        items = items.filter(item =>
            Object.values(item).some(val =>
                String(val).toLowerCase().includes(filter.toLowerCase())
            )
        );
    }
    
    return items;
  }, [data, filter, startDate, endDate]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key]! < b[sortConfig.key]!) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key]! > b[sortConfig.key]!) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, startDate, endDate]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedData.length / RECORDS_PER_PAGE);
  const paginatedData = useMemo(() => {
      if (sortedData.length === 0) return [];
      const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
      return sortedData.slice(startIndex, startIndex + RECORDS_PER_PAGE);
  }, [sortedData, currentPage]);
  
  const handleClearFilters = () => {
    setFilter('');
    setStartDate('');
    setEndDate('');
  };

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    if (sortConfig.direction === 'ascending') {
      return <SortAscIcon className="h-4 w-4 ml-1" />;
    }
    return <SortDescIcon className="h-4 w-4 ml-1" />;
  };

  const headers: { key: SortKey; label: string; className?: string }[] = [
    { key: 'fecha', label: 'Fecha' },
    { key: 'salon', label: 'Salón' },
    { key: 'compania', label: 'Compañía' },
    { key: 'item', label: 'Ítem', className: 'w-1/4' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'valor', label: 'Valor' },
    { key: 'cantidad', label: 'Cant.' },
    { key: 'total', label: 'Total' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-4 items-end">
        <div className="flex-grow">
          <label htmlFor="text-filter" className="text-sm font-medium text-gray-700">Buscar</label>
          <input
            id="text-filter"
            type="text"
            placeholder="Filtrar por cualquier campo..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mt-1 p-2 border border-gray-300 rounded-md w-full bg-white"
          />
        </div>
        <div className="flex-grow">
          <label htmlFor="start-date" className="text-sm font-medium text-gray-700">Fecha Inicial</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 p-2 border border-gray-300 rounded-md w-full bg-white"
          />
        </div>
        <div className="flex-grow">
          <label htmlFor="end-date" className="text-sm font-medium text-gray-700">Fecha Final</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 p-2 border border-gray-300 rounded-md w-full bg-white"
          />
        </div>
        <button
          onClick={handleClearFilters}
          className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 h-[42px]"
        >
          Limpiar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map(({ key, label, className }) => (
                <th key={key} scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className || ''}`}>
                  <button onClick={() => requestSort(key)} className="flex items-center">
                    {label}
                    {getSortIcon(key)}
                  </button>
                </th>
              ))}
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.fecha}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.salon}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.compania}</td>
                <td className="px-6 py-4 whitespace-normal text-sm text-gray-700 break-words">{item.item}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.tipo}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.valor.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.cantidad}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{item.total.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100" title="Editar">
                      <EditIcon className="h-5 w-5"/>
                    </button>
                    <button onClick={() => item.id && onDelete(item.id)} className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100" title="Eliminar">
                      <TrashIcon className="h-5 w-5"/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedData.length === 0 && <p className="text-center text-gray-500 py-6">No se encontraron registros con los filtros aplicados.</p>}
      
      {totalPages > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Mostrando <span className="font-medium">{Math.min((currentPage - 1) * RECORDS_PER_PAGE + 1, sortedData.length)}</span> a <span className="font-medium">{Math.min(currentPage * RECORDS_PER_PAGE, sortedData.length)}</span> de <span className="font-medium">{sortedData.length}</span> registros
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataTable;
