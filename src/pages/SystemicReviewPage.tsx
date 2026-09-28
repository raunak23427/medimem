import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useHealthData } from '../context/HealthDataContext';
import { Save, Stethoscope } from 'lucide-react';
import type {
  SystemicReview, SystemSymptoms,
  GeneralSymptomKey, CvsSymptomKey, RespSymptomKey, GiSymptomKey,
  UrinarySymptomKey, GenitalSymptomKey, MskSymptomKey, NeuroSymptomKey,
  EndocrineSymptomKey, SkinSymptomKey, EntSymptomKey, EyeSymptomKey,
} from '../types';

// ─── Symptom labels per system ───────────────────────────────

interface SystemDef<TKey extends string> {
  key: keyof Omit<SystemicReview, 'memberId' | 'updatedAt'>;
  label: string;
  emoji: string;
  symptoms: { key: TKey; label: string }[];
}

const GENERAL: SystemDef<GeneralSymptomKey> = {
  key: 'general', label: 'General', emoji: '🌡️',
  symptoms: [
    { key: 'fever', label: 'Fever' },
    { key: 'fatigue', label: 'Fatigue' },
    { key: 'weight_loss', label: 'Weight loss' },
    { key: 'weight_gain', label: 'Weight gain' },
    { key: 'night_sweats', label: 'Night sweats' },
    { key: 'loss_of_appetite', label: 'Loss of appetite' },
  ],
};
const CVS: SystemDef<CvsSymptomKey> = {
  key: 'cardiovascular', label: 'Cardiovascular (CVS)', emoji: '❤️',
  symptoms: [
    { key: 'chest_pain', label: 'Chest pain' },
    { key: 'palpitations', label: 'Palpitations' },
    { key: 'dyspnea_on_exertion', label: 'Dyspnea on exertion' },
    { key: 'orthopnea', label: 'Orthopnea (SOB lying flat)' },
    { key: 'pedal_edema', label: 'Pedal edema (leg swelling)' },
    { key: 'syncope', label: 'Syncope (fainting)' },
  ],
};
const RESP: SystemDef<RespSymptomKey> = {
  key: 'respiratory', label: 'Respiratory', emoji: '🫁',
  symptoms: [
    { key: 'cough_dry', label: 'Dry cough' },
    { key: 'cough_wet', label: 'Wet cough (with sputum)' },
    { key: 'wheezing', label: 'Wheezing' },
    { key: 'cold', label: 'Cold' },
    { key: 'chest_pain_breathing', label: 'Chest pain with breathing' },
    { key: 'shortness_of_breath', label: 'Shortness of breath' },
    { key: 'hemoptysis', label: 'Coughing blood (hemoptysis)' },
  ],
};
const GI: SystemDef<GiSymptomKey> = {
  key: 'gastrointestinal', label: 'Gastrointestinal', emoji: '🥫',
  symptoms: [
    { key: 'nausea', label: 'Nausea' },
    { key: 'vomiting', label: 'Vomiting' },
    { key: 'diarrhea', label: 'Diarrhea' },
    { key: 'constipation', label: 'Constipation' },
    { key: 'acidity', label: 'Acidity / heartburn' },
    { key: 'gas', label: 'Gas / bloating' },
    { key: 'abdominal_pain', label: 'Abdominal pain' },
    { key: 'jaundice', label: 'Jaundice (yellowing)' },
    { key: 'blood_in_stool', label: 'Blood in stool' },
  ],
};
const URINARY: SystemDef<UrinarySymptomKey> = {
  key: 'urinary', label: 'Urinary', emoji: '💧',
  symptoms: [
    { key: 'burning_micturition', label: 'Burning on urination' },
    { key: 'frequency', label: 'Frequency' },
    { key: 'blood_in_urine', label: 'Blood in urine' },
    { key: 'pain', label: 'Pain' },
    { key: 'difficulty_holding', label: 'Difficulty holding urine' },
    { key: 'nocturia', label: 'Nocturia (waking at night)' },
    { key: 'incontinence', label: 'Incontinence' },
  ],
};
const GENITAL: SystemDef<GenitalSymptomKey> = {
  key: 'genital', label: 'Genital', emoji: '⚕️',
  symptoms: [
    { key: 'itching', label: 'Itching' },
    { key: 'rash', label: 'Rash' },
    { key: 'discharge', label: 'Discharge' },
    { key: 'ulcers', label: 'Ulcers' },
    { key: 'pain', label: 'Pain' },
    { key: 'lumps', label: 'Lumps' },
  ],
};
const MSK: SystemDef<MskSymptomKey> = {
  key: 'musculoskeletal', label: 'Musculoskeletal', emoji: '🦴',
  symptoms: [
    { key: 'joint_pain', label: 'Joint pain' },
    { key: 'joint_swelling', label: 'Joint swelling' },
    { key: 'joint_stiffness', label: 'Joint stiffness' },
    { key: 'back_pain', label: 'Back pain' },
    { key: 'muscle_weakness', label: 'Muscle weakness' },
    { key: 'limited_movement', label: 'Limited movement' },
  ],
};
const NEURO: SystemDef<NeuroSymptomKey> = {
  key: 'neurological', label: 'Neurological', emoji: '🧠',
  symptoms: [
    { key: 'headache', label: 'Headache' },
    { key: 'dizziness', label: 'Dizziness' },
    { key: 'fits_seizures', label: 'Fits / seizures' },
    { key: 'neck_stiffness', label: 'Neck stiffness / tightness' },
    { key: 'vomiting', label: 'Vomiting (with headache)' },
    { key: 'altered_consciousness', label: 'Altered consciousness' },
    { key: 'numbness', label: 'Numbness' },
    { key: 'tingling', label: 'Tingling' },
    { key: 'memory_loss', label: 'Memory loss' },
    { key: 'weakness', label: 'Weakness in limbs' },
  ],
};
const ENDOCRINE: SystemDef<EndocrineSymptomKey> = {
  key: 'endocrine', label: 'Endocrine', emoji: '🦋',
  symptoms: [
    { key: 'heat_intolerance', label: 'Heat intolerance' },
    { key: 'cold_intolerance', label: 'Cold intolerance' },
    { key: 'increased_thirst', label: 'Increased thirst' },
    { key: 'increased_urination', label: 'Increased urination' },
    { key: 'weight_change', label: 'Unexplained weight change' },
    { key: 'hair_growth_changes', label: 'Hair growth changes' },
  ],
};
const SKIN: SystemDef<SkinSymptomKey> = {
  key: 'skin', label: 'Skin & Hair', emoji: '✨',
  symptoms: [
    { key: 'itching', label: 'Itching' },
    { key: 'rash', label: 'Rash' },
    { key: 'redness', label: 'Redness' },
    { key: 'color_change', label: 'Color change' },
    { key: 'hair_fall', label: 'Hair fall' },
    { key: 'dandruff', label: 'Dandruff' },
    { key: 'dryness', label: 'Dryness' },
    { key: 'lesions', label: 'Lesions / sores' },
  ],
};
const ENT: SystemDef<EntSymptomKey> = {
  key: 'ent', label: 'ENT', emoji: '👂',
  symptoms: [
    { key: 'ear_pain', label: 'Ear pain' },
    { key: 'ear_discharge', label: 'Ear discharge' },
    { key: 'hearing_problem', label: 'Hearing problem' },
    { key: 'tinnitus', label: 'Tinnitus (ringing)' },
    { key: 'nasal_block', label: 'Nasal block' },
    { key: 'sore_throat', label: 'Sore throat' },
    { key: 'sinus_pain', label: 'Sinus pain' },
  ],
};
const EYE: SystemDef<EyeSymptomKey> = {
  key: 'eye', label: 'Eye', emoji: '👁️',
  symptoms: [
    { key: 'redness', label: 'Redness' },
    { key: 'discharge', label: 'Discharge' },
    { key: 'stye', label: 'Stye' },
    { key: 'vision_problem', label: 'Vision problem' },
    { key: 'headache', label: 'Headache (eye related)' },
    { key: 'pain', label: 'Eye pain' },
    { key: 'photophobia', label: 'Photophobia (light sensitivity)' },
    { key: 'watering', label: 'Watering' },
  ],
};

const ALL_SYSTEMS = [GENERAL, CVS, RESP, GI, URINARY, GENITAL, MSK, NEURO, ENDOCRINE, SKIN, ENT, EYE] as const;

function emptySystem<T extends string>(): SystemSymptoms<T> { return { symptoms: {}, notes: '' }; }

function emptyReview(memberId: string): SystemicReview {
  return {
    memberId,
    general: emptySystem(),
    cardiovascular: emptySystem(),
    respiratory: emptySystem(),
    gastrointestinal: emptySystem(),
    urinary: emptySystem(),
    genital: emptySystem(),
    musculoskeletal: emptySystem(),
    neurological: emptySystem(),
    endocrine: emptySystem(),
    skin: emptySystem(),
    ent: emptySystem(),
    eye: emptySystem(),
    updatedAt: new Date().toISOString(),
  };
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-teal-500 focus:outline-none';

export default function SystemicReviewPage() {
  const { familyMembers, selectedMemberId, setSelectedMemberId } = useApp();
  const { getMemberSystemicReview, saveSystemicReview } = useHealthData();
  const [draft, setDraft] = useState<SystemicReview>(() => getMemberSystemicReview(selectedMemberId) ?? emptyReview(selectedMemberId));
  const [openSystem, setOpenSystem] = useState<string | null>('general');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraft(getMemberSystemicReview(selectedMemberId) ?? emptyReview(selectedMemberId));
  }, [selectedMemberId, getMemberSystemicReview]);

  const persist = (next: SystemicReview) => {
    setDraft(next);
    saveSystemicReview({ ...next, updatedAt: new Date().toISOString() });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const member = familyMembers.find((m) => m.id === selectedMemberId);
  if (!member) {
    return <div className="p-6 text-center text-sm text-gray-500">Add a family member to start systemic review.</div>;
  }

  function countSelected(sys: SystemSymptoms<string>): number {
    return Object.values(sys.symptoms ?? {}).filter(Boolean).length;
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Stethoscope size={20} className="text-teal-600" /> Systemic Review</h1>
          <p className="text-xs text-gray-500">Tap each system and tick current symptoms</p>
        </div>
        {savedFlash && <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1"><Save size={11} /> Saved</span>}
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

      <div className="px-4 space-y-2">
        {ALL_SYSTEMS.map((sys) => {
          const data = (draft[sys.key] as SystemSymptoms<string> | undefined) ?? emptySystem();
          const selected = countSelected(data);
          const isOpen = openSystem === sys.key;

          const toggleSymptom = (symKey: string) => {
            const nextSymptoms = { ...(data.symptoms ?? {}) };
            if (nextSymptoms[symKey]) {
              delete nextSymptoms[symKey];
            } else {
              nextSymptoms[symKey] = true;
            }
            persist({ ...draft, [sys.key]: { ...data, symptoms: nextSymptoms } } as SystemicReview);
          };
          const setNotes = (notes: string) => {
            persist({ ...draft, [sys.key]: { ...data, notes } } as SystemicReview);
          };

          return (
            <div key={sys.key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenSystem(isOpen ? null : sys.key)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{sys.emoji}</span>
                  <span className="text-sm font-semibold text-gray-900">{sys.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selected > 0 && (
                    <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">{selected}</span>
                  )}
                  <span className={`text-gray-400 text-xs ${isOpen ? 'rotate-180' : ''} transition-transform`}>▼</span>
                </div>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 border-t border-gray-100">
                  <div className="flex flex-wrap gap-1.5 my-3">
                    {sys.symptoms.map((s) => {
                      const on = Boolean(data.symptoms?.[s.key]);
                      return (
                        <button key={s.key} onClick={() => toggleSymptom(s.key)}
                          className={`text-xs px-2.5 py-1.5 rounded-full transition-colors ${
                            on ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    value={data.notes ?? ''}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Add notes (location, severity, duration, etc.)"
                    className={inputCls}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
