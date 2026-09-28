import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { getInitials, timeAgo, getInsightStyles, getDocTypeIcon, getDocTypeLabel } from '../utils/helpers';
import {
  Camera, ClipboardList, Pill, AlertTriangle, ChevronRight, Plus, Sparkles,
  Activity, Baby, FileSearch, Stethoscope, Shield, Eye, HeartHandshake,
} from 'lucide-react';
import { useState } from 'react';
import UploadModal from '../components/records/UploadModal';

export default function DashboardPage() {
  const { familyMembers, selectedMemberId, setSelectedMemberId, getMemberRecords, getMemberInsights, getSelectedMember } = useApp();
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  
  const member = getSelectedMember();
  const records = getMemberRecords(selectedMemberId);
  const insights = getMemberInsights(selectedMemberId).filter(i => !i.isRead).slice(0, 2);

  return (
    <div className="pb-4">
      {/* Family Member Switcher */}
      <div className="px-4 py-3">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {familyMembers.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMemberId(m.id)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                m.id === selectedMemberId
                  ? 'bg-teal-600 text-white ring-2 ring-teal-300 ring-offset-2'
                  : 'bg-teal-50 text-teal-700'
              }`}>
                {getInitials(m.name)}
              </div>
              <span className={`text-[10px] max-w-[56px] truncate ${m.id === selectedMemberId ? 'text-teal-700 font-semibold' : 'text-gray-500'}`}>
                {m.name.split(' ')[0]}
              </span>
            </button>
          ))}
          <button
            onClick={() => navigate('/settings')}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-teal-400 transition-colors">
              <Plus size={18} className="text-gray-400" />
            </div>
            <span className="text-[10px] text-gray-400">Add</span>
          </button>
        </div>
      </div>

      {/* Selected Member Summary Card */}
      {member && (
        <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-gray-900">{member.name}</h2>
              <p className="text-sm text-gray-500">{member.age} yrs • {member.gender === 'male' ? 'Male' : member.gender === 'female' ? 'Female' : 'Other'}</p>
            </div>
            <button onClick={() => navigate(`/records`)} className="text-xs text-teal-600 font-medium hover:underline flex items-center gap-0.5">
              View profile <ChevronRight size={14} />
            </button>
          </div>
          {member.conditions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {member.conditions.map(c => (
                <span key={c} className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full">
                  {c}
                </span>
              ))}
            </div>
          )}
          {records.length > 0 && (
            <p className="text-xs text-gray-400 mt-3">Last record: {timeAgo(records[0].createdAt)}</p>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 mt-5">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Quick actions</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Camera, label: 'Scan', color: 'text-teal-600', bg: 'bg-teal-50', action: () => setShowUpload(true) },
            { icon: ClipboardList, label: 'Summary', color: 'text-blue-600', bg: 'bg-blue-50', action: () => navigate('/summary') },
            { icon: Pill, label: 'Medicines', color: 'text-purple-600', bg: 'bg-purple-50', action: () => navigate('/medicines') },
            { icon: AlertTriangle, label: 'Emergency', color: 'text-red-600', bg: 'bg-red-50', action: () => navigate('/emergency') },
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all text-center"
              >
                <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center mb-1.5 mx-auto`}>
                  <Icon size={18} className={item.color} />
                </div>
                <span className="text-[11px] font-medium text-gray-700">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Health Modules */}
      <div className="px-4 mt-5">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Health modules</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: FileSearch, label: 'History', color: 'text-indigo-600', bg: 'bg-indigo-50', path: '/history' },
            { icon: Activity, label: 'Metrics', color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/metrics' },
            { icon: Baby, label: 'Child & Birth', color: 'text-pink-600', bg: 'bg-pink-50', path: '/child' },
            { icon: Stethoscope, label: 'Visits', color: 'text-cyan-600', bg: 'bg-cyan-50', path: '/visits' },
            { icon: Shield, label: 'Insurance', color: 'text-amber-600', bg: 'bg-amber-50', path: '/insurance' },
            { icon: Eye, label: 'Specialty', color: 'text-rose-600', bg: 'bg-rose-50', path: '/specialty' },
            { icon: HeartHandshake, label: 'Caregiver', color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/caregiver' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all text-center"
              >
                <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center mb-1.5 mx-auto`}>
                  <Icon size={18} className={item.color} />
                </div>
                <span className="text-[11px] font-medium text-gray-700">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-1.5">
              <Sparkles size={16} className="text-teal-500" /> Smart Alerts
            </h3>
            <button onClick={() => navigate('/insights')} className="text-xs text-teal-600 font-medium hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-2.5">
            {insights.map(insight => {
              const styles = getInsightStyles(insight.type);
              return (
                <button
                  key={insight.id}
                  onClick={() => navigate('/insights')}
                  className={`w-full text-left ${styles.bg} rounded-xl p-3.5 border-l-4 ${styles.border} transition-all hover:shadow-sm`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg">{styles.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{insight.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{insight.message}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Records */}
      <div className="px-4 mt-6 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Recent Records</h3>
          <button onClick={() => navigate('/records')} className="text-xs text-teal-600 font-medium hover:underline flex items-center gap-0.5">
            See all <ChevronRight size={14} />
          </button>
        </div>
        {records.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <p className="text-3xl mb-2">📁</p>
            <p className="text-sm text-gray-500">No records yet.</p>
            <button onClick={() => setShowUpload(true)} className="text-sm text-teal-600 font-medium mt-1 hover:underline">
              Scan your first document
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {records.slice(0, 5).map(record => (
              <button
                key={record.id}
                onClick={() => navigate(`/records/${record.id}`)}
                className="w-full flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all text-left"
              >
                <span className="text-xl">{getDocTypeIcon(record.documentType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getDocTypeLabel(record.documentType)}
                  </p>
                  <p className="text-xs text-gray-500">{record.hospitalName || record.doctorName || 'Unknown'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">{new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
}
