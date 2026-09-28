import { useApp } from '../context/AppContext';
import { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, Copy, Download, Edit3, Save } from 'lucide-react';
import { getInitials } from '../utils/helpers';
import { callMintEmergencyShare } from '../services/functions';
import { isLocalMode } from '../lib/env';

export default function EmergencyPage() {
  const { familyMembers, selectedMemberId, setSelectedMemberId, getMemberMedicines, updateFamilyMember } = useApp();
  const [editing, setEditing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const member = familyMembers.find(m => m.id === selectedMemberId);
  if (!member) return null;

  const meds = getMemberMedicines(selectedMemberId).slice(0, 4);
  const [shareUrl, setShareUrl] = useState<string>(
    `${window.location.origin}/emergency/public/${selectedMemberId}`,
  );

  useEffect(() => {
    if (isLocalMode) return; // no Firebase in local mode — QR shows local preview URL
    let cancelled = false;
    (async () => {
      try {
        const res = await callMintEmergencyShare(selectedMemberId);
        if (!cancelled) setShareUrl(`${window.location.origin}${res.url}`);
      } catch (err) {
        console.warn('Could not mint emergency share:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedMemberId]);

  const [editData, setEditData] = useState({
    emergencyContactName: member.emergencyContact?.name || '',
    emergencyContactPhone: member.emergencyContact?.phone || '',
    doctorName: member.doctorName || '',
    doctorPhone: member.doctorPhone || '',
    allergies: member.allergies.join(', '),
  });

  const handleSave = () => {
    updateFamilyMember(selectedMemberId, {
      emergencyContact: editData.emergencyContactName ? { name: editData.emergencyContactName, phone: editData.emergencyContactPhone } : null,
      doctorName: editData.doctorName || null,
      doctorPhone: editData.doctorPhone || null,
      allergies: editData.allergies.split(',').map(a => a.trim()).filter(Boolean),
    });
    setEditing(false);
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `${member.name.replace(/\s+/g, '_')}_Emergency_Card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed. Try using the screenshot feature instead.');
    }
    setDownloading(false);
  };

  const handleShare = (method: 'whatsapp' | 'copy') => {
    const text = `🚨 EMERGENCY MEDICAL INFO\n${member.name}, ${member.age}yrs, ${member.gender}\nBlood Group: ${member.bloodGroup || 'Unknown'}\nConditions: ${member.conditions.join(', ') || 'None'}\nAllergies: ${member.allergies.join(', ') || 'None'}\nMedicines: ${meds.map(m => m.medicine.name).join(', ') || 'None'}\nEmergency Contact: ${member.emergencyContact?.name || 'N/A'} - ${member.emergencyContact?.phone || 'N/A'}\nDoctor: ${member.doctorName || 'N/A'} - ${member.doctorPhone || 'N/A'}`;

    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (method === 'copy') {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">🚨 Emergency Card</h1>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          {editing ? <Save size={18} className="text-teal-600" /> : <Edit3 size={18} className="text-gray-500" />}
        </button>
      </div>

      {/* Member Selector */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {familyMembers.map(m => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedMemberId(m.id);
                setEditing(false);
                // Reset edit data for new member
                setEditData({
                  emergencyContactName: m.emergencyContact?.name || '',
                  emergencyContactPhone: m.emergencyContact?.phone || '',
                  doctorName: m.doctorName || '',
                  doctorPhone: m.doctorPhone || '',
                  allergies: m.allergies.join(', '),
                });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                selectedMemberId === m.id ? 'bg-red-100 text-red-700 ring-1 ring-red-300' : 'bg-gray-50 text-gray-500'
              }`}
            >
              {m.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Emergency Card */}
      <div className="mx-4">
        <div ref={cardRef} className="bg-white rounded-2xl border-2 border-red-200 overflow-hidden shadow-sm">
          {/* Red Header */}
          <div className="bg-red-600 text-white px-4 py-3 text-center">
            <p className="text-xs font-bold uppercase tracking-widest">Emergency Medical Information</p>
          </div>

          <div className="p-5">
            {/* Patient Info */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-xl font-bold">
                {getInitials(member.name)}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-500">{member.age} years • {member.gender === 'male' ? 'Male' : member.gender === 'female' ? 'Female' : 'Other'}</p>
                <p className="text-sm font-semibold text-gray-700">Blood Group: {member.bloodGroup || 'Unknown'}</p>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Emergency Contact</p>
              {editing ? (
                <div className="space-y-2">
                  <input value={editData.emergencyContactName} onChange={e => setEditData({...editData, emergencyContactName: e.target.value})} placeholder="Name" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                  <input value={editData.emergencyContactPhone} onChange={e => setEditData({...editData, emergencyContactPhone: e.target.value})} placeholder="Phone" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
              ) : (
                <p className="text-sm text-gray-900 font-medium">
                  {member.emergencyContact ? `${member.emergencyContact.name} — ${member.emergencyContact.phone}` : 'Not set'}
                </p>
              )}
            </div>

            {/* Critical Conditions */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Critical Conditions</p>
              <div className="flex flex-wrap gap-1.5">
                {member.conditions.length > 0 ? member.conditions.slice(0, 3).map(c => (
                  <span key={c} className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full">{c}</span>
                )) : <span className="text-sm text-gray-400">None</span>}
              </div>
            </div>

            {/* Allergies */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Known Allergies</p>
              {editing ? (
                <input value={editData.allergies} onChange={e => setEditData({...editData, allergies: e.target.value})} placeholder="Comma-separated" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {member.allergies.length > 0 ? member.allergies.slice(0, 3).map(a => (
                    <span key={a} className="px-3 py-1 bg-orange-100 text-orange-700 text-sm font-semibold rounded-full">{a}</span>
                  )) : <span className="text-sm text-gray-400">None known</span>}
                </div>
              )}
            </div>

            {/* Critical Medicines */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Current Medicines</p>
              {meds.length > 0 ? (
                <div className="space-y-1">
                  {meds.map((m, i) => (
                    <p key={i} className="text-sm text-gray-900">
                      <span className="font-semibold">{m.medicine.name}</span> — {m.medicine.dosage}
                    </p>
                  ))}
                </div>
              ) : <span className="text-sm text-gray-400">None</span>}
            </div>

            {/* Doctor */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Primary Doctor</p>
              {editing ? (
                <div className="space-y-2">
                  <input value={editData.doctorName} onChange={e => setEditData({...editData, doctorName: e.target.value})} placeholder="Doctor name" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                  <input value={editData.doctorPhone} onChange={e => setEditData({...editData, doctorPhone: e.target.value})} placeholder="Doctor phone" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
              ) : (
                <p className="text-sm text-gray-900 font-medium">
                  {member.doctorName ? `${member.doctorName}${member.doctorPhone ? ` — ${member.doctorPhone}` : ''}` : 'Not set'}
                </p>
              )}
            </div>

            {/* QR Code */}
            <div className="border-t border-gray-100 pt-4 mt-4 flex flex-col items-center">
              <QRCodeSVG value={shareUrl} size={120} level="M" includeMargin />
              <p className="text-[10px] text-gray-400 mt-2">Scan for full emergency info</p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-2 text-center">
            <p className="text-[10px] text-gray-400">Generated by MediMem • {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-2">
        <button onClick={() => handleShare('whatsapp')} className="bg-green-50 text-green-700 py-2.5 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-1.5">
          <Share2 size={14} /> WhatsApp
        </button>
        <button onClick={() => handleShare('copy')} className="bg-gray-50 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5">
          <Copy size={14} /> Copy
        </button>
        <button
          onClick={handleDownloadImage}
          disabled={downloading}
          className="bg-blue-50 text-blue-700 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Download size={14} /> {downloading ? '...' : 'Image'}
        </button>
      </div>

      {/* Install prompt */}
      <div className="mx-4 mt-4 bg-blue-50 rounded-xl p-3 text-center">
        <p className="text-xs text-blue-700">💡 Add MediMem to your home screen for instant access to emergency cards</p>
      </div>
    </div>
  );
}
