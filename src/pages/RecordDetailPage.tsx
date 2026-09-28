import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Share2, Trash2, Edit3, Save, X } from 'lucide-react';
import { getDocTypeIcon, getDocTypeLabel, formatDate, getStatusColor, getDaysRemaining, getRunoutColor } from '../utils/helpers';
import { useState } from 'react';
import type { LabResult, Medicine } from '../types';
import RecordSummary, { summarizeRecordText } from '../components/shared/RecordSummary';

export default function RecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { records, familyMembers, deleteRecord, updateRecord } = useApp();
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  const record = records.find(r => r.id === id);
  if (!record) {
    return (
      <div className="p-4 text-center py-20">
        <p className="text-gray-500">Record not found.</p>
        <button onClick={() => navigate('/records')} className="text-teal-600 font-medium mt-2">Go back</button>
      </div>
    );
  }

  const member = familyMembers.find(m => m.id === record.memberId);

  // Edit state
  const [editDate, setEditDate] = useState(record.date);
  const [editDoctor, setEditDoctor] = useState(record.doctorName || '');
  const [editHospital, setEditHospital] = useState(record.hospitalName || '');
  const [editDiagnosis, setEditDiagnosis] = useState(record.diagnosis.join(', '));
  const [editFindings, setEditFindings] = useState(record.keyFindings);
  const [editLabs, setEditLabs] = useState<LabResult[]>([...record.labResults]);
  const [editMeds, setEditMeds] = useState<Medicine[]>([...record.medicines]);

  const handleDelete = () => {
    deleteRecord(record.id);
    navigate('/records');
  };

  const handleSave = () => {
    updateRecord(record.id, {
      date: editDate,
      doctorName: editDoctor || null,
      hospitalName: editHospital || null,
      diagnosis: editDiagnosis.split(',').map(d => d.trim()).filter(Boolean),
      keyFindings: editFindings,
      labResults: editLabs,
      medicines: editMeds,
    });
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditDate(record.date);
    setEditDoctor(record.doctorName || '');
    setEditHospital(record.hospitalName || '');
    setEditDiagnosis(record.diagnosis.join(', '));
    setEditFindings(record.keyFindings);
    setEditLabs([...record.labResults]);
    setEditMeds([...record.medicines]);
    setEditing(false);
  };

  const handleShare = () => {
    const text = summarizeRecordText(record, member?.name);
    if (navigator.share) {
      navigator.share({ title: 'Medical Record', text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  };

  const updateLab = (index: number, field: keyof LabResult, value: string) => {
    setEditLabs(prev => prev.map((lab, i) => i === index ? { ...lab, [field]: value } : lab));
  };
  const updateMed = (index: number, field: keyof Medicine, value: string | null) => {
    setEditMeds(prev => prev.map((med, i) => i === index ? { ...med, [field]: value } : med));
  };

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-2 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="text-lg">{getDocTypeIcon(record.documentType)}</span>
            {getDocTypeLabel(record.documentType)}
          </h1>
        </div>
        {editing ? (
          <>
            <button onClick={handleCancelEdit} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={18} className="text-gray-500" />
            </button>
            <button onClick={handleSave} className="p-2 hover:bg-teal-50 rounded-xl transition-colors">
              <Save size={18} className="text-teal-600" />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <Edit3 size={18} className="text-gray-500" />
            </button>
            <button onClick={handleShare} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <Share2 size={18} className="text-gray-500" />
            </button>
            <button onClick={() => setShowDelete(true)} className="p-2 hover:bg-red-50 rounded-xl transition-colors">
              <Trash2 size={18} className="text-red-400" />
            </button>
          </>
        )}
      </div>

      {/* Image preview */}
      {record.uploadedImageUrl && (
        <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-gray-200 max-h-48">
          <img src={record.uploadedImageUrl} alt="Document" className="w-full object-contain bg-gray-50" />
        </div>
      )}

      <div className="px-4 space-y-4">
        {/* Readable summary (view mode only) */}
        {!editing && (
          <RecordSummary record={record} patientName={member?.name} />
        )}

        {/* Document Info + editable fields (shown in edit mode, or as structured
            backup below the summary in view mode) */}
        {editing && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Date</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Doctor</label>
                <input value={editDoctor} onChange={e => setEditDoctor(e.target.value)} placeholder="Doctor name"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Hospital / Lab</label>
                <input value={editHospital} onChange={e => setEditHospital(e.target.value)} placeholder="Hospital name"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Diagnosis (comma separated)</label>
                <input value={editDiagnosis} onChange={e => setEditDiagnosis(e.target.value)} placeholder="Diagnosis"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none" />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Date</p>
                  <p className="text-sm font-medium">{formatDate(record.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Patient</p>
                  <p className="text-sm font-medium">{member?.name || record.patientName}</p>
                </div>
                {record.doctorName && (
                  <div>
                    <p className="text-xs text-gray-400">Doctor</p>
                    <p className="text-sm font-medium">{record.doctorName}</p>
                  </div>
                )}
                {record.hospitalName && (
                  <div>
                    <p className="text-xs text-gray-400">Hospital</p>
                    <p className="text-sm font-medium">{record.hospitalName}</p>
                  </div>
                )}
              </div>
              {record.diagnosis.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Diagnosis</p>
                  <div className="flex flex-wrap gap-1.5">
                    {record.diagnosis.map(d => (
                      <span key={d} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{d}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        )}

        {/* Lab Results (edit mode) */}
        {editing && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Lab Results</h3>
            {editing ? (
              <div className="space-y-2">
                {editLabs.map((lab, i) => (
                  <div key={i} className="grid grid-cols-5 gap-1.5 items-center">
                    <input value={lab.testName} onChange={e => updateLab(i, 'testName', e.target.value)} placeholder="Test"
                      className="col-span-2 text-xs px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none" />
                    <input value={lab.value} onChange={e => updateLab(i, 'value', e.target.value)} placeholder="Value"
                      className="text-xs px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none" />
                    <input value={lab.unit} onChange={e => updateLab(i, 'unit', e.target.value)} placeholder="Unit"
                      className="text-xs px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none" />
                    <select value={lab.status} onChange={e => updateLab(i, 'status', e.target.value)}
                      className="text-xs px-1 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none bg-white">
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="low">Low</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                ))}
                <button onClick={() => setEditLabs(prev => [...prev, { testName: '', value: '', unit: '', referenceRange: null, status: 'unknown' as const }])}
                  className="text-xs text-teal-600 font-medium mt-1 hover:underline">+ Add test</button>
              </div>
            ) : (
              <div className="space-y-2">
                {record.labResults.map((lab, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lab.testName}</p>
                      <p className="text-xs text-gray-400">Ref: {lab.referenceRange || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{lab.value} <span className="text-xs font-normal text-gray-400">{lab.unit}</span></p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(lab.status)}`}>
                        {lab.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Medicines (edit mode) */}
        {editing && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Medicines</h3>
            {editing ? (
              <div className="space-y-2">
                {editMeds.map((med, i) => (
                  <div key={i} className="grid grid-cols-3 gap-1.5">
                    <input value={med.name} onChange={e => updateMed(i, 'name', e.target.value)} placeholder="Name"
                      className="text-xs px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none" />
                    <input value={med.dosage} onChange={e => updateMed(i, 'dosage', e.target.value)} placeholder="Dosage"
                      className="text-xs px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none" />
                    <input value={med.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)} placeholder="Frequency"
                      className="text-xs px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none" />
                  </div>
                ))}
                <button onClick={() => setEditMeds(prev => [...prev, { name: '', dosage: '', frequency: '', duration: null, estimatedRunoutDate: null }])}
                  className="text-xs text-teal-600 font-medium mt-1 hover:underline">+ Add medicine</button>
              </div>
            ) : (
              <div className="space-y-3">
                {record.medicines.map((med, i) => {
                  const days = getDaysRemaining(med.estimatedRunoutDate);
                  return (
                    <div key={i} className="border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{med.name}</p>
                          <p className="text-xs text-gray-500">{med.dosage} • {med.frequency}</p>
                          {med.duration && <p className="text-xs text-gray-400">Duration: {med.duration}</p>}
                        </div>
                        {days !== null && (
                          <div className="text-right">
                            <p className={`text-xs font-semibold ${days < 3 ? 'text-red-600' : days < 7 ? 'text-orange-600' : 'text-green-600'}`}>
                              {days === 0 ? 'Finished' : `${days}d left`}
                            </p>
                          </div>
                        )}
                      </div>
                      {days !== null && (
                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getRunoutColor(days)} battery-bar`} style={{ width: `${Math.min(100, (days / 90) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Key Findings (edit mode) */}
        {editing && (
          <div>
            <label className="text-xs font-semibold text-teal-800 block mb-1">AI Summary</label>
            <textarea
              value={editFindings}
              onChange={e => setEditFindings(e.target.value)}
              rows={3}
              className="w-full text-sm text-teal-700 bg-teal-50 rounded-xl p-4 border border-teal-100 focus:border-teal-500 focus:outline-none resize-none"
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDelete(false)} />
          <div className="relative bg-white rounded-2xl p-6 mx-6 max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2">Delete Record?</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone. The record will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl font-medium text-gray-600">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 rounded-xl font-medium text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
