import { useApp } from '../context/AppContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Plus } from 'lucide-react';
import { getDocTypeIcon, getDocTypeLabel, getInitials } from '../utils/helpers';
import UploadModal from '../components/records/UploadModal';

const FILTER_TYPES = [
  { value: '', label: 'All' },
  { value: 'lab_report', label: 'Lab Reports' },
  { value: 'prescription', label: 'Prescriptions' },
  { value: 'imaging', label: 'Scans' },
  { value: 'discharge_summary', label: 'Discharge' },
  { value: 'vaccination', label: 'Vaccination' },
];

export default function RecordsPage() {
  const { records, familyMembers, selectedMemberId, setSelectedMemberId } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  // Filter records
  let filtered = records;
  if (selectedMemberId && selectedMemberId !== 'all') {
    filtered = filtered.filter(r => r.memberId === selectedMemberId);
  }
  if (typeFilter) {
    filtered = filtered.filter(r => r.documentType === typeFilter);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(r =>
      r.doctorName?.toLowerCase().includes(q) ||
      r.hospitalName?.toLowerCase().includes(q) ||
      r.diagnosis.some(d => d.toLowerCase().includes(q)) ||
      r.medicines.some(m => m.name.toLowerCase().includes(q)) ||
      r.keyFindings.toLowerCase().includes(q)
    );
  }

  // Group by month
  const grouped: Record<string, typeof filtered> = {};
  filtered
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach(r => {
      const d = new Date(r.date);
      const key = `${d.toLocaleString('en-IN', { month: 'long' })} ${d.getFullYear()}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

  return (
    <div className="pb-4">
      {/* Search */}
      <div className="px-4 pt-2 pb-3 sticky top-[57px] bg-white z-30">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search records, doctors, medicines..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 focus:bg-white focus:ring-2 focus:ring-teal-200 focus:outline-none text-sm transition-all"
          />
        </div>
      </div>

      {/* Type Filter */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {FILTER_TYPES.map(f => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                typeFilter === f.value ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Member Filter */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {familyMembers.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMemberId(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                selectedMemberId === m.id ? 'bg-teal-100 text-teal-700 ring-1 ring-teal-300' : 'bg-gray-50 text-gray-500'
              }`}
            >
              <span className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${
                selectedMemberId === m.id ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {getInitials(m.name).charAt(0)}
              </span>
              {m.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Records List */}
      <div className="px-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">📁</span>
            </div>
            <p className="font-semibold text-gray-900 mb-1">No records yet</p>
            <p className="text-sm text-gray-500 mb-4">Tap + to scan your first document.</p>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors"
            >
              Scan a Record
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([month, recs]) => (
            <div key={month} className="mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 sticky top-[110px] bg-white py-1 z-20">
                {month}
              </h3>
              <div className="space-y-2">
                {recs.map(record => {
                  const member = familyMembers.find(m => m.id === record.memberId);
                  return (
                    <button
                      key={record.id}
                      onClick={() => navigate(`/records/${record.id}`)}
                      className="w-full flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all text-left"
                    >
                      <span className="text-xl flex-shrink-0">{getDocTypeIcon(record.documentType)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{getDocTypeLabel(record.documentType)}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-500 truncate">{record.hospitalName || record.doctorName}</span>
                          {member && (
                            <span className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded flex-shrink-0">
                              {member.name.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500">
                          {new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowUpload(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg shadow-teal-300/50 flex items-center justify-center hover:bg-teal-700 transition-all hover:scale-105 z-40"
        style={{ right: 'max(16px, calc((100vw - 480px) / 2 + 16px))' }}
      >
        <Plus size={24} />
      </button>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
}
