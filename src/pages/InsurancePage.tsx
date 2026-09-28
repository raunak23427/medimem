import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useHealthData } from '../context/HealthDataContext';
import {
  Shield, Plus, Trash2, AlertCircle, CheckCircle2, FileText,
  Calendar, Edit3,
} from 'lucide-react';
import type { InsurancePolicy, InsuranceClaim } from '../types';
import { generateId } from '../utils/helpers';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-teal-500 focus:outline-none';
const selectCls = inputCls + ' bg-white';

function daysUntil(dateISO: string): number {
  return Math.ceil((new Date(dateISO).getTime() - Date.now()) / 86400000);
}
function inr(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function InsurancePage() {
  const { familyMembers } = useApp();
  const { insurancePolicies, insuranceClaims, saveInsurancePolicy, removeInsurancePolicy, saveInsuranceClaim } = useHealthData();
  const [tab, setTab] = useState<'policies' | 'claims'>('policies');
  const [editing, setEditing] = useState<InsurancePolicy | null>(null);
  const [creating, setCreating] = useState(false);
  const [claimingPolicy, setClaimingPolicy] = useState<InsurancePolicy | null>(null);

  const policiesSorted = useMemo(() =>
    [...insurancePolicies].sort((a, b) => a.endDate.localeCompare(b.endDate)),
  [insurancePolicies]);

  const renewalSoon = policiesSorted.filter((p) => {
    const d = daysUntil(p.endDate);
    return d > 0 && d < 30;
  });
  const expired = policiesSorted.filter((p) => daysUntil(p.endDate) <= 0);

  return (
    <div className="pb-4">
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Insurance</h1>
          <p className="text-xs text-gray-500">Policies, renewal reminders, claims</p>
        </div>
        <button onClick={() => setCreating(true)} className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3 py-2 rounded-xl flex items-center gap-1.5">
          <Plus size={14} /> Add Policy
        </button>
      </div>

      {/* Renewal alerts */}
      {(renewalSoon.length > 0 || expired.length > 0) && (
        <div className="px-4 space-y-2 mb-3">
          {renewalSoon.map((p) => (
            <div key={p.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-800">{p.insurer} renews in {daysUntil(p.endDate)} days</p>
                <p className="text-[10px] text-amber-700">Policy {p.policyNumber} expires on {p.endDate}.</p>
              </div>
            </div>
          ))}
          {expired.map((p) => (
            <div key={p.id} className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-800">{p.insurer} has EXPIRED</p>
                <p className="text-[10px] text-red-700">Policy {p.policyNumber} expired {Math.abs(daysUntil(p.endDate))} days ago.</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 mb-3">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab('policies')} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === 'policies' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Policies ({policiesSorted.length})
          </button>
          <button onClick={() => setTab('claims')} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === 'claims' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            Claims ({insuranceClaims.length})
          </button>
        </div>
      </div>

      <div className="px-4">
        {tab === 'policies' && (
          <>
            {policiesSorted.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <Shield size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No policies added yet.</p>
                <button onClick={() => setCreating(true)} className="text-sm text-amber-600 font-medium mt-2 hover:underline">+ Add your first policy</button>
              </div>
            ) : (
              <div className="space-y-3">
                {policiesSorted.map((p) => (
                  <PolicyCard key={p.id} policy={p} memberCount={familyMembers.length}
                    onEdit={() => setEditing(p)} onDelete={() => removeInsurancePolicy(p.id)}
                    onClaim={() => setClaimingPolicy(p)} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'claims' && (
          <>
            {insuranceClaims.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <FileText size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No claims filed yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {insuranceClaims.map((c) => {
                  const policy = insurancePolicies.find((p) => p.id === c.policyId);
                  const member = familyMembers.find((m) => m.id === c.memberId);
                  return (
                    <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{policy?.insurer ?? 'Policy'} • {inr(c.claimAmount)}</p>
                          <p className="text-xs text-gray-400">{member?.name} • {c.hospital}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          c.status === 'settled' ? 'bg-green-100 text-green-700' :
                          c.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          c.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{c.status.replace('_', ' ').toUpperCase()}</span>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Admitted {c.admissionDate}{c.dischargeDate ? ` • Discharged ${c.dischargeDate}` : ''}
                        {c.approvedAmount !== null ? ` • Approved ${inr(c.approvedAmount)}` : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {(creating || editing) && (
        <PolicyEditor
          existing={editing}
          familyMembers={familyMembers}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={(p) => { saveInsurancePolicy(p); setCreating(false); setEditing(null); }}
        />
      )}

      {claimingPolicy && (
        <ClaimEditor
          policy={claimingPolicy}
          familyMembers={familyMembers}
          onClose={() => setClaimingPolicy(null)}
          onSave={(c) => { saveInsuranceClaim(c); setClaimingPolicy(null); }}
        />
      )}
    </div>
  );
}

function PolicyCard({ policy, onEdit, onDelete, onClaim }: { policy: InsurancePolicy; memberCount: number; onEdit: () => void; onDelete: () => void; onClaim: () => void }) {
  const days = daysUntil(policy.endDate);
  const expired = days <= 0;
  return (
    <div className={`bg-gradient-to-br ${expired ? 'from-gray-100 to-gray-50 border-gray-200' : 'from-amber-50 to-orange-50 border-amber-200'} rounded-2xl p-4 border shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{policy.policyType.replace('_', ' ')}</p>
          <h3 className="text-base font-bold text-gray-900">{policy.insurer}</h3>
          <p className="text-xs text-gray-500 font-mono">{policy.policyNumber}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1.5 hover:bg-white/50 rounded-md"><Edit3 size={13} className="text-gray-500" /></button>
          <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded-md text-gray-300 hover:text-red-400"><Trash2 size={13} /></button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-gray-500 uppercase">Sum insured</p>
          <p className="text-sm font-bold text-gray-900">{inr(policy.sumInsured)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase">Annual premium</p>
          <p className="text-sm font-bold text-gray-900">{inr(policy.premiumAmount)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
        <span className="flex items-center gap-1"><Calendar size={11} /> Valid till {policy.endDate}</span>
        <span className={expired ? 'text-red-600 font-semibold' : days < 30 ? 'text-amber-600 font-semibold' : 'text-green-700'}>
          {expired ? `Expired ${Math.abs(days)}d ago` : `${days} days left`}
        </span>
      </div>
      {policy.isCashless && (
        <p className="text-[10px] text-green-700 flex items-center gap-1 mb-2"><CheckCircle2 size={11} /> Cashless at {policy.cashlessHospitals.length || 0} hospitals</p>
      )}
      <p className="text-[10px] text-gray-500 mb-2">Claims used this year: {policy.claimsFiledThisYear}</p>
      <button onClick={onClaim} className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5">
        <FileText size={12} /> File a Claim
      </button>
    </div>
  );
}

function PolicyEditor({ existing, familyMembers, onClose, onSave }: { existing: InsurancePolicy | null; familyMembers: { id: string; name: string }[]; onClose: () => void; onSave: (p: InsurancePolicy) => void }) {
  const [p, setP] = useState<InsurancePolicy>(existing ?? {
    id: generateId(), memberIds: familyMembers.map((m) => m.id),
    insurer: '', policyNumber: '', policyType: 'individual',
    sumInsured: 500000, premiumAmount: 12000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    isCashless: true, cashlessHospitals: [], documentUrl: null,
    claimsFiledThisYear: 0,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl max-h-[92dvh] overflow-y-auto p-5">
        <h2 className="font-bold text-lg text-gray-900 mb-1">{existing ? 'Edit Policy' : 'Add Insurance Policy'}</h2>
        <p className="text-xs text-gray-400 mb-4">Store the policy so renewal reminders + claims work automatically.</p>

        <div className="space-y-3">
          <Field label="Insurer (e.g. HDFC ERGO, Star Health)"><input value={p.insurer} onChange={(e) => setP({ ...p, insurer: e.target.value })} className={inputCls} /></Field>
          <Field label="Policy number"><input value={p.policyNumber} onChange={(e) => setP({ ...p, policyNumber: e.target.value })} className={inputCls} /></Field>
          <Field label="Type">
            <select value={p.policyType} onChange={(e) => setP({ ...p, policyType: e.target.value as InsurancePolicy['policyType'] })} className={selectCls}>
              <option value="individual">Individual Health</option>
              <option value="family_floater">Family Floater</option>
              <option value="group">Group (Corporate)</option>
              <option value="critical_illness">Critical Illness</option>
              <option value="accident">Personal Accident</option>
              <option value="top_up">Top-up / Super top-up</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sum insured (₹)"><input type="number" value={p.sumInsured} onChange={(e) => setP({ ...p, sumInsured: Number(e.target.value) })} className={inputCls} /></Field>
            <Field label="Annual premium (₹)"><input type="number" value={p.premiumAmount} onChange={(e) => setP({ ...p, premiumAmount: Number(e.target.value) })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date"><input type="date" value={p.startDate} onChange={(e) => setP({ ...p, startDate: e.target.value })} className={inputCls} /></Field>
            <Field label="End date"><input type="date" value={p.endDate} onChange={(e) => setP({ ...p, endDate: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Cashless?">
            <select value={p.isCashless ? 'yes' : 'no'} onChange={(e) => setP({ ...p, isCashless: e.target.value === 'yes' })} className={selectCls}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Field>
          <Field label="Cashless hospitals (comma separated)"><input value={p.cashlessHospitals.join(', ')} onChange={(e) => setP({ ...p, cashlessHospitals: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} placeholder="e.g. Apollo, Fortis, AIIMS" className={inputCls} /></Field>
          <Field label="Covered members">
            <div className="flex flex-wrap gap-1.5">
              {familyMembers.map((m) => {
                const on = p.memberIds.includes(m.id);
                return (
                  <button key={m.id} onClick={() => setP({ ...p, memberIds: on ? p.memberIds.filter((x) => x !== m.id) : [...p.memberIds, m.id] })}
                    className={`text-xs px-2.5 py-1 rounded-full ${on ? 'bg-amber-500 text-white' : 'bg-gray-50 text-gray-600'}`}>
                    {m.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl">Cancel</button>
          <button onClick={() => onSave(p)} disabled={!p.insurer || !p.policyNumber} className="flex-[2] bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50">Save Policy</button>
        </div>
      </div>
    </div>
  );
}

function ClaimEditor({ policy, familyMembers, onClose, onSave }: { policy: InsurancePolicy; familyMembers: { id: string; name: string }[]; onClose: () => void; onSave: (c: InsuranceClaim) => void }) {
  const [c, setC] = useState<InsuranceClaim>({
    id: generateId(), policyId: policy.id, memberId: policy.memberIds[0] ?? familyMembers[0]?.id ?? '',
    claimAmount: 0, approvedAmount: null, status: 'submitted',
    hospital: '', admissionDate: new Date().toISOString().split('T')[0],
    dischargeDate: null, documents: [], notes: '',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl max-h-[92dvh] overflow-y-auto p-5">
        <h2 className="font-bold text-lg text-gray-900 mb-1">File a Claim</h2>
        <p className="text-xs text-gray-400 mb-4">{policy.insurer} • {policy.policyNumber}</p>

        <div className="space-y-3">
          <Field label="Patient">
            <select value={c.memberId} onChange={(e) => setC({ ...c, memberId: e.target.value })} className={selectCls}>
              {familyMembers.filter((m) => policy.memberIds.includes(m.id)).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Hospital"><input value={c.hospital} onChange={(e) => setC({ ...c, hospital: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Admission date"><input type="date" value={c.admissionDate} onChange={(e) => setC({ ...c, admissionDate: e.target.value })} className={inputCls} /></Field>
            <Field label="Discharge date"><input type="date" value={c.dischargeDate ?? ''} onChange={(e) => setC({ ...c, dischargeDate: e.target.value || null })} className={inputCls} /></Field>
          </div>
          <Field label="Claim amount (₹)"><input type="number" value={c.claimAmount} onChange={(e) => setC({ ...c, claimAmount: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Status">
            <select value={c.status} onChange={(e) => setC({ ...c, status: e.target.value as InsuranceClaim['status'] })} className={selectCls}>
              <option value="submitted">Submitted</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="settled">Settled</option>
            </select>
          </Field>
          {(c.status === 'approved' || c.status === 'settled') && (
            <Field label="Approved amount (₹)"><input type="number" value={c.approvedAmount ?? ''} onChange={(e) => setC({ ...c, approvedAmount: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} /></Field>
          )}
          <Field label="Notes"><textarea value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} rows={2} className={inputCls} /></Field>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl">Cancel</button>
          <button onClick={() => onSave(c)} disabled={!c.hospital || c.claimAmount <= 0} className="flex-[2] bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50">Save Claim</button>
        </div>
      </div>
    </div>
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
