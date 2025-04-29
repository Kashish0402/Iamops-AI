import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon } from "lucide-react";

export default function ScoreCard({ score, trend }) {
  return (
    <Card className="bg-white rounded-none w-[300px] h-[240px]">
      <CardContent className="p-4">
        <h1 className="text-lg font-bold text-center mb-4">Security Score</h1> 
        <div className="text-6xl font-bold text-center">{score}%</div> {/* increased from 5xl to 6xl */}
        <div className="text-base text-green-600 flex items-center justify-center mt-2">
          <ArrowUpIcon className="w-4 h-4 mr-1" /> {/* slightly bigger icon */}
          {trend}% from last month
        </div>
      </CardContent>
    </Card>
  );
}
