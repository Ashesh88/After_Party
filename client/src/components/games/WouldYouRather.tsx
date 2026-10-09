'use client';
export default function WouldYouRather({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-6 max-w-lg mx-auto flex flex-col items-center h-full">
      <header className="w-full flex items-center justify-between mb-12">
        <button onClick={onBack} className="text-white/60 hover:text-white">← Back</button>
        <h1 className="font-bold text-xl">Would You Rather</h1>
        <div className="w-10"></div>
      </header>
      <div className="flex-1 flex flex-col gap-4 w-full justify-center pb-20">
        <button className="flex-1 bg-blue-500/20 border-2 border-blue-500 rounded-3xl p-6 text-xl font-bold hover:bg-blue-500/30 transition-colors">
          Travel the world together for a year
        </button>
        <div className="text-center font-bold text-white/50 py-2">OR</div>
        <button className="flex-1 bg-pink-500/20 border-2 border-pink-500 rounded-3xl p-6 text-xl font-bold hover:bg-pink-500/30 transition-colors">
          Buy your dream house together now
        </button>
      </div>
    </div>
  );
}
