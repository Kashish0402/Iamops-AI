
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SecurityChart({ data = [] }) {
  // Format database data and add predictions
  const formatData = () => {
    const sortedData = [...data].sort((a, b) => new Date(a.month) - new Date(b.month));
    
    // Format existing data with short month names
    const formattedData = sortedData.map(item => ({
      month: new Date(item.month).toLocaleString('default', { month: 'short' }),
      score: Math.round(item.score)
    }));

    // Add predictions for next 3 months
    const lastScore = formattedData[formattedData.length - 1]?.score || 0;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const lastMonth = new Date(data[data.length - 1]?.month || new Date());
    
    for(let i = 1; i <= 3; i++) {
      const nextMonth = new Date(lastMonth);
      nextMonth.setMonth(lastMonth.getMonth() + i);
      formattedData.push({
        month: monthNames[nextMonth.getMonth()],
        score: Math.min(100, Math.round(lastScore + (i * 5))),
        predicted: true
      });
    }

    return formattedData;
  };

  const chartData = formatData();

  return (
    <Card className="bg-white p-6 rounded-lg w-[700px] h-[240px]">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-center mb-4">Security Score Over Time</h2>
        <div className="flex gap-2 text-xs">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
            <span>Actual</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 border-2 border-green-500 rounded-full mr-1"></div>
            <span>Target</span>
          </div>
        </div>
      </div>

      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            
            <XAxis 
              dataKey="month"
              tick={{ fontSize: 10 }}
              tickLine={false}
            />
            
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              tickLine={false}
              tickCount={5}
            />
            
            <Tooltip 
              formatter={(value) => [`${value}%`]}
              labelStyle={{ color: '#666' }}
            />

            {/* Target line at 100% */}
            <Line
              type="monotone"
              data={chartData.map(d => ({ month: d.month, target: 100 }))}
              dataKey="target"
              stroke="#22c55e"
              strokeDasharray="3 3"
              dot={false}
            />

            {/* Actual score line */}
            <Line
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
