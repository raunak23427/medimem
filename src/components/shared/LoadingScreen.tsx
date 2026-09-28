export default function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-white flex flex-col items-center justify-center gap-5">
      <div className="w-16 h-16 rounded-full bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-200 animate-pulse">
        <span className="text-white font-bold text-2xl">M</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-xl font-bold text-gray-900">
          Medi<span className="text-teal-600">Mem</span>
        </h1>
        <p className="text-xs text-gray-400">Loading your health data…</p>
      </div>
      <div className="w-32 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-teal-500 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
          style={{ width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}
