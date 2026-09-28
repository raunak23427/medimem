// Conversational Q&A flow that captures Chief Complaint + HPI + Systemic
// Review for the selected member, saving incrementally to Firestore via
// useHealthData. Replaces the standalone Complaint tab and SystemicReview
// page — issues #3 and #6.

import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useHealthData } from '../../context/HealthDataContext';
import { CheckCircle2, ChevronRight, MessageCircle, Stethoscope } from 'lucide-react';
import type {
  ChiefComplaint, SystemicReview, SystemSymptoms, Severity, MedicalHistory,
} from '../../types';

const SYSTEM_QUESTIONS: { key: keyof Omit<SystemicReview, 'memberId' | 'updatedAt'>; label: string; emoji: string; symptoms: { key: string; label: string }[] }[] = [
  { key: 'general', label: 'General', emoji: '🌡️', symptoms: [
    { key: 'fever', label: 'Fever' }, { key: 'fatigue', label: 'Fatigue' },
    { key: 'weight_loss', label: 'Weight loss' }, { key: 'weight_gain', label: 'Weight gain' },
    { key: 'night_sweats', label: 'Night sweats' }, { key: 'loss_of_appetite', label: 'Loss of appetite' },
  ]},
  { key: 'cardiovascular', label: 'Heart / Circulation', emoji: '❤️', symptoms: [
    { key: 'chest_pain', label: 'Chest pain' }, { key: 'palpitations', label: 'Palpitations' },
    { key: 'dyspnea_on_exertion', label: 'Breathlessness on exertion' }, { key: 'orthopnea', label: 'Breathlessness lying flat' },
    { key: 'pedal_edema', label: 'Leg swelling' }, { key: 'syncope', label: 'Fainting' },
  ]},
  { key: 'respiratory', label: 'Lungs / Breathing', emoji: '🫁', symptoms: [
    { key: 'cough_dry', label: 'Dry cough' }, { key: 'cough_wet', label: 'Wet cough' },
    { key: 'wheezing', label: 'Wheezing' }, { key: 'cold', label: 'Cold' },
    { key: 'chest_pain_breathing', label: 'Chest pain with breathing' },
    { key: 'shortness_of_breath', label: 'Shortness of breath' },
    { key: 'hemoptysis', label: 'Coughing blood' },
  ]},
  { key: 'gastrointestinal', label: 'Stomach / Digestion', emoji: '🥫', symptoms: [
    { key: 'nausea', label: 'Nausea' }, { key: 'vomiting', label: 'Vomiting' },
    { key: 'diarrhea', label: 'Diarrhea' }, { key: 'constipation', label: 'Constipation' },
    { key: 'acidity', label: 'Acidity' }, { key: 'gas', label: 'Gas' },
    { key: 'abdominal_pain', label: 'Abdominal pain' },
    { key: 'jaundice', label: 'Jaundice' }, { key: 'blood_in_stool', label: 'Blood in stool' },
  ]},
  { key: 'urinary', label: 'Urinary', emoji: '💧', symptoms: [
    { key: 'burning_micturition', label: 'Burning urination' }, { key: 'frequency', label: 'Frequent urination' },
    { key: 'blood_in_urine', label: 'Blood in urine' }, { key: 'pain', label: 'Pain' },
    { key: 'difficulty_holding', label: 'Difficulty holding urine' },
    { key: 'nocturia', label: 'Waking at night to urinate' }, { key: 'incontinence', label: 'Leaking urine' },
  ]},
  { key: 'genital', label: 'Genital', emoji: '⚕️', symptoms: [
    { key: 'itching', label: 'Itching' }, { key: 'rash', label: 'Rash' },
    { key: 'discharge', label: 'Discharge' }, { key: 'ulcers', label: 'Ulcers' },
    { key: 'pain', label: 'Pain' }, { key: 'lumps', label: 'Lumps' },
  ]},
  { key: 'musculoskeletal', label: 'Joints / Muscles', emoji: '🦴', symptoms: [
    { key: 'joint_pain', label: 'Joint pain' }, { key: 'joint_swelling', label: 'Joint swelling' },
    { key: 'joint_stiffness', label: 'Joint stiffness' }, { key: 'back_pain', label: 'Back pain' },
    { key: 'muscle_weakness', label: 'Muscle weakness' }, { key: 'limited_movement', label: 'Limited movement' },
  ]},
  { key: 'neurological', label: 'Brain / Nerves', emoji: '🧠', symptoms: [
    { key: 'headache', label: 'Headache' }, { key: 'dizziness', label: 'Dizziness' },
    { key: 'fits_seizures', label: 'Fits / seizures' }, { key: 'neck_stiffness', label: 'Neck stiffness' },
    { key: 'vomiting', label: 'Vomiting' }, { key: 'altered_consciousness', label: 'Altered consciousness' },
    { key: 'numbness', label: 'Numbness' }, { key: 'tingling', label: 'Tingling' },
    { key: 'memory_loss', label: 'Memory loss' }, { key: 'weakness', label: 'Limb weakness' },
  ]},
  { key: 'endocrine', label: 'Endocrine', emoji: '🦋', symptoms: [
    { key: 'heat_intolerance', label: 'Heat intolerance' }, { key: 'cold_intolerance', label: 'Cold intolerance' },
    { key: 'increased_thirst', label: 'Increased thirst' }, { key: 'increased_urination', label: 'Increased urination' },
    { key: 'weight_change', label: 'Unexplained weight change' }, { key: 'hair_growth_changes', label: 'Hair growth changes' },
  ]},
  { key: 'skin', label: 'Skin & Hair', emoji: '✨', symptoms: [
    { key: 'itching', label: 'Itching' }, { key: 'rash', label: 'Rash' },
    { key: 'redness', label: 'Redness' }, { key: 'color_change', label: 'Color change' },
    { key: 'hair_fall', label: 'Hair fall' }, { key: 'dandruff', label: 'Dandruff' },
    { key: 'dryness', label: 'Dryness' }, { key: 'lesions', label: 'Lesions' },
  ]},
  { key: 'ent', label: 'ENT', emoji: '👂', symptoms: [
    { key: 'ear_pain', label: 'Ear pain' }, { key: 'ear_discharge', label: 'Ear discharge' },
    { key: 'hearing_problem', label: 'Hearing problem' }, { key: 'tinnitus', label: 'Ringing in ears' },
    { key: 'nasal_block', label: 'Nasal block' }, { key: 'sore_throat', label: 'Sore throat' },
    { key: 'sinus_pain', label: 'Sinus pain' },
  ]},
  { key: 'eye', label: 'Eye', emoji: '👁️', symptoms: [
    { key: 'redness', label: 'Redness' }, { key: 'discharge', label: 'Discharge' },
    { key: 'stye', label: 'Stye' }, { key: 'vision_problem', label: 'Vision problem' },
    { key: 'headache', label: 'Headache' }, { key: 'pain', label: 'Pain' },
    { key: 'photophobia', label: 'Light sensitivity' }, { key: 'watering', label: 'Watering' },
  ]},
];

const STEPS = [
  'complaint', 'duration', 'severity', 'onset', 'progression',
  'associated', 'aggravating', 'relieving',
  'review', 'done',
] as const;
type StepKey = typeof STEPS[number];

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-teal-500 focus:outline-none';

function emptyComplaint(): ChiefComplaint {
  return {
    problem: '', durationDays: null, severity: 'mild', startDate: null,
    onset: 'gradual', progression: 'stable',
    associatedSymptoms: [], aggravatingFactors: [], relievingFactors: [],
  };
}

function emptySystemic(memberId: string): SystemicReview {
  const blank = <T extends string>(): SystemSymptoms<T> => ({ symptoms: {}, notes: '' });
  return {
    memberId,
    general: blank(), cardiovascular: blank(), respiratory: blank(),
    gastrointestinal: blank(), urinary: blank(), genital: blank(),
    musculoskeletal: blank(), neurological: blank(), endocrine: blank(),
    skin: blank(), ent: blank(), eye: blank(),
    updatedAt: new Date().toISOString(),
  };
}

export default function GuidedHistoryQA() {
  const { familyMembers, selectedMemberId } = useApp();
  const { getMemberHistory, saveMedicalHistory, getMemberSystemicReview, saveSystemicReview } = useHealthData();
  const member = familyMembers.find((m) => m.id === selectedMemberId);

  const initialComplaint = useMemo(
    () => getMemberHistory(selectedMemberId)?.chiefComplaint ?? emptyComplaint(),
    [getMemberHistory, selectedMemberId],
  );
  const initialReview = useMemo(
    () => getMemberSystemicReview(selectedMemberId) ?? emptySystemic(selectedMemberId),
    [getMemberSystemicReview, selectedMemberId],
  );

  const [complaint, setComplaint] = useState<ChiefComplaint>(initialComplaint);
  const [review, setReview] = useState<SystemicReview>(initialReview);
  const [step, setStep] = useState<StepKey>('complaint');
  const [systemIdx, setSystemIdx] = useState(0);

  if (!member) {
    return <div className="p-6 text-center text-sm text-gray-500">Select a family member to start the guided assessment.</div>;
  }

  const saveComplaint = (next: ChiefComplaint) => {
    setComplaint(next);
    const existing = getMemberHistory(selectedMemberId);
    const base: MedicalHistory = existing ?? {
      memberId: selectedMemberId,
      chiefComplaint: null, presentIllness: null,
      chronicConditions: [], infectiousHistory: [], surgicalHistory: [],
      hospitalizations: [], allergies: [], familyHistory: [],
      lifestyle: null, mentalHealth: [],
      updatedAt: new Date().toISOString(),
    };
    saveMedicalHistory({ ...base, chiefComplaint: next, presentIllness: next, updatedAt: new Date().toISOString() });
  };

  const persistReview = (next: SystemicReview) => {
    setReview(next);
    saveSystemicReview({ ...next, updatedAt: new Date().toISOString() });
  };

  const csv = (arr: string[]) => arr.join(', ');
  const parse = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

  const next = () => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  };
  const prev = () => {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  };

  const stepIndex = STEPS.indexOf(step);
  const totalSteps = STEPS.length;

  // ─── Bubble + nav scaffold ──────────────────────────────────
  return (
    <div className="pb-4 px-4">
      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-gray-500">Question {Math.min(stepIndex + 1, totalSteps)} of {totalSteps}</p>
          <p className="text-xs text-gray-400">{member.name}</p>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }} />
        </div>
      </div>

      {/* Step bodies */}
      {step === 'complaint' && (
        <Bubble q="What's the main problem you (or this family member) want to discuss?">
          <textarea value={complaint.problem} onChange={(e) => saveComplaint({ ...complaint, problem: e.target.value })}
            rows={3} placeholder="e.g. Chest pain on climbing stairs since last week" className={inputCls} />
        </Bubble>
      )}
      {step === 'duration' && (
        <Bubble q="How many days has this been going on?">
          <input type="number" min={0} value={complaint.durationDays ?? ''}
            onChange={(e) => saveComplaint({ ...complaint, durationDays: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="e.g. 7" className={inputCls} />
        </Bubble>
      )}
      {step === 'severity' && (
        <Bubble q="How severe is it right now?">
          <div className="grid grid-cols-4 gap-2">
            {(['mild', 'moderate', 'severe', 'critical'] as Severity[]).map((s) => (
              <button key={s} onClick={() => saveComplaint({ ...complaint, severity: s })}
                className={`px-2 py-2.5 rounded-xl text-xs font-medium capitalize transition-colors ${
                  complaint.severity === s ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-600'
                }`}>{s}</button>
            ))}
          </div>
        </Bubble>
      )}
      {step === 'onset' && (
        <Bubble q="Did it start suddenly or gradually?">
          <div className="grid grid-cols-3 gap-2">
            {(['sudden', 'gradual', 'unknown'] as const).map((s) => (
              <button key={s} onClick={() => saveComplaint({ ...complaint, onset: s })}
                className={`px-2 py-2.5 rounded-xl text-xs font-medium capitalize ${
                  complaint.onset === s ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-600'
                }`}>{s}</button>
            ))}
          </div>
        </Bubble>
      )}
      {step === 'progression' && (
        <Bubble q="Is it getting worse, getting better, or staying the same?">
          <div className="grid grid-cols-2 gap-2">
            {(['worsening', 'improving', 'stable', 'fluctuating', 'unknown'] as const).map((s) => (
              <button key={s} onClick={() => saveComplaint({ ...complaint, progression: s })}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium capitalize ${
                  complaint.progression === s ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-600'
                }`}>{s}</button>
            ))}
          </div>
        </Bubble>
      )}
      {step === 'associated' && (
        <Bubble q="Any other symptoms along with the main problem?">
          <input value={csv(complaint.associatedSymptoms)} onChange={(e) => saveComplaint({ ...complaint, associatedSymptoms: parse(e.target.value) })}
            placeholder="e.g. sweating, nausea, dizziness (comma separated)" className={inputCls} />
        </Bubble>
      )}
      {step === 'aggravating' && (
        <Bubble q="What makes it worse?">
          <input value={csv(complaint.aggravatingFactors)} onChange={(e) => saveComplaint({ ...complaint, aggravatingFactors: parse(e.target.value) })}
            placeholder="e.g. exertion, lying flat, cold weather" className={inputCls} />
        </Bubble>
      )}
      {step === 'relieving' && (
        <Bubble q="What makes it better?">
          <input value={csv(complaint.relievingFactors)} onChange={(e) => saveComplaint({ ...complaint, relievingFactors: parse(e.target.value) })}
            placeholder="e.g. rest, medication, food" className={inputCls} />
        </Bubble>
      )}
      {step === 'review' && (
        <SystemicSystemStep
          system={SYSTEM_QUESTIONS[systemIdx]}
          review={review}
          onChange={persistReview}
          onNext={() => {
            if (systemIdx < SYSTEM_QUESTIONS.length - 1) setSystemIdx(systemIdx + 1);
            else next();
          }}
          onBack={() => {
            if (systemIdx > 0) setSystemIdx(systemIdx - 1);
            else prev();
          }}
          progress={`System ${systemIdx + 1} / ${SYSTEM_QUESTIONS.length}`}
        />
      )}
      {step === 'done' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
          <CheckCircle2 size={28} className="text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-emerald-800">All caught up</p>
          <p className="text-xs text-emerald-700 mt-1">Your assessment is saved. The AI now has the latest context for chat + summaries.</p>
          <button onClick={() => { setStep('complaint'); setSystemIdx(0); }} className="text-xs text-emerald-700 font-semibold underline mt-3">Restart assessment</button>
        </div>
      )}

      {/* Nav buttons (hidden during review step — handled internally) */}
      {step !== 'review' && step !== 'done' && (
        <div className="flex gap-2 mt-5">
          <button onClick={prev} disabled={stepIndex === 0}
            className="flex-1 bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl disabled:opacity-50">
            Back
          </button>
          <button onClick={next}
            className="flex-[2] bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-1.5">
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function Bubble({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={16} className="text-teal-600" />
        </div>
        <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-sm p-3">
          <p className="text-sm text-gray-800">{q}</p>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function SystemicSystemStep({
  system, review, onChange, onNext, onBack, progress,
}: {
  system: typeof SYSTEM_QUESTIONS[number];
  review: SystemicReview;
  onChange: (r: SystemicReview) => void;
  onNext: () => void; onBack: () => void; progress: string;
}) {
  const current = (review[system.key] as SystemSymptoms<string>) ?? { symptoms: {}, notes: '' };
  const toggle = (k: string) => {
    const symptoms = { ...current.symptoms };
    if (symptoms[k]) delete symptoms[k]; else symptoms[k] = true;
    onChange({ ...review, [system.key]: { ...current, symptoms } } as SystemicReview);
  };
  const setNotes = (notes: string) => {
    onChange({ ...review, [system.key]: { ...current, notes } } as SystemicReview);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
          <Stethoscope size={16} className="text-teal-600" />
        </div>
        <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-sm p-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{progress}</p>
          <p className="text-sm text-gray-800"><span className="text-base mr-1">{system.emoji}</span>Any of these <strong>{system.label}</strong> symptoms?</p>
          <p className="text-[10px] text-gray-500 mt-1">Tap all that apply. Leave blank if none.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {system.symptoms.map((s) => {
          const on = Boolean(current.symptoms?.[s.key]);
          return (
            <button key={s.key} onClick={() => toggle(s.key)}
              className={`text-xs px-2.5 py-1.5 rounded-full transition-colors ${
                on ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}>{s.label}</button>
          );
        })}
      </div>
      <textarea
        value={current.notes ?? ''}
        onChange={(e) => setNotes(e.target.value)}
        rows={2} placeholder="Notes for this system (optional)"
        className={inputCls}
      />
      <div className="flex gap-2 pt-1">
        <button onClick={onBack} className="flex-1 bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl">Back</button>
        <button onClick={onNext} className="flex-[2] bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-1.5">
          Next system <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
