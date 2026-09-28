import React, {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, type ReactNode,
} from 'react';
import type { UserProfile, FamilyMember, MedicalRecord, Insight, Medicine } from '../types';
import { isLocalMode } from '../lib/env';
import * as authSvc from '../services/auth';
import * as fs from '../services/firestore';
import { callRegenerateInsights } from '../services/functions';
import { generateId } from '../utils/helpers';
import { demoProfile, demoFamilyMembers, demoRecords, demoInsights } from '../services/demo-data';

// ─── Context shape ────────────────────────────────────────────

interface AppState {
  profile: UserProfile;
  familyMembers: FamilyMember[];
  records: MedicalRecord[];
  insights: Insight[];
  selectedMemberId: string;
  isAuthenticated: boolean;
  isOnboarded: boolean;
}

interface AppContextType extends AppState {
  isLoading: boolean;
  setSelectedMemberId: (id: string) => void;
  login: (email: string, name?: string) => void;
  logout: () => void;
  completeOnboarding: (profile: Partial<UserProfile>, members: FamilyMember[]) => void;
  addRecord: (record: MedicalRecord) => void;
  addInsights: (insights: Insight[]) => void;
  markInsightRead: (id: string) => void;
  addFamilyMember: (member: FamilyMember) => void;
  removeFamilyMember: (id: string) => void;
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => void;
  deleteRecord: (id: string) => void;
  updateRecord: (id: string, updates: Partial<MedicalRecord>) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  regenerateInsights: (memberId: string) => Promise<void>;
  getSelectedMember: () => FamilyMember | undefined;
  getMemberRecords: (memberId: string) => MedicalRecord[];
  getMemberInsights: (memberId: string) => Insight[];
  getMemberMedicines: (memberId: string) => { medicine: Medicine; record: MedicalRecord }[];
  exportAllData: () => string;
}

const AppContext = createContext<AppContextType | null>(null);

const EMPTY_PROFILE: UserProfile = {
  id: '', name: '', email: '', phone: '', age: 0, gender: 'other',
  photoUrl: null, onboardingComplete: false, plan: 'free', language: 'en',
  createdAt: new Date().toISOString(),
};

// ─── Provider ─────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  // Local mode opens straight into the preloaded demo family.
  const [state, setState] = useState<AppState>(isLocalMode ? {
    profile: demoProfile,
    familyMembers: demoFamilyMembers,
    records: demoRecords,
    insights: demoInsights,
    selectedMemberId: demoFamilyMembers[0]?.id ?? '',
    isAuthenticated: true,
    isOnboarded: true,
  } : {
    profile: EMPTY_PROFILE,
    familyMembers: [],
    records: [],
    insights: [],
    selectedMemberId: '',
    isAuthenticated: false,
    isOnboarded: false,
  });
  const [isLoading, setIsLoading] = useState(!isLocalMode);
  const uidRef = useRef<string | null>(null);

  // ─── Firebase auth listener (live mode only) ────────────────
  useEffect(() => {
    if (isLocalMode) return;
    const unsub = authSvc.watchAuthState(async (user) => {
      if (!user) {
        uidRef.current = null;
        setState({ profile: EMPTY_PROFILE, familyMembers: [], records: [], insights: [], selectedMemberId: '', isAuthenticated: false, isOnboarded: false });
        setIsLoading(false);
        return;
      }
      uidRef.current = user.uid;
      const profile = await fs.ensureUserProfile(user.uid, { email: user.email ?? '', name: user.displayName ?? '', photoUrl: user.photoURL });
      setState(p => ({ ...p, isAuthenticated: true, isOnboarded: profile.onboardingComplete, profile }));
      setIsLoading(false);
    });
    return unsub;
  }, []);

  // ─── Firestore subscriptions (live mode, signed in) ─────────
  useEffect(() => {
    if (isLocalMode || !state.isAuthenticated) return;
    const uid = uidRef.current;
    if (!uid) return;
    const unsubs: Array<() => void> = [];
    unsubs.push(fs.watchProfile(uid, p => { if (p) setState(prev => ({ ...prev, profile: p, isOnboarded: p.onboardingComplete })); }));
    unsubs.push(fs.watchFamilyMembers(uid, members => {
      setState(prev => ({
        ...prev, familyMembers: members,
        selectedMemberId: prev.selectedMemberId && members.find(m => m.id === prev.selectedMemberId)
          ? prev.selectedMemberId : (members[0]?.id ?? ''),
      }));
    }));
    unsubs.push(fs.watchRecords(uid, records => setState(prev => ({ ...prev, records }))));
    unsubs.push(fs.watchInsights(uid, insights => setState(prev => ({ ...prev, insights }))));
    return () => unsubs.forEach(u => u());
  }, [state.isAuthenticated]);

  // ─── Actions ───────────────────────────────────────────────

  const setSelectedMemberId = useCallback((id: string) => {
    setState(p => ({ ...p, selectedMemberId: id }));
  }, []);

  // local mode only — Firebase mode auth is handled directly in AuthPage
  const login = useCallback((email: string, name?: string) => {
    if (!isLocalMode) return;
    const uid = generateId();
    const profile: UserProfile = {
      ...EMPTY_PROFILE,
      id: uid, email, name: name || email.split('@')[0],
      createdAt: new Date().toISOString(),
    };
    uidRef.current = uid;
    setState(p => ({ ...p, isAuthenticated: true, isOnboarded: false, profile }));
  }, []);

  const logout = useCallback(() => {
    if (isLocalMode) {
      uidRef.current = null;
      setState({ profile: EMPTY_PROFILE, familyMembers: [], records: [], insights: [], selectedMemberId: '', isAuthenticated: false, isOnboarded: false });
    } else {
      void authSvc.signOutCurrentUser();
    }
  }, []);

  const completeOnboarding = useCallback((profileData: Partial<UserProfile>, members: FamilyMember[]) => {
    if (isLocalMode) {
      setState(prev => ({
        ...prev,
        profile: { ...prev.profile, ...profileData, onboardingComplete: true },
        familyMembers: members,
        selectedMemberId: members[0]?.id ?? '',
        isOnboarded: true,
      }));
      return;
    }
    const uid = uidRef.current;
    if (!uid) return;
    void (async () => {
      await fs.updateProfile(uid, { ...profileData, onboardingComplete: true });
      for (const m of members) await fs.upsertFamilyMember(uid, m);
    })();
  }, []);

  const addRecord = useCallback((record: MedicalRecord) => {
    if (isLocalMode) { setState(p => ({ ...p, records: [record, ...p.records] })); return; }
    const uid = uidRef.current;
    if (uid) void fs.createRecord(uid, record);
  }, []);

  const addInsights = useCallback((newInsights: Insight[]) => {
    if (isLocalMode) {
      setState(p => ({
        ...p,
        insights: [...newInsights, ...p.insights.filter(i => !newInsights.find(n => n.id === i.id))],
      }));
    }
    // live mode: server writes insights directly to Firestore
  }, []);

  const markInsightRead = useCallback((id: string) => {
    if (isLocalMode) { setState(p => ({ ...p, insights: p.insights.map(i => i.id === id ? { ...i, isRead: true } : i) })); return; }
    const uid = uidRef.current;
    if (uid) void fs.markInsightRead(uid, id);
  }, []);

  const addFamilyMember = useCallback((member: FamilyMember) => {
    if (isLocalMode) { setState(p => ({ ...p, familyMembers: [...p.familyMembers, member] })); return; }
    const uid = uidRef.current;
    if (uid) void fs.upsertFamilyMember(uid, member);
  }, []);

  const removeFamilyMember = useCallback((id: string) => {
    if (isLocalMode) {
      setState(p => ({ ...p, familyMembers: p.familyMembers.filter(m => m.id !== id), records: p.records.filter(r => r.memberId !== id), insights: p.insights.filter(i => i.memberId !== id) }));
      return;
    }
    const uid = uidRef.current;
    if (uid) void fs.deleteFamilyMember(uid, id);
  }, []);

  const updateFamilyMember = useCallback((id: string, updates: Partial<FamilyMember>) => {
    if (isLocalMode) { setState(p => ({ ...p, familyMembers: p.familyMembers.map(m => m.id === id ? { ...m, ...updates } : m) })); return; }
    const uid = uidRef.current;
    if (!uid) return;
    const existing = state.familyMembers.find(m => m.id === id);
    if (existing) void fs.upsertFamilyMember(uid, { ...existing, ...updates });
  }, [state.familyMembers]);

  const deleteRecord = useCallback((id: string) => {
    if (isLocalMode) { setState(p => ({ ...p, records: p.records.filter(r => r.id !== id) })); return; }
    const uid = uidRef.current;
    if (uid) void fs.softDeleteRecord(uid, id);
  }, []);

  const updateRecord = useCallback((id: string, updates: Partial<MedicalRecord>) => {
    if (isLocalMode) { setState(p => ({ ...p, records: p.records.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r) })); return; }
    const uid = uidRef.current;
    if (uid) void fs.updateRecord(uid, id, updates);
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    if (isLocalMode) { setState(p => ({ ...p, profile: { ...p.profile, ...updates } })); return; }
    const uid = uidRef.current;
    if (uid) void fs.updateProfile(uid, updates);
  }, []);

  const regenerateInsights = useCallback(async (memberId: string) => {
    if (isLocalMode) {
      // local mode: import and run local engine inline
      const { generateInsightsForMember } = await import('../services/ai');
      const member = state.familyMembers.find(m => m.id === memberId);
      if (!member) return;
      const memberRecords = state.records.filter(r => r.memberId === memberId);
      const newInsights = await generateInsightsForMember(member, memberRecords);
      setState(prev => ({ ...prev, insights: [...newInsights, ...prev.insights.filter(i => i.memberId !== memberId)] }));
      return;
    }
    try { await callRegenerateInsights(memberId); } catch (err) { console.warn('regenerateInsights failed:', err); }
  }, [state.familyMembers, state.records]);

  const getSelectedMember = useCallback(() => state.familyMembers.find(m => m.id === state.selectedMemberId), [state.familyMembers, state.selectedMemberId]);
  const getMemberRecords = useCallback((memberId: string) => state.records.filter(r => r.memberId === memberId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [state.records]);
  const getMemberInsights = useCallback((memberId: string) => state.insights.filter(i => i.memberId === memberId).sort((a, b) => a.priority - b.priority), [state.insights]);
  const getMemberMedicines = useCallback((memberId: string) => {
    const meds: { medicine: Medicine; record: MedicalRecord }[] = [];
    state.records.filter(r => r.memberId === memberId).forEach(r => r.medicines.forEach(m => meds.push({ medicine: m, record: r })));
    return meds;
  }, [state.records]);

  const exportAllData = useCallback(() => JSON.stringify({ exportDate: new Date().toISOString(), appVersion: '1.0.0', profile: state.profile, familyMembers: state.familyMembers, records: state.records, insights: state.insights }, null, 2), [state]);

  return React.createElement(AppContext.Provider, {
    value: {
      ...state, isLoading,
      setSelectedMemberId, login, logout, completeOnboarding,
      addRecord, addInsights, markInsightRead, addFamilyMember,
      removeFamilyMember, updateFamilyMember, deleteRecord,
      updateRecord, updateProfile, regenerateInsights,
      getSelectedMember, getMemberRecords, getMemberInsights,
      getMemberMedicines, exportAllData,
    },
  }, children);
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
