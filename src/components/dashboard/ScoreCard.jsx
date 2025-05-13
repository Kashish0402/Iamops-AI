import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react";

export default function ScoreCard({ score, trend }) {
  const formattedScore = typeof score === 'number' ? Math.round(score) : 0;
  const formattedTrend = typeof trend === 'number' ? Math.round(trend) : 0;
  
  const TrendIndicator = () => {
    if (formattedTrend > 0) {
      return (
        <div className="flex items-center justify-center gap-1 text-green-600">
          <ArrowUpIcon className="w-4 h-4" />
          <span>+{formattedTrend}%</span>
        </div>
      );
    } else if (formattedTrend < 0) {
      return (
        <div className="flex items-center justify-center gap-1 text-red-600">
          <ArrowDownIcon className="w-4 h-4" />
          <span>{formattedTrend}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center gap-1 text-gray-600">
        <MinusIcon className="w-4 h-4" />
        <span>No change</span>
      </div>
    );
  };
  
  return (
    <Card className="bg-white rounded-none w-[300px] h-[240px]">
      <CardContent className="p-4">
        <h1 className="text-lg font-bold text-center mb-4">Security Score</h1>
        <div className="text-6xl font-bold text-center">{formattedScore}%</div>
        <div className="text-sm mt-4">
          <TrendIndicator />
        </div>
        <div className="text-sm text-gray-500 text-center mt-2">
          vs Last Month
        </div>
      </CardContent>
    </Card>
  );
}