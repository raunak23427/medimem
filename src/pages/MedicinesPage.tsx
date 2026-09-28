import { useApp } from '../context/AppContext';
import { useHealthData } from '../context/HealthDataContext';
import { getInitials, getDaysRemaining, getRunoutColor, formatDate, generateId } from '../utils/helpers';
import { Pill, Bell, BellOff, Plus, Clock, X, Check, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { MedicalRecord, Medicine, MedicationDose } from '../types';

// Parse a "twice daily" / "1-0-1" / "every 8 hours" frequency string into
// the number of doses-per-day. Falls back to 1 if we can't tell.
function parseDosesPerDay(frequency: string): number {
  const lower = frequency.toLowerCase();
  if (lower.includes('once') || lower.includes('1 time')) return 1;
  if (lower.includes('twice') || lower.includes('2 times') || lower.includes('bid')) return 2;
  if (lower.includes('thrice') || lower.includes('three') || lower.includes('3 times') || lower.includes('tid')) return 3;
  if (lower.includes('four') || lower.includes('4 times') || lower.includes('qid')) return 4;
  // Match patterns like 1-0-1 (morning-noon-night)
  const dosePattern = lower.match(/(\d)-(\d)-(\d)(?:-(\d))?/);
  if (dosePattern) {
    const slots = dosePattern.slice(1).filter(Boolean).map(Number);
    return slots.reduce((sum, n) => sum + n, 0) || 1;
  }
  // every X hours
  const hours = lower.match(/every\s+(\d+)\s*hour/);
  if (hours) {
    return Math.max(1, Math.floor(24 / Number(hours[1])));
  }
  return 1;
}

// Generate the dose-time slots for a given doses-per-day count.
function doseTimes(dosesPerDay: number): string[] {
  if (dosesPerDay >= 4) return ['08:00', '13:00', '18:00', '22:00'];
  if (dosesPerDay === 3) return ['08:00', '14:00', '20:00'];
  if (dosesPerDay === 2) return ['09:00', '21:00'];
  return ['09:00'];
}

export default function MedicinesPage() {
  const { familyMembers, selectedMemberId, setSelectedMemberId, getMemberMedicines, addRecord } = useApp();
  const { getMemberDoses, saveMedicationDose } = useHealthData();
  const [showReminder, setShowReminder] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [tab, setTab] = useState<'today' | 'active' | 'history'>('today');
  const [showAddForm, setShowAddForm] = useState(false);

  // Manual medicine form state
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');
  const [medDuration, setMedDuration] = useState('');
  const [medStartDate, setMedStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Get all medicines across all members or selected member
  const allMeds = selectedMemberId === 'all'
    ? familyMembers.flatMap(m => getMemberMedicines(m.id).map(med => ({ ...med, memberName: m.name })))
    : getMemberMedicines(selectedMemberId).map(med => ({
        ...med,
        memberName: familyMembers.find(m => m.id === selectedMemberId)?.name || '',
      }));

  const activeMeds = allMeds.filter(m => {
    const days = getDaysRemaining(m.medicine.estimatedRunoutDate);
    return days === null || days > 0;
  });

  const pastMeds = allMeds.filter(m => {
    const days = getDaysRemaining(m.medicine.estimatedRunoutDate);
    return days !== null && days <= 0;
  });

  const displayMeds = tab === 'active' ? activeMeds : pastMeds;

  // ─── Duplicate-medicine + allergy warnings ──────────────────
  const warnings = useMemo(() => {
    const out: { type: 'duplicate' | 'allergy'; message: string }[] = [];

    // Duplicate detection: same drug name (case-insensitive) prescribed to the
    // same member across active records.
    const nameCount = new Map<string, number>();
    for (const m of activeMeds) {
      const key = `${m.memberName}::${m.medicine.name.trim().toLowerCase()}`;
      nameCount.set(key, (nameCount.get(key) ?? 0) + 1);
    }
    for (const [key, count] of nameCount) {
      if (count > 1) {
        const [memberName, drug] = key.split('::');
        out.push({ type: 'duplicate', message: `${memberName.split(' ')[0]} has ${count} active prescriptions for "${drug}". Check with the doctor — possible duplicate.` });
      }
    }

    // Allergy match: any active medicine matches a known allergen of the member.
    const member = familyMembers.find(m => m.id === selectedMemberId);
    if (member) {
      const allergens = member.allergies.map(a => a.toLowerCase());
      for (const m of activeMeds) {
        const drug = m.medicine.name.toLowerCase();
        for (const al of allergens) {
          if (al && (drug.includes(al) || al.includes(drug))) {
            out.push({ type: 'allergy', message: `⚠️ "${m.medicine.name}" may conflict with a recorded allergy: ${al}.` });
          }
        }
      }
    }
    return out;
  }, [activeMeds, familyMembers, selectedMemberId]);

  // ─── Today's dose schedule (synthesised from active meds) ───
  const todayISO = new Date().toISOString().split('T')[0];
  const todayDoses = useMemo(() => {
    if (selectedMemberId === 'all') return [];
    const targetMember = familyMembers.find(m => m.id === selectedMemberId);
    if (!targetMember) return [];
    const existing = getMemberDoses(selectedMemberId, todayISO);
    const slots: MedicationDose[] = [];
    for (const m of activeMeds) {
      const perDay = parseDosesPerDay(m.medicine.frequency);
      const times = doseTimes(perDay);
      for (const time of times) {
        const id = `${selectedMemberId}-${todayISO}-${m.medicine.name}-${time}`;
        const known = existing.find(e => e.id === id);
        slots.push(known ?? {
          id, memberId: selectedMemberId,
          medicineName: m.medicine.name, dosage: m.medicine.dosage,
          scheduledTime: time, scheduledDate: todayISO,
          takenAt: null, skipped: false,
        });
      }
    }
    return slots.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }, [activeMeds, selectedMemberId, familyMembers, todayISO, getMemberDoses]);

  // ─── Schedule today's notifications when reminders are enabled ──
  useEffect(() => {
    if (!reminderEnabled || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    const timers: number[] = [];
    const now = new Date();
    const memberName = familyMembers.find((m) => m.id === selectedMemberId)?.name ?? 'Patient';
    for (const d of todayDoses) {
      if (d.takenAt || d.skipped) continue;
      const [h, m] = d.scheduledTime.split(':').map(Number);
      const due = new Date(); due.setHours(h, m, 0, 0);
      const ms = due.getTime() - now.getTime();
      if (ms <= 0 || ms > 12 * 3600 * 1000) continue;
      const t = window.setTimeout(() => {
        new Notification(`Time for ${d.medicineName}`, {
          body: `${memberName} • ${d.dosage} • ${d.scheduledTime}`,
          icon: '/favicon.svg',
          tag: d.id,
        });
      }, ms);
      timers.push(t);
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [todayDoses, reminderEnabled, familyMembers, selectedMemberId]);

  const tickDose = (dose: MedicationDose, action: 'taken' | 'skip' | 'reset') => {
    const next: MedicationDose = action === 'taken'
      ? { ...dose, takenAt: new Date().toISOString(), skipped: false }
      : action === 'skip'
      ? { ...dose, takenAt: null, skipped: true }
      : { ...dose, takenAt: null, skipped: false };
    saveMedicationDose(next);
  };

  const handleAddMedicine = () => {
    if (!medName.trim()) return;

    // Calculate runout date
    let estimatedRunoutDate: string | null = null;
    if (medDuration && medStartDate) {
      const durationDays = parseInt(medDuration) || 0;
      if (durationDays > 0) {
        const runout = new Date(medStartDate);
        runout.setDate(runout.getDate() + durationDays);
        estimatedRunoutDate = runout.toISOString().split('T')[0];
      }
    }

    const medicine: Medicine = {
      name: medName,
      dosage: medDosage,
      frequency: medFrequency,
      duration: medDuration ? `${medDuration} days` : null,
      estimatedRunoutDate,
    };

    // Create a synthetic prescription record to store the medicine
    const record: MedicalRecord = {
      id: generateId(),
      memberId: selectedMemberId === 'all' ? familyMembers[0]?.id || '' : selectedMemberId,
      documentType: 'prescription',
      date: medStartDate,
      doctorName: null,
      hospitalName: null,
      patientName: familyMembers.find(m => m.id === (selectedMemberId === 'all' ? familyMembers[0]?.id : selectedMemberId))?.name || null,
      diagnosis: [],
      medicines: [medicine],
      labResults: [],
      keyFindings: `Manually added medicine: ${medName} ${medDosage}`,
      followUpDate: null,
      language: 'English',
      uploadedImageUrl: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addRecord(record);
    setShowAddForm(false);
    setMedName(''); setMedDosage(''); setMedFrequency(''); setMedDuration('');
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Pill size={20} className="text-purple-500" /> Family Medicines
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-2 hover:bg-purple-50 rounded-xl transition-colors"
            title="Add medicine manually"
          >
            <Plus size={18} className="text-purple-500" />
          </button>
          <button
            onClick={() => setShowReminder(!showReminder)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            {reminderEnabled ? <Bell size={18} className="text-teal-600" /> : <BellOff size={18} className="text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Add Medicine Form */}
      {showAddForm && (
        <div className="mx-4 mb-3 bg-purple-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-purple-800">Add Medicine Manually</h4>
            <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-purple-100 rounded-lg">
              <X size={14} className="text-purple-600" />
            </button>
          </div>
          <div className="space-y-2.5">
            <input value={medName} onChange={e => setMedName(e.target.value)} placeholder="Medicine name"
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-200 focus:border-purple-500 focus:outline-none bg-white" />
            <div className="grid grid-cols-2 gap-2">
              <input value={medDosage} onChange={e => setMedDosage(e.target.value)} placeholder="Dosage (e.g. 500mg)"
                className="text-sm px-3 py-2.5 rounded-lg border border-gray-200 focus:border-purple-500 focus:outline-none bg-white" />
              <input value={medFrequency} onChange={e => setMedFrequency(e.target.value)} placeholder="Frequency (e.g. twice daily)"
                className="text-sm px-3 py-2.5 rounded-lg border border-gray-200 focus:border-purple-500 focus:outline-none bg-white" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5">Start date</label>
                <input type="date" value={medStartDate} onChange={e => setMedStartDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:outline-none bg-white" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5">Duration (days)</label>
                <input type="number" value={medDuration} onChange={e => setMedDuration(e.target.value)} placeholder="e.g. 30"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:outline-none bg-white" />
              </div>
            </div>
            {selectedMemberId === 'all' && (
              <p className="text-[10px] text-orange-600">ℹ Medicine will be added for {familyMembers[0]?.name || 'first member'}</p>
            )}
            <button onClick={handleAddMedicine} disabled={!medName.trim()}
              className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5">
              <Check size={16} /> Add Medicine
            </button>
          </div>
        </div>
      )}

      {/* Reminder Settings */}
      {showReminder && (
        <div className="mx-4 mb-3 bg-blue-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Daily medicine reminders</p>
              <p className="text-xs text-gray-500">Get notified when it's time for medicines</p>
            </div>
            <button
              onClick={() => {
                setReminderEnabled(!reminderEnabled);
                if (!reminderEnabled) Notification.requestPermission();
              }}
              className={`w-11 h-6 rounded-full transition-colors relative ${reminderEnabled ? 'bg-teal-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${reminderEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      )}

      {/* Member Filter */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {familyMembers.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMemberId(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                selectedMemberId === m.id ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300' : 'bg-gray-50 text-gray-500'
              }`}
            >
              <span className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${
                selectedMemberId === m.id ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {getInitials(m.name).charAt(0)}
              </span>
              {m.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="px-4 mb-3 space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className={`rounded-xl p-3 border flex items-start gap-2 ${
              w.type === 'allergy' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <AlertTriangle size={14} className={`mt-0.5 flex-shrink-0 ${w.type === 'allergy' ? 'text-red-600' : 'text-amber-600'}`} />
              <p className={`text-xs ${w.type === 'allergy' ? 'text-red-800' : 'text-amber-800'}`}>{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 mb-3">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setTab('today')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === 'today' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            Today ({todayDoses.length})
          </button>
          <button
            onClick={() => setTab('active')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            Active ({activeMeds.length})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            History ({pastMeds.length})
          </button>
        </div>
      </div>

      {/* Today's schedule */}
      {tab === 'today' && (
        <div className="px-4 space-y-2">
          {selectedMemberId === 'all' && (
            <p className="text-xs text-center text-gray-400 py-4">Pick a single family member to see today's schedule.</p>
          )}
          {selectedMemberId !== 'all' && todayDoses.length === 0 && (
            <div className="text-center py-12">
              <CalendarIcon size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No medicines scheduled for today.</p>
            </div>
          )}
          {todayDoses.map((d) => {
            const taken = !!d.takenAt;
            const skipped = d.skipped;
            return (
              <div key={d.id} className={`bg-white rounded-xl p-3 shadow-sm border ${taken ? 'border-green-200' : skipped ? 'border-gray-200 opacity-50' : 'border-gray-100'} flex items-center gap-3`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  taken ? 'bg-green-50 text-green-600' : skipped ? 'bg-gray-50 text-gray-400' : 'bg-purple-50 text-purple-600'
                }`}>
                  {taken ? <Check size={16} /> : <Pill size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${taken ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{d.medicineName}</p>
                  <p className="text-xs text-gray-400">{d.dosage} • {d.scheduledTime}</p>
                  {taken && <p className="text-[10px] text-green-600 mt-0.5">Taken at {new Date(d.takenAt!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {!taken && !skipped && (
                    <>
                      <button onClick={() => tickDose(d, 'taken')} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg">Taken</button>
                      <button onClick={() => tickDose(d, 'skip')} className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg">Skip</button>
                    </>
                  )}
                  {(taken || skipped) && (
                    <button onClick={() => tickDose(d, 'reset')} className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg">Undo</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Medicine Cards (Active / History) */}
      {tab !== 'today' && <div className="px-4 space-y-3">
        {displayMeds.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">💊</p>
            <p className="font-semibold text-gray-900 mb-1">
              {tab === 'active' ? 'No active medicines' : 'No past medicines'}
            </p>
            <p className="text-sm text-gray-500 mb-4">Medicines from prescriptions will appear here.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-sm text-purple-600 font-medium hover:underline"
            >
              + Add a medicine manually
            </button>
          </div>
        ) : (
          displayMeds.map((item, i) => {
            const days = getDaysRemaining(item.medicine.estimatedRunoutDate);
            const needsRefill = days !== null && days < 3;
            return (
              <div key={i} className={`bg-white rounded-xl p-4 shadow-sm border ${needsRefill ? 'border-red-200' : 'border-gray-100'} ${tab === 'history' ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{item.medicine.name}</p>
                      {needsRefill && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">REFILL NEEDED</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{item.medicine.dosage}</p>
                  </div>
                  <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                    {item.memberName.split(' ')[0]}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} /> {item.medicine.frequency}
                  </div>
                  {item.record.doctorName && (
                    <p>Prescribed by: {item.record.doctorName} on {formatDate(item.record.date)}</p>
                  )}
                </div>

                {/* Runout Bar */}
                {days !== null && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400">Days remaining</span>
                      <span className={`font-bold ${days < 3 ? 'text-red-600' : days < 7 ? 'text-orange-600' : 'text-green-600'}`}>
                        {days === 0 ? 'Finished' : `${days} days`}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getRunoutColor(days)} battery-bar`}
                        style={{ width: `${Math.min(100, (days / 90) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>}
    </div>
  );
}
