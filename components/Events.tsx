import React, { useState, useMemo } from 'react';
import type { Registro, Articulo, Reserva } from '../types';
import { ChevronDownIcon, ChevronRightIcon, BriefcaseIcon, AddIcon, EditIcon, TrashIcon } from './ui/Icons';

interface EventData {
  key: string;
  fecha: string;
  salon: string;
  compania: string;
  beo?: string;
  items: Registro[];
  total: number;
}

interface ReservedItem extends Articulo {
    reserva_id: number;
    cantidad_reservada: number;
}

interface EventsProps {
  events: EventData[];
  articulos: Articulo[];
  reservas: Reserva[];
  onAddItem: (eventData: Pick<Registro, 'fecha' | 'salon' | 'compania' | 'beo'>) => void;
  onEditItem: (registro: Registro) => void;
  onDeleteItem: (id: number) => void;
  onSaveReservation: (reservation: Omit<Reserva, 'user_id' | 'created_at'>) => Promise<void>;
  onDeleteReservation: (id: number) => Promise<void>;
}

const Events: React.FC<EventsProps> = ({ events, articulos, reservas, onAddItem, onEditItem, onDeleteItem, onSaveReservation, onDeleteReservation }) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<ReservedItem | null>(null);
  const [targetEventKeyForReservation, setTargetEventKeyForReservation] = useState<string>('');

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
  
  const enrichedEvents = useMemo(() => {
    const articulosMap = new Map(articulos.map(a => [a.id, a]));
    return events.map(event => {
        const eventReservas = reservas
            .filter(r => r.evento_key === event.key)
            .map(r => {
                const articulo = articulosMap.get(r.articulo_id);
                if (articulo) {
                    return {
                        ...articulo,
                        reserva_id: r.id!,
                        cantidad_reservada: r.cantidad_reservada,
                    };
                }
                return null;
            })
            .filter((a): a is ReservedItem => a !== null);
        return {
            ...event,
            reservedItems: eventReservas,
        }
    });
  }, [events, articulos, reservas]);

  const handleOpenReservationModal = (reservation: ReservedItem | null, eventKey: string) => {
    setEditingReservation(reservation);
    setTargetEventKeyForReservation(eventKey);
    setIsReservationModalOpen(true);
  };

  const handleCloseReservationModal = () => {
      setIsReservationModalOpen(false);
      setEditingReservation(null);
      setTargetEventKeyForReservation('');
  };

  const handleSaveReservation = async (reservation: Omit<Reserva, 'user_id' | 'created_at'>) => {
      await onSaveReservation(reservation);
      handleCloseReservationModal();
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
                <BriefcaseIcon className="h-6 w-6" />
                Resumen de Eventos
            </h2>
        </div>
        <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="w-12 px-6 py-3"></th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salón</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Compañía</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código Evento (BEO)</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ítems Operación</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ítems Inventario</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {enrichedEvents.map((event) => {
                        const isExpanded = expandedEvents.has(event.key);
                        return (
                            <React.Fragment key={event.key}>
                                <tr className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <button onClick={() => toggleEventExpansion(event.key)} className="p-1 rounded-full hover:bg-gray-200" aria-expanded={isExpanded}>
                                            {isExpanded ? <ChevronDownIcon className="h-5 w-5 text-gray-600"/> : <ChevronRightIcon className="h-5 w-5 text-gray-500"/>}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{event.fecha}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{event.salon}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{event.compania}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.beo || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{event.items.length}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{event.reservedItems.length}</td>
                                </tr>
                                {isExpanded && (
                                    <tr>
                                        <td colSpan={7} className="p-0 border-b-2 border-gray-300">
                                            <div className="p-4 bg-gray-50 space-y-6">
                                                
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="font-semibold text-gray-700">Ítems Registrados (Operación)</h4>
                                                        <button onClick={() => onAddItem({ fecha: event.fecha, salon: event.salon, compania: event.compania, beo: event.beo })} className="flex items-center gap-1 text-sm bg-blue-500 text-white font-semibold py-1 px-3 rounded-lg hover:bg-blue-600 transition-colors">
                                                            <AddIcon className="h-4 w-4"/> Añadir Ítem
                                                        </button>
                                                    </div>
                                                    {event.items.length > 0 ? (
                                                        <table className="min-w-full divide-y divide-gray-300 rounded-lg overflow-hidden shadow-sm">
                                                            <thead className="bg-gray-100">
                                                                <tr>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">Ítem</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
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
                                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.cantidad}</td>
                                                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">{item.total.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</td>
                                                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">{(item.total * 1.19).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</td>
                                                                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                <button onClick={() => onEditItem(item)} className="text-blue-600 hover:text-blue-900" title="Editar"><EditIcon className="h-5 w-5"/></button>
                                                                                <button onClick={() => onDeleteItem(item.id!)} className="text-red-600 hover:text-red-900" title="Eliminar"><TrashIcon className="h-5 w-5"/></button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                            <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                                                                <tr>
                                                                    <td colSpan={3} className="px-4 py-2 text-right font-semibold text-gray-600 text-sm">Resumen del Evento:</td>
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
                                                    ) : <p className="text-sm text-gray-500 bg-white p-4 rounded-md shadow-sm">No hay ítems operativos registrados para este evento.</p>}
                                                </div>

                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="font-semibold text-gray-700">Inventario Reservado</h4>
                                                        <button onClick={() => handleOpenReservationModal(null, event.key)} className="flex items-center gap-1 text-sm bg-purple-600 text-white font-semibold py-1 px-3 rounded-lg hover:bg-purple-700 transition-colors">
                                                            <AddIcon className="h-4 w-4"/> Reservar Artículo
                                                        </button>
                                                    </div>
                                                     {event.reservedItems.length > 0 ? (
                                                        <table className="min-w-full divide-y divide-gray-300 rounded-lg overflow-hidden shadow-sm">
                                                            <thead className="bg-gray-100">
                                                                <tr>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-3/5">Descripción</th>
                                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-gray-200">
                                                                {event.reservedItems.map(item => (
                                                                    <tr key={item.reserva_id}>
                                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{item.codigo_articulo}</td>
                                                                        <td className="px-4 py-3 whitespace-normal text-sm text-gray-700 break-words">{item.descripcion}</td>
                                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">{item.cantidad_reservada}</td>
                                                                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                <button onClick={() => handleOpenReservationModal(item, event.key)} className="text-blue-600 hover:text-blue-900" title="Editar Reserva"><EditIcon className="h-5 w-5"/></button>
                                                                                <button onClick={() => onDeleteReservation(item.reserva_id)} className="text-red-600 hover:text-red-900" title="Eliminar Reserva"><TrashIcon className="h-5 w-5"/></button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    ) : <p className="text-sm text-gray-500 bg-white p-4 rounded-md shadow-sm">No hay inventario reservado para este evento.</p>}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        )
                    })}
                </tbody>
            </table>
            {enrichedEvents.length === 0 && <p className="text-center text-gray-500 py-6">No se encontraron eventos.</p>}
        </div>
        {isReservationModalOpen && (
            <ReservationModal
                eventKey={targetEventKeyForReservation}
                allArticulos={articulos}
                reservas={reservas}
                existingReservation={editingReservation}
                onSave={handleSaveReservation}
                onCancel={handleCloseReservationModal}
            />
        )}
    </div>
  );
};

const ReservationModal: React.FC<{
    eventKey: string;
    allArticulos: Articulo[];
    reservas: Reserva[];
    existingReservation: ReservedItem | null;
    onSave: (reservation: Omit<Reserva, 'user_id' | 'created_at'>) => void;
    onCancel: () => void;
}> = ({ eventKey, allArticulos, reservas, existingReservation, onSave, onCancel }) => {
    const [selectedArticuloId, setSelectedArticuloId] = useState<number | ''>(existingReservation?.id || '');
    const [quantity, setQuantity] = useState<number>(existingReservation?.cantidad_reservada || 1);
    const [filter, setFilter] = useState('');

    const availableStock = useMemo(() => {
        if (!selectedArticuloId) return 0;
        const articulo = allArticulos.find(a => a.id === selectedArticuloId);
        if (!articulo) return 0;

        const totalReservedForThisArticle = reservas
            .filter(r => r.articulo_id === selectedArticuloId && r.id !== existingReservation?.reserva_id)
            .reduce((sum, r) => sum + r.cantidad_reservada, 0);

        return articulo.en_stock - totalReservedForThisArticle;
    }, [selectedArticuloId, allArticulos, reservas, existingReservation]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedArticuloId || quantity <= 0) {
            alert('Por favor selecciona un artículo y una cantidad válida.');
            return;
        }
        if (quantity > availableStock) {
            alert(`La cantidad (${quantity}) excede el stock disponible (${availableStock}).`);
            return;
        }

        const reservationPayload: Omit<Reserva, 'user_id' | 'created_at'> = {
            id: existingReservation?.reserva_id,
            articulo_id: selectedArticuloId as number,
            evento_key: eventKey,
            cantidad_reservada: quantity,
        };
        onSave(reservationPayload);
    };

    const filteredArticulos = useMemo(() => {
      if (!filter) return allArticulos;
      return allArticulos.filter(a => 
        a.descripcion.toLowerCase().includes(filter.toLowerCase()) ||
        a.codigo_articulo.toLowerCase().includes(filter.toLowerCase())
      )
    }, [allArticulos, filter]);

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-40">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
                <form onSubmit={handleSubmit}>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{existingReservation ? 'Editar Reserva' : 'Reservar Artículo'}</h3>
                    {existingReservation && <p className="text-sm text-gray-500 mt-1 mb-4">Artículo: <strong>{existingReservation.descripcion}</strong></p>}
                    <div className="space-y-4 mt-4">
                        {!existingReservation && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Buscar y Seleccionar Artículo</label>
                                <input 
                                  type="text"
                                  placeholder="Buscar por código o descripción..."
                                  value={filter}
                                  onChange={e => setFilter(e.target.value)}
                                  className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white mb-2"
                                />
                                <select
                                    value={selectedArticuloId}
                                    onChange={e => setSelectedArticuloId(Number(e.target.value))}
                                    required
                                    className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"
                                >
                                    <option value="" disabled>-- Selecciona un artículo --</option>
                                    {filteredArticulos.map(articulo => (
                                        <option key={articulo.id} value={articulo.id}>{`${articulo.codigo_articulo} - ${articulo.descripcion}`}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Cantidad a Reservar (Disponible: {availableStock})</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={e => setQuantity(parseInt(e.target.value, 10) || 1)}
                                required
                                min="1"
                                className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"
                            />
                        </div>
                    </div>
                     <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={onCancel} className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Cancelar</button>
                        <button type="submit" className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700">
                           {existingReservation ? 'Guardar Cambios' : 'Confirmar Reserva'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default Events;