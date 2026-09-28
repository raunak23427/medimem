import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QuerySnapshot,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { getDb } from '../lib/firebase';
import type {
  FamilyMember, Insight, MedicalRecord, UserProfile,
  MedicalHistory, HealthMetric, VaccinationEntry,
  BirthRecord, AntenatalHistory, DevelopmentalMilestone,
  Consultation, MedicationDose, InsurancePolicy, InsuranceClaim,
  SpecialtyProfiles, SystemicReview,
} from '../types';

function db() {
  return getDb();
}

// ─── Profile ──────────────────────────────────────────────────

export async function ensureUserProfile(uid: string, seed: Partial<UserProfile>): Promise<UserProfile> {
  const ref = doc(db(), 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as UserProfile;
  const profile: UserProfile = {
    id: uid,
    name: seed.name ?? '',
    email: seed.email ?? '',
    phone: seed.phone ?? '',
    age: seed.age ?? 0,
    gender: seed.gender ?? 'other',
    photoUrl: seed.photoUrl ?? null,
    onboardingComplete: false,
    plan: 'free',
    language: 'en',
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, profile);
  return profile;
}

export function watchProfile(uid: string, cb: (p: UserProfile | null) => void): () => void {
  const ref = doc(db(), 'users', uid);
  return onSnapshot(ref, (snap: DocumentSnapshot) => {
    cb(snap.exists() ? (snap.data() as UserProfile) : null);
  });
}

export async function updateProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db(), 'users', uid), { ...updates, updatedAt: serverTimestamp() });
}

// ─── Family Members ───────────────────────────────────────────

export function watchFamilyMembers(uid: string, cb: (members: FamilyMember[]) => void): () => void {
  const q = collection(db(), 'users', uid, 'familyMembers');
  return onSnapshot(q, (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => d.data() as FamilyMember));
  });
}

export async function upsertFamilyMember(uid: string, member: FamilyMember): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'familyMembers', member.id), member);
}

export async function deleteFamilyMember(uid: string, memberId: string): Promise<void> {
  await deleteDoc(doc(db(), 'users', uid, 'familyMembers', memberId));
}

// ─── Records ──────────────────────────────────────────────────

export function watchRecords(uid: string, cb: (records: MedicalRecord[]) => void): () => void {
  const q = collection(db(), 'users', uid, 'records');
  return onSnapshot(q, (snap: QuerySnapshot) => {
    const records = snap.docs
      .map((d) => d.data() as MedicalRecord)
      .filter((r) => !r.deletedAt);
    cb(records);
  });
}

export async function createRecord(uid: string, record: MedicalRecord): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'records', record.id), {
    ...record,
    deletedAt: null,
  });
}

export async function updateRecord(uid: string, id: string, updates: Partial<MedicalRecord>): Promise<void> {
  await updateDoc(doc(db(), 'users', uid, 'records', id), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function softDeleteRecord(uid: string, id: string): Promise<void> {
  await updateDoc(doc(db(), 'users', uid, 'records', id), {
    deletedAt: new Date().toISOString(),
  });
}

// ─── Insights ─────────────────────────────────────────────────

export function watchInsights(uid: string, cb: (insights: Insight[]) => void): () => void {
  const q = collection(db(), 'users', uid, 'insights');
  return onSnapshot(q, (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => d.data() as Insight));
  });
}

export async function markInsightRead(uid: string, id: string): Promise<void> {
  await updateDoc(doc(db(), 'users', uid, 'insights', id), { isRead: true });
}

// ─── Public share read ────────────────────────────────────────

export async function readEmergencyShare(token: string): Promise<unknown | null> {
  const ref = doc(db(), 'emergencyShares', token);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

// Keep this for future field-restricted queries.
export const _whereMember = where;

// ─── Medical History (per member, single doc) ────────────────

export function watchMedicalHistory(uid: string, cb: (items: MedicalHistory[]) => void): () => void {
  return onSnapshot(collection(db(), 'users', uid, 'medicalHistory'), (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => d.data() as MedicalHistory));
  });
}

export async function upsertMedicalHistory(uid: string, history: MedicalHistory): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'medicalHistory', history.memberId), history);
}

// ─── Health Metrics ──────────────────────────────────────────

export function watchHealthMetrics(uid: string, cb: (items: HealthMetric[]) => void): () => void {
  return onSnapshot(collection(db(), 'users', uid, 'healthMetrics'), (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => d.data() as HealthMetric));
  });
}

export async function addHealthMetric(uid: string, metric: HealthMetric): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'healthMetrics', metric.id), metric);
}

export async function deleteHealthMetric(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db(), 'users', uid, 'healthMetrics', id));
}

// ─── Vaccinations ────────────────────────────────────────────

export function watchVaccinations(uid: string, cb: (items: VaccinationEntry[]) => void): () => void {
  return onSnapshot(collection(db(), 'users', uid, 'vaccinations'), (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => d.data() as VaccinationEntry));
  });
}

export async function upsertVaccination(uid: string, v: VaccinationEntry): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'vaccinations', v.id), v);
}

export async function deleteVaccination(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db(), 'users', uid, 'vaccinations', id));
}

// ─── Birth & Child Health ────────────────────────────────────

export function watchBirthRecords(uid: string, cb: (items: BirthRecord[]) => void): () => void {
  return onSnapshot(collection(db(), 'users', uid, 'birthRecords'), (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => d.data() as BirthRecord));
  });
}

export async function upsertBirthRecord(uid: string, b: BirthRecord): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'birthRecords', b.memberId), b);
}

export function watchAntenatal(uid: string, cb: (items: AntenatalHistory[]) => void): () => void {
  return onSnapshot(collection(db(), 'users', uid, 'antenatal'), (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => d.data() as AntenatalHistory));
  });
}

export async function upsertAntenatal(uid: string, a: AntenatalHistory): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'antenatal', a.memberId), a);
}

export function watchMilestones(uid: string, cb: (items: DevelopmentalMilestone[]) => void): () => void {
  return onSnapshot(collection(db(), 'users', uid, 'milestones'), (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => d.data() as DevelopmentalMilestone));
  });
}

export async function upsertMilestone(uid: string, m: DevelopmentalMilestone): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'milestones', m.id), m);
}

// ─── Consultations ───────────────────────────────────────────

export function watchConsultations(uid: string, cb: (items: Consultation[]) => void): () => void {
  return onSnapshot(collection(db(), 'users', uid, 'consultations'), (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => d.data() as Consultation));
  });
}

export async function upsertConsultation(uid: string, c: Consultation): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'consultations', c.id), c);
}

export async function deleteConsultation(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db(), 'users', uid, 'consultations', id));
}

// ─── Medication Doses (tick log) ─────────────────────────────

export function watchMedicationDoses(uid: string, cb: (items: MedicationDose[]) => void): () => void {
  return onSnapshot(collection(db(), 'users', uid, 'medDoses'), (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => d.data() as MedicationDose));
  });
}

export async function upsertMedicationDose(uid: string, d: MedicationDose): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'medDoses', d.id), d);
}

// ─── Insurance ───────────────────────────────────────────────

export function watchInsurancePolicies(uid: string, cb: (items: InsurancePolicy[]) => void): () => void {
  return onSnapshot(collection(db(), 'users', uid, 'insurance'), (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => d.data() as InsurancePolicy));
  });
}

export async function upsertInsurancePolicy(uid: string, p: InsurancePolicy): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'insurance', p.id), p);
}

export async function deleteInsurancePolicy(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db(), 'users', uid, 'insurance', id));
}

// ─── Systemic Review (per member, single doc) ────────────────

export function watchSystemicReviews(uid: string, cb: (items: SystemicReview[]) => void): () => void {
  return onSnapshot(collection(db(), 'users', uid, 'systemicReview'), (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => d.data() as SystemicReview));
  });
}

export async function upsertSystemicReview(uid: string, r: SystemicReview): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'systemicReview', r.memberId), r);
}

// ─── Specialty Profiles ──────────────────────────────────────

export function watchSpecialtyProfiles(uid: string, cb: (items: SpecialtyProfiles[]) => void): () => void {
  return onSnapshot(collection(db(), 'users', uid, 'specialtyProfiles'), (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => d.data() as SpecialtyProfiles));
  });
}

export async function upsertSpecialtyProfile(uid: string, p: SpecialtyProfiles): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'specialtyProfiles', p.memberId), p);
}

export function watchInsuranceClaims(uid: string, cb: (items: InsuranceClaim[]) => void): () => void {
  return onSnapshot(collection(db(), 'users', uid, 'insuranceClaims'), (snap: QuerySnapshot) => {
    cb(snap.docs.map((d) => d.data() as InsuranceClaim));
  });
}

export async function upsertInsuranceClaim(uid: string, c: InsuranceClaim): Promise<void> {
  await setDoc(doc(db(), 'users', uid, 'insuranceClaims', c.id), c);
}
