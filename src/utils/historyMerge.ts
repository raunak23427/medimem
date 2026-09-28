// When a new record is saved (uploaded or AI-extracted), this helper walks
// the extracted data and proposes additions to the member's Medical History.
//
// We do NOT silently overwrite existing user-entered data. Instead we:
//   - Add new chronic conditions only if the same name isn't already present
//     (case-insensitive)
//   - Auto-add prescription medicines as the "Current medication" string on
//     a matching chronic condition (e.g. Metformin → Diabetes)
//   - Append to keyHistoryPoints via the doctor-summary generator
//
// The result is a mutation candidate the caller can either save directly
// (default behaviour) or surface for review.

import type { MedicalHistory, MedicalRecord, ChronicCondition } from '../types';

// Map common drug name → likely condition. Conservative — we only auto-link
// when the mapping is unambiguous.
const DRUG_TO_CONDITION: Record<string, string> = {
  metformin: 'Diabetes',
  glimepiride: 'Diabetes',
  sitagliptin: 'Diabetes',
  insulin: 'Diabetes',
  empagliflozin: 'Diabetes',
  dapagliflozin: 'Diabetes',
  telmisartan: 'Hypertension',
  amlodipine: 'Hypertension',
  losartan: 'Hypertension',
  enalapril: 'Hypertension',
  ramipril: 'Hypertension',
  atorvastatin: 'Hypercholesterolemia',
  rosuvastatin: 'Hypercholesterolemia',
  simvastatin: 'Hypercholesterolemia',
  thyroxine: 'Thyroid Disorder',
  levothyroxine: 'Thyroid Disorder',
  salbutamol: 'Asthma',
  budesonide: 'Asthma',
  montelukast: 'Asthma',
};

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function findCondition(history: MedicalHistory, name: string): ChronicCondition | undefined {
  const n = normalize(name);
  return history.chronicConditions.find((c) => normalize(c.name) === n);
}

export interface MergeResult {
  next: MedicalHistory;
  changes: { type: 'condition_added' | 'medication_added'; detail: string }[];
}

export function mergeRecordIntoHistory(
  existing: MedicalHistory | null,
  memberId: string,
  record: MedicalRecord,
): MergeResult {
  const base: MedicalHistory = existing ?? {
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

  const next: MedicalHistory = {
    ...base,
    chronicConditions: [...base.chronicConditions],
    hospitalizations: [...base.hospitalizations],
  };
  const changes: MergeResult['changes'] = [];

  // 1. Add diagnoses as chronic conditions (skip dupes).
  for (const dx of record.diagnosis ?? []) {
    if (!dx.trim()) continue;
    if (!findCondition(next, dx)) {
      next.chronicConditions.push({
        name: dx.trim(),
        diagnosedYear: new Date(record.date).getFullYear() || null,
        sinceDuration: '',
        treatment: '',
        medication: '',
        outcome: 'ongoing',
        notes: `Auto-added from record uploaded on ${record.date}.`,
      });
      changes.push({ type: 'condition_added', detail: dx.trim() });
    }
  }

  // 2. Map known drugs → conditions and attach medication string.
  for (const med of record.medicines ?? []) {
    if (!med.name) continue;
    const drug = normalize(med.name).split(/\s+/)[0]; // first word
    const mappedCondition = DRUG_TO_CONDITION[drug];
    if (!mappedCondition) continue;
    let cond = findCondition(next, mappedCondition);
    if (!cond) {
      cond = {
        name: mappedCondition,
        diagnosedYear: new Date(record.date).getFullYear() || null,
        sinceDuration: '',
        treatment: '',
        medication: '',
        outcome: 'ongoing',
        notes: `Inferred from prescription of ${med.name} on ${record.date}.`,
      };
      next.chronicConditions.push(cond);
      changes.push({ type: 'condition_added', detail: `${mappedCondition} (inferred)` });
    }
    const medLine = `${med.name} ${med.dosage} ${med.frequency}`.trim();
    if (!cond.medication.toLowerCase().includes(med.name.toLowerCase())) {
      cond.medication = cond.medication ? `${cond.medication}; ${medLine}` : medLine;
      changes.push({ type: 'medication_added', detail: `${med.name} → ${mappedCondition}` });
    }
  }

  // 3. Discharge summaries imply a hospitalization. Add one if not already
  // present for the same date.
  if (record.documentType === 'discharge_summary') {
    const sameDay = next.hospitalizations.find((h) => h.dischargeDate === record.date);
    if (!sameDay) {
      next.hospitalizations.push({
        id: `auto-${record.id}`,
        reason: record.diagnosis.join(', ') || 'See discharge summary',
        hospital: record.hospitalName ?? '',
        admissionDate: null,
        dischargeDate: record.date,
        durationDays: null,
        notes: record.keyFindings ?? '',
      });
      changes.push({ type: 'condition_added', detail: 'Hospitalization from discharge summary' });
    }
  }

  next.updatedAt = new Date().toISOString();
  return { next, changes };
}
