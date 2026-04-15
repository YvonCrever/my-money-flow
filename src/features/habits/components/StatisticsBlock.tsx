import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DailyStatisticsViewModel } from '@/features/habits/types';

interface StatisticsBlockProps {
  statistics: DailyStatisticsViewModel;
}

export function StatisticsBlock({ statistics }: StatisticsBlockProps) {
  return (
    <>
      <div className="min-h-[160px]" />

      <div className="flex gap-3 min-h-[160px]">
        <div style={{ width: '36rem', flexShrink: 0 }} className="border border-white/8 bg-white/[0.02] p-3 flex flex-col">
          <div className="text-xs font-semibold text-slate-400 mb-2">Daily Progress</div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statistics.dailyProgressData} margin={{ top: 0, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 8, fill: '#94a3b8' }}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                  height={20}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  width={25}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                  }}
                  formatter={(value) => `${value}%`}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="value" fill="#94a3b8" radius={[1, 1, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex-1 border border-white/8 bg-white/[0.02] p-3 flex flex-col">
          <div className="text-xs font-semibold text-slate-400 mb-2">Weekly Progress</div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statistics.weeklyProgress} margin={{ top: 0, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="weekNumber"
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  height={20}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  width={25}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                  }}
                  formatter={(value) => `${value}%`}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="percentage" fill="#94a3b8" radius={[1, 1, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="min-h-[160px] border border-white/8 bg-white/[0.02] p-3 flex flex-col gap-0">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="text-xs font-semibold">Monthly Stats</div>
          <div className="flex gap-4 text-xs">
            <div className="flex gap-1 items-baseline">
              <div>Goal</div>
              <div className="font-bold">{statistics.monthlyGoal}</div>
            </div>
            <div className="flex gap-1 items-baseline">
              <div>Actual</div>
              <div className="font-bold">{statistics.monthlyCompleted}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex gap-2 min-h-0">
          <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            <div className="flex-1 flex items-center justify-center w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statistics.pieDataT}
                    cx="50%"
                    cy="50%"
                    innerRadius="35%"
                    outerRadius="90%"
                    paddingAngle={0}
                    dataKey="value"
                    isAnimationActive={false}
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) => {
                      if (name !== 'Done' || percent < 0.08) return null;
                      const radians = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * radians);
                      const y = cy + radius * Math.sin(-midAngle * radians);
                      return (
                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
                          {statistics.percentageT}%
                        </text>
                      );
                    }}
                  >
                    {statistics.pieDataT.map((entry, index) => (
                      <Cell key={`t-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">Progress</div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            <div className="flex-1 flex items-center justify-center w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statistics.pieDataC}
                    cx="50%"
                    cy="50%"
                    innerRadius="35%"
                    outerRadius="90%"
                    paddingAngle={0}
                    dataKey="value"
                    isAnimationActive={false}
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) => {
                      if (name !== 'Done' || percent < 0.08) return null;
                      const radians = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * radians);
                      const y = cy + radius * Math.sin(-midAngle * radians);
                      return (
                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
                          {statistics.percentageC}%
                        </text>
                      );
                    }}
                  >
                    {statistics.pieDataC.map((entry, index) => (
                      <Cell key={`c-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">Consistency</div>
          </div>
        </div>
      </div>
    </>
  );
}
