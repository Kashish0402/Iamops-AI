import React from 'react';
import { Card } from "@/components/ui/card";
import SecurityChart from '../components/dashboard/ScoreChart';

const SecurityDashboard = () => {
  const securityScoreData = [
    { month: 'Jul', security_score: 60 },
    { month: 'Aug', security_score: 65 },
    { month: 'Sep', security_score: 72 },
    { month: 'Oct', security_score: 75 },
    { month: 'Nov', security_score: 80 }
  ];

  return (
    <div className="p-0">
      {/* Content below header would go here */}
    </div>
  );
};

export default SecurityDashboard;
