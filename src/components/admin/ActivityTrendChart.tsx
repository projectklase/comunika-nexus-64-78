import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ActivityTrendDay } from '@/types/admin-analytics';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityTrendChartProps {
  data: ActivityTrendDay[];
}

export function ActivityTrendChart({ data }: ActivityTrendChartProps) {
  // Formatar dados para o gráfico
  const chartData = data.map((day) => ({
    date: format(parseISO(day.date), 'dd/MMM', { locale: ptBR }),
    fullDate: format(parseISO(day.date), 'dd/MM/yyyy', { locale: ptBR }),
    'Atividades Publicadas': day.activities_published,
    'Entregas Realizadas': day.deliveries_made,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="date" 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            color: 'hsl(var(--popover-foreground))',
          }}
          labelFormatter={(label, payload) => {
            if (payload && payload.length > 0) {
              return payload[0].payload.fullDate;
            }
            return label;
          }}
        />
        <Legend 
          wrapperStyle={{
            paddingTop: '20px',
            color: 'hsl(var(--foreground))',
          }}
        />
        <Line
          type="monotone"
          dataKey="Atividades Publicadas"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))', r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="Entregas Realizadas"
          stroke="hsl(var(--success))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--success))', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
