import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useHealthData } from '../context/HealthDataContext';
import { Activity, Plus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import type { HealthMetric, MetricKind } from '../types';
import { generateId } from '../utils/helpers';

interface MetricMeta {
  key: MetricKind;
  label: string;
  unit: string;
  normalLow?: number;
  normalHigh?: number;
  color: string;
}

const METRICS: MetricMeta[] = [
  { key: 'bp_systolic', label: 'BP Systolic', unit: 'mmHg', normalLow: 90, normalHigh: 130, color: '#0d9488' },
  { key: 'bp_diastolic', label: 'BP Diastolic', unit: 'mmHg', normalLow: 60, normalHigh: 85, color: '#0891b2' },
  { key: 'weight', label: 'Weight', unit: 'kg', color: '#7c3aed' },
  { key: 'bmi', label: 'BMI', unit: 'kg/m²', normalLow: 18.5, normalHigh: 24.9, color: '#db2777' },
  { key: 'blood_sugar_fasting', label: 'Blood Sugar (Fasting)', unit: 'mg/dL', normalLow: 70, normalHigh: 100, color: '#dc2626' },
  { key: 'blood_sugar_postprandial', label: 'Blood Sugar (PP)', unit: 'mg/dL', normalLow: 70, normalHigh: 140, color: '#ea580c' },
  { key: 'hba1c', label: 'HbA1c', unit: '%', normalLow: 4, normalHigh: 5.6, color: '#ca8a04' },
  { key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL', normalLow: 12, normalHigh: 16, color: '#16a34a' },
  { key: 'tsh', label: 'TSH', unit: 'mIU/L', normalLow: 0.4, normalHigh: 4.0, color: '#2563eb' },
  { key: 'cholesterol_total', label: 'Cholesterol (Total)', unit: 'mg/dL', normalHigh: 200, color: '#9333ea' },
  { key: 'cholesterol_ldl', label: 'LDL', unit: 'mg/dL', normalHigh: 100, color: '#c026d3' },
  { key: 'cholesterol_hdl', label: 'HDL', unit: 'mg/dL', normalLow: 40, color: '#059669' },
  { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', normalLow: 60, normalHigh: 100, color: '#e11d48' },
  { key: 'oxygen_saturation', label: 'SpO₂', unit: '%', normalLow: 95, color: '#0284c7' },
  { key: 'temperature', label: 'Temperature', unit: '°F', normalLow: 97, normalHigh: 99, color: '#f59e0b' },
];

function getMetricMeta(kind: MetricKind): MetricMeta {
  return METRICS.find((m) => m.key === kind) ?? { key: kind, label: kind, unit: '', color: '#64748b' };
}

function trend(values: number[]): 'up' | 'down' | 'flat' {
  if (values.length < 2) return 'flat';
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  if (last > prev * 1.02) return 'up';
  if (last < prev * 0.98) return 'down';
  return 'flat';
}

function isAbnormal(meta: MetricMeta, v: number): boolean {
  if (meta.normalLow !== undefined && v < meta.normalLow) return true;
  if (meta.normalHigh !== undefined && v > meta.normalHigh) return true;
  return false;
}

export default function HealthMetricsPage() {
  const { familyMembers, selectedMemberId, setSelectedMemberId, records } = useApp();
  const { healthMetrics, addHealthMetric, deleteHealthMetric, getMemberMetrics } = useHealthData();
  const [adding, setAdding] = useState<MetricKind | null>(null);

  const memberMetrics = useMemo(() => getMemberMetrics(selectedMemberId), [getMemberMetrics, selectedMemberId, healthMetrics]);

  // ─── Auto-extract metrics from lab records ──────────────────
  // When a lab record contains values matching tracked metrics, mirror them
  // into healthMetrics. We avoid duplicates by checking recordId+kind.
  useEffect(() => {
    const memberRecords = records.filter((r) => r.memberId === selectedMemberId && r.documentType === 'lab_report');
    const existingKeys = new Set(memberMetrics.map((m) => `${m.recordId}:${m.kind}`));
    const mappings: Array<{ patterns: RegExp[]; kind: MetricKind; unit: string }> = [
      { patterns: [/hba1c/i, /a1c/i], kind: 'hba1c', unit: '%' },
      { patterns: [/hemoglobin/i, /\bhb\b/i], kind: 'hemoglobin', unit: 'g/dL' },
      { patterns: [/fasting.*glucose/i, /fasting.*sugar/i, /fbs/i], kind: 'blood_sugar_fasting', unit: 'mg/dL' },
      { patterns: [/postprandial/i, /\bpp\b.*sugar/i, /ppbs/i], kind: 'blood_sugar_postprandial', unit: 'mg/dL' },
      { patterns: [/^tsh$/i, /thyroid.*stim/i], kind: 'tsh', unit: 'mIU/L' },
      { patterns: [/total.*cholesterol/i, /^cholesterol$/i], kind: 'cholesterol_total', unit: 'mg/dL' },
      { patterns: [/\bldl\b/i], kind: 'cholesterol_ldl', unit: 'mg/dL' },
      { patterns: [/\bhdl\b/i], kind: 'cholesterol_hdl', unit: 'mg/dL' },
    ];
    const newOnes: HealthMetric[] = [];
    for (const r of memberRecords) {
      for (const lab of r.labResults) {
        const num = parseFloat(lab.value);
        if (Number.isNaN(num)) continue;
        for (const m of mappings) {
          if (m.patterns.some((p) => p.test(lab.testName)) && !existingKeys.has(`${r.id}:${m.kind}`)) {
            newOnes.push({
              id: generateId(), memberId: selectedMemberId,
              kind: m.kind, value: num, unit: lab.unit || m.unit,
              date: r.date, source: 'lab_report', recordId: r.id,
            });
            existingKeys.add(`${r.id}:${m.kind}`);
          }
        }
      }
    }
    if (newOnes.length > 0) newOnes.forEach((m) => addHealthMetric(m));
  }, [records, selectedMemberId, memberMetrics, addHealthMetric]);

  const byKind = useMemo(() => {
    const m: Partial<Record<MetricKind, HealthMetric[]>> = {};
    for (const x of memberMetrics) (m[x.kind] ||= []).push(x);
    return m;
  }, [memberMetrics]);

  const member = familyMembers.find((m) => m.id === selectedMemberId);
  if (!member) return <div className="p-6 text-center text-sm text-gray-500">Add a family member to track health metrics.</div>;

  return (
    <div className="pb-4">
      <div className="px-4 pt-2 pb-3">
        <h1 className="text-xl font-bold text-gray-900">Health Metrics</h1>
        <p className="text-xs text-gray-500">Track vitals and lab values over time</p>
      </div>

      {/* Member selector */}
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

      {/* Quick-add chips */}
      <div className="px-4 pb-3">
        <p className="text-xs font-medium text-gray-500 mb-2">Quick add:</p>
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map((m) => (
            <button key={m.key} onClick={() => setAdding(m.key)}
              className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Plus size={11} /> {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="px-4 space-y-3">
        {Object.entries(byKind).length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Activity size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No metrics tracked yet.</p>
            <p className="text-xs text-gray-400 mt-1">Add a reading above or upload a lab report — values are auto-extracted.</p>
          </div>
        )}
        {(Object.entries(byKind) as [MetricKind, HealthMetric[]][]).map(([kind, items]) => (
          <MetricCard key={kind} kind={kind} items={items} onDelete={(id) => deleteHealthMetric(id)} />
        ))}
      </div>

      {/* Add metric modal */}
      {adding && (
        <AddMetricModal
          kind={adding}
          onClose={() => setAdding(null)}
          onSave={(m) => { addHealthMetric(m); setAdding(null); }}
          memberId={selectedMemberId}
        />
      )}
    </div>
  );
}

function MetricCard({ kind, items, onDelete }: { kind: MetricKind; items: HealthMetric[]; onDelete: (id: string) => void }) {
  const meta = getMetricMeta(kind);
  const sorted = [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const data = sorted.map((m) => ({ date: m.date.slice(5), value: m.value, full: m }));
  const values = sorted.map((m) => m.value);
  const t = trend(values);
  const last = sorted[sorted.length - 1];
  const lastAbnormal = last ? isAbnormal(meta, last.value) : false;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{meta.label}</h3>
          <p className="text-xs text-gray-400">
            {sorted.length} reading{sorted.length !== 1 ? 's' : ''} • last on {last?.date}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <span className={`text-2xl font-bold ${lastAbnormal ? 'text-red-600' : 'text-gray-900'}`}>
              {last?.value}
            </span>
            <span className="text-xs text-gray-400">{meta.unit}</span>
            {t === 'up' && <TrendingUp size={16} className="text-orange-500" />}
            {t === 'down' && <TrendingDown size={16} className="text-blue-500" />}
            {t === 'flat' && <Minus size={16} className="text-gray-400" />}
          </div>
          {lastAbnormal && (
            <p className="text-[10px] text-red-500 font-medium">Outside normal range</p>
          )}
        </div>
      </div>

      {sorted.length >= 2 && (
        <div className="h-32 mt-3 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v) => [`${v} ${meta.unit}`, meta.label]}
              />
              {meta.normalLow !== undefined && (
                <ReferenceLine y={meta.normalLow} stroke="#86efac" strokeDasharray="3 3" />
              )}
              {meta.normalHigh !== undefined && (
                <ReferenceLine y={meta.normalHigh} stroke="#fca5a5" strokeDasharray="3 3" />
              )}
              <Line type="monotone" dataKey="value" stroke={meta.color} strokeWidth={2} dot={{ r: 3, fill: meta.color }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Reading list */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <details>
          <summary className="text-xs text-gray-500 cursor-pointer">All readings ({sorted.length})</summary>
          <div className="mt-2 space-y-1">
            {sorted.slice().reverse().map((m) => (
              <div key={m.id} className="flex items-center justify-between text-xs py-1">
                <span className="text-gray-500">{m.date}</span>
                <span className={isAbnormal(meta, m.value) ? 'text-red-600 font-medium' : 'text-gray-900 font-medium'}>
                  {m.value} {m.unit}
                </span>
                <span className="text-[10px] text-gray-400 italic">{m.source.replace('_', ' ')}</span>
                <button onClick={() => onDelete(m.id)} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-400">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

function AddMetricModal({ kind, memberId, onClose, onSave }: { kind: MetricKind; memberId: string; onClose: () => void; onSave: (m: HealthMetric) => void }) {
  const meta = getMetricMeta(kind);
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return;
    onSave({
      id: generateId(), memberId, kind, value: num, unit: meta.unit,
      date, source: 'manual', notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl p-5">
        <h2 className="font-bold text-lg text-gray-900 mb-1">{meta.label}</h2>
        <p className="text-xs text-gray-400 mb-4">Add a new reading</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Value ({meta.unit})</label>
            <input
              type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)}
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-base focus:border-teal-500 focus:outline-none"
              placeholder="e.g. 120"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-teal-500 focus:outline-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-200">Cancel</button>
          <button onClick={handleSave} disabled={!value} className="flex-[2] bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50">Save Reading</button>
        </div>
      </div>
    </div>
  );
}
