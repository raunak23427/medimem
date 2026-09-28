import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getInitials } from '../utils/helpers';
import { readEmergencyShare } from '../services/firestore';

interface EmergencyView {
  name: string;
  age: number;
  gender: string;
  bloodGroup: string | null;
  emergencyContact: { name: string; phone: string } | null;
  conditions: string[];
  allergies: string[];
  meds: { name: string; dosage: string }[];
  doctorName: string | null;
  doctorPhone: string | null;
}

interface ShareDoc {
  snapshot?: {
    name: string; age: number; gender: string; bloodGroup: string | null;
    emergencyContact: { name: string; phone: string } | null;
    conditions: string[]; allergies: string[];
    criticalMedicines: { name: string; dosage: string }[];
    doctorName: string | null; doctorPhone: string | null;
  };
  revokedAt?: unknown;
  expiresAt?: { toDate: () => Date } | null;
}

export default function EmergencyPublicPage() {
  const { token } = useParams();
  const [view, setView] = useState<EmergencyView | null | 'loading'>('loading');

  useEffect(() => {
    if (!token) { setView(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const doc = (await readEmergencyShare(token)) as ShareDoc | null;
        if (cancelled) return;
        if (!doc?.snapshot) { setView(null); return; }
        if (doc.revokedAt) { setView(null); return; }
        if (doc.expiresAt?.toDate && doc.expiresAt.toDate() < new Date()) { setView(null); return; }
        const s = doc.snapshot;
        setView({
          name: s.name, age: s.age, gender: s.gender, bloodGroup: s.bloodGroup,
          emergencyContact: s.emergencyContact,
          conditions: s.conditions ?? [], allergies: s.allergies ?? [],
          meds: s.criticalMedicines ?? [],
          doctorName: s.doctorName, doctorPhone: s.doctorPhone,
        });
      } catch {
        if (!cancelled) setView(null);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (view === 'loading') {
    return (
      <div className="min-h-dvh bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-teal-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-sm text-gray-500">Loading emergency card…</p>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="min-h-dvh bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm shadow">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold text-gray-900">Card not found</p>
          <p className="text-sm text-gray-500 mt-1">This link may be invalid, expired, or revoked.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border-2 border-red-300 overflow-hidden shadow-xl">
        <div className="bg-red-600 text-white px-5 py-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest">🚨 Emergency Medical Information</p>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-xl font-bold">
              {getInitials(view.name)}
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{view.name}</p>
              <p className="text-sm text-gray-500">
                {view.age} years • {view.gender === 'male' ? 'Male' : view.gender === 'female' ? 'Female' : 'Other'}
              </p>
              <p className="text-sm font-semibold">Blood Group: {view.bloodGroup || 'Unknown'}</p>
            </div>
          </div>

          {view.emergencyContact && (
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Emergency Contact</p>
              <p className="text-sm font-medium">
                {view.emergencyContact.name} —{' '}
                <a href={`tel:${view.emergencyContact.phone}`} className="text-teal-600 underline">
                  {view.emergencyContact.phone}
                </a>
              </p>
            </div>
          )}

          <div className="mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Conditions</p>
            <div className="flex flex-wrap gap-1.5">
              {view.conditions.length > 0
                ? view.conditions.map((c) => <span key={c} className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full">{c}</span>)
                : <span className="text-sm text-gray-400">None</span>}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Allergies</p>
            <div className="flex flex-wrap gap-1.5">
              {view.allergies.length > 0
                ? view.allergies.map((a) => <span key={a} className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full">{a}</span>)
                : <span className="text-sm text-gray-400">None known</span>}
            </div>
          </div>

          {view.meds.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Critical Medicines</p>
              {view.meds.map((m, i) => (
                <p key={i} className="text-sm"><strong>{m.name}</strong> — {m.dosage}</p>
              ))}
            </div>
          )}

          {view.doctorName && (
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Doctor</p>
              <p className="text-sm font-medium">
                {view.doctorName}{view.doctorPhone ? ` — ${view.doctorPhone}` : ''}
              </p>
            </div>
          )}
        </div>
        <div className="bg-gray-50 px-4 py-3 text-center border-t border-gray-100">
          <p className="text-[10px] text-gray-400">Powered by MediMem — Your family's health, always remembered</p>
        </div>
      </div>
    </div>
  );
}
