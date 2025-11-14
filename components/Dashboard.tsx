import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import type { Registro, Articulo, Reserva } from '../types';
import DataForm from './DataForm';
import DataTable from './DataTable';
import SmartDashboard from './SmartDashboard';
import Inventory from './Inventory';
import Events from './Events';
import { exportToExcel } from '../utils/exportToExcel';
import { exportSummaryToExcel } from '../utils/exportSummaryToExcel';
import { parseExcelFile } from '../utils/importFromExcel';
import { MagixLogo, LogoutIcon, AddIcon, ChartIcon, TableIcon, DownloadIcon, ImportIcon, SummaryIcon, CalendarIcon, InventoryIcon, BriefcaseIcon } from './ui/Icons';
import Chatbot from './Chatbot';

interface DashboardProps {
  session: Session;
}

const Dashboard: React.FC<DashboardProps> = ({ session }) => {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'charts' | 'table' | 'inventory' | 'events'>('charts');
  const [showForm, setShowForm] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState<Partial<Registro> | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
        const [registrosResult, articulosResult, reservasResult] = await Promise.all([
            supabase.from('registros').select('*').order('fecha', { ascending: false }),
            // Fix: Explicitly cast the data from Supabase to ensure it conforms to the Articulo type.
            supabase.from('articulos').select('*').order('grupo').order('subgrupo').order('descripcion'),
            supabase.from('reservas').select('*')
        ]);

        if (registrosResult.error) throw new Error(`Al cargar registros: ${registrosResult.error.message}`);
        if (articulosResult.error) throw new Error(`Al cargar artículos: ${articulosResult.error.message}`);
        if (reservasResult.error) throw new Error(`Al cargar reservas: ${reservasResult.error.message}`);

        setRegistros(registrosResult.data || []);
        setArticulos((articulosResult.data as Articulo[]) || []);
        setReservas(reservasResult.data || []);

    } catch (error: any) {
      setError('Error al cargar los datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const events = useMemo(() => {
    const eventMap = new Map<string, Registro[]>();
    registros.forEach(r => {
      const key = `${r.fecha}|${r.salon}|${r.compania}`;
      if (!eventMap.has(key)) {
        eventMap.set(key, []);
      }
      eventMap.get(key)!.push(r);
    });
    return Array.from(eventMap.entries()).map(([key, items]) => {
      const [fecha, salon, compania] = key.split('|');
      return {
        key,
        fecha,
        salon,
        compania,
        beo: items[0]?.beo, // Assume BEO is same for the event
        items,
        total: items.reduce((sum, item) => sum + item.total, 0),
      };
    }).sort((a, b) => b.fecha.localeCompare(a.fecha)); // Sort events by date descending
  }, [registros]);

  const handleOpenFormForCreate = () => {
    setEditingRegistro(null);
    setShowForm(true);
  };
  
  const handleAddItemToEvent = (eventData: Pick<Registro, 'fecha' | 'salon' | 'compania' | 'beo'>) => {
    setEditingRegistro({
      ...eventData,
      item: '',
      tipo: 'Venta',
      valor: 0,
      cantidad: 1,
      total: 0,
    });
    setShowForm(true);
  };

  const handleOpenFormForEdit = (registro: Registro) => {
    setEditingRegistro(registro);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRegistro(null);
  };

  const handleSaveRegistro = async (registro: Omit<Registro, 'user_id' | 'created_at'>) => {
    try {
      const { id, ...dataToSave } = registro;

      const payload = {
        ...dataToSave,
        user_id: session.user.id,
      };

      let error;
      if (id) {
        // Update
        const { error: updateError } = await supabase
          .from('registros')
          .update(payload)
          .eq('id', id);
        error = updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('registros')
          .insert(payload);
        error = insertError;
      }
      
      if (error) throw error;
      
      handleCloseForm();
      await fetchAllData(); // Refresh data
    } catch (error: any) {
      setError('Error al guardar el registro: ' + error.message);
    }
  };

  const deleteRegistro = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este ítem?')) {
        try {
            const { error } = await supabase.from('registros').delete().match({ id });
            if (error) throw error;
            await fetchAllData();
        } catch (error: any) {
            setError('Error al eliminar el ítem: ' + error.message);
        }
    }
  };
  
  const handleSaveOrUpdateReservation = async (reservation: Omit<Reserva, 'user_id' | 'created_at'>) => {
    try {
      const payload = {
        ...reservation,
        user_id: session.user.id,
      };
      const { error } = await supabase.from('reservas').upsert(payload).select();
      if (error) throw error;
      await fetchAllData();
    } catch (error: any) {
      setError('Error al guardar la reserva: ' + error.message);
    }
  };

  const handleDeleteReservation = async (id: number) => {
    if (window.confirm('¿Confirmas que quieres eliminar esta reserva?')) {
      try {
        const { error } = await supabase.from('reservas').delete().match({ id });
        if (error) throw error;
        await fetchAllData();
      } catch (error: any) {
        setError('Error al eliminar la reserva: ' + error.message);
      }
    }
  };

  const filteredForExport = useMemo(() => {
    if (!exportStartDate && !exportEndDate) return registros;
    return registros.filter(r => {
        const itemDate = r.fecha;
        const startMatch = exportStartDate ? itemDate >= exportStartDate : true;
        const endMatch = exportEndDate ? itemDate <= exportEndDate : true;
        return startMatch && endMatch;
    });
  }, [registros, exportStartDate, exportEndDate]);

  const handleExport = () => {
    exportToExcel(filteredForExport, `registros_${new Date().toISOString().split('T')[0]}`);
  };

  const handleSummaryExport = () => {
    exportSummaryToExcel(filteredForExport, `resumen_mensual_${new Date().toISOString().split('T')[0]}`);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);
    setImportMessage(null);

    try {
        const parsedData = await parseExcelFile(file);
        
        if (parsedData.length === 0) {
            throw new Error("El archivo está vacío o no tiene el formato correcto.");
        }

        const dataToInsert = parsedData.map(registro => ({
            ...registro,
            user_id: session.user.id,
        }));
        
        const { error: insertError } = await supabase.from('registros').insert(dataToInsert);

        if (insertError) {
            throw insertError;
        }

        setImportMessage(`${parsedData.length} registros importados exitosamente.`);
        await fetchAllData();
    } catch (err: any) {
        setError(`Error al importar: ${err.message}`);
    } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const totals = registros.reduce((acc, curr) => acc + curr.total, 0);

  const renderContent = () => {
    if (loading) {
        return <div className="text-center py-10">Cargando datos...</div>;
    }
    switch(view) {
        case 'charts':
            return <SmartDashboard data={registros} />;
        case 'table':
            return <DataTable events={events} onDelete={deleteRegistro} onEdit={handleOpenFormForEdit} onAddItem={handleAddItemToEvent} />;
        case 'inventory':
            return <Inventory session={session} events={events} articulos={articulos} reservas={reservas} refetchData={fetchAllData} />;
        case 'events':
            return <Events
                events={events}
                articulos={articulos}
                reservas={reservas}
                onAddItem={handleAddItemToEvent}
                onEditItem={handleOpenFormForEdit}
                onDeleteItem={deleteRegistro}
                onSaveReservation={handleSaveOrUpdateReservation}
                onDeleteReservation={handleDeleteReservation}
            />;
        default:
            return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
                <div className="flex items-center gap-3">
                    <MagixLogo className="h-8 w-auto"/>
                    <h1 className="text-2xl font-bold text-gray-800">Magix Data Analyzer</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 hidden sm:block">{session.user.email}</span>
                    <button onClick={() => supabase.auth.signOut()} className="p-2 rounded-full hover:bg-gray-200" title="Cerrar sesión">
                        <LogoutIcon className="h-5 w-5 text-gray-600" />
                    </button>
                </div>
            </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
        {importMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{importMessage}</div>}
        
        { view !== 'inventory' && view !== 'events' && (
            <>
                <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-700">Resumen General</h2>
                            <p className="text-gray-500">Total de eventos: {events.length} | Total de ítems: {registros.length}</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">
                                Total General: {totals.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                            <button onClick={handleOpenFormForCreate} className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                                <AddIcon className="h-5 w-5"/>
                                Nuevo Evento
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx, .xls, .csv" className="hidden" disabled={isImporting}/>
                            <button onClick={triggerFileSelect} disabled={isImporting} className="flex items-center gap-2 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-300">
                                <ImportIcon className="h-5 w-5"/>
                                {isImporting ? 'Importando...' : 'Importar'}
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-md font-semibold text-gray-600 flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5"/>
                                Opciones de Exportación
                            </h3>
                            <p className="text-sm text-gray-500">Filtrados: {filteredForExport.length} de {registros.length} registros.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div>
                                <label htmlFor="export-start-date" className="text-sm font-medium text-gray-700">Fecha Inicial</label>
                                <input type="date" id="export-start-date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md w-full bg-white"/>
                            </div>
                            <div>
                                <label htmlFor="export-end-date" className="text-sm font-medium text-gray-700">Fecha Final</label>
                                <input type="date" id="export-end-date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md w-full bg-white"/>
                            </div>
                             <div className="flex gap-2 col-span-1 lg:col-span-2 justify-end">
                                 <button onClick={() => { setExportStartDate(''); setExportEndDate(''); }} className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 h-[42px]">
                                    Limpiar Filtros
                                </button>
                                <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors h-[42px]">
                                    <DownloadIcon className="h-5 w-5"/>
                                    Exportar
                                </button>
                                <button onClick={handleSummaryExport} className="flex items-center gap-2 bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors h-[42px]">
                                    <SummaryIcon className="h-5 w-5"/>
                                    Exportar Resumen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
                  <h2 className="text-xl font-semibold text-gray-700 mb-4">Acerca de Magix Data Analyzer</h2>
                  <div className="text-sm text-gray-600 space-y-3">
                    <p>
                      <strong>Magix Data Analyzer</strong> es una aplicación web diseñada para la gestión inteligente y el análisis de datos operativos en tiempo real. Su arquitectura moderna permite importar, registrar y visualizar información de forma ágil y segura, integrándose directamente con Supabase para ofrecer almacenamiento confiable, autenticación de usuarios y sincronización continua.
                    </p>
                     <p>
                        Ahora con su nuevo módulo de <strong>Inventario</strong>, la plataforma no solo analiza el rendimiento de los eventos, sino que también permite llevar un control detallado del equipamiento, gestionar stock y realizar reservas de artículos para cada evento, centralizando toda la operativa en un solo lugar.
                    </p>
                  </div>
                </div>
            </>
        )}
        
        {showForm && (
          <div className="mb-6">
            <DataForm onSubmit={handleSaveRegistro} onCancel={handleCloseForm} initialData={editingRegistro}/>
          </div>
        )}

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setView('charts')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${view === 'charts' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex items-center gap-2`}>
                       <ChartIcon className="h-5 w-5"/>
                       <span>Dashboard Inteligente</span>
                    </button>
                     <button onClick={() => setView('events')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${view === 'events' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex items-center gap-2`}>
                        <BriefcaseIcon className="h-5 w-5"/>
                        <span>Eventos</span>
                    </button>
                    <button onClick={() => setView('table')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${view === 'table' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex items-center gap-2`}>
                        <TableIcon className="h-5 w-5"/>
                        <span>Tabla de Datos</span>
                    </button>
                    <button onClick={() => setView('inventory')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${view === 'inventory' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex items-center gap-2`}>
                        <InventoryIcon className="h-5 w-5"/>
                        <span>Inventario</span>
                    </button>
                </nav>
            </div>
            
            {renderContent()}
        </div>
      </main>
      <Chatbot />
      <footer className="text-center py-4 text-sm text-gray-500 border-t border-gray-200 mt-8">
        &copy; {new Date().getFullYear()} @leoJeks
      </footer>
    </div>
  );
};

export default Dashboard;