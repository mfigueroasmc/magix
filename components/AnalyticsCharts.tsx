import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Registro, ChartType } from '../types';

interface AnalyticsChartsProps {
  data: Registro[];
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ data }) => {
    const [chartType, setChartType] = useState<ChartType>('salon');

    const chartData = useMemo(() => {
        const groupedData = data.reduce((acc, curr) => {
            let key: string;
            if (chartType === 'fecha') {
                const parts = curr.fecha.split('-').map(p => parseInt(p, 10));
                const date = new Date(parts[0], parts[1] - 1, parts[2]);
                key = date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
            } else {
                key = curr[chartType] || 'Sin especificar';
            }

            if (!acc[key]) {
                acc[key] = { name: key, total: 0 };
            }
            acc[key].total += curr.total;
            return acc;
        }, {} as { [key: string]: { name: string; total: number } });
        
        // FIX: Explicitly type sort parameters 'a' and 'b' to resolve TypeScript inference error.
        return Object.values(groupedData).sort((a: { total: number }, b: { total: number }) => b.total - a.total);
    }, [data, chartType]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
            <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
                <p className="font-bold">{label}</p>
                <p className="text-blue-600">{`Total: ${payload[0].value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`}</p>
            </div>
            );
        }
        return null;
    };

    const chartTypes: {id: ChartType, label: string}[] = [
        {id: 'salon', label: 'Por Salón'},
        {id: 'compania', label: 'Por Compañía'},
        {id: 'tipo', label: 'Por Tipo'},
        {id: 'fecha', label: 'Por Mes'},
    ];

    return (
        <div>
            <div className="flex justify-center mb-6">
                <div className="flex space-x-1 rounded-lg bg-gray-200 p-1">
                    {chartTypes.map(type => (
                         <button
                            key={type.id}
                            onClick={() => setChartType(type.id)}
                            className={`${chartType === type.id ? 'bg-white shadow' : ''} py-2 px-4 text-sm font-medium text-gray-700 rounded-md transition-colors`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>
            {chartData.length > 0 ? (
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <BarChart
                            data={chartData}
                            margin={{
                                top: 5, right: 30, left: 20, bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-25} textAnchor="end" height={70} interval={0} />
                            <YAxis tickFormatter={(value) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', notation: 'compact' }).format(value as number)} />
                            <Tooltip content={<CustomTooltip />}/>
                            <Legend />
                            <Bar dataKey="total" fill="#3B82F6" name="Total Ventas"/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <p className="text-center text-gray-500 py-10">No hay suficientes datos para mostrar el gráfico.</p>
            )}
        </div>
    );
};

export default AnalyticsCharts;