'use client';
import { useState, useEffect } from 'react';
import { Reminder } from '../../../lib/types';

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    // mock fetch
    setReminders([
      { _id: '1', title: 'Our Anniversary', datetime: new Date(Date.now() + 864000000).toISOString(), recurring: true },
      { _id: '2', title: 'Call the florist', datetime: new Date(Date.now() + 3600000).toISOString(), recurring: false }
    ]);
  }, []);

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Reminders 🔔</h1>
          <p className="text-white/50">Never forget a moment.</p>
        </div>
        <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl shadow-lg hover:shadow-secondary/50 transition-shadow">
          +
        </button>
      </header>

      <div className="space-y-4">
        {reminders.map(rem => {
          const date = new Date(rem.datetime);
          const isSoon = date.getTime() - Date.now() < 86400000; // less than 24h
          
          return (
            <div key={rem._id} className="p-5 rounded-3xl bg-surface border border-white/5 flex gap-4 items-center">
              <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-bold ${isSoon ? 'bg-primary text-white' : 'bg-white/10 text-white/70'}`}>
                <span className="text-sm leading-none">{date.getDate()}</span>
                <span className="text-[10px] uppercase">{date.toLocaleString('default', { month: 'short' })}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{rem.title}</h3>
                <div className="text-sm text-white/50 flex gap-2 items-center">
                  <span>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {rem.recurring && <span className="px-2 py-0.5 rounded text-[10px] bg-white/10">Recurring</span>}
                </div>
              </div>
              <button className="text-white/20 hover:text-red-500 transition-colors">
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
