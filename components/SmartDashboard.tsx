import React, { useMemo, useState } from 'react';
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
    const [selectedCompania, setSelectedCompania] = useState('');
    const [selectedSalon, setSelectedSalon] = useState('');
    const [selectedTipo, setSelectedTipo] = useState('');
    
    const filterOptions = useMemo(() => {
        const companias = [...new Set(data.map(item => item.compania))].sort();
        const salones = [...new Set(data.map(item => item.salon))].sort();
        const tipos = [...new Set(data.map(item => item.tipo))].sort();
        return { companias, salones, tipos };
    }, [data]);

    const filteredData = useMemo(() => {
        return data.filter(item => {
            const dateMatch = (!startDate || item.fecha >= startDate) && (!endDate || item.fecha <= endDate);
            const companiaMatch = !selectedCompania || item.compania === selectedCompania;
            const salonMatch = !selectedSalon || item.salon === selectedSalon;
            const tipoMatch = !selectedTipo || item.tipo === selectedTipo;
            return dateMatch && companiaMatch && salonMatch && tipoMatch;
        });
    }, [data, startDate, endDate, selectedCompania, selectedSalon, selectedTipo]);

    const handleClearFilters = () => {
        setStartDate(defaultStartDate);
        setEndDate(defaultEndDate);
        setSelectedCompania('');
        setSelectedSalon('');
        setSelectedTipo('');
    };

    const kpis = useMemo(() => {
        if (filteredData.length === 0) return null;
        const totalFacturado = filteredData.reduce((acc, curr) => acc + curr.total, 0);
        const ticketPromedio = filteredData.length > 0 ? totalFacturado / filteredData.length : 0;
        const companiasUnicas = new Set(filteredData.map(d => d.compania)).size;
        const salonesUnicos = new Set(filteredData.map(d => d.salon)).size;
        const dateRangeText = `${new Date(startDate + 'T00:00:00').toLocaleDateString('es-CL')} - ${new Date(endDate + 'T00:00:00').toLocaleDateString('es-CL')}`;

        const totalsByMonth: { [key: string]: number } = filteredData.reduce((acc, curr) => {
            const monthKey = curr.fecha.substring(0, 7); // YYYY-MM
            acc[monthKey] = (acc[monthKey] || 0) + curr.total;
            return acc;
        }, {} as {[key: string]: number});

        const sortedMonths = Object.keys(totalsByMonth).sort().reverse();
        let monthlyVariation = 'N/A';
        let variationColor = 'text-gray-500';

        if (sortedMonths.length > 1) {
            const lastMonthTotal = totalsByMonth[sortedMonths[0]];
            const prevMonthTotal = totalsByMonth[sortedMonths[1]];
            if (prevMonthTotal > 0) {
                const variation = ((lastMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
                monthlyVariation = `${variation > 0 ? '▲' : '▼'} ${variation.toFixed(1)}% vs mes anterior`;
                variationColor = variation > 0 ? 'text-green-600' : 'text-red-600';
            }
        }

        return { totalFacturado, ticketPromedio, companiasUnicas, salonesUnicos, dateRangeText, monthlyVariation, variationColor };
    }, [filteredData, startDate, endDate]);

     const predictiveAlerts = useMemo(() => {
        if (filteredData.length < 10) return []; // Need some data for meaningful alerts
        
        const alerts: {type: 'warning' | 'info'; title: string; message: string}[] = [];

        const sortedFilteredData = [...filteredData].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        const midPointIndex = Math.floor(sortedFilteredData.length / 2);
        const firstHalf = sortedFilteredData.slice(0, midPointIndex);
        const secondHalf = sortedFilteredData.slice(midPointIndex);

        if (firstHalf.length > 0 && secondHalf.length > 0) {
            const firstHalfTotal = firstHalf.reduce((acc, curr) => acc + curr.total, 0);
            const secondHalfTotal = secondHalf.reduce((acc, curr) => acc + curr.total, 0);
            const firstHalfAvg = firstHalfTotal / firstHalf.length;
            const secondHalfAvg = secondHalfTotal / secondHalf.length;
            if (secondHalfAvg < firstHalfAvg * 0.95) { // 5% drop threshold
                const percentageDrop = ((firstHalfAvg - secondHalfAvg) / firstHalfAvg) * 100;
                alerts.push({
                    type: 'warning',
                    title: 'Caída en Ticket Promedio',
                    message: `El ticket promedio ha disminuido un ${percentageDrop.toFixed(0)}% en la segunda mitad del período.`
                });
            }
        }

        // Fix: Explicitly type the accumulator for reduce to ensure correct type inference.
        const salonUsage = filteredData.reduce<Record<string, number>>((acc, curr) => {
            acc[curr.salon] = (acc[curr.salon] || 0) + 1;
            return acc;
        }, {});
        
        const sortedSalonesByUsage = Object.entries(salonUsage).sort((a, b) => a[1] - b[1]);
        if (sortedSalonesByUsage.length > 1) {
            const leastUsed = sortedSalonesByUsage[0];
            alerts.push({
                type: 'info',
                title: 'Oportunidad de Mejora',
                message: `El salón '${leastUsed[0]}' fue el menos utilizado con solo ${leastUsed[1]} evento(s).`
            });
        }
        
        const activeInFirstHalf = new Set(firstHalf.map(r => r.compania));
        const activeInSecondHalf = new Set(secondHalf.map(r => r.compania));
        const inactiveCompanies = [...activeInFirstHalf].filter(c => !activeInSecondHalf.has(c));
        
        if (inactiveCompanies.length > 0) {
            const names = inactiveCompanies.slice(0, 2).join(', ');
            const moreCount = inactiveCompanies.length - 2;
            alerts.push({
                type: 'info',
                title: 'Posible Inactividad de Clientes',
                message: `Compañías como ${names}${moreCount > 0 ? ` y ${moreCount} más` : ''} no registraron actividad reciente en el período.`
            });
        }

        return alerts;
    }, [filteredData]);


    const chartData = useMemo(() => {
        const temporal = Object.entries(filteredData.reduce<{[key: string]: number}>((acc, curr) => {
            const date = curr.fecha;
            acc[date] = (acc[date] || 0) + curr.total;
            return acc;
        }, {}))
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
        
        // Fix: Explicitly type the accumulator for reduce to ensure correct type inference.
        const porCompania = Object.values(filteredData.reduce<Record<string, { name: string; total: number }>>((acc, curr) => {
            const key = curr.compania;
            if (!acc[key]) acc[key] = { name: key, total: 0 };
            acc[key].total += curr.total;
            return acc;
        }, {}))
        .sort((a, b) => b.total - a.total);

        // Fix: Explicitly type the accumulator for reduce to ensure correct type inference.
        const porSalon = Object.values(filteredData.reduce<Record<string, { name: string; total: number; count: number }>>((acc, curr) => {
            const key = curr.salon;
            if (!acc[key]) acc[key] = { name: key, total: 0, count: 0 };
            acc[key].total += curr.total;
            acc[key].count += 1;
            return acc;
        }, {})).sort((a, b) => b.total - a.total);
        
        // Fix: Explicitly type the accumulator for reduce to ensure correct type inference.
        const porItem = Object.values(filteredData.reduce<Record<string, { name: string; total: number }>>((acc, curr) => {
            const key = curr.item;
            if (!acc[key]) acc[key] = { name: key, total: 0 };
            acc[key].total += curr.total;
            return acc;
        }, {})).sort((a, b) => b.total - a.total);

        const totalRevenue = porItem.reduce((sum, item) => sum + item.total, 0);
        let cumulativeTotal = 0;
        const paretoItems = totalRevenue > 0 ? porItem.filter(item => {
            if (cumulativeTotal / totalRevenue < 0.8) {
                cumulativeTotal += item.total;
                return true;
            }
            return false;
        }) : [];

        return { temporal, porCompania, porSalon, paretoItems };
    }, [filteredData]);

    if (data.length === 0) {
        return <p className="text-center text-gray-500 py-10">No hay datos para mostrar el dashboard.</p>;
    }

    const tabs = [
        { id: 'temporal', label: 'Análisis Temporal' },
        { id: 'compania', label: 'Por Compañía' },
        { id: 'salon', label: 'Por Salón' },
        { id: 'item', label: 'Por Ítem (Pareto)' },
    ];
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

    return (
        <div className="space-y-6">
            { kpis &&
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <KpiCard title="Total General Facturado" value={formatCurrency(kpis.totalFacturado)} icon={<DollarSignIcon className="h-6 w-6 text-gray-400"/>} insight={kpis.monthlyVariation} insightColor={kpis.variationColor} />
                    <KpiCard title="Ticket Promedio" value={formatCurrency(kpis.ticketPromedio)} icon={<AnalyticsIcon className="h-6 w-6 text-gray-400"/>} insight="Valor por registro"/>
                    <KpiCard title="Total de Compañías" value={String(kpis.companiasUnicas)} icon={<UsersIcon className="h-6 w-6 text-gray-400"/>} insight="Clientes únicos en el período"/>
                    <KpiCard title="Total de Salones" value={String(kpis.salonesUnicos)} icon={<BuildingIcon className="h-6 w-6 text-gray-400"/>} insight="Espacios con eventos"/>
                    <KpiCard title="Rango de Fechas" value={kpis.dateRangeText} icon={<CalendarIcon className="h-6 w-6 text-gray-400"/>} insight="Período de análisis actual"/>
                    <div className="bg-white p-4 rounded-lg shadow-md flex flex-col justify-center items-center border border-gray-200">
                        <p className="text-sm font-medium text-gray-500">Registros Analizados</p>
                        <p className="text-2xl font-bold text-gray-800 mt-2">{filteredData.length}</p>
                    </div>
                </div>
            }

            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end">
                    <div className="lg:col-span-2 xl:col-span-1">
                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Fecha Inicial</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"/>
                    </div>
                    <div className="lg:col-span-2 xl:col-span-1">
                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">Fecha Final</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"/>
                    </div>
                    <div className="lg:col-span-2 xl:col-span-1">
                        <label htmlFor="compania-filter" className="block text-sm font-medium text-gray-700">Compañía</label>
                        <select id="compania-filter" value={selectedCompania} onChange={e => setSelectedCompania(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white">
                            <option value="">Todas</option>
                            {filterOptions.companias.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="lg:col-span-2 xl:col-span-1">
                        <label htmlFor="salon-filter" className="block text-sm font-medium text-gray-700">Salón</label>
                        <select id="salon-filter" value={selectedSalon} onChange={e => setSelectedSalon(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white">
                            <option value="">Todos</option>
                            {filterOptions.salones.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="lg:col-span-2 xl:col-span-1">
                        <label htmlFor="tipo-filter" className="block text-sm font-medium text-gray-700">Tipo</label>
                        <select id="tipo-filter" value={selectedTipo} onChange={e => setSelectedTipo(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white">
                            <option value="">Todos</option>
                            {filterOptions.tipos.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="lg:col-span-2 xl:col-span-1">
                        <button onClick={handleClearFilters} className="w-full text-center bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors h-[38px]">
                            Limpiar Filtros
                        </button>
                    </div>
                </div>
            </div>
            
            <div>
                 <div className="flex justify-center mb-6">
                    <div className="flex space-x-1 rounded-lg bg-gray-200 p-1 flex-wrap justify-center">
                        {tabs.map(tab => (
                             <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${activeTab === tab.id ? 'bg-white shadow' : ''} py-2 px-4 text-sm font-medium text-gray-700 rounded-md transition-colors w-full sm:w-auto text-center my-1 sm:my-0`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredData.length === 0 ? <p className="text-center text-gray-500 py-10">No se encontraron datos para los filtros seleccionados.</p> : (
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
                                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} interval={0}/>
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
                                            <YAxis allowDecimals={false} />
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
            
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Alertas y Perspectivas Inteligentes</h2>
                 {predictiveAlerts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {predictiveAlerts.map((alert, index) => (
                            <div key={index} className={`p-4 rounded-lg ${alert.type === 'warning' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border`}>
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <span className="text-xl" role="img" aria-label={alert.type}>
                                        {alert.type === 'warning' ? '⚠️' : '💡'}
                                    </span>
                                    <span>{alert.title}</span>
                                </h3>
                                <p className="text-sm text-gray-600 pl-8 mt-1">{alert.message}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No hay alertas significativas para el período y filtros seleccionados, o no hay suficientes datos para un análisis predictivo.</p>
                )}
            </div>
        </div>
    );
};

export default SmartDashboard;