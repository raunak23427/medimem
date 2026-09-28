export default function SetupScreen() {
  return (
    <div className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-600 flex items-center justify-center mb-6 shadow-lg shadow-teal-200">
        <span className="text-white font-bold text-2xl">M</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Medi<span className="text-teal-600">Mem</span>
      </h1>
      <p className="text-sm text-gray-500 mb-8">Your family's health, always remembered</p>

      <div className="w-full max-w-sm bg-amber-50 border border-amber-200 rounded-2xl p-5 text-left">
        <p className="text-sm font-semibold text-amber-800 mb-2">Firebase not configured</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          Add your Firebase credentials to <code className="bg-amber-100 px-1 rounded">.env</code> to launch the app:
        </p>
        <pre className="mt-3 text-[10px] text-amber-900 bg-amber-100 rounded-xl p-3 overflow-x-auto leading-relaxed">{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}</pre>
        <p className="text-[10px] text-amber-600 mt-3">
          Get these from <strong>Firebase console → Project Settings → Web app</strong>, then restart the dev server.
        </p>
      </div>
    </div>
  );
}
