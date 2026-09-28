import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, FileText, Download } from 'lucide-react';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import { currentUser } from '../services/auth';
import { isLocalMode } from '../lib/env';

interface AuditEvent {
  id?: string;
  action: string;
  uid: string;
  resourceType?: string;
  resourceId?: string;
  memberId?: string;
  meta?: Record<string, string | number | boolean | null>;
  createdAt?: { toDate(): Date } | string | null;
}

function actionStyle(action: string): { bg: string; text: string; emoji: string } {
  if (action.startsWith('auth.')) return { bg: 'bg-blue-50', text: 'text-blue-700', emoji: '🔐' };
  if (action.startsWith('ai.')) return { bg: 'bg-purple-50', text: 'text-purple-700', emoji: '🤖' };
  if (action.startsWith('record.')) return { bg: 'bg-teal-50', text: 'text-teal-700', emoji: '📋' };
  if (action.startsWith('emergency.')) return { bg: 'bg-red-50', text: 'text-red-700', emoji: '🚨' };
  if (action.startsWith('member.')) return { bg: 'bg-indigo-50', text: 'text-indigo-700', emoji: '👥' };
  return { bg: 'bg-gray-50', text: 'text-gray-700', emoji: '•' };
}

function formatDate(d: AuditEvent['createdAt']): string {
  if (!d) return '';
  try {
    const date = typeof d === 'string' ? new Date(d) : d.toDate();
    return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function AuditLogPage() {
  const { isAuthenticated } = useApp();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    if (isLocalMode) { setLoading(false); return; }
    const uid = currentUser()?.uid;
    if (!uid) { setLoading(false); return; }
    (async () => {
      try {
        const ref = collection(getDb(), 'users', uid, 'audit');
        const q = query(ref, orderBy('createdAt', 'desc'), limit(200));
        const snap = await getDocs(q);
        setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as AuditEvent) })));
      } catch (e) {
        console.warn('audit log fetch failed', e);
        setError('Could not load audit log.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `medimem-audit-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pb-4">
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ShieldCheck size={20} className="text-teal-600" /> Audit Log</h1>
          <p className="text-xs text-gray-500">Every action on your account, append-only.</p>
        </div>
        {events.length > 0 && (
          <button onClick={exportJson} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-xl flex items-center gap-1.5">
            <Download size={14} /> Export
          </button>
        )}
      </div>

      <div className="px-4">
        {isLocalMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
            <p className="text-xs font-semibold text-amber-800">Local test mode — audit logging is server-side only.</p>
            <p className="text-[10px] text-amber-700 mt-0.5">Configure Firebase and sign in to see real audit events.</p>
          </div>
        )}

        {loading && (
          <p className="text-sm text-gray-400 text-center py-8">Loading audit events…</p>
        )}

        {error && (
          <p className="text-sm text-red-500 text-center py-8">{error}</p>
        )}

        {!loading && events.length === 0 && !isLocalMode && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <FileText size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No audit events yet.</p>
          </div>
        )}

        <div className="space-y-2">
          {events.map((e) => {
            const s = actionStyle(e.action);
            return (
              <div key={e.id} className={`rounded-xl p-3 border border-gray-100 bg-white shadow-sm flex items-start gap-3`}>
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0 text-base`}>{s.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${s.text}`}>{e.action.replace(/\./g, ' • ')}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(e.createdAt)}</p>
                  {e.meta && Object.keys(e.meta).length > 0 && (
                    <pre className="text-[10px] text-gray-500 bg-gray-50 rounded p-2 mt-1.5 whitespace-pre-wrap break-all">{JSON.stringify(e.meta, null, 2)}</pre>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
