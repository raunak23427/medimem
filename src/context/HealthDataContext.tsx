// Holds all the "Phase 1+" structured data: medical history, health metrics,
// vaccinations, birth records, milestones, consultations, medication doses,
// insurance policies + claims.
//
// The base AppContext keeps profile/family/records/insights. This context
// layers on top and uses the same uid + mode (local vs Firebase) signal.
import React, {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, type ReactNode,
} from 'react';
import type {
  MedicalHistory, HealthMetric, VaccinationEntry,
  BirthRecord, AntenatalHistory, DevelopmentalMilestone,
  Consultation, MedicationDose, InsurancePolicy, InsuranceClaim,
  SpecialtyProfiles, SystemicReview,
} from '../types';
import { isLocalMode } from '../lib/env';
import { useApp } from './AppContext';
import { currentUser } from '../services/auth';
import * as fs from '../services/firestore';

interface HealthDataState {
  medicalHistory: MedicalHistory[];
  healthMetrics: HealthMetric[];
  vaccinations: VaccinationEntry[];
  birthRecords: BirthRecord[];
  antenatal: AntenatalHistory[];
  milestones: DevelopmentalMilestone[];
  consultations: Consultation[];
  medicationDoses: MedicationDose[];
  insurancePolicies: InsurancePolicy[];
  insuranceClaims: InsuranceClaim[];
  specialtyProfiles: SpecialtyProfiles[];
  systemicReviews: SystemicReview[];
}

interface HealthDataContextType extends HealthDataState {
  // Medical history
  saveMedicalHistory: (h: MedicalHistory) => void;
  getMemberHistory: (memberId: string) => MedicalHistory | undefined;

  // Health metrics
  addHealthMetric: (m: HealthMetric) => void;
  deleteHealthMetric: (id: string) => void;
  getMemberMetrics: (memberId: string) => HealthMetric[];

  // Vaccinations
  saveVaccination: (v: VaccinationEntry) => void;
  removeVaccination: (id: string) => void;
  getMemberVaccinations: (memberId: string) => VaccinationEntry[];

  // Birth & child
  saveBirthRecord: (b: BirthRecord) => void;
  saveAntenatal: (a: AntenatalHistory) => void;
  saveMilestone: (m: DevelopmentalMilestone) => void;
  getMemberBirthRecord: (memberId: string) => BirthRecord | undefined;
  getMemberAntenatal: (memberId: string) => AntenatalHistory | undefined;
  getMemberMilestones: (memberId: string) => DevelopmentalMilestone[];

  // Consultations
  saveConsultation: (c: Consultation) => void;
  removeConsultation: (id: string) => void;
  getMemberConsultations: (memberId: string) => Consultation[];

  // Medication doses
  saveMedicationDose: (d: MedicationDose) => void;
  getMemberDoses: (memberId: string, dateISO?: string) => MedicationDose[];

  // Insurance
  saveInsurancePolicy: (p: InsurancePolicy) => void;
  removeInsurancePolicy: (id: string) => void;
  saveInsuranceClaim: (c: InsuranceClaim) => void;

  // Specialty profiles
  saveSpecialtyProfile: (p: SpecialtyProfiles) => void;
  getMemberSpecialty: (memberId: string) => SpecialtyProfiles | undefined;

  // Systemic review
  saveSystemicReview: (r: SystemicReview) => void;
  getMemberSystemicReview: (memberId: string) => SystemicReview | undefined;
}

const EMPTY_STATE: HealthDataState = {
  medicalHistory: [], healthMetrics: [], vaccinations: [],
  birthRecords: [], antenatal: [], milestones: [],
  consultations: [], medicationDoses: [],
  insurancePolicies: [], insuranceClaims: [],
  specialtyProfiles: [], systemicReviews: [],
};

const HealthDataContext = createContext<HealthDataContextType | null>(null);

export function HealthDataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useApp();
  const [state, setState] = useState<HealthDataState>(EMPTY_STATE);
  const uidRef = useRef<string | null>(null);

  // ─── Firebase subscriptions in live mode ────────────────────
  useEffect(() => {
    if (isLocalMode || !isAuthenticated) { setState(EMPTY_STATE); return; }
    const uid = currentUser()?.uid ?? null;
    uidRef.current = uid;
    if (!uid) return;
    const unsubs: Array<() => void> = [];
    unsubs.push(fs.watchMedicalHistory(uid, (medicalHistory) => setState((s) => ({ ...s, medicalHistory }))));
    unsubs.push(fs.watchHealthMetrics(uid, (healthMetrics) => setState((s) => ({ ...s, healthMetrics }))));
    unsubs.push(fs.watchVaccinations(uid, (vaccinations) => setState((s) => ({ ...s, vaccinations }))));
    unsubs.push(fs.watchBirthRecords(uid, (birthRecords) => setState((s) => ({ ...s, birthRecords }))));
    unsubs.push(fs.watchAntenatal(uid, (antenatal) => setState((s) => ({ ...s, antenatal }))));
    unsubs.push(fs.watchMilestones(uid, (milestones) => setState((s) => ({ ...s, milestones }))));
    unsubs.push(fs.watchConsultations(uid, (consultations) => setState((s) => ({ ...s, consultations }))));
    unsubs.push(fs.watchMedicationDoses(uid, (medicationDoses) => setState((s) => ({ ...s, medicationDoses }))));
    unsubs.push(fs.watchInsurancePolicies(uid, (insurancePolicies) => setState((s) => ({ ...s, insurancePolicies }))));
    unsubs.push(fs.watchInsuranceClaims(uid, (insuranceClaims) => setState((s) => ({ ...s, insuranceClaims }))));
    unsubs.push(fs.watchSpecialtyProfiles(uid, (specialtyProfiles) => setState((s) => ({ ...s, specialtyProfiles }))));
    unsubs.push(fs.watchSystemicReviews(uid, (systemicReviews) => setState((s) => ({ ...s, systemicReviews }))));
    return () => unsubs.forEach((u) => u());
  }, [isAuthenticated]);

  // ─── Mutations ─────────────────────────────────────────────

  const saveMedicalHistory = useCallback((h: MedicalHistory) => {
    if (isLocalMode) {
      setState((s) => ({
        ...s,
        medicalHistory: [...s.medicalHistory.filter((x) => x.memberId !== h.memberId), h],
      }));
      return;
    }
    const uid = uidRef.current; if (uid) void fs.upsertMedicalHistory(uid, h);
  }, []);
  const getMemberHistory = useCallback((memberId: string) => state.medicalHistory.find((h) => h.memberId === memberId), [state.medicalHistory]);

  const addHealthMetric = useCallback((m: HealthMetric) => {
    if (isLocalMode) { setState((s) => ({ ...s, healthMetrics: [...s.healthMetrics, m] })); return; }
    const uid = uidRef.current; if (uid) void fs.addHealthMetric(uid, m);
  }, []);
  const deleteHealthMetric = useCallback((id: string) => {
    if (isLocalMode) { setState((s) => ({ ...s, healthMetrics: s.healthMetrics.filter((m) => m.id !== id) })); return; }
    const uid = uidRef.current; if (uid) void fs.deleteHealthMetric(uid, id);
  }, []);
  const getMemberMetrics = useCallback((memberId: string) => state.healthMetrics
    .filter((m) => m.memberId === memberId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [state.healthMetrics]);

  const saveVaccination = useCallback((v: VaccinationEntry) => {
    if (isLocalMode) {
      setState((s) => ({ ...s, vaccinations: [...s.vaccinations.filter((x) => x.id !== v.id), v] }));
      return;
    }
    const uid = uidRef.current; if (uid) void fs.upsertVaccination(uid, v);
  }, []);
  const removeVaccination = useCallback((id: string) => {
    if (isLocalMode) { setState((s) => ({ ...s, vaccinations: s.vaccinations.filter((v) => v.id !== id) })); return; }
    const uid = uidRef.current; if (uid) void fs.deleteVaccination(uid, id);
  }, []);
  const getMemberVaccinations = useCallback((memberId: string) => state.vaccinations
    .filter((v) => v.memberId === memberId)
    .sort((a, b) => (a.dateGiven ?? a.dateDue ?? '').localeCompare(b.dateGiven ?? b.dateDue ?? '')), [state.vaccinations]);

  const saveBirthRecord = useCallback((b: BirthRecord) => {
    if (isLocalMode) {
      setState((s) => ({ ...s, birthRecords: [...s.birthRecords.filter((x) => x.memberId !== b.memberId), b] }));
      return;
    }
    const uid = uidRef.current; if (uid) void fs.upsertBirthRecord(uid, b);
  }, []);
  const saveAntenatal = useCallback((a: AntenatalHistory) => {
    if (isLocalMode) {
      setState((s) => ({ ...s, antenatal: [...s.antenatal.filter((x) => x.memberId !== a.memberId), a] }));
      return;
    }
    const uid = uidRef.current; if (uid) void fs.upsertAntenatal(uid, a);
  }, []);
  const saveMilestone = useCallback((m: DevelopmentalMilestone) => {
    if (isLocalMode) {
      setState((s) => ({ ...s, milestones: [...s.milestones.filter((x) => x.id !== m.id), m] }));
      return;
    }
    const uid = uidRef.current; if (uid) void fs.upsertMilestone(uid, m);
  }, []);
  const getMemberBirthRecord = useCallback((memberId: string) => state.birthRecords.find((b) => b.memberId === memberId), [state.birthRecords]);
  const getMemberAntenatal = useCallback((memberId: string) => state.antenatal.find((a) => a.memberId === memberId), [state.antenatal]);
  const getMemberMilestones = useCallback((memberId: string) => state.milestones.filter((m) => m.memberId === memberId).sort((a, b) => a.expectedAgeMonths - b.expectedAgeMonths), [state.milestones]);

  const saveConsultation = useCallback((c: Consultation) => {
    if (isLocalMode) {
      setState((s) => ({ ...s, consultations: [...s.consultations.filter((x) => x.id !== c.id), c] }));
      return;
    }
    const uid = uidRef.current; if (uid) void fs.upsertConsultation(uid, c);
  }, []);
  const removeConsultation = useCallback((id: string) => {
    if (isLocalMode) { setState((s) => ({ ...s, consultations: s.consultations.filter((c) => c.id !== id) })); return; }
    const uid = uidRef.current; if (uid) void fs.deleteConsultation(uid, id);
  }, []);
  const getMemberConsultations = useCallback((memberId: string) => state.consultations
    .filter((c) => c.memberId === memberId)
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)), [state.consultations]);

  const saveMedicationDose = useCallback((d: MedicationDose) => {
    if (isLocalMode) {
      setState((s) => ({ ...s, medicationDoses: [...s.medicationDoses.filter((x) => x.id !== d.id), d] }));
      return;
    }
    const uid = uidRef.current; if (uid) void fs.upsertMedicationDose(uid, d);
  }, []);
  const getMemberDoses = useCallback((memberId: string, dateISO?: string) => {
    return state.medicationDoses.filter((d) => d.memberId === memberId && (!dateISO || d.scheduledDate === dateISO));
  }, [state.medicationDoses]);

  const saveInsurancePolicy = useCallback((p: InsurancePolicy) => {
    if (isLocalMode) {
      setState((s) => ({ ...s, insurancePolicies: [...s.insurancePolicies.filter((x) => x.id !== p.id), p] }));
      return;
    }
    const uid = uidRef.current; if (uid) void fs.upsertInsurancePolicy(uid, p);
  }, []);
  const removeInsurancePolicy = useCallback((id: string) => {
    if (isLocalMode) { setState((s) => ({ ...s, insurancePolicies: s.insurancePolicies.filter((p) => p.id !== id) })); return; }
    const uid = uidRef.current; if (uid) void fs.deleteInsurancePolicy(uid, id);
  }, []);
  const saveInsuranceClaim = useCallback((c: InsuranceClaim) => {
    if (isLocalMode) {
      setState((s) => ({ ...s, insuranceClaims: [...s.insuranceClaims.filter((x) => x.id !== c.id), c] }));
      return;
    }
    const uid = uidRef.current; if (uid) void fs.upsertInsuranceClaim(uid, c);
  }, []);

  const saveSpecialtyProfile = useCallback((p: SpecialtyProfiles) => {
    if (isLocalMode) {
      setState((s) => ({ ...s, specialtyProfiles: [...s.specialtyProfiles.filter((x) => x.memberId !== p.memberId), p] }));
      return;
    }
    const uid = uidRef.current; if (uid) void fs.upsertSpecialtyProfile(uid, p);
  }, []);
  const getMemberSpecialty = useCallback((memberId: string) => state.specialtyProfiles.find((p) => p.memberId === memberId), [state.specialtyProfiles]);

  const saveSystemicReview = useCallback((r: SystemicReview) => {
    if (isLocalMode) {
      setState((s) => ({ ...s, systemicReviews: [...s.systemicReviews.filter((x) => x.memberId !== r.memberId), r] }));
      return;
    }
    const uid = uidRef.current; if (uid) void fs.upsertSystemicReview(uid, r);
  }, []);
  const getMemberSystemicReview = useCallback((memberId: string) => state.systemicReviews.find((r) => r.memberId === memberId), [state.systemicReviews]);

  return React.createElement(HealthDataContext.Provider, {
    value: {
      ...state,
      saveMedicalHistory, getMemberHistory,
      addHealthMetric, deleteHealthMetric, getMemberMetrics,
      saveVaccination, removeVaccination, getMemberVaccinations,
      saveBirthRecord, saveAntenatal, saveMilestone,
      getMemberBirthRecord, getMemberAntenatal, getMemberMilestones,
      saveConsultation, removeConsultation, getMemberConsultations,
      saveMedicationDose, getMemberDoses,
      saveInsurancePolicy, removeInsurancePolicy, saveInsuranceClaim,
      saveSpecialtyProfile, getMemberSpecialty,
      saveSystemicReview, getMemberSystemicReview,
    },
  }, children);
}

export function useHealthData() {
  const ctx = useContext(HealthDataContext);
  if (!ctx) throw new Error('useHealthData must be used within HealthDataProvider');
  return ctx;
}
