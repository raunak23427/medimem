// Renders a human-readable, per-document-type narrative of an extracted
// record — shown to the user instead of a wall of form fields. The structured
// fields are still saved to the backend; this is purely the friendly view.
//
// The shape it needs is the common subset shared by MedicalRecord and
// AIAnalysisResult, so it works both in the upload review screen and on the
// saved record detail page.

import type { Medicine, LabResult } from '../../types';
import { formatDate, getStatusColor } from '../../utils/helpers';

export interface SummarizableRecord {
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
}

const TYPE_LABEL: Record<string, string> = {
  prescription: 'Prescription',
  lab_report: 'Lab Report',
  discharge_summary: 'Discharge Summary',
  imaging: 'Imaging / Scan',
  vaccination: 'Vaccination Record',
  insurance: 'Insurance Document',
  other: 'Medical Document',
};

function fmt(d: string | null): string {
  return d ? formatDate(d) : '';
}

// ─── Plain-text version (for copy / share / WhatsApp) ─────────

export function summarizeRecordText(r: SummarizableRecord, patientName?: string): string {
  const label = TYPE_LABEL[r.documentType] ?? 'Medical Document';
  const lines: string[] = [];
  const who = patientName || r.patientName;

  // Opening sentence — source + date + patient
  const src: string[] = [];
  if (r.doctorName) src.push(`Dr. ${r.doctorName.replace(/^dr\.?\s*/i, '')}`);
  if (r.hospitalName) src.push(`at ${r.hospitalName}`);
  const srcStr = src.length ? ` from ${src.join(' ')}` : '';
  const dateStr = r.date ? `, dated ${fmt(r.date)}` : '';
  lines.push(`${label}${srcStr}${dateStr}${who ? ` for ${who}` : ''}.`);

  if (r.diagnosis.length) {
    lines.push(`Diagnosis: ${r.diagnosis.join(', ')}.`);
  }

  if (r.medicines.length) {
    lines.push('Medicines:');
    for (const m of r.medicines) {
      const parts = [m.name, m.dosage, m.frequency].filter(Boolean).join(' ');
      const dur = m.duration ? ` for ${m.duration}` : '';
      const ro = m.estimatedRunoutDate ? ` (runs out ~${fmt(m.estimatedRunoutDate)})` : '';
      lines.push(`  • ${parts}${dur}${ro}`);
    }
  }

  if (r.labResults.length) {
    lines.push('Lab results:');
    for (const l of r.labResults) {
      const status = l.status && l.status !== 'unknown' ? ` — ${l.status.toUpperCase()}` : '';
      const ref = l.referenceRange ? ` (ref ${l.referenceRange})` : '';
      lines.push(`  • ${l.testName}: ${l.value}${l.unit ? ' ' + l.unit : ''}${status}${ref}`);
    }
  }

  if (r.keyFindings) lines.push(`Summary: ${r.keyFindings}`);
  if (r.followUpDate) lines.push(`Follow-up: ${fmt(r.followUpDate)}.`);

  return lines.join('\n');
}

// ─── Rendered version (styled) ────────────────────────────────

export default function RecordSummary({ record, patientName }: { record: SummarizableRecord; patientName?: string }) {
  const label = TYPE_LABEL[record.documentType] ?? 'Medical Document';
  const who = patientName || record.patientName;

  const source: string[] = [];
  if (record.doctorName) source.push(`Dr. ${record.doctorName.replace(/^dr\.?\s*/i, '')}`);
  if (record.hospitalName) source.push(record.doctorName ? `at ${record.hospitalName}` : record.hospitalName);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      {/* Opening line */}
      <p className="text-sm text-gray-800 leading-relaxed">
        <span className="font-semibold text-gray-900">{label}</span>
        {source.length > 0 && <> from {source.join(' ')}</>}
        {record.date && <> · <span className="text-gray-500">{fmt(record.date)}</span></>}
        {who && <> · for <span className="font-medium">{who}</span></>}
      </p>

      {/* Diagnosis */}
      {record.diagnosis.length > 0 && (
        <p className="text-sm text-gray-700">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Diagnosis</span><br />
          {record.diagnosis.join(', ')}
        </p>
      )}

      {/* Medicines — the star of a prescription */}
      {record.medicines.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            {record.documentType === 'prescription' ? 'Prescribed medicines' : 'Medicines'}
          </p>
          <ul className="space-y-1">
            {record.medicines.map((m, i) => (
              <li key={i} className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">{m.name}</span>
                {m.dosage ? ` ${m.dosage}` : ''}{m.frequency ? ` · ${m.frequency}` : ''}
                {m.duration ? <span className="text-gray-500"> for {m.duration}</span> : ''}
                {m.estimatedRunoutDate ? <span className="text-gray-400"> (runs out ~{fmt(m.estimatedRunoutDate)})</span> : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lab results — the star of a lab report */}
      {record.labResults.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Lab results</p>
          <ul className="space-y-1">
            {record.labResults.map((l, i) => (
              <li key={i} className="text-sm flex items-center justify-between gap-2">
                <span className="text-gray-700">{l.testName}{l.referenceRange ? <span className="text-gray-400"> (ref {l.referenceRange})</span> : ''}</span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="font-semibold text-gray-900">{l.value}{l.unit ? ` ${l.unit}` : ''}</span>
                  {l.status && l.status !== 'unknown' && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${getStatusColor(l.status)}`}>
                      {l.status.toUpperCase()}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Narrative summary */}
      {record.keyFindings && (
        <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">{record.keyFindings}</p>
      )}

      {/* Follow-up */}
      {record.followUpDate && (
        <p className="text-sm text-blue-700 bg-blue-50 rounded-xl px-3 py-2">
          📅 Follow-up: <strong>{fmt(record.followUpDate)}</strong>
        </p>
      )}
    </div>
  );
}
