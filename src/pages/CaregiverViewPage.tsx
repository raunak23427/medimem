// Stripped-down view for caregivers — they see today's medicine schedule
// for a chosen family member and can tick doses, with notifications.
// No medical history, no records, no chat — privacy-minded.

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useHealthData } from '../context/HealthDataContext';
import { Pill, Clock, Check, ShieldCheck, ArrowLeft, Bell, BellOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MedicationDose } from '../types';

function parseDosesPerDay(frequency: string): number {
  const lower = frequency.toLowerCase();
  if (lower.includes('once') || lower.includes('1 time')) return 1;
  if (lower.includes('twice') || lower.includes('2 times') || lower.includes('bid')) return 2;
  if (lower.includes('thrice') || lower.includes('three') || lower.includes('3 times') || lower.includes('tid')) return 3;
  if (lower.includes('four') || lower.includes('4 times') || lower.includes('qid')) return 4;
  const dosePattern = lower.match(/(\d)-(\d)-(\d)(?:-(\d))?/);
  if (dosePattern) {
    const slots = dosePattern.slice(1).filter(Boolean).map(Number);
    return slots.reduce((sum, n) => sum + n, 0) || 1;
  }
  const hours = lower.match(/every\s+(\d+)\s*hour/);
  if (hours) return Math.max(1, Math.floor(24 / Number(hours[1])));
  return 1;
}
function doseTimes(dosesPerDay: number): string[] {
  if (dosesPerDay >= 4) return ['08:00', '13:00', '18:00', '22:00'];
  if (dosesPerDay === 3) return ['08:00', '14:00', '20:00'];
  if (dosesPerDay === 2) return ['09:00', '21:00'];
  return ['09:00'];
}

export default function CaregiverViewPage() {
  const { familyMembers, selectedMemberId, setSelectedMemberId, getMemberMedicines } = useApp();
  const { getMemberDoses, saveMedicationDose } = useHealthData();
  const navigate = useNavigate();
  const [notifyOn, setNotifyOn] = useState(typeof Notification !== 'undefined' && Notification.permission === 'granted');

  const member = familyMembers.find((m) => m.id === selectedMemberId);
  const todayISO = new Date().toISOString().split('T')[0];

  const activeMeds = useMemo(() => {
    return getMemberMedicines(selectedMemberId);
  }, [getMemberMedicines, selectedMemberId]);

  const todayDoses = useMemo(() => {
    if (!member) return [];
    const existing = getMemberDoses(selectedMemberId, todayISO);
    const slots: MedicationDose[] = [];
    for (const m of activeMeds) {
      const perDay = parseDosesPerDay(m.medicine.frequency);
      const times = doseTimes(perDay);
      for (const time of times) {
        const id = `${selectedMemberId}-${todayISO}-${m.medicine.name}-${time}`;
        const known = existing.find((e) => e.id === id);
        slots.push(known ?? {
          id, memberId: selectedMemberId,
          medicineName: m.medicine.name, dosage: m.medicine.dosage,
          scheduledTime: time, scheduledDate: todayISO,
          takenAt: null, skipped: false,
        });
      }
    }
    return slots.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }, [member, activeMeds, selectedMemberId, todayISO, getMemberDoses]);

  // ─── Schedule today's notifications ─────────────────────────
  useEffect(() => {
    if (!notifyOn || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    const timers: number[] = [];
    const now = new Date();
    for (const d of todayDoses) {
      if (d.takenAt || d.skipped) continue;
      const [h, m] = d.scheduledTime.split(':').map(Number);
      const due = new Date(); due.setHours(h, m, 0, 0);
      const ms = due.getTime() - now.getTime();
      if (ms <= 0 || ms > 12 * 3600 * 1000) continue;
      const t = window.setTimeout(() => {
        new Notification(`Time for ${d.medicineName}`, {
          body: `${member?.name ?? 'Patient'} • ${d.dosage} • ${d.scheduledTime}`,
          icon: '/favicon.svg',
          tag: d.id,
        });
      }, ms);
      timers.push(t);
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [todayDoses, notifyOn, member]);

  const tick = (d: MedicationDose, action: 'taken' | 'skip' | 'reset') => {
    const next: MedicationDose = action === 'taken'
      ? { ...d, takenAt: new Date().toISOString(), skipped: false }
      : action === 'skip'
      ? { ...d, takenAt: null, skipped: true }
      : { ...d, takenAt: null, skipped: false };
    saveMedicationDose(next);
  };

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') { setNotifyOn(true); return; }
    if (Notification.permission === 'denied') { alert('Notifications are blocked. Enable them in browser/device settings.'); return; }
    const p = await Notification.requestPermission();
    setNotifyOn(p === 'granted');
  };

  if (!member) {
    return <div className="p-6 text-center text-sm text-gray-500">Pick a family member to care for.</div>;
  }

  const taken = todayDoses.filter((d) => d.takenAt).length;
  const total = todayDoses.length;

  return (
    <div className="min-h-dvh bg-stone-50">
      {/* Caregiver banner */}
      <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-xs font-medium">
          <ArrowLeft size={14} /> Exit caregiver view
        </button>
        <span className="text-[11px] font-semibold flex items-center gap-1">
          <ShieldCheck size={12} /> Caregiver Mode
        </span>
      </div>

      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-emerald-700 font-semibold tracking-wider uppercase">Caring for</p>
          <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
          <p className="text-xs text-gray-500">{taken} of {total} doses taken today</p>
        </div>
        <button onClick={notifyOn ? () => setNotifyOn(false) : requestNotifications}
          className={`p-2 rounded-xl ${notifyOn ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {notifyOn ? <Bell size={18} /> : <BellOff size={18} />}
        </button>
      </div>

      {/* Member switcher */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {familyMembers.map((m) => (
            <button key={m.id} onClick={() => setSelectedMemberId(m.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 ${
                selectedMemberId === m.id ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}>
              {m.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-1">
        {/* Progress */}
        {total > 0 && (
          <div className="mb-4 bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">Today's progress</p>
              <p className="text-sm font-bold text-emerald-600">{Math.round((taken / total) * 100)}%</p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(taken / total) * 100}%` }} />
            </div>
          </div>
        )}

        {total === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Pill size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No medicines scheduled for {member.name} today.</p>
          </div>
        )}

        <div className="space-y-2">
          {todayDoses.map((d) => {
            const isTaken = !!d.takenAt;
            const isSkipped = d.skipped;
            return (
              <div key={d.id}
                className={`bg-white rounded-2xl p-4 border flex items-center gap-3 transition-all ${
                  isTaken ? 'border-green-200' : isSkipped ? 'border-gray-200 opacity-50' : 'border-gray-100'
                }`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  isTaken ? 'bg-green-50 text-green-600' : isSkipped ? 'bg-gray-50 text-gray-400' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {isTaken ? <Check size={20} /> : <Pill size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-base font-semibold ${isTaken ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{d.medicineName}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={11} /> {d.scheduledTime} • {d.dosage}</p>
                  {isTaken && <p className="text-[10px] text-green-600 mt-0.5">Marked taken at {new Date(d.takenAt!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {!isTaken && !isSkipped && (
                    <>
                      <button onClick={() => tick(d, 'taken')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl">
                        ✓ Taken
                      </button>
                      <button onClick={() => tick(d, 'skip')} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg">
                        Skip
                      </button>
                    </>
                  )}
                  {(isTaken || isSkipped) && (
                    <button onClick={() => tick(d, 'reset')} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg">
                      Undo
                    </button>
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
