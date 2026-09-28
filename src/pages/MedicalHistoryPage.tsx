import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useHealthData } from '../context/HealthDataContext';
import {
  Plus, Trash2, Save, Activity, AlertTriangle, Users, Scissors,
  Heart, Brain, Coffee, Hospital,
} from 'lucide-react';
import type {
  MedicalHistory, ChiefComplaint, ChronicCondition,
  InfectiousHistory, SurgicalHistory, AllergyEntry, FamilyHistoryEntry,
  LifestyleProfile, MentalHealthEntry, Severity, Outcome,
  HospitalizationHistory, PhysicalActivity, AddictionType, BowelHabit,
  DietType, MentalHealthCondition,
} from '../types';
import { generateId } from '../utils/helpers';
import VoiceInputButton from '../components/shared/VoiceInputButton';

// Note: chief complaint + HPI have moved into the AI Health Assistant
// (InsightsPage → Q&A tab) per the user spec.
const SECTIONS = [
  { key: 'chronic', label: 'Past Medical History', icon: Heart },
  { key: 'infectious', label: 'Infectious Disease History', icon: AlertTriangle },
  { key: 'surgical', label: 'Surgical', icon: Scissors },
  { key: 'hospitalizations', label: 'Hospitalizations', icon: Hospital },
  { key: 'allergy', label: 'Allergies', icon: AlertTriangle },
  { key: 'family', label: 'Family', icon: Users },
  { key: 'lifestyle', label: 'Lifestyle', icon: Coffee },
  { key: 'mental', label: 'Mental Health', icon: Brain },
] as const;

type SectionKey = typeof SECTIONS[number]['key'];

// Conditions where the user typically needs to specify a subtype.
const CHRONIC_OPTIONS: { name: string; needsSpecific?: string }[] = [
  { name: 'Diabetes' }, { name: 'Hypertension' }, { name: 'Hypercholesterolemia' },
  { name: 'Thyroid Disorder' }, { name: 'Asthma' },
  { name: 'Heart Disease', needsSpecific: 'CAD / Heart failure / Arrhythmia / Valve disease ...' },
  { name: 'Kidney Disease', needsSpecific: 'CKD stage / Stones / Nephritis ...' },
  { name: 'Liver Disease', needsSpecific: 'Fatty liver / Hepatitis / Cirrhosis ...' },
  { name: 'Arthritis' }, { name: 'Epilepsy' },
  { name: 'Cancer', needsSpecific: 'Type & site (e.g. breast, lung, colon ...)' },
];
const INFECTIOUS_OPTIONS = [
  'Tuberculosis', 'Leprosy', 'HIV/AIDS', 'Hepatitis A', 'Hepatitis B', 'Hepatitis C',
  'Dengue', 'Malaria', 'COVID-19', 'Typhoid', 'Chickenpox',
];
const GENETIC_OPTIONS = [
  'Diabetes', 'Hypertension', 'High Cholesterol', 'Asthma',
  'Autoimmune Disease', 'Cancer', 'Stroke',
  'Thalassemia', 'Sickle Cell Anemia', 'G6PD Deficiency', 'Albinism',
];

function newEmptyHistory(memberId: string): MedicalHistory {
  return {
    memberId,
    chiefComplaint: null,
    presentIllness: null,
    chronicConditions: [],
    infectiousHistory: [],
    surgicalHistory: [],
    hospitalizations: [],
    allergies: [],
    familyHistory: [],
    lifestyle: null,
    mentalHealth: [],
    updatedAt: new Date().toISOString(),
  };
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-teal-500 focus:outline-none';
const selectCls = inputCls + ' bg-white';

export default function MedicalHistoryPage() {
  const { familyMembers, selectedMemberId, setSelectedMemberId } = useApp();
  const { getMemberHistory, saveMedicalHistory } = useHealthData();
  const [section, setSection] = useState<SectionKey>('chronic');
  const [draft, setDraft] = useState<MedicalHistory>(() => getMemberHistory(selectedMemberId) ?? newEmptyHistory(selectedMemberId));
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraft(getMemberHistory(selectedMemberId) ?? newEmptyHistory(selectedMemberId));
  }, [selectedMemberId, getMemberHistory]);

  const persist = (next: MedicalHistory) => {
    setDraft(next);
    saveMedicalHistory({ ...next, updatedAt: new Date().toISOString() });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const member = useMemo(
    () => familyMembers.find((m) => m.id === selectedMemberId),
    [familyMembers, selectedMemberId],
  );

  if (!member) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        Add a family member to start their medical history.
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Medical History</h1>
          <p className="text-xs text-gray-500">AIIMS-level structured history-taking</p>
        </div>
        {savedFlash && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
            <Save size={11} /> Saved
          </span>
        )}
      </div>

      {/* Member selector */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {familyMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMemberId(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                selectedMemberId === m.id ? 'bg-teal-100 text-teal-700 ring-1 ring-teal-300' : 'bg-gray-50 text-gray-500'
              }`}
            >
              {m.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Section tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0 transition-colors ${
                  section === s.key ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={13} /> {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4">
        {section === 'chronic' && (
          <ChronicSection
            items={draft.chronicConditions}
            onChange={(items) => persist({ ...draft, chronicConditions: items })}
          />
        )}
        {section === 'infectious' && (
          <InfectiousSection
            items={draft.infectiousHistory}
            onChange={(items) => persist({ ...draft, infectiousHistory: items })}
          />
        )}
        {section === 'surgical' && (
          <SurgicalSection
            items={draft.surgicalHistory}
            onChange={(items) => persist({ ...draft, surgicalHistory: items })}
          />
        )}
        {section === 'hospitalizations' && (
          <HospitalizationsSection
            items={draft.hospitalizations}
            onChange={(items) => persist({ ...draft, hospitalizations: items })}
          />
        )}
        {section === 'allergy' && (
          <AllergySection
            items={draft.allergies}
            onChange={(items) => persist({ ...draft, allergies: items })}
          />
        )}
        {section === 'family' && (
          <FamilySection
            items={draft.familyHistory}
            onChange={(items) => persist({ ...draft, familyHistory: items })}
          />
        )}
        {section === 'lifestyle' && (
          <LifestyleSection
            value={draft.lifestyle}
            onChange={(v) => persist({ ...draft, lifestyle: v })}
          />
        )}
        {section === 'mental' && (
          <MentalHealthSection
            items={draft.mentalHealth}
            onChange={(items) => persist({ ...draft, mentalHealth: items })}
          />
        )}
      </div>
    </div>
  );
}

function Card({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3 shadow-sm">
      {title && <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{title}</h3>}
      {subtitle && <p className="text-xs text-gray-400 mb-3">{subtitle}</p>}
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

// ─── Complaint + HPI (merged) ─────────────────────────────────

function ComplaintSection({ value, onChange }: { value: ChiefComplaint | null; onChange: (v: ChiefComplaint) => void }) {
  const v: ChiefComplaint = value ?? {
    problem: '', durationDays: null, severity: 'mild', startDate: null,
    onset: 'gradual', progression: 'stable',
    associatedSymptoms: [], aggravatingFactors: [], relievingFactors: [],
  };
  const csv = (arr: string[]) => arr.join(', ');
  const parse = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

  return (
    <Card title="Chief Complaint & Present Illness" subtitle="The main problem and how it developed">
      <Field label="What is the main problem?">
        <div className="relative">
          <textarea
            value={v.problem}
            onChange={(e) => onChange({ ...v, problem: e.target.value })}
            rows={2}
            placeholder="e.g. Chest pain on exertion"
            className={inputCls + ' pr-10'}
          />
          <div className="absolute top-2 right-2">
            <VoiceInputButton onTranscript={(text) => onChange({ ...v, problem: v.problem ? `${v.problem} ${text}` : text })} />
          </div>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration (days)">
          <input type="number" min={0}
            value={v.durationDays ?? ''}
            onChange={(e) => onChange({ ...v, durationDays: e.target.value === '' ? null : Number(e.target.value) })}
            className={inputCls} />
        </Field>
        <Field label="Severity">
          <select value={v.severity}
            onChange={(e) => onChange({ ...v, severity: e.target.value as Severity })}
            className={selectCls}>
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
            <option value="critical">Critical</option>
          </select>
        </Field>
        <Field label="Onset">
          <select value={v.onset} onChange={(e) => onChange({ ...v, onset: e.target.value as ChiefComplaint['onset'] })} className={selectCls}>
            <option value="sudden">Sudden</option>
            <option value="gradual">Gradual</option>
            <option value="unknown">Unknown</option>
          </select>
        </Field>
        <Field label="Progression">
          <select value={v.progression} onChange={(e) => onChange({ ...v, progression: e.target.value as ChiefComplaint['progression'] })} className={selectCls}>
            <option value="worsening">Worsening</option>
            <option value="improving">Improving</option>
            <option value="stable">Stable</option>
            <option value="fluctuating">Fluctuating</option>
            <option value="unknown">Unknown</option>
          </select>
        </Field>
      </div>

      <Field label="Started on (approx)">
        <input type="date" value={v.startDate ?? ''}
          onChange={(e) => onChange({ ...v, startDate: e.target.value || null })}
          className={inputCls} />
      </Field>

      <Field label="Associated symptoms (comma separated)">
        <input value={csv(v.associatedSymptoms)} onChange={(e) => onChange({ ...v, associatedSymptoms: parse(e.target.value) })} placeholder="e.g. shortness of breath, sweating" className={inputCls} />
      </Field>
      <Field label="Aggravating factors">
        <input value={csv(v.aggravatingFactors)} onChange={(e) => onChange({ ...v, aggravatingFactors: parse(e.target.value) })} placeholder="e.g. climbing stairs, stress" className={inputCls} />
      </Field>
      <Field label="Relieving factors">
        <input value={csv(v.relievingFactors)} onChange={(e) => onChange({ ...v, relievingFactors: parse(e.target.value) })} placeholder="e.g. rest, medication" className={inputCls} />
      </Field>
    </Card>
  );
}

// ─── Chronic Conditions ───────────────────────────────────────

function ChronicSection({ items, onChange }: { items: ChronicCondition[]; onChange: (items: ChronicCondition[]) => void }) {
  const add = (option: { name: string; needsSpecific?: string }) => onChange([...items, {
    name: option.name, diagnosedYear: null, sinceDuration: '',
    treatment: '', medication: '', outcome: 'ongoing', notes: '',
    specificType: option.needsSpecific ? '' : undefined,
  }]);
  const update = (i: number, next: Partial<ChronicCondition>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...next } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <>
      <Card title="Past Medical History — Quick-add" subtitle="Tap to add a condition. Edit details below.">
        <div className="flex flex-wrap gap-1.5">
          {CHRONIC_OPTIONS.map((c) => (
            <button key={c.name} onClick={() => add(c)} className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full hover:bg-teal-100">
              + {c.name}
            </button>
          ))}
        </div>
      </Card>
      {items.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-3">No past medical history recorded.</p>
      )}
      {items.map((c, i) => {
        const meta = CHRONIC_OPTIONS.find((o) => o.name === c.name);
        return (
          <Card key={i}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <input value={c.name} onChange={(e) => update(i, { name: e.target.value })} className={inputCls + ' font-semibold'} />
              <button onClick={() => remove(i)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-300 hover:text-red-400 flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
            {(meta?.needsSpecific !== undefined || c.specificType !== undefined) && (
              <Field label="Specify type">
                <input value={c.specificType ?? ''}
                  onChange={(e) => update(i, { specificType: e.target.value })}
                  placeholder={meta?.needsSpecific ?? 'Specify'}
                  className={inputCls} />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year diagnosed">
                <input type="number" min={1900} max={new Date().getFullYear()}
                  value={c.diagnosedYear ?? ''}
                  onChange={(e) => update(i, { diagnosedYear: e.target.value === '' ? null : Number(e.target.value) })}
                  className={inputCls} />
              </Field>
              <Field label="Since (duration)">
                <input value={c.sinceDuration}
                  onChange={(e) => update(i, { sinceDuration: e.target.value })}
                  placeholder="e.g. 5 years"
                  className={inputCls} />
              </Field>
              <Field label="Outcome">
                <select value={c.outcome} onChange={(e) => update(i, { outcome: e.target.value as Outcome })} className={selectCls}>
                  <option value="ongoing">Ongoing</option>
                  <option value="controlled">Controlled</option>
                  <option value="recovered">Recovered</option>
                  <option value="worsened">Worsened</option>
                  <option value="unknown">Unknown</option>
                </select>
              </Field>
            </div>
            <Field label="Current treatment">
              <input value={c.treatment} onChange={(e) => update(i, { treatment: e.target.value })}
                placeholder="e.g. lifestyle + Metformin"
                className={inputCls} />
            </Field>
            <Field label="Current medication">
              <input value={c.medication} onChange={(e) => update(i, { medication: e.target.value })}
                placeholder="e.g. Metformin 500mg twice daily"
                className={inputCls} />
            </Field>
            <Field label="Notes">
              <textarea value={c.notes} onChange={(e) => update(i, { notes: e.target.value })} rows={2} className={inputCls} />
            </Field>
          </Card>
        );
      })}
    </>
  );
}

// ─── Infectious History ───────────────────────────────────────

function InfectiousSection({ items, onChange }: { items: InfectiousHistory[]; onChange: (items: InfectiousHistory[]) => void }) {
  const add = (name: string) => onChange([...items, { disease: name, year: null, treatment: '', durationDays: null, outcome: 'recovered' }]);
  const update = (i: number, next: Partial<InfectiousHistory>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...next } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <>
      <Card title="Infectious Disease History — Quick-add">
        <div className="flex flex-wrap gap-1.5">
          {INFECTIOUS_OPTIONS.map((c) => (
            <button key={c} onClick={() => add(c)} className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full hover:bg-orange-100">
              + {c}
            </button>
          ))}
        </div>
      </Card>
      {items.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No infectious disease history recorded.</p>}
      {items.map((it, i) => (
        <Card key={i}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <input value={it.disease} onChange={(e) => update(i, { disease: e.target.value })} className={inputCls + ' font-semibold'} />
            <button onClick={() => remove(i)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-300 hover:text-red-400 flex-shrink-0"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Year"><input type="number" value={it.year ?? ''} onChange={(e) => update(i, { year: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} /></Field>
            <Field label="Duration (days)"><input type="number" min={0} value={it.durationDays ?? ''} onChange={(e) => update(i, { durationDays: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} /></Field>
          </div>
          <Field label="Treatment received"><input value={it.treatment} onChange={(e) => update(i, { treatment: e.target.value })} className={inputCls} /></Field>
          <Field label="Outcome">
            <select value={it.outcome} onChange={(e) => update(i, { outcome: e.target.value as Outcome })} className={selectCls}>
              <option value="recovered">Recovered</option>
              <option value="ongoing">Ongoing</option>
              <option value="controlled">Controlled</option>
              <option value="worsened">Worsened</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>
        </Card>
      ))}
    </>
  );
}

// ─── Surgical History ─────────────────────────────────────────

function SurgicalSection({ items, onChange }: { items: SurgicalHistory[]; onChange: (items: SurgicalHistory[]) => void }) {
  const add = () => onChange([...items, { id: generateId(), surgery: '', date: null, hospital: '', surgeon: null, complications: '', notes: '' }]);
  const update = (i: number, next: Partial<SurgicalHistory>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...next } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <>
      <button onClick={add} className="w-full flex items-center justify-center gap-1.5 bg-teal-50 text-teal-700 font-medium text-sm py-2.5 rounded-xl mb-3 hover:bg-teal-100">
        <Plus size={14} /> Add Surgery
      </button>
      {items.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No surgical history recorded.</p>}
      {items.map((s, i) => (
        <Card key={s.id}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <input value={s.surgery} onChange={(e) => update(i, { surgery: e.target.value })} placeholder="Surgery name" className={inputCls + ' font-semibold'} />
            <button onClick={() => remove(i)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-300 hover:text-red-400 flex-shrink-0"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><input type="date" value={s.date ?? ''} onChange={(e) => update(i, { date: e.target.value || null })} className={inputCls} /></Field>
            <Field label="Hospital"><input value={s.hospital} onChange={(e) => update(i, { hospital: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Surgeon"><input value={s.surgeon ?? ''} onChange={(e) => update(i, { surgeon: e.target.value || null })} className={inputCls} /></Field>
          <Field label="Complications"><input value={s.complications} onChange={(e) => update(i, { complications: e.target.value })} placeholder="None / describe" className={inputCls} /></Field>
          <Field label="Notes"><textarea value={s.notes} onChange={(e) => update(i, { notes: e.target.value })} rows={2} className={inputCls} /></Field>
        </Card>
      ))}
    </>
  );
}

// ─── Hospitalizations ─────────────────────────────────────────

function HospitalizationsSection({ items, onChange }: { items: HospitalizationHistory[]; onChange: (items: HospitalizationHistory[]) => void }) {
  const add = () => onChange([...items, { id: generateId(), reason: '', hospital: '', admissionDate: null, dischargeDate: null, durationDays: null, notes: '' }]);
  const update = (i: number, next: Partial<HospitalizationHistory>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...next } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <>
      <button onClick={add} className="w-full flex items-center justify-center gap-1.5 bg-sky-50 text-sky-700 font-medium text-sm py-2.5 rounded-xl mb-3 hover:bg-sky-100">
        <Plus size={14} /> Add Hospitalization
      </button>
      {items.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No hospitalizations recorded.</p>}
      {items.map((h, i) => (
        <Card key={h.id}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <input value={h.reason} onChange={(e) => update(i, { reason: e.target.value })} placeholder="Reason for admission" className={inputCls + ' font-semibold'} />
            <button onClick={() => remove(i)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-300 hover:text-red-400 flex-shrink-0"><Trash2 size={14} /></button>
          </div>
          <Field label="Hospital"><input value={h.hospital} onChange={(e) => update(i, { hospital: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Admission date"><input type="date" value={h.admissionDate ?? ''} onChange={(e) => update(i, { admissionDate: e.target.value || null })} className={inputCls} /></Field>
            <Field label="Discharge date"><input type="date" value={h.dischargeDate ?? ''} onChange={(e) => update(i, { dischargeDate: e.target.value || null })} className={inputCls} /></Field>
          </div>
          <Field label="Duration (days)"><input type="number" min={0} value={h.durationDays ?? ''} onChange={(e) => update(i, { durationDays: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Notes"><textarea value={h.notes} onChange={(e) => update(i, { notes: e.target.value })} rows={2} className={inputCls} /></Field>
        </Card>
      ))}
    </>
  );
}

// ─── Allergies ────────────────────────────────────────────────

function AllergySection({ items, onChange }: { items: AllergyEntry[]; onChange: (items: AllergyEntry[]) => void }) {
  const add = () => onChange([...items, { id: generateId(), allergen: '', category: 'drug', reaction: '', severity: 'mild', firstNoticed: null }]);
  const update = (i: number, next: Partial<AllergyEntry>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...next } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <>
      <button onClick={add} className="w-full flex items-center justify-center gap-1.5 bg-red-50 text-red-700 font-medium text-sm py-2.5 rounded-xl mb-3 hover:bg-red-100">
        <Plus size={14} /> Add Allergy
      </button>
      {items.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No allergies recorded.</p>}
      {items.map((a, i) => (
        <Card key={a.id}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <input value={a.allergen} onChange={(e) => update(i, { allergen: e.target.value })} placeholder="Allergen (e.g. Penicillin)" className={inputCls + ' font-semibold'} />
            <button onClick={() => remove(i)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-300 hover:text-red-400 flex-shrink-0"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select value={a.category} onChange={(e) => update(i, { category: e.target.value as AllergyEntry['category'] })} className={selectCls}>
                <option value="drug">Drug</option>
                <option value="food">Food</option>
                <option value="environmental">Environmental</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Severity">
              <select value={a.severity} onChange={(e) => update(i, { severity: e.target.value as Severity })} className={selectCls}>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="critical">Critical</option>
              </select>
            </Field>
          </div>
          <Field label="Reaction"><input value={a.reaction} onChange={(e) => update(i, { reaction: e.target.value })} placeholder="e.g. rash, anaphylaxis" className={inputCls} /></Field>
          <Field label="First noticed"><input type="date" value={a.firstNoticed ?? ''} onChange={(e) => update(i, { firstNoticed: e.target.value || null })} className={inputCls} /></Field>
        </Card>
      ))}
    </>
  );
}

// ─── Family History ───────────────────────────────────────────

function FamilySection({ items, onChange }: { items: FamilyHistoryEntry[]; onChange: (items: FamilyHistoryEntry[]) => void }) {
  const add = () => onChange([...items, { id: generateId(), relation: 'father', conditions: [], age: null, alive: true }]);
  const update = (i: number, next: Partial<FamilyHistoryEntry>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...next } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const toggleCondition = (i: number, condition: string) => {
    const entry = items[i];
    const next = entry.conditions.includes(condition)
      ? entry.conditions.filter((c) => c !== condition)
      : [...entry.conditions, condition];
    update(i, { conditions: next });
  };
  return (
    <>
      <button onClick={add} className="w-full flex items-center justify-center gap-1.5 bg-purple-50 text-purple-700 font-medium text-sm py-2.5 rounded-xl mb-3 hover:bg-purple-100">
        <Plus size={14} /> Add Relative
      </button>
      {items.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No family history recorded.</p>}
      {items.map((f, i) => (
        <Card key={f.id}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <select value={f.relation} onChange={(e) => update(i, { relation: e.target.value as FamilyHistoryEntry['relation'] })} className={selectCls + ' font-semibold'}>
              <option value="father">Father</option>
              <option value="mother">Mother</option>
              <option value="sibling">Sibling</option>
              <option value="grandparent">Grandparent</option>
              <option value="uncle">Uncle</option>
              <option value="aunt">Aunt</option>
              <option value="other">Other</option>
            </select>
            <button onClick={() => remove(i)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-300 hover:text-red-400 flex-shrink-0"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Age">
              <input type="number" value={f.age ?? ''} onChange={(e) => update(i, { age: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Status">
              <select value={f.alive ? 'alive' : 'deceased'} onChange={(e) => update(i, { alive: e.target.value === 'alive' })} className={selectCls}>
                <option value="alive">Living</option>
                <option value="deceased">Deceased</option>
              </select>
            </Field>
          </div>
          <Field label="Conditions">
            <div className="flex flex-wrap gap-1.5">
              {GENETIC_OPTIONS.map((c) => {
                const on = f.conditions.includes(c);
                return (
                  <button
                    key={c} onClick={() => toggleCondition(i, c)}
                    className={`text-xs px-2.5 py-1 rounded-full ${on ? 'bg-purple-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </Field>
        </Card>
      ))}
    </>
  );
}

// ─── Lifestyle ────────────────────────────────────────────────

const PHYSICAL_ACTIVITIES: PhysicalActivity[] = ['walking', 'running', 'cycling', 'gym', 'sports', 'yoga', 'none'];
const ADDICTION_OPTIONS: AddictionType[] = ['tobacco', 'alcohol', 'recreational_drugs', 'caffeine', 'gambling', 'other'];

function LifestyleSection({ value, onChange }: { value: LifestyleProfile | null; onChange: (v: LifestyleProfile) => void }) {
  const v: LifestyleProfile = value ?? {
    diet: 'mixed', appetite: 'normal',
    physicalActivities: [], physicalActivityHoursPerWeek: null,
    addictions: [], addictionDetails: '',
    smoking: 'never', smokingPackYears: null,
    alcohol: 'never', sleepHours: null,
    bowelHabit: 'regular', bowelNotes: '',
    bladderTimesDay: null, bladderTimesNight: null, bladderAbnormality: '',
    occupation: '', stressLevel: 'moderate',
  };
  const toggleActivity = (a: PhysicalActivity) => {
    const next = v.physicalActivities.includes(a)
      ? v.physicalActivities.filter((x) => x !== a)
      : [...v.physicalActivities, a];
    onChange({ ...v, physicalActivities: next });
  };
  const toggleAddiction = (a: AddictionType) => {
    const next = v.addictions.includes(a)
      ? v.addictions.filter((x) => x !== a)
      : [...v.addictions, a];
    onChange({ ...v, addictions: next });
  };

  return (
    <>
      <Card title="Diet & Appetite">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Diet">
            <select value={v.diet} onChange={(e) => onChange({ ...v, diet: e.target.value as DietType })} className={selectCls}>
              <option value="vegetarian">Vegetarian</option>
              <option value="non-vegetarian">Non-vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="eggetarian">Eggetarian</option>
              <option value="mixed">Mixed</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>
          <Field label="Appetite">
            <select value={v.appetite} onChange={(e) => onChange({ ...v, appetite: e.target.value as LifestyleProfile['appetite'] })} className={selectCls}>
              <option value="normal">Normal</option>
              <option value="increased">Increased</option>
              <option value="decreased">Decreased</option>
              <option value="variable">Variable</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card title="Physical Activity">
        <Field label="Activities (tap to select)">
          <div className="flex flex-wrap gap-1.5">
            {PHYSICAL_ACTIVITIES.map((a) => {
              const on = v.physicalActivities.includes(a);
              return (
                <button key={a} onClick={() => toggleActivity(a)}
                  className={`text-xs px-2.5 py-1 rounded-full capitalize ${on ? 'bg-emerald-500 text-white' : 'bg-gray-50 text-gray-600'}`}>
                  {a}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Hours per week">
          <input type="number" min={0} max={168} step="0.5" value={v.physicalActivityHoursPerWeek ?? ''}
            onChange={(e) => onChange({ ...v, physicalActivityHoursPerWeek: e.target.value === '' ? null : Number(e.target.value) })}
            className={inputCls} />
        </Field>
      </Card>

      <Card title="Addictions & Substances">
        <Field label="Addictions">
          <div className="flex flex-wrap gap-1.5">
            {ADDICTION_OPTIONS.map((a) => {
              const on = v.addictions.includes(a);
              return (
                <button key={a} onClick={() => toggleAddiction(a)}
                  className={`text-xs px-2.5 py-1 rounded-full ${on ? 'bg-rose-500 text-white' : 'bg-gray-50 text-gray-600'}`}>
                  {a.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </Field>
        {v.addictions.length > 0 && (
          <Field label="Details (what, how much, how often)">
            <textarea value={v.addictionDetails} onChange={(e) => onChange({ ...v, addictionDetails: e.target.value })} rows={2} className={inputCls} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Smoking">
            <select value={v.smoking} onChange={(e) => onChange({ ...v, smoking: e.target.value as LifestyleProfile['smoking'] })} className={selectCls}>
              <option value="never">Never</option>
              <option value="former">Former</option>
              <option value="current">Current</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>
          {v.smoking !== 'never' && v.smoking !== 'unknown' && (
            <Field label="Pack-years">
              <input type="number" min={0} value={v.smokingPackYears ?? ''} onChange={(e) => onChange({ ...v, smokingPackYears: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} />
            </Field>
          )}
          <Field label="Alcohol">
            <select value={v.alcohol} onChange={(e) => onChange({ ...v, alcohol: e.target.value as LifestyleProfile['alcohol'] })} className={selectCls}>
              <option value="never">Never</option>
              <option value="occasional">Occasional</option>
              <option value="regular">Regular</option>
              <option value="heavy">Heavy</option>
              <option value="former">Former</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card title="Bowel & Bladder">
        <Field label="Bowel habit">
          <select value={v.bowelHabit} onChange={(e) => onChange({ ...v, bowelHabit: e.target.value as BowelHabit })} className={selectCls}>
            <option value="regular">Regular</option>
            <option value="constipation">Constipation</option>
            <option value="diarrhea">Diarrhea</option>
            <option value="alternating">Alternating</option>
            <option value="irregular">Irregular</option>
            <option value="unknown">Unknown</option>
          </select>
        </Field>
        <Field label="Bowel notes (consistency, blood, mucus, urgency...)"><input value={v.bowelNotes} onChange={(e) => onChange({ ...v, bowelNotes: e.target.value })} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Urination — day frequency">
            <input type="number" min={0} value={v.bladderTimesDay ?? ''} onChange={(e) => onChange({ ...v, bladderTimesDay: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Urination — night frequency">
            <input type="number" min={0} value={v.bladderTimesNight ?? ''} onChange={(e) => onChange({ ...v, bladderTimesNight: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} />
          </Field>
        </div>
        <Field label="Bladder abnormality (burning, urgency, blood, leakage...)">
          <input value={v.bladderAbnormality} onChange={(e) => onChange({ ...v, bladderAbnormality: e.target.value })} className={inputCls} />
        </Field>
      </Card>

      <Card title="Sleep, Work, Stress">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sleep (hours/night)">
            <input type="number" min={0} max={24} step="0.5" value={v.sleepHours ?? ''} onChange={(e) => onChange({ ...v, sleepHours: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Stress level">
            <select value={v.stressLevel} onChange={(e) => onChange({ ...v, stressLevel: e.target.value as LifestyleProfile['stressLevel'] })} className={selectCls}>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>
        </div>
        <Field label="Occupation"><input value={v.occupation} onChange={(e) => onChange({ ...v, occupation: e.target.value })} placeholder="e.g. Teacher" className={inputCls} /></Field>
      </Card>
    </>
  );
}

// ─── Mental Health ────────────────────────────────────────────

const MH_OPTIONS: MentalHealthCondition[] = [
  'anxiety', 'depression', 'adhd', 'autism', 'ocd', 'bipolar',
  'schizophrenia', 'ptsd', 'panic_disorder', 'eating_disorder',
  'substance_abuse', 'borderline_personality', 'phobia', 'insomnia',
  'dementia', 'other',
];

function MentalHealthSection({ items, onChange }: { items: MentalHealthEntry[]; onChange: (items: MentalHealthEntry[]) => void }) {
  const add = (condition: MentalHealthCondition) => onChange([...items, { condition, diagnosedYear: null, notes: '', underTreatment: false }]);
  const update = (i: number, next: Partial<MentalHealthEntry>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...next } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <>
      <Card title="Quick-add">
        <div className="flex flex-wrap gap-1.5">
          {MH_OPTIONS.map((o) => (
            <button key={o} onClick={() => add(o)} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full hover:bg-indigo-100 capitalize">
              + {o.replace('_', ' ')}
            </button>
          ))}
        </div>
      </Card>
      {items.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No mental health history recorded.</p>}
      {items.map((m, i) => (
        <Card key={i}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-sm font-semibold text-gray-900 capitalize">{m.condition.replace('_', ' ')}</p>
            <button onClick={() => remove(i)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-300 hover:text-red-400"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Year diagnosed"><input type="number" value={m.diagnosedYear ?? ''} onChange={(e) => update(i, { diagnosedYear: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} /></Field>
            <Field label="Under treatment?">
              <select value={m.underTreatment ? 'yes' : 'no'} onChange={(e) => update(i, { underTreatment: e.target.value === 'yes' })} className={selectCls}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </Field>
          </div>
          <Field label="Notes"><textarea value={m.notes} onChange={(e) => update(i, { notes: e.target.value })} rows={2} className={inputCls} /></Field>
        </Card>
      ))}
    </>
  );
}

void Activity;
// ComplaintSection is no longer wired in (moved to GuidedHistoryQA) but is
// kept around as a dormant fallback the page can re-mount if the user wants
// the form-style entry back. Silence the unused-warning until then.
void ComplaintSection;
