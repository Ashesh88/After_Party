'use client';
export default function Quiz({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-6 max-w-lg mx-auto flex flex-col items-center h-full">
      <header className="w-full flex items-center justify-between mb-12">
        <button onClick={onBack} className="text-white/60 hover:text-white">← Back</button>
        <h1 className="font-bold text-xl">Couples Quiz</h1>
        <div className="w-10"></div>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/50 text-center">Quiz coming soon...</p>
      </div>
    </div>
  );
}
