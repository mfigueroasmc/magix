import React, { useState, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import type { Articulo, Reserva } from '../types';
import { AddIcon, EditIcon, TrashIcon, InventoryIcon } from './ui/Icons';

interface InventoryProps {
  session: Session;
  events: { key: string; fecha: string; salon: string; compania: string; }[];
  articulos: Articulo[];
  reservas: Reserva[];
  refetchData: () => void;
}

const Inventory: React.FC<InventoryProps> = ({ session, events, articulos, reservas, refetchData }) => {
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingArticle, setEditingArticle] = useState<Articulo | null>(null);
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
    const [reservingArticle, setReservingArticle] = useState<Articulo | null>(null);
    const [reservationData, setReservationData] = useState({ eventKey: '', quantity: 1 });

    const handleOpenForm = (articulo: Articulo | null = null) => {
        setEditingArticle(articulo);
        setIsFormOpen(true);
    };
    
    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingArticle(null);
    };

    const handleSaveArticle = async (articuloData: Omit<Articulo, 'id' | 'user_id' | 'created_at'>) => {
        try {
            setError(null);
            const payload = { ...articuloData, user_id: session.user.id };
            let error;

            if (editingArticle?.id) {
                const { error: updateError } = await supabase.from('articulos').update(payload).eq('id', editingArticle.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase.from('articulos').insert(payload).select();
                error = insertError;
            }

            if (error) throw error;
            handleCloseForm();
            refetchData();
        } catch (error: any) {
            setError('Error al guardar el artículo: ' + error.message);
        }
    };
    
    const handleDeleteArticle = async (id: number) => {
        if(window.confirm('¿Estás seguro de que quieres eliminar este artículo? Esto también eliminará las reservas asociadas.')) {
            try {
                 setError(null);
                const { error } = await supabase.from('articulos').delete().eq('id', id);
                if(error) throw error;
                refetchData();
            } catch (error: any) {
                setError('Error al eliminar el artículo: ' + error.message);
            }
        }
    };

    const openReservationModal = (articulo: Articulo) => {
        setReservingArticle(articulo);
        setReservationData({ eventKey: events[0]?.key || '', quantity: 1});
        setIsReservationModalOpen(true);
    };
    
    const closeReservationModal = () => {
        setIsReservationModalOpen(false);
        setReservingArticle(null);
    };

    const handleSaveReservation = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if(!reservingArticle || !reservationData.eventKey || reservationData.quantity <= 0) {
            setError('Por favor, selecciona un evento y una cantidad válida.');
            return;
        }

        try {
            const payload: Omit<Reserva, 'id' | 'created_at'> = {
                articulo_id: reservingArticle.id!,
                evento_key: reservationData.eventKey,
                cantidad_reservada: reservationData.quantity,
                user_id: session.user.id
            };
            const { error } = await supabase.from('reservas').insert(payload);
            if (error) throw error;
            closeReservationModal();
            refetchData();
        } catch (error: any) {
            setError('Error al crear la reserva: ' + error.message);
        }
    };
    
    const reservationsByArticle = useMemo(() => {
        return reservas.reduce((acc, reserva) => {
            if (!acc[reserva.articulo_id]) {
                acc[reserva.articulo_id] = 0;
            }
            acc[reserva.articulo_id] += reserva.cantidad_reservada;
            return acc;
        }, {} as Record<number, number>);
    }, [reservas]);


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
                    <InventoryIcon className="h-6 w-6" />
                    Gestión de Inventario
                </h2>
                <button
                    onClick={() => handleOpenForm()}
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <AddIcon className="h-5 w-5" />
                    Añadir Artículo
                </button>
            </div>
            
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}

            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grupo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subgrupo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Descripción</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Reservado</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Disponible</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {articulos.map(articulo => {
                            const reservedCount = reservationsByArticle[articulo.id!] || 0;
                            const availableCount = articulo.en_stock - reservedCount;
                            return(
                                <tr key={articulo.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{articulo.codigo_articulo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{articulo.grupo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{articulo.subgrupo}</td>
                                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 break-words">{articulo.descripcion}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-800">{articulo.en_stock}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-orange-600">{reservedCount}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-center font-semibold ${availableCount < 0 ? 'text-red-600' : 'text-green-600'}`}>{availableCount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => openReservationModal(articulo)} className="text-purple-600 hover:text-purple-900" title="Reservar">Reservar</button>
                                            <button onClick={() => handleOpenForm(articulo)} className="text-blue-600 hover:text-blue-900" title="Editar"><EditIcon className="h-5 w-5"/></button>
                                            <button onClick={() => handleDeleteArticle(articulo.id!)} className="text-red-600 hover:text-red-900" title="Eliminar"><TrashIcon className="h-5 w-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                 {articulos.length === 0 && <p className="text-center text-gray-500 py-6">No hay artículos en el inventario. ¡Añade el primero!</p>}
            </div>

            {isFormOpen && <ArticleForm initialData={editingArticle} onSubmit={handleSaveArticle} onCancel={handleCloseForm} />}
            {isReservationModalOpen && reservingArticle && <ReservationModal article={reservingArticle} events={events} onSave={handleSaveReservation} onCancel={closeReservationModal} reservationData={reservationData} setReservationData={setReservationData} />}
        </div>
    );
};

// Sub-componente para el formulario de Artículo
const ArticleForm: React.FC<{ initialData: Articulo | null; onSubmit: (data: any) => void; onCancel: () => void; }> = ({ initialData, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        codigo_articulo: initialData?.codigo_articulo || '',
        grupo: initialData?.grupo || '',
        subgrupo: initialData?.subgrupo || '',
        descripcion: initialData?.descripcion || '',
        en_stock: initialData?.en_stock || 0,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'en_stock' ? parseInt(value, 10) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
       <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-40" id="my-modal">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{initialData ? 'Editar Artículo' : 'Nuevo Artículo'}</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Código de Artículo</label>
                            <input type="text" name="codigo_articulo" value={formData.codigo_articulo} onChange={handleChange} required className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">En Stock</label>
                            <input type="number" name="en_stock" value={formData.en_stock} onChange={handleChange} required min="0" className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Grupo</label>
                            <input type="text" name="grupo" value={formData.grupo} onChange={handleChange} required className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Subgrupo</label>
                            <input type="text" name="subgrupo" value={formData.subgrupo} onChange={handleChange} required className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Descripción</label>
                            <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} required rows={3} className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white" />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2">
                            <button type="button" onClick={onCancel} className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Cancelar</button>
                            <button type="submit" className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Sub-componente para el modal de Reserva
const ReservationModal: React.FC<{ article: Articulo, events: any[], onSave: (e: React.FormEvent) => void, onCancel: () => void, reservationData: any, setReservationData: any }> = ({ article, events, onSave, onCancel, reservationData, setReservationData }) => {
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-40">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
                <form onSubmit={onSave}>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Reservar Artículo</h3>
                    <p className="text-sm text-gray-500 mt-1 mb-4">Artículo: <strong>{article.descripcion}</strong> (Stock: {article.en_stock})</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Seleccionar Evento</label>
                            <select
                                value={reservationData.eventKey}
                                onChange={e => setReservationData({ ...reservationData, eventKey: e.target.value })}
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"
                            >
                                {events.length > 0 ? events.map(event => (
                                    <option key={event.key} value={event.key}>{`${event.fecha} - ${event.salon} - ${event.compania}`}</option>
                                )) : <option disabled>No hay eventos para seleccionar</option>}
                            </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Cantidad a Reservar</label>
                            <input
                                type="number"
                                value={reservationData.quantity}
                                onChange={e => setReservationData({ ...reservationData, quantity: parseInt(e.target.value, 10) || 1 })}
                                required
                                min="1"
                                max={article.en_stock}
                                className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"
                            />
                        </div>
                    </div>
                     <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={onCancel} className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Cancelar</button>
                        <button type="submit" className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700">Confirmar Reserva</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Inventory;