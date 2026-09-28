import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useHealthData } from '../context/HealthDataContext';
import {
  Stethoscope, Plus, Trash2, Calendar, AlertCircle, RefreshCw,
  Activity, Pill, Heart, FileText, CheckCircle2, Clock,
} from 'lucide-react';
import type { Consultation, VisitPurpose } from '../types';
import { generateId } from '../utils/helpers';
import { generateDoctorSummaryAI, chatWithMedicalHistory } from '../services/ai';

const PURPOSES: { value: VisitPurpose; label: string; icon: typeof Activity; color: string }[] = [
  { value: 'new_illness', label: 'New Illness', icon: AlertCircle, color: 'text-red-600 bg-red-50' },
  { value: 'follow_up', label: 'Follow-up', icon: RefreshCw, color: 'text-blue-600 bg-blue-50' },
  { value: 'emergency', label: 'Emergency', icon: Heart, color: 'text-rose-600 bg-rose-50' },
  { value: 'routine', label: 'Routine Check-up', icon: Activity, color: 'text-teal-600 bg-teal-50' },
  { value: 'preventive', label: 'Preventive', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
];

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-teal-500 focus:outline-none';

export default function ConsultationsPage() {
  const { familyMembers, selectedMemberId, setSelectedMemberId, getMemberRecords, getMemberMedicines } = useApp();
  const { getMemberConsultations, saveConsultation, removeConsultation } = useHealthData();
  const [creating, setCreating] = useState(false);
  const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);

  const member = familyMembers.find((m) => m.id === selectedMemberId);
  const consultations = useMemo(() => getMemberConsultations(selectedMemberId), [getMemberConsultations, selectedMemberId]);
  const upcoming = consultations.filter((c) => !c.completedAt && new Date(c.scheduledDate) >= new Date());
  const past = consultations.filter((c) => c.completedAt || new Date(c.scheduledDate) < new Date());

  if (!member) {
    return <div className="p-6 text-center text-sm text-gray-500">Add a family member to manage consultations.</div>;
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Doctor Visits</h1>
          <p className="text-xs text-gray-500">Pre-visit prep & post-visit summaries</p>
        </div>
        <button onClick={() => setCreating(true)} className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium px-3 py-2 rounded-xl flex items-center gap-1.5">
          <Plus size={14} /> New Visit
        </button>
      </div>

      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {familyMembers.map((m) => (
            <button key={m.id} onClick={() => setSelectedMemberId(m.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                selectedMemberId === m.id ? 'bg-teal-100 text-teal-700 ring-1 ring-teal-300' : 'bg-gray-50 text-gray-500'
              }`}>
              {m.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Upcoming</h3>
            <div className="space-y-2">
              {upcoming.map((c) => (
                <ConsultationCard key={c.id} consultation={c} onOpen={() => setActiveConsultation(c)} onRemove={() => removeConsultation(c.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Past */}
        {past.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Past Visits</h3>
            <div className="space-y-2">
              {past.map((c) => (
                <ConsultationCard key={c.id} consultation={c} onOpen={() => setActiveConsultation(c)} onRemove={() => removeConsultation(c.id)} />
              ))}
            </div>
          </div>
        )}

        {consultations.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Stethoscope size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No doctor visits planned yet.</p>
            <button onClick={() => setCreating(true)} className="text-sm text-teal-600 font-medium mt-2 hover:underline">
              Schedule your first visit
            </button>
          </div>
        )}
      </div>

      {creating && (
        <NewConsultationModal
          memberId={selectedMemberId}
          onClose={() => setCreating(false)}
          onSave={(c) => { saveConsultation(c); setCreating(false); setActiveConsultation(c); }}
        />
      )}

      {activeConsultation && (
        <ConsultationDetailModal
          consultation={activeConsultation}
          onClose={() => setActiveConsultation(null)}
          onSave={(c) => { saveConsultation(c); setActiveConsultation(c); }}
          generatePreVisit={async () => {
            const recs = getMemberRecords(selectedMemberId);
            const meds = getMemberMedicines(selectedMemberId);
            try {
              const summary = await generateDoctorSummaryAI(member, recs, meds);
              const text = formatPreVisit(summary);
              const next = { ...activeConsultation, preVisitSummary: text };
              saveConsultation(next);
              setActiveConsultation(next);
            } catch (err) {
              console.warn('pre-visit generation failed', err);
            }
          }}
          generatePostVisit={async () => {
            const allRecs = getMemberRecords(selectedMemberId);
            const meds = getMemberMedicines(selectedMemberId);
            // Records created since the consultation was scheduled — these
            // capture the discharge summary / new labs that came out of
            // the visit.
            const sinceVisit = allRecs.filter((r) => new Date(r.createdAt) >= new Date(activeConsultation.createdAt));
            const recsToUse = sinceVisit.length > 0 ? sinceVisit : allRecs.slice(0, 3);
            const summary = activeConsultation.preVisitSummary || 'No pre-visit summary on file.';
            const prompt = `The patient (${member.name}, ${member.age}y ${member.gender}) just visited the doctor for: ${activeConsultation.purpose.replace('_', ' ')}.

Their pre-visit brief was:
"""
${summary}
"""

After the visit, these new records were added:
${recsToUse.map((r) => `[${r.date}] ${r.documentType} — Dx: ${r.diagnosis.join(', ')} | Meds: ${r.medicines.map((m) => `${m.name} ${m.dosage}`).join(', ')} | Findings: ${r.keyFindings ?? ''}`).join('\n')}

Generate a structured post-visit summary in plain English (max 8 bullet lines) covering:
- Final diagnosis (what was concluded)
- Medication changes (started / stopped / changed dose)
- Tests advised next
- Follow-up plan + when
- Any red flags the patient should watch for

Begin each line with a single dash. No preamble, no JSON.`;
            try {
              const reply = await chatWithMedicalHistory(member, recsToUse, meds, [], prompt);
              const next = { ...activeConsultation, postVisitSummary: reply, completedAt: activeConsultation.completedAt ?? new Date().toISOString() };
              saveConsultation(next);
              setActiveConsultation(next);
            } catch (err) {
              console.warn('post-visit generation failed', err);
            }
          }}
        />
      )}
    </div>
  );
}

function formatPreVisit(s: import('../types').DoctorSummary): string {
  const lines: string[] = [];
  lines.push(`Patient: ${s.patientInfo.name}, ${s.patientInfo.age}y ${s.patientInfo.gender} • Blood: ${s.patientInfo.bloodGroup}`);
  if (s.activeConditions.length > 0) lines.push(`Active conditions: ${s.activeConditions.join(', ')}`);
  if (s.allergies.length > 0) lines.push(`⚠️ Allergies: ${s.allergies.join(', ')}`);
  if (s.currentMedicines.length > 0) lines.push(`Current meds: ${s.currentMedicines.map(m => `${m.name} ${m.dosage}`).join(', ')}`);
  if (s.recentLabHighlights.length > 0) {
    lines.push('Recent labs:');
    s.recentLabHighlights.forEach(l => lines.push(`  • ${l.test}: ${l.value} (${l.date}) ${l.status === 'abnormal' ? '⚠️' : ''}`));
  }
  if (s.keyHistoryPoints.length > 0) {
    lines.push('Key history:');
    s.keyHistoryPoints.forEach(p => lines.push(`  • ${p}`));
  }
  if (s.questionsForDoctor.length > 0) {
    lines.push('Suggested questions:');
    s.questionsForDoctor.forEach(q => lines.push(`  • ${q}`));
  }
  return lines.join('\n');
}

function ConsultationCard({ consultation, onOpen, onRemove }: { consultation: Consultation; onOpen: () => void; onRemove: () => void }) {
  const purpose = PURPOSES.find(p => p.value === consultation.purpose) ?? PURPOSES[3];
  const Icon = purpose.icon;
  const done = !!consultation.completedAt;
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center gap-3">
      <div className={`w-10 h-10 ${purpose.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} />
      </div>
      <button onClick={onOpen} className="flex-1 text-left min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{purpose.label}{consultation.doctorName ? ` · ${consultation.doctorName}` : ''}</p>
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <Calendar size={11} /> {new Date(consultation.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {consultation.specialty ? ` · ${consultation.specialty}` : ''}
          {done && <span className="text-green-600 ml-1 flex items-center gap-0.5"><CheckCircle2 size={10} /> Completed</span>}
        </p>
      </button>
      <button onClick={onRemove} className="p-1.5 hover:bg-red-50 rounded-md text-gray-300 hover:text-red-400 flex-shrink-0">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function NewConsultationModal({ memberId, onClose, onSave }: { memberId: string; onClose: () => void; onSave: (c: Consultation) => void }) {
  const [purpose, setPurpose] = useState<VisitPurpose>('routine');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [doctorName, setDoctorName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [specialty, setSpecialty] = useState('');

  const handleSave = () => {
    const c: Consultation = {
      id: generateId(), memberId, purpose, scheduledDate,
      doctorName: doctorName || null, hospitalName: hospitalName || null, specialty: specialty || null,
      preVisitSummary: null, postVisitSummary: null,
      finalDiagnosis: [], medicationChanges: [], testsAdvised: [],
      followUpDate: null, recordIds: [],
      createdAt: new Date().toISOString(), completedAt: null,
    };
    onSave(c);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl p-5 max-h-[90dvh] overflow-y-auto">
        <h2 className="font-bold text-lg text-gray-900 mb-1">New Doctor Visit</h2>
        <p className="text-xs text-gray-400 mb-4">What's the purpose of this visit?</p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {PURPOSES.map((p) => {
            const Icon = p.icon;
            return (
              <button key={p.value} onClick={() => setPurpose(p.value)}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                  purpose === p.value ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <Icon size={16} className={p.color.split(' ')[0]} />
                <span className="text-xs font-medium text-gray-700">{p.label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <Field label="Date"><input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Doctor"><input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="Dr. Name" className={inputCls} /></Field>
          <Field label="Hospital / clinic"><input value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} className={inputCls} /></Field>
          <Field label="Specialty"><input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Cardiology" className={inputCls} /></Field>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl">Cancel</button>
          <button onClick={handleSave} className="flex-[2] bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl">Schedule Visit</button>
        </div>
      </div>
    </div>
  );
}

function ConsultationDetailModal({ consultation, onClose, onSave, generatePreVisit, generatePostVisit }: {
  consultation: Consultation; onClose: () => void;
  onSave: (c: Consultation) => void;
  generatePreVisit: () => Promise<void>;
  generatePostVisit: () => Promise<void>;
}) {
  const [c, setC] = useState(consultation);
  const [generating, setGenerating] = useState(false);
  const [generatingPost, setGeneratingPost] = useState(false);
  const [postVisitInput, setPostVisitInput] = useState({
    diagnosis: c.finalDiagnosis.join(', '),
    medChanges: c.medicationChanges.join(', '),
    testsAdvised: c.testsAdvised.join(', '),
    followUpDate: c.followUpDate ?? '',
    notes: c.postVisitSummary ?? '',
  });

  // Keep modal state in sync when parent regenerates summaries
  useEffect(() => {
    setC(consultation);
    setPostVisitInput({
      diagnosis: consultation.finalDiagnosis.join(', '),
      medChanges: consultation.medicationChanges.join(', '),
      testsAdvised: consultation.testsAdvised.join(', '),
      followUpDate: consultation.followUpDate ?? '',
      notes: consultation.postVisitSummary ?? '',
    });
  }, [consultation]);

  const handleGenerate = async () => {
    setGenerating(true);
    await generatePreVisit();
    setGenerating(false);
  };
  const handleGeneratePost = async () => {
    setGeneratingPost(true);
    await generatePostVisit();
    setGeneratingPost(false);
  };

  const completeVisit = () => {
    const next: Consultation = {
      ...c,
      finalDiagnosis: postVisitInput.diagnosis.split(',').map(x => x.trim()).filter(Boolean),
      medicationChanges: postVisitInput.medChanges.split(',').map(x => x.trim()).filter(Boolean),
      testsAdvised: postVisitInput.testsAdvised.split(',').map(x => x.trim()).filter(Boolean),
      followUpDate: postVisitInput.followUpDate || null,
      postVisitSummary: postVisitInput.notes || null,
      completedAt: c.completedAt ?? new Date().toISOString(),
    };
    onSave(next);
    setC(next);
  };

  const purpose = PURPOSES.find(p => p.value === c.purpose) ?? PURPOSES[3];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl max-h-[92dvh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 z-10">
          <p className="text-xs text-gray-400 uppercase tracking-wider">{purpose.label}</p>
          <h2 className="font-bold text-lg text-gray-900">{c.doctorName || 'Visit'}{c.specialty ? ` · ${c.specialty}` : ''}</h2>
          <p className="text-xs text-gray-500">{new Date(c.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}{c.hospitalName ? ` · ${c.hospitalName}` : ''}</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Pre-visit */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><FileText size={14} /> Pre-Visit Brief</h3>
              <button onClick={handleGenerate} disabled={generating} className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1">
                <RefreshCw size={11} className={generating ? 'animate-spin' : ''} /> {c.preVisitSummary ? 'Regenerate' : 'Generate'}
              </button>
            </div>
            {c.preVisitSummary ? (
              <pre className="text-xs text-gray-700 bg-blue-50 rounded-xl p-3 whitespace-pre-wrap leading-relaxed font-sans">{c.preVisitSummary}</pre>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <Clock size={20} className="text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-500">AI will summarize all known history for this visit.</p>
              </div>
            )}
          </div>

          {/* Post-visit */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><CheckCircle2 size={14} /> Post-Visit Notes</h3>
              <button onClick={handleGeneratePost} disabled={generatingPost} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1">
                <RefreshCw size={11} className={generatingPost ? 'animate-spin' : ''} />
                {c.postVisitSummary ? 'Regenerate AI summary' : 'Generate AI summary'}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mb-2">Uses your pre-visit brief + any new records uploaded since the visit was scheduled.</p>
            <div className="space-y-3">
              <Field label="Final diagnosis (comma separated)">
                <input value={postVisitInput.diagnosis} onChange={(e) => setPostVisitInput({ ...postVisitInput, diagnosis: e.target.value })} className={inputCls} placeholder="e.g. Hypertension, Stage 1" />
              </Field>
              <Field label="Medication changes">
                <input value={postVisitInput.medChanges} onChange={(e) => setPostVisitInput({ ...postVisitInput, medChanges: e.target.value })} className={inputCls} placeholder="e.g. Started Telmisartan 40mg" />
              </Field>
              <Field label="Tests advised">
                <input value={postVisitInput.testsAdvised} onChange={(e) => setPostVisitInput({ ...postVisitInput, testsAdvised: e.target.value })} className={inputCls} placeholder="e.g. Lipid profile, ECG" />
              </Field>
              <Field label="Follow-up date">
                <input type="date" value={postVisitInput.followUpDate} onChange={(e) => setPostVisitInput({ ...postVisitInput, followUpDate: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Notes">
                <textarea value={postVisitInput.notes} onChange={(e) => setPostVisitInput({ ...postVisitInput, notes: e.target.value })} rows={3} className={inputCls} />
              </Field>
            </div>
          </div>

          <button onClick={completeVisit} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-1.5">
            <CheckCircle2 size={16} /> {c.completedAt ? 'Update Visit' : 'Mark Completed'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

// silence unused warning for Pill (used in PURPOSES.icon resolution dynamically)
void Pill;
