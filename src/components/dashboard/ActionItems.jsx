import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

export default function ActionItems({ counts }) {
  return (
    <Card className="bg-white rounded-none border-l-0 w-[300px] h-[240px]">
      <CardContent className="p-4">
        <h1 className="text-lg font-bold text-center mb-4">Action Items</h1>
        
        {/* Total count */}
        <div className="text-6xl font-bold text-center mb-6">
          {counts.critical + counts.high + counts.medium + counts.low}
        </div>
        {/* Risk labels */}
        <div className="flex justify-center w-full gap-2 text-xss">
          <div className="bg-red-500 text-white px-2 py-1 rounded text-center min-w-[24px]">
            {counts.critical}
            <div className="text-[10px]">Critical</div>
          </div>
          <div className="bg-orange-500 text-white px-2 py-1 rounded text-center min-w-[24px]">
            {counts.high}
            <div className="text-[10px]">High</div>
          </div>
          <div className="bg-yellow-500 text-white px-2 py-1 rounded text-center min-w-[24px]">
            {counts.medium}
            <div className="text-[10px]">Medium</div>
          </div>
          <div className="bg-green-500 text-white px-2 py-1 rounded text-center min-w-[24px]">
            {counts.low}
            <div className="text-[10px]">Low</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}