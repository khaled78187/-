import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DailyActivity } from '../types';
import { Award, Zap, Calendar } from 'lucide-react';

interface ProgressChartsProps {
  activityData: DailyActivity[];
  totalXp: number;
  streak: number;
}

export default function ProgressCharts({ activityData, totalXp, streak }: ProgressChartsProps) {
  const averageXp = Math.round(activityData.reduce((sum, item) => sum + item.xp, 0) / activityData.length);

  // Custom tooltips for Duolingo vibes
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border-2 border-amber-200 p-2.5 rounded-xl shadow-lg font-sans text-right text-sm">
          <p className="font-bold text-amber-800">{payload[0].payload.day}</p>
          <p className="text-gray-600 font-mono mt-0.5">{payload[0].value} XP مكافأة</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 mt-4 shadow-sm" id="progress-container">
      <div className="flex items-center justify-between mb-5 flex-row-reverse">
        <div>
          <h3 className="text-lg font-bold text-gray-800 text-right font-sans">نشاطك المعرفي الأسبوعي</h3>
          <p className="text-xs text-gray-500 text-right mt-0.5">تتبع نقاطك المتراكمة يومياً</p>
        </div>
        <Calendar className="w-6 h-6 text-amber-500" />
      </div>

      {/* Stats Summary Bento Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6 text-right font-sans" dir="rtl">
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-800">نقاط الخبرة</span>
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-900">{totalXp}</p>
          <span className="text-[10px] text-amber-700/80">مجموع الـ XP كُلياً</span>
        </div>

        <div className="bg-orange-50 rounded-xl p-3 border border-orange-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-orange-800">توالي الأيام</span>
            <Award className="w-4 h-4 text-orange-500 fill-orange-500" />
          </div>
          <p className="text-xl font-bold font-mono text-orange-900">{streak} أيام</p>
          <span className="text-[10px] text-orange-700/80">المواظبة السقراطية</span>
        </div>

        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-800">معدل الانجاز</span>
          </div>
          <p className="text-xl font-bold font-mono text-blue-900">{averageXp} XP</p>
          <span className="text-[10px] text-blue-700/80">المعدل اليومي</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-56 w-full" id="xp-chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={activityData} margin={{ top: 10, right: 5, left: 5, bottom: 5 }}>
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false} 
              tick={{ fill: '#6B7280', fontSize: 11, fontFamily: 'sans-serif' }}
            />
            <YAxis 
              hide={true}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(251, 191, 36, 0.08)' }} />
            <Bar dataKey="xp" radius={[8, 8, 0, 0]}>
              {activityData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.xp > 100 ? '#F59E0B' : '#FB7185'} 
                  className="transition-all duration-300 hover:opacity-80"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-400 font-sans border-t border-gray-50 pt-3">
        <span>أيام الأسبوع</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> تم مراجعة الدروس
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> تمرين تعويضي
          </span>
        </div>
      </div>
    </div>
  );
}
