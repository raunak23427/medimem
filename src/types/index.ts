// ─── Family & Profile ─────────────────────────────────────────

export type Gender = 'male' | 'female' | 'other';

export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | 'separated' | 'unknown';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  gender: Gender;
  photoUrl: string | null;
  onboardingComplete: boolean;
  plan: 'free' | 'family' | 'annual';
  language: 'en' | 'hi' | 'ta' | 'te' | 'bn';
  // Demographics
  maritalStatus?: MaritalStatus;
  occupation?: string;
  toxinExposure?: string[];
  heightCm?: number | null;
  weightKg?: number | null;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: 'self' | 'spouse' | 'father' | 'mother' | 'son' | 'daughter' | 'other';
  age: number;
  gender: Gender;
  dob?: string | null;
  conditions: string[];
  bloodGroup: string | null;
  emergencyContact: { name: string; phone: string } | null;
  doctorName: string | null;
  doctorPhone: string | null;
  allergies: string[];
  address?: { current?: string; permanent?: string } | null;
  // Demographics
  maritalStatus?: MaritalStatus;
  occupation?: string;
  toxinExposure?: string[];
  heightCm?: number | null;
  weightKg?: number | null;
  createdAt: string;
}

// ─── Medical Records ──────────────────────────────────────────

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string | null;
  estimatedRunoutDate: string | null;
}

export interface LabResult {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string | null;
  status: 'normal' | 'low' | 'high' | 'critical' | 'unknown';
}

export interface MedicalRecord {
  id: string;
  memberId: string;
  documentType: 'prescription' | 'lab_report' | 'discharge_summary' | 'imaging' | 'vaccination' | 'insurance' | 'other';
  date: string;
  doctorName: string | null;
  hospitalName: string | null;
  patientName: string | null;
  diagnosis: string[];
  medicines: Medicine[];
  labResults: LabResult[];
  keyFindings: string;
  followUpDate: string | null;
  language: string;
  uploadedImageUrl: string;
  storagePath?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// ─── Insights ─────────────────────────────────────────────────

export interface Insight {
  id: string;
  memberId: string;
  type: 'warning' | 'urgent' | 'positive' | 'reminder';
  title: string;
  message: string;
  actionRequired: string | null;
  relatedTests: string[];
  priority: number;
  isRead: boolean;
  generatedAt: string;
}

// ─── AI Analysis ──────────────────────────────────────────────

export interface AIAnalysisResult {
  documentType: string;
  date: string | null;
  doctorName: string | null;
  hospitalName: string | null;
  patientName: string | null;
  diagnosis: string[];
  medicines: Medicine[];
  labResults: LabResult[];
  keyFindings: string;
  followUpDate: string | null;
  language: string;
}

// ─── Doctor Summary ───────────────────────────────────────────

export interface DoctorSummary {
  patientInfo: { name: string; age: number; gender: string; bloodGroup: string };
  activeConditions: string[];
  currentMedicines: { name: string; dosage: string; frequency: string }[];
  allergies: string[];
  recentLabHighlights: { test: string; value: string; date: string; status: 'normal' | 'abnormal' }[];
  keyHistoryPoints: string[];
  questionsForDoctor: string[];
  generatedDate: string;
}

// ─── Emergency Card ───────────────────────────────────────────

export interface EmergencyCardData {
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  emergencyContact: { name: string; phone: string };
  conditions: string[];
  allergies: string[];
  criticalMedicines: { name: string; dosage: string }[];
  doctorName: string;
  doctorPhone: string;
}

// ─── Standard History Taking (AIIMS-level) ────────────────────

export type Severity = 'mild' | 'moderate' | 'severe' | 'critical';
export type Outcome = 'recovered' | 'ongoing' | 'controlled' | 'worsened' | 'unknown';

// Merged chief complaint + history of present illness (sections A + B).
export interface ChiefComplaint {
  problem: string;
  durationDays: number | null;
  severity: Severity;
  startDate: string | null;
  onset: 'sudden' | 'gradual' | 'unknown';
  progression: 'worsening' | 'improving' | 'stable' | 'fluctuating' | 'unknown';
  associatedSymptoms: string[];
  aggravatingFactors: string[];
  relievingFactors: string[];
}

// Kept as alias for backward compat with existing code paths.
export type PresentIllness = ChiefComplaint;

export interface ChronicCondition {
  name: string;
  diagnosedYear: number | null;
  sinceDuration: string;        // e.g. "5 years", "since 2020"
  treatment: string;
  medication: string;            // current medication for this condition
  outcome: Outcome;
  notes: string;
  specificType?: string;         // e.g. cancer type, kidney ds type
}

export interface HospitalizationHistory {
  id: string;
  reason: string;
  hospital: string;
  admissionDate: string | null;
  dischargeDate: string | null;
  durationDays: number | null;
  notes: string;
}

export interface InfectiousHistory {
  disease: string;
  year: number | null;
  treatment: string;
  durationDays: number | null;
  outcome: Outcome;
}

export interface SurgicalHistory {
  id: string;
  surgery: string;
  date: string | null;
  hospital: string;
  surgeon: string | null;
  complications: string;
  notes: string;
}

export interface AllergyEntry {
  id: string;
  allergen: string;
  category: 'drug' | 'food' | 'environmental' | 'other';
  reaction: string;
  severity: Severity;
  firstNoticed: string | null;
}

export interface FamilyHistoryEntry {
  id: string;
  relation: 'father' | 'mother' | 'sibling' | 'grandparent' | 'uncle' | 'aunt' | 'other';
  conditions: string[];
  age: number | null;
  alive: boolean;
}

export type PhysicalActivity = 'walking' | 'running' | 'cycling' | 'gym' | 'sports' | 'yoga' | 'none';
export type DietType = 'vegetarian' | 'non-vegetarian' | 'vegan' | 'eggetarian' | 'mixed' | 'unknown';
export type AddictionType = 'tobacco' | 'alcohol' | 'recreational_drugs' | 'caffeine' | 'gambling' | 'other';
export type BowelHabit = 'regular' | 'constipation' | 'diarrhea' | 'alternating' | 'irregular' | 'unknown';

export interface LifestyleProfile {
  diet: DietType;
  appetite: 'normal' | 'increased' | 'decreased' | 'variable' | 'unknown';
  physicalActivities: PhysicalActivity[];   // multi-select
  physicalActivityHoursPerWeek: number | null;
  addictions: AddictionType[];               // multi-select
  addictionDetails: string;                  // free text — what & how much
  smoking: 'never' | 'former' | 'current' | 'unknown';
  smokingPackYears: number | null;
  alcohol: 'never' | 'occasional' | 'regular' | 'heavy' | 'former' | 'unknown';
  sleepHours: number | null;
  bowelHabit: BowelHabit;
  bowelNotes: string;
  bladderTimesDay: number | null;
  bladderTimesNight: number | null;
  bladderAbnormality: string;                // burning, urgency, blood, etc.
  occupation: string;
  stressLevel: 'low' | 'moderate' | 'high' | 'unknown';
}

export type MentalHealthCondition =
  | 'anxiety' | 'depression' | 'adhd' | 'autism' | 'ocd'
  | 'bipolar' | 'schizophrenia' | 'ptsd' | 'panic_disorder'
  | 'eating_disorder' | 'substance_abuse' | 'borderline_personality'
  | 'phobia' | 'insomnia' | 'dementia' | 'other';

export interface MentalHealthEntry {
  condition: MentalHealthCondition;
  diagnosedYear: number | null;
  notes: string;
  underTreatment: boolean;
}

export interface MedicalHistory {
  memberId: string;
  chiefComplaint: ChiefComplaint | null;
  // PresentIllness kept as alias for ChiefComplaint; clients now write into
  // chiefComplaint directly. Field retained for backward compat.
  presentIllness: PresentIllness | null;
  chronicConditions: ChronicCondition[];
  infectiousHistory: InfectiousHistory[];
  surgicalHistory: SurgicalHistory[];
  hospitalizations: HospitalizationHistory[];
  allergies: AllergyEntry[];
  familyHistory: FamilyHistoryEntry[];
  lifestyle: LifestyleProfile | null;
  mentalHealth: MentalHealthEntry[];
  updatedAt: string;
}

// ─── Systemic Review ──────────────────────────────────────────
// Each system is a flat record of named-symptom → boolean. Free-text notes
// per system live in `notes`.

export interface SystemSymptoms<TKey extends string> {
  symptoms: Partial<Record<TKey, boolean>>;
  notes: string;
}

export type GeneralSymptomKey = 'fever' | 'fatigue' | 'weight_loss' | 'weight_gain' | 'night_sweats' | 'loss_of_appetite';
export type CvsSymptomKey = 'chest_pain' | 'palpitations' | 'dyspnea_on_exertion' | 'orthopnea' | 'pedal_edema' | 'syncope';
export type RespSymptomKey = 'cough_dry' | 'cough_wet' | 'wheezing' | 'cold' | 'chest_pain_breathing' | 'shortness_of_breath' | 'hemoptysis';
export type GiSymptomKey = 'nausea' | 'vomiting' | 'diarrhea' | 'constipation' | 'acidity' | 'gas' | 'abdominal_pain' | 'jaundice' | 'blood_in_stool';
export type UrinarySymptomKey = 'burning_micturition' | 'frequency' | 'blood_in_urine' | 'pain' | 'difficulty_holding' | 'nocturia' | 'incontinence';
export type GenitalSymptomKey = 'itching' | 'rash' | 'discharge' | 'ulcers' | 'pain' | 'lumps';
export type MskSymptomKey = 'joint_pain' | 'joint_swelling' | 'joint_stiffness' | 'back_pain' | 'muscle_weakness' | 'limited_movement';
export type NeuroSymptomKey = 'headache' | 'dizziness' | 'fits_seizures' | 'neck_stiffness' | 'vomiting' | 'altered_consciousness' | 'numbness' | 'tingling' | 'memory_loss' | 'weakness';
export type EndocrineSymptomKey = 'heat_intolerance' | 'cold_intolerance' | 'increased_thirst' | 'increased_urination' | 'weight_change' | 'hair_growth_changes';
export type SkinSymptomKey = 'itching' | 'rash' | 'redness' | 'color_change' | 'hair_fall' | 'dandruff' | 'dryness' | 'lesions';
export type EntSymptomKey = 'ear_pain' | 'ear_discharge' | 'hearing_problem' | 'tinnitus' | 'nasal_block' | 'sore_throat' | 'sinus_pain';
export type EyeSymptomKey = 'redness' | 'discharge' | 'stye' | 'vision_problem' | 'headache' | 'pain' | 'photophobia' | 'watering';

export interface SystemicReview {
  memberId: string;
  general: SystemSymptoms<GeneralSymptomKey>;
  cardiovascular: SystemSymptoms<CvsSymptomKey>;
  respiratory: SystemSymptoms<RespSymptomKey>;
  gastrointestinal: SystemSymptoms<GiSymptomKey>;
  urinary: SystemSymptoms<UrinarySymptomKey>;
  genital: SystemSymptoms<GenitalSymptomKey>;
  musculoskeletal: SystemSymptoms<MskSymptomKey>;
  neurological: SystemSymptoms<NeuroSymptomKey>;
  endocrine: SystemSymptoms<EndocrineSymptomKey>;
  skin: SystemSymptoms<SkinSymptomKey>;
  ent: SystemSymptoms<EntSymptomKey>;
  eye: SystemSymptoms<EyeSymptomKey>;
  updatedAt: string;
}

// ─── Health Metrics (vitals tracked over time) ────────────────

export type MetricKind =
  | 'bp_systolic' | 'bp_diastolic'
  | 'weight' | 'height' | 'bmi'
  | 'blood_sugar_fasting' | 'blood_sugar_postprandial' | 'hba1c'
  | 'hemoglobin' | 'tsh' | 'cholesterol_total' | 'cholesterol_ldl' | 'cholesterol_hdl'
  | 'temperature' | 'heart_rate' | 'oxygen_saturation';

export interface HealthMetric {
  id: string;
  memberId: string;
  kind: MetricKind;
  value: number;
  unit: string;
  date: string;
  source: 'manual' | 'lab_report' | 'device';
  recordId?: string | null;
  notes?: string;
}

// ─── Vaccinations ─────────────────────────────────────────────

export interface VaccinationEntry {
  id: string;
  memberId: string;
  vaccine: string;
  doseNumber: number;
  dateGiven: string | null;
  dateDue?: string | null;
  hospital: string;
  batchNumber?: string | null;
  status: 'given' | 'due' | 'overdue' | 'skipped';
}

// ─── Birth & Child Health ─────────────────────────────────────

export interface BirthRecord {
  memberId: string;
  dateOfBirth: string;
  timeOfBirth?: string | null;
  birthWeightKg?: number | null;
  gestationalAgeWeeks?: number | null;
  deliveryType: 'normal' | 'c_section' | 'forceps' | 'vacuum' | 'unknown';
  nicuAdmission: boolean;
  nicuDays?: number | null;
  complications: string[];
  hospital: string;
}

export interface AntenatalHistory {
  memberId: string;
  maternalIllnesses: string[];
  pregnancyComplications: string[];
  medicationsDuringPregnancy: string[];
  ultrasoundFindings: string[];
  congenitalGenetic: string[];     // congenital anomalies + genetic conditions
}

export interface DevelopmentalMilestone {
  id: string;
  memberId: string;
  milestone: string;
  expectedAgeMonths: number;
  achievedAgeMonths: number | null;
  status: 'on_time' | 'delayed' | 'not_achieved' | 'early';
}

// ─── Consultations (visits) ───────────────────────────────────

export type VisitPurpose = 'new_illness' | 'follow_up' | 'emergency' | 'routine' | 'preventive';

export interface Consultation {
  id: string;
  memberId: string;
  purpose: VisitPurpose;
  scheduledDate: string;
  doctorName: string | null;
  hospitalName: string | null;
  specialty: string | null;
  preVisitSummary: string | null;
  postVisitSummary: string | null;
  finalDiagnosis: string[];
  medicationChanges: string[];
  testsAdvised: string[];
  followUpDate: string | null;
  recordIds: string[];
  createdAt: string;
  completedAt: string | null;
}

// ─── Medication Schedule + Tracking ──────────────────────────

export interface MedicationDose {
  id: string;
  memberId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string;
  scheduledDate: string;
  takenAt: string | null;
  skipped: boolean;
  notes?: string;
}

// ─── Specialty Modules ───────────────────────────────────────

export interface GynaeProfile {
  memberId: string;
  // Menarche
  menarcheAge: number | null;
  // Cycle
  cycleIntervalDays: number | null;     // typical days between cycle starts
  flowDurationDays: number | null;      // typical period length
  cycleRegular: boolean;
  lastPeriodDate: string | null;
  // Flow + pain
  flowVolume: 'normal' | 'profuse' | 'scanty' | 'variable' | 'unknown';
  hasPain: boolean;
  painSeverity?: Severity;
  // Conditions / menopause
  conditions: string[];                 // PCOS, fibroid, endometriosis, etc.
  menopauseAge?: number | null;
}

export interface ObstetricsProfile {
  memberId: string;
  pregnancyCount: number;
  liveBirths: number;
  miscarriages: number;
  abortions: number;
  stillbirths: number;
  currentlyPregnant: boolean;
  lastPregnancyDate?: string | null;
  deliveries: ObstetricDelivery[];
  complications: string[];              // gestational diabetes, preeclampsia, etc.
}

export interface ObstetricDelivery {
  id: string;
  year: number | null;
  outcome: 'live_birth' | 'stillbirth' | 'miscarriage' | 'abortion';
  deliveryType: 'normal' | 'c_section' | 'forceps' | 'vacuum' | 'unknown';
  gestationalAgeWeeks: number | null;
  babyWeightKg: number | null;
  complications: string;
  hospital: string;
}

export interface EyeProfile {
  memberId: string;
  rightEye: { sphere: number | null; cylinder: number | null; axis: number | null } | null;
  leftEye: { sphere: number | null; cylinder: number | null; axis: number | null } | null;
  glassesPrescriptionDate: string | null;
  conditions: string[];
}

export interface ENTProfile {
  memberId: string;
  hearingRight: 'normal' | 'mild_loss' | 'moderate_loss' | 'severe_loss' | 'unknown';
  hearingLeft: 'normal' | 'mild_loss' | 'moderate_loss' | 'severe_loss' | 'unknown';
  conditions: string[];
}

export interface DentalProfile {
  memberId: string;
  lastVisit: string | null;
  conditions: string[];
  procedures: { name: string; date: string; tooth?: string }[];
}

export interface DermatologyProfile {
  memberId: string;
  conditions: string[];
  notes: string;
}

export interface NeurologyProfile {
  memberId: string;
  conditions: string[];
  seizureHistory: boolean;
  strokeHistory: boolean;
  memoryConcerns: boolean;
}

export interface GeriatricProfile {
  memberId: string;
  fallsLast12Months: number;
  frailtyScore: number | null;
  memoryDecline: boolean;
  dependencyLevel: 'independent' | 'needs_assistance' | 'dependent';
}

// Container holding any combination of specialty profiles for a single member.
export interface SpecialtyProfiles {
  memberId: string;
  gynae?: GynaeProfile;
  obstetrics?: ObstetricsProfile;
  eye?: EyeProfile;
  ent?: ENTProfile;
  dental?: DentalProfile;
  dermatology?: DermatologyProfile;
  neurology?: NeurologyProfile;
  geriatrics?: GeriatricProfile;
  updatedAt: string;
}

// ─── Insurance ────────────────────────────────────────────────

export interface InsurancePolicy {
  id: string;
  memberIds: string[];
  insurer: string;
  policyNumber: string;
  policyType: 'individual' | 'family_floater' | 'group' | 'critical_illness' | 'accident' | 'top_up';
  sumInsured: number;
  premiumAmount: number;
  startDate: string;
  endDate: string;
  isCashless: boolean;
  cashlessHospitals: string[];
  documentUrl: string | null;
  claimsFiledThisYear: number;
}

export interface InsuranceClaim {
  id: string;
  policyId: string;
  memberId: string;
  claimAmount: number;
  approvedAmount: number | null;
  status: 'submitted' | 'in_review' | 'approved' | 'rejected' | 'settled';
  hospital: string;
  admissionDate: string;
  dischargeDate: string | null;
  documents: string[];
  notes: string;
}
