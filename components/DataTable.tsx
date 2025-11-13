import React, { useState, useMemo } from 'react';
import type { Registro } from '../types';
import { SortAscIcon, SortDescIcon, TrashIcon, EditIcon } from './ui/Icons';

interface DataTableProps {
  data: Registro[];
  onDelete: (id: number) => void;
  onEdit: (registro: Registro) => void;
}

type SortKey = keyof Registro;

const DataTable: React.FC<DataTableProps> = ({ data, onDelete, onEdit }) => {
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'fecha', direction: 'descending' });

  const sortedAndFilteredData = useMemo(() => {
    let filteredData = data.filter(item =>
      Object.values(item).some(val =>
        String(val).toLowerCase().includes(filter.toLowerCase())
      )
    );

    if (sortConfig !== null) {
      filteredData.sort((a, b) => {
        if (a[sortConfig.key]! < b[sortConfig.key]!) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key]! > b[sortConfig.key]!) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return filteredData;
  }, [data, filter, sortConfig]);

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
        <input
            type="text"
            placeholder="Filtrar registros..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mb-4 p-2 border border-gray-300 rounded-md w-full sm:w-1/3 bg-white"
        />
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
                    {sortedAndFilteredData.map((item) => (
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
        {sortedAndFilteredData.length === 0 && <p className="text-center text-gray-500 py-6">No se encontraron registros.</p>}
    </div>
  );
};

export default DataTable;