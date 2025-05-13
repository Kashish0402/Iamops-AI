import React, { useEffect, useState } from 'react';
import { getSecurityScores } from "@/api/entities";
import { Card } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function SecurityChart() {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const data = await getSecurityScores();

        // Format for Recharts and add predictions
        const formattedData = formatChartData(data);
        setChartData(formattedData);
      } catch (error) {
        console.error('Failed to fetch scores:', error);
      }
    };

    fetchScores();
  }, []);

  const formatChartData = (data) => {
    const sorted = [...data].sort((a, b) => new Date(a.month) - new Date(b.month));
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const formatted = sorted.map(item => ({
      month: new Date(item.month).toLocaleString('default', { month: 'short' }),
      score: Math.round(item.avg_score)
    }));

    return formatted;
  };

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

            <Line
              type="monotone"
              data={chartData.map(d => ({ month: d.month, target: 100 }))}
              dataKey="target"
              stroke="#22c55e"
              strokeDasharray="3 3"
              dot={false}
            />

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
