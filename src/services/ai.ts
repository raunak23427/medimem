// Production: AI calls go through Cloud Functions (HF token lives server-side).
// Local test mode: calls HF directly using VITE_HF_API_KEY.
import type { AIAnalysisResult, DoctorSummary, FamilyMember, Insight, MedicalRecord, Medicine } from '../types';
import { generateId } from '../utils/helpers';
import { isLocalMode, hfApiKey } from '../lib/env';
import {
  callAnalyzeDocument,
  callChat,
  callDoctorSummary,
  callRegenerateInsights,
} from './functions';

const HF_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_MODEL = 'google/gemma-4-31B-it';

async function hfCall(messages: object[], maxTokens = 2048): Promise<string> {
  const res = await fetch(HF_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hfApiKey}` },
    body: JSON.stringify({ model: HF_MODEL, messages, max_tokens: maxTokens }),
  });
  if (!res.ok) throw new Error(`HF ${res.status}`);
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? '';
}

function parseJsonObject<T>(text: string): T {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON object in response');
  return JSON.parse(m[0]) as T;
}

function parseJsonArray<T>(text: string): T[] {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) throw new Error('No JSON array in response');
  return JSON.parse(m[0]) as T[];
}

// ─── Document analysis ────────────────────────────────────────

const EXTRACT_SYSTEM_PROMPT = `You are a medical document reader for an Indian health records app. Extract structured information and return ONLY a valid JSON object with this schema: {"documentType":"prescription|lab_report|discharge_summary|imaging|vaccination|other","date":"YYYY-MM-DD or null","doctorName":"string or null","hospitalName":"string or null","patientName":"string or null","diagnosis":[],"medicines":[{"name":"","dosage":"","frequency":"","duration":null,"estimatedRunoutDate":null}],"labResults":[{"testName":"","value":"","unit":"","referenceRange":null,"status":"normal|low|high|critical|unknown"}],"keyFindings":"1-2 sentence summary","followUpDate":"YYYY-MM-DD or null","language":"detected language"}. If a field is not present, use null or an empty array. Read carefully — this may be a photo, scan, or multi-page document.`;

export async function analyzeDocument(
  fileBase64: string | string[],
  mimeType: string,
  recordType?: string,
): Promise<AIAnalysisResult> {
  const pages = Array.isArray(fileBase64) ? fileBase64 : [fileBase64];
  const primary = pages[0];

  if (isLocalMode && hfApiKey) {
    // Build one user message with every page image, then the instruction.
    const imageBlocks = pages.map((b64) => ({
      type: 'image_url' as const,
      image_url: { url: `data:${mimeType};base64,${b64}` },
    }));
    const text = await hfCall([
      { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
      { role: 'user', content: [
        ...imageBlocks,
        { type: 'text', text: recordType ? `This is a ${recordType}. Extract all information across all pages shown.` : 'Extract all medical information from this document (all pages shown).' },
      ] },
    ]);
    return parseJsonObject<AIAnalysisResult>(text);
  }

  if (!isLocalMode) {
    const result = await callAnalyzeDocument({ fileBase64: primary, mimeType, recordType });
    if (result) return result;
  }
  return emptyAnalysis(recordType);
}

function emptyAnalysis(recordType?: string): AIAnalysisResult {
  return {
    documentType: (recordType as AIAnalysisResult['documentType']) || 'other',
    date: new Date().toISOString().split('T')[0],
    doctorName: null, hospitalName: null, patientName: null,
    diagnosis: [], medicines: [], labResults: [],
    keyFindings: 'AI analysis unavailable. Please fill in the details manually.',
    followUpDate: null, language: 'English',
  };
}

// ─── Insights ─────────────────────────────────────────────────

export async function generateInsightsForMember(
  member: FamilyMember,
  records: MedicalRecord[],
): Promise<Insight[]> {
  if (records.length === 0) return [];

  if (isLocalMode && hfApiKey) {
    try {
      const timeline = records.map(r => `[${r.date}] ${r.documentType}${r.diagnosis.length ? ` Dx:${r.diagnosis.join(',')}` : ''}${r.labResults.length ? ` Labs:${r.labResults.map(l => `${l.testName}=${l.value}${l.unit}(${l.status})`).join(',')}` : ''}${r.medicines.length ? ` Rx:${r.medicines.map(m => m.name).join(',')}` : ''}`).join('\n');
      const text = await hfCall([{ role: 'user', content: `Patient: ${member.name}, ${member.age}y ${member.gender}. Conditions: ${member.conditions.join(',') || 'none'}.\n\nTimeline:\n${timeline}\n\nGenerate 3-5 health insights. Return ONLY JSON array: [{"type":"warning|urgent|positive|reminder","title":"short title","message":"explanation","actionRequired":"action or null","relatedTests":[],"priority":1}]. Never diagnose. Always say discuss with doctor.` }]);
      const raw = parseJsonArray<{ type: string; title: string; message: string; actionRequired: string | null; relatedTests: string[]; priority: number }>(text);
      return raw.map(r => ({ id: generateId(), memberId: member.id, type: (['warning','urgent','positive','reminder'] as const).includes(r.type as Insight['type']) ? r.type as Insight['type'] : 'reminder', title: String(r.title).slice(0,200), message: String(r.message).slice(0,1000), actionRequired: r.actionRequired ? String(r.actionRequired).slice(0,500) : null, relatedTests: Array.isArray(r.relatedTests) ? r.relatedTests.map(String) : [], priority: Math.min(5, Math.max(1, Number(r.priority) || 3)), isRead: false, generatedAt: new Date().toISOString() }));
    } catch (err) {
      console.warn('Local HF insights failed, using rule engine:', err);
    }
  }

  if (!isLocalMode) {
    try { await callRegenerateInsights(member.id); return []; } catch (err) { console.warn('regenerateInsights failed:', err); }
  }

  return localInsightEngine(member, records);
}

// ─── Doctor summary ───────────────────────────────────────────

export async function generateDoctorSummaryAI(
  member: FamilyMember,
  records: MedicalRecord[],
  medicines: { medicine: Medicine; record: MedicalRecord }[],
): Promise<DoctorSummary> {
  if (isLocalMode && hfApiKey && records.length > 0) {
    try {
      const timeline = records.map(r => `[${r.date}] ${r.documentType}${r.labResults.length ? ` Labs:${r.labResults.map(l => `${l.testName}=${l.value}${l.unit}`).join(',')}` : ''}${r.diagnosis.length ? ` Dx:${r.diagnosis.join(',')}` : ''}`).join('\n');
      const text = await hfCall([{ role: 'user', content: `Create a doctor visit summary for: ${member.name}, ${member.age}y ${member.gender}. Blood:${member.bloodGroup||'Unknown'}. Conditions:${member.conditions.join(',')||'none'}. Allergies:${member.allergies.join(',')||'none'}. Meds:${medicines.map(m=>`${m.medicine.name} ${m.medicine.dosage}`).join(',')||'none'}.\n\nTimeline:\n${timeline}\n\nReturn ONLY JSON: {"patientInfo":{"name":"","age":0,"gender":"","bloodGroup":""},"activeConditions":[],"currentMedicines":[{"name":"","dosage":"","frequency":""}],"allergies":[],"recentLabHighlights":[{"test":"","value":"","date":"","status":"normal|abnormal"}],"keyHistoryPoints":[],"questionsForDoctor":[],"generatedDate":"DD Month YYYY"}` }]);
      return parseJsonObject<DoctorSummary>(text);
    } catch (err) {
      console.warn('Local HF summary failed:', err);
    }
  }
  if (!isLocalMode && records.length > 0) {
    try { const s = await callDoctorSummary(member.id); if (s) return s; } catch (err) { console.warn('doctorSummary function failed:', err); }
  }
  return localSummary(member, records, medicines);
}

// ─── Chat ─────────────────────────────────────────────────────

export async function chatWithMedicalHistory(
  member: FamilyMember,
  records: MedicalRecord[],
  medicines: { medicine: Medicine; record: MedicalRecord }[],
  messageHistory: { role: 'user' | 'assistant'; content: string }[],
  newMessage: string,
): Promise<string> {
  if (isLocalMode && hfApiKey) {
    try {
      const timeline = records.map(r => `[${r.date}] ${r.documentType}${r.labResults.length ? ` Labs:${r.labResults.map(l=>`${l.testName}=${l.value}${l.unit}`).join(',')}` : ''}${r.diagnosis.length ? ` Dx:${r.diagnosis.join(',')}` : ''}`).join('\n');
      const system = `You are a helpful medical AI assistant. Patient: ${member.name}, ${member.age}y ${member.gender}. Conditions:${member.conditions.join(',')||'none'}. Allergies:${member.allergies.join(',')||'none'}. Meds:${medicines.map(m=>m.medicine.name).join(',')||'none'}.\n\nHealth timeline:\n${timeline}\n\nNEVER diagnose. Always recommend consulting a doctor. Keep answers concise.`;
      const messages = [{ role: 'system', content: system }, ...messageHistory.slice(-10), { role: 'user', content: newMessage }];
      const text = await hfCall(messages, 1024);
      if (text) return text;
    } catch (err) {
      console.warn('Local HF chat failed:', err);
    }
  }
  if (!isLocalMode) {
    try { const r = await callChat({ memberId: member.id, history: messageHistory, message: newMessage }); if (r) return r; } catch (err) { console.warn('chat function failed:', err); }
  }
  return 'AI assistant is temporarily unavailable. Please try again in a moment.';
}

// ─── Local fallback: rule-based insight engine ────────────────
// Used only when the Cloud Function is unreachable (e.g. cold-start timeout).

function localInsightEngine(member: FamilyMember, records: MedicalRecord[]): Insight[] {
  const insights: Insight[] = [];
  const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const labByTest: Record<string, { value: number; status: string }[]> = {};

  for (const r of sorted) {
    for (const lab of r.labResults) {
      const n = parseFloat(lab.value);
      if (!Number.isNaN(n)) (labByTest[lab.testName] ||= []).push({ value: n, status: lab.status });
    }
    for (const med of r.medicines) {
      if (med.estimatedRunoutDate) {
        const days = Math.ceil((new Date(med.estimatedRunoutDate).getTime() - Date.now()) / 86400000);
        if (days >= 0 && days <= 7) {
          insights.push({
            id: generateId(), memberId: member.id,
            type: days <= 3 ? 'urgent' : 'warning',
            title: `${med.name} Running Out`,
            message: `${member.name}'s ${med.name} (${med.dosage}) runs out in ${days} day${days !== 1 ? 's' : ''}.`,
            actionRequired: `Refill ${med.name} at your pharmacy.`,
            relatedTests: [], priority: days <= 3 ? 1 : 3,
            isRead: false, generatedAt: new Date().toISOString(),
          });
        }
      }
    }
    if (r.followUpDate && new Date(r.followUpDate) < new Date()) {
      insights.push({
        id: generateId(), memberId: member.id, type: 'reminder',
        title: 'Follow-up Appointment Overdue',
        message: `Follow-up${r.doctorName ? ` with ${r.doctorName}` : ''} is past due.`,
        actionRequired: 'Contact your doctor to reschedule.',
        relatedTests: [], priority: 3,
        isRead: false, generatedAt: new Date().toISOString(),
      });
    }
  }

  for (const [testName, values] of Object.entries(labByTest)) {
    if (values.length >= 2) {
      const recent = values.slice(-3);
      const rising = recent.every((v, i) => i === 0 || v.value > recent[i - 1].value);
      const last = recent[recent.length - 1];
      if (rising && (last.status === 'high' || last.status === 'critical')) {
        insights.push({
          id: generateId(), memberId: member.id,
          type: recent.length >= 3 ? 'urgent' : 'warning',
          title: `${testName} Trending High`,
          message: `${member.name}'s ${testName} has risen across ${recent.length} consecutive tests.`,
          actionRequired: `Discuss ${testName} with your doctor.`,
          relatedTests: [testName], priority: 1,
          isRead: false, generatedAt: new Date().toISOString(),
        });
      }
    }
  }

  const seen = new Set<string>();
  return insights
    .filter((i) => (seen.has(i.title) ? false : (seen.add(i.title), true)))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5);
}

// ─── Local doctor summary fallback ───────────────────────────

function localSummary(
  member: FamilyMember,
  records: MedicalRecord[],
  medicines: { medicine: Medicine; record: MedicalRecord }[],
): DoctorSummary {
  const allLabs = records.flatMap((r) => r.labResults.map((l) => ({ ...l, date: r.date })));
  const diagnoses = [...new Set(records.flatMap((r) => r.diagnosis))];
  return {
    patientInfo: {
      name: member.name, age: member.age,
      gender: member.gender === 'male' ? 'Male' : member.gender === 'female' ? 'Female' : 'Other',
      bloodGroup: member.bloodGroup || 'Unknown',
    },
    activeConditions: member.conditions,
    currentMedicines: medicines.map((m) => ({
      name: m.medicine.name, dosage: m.medicine.dosage, frequency: m.medicine.frequency,
    })),
    allergies: member.allergies,
    recentLabHighlights: allLabs.slice(0, 6).map((l) => ({
      test: l.testName, value: `${l.value} ${l.unit}`, date: l.date,
      status: l.status === 'normal' ? 'normal' : 'abnormal',
    })),
    keyHistoryPoints: [
      ...diagnoses.slice(0, 2).map((d) => `Diagnosed with ${d}`),
      records.length > 0 ? `${records.length} medical records on file` : '',
      medicines.length > 0 ? `Currently on ${medicines.length} medication${medicines.length !== 1 ? 's' : ''}` : '',
    ].filter(Boolean),
    questionsForDoctor: [
      'Are there any preventive screenings recommended at this age?',
      'Should any routine blood work be done?',
    ],
    generatedDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
}
