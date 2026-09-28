import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useHealthData } from '../context/HealthDataContext';
import {
  Eye, Ear, Smile, Sparkles as SkinIcon, Brain, Activity, Flower,
  UserCheck, Baby, Trash2, Plus,
} from 'lucide-react';
import type {
  SpecialtyProfiles, GynaeProfile, EyeProfile, ENTProfile,
  DentalProfile, DermatologyProfile, NeurologyProfile, GeriatricProfile,
  ObstetricsProfile, ObstetricDelivery, Severity,
} from '../types';
import { generateId } from '../utils/helpers';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-teal-500 focus:outline-none';
const selectCls = inputCls + ' bg-white';

type SpecialtyKey = 'gynae' | 'obs' | 'eye' | 'ent' | 'dental' | 'dermatology' | 'neurology' | 'geriatrics';

interface SpecialtyMeta {
  key: SpecialtyKey;
  label: string;
  icon: typeof Eye;
  color: string;
  applies: (member: { age: number; gender: string }) => boolean;
}

const SPECIALTIES: SpecialtyMeta[] = [
  { key: 'gynae', label: 'Gynae', icon: Flower, color: 'text-pink-600',
    applies: (m) => m.gender === 'female' && m.age >= 10 },
  { key: 'obs', label: 'Obstetrics', icon: Baby, color: 'text-pink-700',
    applies: (m) => m.gender === 'female' && m.age >= 15 },
  { key: 'eye', label: 'Eye', icon: Eye, color: 'text-blue-600', applies: () => true },
  { key: 'ent', label: 'ENT', icon: Ear, color: 'text-cyan-600', applies: () => true },
  { key: 'dental', label: 'Dental', icon: Smile, color: 'text-amber-600', applies: () => true },
  { key: 'dermatology', label: 'Skin', icon: SkinIcon, color: 'text-rose-600', applies: () => true },
  { key: 'neurology', label: 'Neuro', icon: Brain, color: 'text-indigo-600', applies: () => true },
  { key: 'geriatrics', label: 'Geriatric', icon: UserCheck, color: 'text-stone-600',
    applies: (m) => m.age >= 60 },
];

function emptyProfile(memberId: string): SpecialtyProfiles {
  return { memberId, updatedAt: new Date().toISOString() };
}

export default function SpecialtyPage() {
  const { familyMembers, selectedMemberId, setSelectedMemberId } = useApp();
  const { getMemberSpecialty, saveSpecialtyProfile } = useHealthData();
  const member = familyMembers.find((m) => m.id === selectedMemberId);
  const availableSpecialties = useMemo(
    () => member ? SPECIALTIES.filter((s) => s.applies({ age: member.age, gender: member.gender })) : [],
    [member],
  );
  const [activeKey, setActiveKey] = useState<SpecialtyKey>(availableSpecialties[0]?.key ?? 'eye');
  const [draft, setDraft] = useState<SpecialtyProfiles>(() => getMemberSpecialty(selectedMemberId) ?? emptyProfile(selectedMemberId));
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraft(getMemberSpecialty(selectedMemberId) ?? emptyProfile(selectedMemberId));
  }, [selectedMemberId, getMemberSpecialty]);

  useEffect(() => {
    if (!availableSpecialties.find((s) => s.key === activeKey)) {
      setActiveKey(availableSpecialties[0]?.key ?? 'eye');
    }
  }, [availableSpecialties, activeKey]);

  const persist = (next: SpecialtyProfiles) => {
    setDraft(next);
    saveSpecialtyProfile({ ...next, updatedAt: new Date().toISOString() });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  if (!member) {
    return <div className="p-6 text-center text-sm text-gray-500">Add a family member to start specialty data.</div>;
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Specialty Modules</h1>
          <p className="text-xs text-gray-500">Detailed profiles by specialty</p>
        </div>
        {savedFlash && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Saved</span>
        )}
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

      <div className="px-4 pb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {availableSpecialties.map((s) => {
            const Icon = s.icon;
            return (
              <button key={s.key} onClick={() => setActiveKey(s.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0 transition-colors ${
                  activeKey === s.key ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}>
                <Icon size={13} /> {s.label}
              </button>
            );
          })}
        </div>
        {availableSpecialties.length < SPECIALTIES.length && (
          <p className="text-[10px] text-gray-400 mt-2">
            Showing only specialties relevant to this member's age/gender.
          </p>
        )}
      </div>

      <div className="px-4">
        {activeKey === 'gynae' && (
          <GynaeForm value={draft.gynae} memberId={selectedMemberId} onChange={(v) => persist({ ...draft, gynae: v })} />
        )}
        {activeKey === 'obs' && (
          <ObstetricsForm value={draft.obstetrics} memberId={selectedMemberId} onChange={(v) => persist({ ...draft, obstetrics: v })} />
        )}
        {activeKey === 'eye' && (
          <EyeForm value={draft.eye} memberId={selectedMemberId} onChange={(v) => persist({ ...draft, eye: v })} />
        )}
        {activeKey === 'ent' && (
          <ENTForm value={draft.ent} memberId={selectedMemberId} onChange={(v) => persist({ ...draft, ent: v })} />
        )}
        {activeKey === 'dental' && (
          <DentalForm value={draft.dental} memberId={selectedMemberId} onChange={(v) => persist({ ...draft, dental: v })} />
        )}
        {activeKey === 'dermatology' && (
          <DermForm value={draft.dermatology} memberId={selectedMemberId} onChange={(v) => persist({ ...draft, dermatology: v })} />
        )}
        {activeKey === 'neurology' && (
          <NeuroForm value={draft.neurology} memberId={selectedMemberId} onChange={(v) => persist({ ...draft, neurology: v })} />
        )}
        {activeKey === 'geriatrics' && (
          <GeriatricsForm value={draft.geriatrics} memberId={selectedMemberId} onChange={(v) => persist({ ...draft, geriatrics: v })} />
        )}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>{children}</div>;
}

// ─── Gynae ────────────────────────────────────────────────────

function GynaeForm({ value, memberId, onChange }: { value?: GynaeProfile; memberId: string; onChange: (v: GynaeProfile) => void }) {
  const v: GynaeProfile = value ?? {
    memberId, menarcheAge: null, cycleIntervalDays: null, flowDurationDays: null,
    cycleRegular: true, lastPeriodDate: null,
    flowVolume: 'normal', hasPain: false, painSeverity: undefined,
    conditions: [], menopauseAge: null,
  };
  const conditionOptions = ['PCOS', 'Endometriosis', 'Fibroids', 'Ovarian Cyst', 'Menopause', 'Infertility', 'PMS/PMDD'];
  const toggle = (c: string) => onChange({
    ...v, conditions: v.conditions.includes(c) ? v.conditions.filter((x) => x !== c) : [...v.conditions, c],
  });
  return (
    <Card>
      <p className="text-sm font-semibold text-gray-900 mb-2">Menstrual History</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Age of menarche">
          <input type="number" min={5} max={25} value={v.menarcheAge ?? ''}
            onChange={(e) => onChange({ ...v, menarcheAge: e.target.value === '' ? null : Number(e.target.value) })}
            className={inputCls} />
        </Field>
        <Field label="Interval (days between cycles)">
          <input type="number" min={15} max={60} value={v.cycleIntervalDays ?? ''}
            onChange={(e) => onChange({ ...v, cycleIntervalDays: e.target.value === '' ? null : Number(e.target.value) })}
            className={inputCls} />
        </Field>
        <Field label="Flow duration (days)">
          <input type="number" min={1} max={15} value={v.flowDurationDays ?? ''}
            onChange={(e) => onChange({ ...v, flowDurationDays: e.target.value === '' ? null : Number(e.target.value) })}
            className={inputCls} />
        </Field>
        <Field label="Flow volume">
          <select value={v.flowVolume} onChange={(e) => onChange({ ...v, flowVolume: e.target.value as GynaeProfile['flowVolume'] })} className={selectCls}>
            <option value="normal">Normal</option>
            <option value="profuse">Profuse / heavy</option>
            <option value="scanty">Scanty / light</option>
            <option value="variable">Variable</option>
            <option value="unknown">Unknown</option>
          </select>
        </Field>
        <Field label="Cycle regular?">
          <select value={v.cycleRegular ? 'yes' : 'no'} onChange={(e) => onChange({ ...v, cycleRegular: e.target.value === 'yes' })} className={selectCls}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
        <Field label="Last period">
          <input type="date" value={v.lastPeriodDate ?? ''} onChange={(e) => onChange({ ...v, lastPeriodDate: e.target.value || null })} className={inputCls} />
        </Field>
        <Field label="Pain during periods?">
          <select value={v.hasPain ? 'yes' : 'no'} onChange={(e) => onChange({ ...v, hasPain: e.target.value === 'yes' })} className={selectCls}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </Field>
        {v.hasPain && (
          <Field label="Pain severity">
            <select value={v.painSeverity ?? 'mild'} onChange={(e) => onChange({ ...v, painSeverity: e.target.value as Severity })} className={selectCls}>
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
              <option value="critical">Critical</option>
            </select>
          </Field>
        )}
        <Field label="Menopause age">
          <input type="number" value={v.menopauseAge ?? ''} onChange={(e) => onChange({ ...v, menopauseAge: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} />
        </Field>
      </div>
      <Field label="Conditions">
        <div className="flex flex-wrap gap-1.5">
          {conditionOptions.map((c) => {
            const on = v.conditions.includes(c);
            return <button key={c} onClick={() => toggle(c)} className={`text-xs px-2.5 py-1 rounded-full ${on ? 'bg-pink-500 text-white' : 'bg-gray-50 text-gray-600'}`}>{c}</button>;
          })}
        </div>
      </Field>
    </Card>
  );
}

// ─── Obstetrics ───────────────────────────────────────────────

function ObstetricsForm({ value, memberId, onChange }: { value?: ObstetricsProfile; memberId: string; onChange: (v: ObstetricsProfile) => void }) {
  const v: ObstetricsProfile = value ?? {
    memberId, pregnancyCount: 0, liveBirths: 0, miscarriages: 0,
    abortions: 0, stillbirths: 0, currentlyPregnant: false,
    lastPregnancyDate: null, deliveries: [], complications: [],
  };
  const complicationOptions = ['Gestational diabetes', 'Preeclampsia', 'Eclampsia', 'Placenta previa', 'Preterm labor', 'IUGR', 'Anemia', 'Postpartum hemorrhage'];
  const toggleComplication = (c: string) => onChange({
    ...v, complications: v.complications.includes(c) ? v.complications.filter((x) => x !== c) : [...v.complications, c],
  });
  const addDelivery = () => onChange({
    ...v, deliveries: [...v.deliveries, {
      id: generateId(), year: null, outcome: 'live_birth',
      deliveryType: 'normal', gestationalAgeWeeks: null,
      babyWeightKg: null, complications: '', hospital: '',
    }],
  });
  const updateDelivery = (i: number, next: Partial<ObstetricDelivery>) =>
    onChange({ ...v, deliveries: v.deliveries.map((d, idx) => idx === i ? { ...d, ...next } : d) });
  const removeDelivery = (i: number) => onChange({ ...v, deliveries: v.deliveries.filter((_, idx) => idx !== i) });

  return (
    <>
      <Card>
        <p className="text-sm font-semibold text-gray-900 mb-2">Summary (G P A L)</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pregnancies (G)">
            <input type="number" min={0} value={v.pregnancyCount} onChange={(e) => onChange({ ...v, pregnancyCount: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Live births (P)">
            <input type="number" min={0} value={v.liveBirths} onChange={(e) => onChange({ ...v, liveBirths: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Miscarriages">
            <input type="number" min={0} value={v.miscarriages} onChange={(e) => onChange({ ...v, miscarriages: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Abortions">
            <input type="number" min={0} value={v.abortions} onChange={(e) => onChange({ ...v, abortions: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Stillbirths">
            <input type="number" min={0} value={v.stillbirths} onChange={(e) => onChange({ ...v, stillbirths: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Currently pregnant?">
            <select value={v.currentlyPregnant ? 'yes' : 'no'} onChange={(e) => onChange({ ...v, currentlyPregnant: e.target.value === 'yes' })} className={selectCls}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
        </div>
        <Field label="Last pregnancy date">
          <input type="date" value={v.lastPregnancyDate ?? ''} onChange={(e) => onChange({ ...v, lastPregnancyDate: e.target.value || null })} className={inputCls} />
        </Field>
        <Field label="Complications history">
          <div className="flex flex-wrap gap-1.5">
            {complicationOptions.map((c) => {
              const on = v.complications.includes(c);
              return <button key={c} onClick={() => toggleComplication(c)} className={`text-xs px-2.5 py-1 rounded-full ${on ? 'bg-pink-700 text-white' : 'bg-gray-50 text-gray-600'}`}>{c}</button>;
            })}
          </div>
        </Field>
      </Card>

      <button onClick={addDelivery} className="w-full flex items-center justify-center gap-1.5 bg-pink-50 text-pink-700 font-medium text-sm py-2.5 rounded-xl mb-3 hover:bg-pink-100">
        <Plus size={14} /> Add Delivery
      </button>

      {v.deliveries.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No deliveries recorded.</p>}

      {v.deliveries.map((d, i) => (
        <Card key={d.id}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-sm font-semibold text-gray-900">Delivery {i + 1}</p>
            <button onClick={() => removeDelivery(i)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-300 hover:text-red-400"><Trash2 size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Year">
              <input type="number" min={1900} max={new Date().getFullYear()}
                value={d.year ?? ''} onChange={(e) => updateDelivery(i, { year: e.target.value === '' ? null : Number(e.target.value) })}
                className={inputCls} />
            </Field>
            <Field label="Outcome">
              <select value={d.outcome} onChange={(e) => updateDelivery(i, { outcome: e.target.value as ObstetricDelivery['outcome'] })} className={selectCls}>
                <option value="live_birth">Live birth</option>
                <option value="stillbirth">Stillbirth</option>
                <option value="miscarriage">Miscarriage</option>
                <option value="abortion">Abortion</option>
              </select>
            </Field>
            <Field label="Delivery type">
              <select value={d.deliveryType} onChange={(e) => updateDelivery(i, { deliveryType: e.target.value as ObstetricDelivery['deliveryType'] })} className={selectCls}>
                <option value="normal">Normal</option>
                <option value="c_section">C-section</option>
                <option value="forceps">Forceps</option>
                <option value="vacuum">Vacuum</option>
                <option value="unknown">Unknown</option>
              </select>
            </Field>
            <Field label="Gestational age (weeks)">
              <input type="number" min={20} max={45} value={d.gestationalAgeWeeks ?? ''}
                onChange={(e) => updateDelivery(i, { gestationalAgeWeeks: e.target.value === '' ? null : Number(e.target.value) })}
                className={inputCls} />
            </Field>
            <Field label="Baby weight (kg)">
              <input type="number" step="0.01" min={0} value={d.babyWeightKg ?? ''}
                onChange={(e) => updateDelivery(i, { babyWeightKg: e.target.value === '' ? null : Number(e.target.value) })}
                className={inputCls} />
            </Field>
            <Field label="Hospital"><input value={d.hospital} onChange={(e) => updateDelivery(i, { hospital: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Complications"><input value={d.complications} onChange={(e) => updateDelivery(i, { complications: e.target.value })} placeholder="None / describe" className={inputCls} /></Field>
        </Card>
      ))}
    </>
  );
}

// ─── Eye ──────────────────────────────────────────────────────

function EyeForm({ value, memberId, onChange }: { value?: EyeProfile; memberId: string; onChange: (v: EyeProfile) => void }) {
  const v: EyeProfile = value ?? {
    memberId, rightEye: null, leftEye: null,
    glassesPrescriptionDate: null, conditions: [],
  };
  const conditionOptions = ['Myopia', 'Hyperopia', 'Astigmatism', 'Cataract', 'Glaucoma', 'Diabetic Retinopathy', 'Macular Degeneration'];
  const toggle = (c: string) => onChange({
    ...v, conditions: v.conditions.includes(c) ? v.conditions.filter((x) => x !== c) : [...v.conditions, c],
  });
  const r = v.rightEye ?? { sphere: null, cylinder: null, axis: null };
  const l = v.leftEye ?? { sphere: null, cylinder: null, axis: null };
  return (
    <Card>
      <p className="text-sm font-semibold text-gray-900">Right Eye (OD)</p>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Sphere"><input type="number" step="0.25" value={r.sphere ?? ''} onChange={(e) => onChange({ ...v, rightEye: { ...r, sphere: e.target.value === '' ? null : Number(e.target.value) } })} className={inputCls} /></Field>
        <Field label="Cylinder"><input type="number" step="0.25" value={r.cylinder ?? ''} onChange={(e) => onChange({ ...v, rightEye: { ...r, cylinder: e.target.value === '' ? null : Number(e.target.value) } })} className={inputCls} /></Field>
        <Field label="Axis"><input type="number" min={0} max={180} value={r.axis ?? ''} onChange={(e) => onChange({ ...v, rightEye: { ...r, axis: e.target.value === '' ? null : Number(e.target.value) } })} className={inputCls} /></Field>
      </div>
      <p className="text-sm font-semibold text-gray-900 mt-2">Left Eye (OS)</p>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Sphere"><input type="number" step="0.25" value={l.sphere ?? ''} onChange={(e) => onChange({ ...v, leftEye: { ...l, sphere: e.target.value === '' ? null : Number(e.target.value) } })} className={inputCls} /></Field>
        <Field label="Cylinder"><input type="number" step="0.25" value={l.cylinder ?? ''} onChange={(e) => onChange({ ...v, leftEye: { ...l, cylinder: e.target.value === '' ? null : Number(e.target.value) } })} className={inputCls} /></Field>
        <Field label="Axis"><input type="number" min={0} max={180} value={l.axis ?? ''} onChange={(e) => onChange({ ...v, leftEye: { ...l, axis: e.target.value === '' ? null : Number(e.target.value) } })} className={inputCls} /></Field>
      </div>
      <Field label="Prescription date"><input type="date" value={v.glassesPrescriptionDate ?? ''} onChange={(e) => onChange({ ...v, glassesPrescriptionDate: e.target.value || null })} className={inputCls} /></Field>
      <Field label="Conditions">
        <div className="flex flex-wrap gap-1.5">
          {conditionOptions.map((c) => {
            const on = v.conditions.includes(c);
            return <button key={c} onClick={() => toggle(c)} className={`text-xs px-2.5 py-1 rounded-full ${on ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-600'}`}>{c}</button>;
          })}
        </div>
      </Field>
    </Card>
  );
}

// ─── ENT ──────────────────────────────────────────────────────

function ENTForm({ value, memberId, onChange }: { value?: ENTProfile; memberId: string; onChange: (v: ENTProfile) => void }) {
  const v: ENTProfile = value ?? { memberId, hearingRight: 'normal', hearingLeft: 'normal', conditions: [] };
  const conditionOptions = ['Sinusitis', 'Tonsillitis', 'Otitis Media', 'Tinnitus', 'Vertigo', 'Allergic Rhinitis'];
  const toggle = (c: string) => onChange({ ...v, conditions: v.conditions.includes(c) ? v.conditions.filter((x) => x !== c) : [...v.conditions, c] });
  const hearingOpts = ['normal', 'mild_loss', 'moderate_loss', 'severe_loss', 'unknown'] as const;
  return (
    <Card>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Hearing - Right"><select value={v.hearingRight} onChange={(e) => onChange({ ...v, hearingRight: e.target.value as ENTProfile['hearingRight'] })} className={selectCls}>{hearingOpts.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}</select></Field>
        <Field label="Hearing - Left"><select value={v.hearingLeft} onChange={(e) => onChange({ ...v, hearingLeft: e.target.value as ENTProfile['hearingLeft'] })} className={selectCls}>{hearingOpts.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}</select></Field>
      </div>
      <Field label="Conditions">
        <div className="flex flex-wrap gap-1.5">
          {conditionOptions.map((c) => {
            const on = v.conditions.includes(c);
            return <button key={c} onClick={() => toggle(c)} className={`text-xs px-2.5 py-1 rounded-full ${on ? 'bg-cyan-500 text-white' : 'bg-gray-50 text-gray-600'}`}>{c}</button>;
          })}
        </div>
      </Field>
    </Card>
  );
}

// ─── Dental ───────────────────────────────────────────────────

function DentalForm({ value, memberId, onChange }: { value?: DentalProfile; memberId: string; onChange: (v: DentalProfile) => void }) {
  const v: DentalProfile = value ?? { memberId, lastVisit: null, conditions: [], procedures: [] };
  const conditionOptions = ['Cavities', 'Gum Disease', 'Tooth Sensitivity', 'TMJ', 'Bruxism', 'Wisdom Tooth Issues'];
  const toggle = (c: string) => onChange({ ...v, conditions: v.conditions.includes(c) ? v.conditions.filter((x) => x !== c) : [...v.conditions, c] });
  return (
    <Card>
      <Field label="Last dental visit"><input type="date" value={v.lastVisit ?? ''} onChange={(e) => onChange({ ...v, lastVisit: e.target.value || null })} className={inputCls} /></Field>
      <Field label="Conditions">
        <div className="flex flex-wrap gap-1.5">
          {conditionOptions.map((c) => {
            const on = v.conditions.includes(c);
            return <button key={c} onClick={() => toggle(c)} className={`text-xs px-2.5 py-1 rounded-full ${on ? 'bg-amber-500 text-white' : 'bg-gray-50 text-gray-600'}`}>{c}</button>;
          })}
        </div>
      </Field>
      <Field label="Procedures (one per line — Name, Date, Tooth)">
        <textarea
          value={v.procedures.map((p) => `${p.name}, ${p.date}${p.tooth ? `, ${p.tooth}` : ''}`).join('\n')}
          onChange={(e) => {
            const lines = e.target.value.split('\n').map((line) => line.trim()).filter(Boolean);
            const procedures = lines.map((line) => {
              const parts = line.split(',').map((s) => s.trim());
              return { name: parts[0] || '', date: parts[1] || '', tooth: parts[2] };
            });
            onChange({ ...v, procedures });
          }}
          rows={3} placeholder="Filling, 2024-03-10, #14"
          className={inputCls}
        />
      </Field>
    </Card>
  );
}

// ─── Dermatology ──────────────────────────────────────────────

function DermForm({ value, memberId, onChange }: { value?: DermatologyProfile; memberId: string; onChange: (v: DermatologyProfile) => void }) {
  const v: DermatologyProfile = value ?? { memberId, conditions: [], notes: '' };
  const conditionOptions = ['Psoriasis', 'Eczema', 'Seborrheic Dermatitis', 'Acne', 'Rosacea', 'Vitiligo', 'Melasma'];
  const toggle = (c: string) => onChange({ ...v, conditions: v.conditions.includes(c) ? v.conditions.filter((x) => x !== c) : [...v.conditions, c] });
  return (
    <Card>
      <Field label="Conditions">
        <div className="flex flex-wrap gap-1.5">
          {conditionOptions.map((c) => {
            const on = v.conditions.includes(c);
            return <button key={c} onClick={() => toggle(c)} className={`text-xs px-2.5 py-1 rounded-full ${on ? 'bg-rose-500 text-white' : 'bg-gray-50 text-gray-600'}`}>{c}</button>;
          })}
        </div>
      </Field>
      <Field label="Notes"><textarea value={v.notes} onChange={(e) => onChange({ ...v, notes: e.target.value })} rows={3} className={inputCls} /></Field>
    </Card>
  );
}

// ─── Neurology ────────────────────────────────────────────────

function NeuroForm({ value, memberId, onChange }: { value?: NeurologyProfile; memberId: string; onChange: (v: NeurologyProfile) => void }) {
  const v: NeurologyProfile = value ?? { memberId, conditions: [], seizureHistory: false, strokeHistory: false, memoryConcerns: false };
  const conditionOptions = ['Migraine', 'Epilepsy', 'Stroke (CVA)', 'TIA', 'Parkinson’s', 'Multiple Sclerosis', 'Peripheral Neuropathy'];
  const toggle = (c: string) => onChange({ ...v, conditions: v.conditions.includes(c) ? v.conditions.filter((x) => x !== c) : [...v.conditions, c] });
  return (
    <Card>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Seizure history?"><select value={v.seizureHistory ? 'yes' : 'no'} onChange={(e) => onChange({ ...v, seizureHistory: e.target.value === 'yes' })} className={selectCls}><option value="no">No</option><option value="yes">Yes</option></select></Field>
        <Field label="Stroke history?"><select value={v.strokeHistory ? 'yes' : 'no'} onChange={(e) => onChange({ ...v, strokeHistory: e.target.value === 'yes' })} className={selectCls}><option value="no">No</option><option value="yes">Yes</option></select></Field>
        <Field label="Memory concerns?"><select value={v.memoryConcerns ? 'yes' : 'no'} onChange={(e) => onChange({ ...v, memoryConcerns: e.target.value === 'yes' })} className={selectCls}><option value="no">No</option><option value="yes">Yes</option></select></Field>
      </div>
      <Field label="Conditions">
        <div className="flex flex-wrap gap-1.5">
          {conditionOptions.map((c) => {
            const on = v.conditions.includes(c);
            return <button key={c} onClick={() => toggle(c)} className={`text-xs px-2.5 py-1 rounded-full ${on ? 'bg-indigo-500 text-white' : 'bg-gray-50 text-gray-600'}`}>{c}</button>;
          })}
        </div>
      </Field>
    </Card>
  );
}

// ─── Geriatrics ───────────────────────────────────────────────

function GeriatricsForm({ value, memberId, onChange }: { value?: GeriatricProfile; memberId: string; onChange: (v: GeriatricProfile) => void }) {
  const v: GeriatricProfile = value ?? {
    memberId, fallsLast12Months: 0, frailtyScore: null,
    memoryDecline: false, dependencyLevel: 'independent',
  };
  return (
    <Card>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Falls (last 12 months)"><input type="number" min={0} value={v.fallsLast12Months} onChange={(e) => onChange({ ...v, fallsLast12Months: Number(e.target.value) })} className={inputCls} /></Field>
        <Field label="Frailty score (CFS 1-9)"><input type="number" min={1} max={9} value={v.frailtyScore ?? ''} onChange={(e) => onChange({ ...v, frailtyScore: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} /></Field>
        <Field label="Memory decline?"><select value={v.memoryDecline ? 'yes' : 'no'} onChange={(e) => onChange({ ...v, memoryDecline: e.target.value === 'yes' })} className={selectCls}><option value="no">No</option><option value="yes">Yes</option></select></Field>
        <Field label="Dependency level">
          <select value={v.dependencyLevel} onChange={(e) => onChange({ ...v, dependencyLevel: e.target.value as GeriatricProfile['dependencyLevel'] })} className={selectCls}>
            <option value="independent">Independent</option>
            <option value="needs_assistance">Needs Assistance</option>
            <option value="dependent">Dependent</option>
          </select>
        </Field>
      </div>
      <p className="text-[10px] text-gray-400">CFS = Clinical Frailty Scale. 1 = very fit, 9 = terminally ill.</p>
    </Card>
  );
}

// Activity icon used dynamically in tab definitions
void Activity;
