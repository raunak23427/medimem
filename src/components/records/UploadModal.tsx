import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Camera, Image, FileText, ChevronDown, Loader2, Check, Edit3, Plus, Trash2 } from 'lucide-react';
import type { MedicalRecord, AIAnalysisResult, LabResult, Medicine } from '../../types';
import { generateId, getDocTypeIcon } from '../../utils/helpers';
import { analyzeDocument } from '../../services/ai';
import { uploadRecordFile } from '../../services/storage';
import { currentUser } from '../../services/auth';
import { isLocalMode } from '../../lib/env';
import { useHealthData } from '../../context/HealthDataContext';
import { mergeRecordIntoHistory } from '../../utils/historyMerge';
import { prepareForAI } from '../../utils/imagePrep';
import RecordSummary from '../shared/RecordSummary';

const RECORD_TYPES = [
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'discharge_summary', label: 'Discharge Summary' },
  { value: 'imaging', label: 'Scan / Imaging' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'other', label: 'Other' },
];

interface UploadModalProps {
  onClose: () => void;
}

export default function UploadModal({ onClose }: UploadModalProps) {
  const { familyMembers, selectedMemberId, setSelectedMemberId, addRecord, regenerateInsights } = useApp();
  const { getMemberHistory, saveMedicalHistory } = useHealthData();
  const [stage, setStage] = useState<'upload' | 'analyzing' | 'review'>('upload');
  const [selectedType, setSelectedType] = useState('');
  const [fileName, setFileName] = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [aiNote, setAiNote] = useState('');
  const [nonMedical, setNonMedical] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Editable fields for review stage
  const [editDate, setEditDate] = useState('');
  const [editDoctor, setEditDoctor] = useState('');
  const [editHospital, setEditHospital] = useState('');
  const [editDiagnosis, setEditDiagnosis] = useState('');
  const [editFindings, setEditFindings] = useState('');
  const [editLabs, setEditLabs] = useState<LabResult[]>([]);
  const [editMeds, setEditMeds] = useState<Medicine[]>([]);

  const processFile = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      setError('File too large. Max 15MB.');
      return;
    }
    setError('');
    setAiNote('');
    setNonMedical(false);
    setFileName(file.name);
    setPendingFile(file);
    setStage('analyzing');

    try {
      // Normalize whatever came in (PDF, HEIC/iPhone photo, big JPEG/PNG) into
      // downscaled JPEG page images the vision model can actually read.
      const prepared = await prepareForAI(file);

      // Preview = first prepared page
      setFilePreview(`data:image/jpeg;base64,${prepared[0].base64}`);

      const pageB64 = prepared.map((p) => p.base64);
      const result = await analyzeDocument(pageB64, 'image/jpeg', selectedType || undefined);

      const hasStructured =
        result.diagnosis.length || result.medicines.length || result.labResults.length ||
        result.doctorName || result.hospitalName;

      // The model often explicitly says an image isn't a medical document.
      const saysNonMedical = /not\s+(a\s+)?medical|non-?medical|does\s+not\s+appear\s+to\s+be\s+a\s+medical|isn'?t\s+a\s+medical|no\s+medical\s+(info|content|document)/i
        .test(result.keyFindings || '');

      if (!hasStructured && saysNonMedical) {
        setNonMedical(true);
        setAiNote('');
      } else {
        setNonMedical(false);
        const gotSomething = hasStructured ||
          (result.keyFindings && !/unavailable|could not/i.test(result.keyFindings));
        if (!gotSomething) {
          setAiNote('The AI could not read much from this document. It may be blurry, low-contrast, or handwritten. Please fill in / correct the details below.');
        } else if (prepared[0].pageCount > 1) {
          setAiNote(`Read ${prepared[0].pageCount} page(s). Please review the extracted details below.`);
        }
      }

      populateEditFields(result);
      setAnalysis(result);
      setStage('review');
    } catch (err) {
      console.error('Analysis error:', err);
      const msg = err instanceof Error ? err.message : 'Could not read this file.';
      setAiNote(`${msg} You can still enter the details manually below.`);
      const fallback: AIAnalysisResult = {
        documentType: selectedType || 'other',
        date: new Date().toISOString().split('T')[0],
        doctorName: null,
        hospitalName: null,
        patientName: familyMembers.find(m => m.id === selectedMemberId)?.name || null,
        diagnosis: [],
        medicines: [],
        labResults: [],
        keyFindings: '',
        followUpDate: null,
        language: 'English',
      };
      populateEditFields(fallback);
      setAnalysis(fallback);
      setStage('review');
    }
  };

  const populateEditFields = (result: AIAnalysisResult) => {
    setEditDate(result.date || new Date().toISOString().split('T')[0]);
    setEditDoctor(result.doctorName || '');
    setEditHospital(result.hospitalName || '');
    setEditDiagnosis(result.diagnosis.join(', '));
    setEditFindings(result.keyFindings || '');
    setEditLabs([...result.labResults]);
    setEditMeds([...result.medicines]);
    if (result.documentType && !selectedType) {
      setSelectedType(result.documentType);
    }
  };

  const handleCameraCapture = () => {
    if (cameraRef.current) {
      cameraRef.current.click();
    }
  };

  const handleFileSelect = (type: 'image' | 'pdf') => {
    if (fileRef.current) {
      fileRef.current.accept = type === 'image' ? 'image/*,.heic,.heif' : '.pdf';
      fileRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Lab editing helpers
  const updateLab = (index: number, field: keyof LabResult, value: string) => {
    setEditLabs(prev => prev.map((lab, i) => i === index ? { ...lab, [field]: value } : lab));
  };
  const addLab = () => {
    setEditLabs(prev => [...prev, { testName: '', value: '', unit: '', referenceRange: null, status: 'unknown' as const }]);
  };
  const removeLab = (index: number) => {
    setEditLabs(prev => prev.filter((_, i) => i !== index));
  };

  // Medicine editing helpers
  const updateMed = (index: number, field: keyof Medicine, value: string | null) => {
    setEditMeds(prev => prev.map((med, i) => i === index ? { ...med, [field]: value } : med));
  };
  const addMed = () => {
    setEditMeds(prev => [...prev, { name: '', dosage: '', frequency: '', duration: null, estimatedRunoutDate: null }]);
  };
  const removeMed = (index: number) => {
    setEditMeds(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const member = familyMembers.find(m => m.id === selectedMemberId);
      const docType = (selectedType || analysis?.documentType || 'other') as MedicalRecord['documentType'];
      const recordId = generateId();

      // In live mode, push the original file to Storage and keep its path.
      let storagePath: string | null = null;
      let uploadedImageUrl = filePreview || '';
      if (!isLocalMode && pendingFile) {
        const uid = currentUser()?.uid;
        if (!uid) throw new Error('Not signed in');
        const up = await uploadRecordFile({ uid, recordId, file: pendingFile });
        storagePath = up.storagePath;
        uploadedImageUrl = up.downloadUrl;
      }

      const record: MedicalRecord = {
        id: recordId,
        memberId: selectedMemberId,
        documentType: docType,
        date: editDate || new Date().toISOString().split('T')[0],
        doctorName: editDoctor || null,
        hospitalName: editHospital || null,
        patientName: member?.name || null,
        diagnosis: editDiagnosis.split(',').map(d => d.trim()).filter(Boolean),
        medicines: editMeds.filter(m => m.name.trim()),
        labResults: editLabs.filter(l => l.testName.trim()),
        keyFindings: editFindings,
        followUpDate: analysis?.followUpDate || null,
        language: analysis?.language || 'English',
        uploadedImageUrl,
        storagePath,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      addRecord(record);

      // Auto-draft Medical History from extracted data.
      // Adds new chronic conditions for new diagnoses + links known drugs
      // (Metformin → Diabetes, Telmisartan → Hypertension, etc.) into the
      // matching condition's medication field. User can still edit anything.
      try {
        const existing = getMemberHistory(selectedMemberId) ?? null;
        const { next, changes } = mergeRecordIntoHistory(existing, selectedMemberId, record);
        if (changes.length > 0) {
          saveMedicalHistory(next);
        }
      } catch (err) {
        console.warn('History merge failed:', err);
      }

      // Auto-generate insights for this member after saving
      try {
        await regenerateInsights(selectedMemberId);
      } catch (err) {
        console.warn('Insight generation failed:', err);
      }

      onClose();
    } catch (err) {
      console.error('Save record failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to save record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-t-3xl max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="font-bold text-lg text-gray-900">
            {stage === 'upload' ? 'Scan a Record' : stage === 'analyzing' ? 'Analyzing...' : 'Review & Edit Results'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="px-5 pb-6">
          {/* Upload Stage */}
          {stage === 'upload' && (
            <>
              {/* Member selector */}
              <div className="mt-4 mb-5">
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Which family member is this for?</label>
                <div className="relative">
                  <select
                    value={selectedMemberId}
                    onChange={e => setSelectedMemberId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 focus:outline-none text-sm bg-white appearance-none cursor-pointer"
                  >
                    {familyMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.relationship})</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Record type */}
              <div className="mb-5">
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">What type of record? (optional)</label>
                <div className="relative">
                  <select
                    value={selectedType}
                    onChange={e => setSelectedType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 focus:outline-none text-sm bg-white appearance-none cursor-pointer"
                  >
                    <option value="">AI will detect automatically</option>
                    {RECORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 text-red-700 px-4 py-2.5 rounded-xl text-sm">{error}</div>
              )}

              {/* Upload options */}
              <div className="space-y-3">
                <button onClick={handleCameraCapture} className="w-full flex items-center gap-4 bg-teal-50 hover:bg-teal-100 rounded-xl p-4 transition-colors">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                    <Camera size={22} className="text-teal-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Take Photo</p>
                    <p className="text-xs text-gray-500">Use camera to capture document</p>
                  </div>
                </button>

                <button onClick={() => handleFileSelect('image')} className="w-full flex items-center gap-4 bg-blue-50 hover:bg-blue-100 rounded-xl p-4 transition-colors">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Image size={22} className="text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Upload Image</p>
                    <p className="text-xs text-gray-500">JPG, PNG, HEIC — max 10MB</p>
                  </div>
                </button>

                <button onClick={() => handleFileSelect('pdf')} className="w-full flex items-center gap-4 bg-purple-50 hover:bg-purple-100 rounded-xl p-4 transition-colors">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <FileText size={22} className="text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Upload PDF</p>
                    <p className="text-xs text-gray-500">PDF documents — max 10MB</p>
                  </div>
                </button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.heic,.heif,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </>
          )}

          {/* Analyzing Stage */}
          {stage === 'analyzing' && (
            <div className="py-16 text-center">
              {filePreview && (
                <div className="mx-auto mb-6 w-32 h-32 rounded-xl overflow-hidden border border-gray-200">
                  <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="w-16 h-16 mx-auto mb-4 bg-teal-50 rounded-full flex items-center justify-center">
                <Loader2 size={28} className="text-teal-600 animate-spin" />
              </div>
              <p className="font-semibold text-gray-900 mb-1">Reading your document...</p>
              <p className="text-sm text-gray-500">AI is extracting information from {fileName || 'your file'}</p>
              <div className="mt-6 w-48 mx-auto h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* Review Stage — FULLY EDITABLE */}
          {stage === 'review' && analysis && (
            <>
              <div className="mt-4 space-y-4">
                {/* Non-medical document warning */}
                {nonMedical && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-3 flex items-start gap-2">
                    <span className="text-base leading-none">⚠️</span>
                    <div className="text-xs text-red-800">
                      <p className="font-semibold mb-0.5">This doesn't look like a medical document.</p>
                      <p className="text-red-700">The AI couldn't find prescriptions, lab values, or a diagnosis in this image. Please re-upload the correct document — or, if you meant to attach this, you can still save it as an "Other" record.</p>
                    </div>
                  </div>
                )}
                {/* AI note / warning */}
                {aiNote && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
                    {aiNote}
                  </div>
                )}
                {/* File preview */}
                {filePreview && (
                  <div className="rounded-xl overflow-hidden border border-gray-200 max-h-40">
                    <img src={filePreview} alt="Uploaded document" className="w-full h-full object-contain bg-gray-50" />
                  </div>
                )}

                {/* Document type */}
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getDocTypeIcon(selectedType || analysis.documentType)}</span>
                  <select
                    value={selectedType || analysis.documentType}
                    onChange={e => setSelectedType(e.target.value)}
                    className="text-sm font-semibold text-gray-900 bg-transparent border-b border-dashed border-gray-300 focus:border-teal-500 focus:outline-none py-1"
                  >
                    {RECORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${nonMedical ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-700'}`}>
                    {nonMedical ? 'Not recognized' : 'AI Detected'}
                  </span>
                </div>

                {/* Human-readable summary (built live from edited fields) */}
                <RecordSummary record={{
                  documentType: selectedType || analysis.documentType,
                  date: editDate || null,
                  doctorName: editDoctor || null,
                  hospitalName: editHospital || null,
                  patientName: familyMembers.find(m => m.id === selectedMemberId)?.name || analysis.patientName,
                  diagnosis: editDiagnosis.split(',').map(d => d.trim()).filter(Boolean),
                  medicines: editMeds.filter(m => m.name.trim()),
                  labResults: editLabs.filter(l => l.testName.trim()),
                  keyFindings: editFindings,
                  followUpDate: analysis.followUpDate,
                }} />

                {/* Editable details — collapsed by default, still saved to backend */}
                <details className="group">
                  <summary className="cursor-pointer list-none text-xs font-semibold text-teal-600 flex items-center gap-1.5 py-2 select-none">
                    <Edit3 size={13} /> Edit extracted details
                    <ChevronDown size={13} className="transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 space-y-4">

                {/* Editable info card */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-0.5">Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      className="w-full text-sm font-medium bg-white px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-0.5">Doctor Name</label>
                    <input
                      value={editDoctor}
                      onChange={e => setEditDoctor(e.target.value)}
                      placeholder="e.g. Dr. Amit Patel"
                      className="w-full text-sm font-medium bg-white px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-0.5">Hospital / Lab</label>
                    <input
                      value={editHospital}
                      onChange={e => setEditHospital(e.target.value)}
                      placeholder="e.g. Apollo Diagnostics"
                      className="w-full text-sm font-medium bg-white px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-0.5">Diagnosis (comma separated)</label>
                    <input
                      value={editDiagnosis}
                      onChange={e => setEditDiagnosis(e.target.value)}
                      placeholder="e.g. Type 2 Diabetes, Hypertension"
                      className="w-full text-sm font-medium bg-white px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Editable Lab Results */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900">Lab Results</h4>
                    <button onClick={addLab} className="text-xs text-teal-600 font-medium flex items-center gap-1 hover:underline">
                      <Plus size={12} /> Add Test
                    </button>
                  </div>
                  {editLabs.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No lab results. Click "Add Test" to add.</p>
                  )}
                  <div className="space-y-2">
                    {editLabs.map((lab, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-gray-100 relative">
                        <button onClick={() => removeLab(i)} className="absolute top-2 right-2 p-1 hover:bg-red-50 rounded-md">
                          <Trash2 size={12} className="text-gray-300 hover:text-red-400" />
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={lab.testName}
                            onChange={e => updateLab(i, 'testName', e.target.value)}
                            placeholder="Test name"
                            className="col-span-2 text-sm font-medium px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none"
                          />
                          <input
                            value={lab.value}
                            onChange={e => updateLab(i, 'value', e.target.value)}
                            placeholder="Value"
                            className="text-sm px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none"
                          />
                          <input
                            value={lab.unit}
                            onChange={e => updateLab(i, 'unit', e.target.value)}
                            placeholder="Unit (e.g. mg/dL)"
                            className="text-sm px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none"
                          />
                          <input
                            value={lab.referenceRange || ''}
                            onChange={e => updateLab(i, 'referenceRange', e.target.value)}
                            placeholder="Ref range"
                            className="text-sm px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none"
                          />
                          <select
                            value={lab.status}
                            onChange={e => updateLab(i, 'status', e.target.value)}
                            className="text-sm px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none bg-white"
                          >
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="low">Low</option>
                            <option value="critical">Critical</option>
                            <option value="unknown">Unknown</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Editable Medicines */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900">Medicines</h4>
                    <button onClick={addMed} className="text-xs text-teal-600 font-medium flex items-center gap-1 hover:underline">
                      <Plus size={12} /> Add Medicine
                    </button>
                  </div>
                  {editMeds.length === 0 && (
                    <p className="text-xs text-gray-400 italic">No medicines. Click "Add Medicine" to add.</p>
                  )}
                  <div className="space-y-2">
                    {editMeds.map((med, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-gray-100 relative">
                        <button onClick={() => removeMed(i)} className="absolute top-2 right-2 p-1 hover:bg-red-50 rounded-md">
                          <Trash2 size={12} className="text-gray-300 hover:text-red-400" />
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={med.name}
                            onChange={e => updateMed(i, 'name', e.target.value)}
                            placeholder="Medicine name"
                            className="col-span-2 text-sm font-medium px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none"
                          />
                          <input
                            value={med.dosage}
                            onChange={e => updateMed(i, 'dosage', e.target.value)}
                            placeholder="Dosage (e.g. 500mg)"
                            className="text-sm px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none"
                          />
                          <input
                            value={med.frequency}
                            onChange={e => updateMed(i, 'frequency', e.target.value)}
                            placeholder="Frequency"
                            className="text-sm px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none"
                          />
                          <input
                            value={med.duration || ''}
                            onChange={e => updateMed(i, 'duration', e.target.value || null)}
                            placeholder="Duration (e.g. 30 days)"
                            className="text-sm px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none"
                          />
                          <input
                            type="date"
                            value={med.estimatedRunoutDate || ''}
                            onChange={e => updateMed(i, 'estimatedRunoutDate', e.target.value || null)}
                            className="text-sm px-2 py-1.5 rounded border border-gray-200 focus:border-teal-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Editable Key Findings */}
                <div>
                  <label className="text-xs font-semibold text-teal-800 block mb-1">AI Summary / Key Findings</label>
                  <textarea
                    value={editFindings}
                    onChange={e => setEditFindings(e.target.value)}
                    rows={3}
                    className="w-full text-sm text-teal-700 bg-teal-50 rounded-xl p-4 border border-teal-100 focus:border-teal-500 focus:outline-none resize-none"
                  />
                </div>
                  </div>
                </details>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setStage('upload'); setFilePreview(null); setFileName(''); }}
                  className="flex-1 bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Edit3 size={16} /> Re-upload
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-[2] bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-teal-200 disabled:opacity-60"
                >
                  {saving ? (<><Loader2 size={18} className="animate-spin" /> Saving...</>) : (<><Check size={18} /> Save Record</>)}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
