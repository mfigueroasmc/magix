import React, { useState, useMemo, useEffect } from 'react';
import type { Registro } from '../types';
import { SortAscIcon, SortDescIcon, TrashIcon, EditIcon, ChevronDownIcon, ChevronRightIcon, PlusCircleIcon } from './ui/Icons';

interface EventData {
  key: string;
  fecha: string;
  salon: string;
  compania: string;
  beo?: string;
  items: Registro[];
  total: number;
}

interface DataTableProps {
  events: EventData[];
  onDelete: (id: number) => void;
  onEdit: (registro: Registro) => void;
  onAddItem: (eventData: Pick<Registro, 'fecha' | 'salon' | 'compania' | 'beo'>) => void;
}

type SortKey = keyof Omit<EventData, 'key' | 'items'> | 'itemsCount';
const RECORDS_PER_PAGE = 10;

const DataTable: React.FC<DataTableProps> = ({ events, onDelete, onEdit, onAddItem }) => {
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'fecha', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const toggleEventExpansion = (eventKey: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventKey)) {
        newSet.delete(eventKey);
      } else {
        newSet.add(eventKey);
      }
      return newSet;
    });
  };

  const filteredData = useMemo(() => {
    let items = events;

    if (startDate || endDate) {
        items = items.filter(event => {
            const eventDate = event.fecha;
            const startMatch = startDate ? eventDate >= startDate : true;
            const endMatch = endDate ? eventDate <= endDate : true;
            return startMatch && endMatch;
        });
    }

    if (filter) {
        items = items.filter(event =>
            [event.salon, event.compania, event.beo, ...event.items.map(i => i.item)].some(val =>
                String(val).toLowerCase().includes(filter.toLowerCase())
            )
        );
    }
    
    return items;
  }, [events, filter, startDate, endDate]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key;
        let aValue: string | number | undefined;
        let bValue: string | number | undefined;

        if (key === 'itemsCount') {
          aValue = a.items.length;
          bValue = b.items.length;
        } else {
          aValue = a[key as keyof Omit<EventData, 'key' | 'items'>];
          bValue = b[key as keyof Omit<EventData, 'key' | 'items'>];
        }
        
        if (aValue === undefined || bValue === undefined) return 0;

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, startDate, endDate, sortConfig]);

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
    return sortConfig.direction === 'ascending' ? <SortAscIcon className="h-4 w-4 ml-1" /> : <SortDescIcon className="h-4 w-4 ml-1" />;
  };

  const eventHeaders: { key: SortKey; label: string; className?: string }[] = [
    { key: 'fecha', label: 'Fecha' },
    { key: 'salon', label: 'Salón' },
    { key: 'compania', label: 'Compañía' },
    { key: 'beo', label: 'BEO' },
    { key: 'itemsCount', label: 'N° Ítems' },
    { key: 'total', label: 'Total Evento' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-4 items-end">
        <div className="flex-grow">
          <label htmlFor="text-filter" className="text-sm font-medium text-gray-700">Buscar</label>
          <input
            id="text-filter"
            type="text"
            placeholder="Filtrar eventos o ítems..."
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
              <th scope="col" className="w-12 px-6 py-3"></th>
              {eventHeaders.map(({ key, label, className }) => (
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
            {paginatedData.map((event) => {
              const isExpanded = expandedEvents.has(event.key);
              return (
              <React.Fragment key={event.key}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <button onClick={() => toggleEventExpansion(event.key)} className="p-1 rounded-full hover:bg-gray-200" aria-expanded={isExpanded} aria-controls={`items-${event.key}`}>
                      {isExpanded ? <ChevronDownIcon className="h-5 w-5 text-gray-600"/> : <ChevronRightIcon className="h-5 w-5 text-gray-500"/>}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{event.fecha}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{event.salon}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{event.compania}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.beo || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{event.items.length}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{event.total.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button onClick={() => onAddItem({ fecha: event.fecha, salon: event.salon, compania: event.compania, beo: event.beo })} className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-100 flex items-center gap-1" title="Añadir Ítem">
                      <PlusCircleIcon className="h-6 w-6"/>
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr id={`items-${event.key}`}>
                    <td colSpan={8} className="p-0 border-b-2 border-gray-300">
                      <div className="p-4 bg-gray-50">
                        <table className="min-w-full divide-y divide-gray-300 rounded-lg overflow-hidden shadow-sm">
                          <thead className="bg-gray-100">
                             <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">Ítem</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Neto</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total c/IVA</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {event.items.map(item => (
                              <tr key={item.id}>
                                <td className="px-4 py-3 whitespace-normal text-sm text-gray-700 break-words">{item.item}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.tipo}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.valor.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.cantidad}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{item.total.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">{(item.total * 1.19).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
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
                           <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                                <tr>
                                    <td colSpan={4} className="px-4 py-2 text-right font-semibold text-gray-600 text-sm">Resumen del Evento:</td>
                                    <td className="px-4 py-2 font-bold text-gray-800 text-sm">
                                        {event.total.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                                        <span className="block text-xs font-normal text-gray-500">Subtotal Neto</span>
                                    </td>
                                    <td className="px-4 py-2 font-bold text-blue-700 text-sm">
                                        {(event.total * 1.19).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                                         <span className="block text-xs font-normal text-gray-500">
                                            IVA (19%): {(event.total * 0.19).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2"></td>
                                </tr>
                            </tfoot>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )})}
          </tbody>
        </table>
      </div>

      {sortedData.length === 0 && <p className="text-center text-gray-500 py-6">No se encontraron eventos con los filtros aplicados.</p>}
      
      {totalPages > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Mostrando <span className="font-medium">{Math.min((currentPage - 1) * RECORDS_PER_PAGE + 1, sortedData.length)}</span> a <span className="font-medium">{Math.min(currentPage * RECORDS_PER_PAGE, sortedData.length)}</span> de <span className="font-medium">{sortedData.length}</span> eventos
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