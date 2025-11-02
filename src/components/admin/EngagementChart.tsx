import { ReadRateByType } from '@/types/post-read-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Info } from 'lucide-react';
import { Tooltip as InfoTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EngagementChartProps {
  data: ReadRateByType[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function EngagementChart({ data }: EngagementChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Taxa de Leitura por Tipo de Post</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Sem dados de engajamento disponíveis
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Taxa de Leitura por Tipo de Post
          <TooltipProvider>
            <InfoTooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Compare o engajamento entre diferentes tipos de posts (Avisos, Atividades, etc). Use para identificar quais formatos geram mais interesse dos alunos.
                </p>
              </TooltipContent>
            </InfoTooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="post_type" 
              tick={{ fill: 'hsl(var(--foreground))' }}
              fontSize={12}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--foreground))' }}
              fontSize={12}
              label={{ 
                value: 'Taxa de Leitura (%)', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: 'hsl(var(--foreground))' }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--foreground))',
              }}
              labelStyle={{ 
                color: 'hsl(var(--foreground))' 
              }}
              itemStyle={{
                color: 'hsl(var(--foreground))'
              }}
            />
            <Legend 
              formatter={(value) => (
                <span style={{ color: 'hsl(var(--foreground))' }}>
                  {value}
                </span>
              )}
            />
            <Bar dataKey="avg_read_rate" name="Taxa Média (%)" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
