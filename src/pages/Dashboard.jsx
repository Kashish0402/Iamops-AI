
import React, { useEffect, useState } from 'react';
//import { SecurityTask, SecurityScore } from '@/api/entities';
import ScoreCard from '../components/dashboard/ScoreCard';
import ActionItems from '../components/dashboard/ActionItems';
import ScoreChart from '../components/dashboard/ScoreChart';
import SecurityTaskList from '../components/tasks/SecurityTaskList';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksData, scoresData] = await Promise.all([
        SecurityTask.list('-created_date'),
        SecurityScore.list('month')  // This fetches data from SecurityScore entity
      ]);
      
      setTasks(tasksData);
      setScores(scoresData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionItemCounts = () => {
    return {
      critical: tasks.filter(t => t.severity === 'critical').length,
      high: tasks.filter(t => t.severity === 'high').length,
      medium: tasks.filter(t => t.severity === 'medium').length,
      low: tasks.filter(t => t.severity === 'low').length
    };
  };

  const getCurrentScore = () => {
    const latestScore = [...scores].sort((a, b) => 
      new Date(b.month) - new Date(a.month)
    )[0];
    return latestScore || { score: 0, trend: 0 };
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-4 max-w-[1600px] mx-auto">
      <div className="flex gap-[20px] mb-8">
        <ScoreCard 
          score={getCurrentScore().score} 
          trend={3} 
        />
        <ActionItems counts={getActionItemCounts()} />
        <ScoreChart data={scores} />
      </div>
      
      <SecurityTaskList tasks={tasks} />
    </div>
  );
}
