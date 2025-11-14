import React, { useState, useEffect } from 'react';
import type { Registro } from '../types';

type FormData = Omit<Registro, 'id' | 'user_id' | 'created_at'>;

interface DataFormProps {
  onSubmit: (registro: Omit<Registro, 'user_id' | 'created_at'>) => void;
  onCancel: () => void;
  initialData?: Partial<Registro> | null;
}

const DataForm: React.FC<DataFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const isEditing = !!initialData?.id;
  const isNewItemForEvent = !!initialData && !initialData.id;

  const getInitialState = (): FormData => {
    if (isEditing || isNewItemForEvent) {
      return {
        fecha: initialData!.fecha!,
        beo: initialData!.beo || '',
        salon: initialData!.salon!,
        compania: initialData!.compania!,
        item: initialData!.item || '',
        tipo: initialData!.tipo || 'Venta',
        valor: initialData!.valor ?? 0,
        cantidad: initialData!.cantidad ?? 1,
        total: initialData!.total ?? 0,
      };
    }
    return {
      fecha: new Date().toISOString().split('T')[0],
      beo: '',
      salon: '',
      compania: '',
      item: '',
      tipo: 'Venta',
      valor: 0,
      cantidad: 1,
      total: 0,
    };
  };

  const [formData, setFormData] = useState<FormData>(getInitialState());

  useEffect(() => {
    setFormData(getInitialState());
  }, [initialData]);
  
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      total: prev.valor * prev.cantidad,
    }));
  }, [formData.valor, formData.cantidad]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'valor' || name === 'cantidad') ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fecha || !formData.salon || !formData.compania || !formData.item || !formData.tipo || formData.valor < 0 || formData.cantidad <= 0) {
      alert('Por favor, completa todos los campos requeridos con valores válidos (valor no puede ser negativo y cantidad debe ser mayor a 0).');
      return;
    }
    onSubmit({ ...formData, id: initialData?.id });
  };

  const formTitle = isEditing ? 'Editar Ítem' : isNewItemForEvent ? 'Añadir Ítem al Evento' : 'Crear Nuevo Evento';
  const submitButtonText = isEditing ? 'Guardar Cambios' : isNewItemForEvent ? 'Añadir Ítem' : 'Crear Evento y Guardar';

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{formTitle}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Input fields */}
            <div className="col-span-1">
                <label htmlFor="fecha" className="block text-sm font-medium text-gray-700">Fecha</label>
                <input type="date" id="fecha" name="fecha" value={formData.fecha} onChange={handleChange} required disabled={isNewItemForEvent} className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white disabled:bg-gray-100"/>
            </div>
            <div className="col-span-1">
                <label htmlFor="beo" className="block text-sm font-medium text-gray-700">Código Evento (BEO)</label>
                <input type="text" id="beo" name="beo" value={formData.beo} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"/>
            </div>
            <div className="col-span-1">
                <label htmlFor="salon" className="block text-sm font-medium text-gray-700">Salón</label>
                <input type="text" id="salon" name="salon" value={formData.salon} onChange={handleChange} required disabled={isNewItemForEvent} className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white disabled:bg-gray-100"/>
            </div>
            <div className="col-span-1">
                <label htmlFor="compania" className="block text-sm font-medium text-gray-700">Compañía</label>
                <input type="text" id="compania" name="compania" value={formData.compania} onChange={handleChange} required disabled={isNewItemForEvent} className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white disabled:bg-gray-100"/>
            </div>
            <div className="col-span-1 md:col-span-2">
                <label htmlFor="item" className="block text-sm font-medium text-gray-700">Ítem</label>
                <input type="text" id="item" name="item" value={formData.item} onChange={handleChange} required className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"/>
            </div>
            <div className="col-span-1">
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">Tipo</label>
                <select id="tipo" name="tipo" value={formData.tipo} onChange={handleChange} required className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white">
                    <option value="Venta">Venta</option>
                    <option value="SubArriendo">SubArriendo</option>
                    <option value="Estándar">Estándar</option>
                    <option value="Adicional">Adicional</option>
                </select>
            </div>
            <div className="col-span-1">
                <label htmlFor="valor" className="block text-sm font-medium text-gray-700">Valor</label>
                <input type="number" id="valor" name="valor" value={formData.valor} onChange={handleChange} required min="0" step="any" className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"/>
            </div>
            <div className="col-span-1">
                <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700">Cantidad</label>
                <input type="number" id="cantidad" name="cantidad" value={formData.cantidad} onChange={handleChange} required min="1" className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"/>
            </div>
            <div className="col-span-1">
                <label htmlFor="total" className="block text-sm font-medium text-gray-700">Total</label>
                <input type="text" id="total" name="total" value={formData.total.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })} readOnly className="mt-1 block w-full rounded-md border border-gray-300 sm:text-sm bg-gray-100 cursor-not-allowed"/>
            </div>
            <div className="col-span-full flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Cancelar
                </button>
                <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    {submitButtonText}
                </button>
            </div>
        </form>
    </div>
  );
};

export default DataForm;