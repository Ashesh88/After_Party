'use client';
import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { Goal } from '../../../lib/types';
import toast from 'react-hot-toast';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // mock fetch for now
    setGoals([
      { _id: '1', title: 'Save for Japan trip', category: 'Finance', progress: 45, ownerId: '1', completed: false },
      { _id: '2', title: 'Workout 3x a week', category: 'Health', progress: 80, ownerId: '1', completed: false }
    ]);
    setLoading(false);
  }, []);

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Goals 🎯</h1>
          <p className="text-white/50">Grow together.</p>
        </div>
        <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xl shadow-lg hover:shadow-primary/50 transition-shadow">
          +
        </button>
      </header>

      <div className="space-y-4">
        {goals.map(goal => (
          <div key={goal._id} className="p-5 rounded-3xl bg-surface border border-white/5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded-md mb-2 inline-block">
                  {goal.category}
                </span>
                <h3 className="font-bold text-lg">{goal.title}</h3>
              </div>
              <button className="text-white/30 hover:text-white transition-colors">⋮</button>
            </div>
            
            <div className="flex justify-between text-xs text-white/50 mb-2">
              <span>Progress</span>
              <span>{goal.progress}%</span>
            </div>
            <div className="w-full h-2 bg-background rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000"
                style={{ width: `${goal.progress}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
