import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useHealthData } from '../context/HealthDataContext';
import { Baby, Calendar, Plus, Syringe, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { BirthRecord, AntenatalHistory, DevelopmentalMilestone, VaccinationEntry } from '../types';
import { generateId } from '../utils/helpers';

const SECTIONS = [
  { key: 'birth', label: 'Birth Record', icon: Baby },
  { key: 'antenatal', label: 'Antenatal', icon: Calendar },
  { key: 'milestones', label: 'Milestones', icon: CheckCircle2 },
  { key: 'vaccines', label: 'Vaccinations', icon: Syringe },
] as const;

type SectionKey = typeof SECTIONS[number]['key'];

// Standard Indian Universal Immunization Programme + recommended adult shots
const STANDARD_VACCINES: { vaccine: string; expectedMonth: number; doses: number }[] = [
  { vaccine: 'BCG', expectedMonth: 0, doses: 1 },
  { vaccine: 'Hepatitis B (Birth)', expectedMonth: 0, doses: 1 },
  { vaccine: 'OPV (Birth)', expectedMonth: 0, doses: 1 },
  { vaccine: 'Pentavalent (DPT-HepB-Hib)', expectedMonth: 1.5, doses: 3 },
  { vaccine: 'Rotavirus', expectedMonth: 1.5, doses: 3 },
  { vaccine: 'PCV', expectedMonth: 1.5, doses: 3 },
  { vaccine: 'fIPV', expectedMonth: 1.5, doses: 2 },
  { vaccine: 'Measles-Rubella (MR-1)', expectedMonth: 9, doses: 1 },
  { vaccine: 'JE-1', expectedMonth: 9, doses: 1 },
  { vaccine: 'DPT Booster-1', expectedMonth: 18, doses: 1 },
  { vaccine: 'Measles-Rubella (MR-2)', expectedMonth: 18, doses: 1 },
  { vaccine: 'DPT Booster-2', expectedMonth: 60, doses: 1 },
  { vaccine: 'Td (Tetanus)', expectedMonth: 120, doses: 1 },
  { vaccine: 'HPV (girls)', expectedMonth: 108, doses: 2 },
  { vaccine: 'Influenza (annual)', expectedMonth: 6, doses: 1 },
];

// Standard developmental milestones (in months)
const STANDARD_MILESTONES: { milestone: string; expectedAgeMonths: number }[] = [
  { milestone: 'Social smile', expectedAgeMonths: 2 },
  { milestone: 'Head control', expectedAgeMonths: 3 },
  { milestone: 'Rolls over', expectedAgeMonths: 5 },
  { milestone: 'Sits without support', expectedAgeMonths: 7 },
  { milestone: 'Crawls', expectedAgeMonths: 9 },
  { milestone: 'Stands with support', expectedAgeMonths: 10 },
  { milestone: 'First word', expectedAgeMonths: 12 },
  { milestone: 'Walks unaided', expectedAgeMonths: 14 },
  { milestone: 'Two-word phrases', expectedAgeMonths: 24 },
  { milestone: 'Runs', expectedAgeMonths: 24 },
  { milestone: 'Dresses with help', expectedAgeMonths: 36 },
  { milestone: 'Full sentences', expectedAgeMonths: 36 },
];

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-teal-500 focus:outline-none';
const selectCls = inputCls + ' bg-white';

export default function ChildHealthPage() {
  const { familyMembers, selectedMemberId, setSelectedMemberId } = useApp();
  const [section, setSection] = useState<SectionKey>('birth');

  const member = familyMembers.find((m) => m.id === selectedMemberId);

  if (!member) {
    return <div className="p-6 text-center text-sm text-gray-500">Add a family member to start.</div>;
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-2 pb-3">
        <h1 className="text-xl font-bold text-gray-900">Child & Birth Health</h1>
        <p className="text-xs text-gray-500">Antenatal, birth, milestones, immunizations</p>
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
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button key={s.key} onClick={() => setSection(s.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0 transition-colors ${
                  section === s.key ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}>
                <Icon size={13} /> {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4">
        {section === 'birth' && <BirthSection memberId={selectedMemberId} />}
        {section === 'antenatal' && <AntenatalSection memberId={selectedMemberId} />}
        {section === 'milestones' && <MilestonesSection memberId={selectedMemberId} />}
        {section === 'vaccines' && <VaccinationsSection memberId={selectedMemberId} />}
      </div>
    </div>
  );
}

// ─── Birth ────────────────────────────────────────────────────

function BirthSection({ memberId }: { memberId: string }) {
  const { getMemberBirthRecord, saveBirthRecord } = useHealthData();
  const existing = getMemberBirthRecord(memberId);
  const [b, setB] = useState<BirthRecord>(existing ?? {
    memberId, dateOfBirth: '', timeOfBirth: null, birthWeightKg: null,
    gestationalAgeWeeks: null, deliveryType: 'normal', nicuAdmission: false,
    nicuDays: null, complications: [], hospital: '',
  });

  const save = () => saveBirthRecord(b);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of birth"><input type="date" value={b.dateOfBirth} onChange={(e) => setB({ ...b, dateOfBirth: e.target.value })} className={inputCls} /></Field>
        <Field label="Time of birth"><input type="time" value={b.timeOfBirth ?? ''} onChange={(e) => setB({ ...b, timeOfBirth: e.target.value || null })} className={inputCls} /></Field>
        <Field label="Birth weight (kg)"><input type="number" step="0.01" value={b.birthWeightKg ?? ''} onChange={(e) => setB({ ...b, birthWeightKg: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} /></Field>
        <Field label="Gestational age (weeks)"><input type="number" min={20} max={45} value={b.gestationalAgeWeeks ?? ''} onChange={(e) => setB({ ...b, gestationalAgeWeeks: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} /></Field>
      </div>
      <Field label="Delivery type">
        <select value={b.deliveryType} onChange={(e) => setB({ ...b, deliveryType: e.target.value as BirthRecord['deliveryType'] })} className={selectCls}>
          <option value="normal">Normal (vaginal)</option>
          <option value="c_section">C-section</option>
          <option value="forceps">Forceps-assisted</option>
          <option value="vacuum">Vacuum-assisted</option>
          <option value="unknown">Unknown</option>
        </select>
      </Field>
      <Field label="Hospital"><input value={b.hospital} onChange={(e) => setB({ ...b, hospital: e.target.value })} className={inputCls} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="NICU admission?">
          <select value={b.nicuAdmission ? 'yes' : 'no'} onChange={(e) => setB({ ...b, nicuAdmission: e.target.value === 'yes' })} className={selectCls}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </Field>
        {b.nicuAdmission && (
          <Field label="NICU days"><input type="number" min={0} value={b.nicuDays ?? ''} onChange={(e) => setB({ ...b, nicuDays: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} /></Field>
        )}
      </div>
      <Field label="Complications (comma separated)">
        <input value={b.complications.join(', ')} onChange={(e) => setB({ ...b, complications: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} placeholder="e.g. jaundice, low blood sugar" className={inputCls} />
      </Field>
      <button onClick={save} className="w-full bg-teal-600 text-white font-semibold py-2.5 rounded-xl hover:bg-teal-700">Save Birth Record</button>
    </div>
  );
}

// ─── Antenatal ────────────────────────────────────────────────

function AntenatalSection({ memberId }: { memberId: string }) {
  const { getMemberAntenatal, saveAntenatal } = useHealthData();
  const existing = getMemberAntenatal(memberId);
  const [a, setA] = useState<AntenatalHistory>(existing ?? {
    memberId, maternalIllnesses: [], pregnancyComplications: [],
    medicationsDuringPregnancy: [], ultrasoundFindings: [],
    congenitalGenetic: [],
  });
  const csv = (arr: string[]) => arr.join(', ');
  const parse = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
      <Field label="Maternal illnesses during pregnancy">
        <input value={csv(a.maternalIllnesses)} onChange={(e) => setA({ ...a, maternalIllnesses: parse(e.target.value) })} placeholder="e.g. gestational diabetes, hypertension" className={inputCls} />
      </Field>
      <Field label="Pregnancy complications">
        <input value={csv(a.pregnancyComplications)} onChange={(e) => setA({ ...a, pregnancyComplications: parse(e.target.value) })} placeholder="e.g. preeclampsia, placenta previa" className={inputCls} />
      </Field>
      <Field label="Medications taken during pregnancy">
        <input value={csv(a.medicationsDuringPregnancy)} onChange={(e) => setA({ ...a, medicationsDuringPregnancy: parse(e.target.value) })} placeholder="e.g. iron, folic acid, insulin" className={inputCls} />
      </Field>
      <Field label="Notable ultrasound findings">
        <input value={csv(a.ultrasoundFindings)} onChange={(e) => setA({ ...a, ultrasoundFindings: parse(e.target.value) })} placeholder="e.g. IUGR, polyhydramnios" className={inputCls} />
      </Field>
      <Field label="Congenital / genetic conditions">
        <input value={csv(a.congenitalGenetic ?? [])} onChange={(e) => setA({ ...a, congenitalGenetic: parse(e.target.value) })}
          placeholder="e.g. Down syndrome, cleft palate, thalassemia, congenital heart disease"
          className={inputCls} />
      </Field>
      <button onClick={() => saveAntenatal(a)} className="w-full bg-teal-600 text-white font-semibold py-2.5 rounded-xl hover:bg-teal-700">Save Antenatal History</button>
    </div>
  );
}

// ─── Milestones ───────────────────────────────────────────────

function MilestonesSection({ memberId }: { memberId: string }) {
  const { getMemberMilestones, saveMilestone } = useHealthData();
  const existing = getMemberMilestones(memberId);
  const existingByName = useMemo(() => new Map(existing.map((m) => [m.milestone, m])), [existing]);

  const handleStatus = (milestone: string, expectedAgeMonths: number, status: DevelopmentalMilestone['status'], achievedAge?: number | null) => {
    const ex = existingByName.get(milestone);
    saveMilestone({
      id: ex?.id ?? generateId(),
      memberId, milestone, expectedAgeMonths,
      achievedAgeMonths: achievedAge ?? ex?.achievedAgeMonths ?? null,
      status,
    });
  };

  return (
    <div className="space-y-2">
      {STANDARD_MILESTONES.map((s) => {
        const ex = existingByName.get(s.milestone);
        const status = ex?.status;
        return (
          <div key={s.milestone} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{s.milestone}</p>
                <p className="text-[10px] text-gray-400">Expected by {s.expectedAgeMonths} months</p>
              </div>
              {status === 'on_time' && <CheckCircle2 size={18} className="text-green-500" />}
              {status === 'early' && <CheckCircle2 size={18} className="text-blue-500" />}
              {status === 'delayed' && <AlertCircle size={18} className="text-orange-500" />}
              {status === 'not_achieved' && <AlertCircle size={18} className="text-red-500" />}
            </div>
            <div className="flex gap-1.5">
              {(['on_time', 'early', 'delayed', 'not_achieved'] as const).map((st) => (
                <button key={st} onClick={() => handleStatus(s.milestone, s.expectedAgeMonths, st)}
                  className={`flex-1 text-[10px] py-1.5 rounded-lg capitalize transition-colors ${
                    status === st ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}>
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
            {(status === 'on_time' || status === 'early' || status === 'delayed') && (
              <input
                type="number" min={0} placeholder="Achieved at (months)"
                value={ex?.achievedAgeMonths ?? ''}
                onChange={(e) => handleStatus(s.milestone, s.expectedAgeMonths, status, e.target.value === '' ? null : Number(e.target.value))}
                className="w-full mt-2 px-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Vaccinations ─────────────────────────────────────────────

function VaccinationsSection({ memberId }: { memberId: string }) {
  const { getMemberVaccinations, saveVaccination, removeVaccination } = useHealthData();
  const items = getMemberVaccinations(memberId);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<VaccinationEntry>>({ vaccine: '', doseNumber: 1, dateGiven: null, hospital: '', status: 'given' });

  const addStandard = (vaccine: string, doseNumber: number) => {
    saveVaccination({
      id: generateId(), memberId, vaccine, doseNumber,
      dateGiven: new Date().toISOString().split('T')[0],
      hospital: '', status: 'given',
    });
  };

  const handleAdd = () => {
    if (!draft.vaccine) return;
    saveVaccination({
      id: generateId(), memberId,
      vaccine: draft.vaccine!,
      doseNumber: draft.doseNumber ?? 1,
      dateGiven: draft.dateGiven ?? null,
      dateDue: draft.dateDue ?? null,
      hospital: draft.hospital ?? '',
      batchNumber: draft.batchNumber ?? null,
      status: draft.status ?? 'given',
    });
    setDraft({ vaccine: '', doseNumber: 1, dateGiven: null, hospital: '', status: 'given' });
    setAdding(false);
  };

  return (
    <>
      {!adding && (
        <>
          <button onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm py-2.5 rounded-xl mb-3">
            <Plus size={14} /> Add Vaccination
          </button>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
            <p className="text-xs font-semibold text-amber-800 mb-2">Standard Indian UIP schedule — quick add:</p>
            <div className="flex flex-wrap gap-1.5">
              {STANDARD_VACCINES.map((v) => (
                <button key={v.vaccine} onClick={() => addStandard(v.vaccine, 1)} className="text-[10px] bg-white border border-amber-200 text-amber-700 px-2 py-1 rounded-full hover:bg-amber-100">
                  + {v.vaccine}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {adding && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3 mb-3">
          <Field label="Vaccine"><input value={draft.vaccine} onChange={(e) => setDraft({ ...draft, vaccine: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dose #"><input type="number" min={1} value={draft.doseNumber ?? 1} onChange={(e) => setDraft({ ...draft, doseNumber: Number(e.target.value) })} className={inputCls} /></Field>
            <Field label="Status">
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as VaccinationEntry['status'] })} className={selectCls}>
                <option value="given">Given</option>
                <option value="due">Due</option>
                <option value="overdue">Overdue</option>
                <option value="skipped">Skipped</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date given"><input type="date" value={draft.dateGiven ?? ''} onChange={(e) => setDraft({ ...draft, dateGiven: e.target.value || null })} className={inputCls} /></Field>
            <Field label="Date due"><input type="date" value={draft.dateDue ?? ''} onChange={(e) => setDraft({ ...draft, dateDue: e.target.value || null })} className={inputCls} /></Field>
          </div>
          <Field label="Hospital / clinic"><input value={draft.hospital} onChange={(e) => setDraft({ ...draft, hospital: e.target.value })} className={inputCls} /></Field>
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="flex-1 bg-gray-100 text-gray-600 font-semibold py-2.5 rounded-xl">Cancel</button>
            <button onClick={handleAdd} className="flex-[2] bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-xl">Save</button>
          </div>
        </div>
      )}

      {items.length === 0 && !adding && <p className="text-xs text-gray-400 text-center py-3">No vaccinations recorded.</p>}

      <div className="space-y-2">
        {items.map((v) => (
          <div key={v.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                v.status === 'given' ? 'bg-green-50' :
                v.status === 'due' ? 'bg-blue-50' :
                v.status === 'overdue' ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                {v.status === 'given' ? <CheckCircle2 size={18} className="text-green-500" /> :
                 v.status === 'overdue' ? <AlertCircle size={18} className="text-red-500" /> :
                 <Clock size={18} className="text-blue-500" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{v.vaccine} <span className="text-gray-400">·</span> <span className="text-xs text-gray-500">Dose {v.doseNumber}</span></p>
                <p className="text-xs text-gray-400">
                  {v.status === 'given' && v.dateGiven ? `Given on ${v.dateGiven}` :
                   v.status === 'due' && v.dateDue ? `Due ${v.dateDue}` :
                   v.status === 'overdue' && v.dateDue ? `Overdue since ${v.dateDue}` : v.status}
                  {v.hospital ? ` · ${v.hospital}` : ''}
                </p>
              </div>
            </div>
            <button onClick={() => removeVaccination(v.id)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-300 hover:text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
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
