import React, { useEffect, useState } from 'react';
import { getSecurityTasks,getSecurityScores } from '@/api/entities';
import ScoreCard from '../components/dashboard/ScoreCard';
import ActionItems from '../components/dashboard/ActionItems';
import ScoreChart from '../components/dashboard/ScoreChart';
import SecurityTaskList from '../components/tasks/SecurityTaskList';

export default function Dashboard() {
  const [scoreData, setScoreData] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch score data
      const scores = await getSecurityScores();
      setScoreData(scores);

      // Fetch tasks 
      const taskData = await getSecurityTasks();
      setTasks(taskData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const getLatestScore = () => {
    if (scoreData.length === 0) return { avg_score: 0 };
    const sorted = [...scoreData].sort((a, b) => new Date(b.month) - new Date(a.month));
    return sorted[0];
  };

  const getActionItemCounts = () => {
    const latest = getLatestScore();
    return {
      critical: latest.critical_count || 0,
      high: latest.high_count || 0,
      medium: latest.medium_count || 0,
      low: latest.low_count || 0
    };
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          {error}
          <button
            onClick={loadData}
            className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const latest = getLatestScore();

  return (
    <div className="p-4 max-w-[1600px] mx-auto">
      <div className="flex gap-[20px] mb-8">
        <ScoreCard
          score={parseFloat(latest.avg_score)}
          trend={3} // Replace with real trend logic if needed
        />
        <ActionItems counts={getActionItemCounts()} />
        <ScoreChart data={scoreData} />
      </div>

      <SecurityTaskList tasks={tasks} />
    </div>
  );
}