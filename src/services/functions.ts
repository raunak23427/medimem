import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '../lib/firebase';
import type { AIAnalysisResult, DoctorSummary } from '../types';

type FnResult<T> = { ok: true } & T | { ok: false; error: string };

export async function callAnalyzeDocument(args: {
  fileBase64: string;
  mimeType: string;
  recordType?: string;
}): Promise<AIAnalysisResult | null> {
  const fn = httpsCallable<typeof args, FnResult<{ result: AIAnalysisResult }>>(
    getFirebaseFunctions(), 'analyzeDocumentFn',
  );
  const res = await fn(args);
  return res.data.ok ? res.data.result : null;
}

export async function callRegenerateInsights(memberId: string): Promise<number> {
  const fn = httpsCallable<{ memberId: string }, { ok: true; count: number }>(
    getFirebaseFunctions(), 'regenerateInsightsFn',
  );
  const res = await fn({ memberId });
  return res.data.count;
}

export async function callDoctorSummary(memberId: string): Promise<DoctorSummary | null> {
  const fn = httpsCallable<{ memberId: string }, FnResult<{ summary: DoctorSummary }>>(
    getFirebaseFunctions(), 'doctorSummaryFn',
  );
  const res = await fn({ memberId });
  return res.data.ok ? res.data.summary : null;
}

export async function callChat(args: {
  memberId: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  message: string;
}): Promise<string | null> {
  const fn = httpsCallable<typeof args, FnResult<{ reply: string }>>(
    getFirebaseFunctions(), 'chatFn',
  );
  const res = await fn(args);
  return res.data.ok ? res.data.reply : null;
}

export async function callMintEmergencyShare(memberId: string, ttlHours?: number): Promise<{ token: string; url: string; expiresAt: Date | null }> {
  const fn = httpsCallable<{ memberId: string; ttlHours?: number }, { ok: true; token: string; url: string; expiresAt: string | null }>(
    getFirebaseFunctions(), 'mintEmergencyShareFn',
  );
  const res = await fn({ memberId, ttlHours });
  return {
    token: res.data.token,
    url: res.data.url,
    expiresAt: res.data.expiresAt ? new Date(res.data.expiresAt) : null,
  };
}

export async function callRevokeEmergencyShare(token: string): Promise<void> {
  const fn = httpsCallable<{ token: string }, { ok: true }>(getFirebaseFunctions(), 'revokeEmergencyShareFn');
  await fn({ token });
}
