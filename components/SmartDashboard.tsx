import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import type { Registro } from '../types';
import { DollarSignIcon, BuildingIcon, UsersIcon, CalendarIcon, AnalyticsIcon } from './ui/Icons';

interface SmartDashboardProps {
  data: Registro[];
}

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
const formatCompactCurrency = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', notation: 'compact' }).format(value);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-2 border border-gray-300 rounded shadow-lg text-sm">
                <p className="font-bold">{label}</p>
                <p className="text-blue-600">{`Total: ${formatCurrency(payload[0].value)}`}</p>
            </div>
        );
    }
    return null;
};

const KpiCard: React.FC<{ title: string; value: string; icon: React.ReactNode; insight?: string; insightColor?: string; }> = ({ title, value, icon, insight, insightColor = 'text-gray-500' }) => (
    <div className="bg-white p-4 rounded-lg shadow-md flex flex-col justify-between border border-gray-200">
        <div>
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">{title}</h3>
                {icon}
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-2">{value}</p>
        </div>
        {insight && <p className={`text-xs mt-2 ${insightColor}`}>{insight}</p>}
    </div>
);


const SmartDashboard: React.FC<SmartDashboardProps> = ({ data }) => {
    const [activeTab, setActiveTab] = useState('temporal');
    
    const currentYear = new Date().getFullYear();
    const defaultStartDate = `${currentYear}-01-01`;
    const defaultEndDate = `${currentYear}-12-31`;

    const [startDate, setStartDate] = useState(defaultStartDate);
    const [endDate, setEndDate] = useState(defaultEndDate);
    const [filteredData, setFilteredData] = useState<Registro[]>([]);

    const handleApplyFilter = useCallback(() => {
        const newFilteredData = data.filter(item => {
            // Use string comparison for 'YYYY-MM-DD' format
            return item.fecha >= startDate && item.fecha <= endDate;
        });
        setFilteredData(newFilteredData);
    }, [data, startDate, endDate]);
    
    useEffect(() => {
        // Apply initial filter when component mounts
        handleApplyFilter();
    }, [data, handleApplyFilter]);

    const kpis = useMemo(() => {
        if (filteredData.length === 0) return null;
        const totalFacturado = filteredData.reduce((acc, curr) => acc + curr.total, 0);
        const promedioValor = filteredData.reduce((acc, curr) => acc + curr.valor, 0) / filteredData.length;
        const companiasUnicas = new Set(filteredData.map(d => d.compania)).size;
        const salonesUnicos = new Set(filteredData.map(d => d.salon)).size;

        const dateRange = `${new Date(startDate + 'T00:00:00').toLocaleDateString('es-CL')} - ${new Date(endDate + 'T00:00:00').toLocaleDateString('es-CL')}`;

        // Monthly variation logic now uses filteredData
        const totalsByMonth: { [key: string]: number } = filteredData.reduce((acc, curr) => {
            const monthKey = curr.fecha.substring(0, 7); // YYYY-MM
            acc[monthKey] = (acc[monthKey] || 0) + curr.total;
            return acc;
        }, {});
        const sortedMonths = Object.keys(totalsByMonth).sort().reverse();
        let monthlyVariation = 'N/A';
        let variationColor = 'text-gray-500';
        if (sortedMonths.length > 1) {
            const lastMonthTotal = totalsByMonth[sortedMonths[0]];
            const prevMonthTotal = totalsByMonth[sortedMonths[1]];
            const variation = ((lastMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
            monthlyVariation = `${variation > 0 ? '▲' : '▼'} ${variation.toFixed(1)}% vs mes anterior`;
            variationColor = variation > 0 ? 'text-green-600' : 'text-red-600';
        }

        return { totalFacturado, promedioValor, companiasUnicas, salonesUnicos, dateRange, monthlyVariation, variationColor };
    }, [filteredData, startDate, endDate]);

    const chartData = useMemo(() => {
        const temporal = Object.entries(filteredData.reduce<{[key: string]: number}>((acc, curr) => {
            const date = curr.fecha;
            acc[date] = (acc[date] || 0) + curr.total;
            return acc;
        }, {}))
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
        
        // FIX: Add explicit type for the accumulator in reduce to fix type inference issues.
        const porCompania = Object.values(filteredData.reduce<{[key: string]: { name: string; total: number }}>((acc, curr) => {
            const key = curr.compania;
            if (!acc[key]) acc[key] = { name: key, total: 0 };
            acc[key].total += curr.total;
            return acc;
        }, {}))
        .sort((a,b) => b.total - a.total);

        // FIX: Add explicit type for the accumulator in reduce to fix type inference issues.
        const porSalon = Object.entries(filteredData.reduce<{ [key: string]: { name: string; total: number; count: number } }>((acc, curr) => {
            const key = curr.salon;
            if (!acc[key]) acc[key] = { name: key, total: 0, count: 0 };
            acc[key].total += curr.total;
            acc[key].count += 1;
            return acc;
        }, {}))
        .map(([name, values]) => ({ name, ...values }))
        .sort((a, b) => b.total - a.total);
        
        // FIX: Add explicit type for the accumulator in reduce to fix type inference issues.
        const porItem = Object.values(filteredData.reduce<{ [key: string]: { name: string; total: number } }>((acc, curr) => {
            const key = curr.item;
            if (!acc[key]) acc[key] = { name: key, total: 0 };
            acc[key].total += curr.total;
            return acc;
        }, {}))
        .sort((a,b) => b.total - a.total);

        const totalRevenue = porItem.reduce((sum, item) => sum + item.total, 0);
        let cumulativeTotal = 0;
        const paretoItems = porItem.filter(item => {
            if (totalRevenue > 0 && cumulativeTotal / totalRevenue < 0.8) {
                cumulativeTotal += item.total;
                return true;
            }
            return false;
        });

        return { temporal, porCompania, porSalon, paretoItems };
    }, [filteredData]);

    if (data.length === 0) {
        return <p className="text-center text-gray-500 py-10">No hay datos para mostrar el dashboard.</p>;
    }

    const tabs = [
        { id: 'temporal', label: 'Análisis Temporal' },
        { id: 'compania', label: 'Análisis por Compañía' },
        { id: 'salon', label: 'Análisis por Salón' },
        { id: 'item', label: 'Análisis por Ítem (Pareto)' },
    ];
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

    return (
        <div className="space-y-6">
            { kpis &&
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <KpiCard title="Total General Facturado" value={formatCurrency(kpis.totalFacturado)} icon={<DollarSignIcon className="h-6 w-6 text-gray-400"/>} insight={kpis.monthlyVariation} insightColor={kpis.variationColor} />
                    <KpiCard title="Promedio de Valor Unitario" value={formatCurrency(kpis.promedioValor)} icon={<DollarSignIcon className="h-6 w-6 text-gray-400"/>} />
                    <KpiCard title="Total de Compañías" value={String(kpis.companiasUnicas)} icon={<UsersIcon className="h-6 w-6 text-gray-400"/>} />
                    <KpiCard title="Total de Salones Usados" value={String(kpis.salonesUnicos)} icon={<BuildingIcon className="h-6 w-6 text-gray-400"/>} />
                    <KpiCard title="Rango de Fechas" value={kpis.dateRange} icon={<CalendarIcon className="h-6 w-6 text-gray-400"/>} />
                </div>
            }

            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1">
                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Fecha Inicial</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"/>
                    </div>
                    <div className="flex-1">
                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">Fecha Final</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"/>
                    </div>
                    <div className="self-end">
                        <button onClick={handleApplyFilter} className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors h-[38px] mt-1">
                            <AnalyticsIcon className="h-5 w-5"/>
                            Analizar Rango
                        </button>
                    </div>
                </div>
            </div>
            
            <div>
                 <div className="flex justify-center mb-6">
                    <div className="flex space-x-1 rounded-lg bg-gray-200 p-1">
                        {tabs.map(tab => (
                             <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${activeTab === tab.id ? 'bg-white shadow' : ''} py-2 px-4 text-sm font-medium text-gray-700 rounded-md transition-colors w-full sm:w-auto text-center`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredData.length === 0 ? <p className="text-center text-gray-500 py-10">No se encontraron datos para el rango de fechas seleccionado.</p> : (
                    <div className="w-full h-96">
                        {activeTab === 'temporal' && (
                            <ResponsiveContainer>
                                <LineChart data={chartData.temporal} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tickFormatter={formatCompactCurrency} tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />}/>
                                    <Legend />
                                    <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} name="Total Facturado" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                        {activeTab === 'compania' && (
                             <ResponsiveContainer>
                                <BarChart data={chartData.porCompania.slice(0, 15)} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" tickFormatter={formatCompactCurrency} />
                                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />}/>
                                    <Legend />
                                    <Bar dataKey="total" fill="#00C49F" name="Total Facturado" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                         {activeTab === 'salon' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                               <div>
                                   <h4 className="text-center font-semibold text-gray-600 mb-2">Ingresos por Salón</h4>
                                    <ResponsiveContainer>
                                        <BarChart data={chartData.porSalon.slice(0, 10)} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} interval={0} tick={{ fontSize: 12 }} />
                                            <YAxis tickFormatter={formatCompactCurrency} />
                                            <Tooltip content={<CustomTooltip />}/>
                                            <Bar dataKey="total" fill="#FFBB28" name="Total Ingresos"/>
                                        </BarChart>
                                    </ResponsiveContainer>
                               </div>
                               <div>
                                    <h4 className="text-center font-semibold text-gray-600 mb-2">Ocupación por Salón</h4>
                                    <ResponsiveContainer>
                                        <BarChart data={chartData.porSalon.sort((a,b) => b.count - a.count).slice(0, 10)} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} interval={0} tick={{ fontSize: 12 }} />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="#FF8042" name="Cantidad de Eventos"/>
                                        </BarChart>
                                    </ResponsiveContainer>
                               </div>
                            </div>
                        )}
                         {activeTab === 'item' && (
                             <div>
                                <h4 className="text-center font-semibold text-gray-600 mb-2">Análisis de Pareto: Ítems que generan el 80% de los ingresos</h4>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={chartData.paretoItems} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false} label={({ name, percent }) => `${name.substring(0,15)}... (${(percent * 100).toFixed(0)}%)`}>
                                        {chartData.paretoItems.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />}/>
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                             </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartDashboard;
