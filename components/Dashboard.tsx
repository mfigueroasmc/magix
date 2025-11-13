
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import type { Registro } from '../types';
import DataForm from './DataForm';
import DataTable from './DataTable';
import SmartDashboard from './SmartDashboard';
import { exportToExcel } from '../utils/exportToExcel';
import { exportSummaryToExcel } from '../utils/exportSummaryToExcel';
import { parseExcelFile } from '../utils/importFromExcel';
import { MagixLogo, LogoutIcon, AddIcon, ChartIcon, TableIcon, DownloadIcon, ImportIcon, SummaryIcon } from './ui/Icons';
import Chatbot from './Chatbot';

interface DashboardProps {
  session: Session;
}

const Dashboard: React.FC<DashboardProps> = ({ session }) => {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'charts'>('table');
  const [showForm, setShowForm] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState<Registro | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('registros')
        .select('*')
        .order('fecha', { ascending: false });
      
      if (error) throw error;
      setRegistros(data || []);
    } catch (error: any) {
      setError('Error al cargar los datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  const handleOpenFormForCreate = () => {
    setEditingRegistro(null);
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
      await fetchRegistros(); // Refresh data
    } catch (error: any) {
      setError('Error al guardar el registro: ' + error.message);
    }
  };


  const deleteRegistro = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
        try {
            const { error } = await supabase.from('registros').delete().match({ id });
            if (error) throw error;
            setRegistros(prev => prev.filter(r => r.id !== id));
        } catch (error: any) {
            setError('Error al eliminar el registro: ' + error.message);
        }
    }
  };

  const handleExport = () => {
    exportToExcel(registros, `registros_${new Date().toISOString().split('T')[0]}`);
  };

  const handleSummaryExport = () => {
    exportSummaryToExcel(registros, `resumen_mensual_${new Date().toISOString().split('T')[0]}`);
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
        await fetchRegistros();
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
        
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-700">Resumen General</h2>
                    <p className="text-gray-500">Total de registros: {registros.length}</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                        Total General: {totals.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx, .xls, .csv" className="hidden" disabled={isImporting}/>
                    <button onClick={triggerFileSelect} disabled={isImporting} className="flex items-center gap-2 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-300">
                        <ImportIcon className="h-5 w-5"/>
                        {isImporting ? 'Importando...' : 'Importar'}
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                        <DownloadIcon className="h-5 w-5"/>
                        Exportar
                    </button>
                    <button onClick={handleSummaryExport} className="flex items-center gap-2 bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors">
                        <SummaryIcon className="h-5 w-5"/>
                        Exportar Resumen
                    </button>
                    <button onClick={handleOpenFormForCreate} className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                        <AddIcon className="h-5 w-5"/>
                        Nuevo Registro
                    </button>
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
              La plataforma combina simplicidad y potencia analítica, entregando una experiencia minimalista y eficiente. A través de su dashboard interactivo, los usuarios pueden:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li>Consultar y filtrar registros de manera dinámica.</li>
              <li>Analizar totales, promedios y tendencias mediante gráficos inteligentes.</li>
              <li>Exportar datos e informes consolidados en formato Excel.</li>
              <li>Mantener control total sobre los valores, ítems, compañías y salones utilizados.</li>
            </ul>
            <p>
              Cada componente de Magix Data Analyzer ha sido optimizado para ofrecer rendimiento, claridad visual y usabilidad, adaptándose tanto a equipos administrativos como a profesionales que requieren una herramienta confiable para la toma de decisiones basada en datos.
            </p>
          </div>
        </div>

        {showForm && (
          <div className="mb-6">
            <DataForm onSubmit={handleSaveRegistro} onCancel={handleCloseForm} initialData={editingRegistro}/>
          </div>
        )}

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
            <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setView('table')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${view === 'table' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex items-center gap-2`}>
                        <TableIcon className="h-5 w-5"/>
                        <span>Tabla de Datos</span>
                    </button>
                    <button onClick={() => setView('charts')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${view === 'charts' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} flex items-center gap-2`}>
                       <ChartIcon className="h-5 w-5"/>
                       <span>Dashboard Inteligente</span>
                    </button>
                </nav>
            </div>
            
            {loading ? <div className="text-center py-10">Cargando datos...</div> : 
              view === 'table' ? <DataTable data={registros} onDelete={deleteRegistro} onEdit={handleOpenFormForEdit} /> : <SmartDashboard data={registros} />}
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