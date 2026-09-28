import { useApp } from '../context/AppContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Users, CreditCard, Bell, Shield, Globe, LogOut, ChevronRight, Trash2, Plus, X, Save, Download, Check, ShieldCheck } from 'lucide-react';
import i18n from '../lib/i18n';
import { getMemberSlotState } from '../lib/planLimits';
import { getInitials, generateId } from '../utils/helpers';
import type { FamilyMember } from '../types';

const CONDITIONS = ['Diabetes', 'Hypertension', 'Heart Disease', 'Asthma', 'Thyroid', 'PCOS', 'Arthritis', 'None', 'Other'];
const RELATIONSHIPS = ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Other'] as const;

export default function SettingsPage() {
  const { profile, familyMembers, logout, removeFamilyMember, addFamilyMember, updateFamilyMember, updateProfile, exportAllData } = useApp();
  const navigate = useNavigate();
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [notifications, setNotifications] = useState({ medicines: true, insights: true, followups: false });
  const [language, setLanguage] = useState(profile.language);

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [editPhone, setEditPhone] = useState(profile.phone);
  const [editMaritalStatus, setEditMaritalStatus] = useState(profile.maritalStatus ?? 'unknown');
  const [editOccupation, setEditOccupation] = useState(profile.occupation ?? '');
  const [editToxin, setEditToxin] = useState((profile.toxinExposure ?? []).join(', '));
  const [editHeight, setEditHeight] = useState(profile.heightCm ?? '');
  const [editWeight, setEditWeight] = useState(profile.weightKg ?? '');

  const bmi = (() => {
    const h = Number(editHeight); const w = Number(editWeight);
    if (!h || !w) return null;
    return +(w / Math.pow(h / 100, 2)).toFixed(1);
  })();

  // Add member form
  const [showAddMember, setShowAddMember] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState<string>('Spouse');
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState<'male' | 'female' | 'other'>('male');
  const [newBloodGroup, setNewBloodGroup] = useState('');
  const [newConditions, setNewConditions] = useState<string[]>([]);

  // Edit member
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberAge, setEditMemberAge] = useState('');
  const [editMemberBloodGroup, setEditMemberBloodGroup] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSaveProfile = () => {
    updateProfile({
      name: editName, email: editEmail, phone: editPhone,
      maritalStatus: editMaritalStatus as 'single' | 'married' | 'divorced' | 'widowed' | 'separated' | 'unknown',
      occupation: editOccupation || undefined,
      toxinExposure: editToxin.split(',').map((t) => t.trim()).filter(Boolean),
      heightCm: editHeight === '' ? null : Number(editHeight),
      weightKg: editWeight === '' ? null : Number(editWeight),
    });
    setEditingProfile(false);
  };

  const handleAddMember = () => {
    if (!newName.trim()) return;
    const member: FamilyMember = {
      id: generateId(),
      name: newName,
      relationship: newRelationship.toLowerCase() as FamilyMember['relationship'],
      age: parseInt(newAge) || 30,
      gender: newGender,
      conditions: newConditions.filter(c => c !== 'None'),
      bloodGroup: newBloodGroup || null,
      emergencyContact: null,
      doctorName: null,
      doctorPhone: null,
      allergies: [],
      createdAt: new Date().toISOString(),
    };
    addFamilyMember(member);
    setShowAddMember(false);
    setNewName(''); setNewAge(''); setNewBloodGroup(''); setNewConditions([]);
  };

  const startEditMember = (m: FamilyMember) => {
    setEditingMemberId(m.id);
    setEditMemberName(m.name);
    setEditMemberAge(String(m.age));
    setEditMemberBloodGroup(m.bloodGroup || '');
  };

  const handleSaveMember = () => {
    if (!editingMemberId) return;
    updateFamilyMember(editingMemberId, {
      name: editMemberName,
      age: parseInt(editMemberAge) || 30,
      bloodGroup: editMemberBloodGroup || null,
    });
    setEditingMemberId(null);
  };

  const handleExportData = () => {
    const jsonStr = exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medimem_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleCondition = (condition: string) => {
    setNewConditions(prev => {
      if (condition === 'None') return ['None'];
      const without = prev.filter(c => c !== 'None');
      return without.includes(condition) ? without.filter(c => c !== condition) : [...without, condition];
    });
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-2 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Profile Card */}
      <div className="mx-4 mb-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        {editingProfile ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-0.5">Name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-0.5">Email</label>
              <input value={editEmail} onChange={e => setEditEmail(e.target.value)} type="email"
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-0.5">Phone</label>
              <input value={editPhone} onChange={e => setEditPhone(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Marital status</label>
                <select value={editMaritalStatus} onChange={e => setEditMaritalStatus(e.target.value as typeof editMaritalStatus)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white">
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                  <option value="separated">Separated</option>
                  <option value="unknown">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Occupation</label>
                <input value={editOccupation} onChange={e => setEditOccupation(e.target.value)}
                  placeholder="e.g. Teacher"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-0.5">Exposure to toxins (comma separated)</label>
              <input value={editToxin} onChange={e => setEditToxin(e.target.value)}
                placeholder="e.g. asbestos, pesticides, lead, secondhand smoke"
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Height (cm)</label>
                <input type="number" min={50} max={250} value={editHeight} onChange={e => setEditHeight(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-0.5">Weight (kg)</label>
                <input type="number" min={1} max={500} step="0.1" value={editWeight} onChange={e => setEditWeight(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-0.5">BMI</label>
                <div className={`w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 ${
                  bmi === null ? 'text-gray-400' :
                  bmi < 18.5 ? 'text-amber-600' :
                  bmi <= 24.9 ? 'text-green-600' :
                  bmi <= 29.9 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {bmi ?? '—'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingProfile(false)} className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={handleSaveProfile} className="flex-1 py-2 bg-teal-600 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-1">
                <Save size={14} /> Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-lg font-bold">
              {getInitials(profile.name)}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{profile.name}</p>
              <p className="text-sm text-gray-500">{profile.email}</p>
              {profile.phone && <p className="text-xs text-gray-400">{profile.phone}</p>}
            </div>
            <button onClick={() => setEditingProfile(true)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <User size={18} className="text-gray-400" />
            </button>
          </div>
        )}
      </div>

      {/* Family Members Section */}
      <div className="mx-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Users size={14} /> Family Members
            </h3>
            <p className="text-[10px] text-gray-400">{getMemberSlotState(profile, familyMembers).used} of {getMemberSlotState(profile, familyMembers).limit} on {profile.plan} plan</p>
          </div>
          {getMemberSlotState(profile, familyMembers).canAdd ? (
            <button
              onClick={() => setShowAddMember(true)}
              className="text-xs text-teal-600 font-medium hover:underline flex items-center gap-0.5"
            >
              <Plus size={12} /> Add Member
            </button>
          ) : (
            <a href="#plan" className="text-xs text-amber-600 font-medium hover:underline flex items-center gap-0.5">
              ⭐ Upgrade
            </a>
          )}
        </div>

        {/* Add Member Form */}
        {showAddMember && getMemberSlotState(profile, familyMembers).canAdd && (
          <div className="bg-teal-50 rounded-xl p-4 mb-3 border border-teal-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-teal-800">New Family Member</h4>
              <button onClick={() => setShowAddMember(false)} className="p-1 hover:bg-teal-100 rounded-lg">
                <X size={14} className="text-teal-600" />
              </button>
            </div>
            <div className="space-y-2.5">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name"
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white" />
              <div className="grid grid-cols-2 gap-2">
                <select value={newRelationship} onChange={e => setNewRelationship(e.target.value)}
                  className="text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white">
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="number" value={newAge} onChange={e => setNewAge(e.target.value)} placeholder="Age"
                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white" />
                  <select value={newGender} onChange={e => setNewGender(e.target.value as 'male' | 'female' | 'other')}
                    className="w-16 text-xs px-2 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white">
                    <option value="male">M</option>
                    <option value="female">F</option>
                    <option value="other">O</option>
                  </select>
                </div>
              </div>
              <input value={newBloodGroup} onChange={e => setNewBloodGroup(e.target.value)} placeholder="Blood group (e.g. B+)"
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white" />
              <div>
                <label className="text-xs text-gray-500 block mb-1">Conditions</label>
                <div className="flex flex-wrap gap-1.5">
                  {CONDITIONS.map(c => (
                    <button key={c} onClick={() => toggleCondition(c)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                        newConditions.includes(c) ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
                      }`}>
                      {newConditions.includes(c) && <Check size={10} className="inline mr-0.5" />}{c}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleAddMember} disabled={!newName.trim()}
                className="w-full py-2 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-teal-700 transition-colors">
                Add Member
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {familyMembers.map(m => (
            <div key={m.id} className="px-4 py-3">
              {editingMemberId === m.id ? (
                <div className="space-y-2">
                  <input value={editMemberName} onChange={e => setEditMemberName(e.target.value)} placeholder="Name"
                    className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none" />
                  <div className="flex gap-2">
                    <input type="number" value={editMemberAge} onChange={e => setEditMemberAge(e.target.value)} placeholder="Age"
                      className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none" />
                    <input value={editMemberBloodGroup} onChange={e => setEditMemberBloodGroup(e.target.value)} placeholder="Blood group"
                      className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingMemberId(null)} className="flex-1 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">Cancel</button>
                    <button onClick={handleSaveMember} className="flex-1 py-1.5 bg-teal-600 rounded-lg text-xs font-medium text-white">Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                    m.relationship === 'self' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {getInitials(m.name)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{m.relationship} • {m.age}yrs{m.bloodGroup ? ` • ${m.bloodGroup}` : ''}</p>
                    {m.conditions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.conditions.map(c => (
                          <span key={c} className="text-[9px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => startEditMember(m)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <User size={13} className="text-gray-400" />
                  </button>
                  {m.relationship !== 'self' && (
                    <button onClick={() => removeFamilyMember(m.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                      <X size={14} className="text-gray-300 hover:text-red-400" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Plan Section */}
      <div className="mx-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
          <CreditCard size={14} /> Your Plan
        </h3>
        <div className="space-y-2">
          {/* Free Plan */}
          <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-teal-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-900">FREE PLAN</span>
              <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold">CURRENT</span>
            </div>
            <ul className="space-y-1 text-xs text-gray-600">
              <li>✓ Up to 2 family members</li>
              <li>✓ 50 record uploads</li>
              <li>✓ Basic AI insights</li>
              <li>✓ Emergency card</li>
            </ul>
          </div>

          {/* Family Plan */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-teal-200 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-900">FAMILY PLAN</span>
              <span className="text-sm font-bold text-teal-600">₹299/mo</span>
            </div>
            <ul className="space-y-1 text-xs text-gray-600 mb-3">
              <li>✓ Up to 6 family members</li>
              <li>✓ Unlimited records</li>
              <li>✓ Advanced AI trend analysis</li>
              <li>✓ Pre-visit doctor summaries</li>
              <li>✓ Medicine refill reminders</li>
              <li>✓ WhatsApp integration</li>
            </ul>
            <button className="w-full bg-teal-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors">
              Upgrade →
            </button>
          </div>

          {/* Annual Plan */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-4 shadow-sm border border-teal-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-bold text-gray-900">FAMILY ANNUAL</span>
                <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold">BEST VALUE</span>
              </div>
              <span className="text-sm font-bold text-teal-600">₹2,499/yr</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Everything in Family + 30% savings</p>
            <button className="w-full bg-teal-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors">
              Get Best Value →
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="mx-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
          <Bell size={14} /> Notifications
        </h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {[
            { key: 'medicines', label: 'Medicine reminders' },
            { key: 'insights', label: 'Insight alerts' },
            { key: 'followups', label: 'Follow-up appointment reminders' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-700">{item.label}</span>
              <button
                onClick={() => {
                  setNotifications(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }));
                  if (!notifications[item.key as keyof typeof notifications]) {
                    Notification.requestPermission();
                  }
                }}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  notifications[item.key as keyof typeof notifications] ? 'bg-teal-500' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  notifications[item.key as keyof typeof notifications] ? 'translate-x-[18px]' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="mx-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
          <Globe size={14} /> Language
        </h3>
        <select
          value={language}
          onChange={e => {
            const lang = e.target.value as typeof language;
            setLanguage(lang);
            updateProfile({ language: lang });
            void i18n.changeLanguage(lang);
          }}
          className="w-full bg-white px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-teal-500 focus:outline-none"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="ta">தமிழ்</option>
          <option value="te">తెలుగు</option>
          <option value="bn">বাংলা</option>
        </select>
      </div>

      {/* Privacy */}
      <div className="mx-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
          <Shield size={14} /> Privacy & Security
        </h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="space-y-2 text-sm text-gray-600">
            <p>🔒 Your data is encrypted and stored securely</p>
            <p>🚫 We never share your data with third parties</p>
          </div>
          <div className="mt-4 space-y-2">
            <button
              onClick={handleExportData}
              className="w-full text-left px-3 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-between"
            >
              <span className="flex items-center gap-2"><Download size={14} /> Export all my data</span>
              <ChevronRight size={14} className="text-gray-400" />
            </button>
            <button
              onClick={() => navigate('/audit')}
              className="w-full text-left px-3 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-between"
            >
              <span className="flex items-center gap-2"><ShieldCheck size={14} /> View audit log</span>
              <ChevronRight size={14} className="text-gray-400" />
            </button>
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete account
            </button>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="mx-4 mb-8">
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteAccount(false)} />
          <div className="relative bg-white rounded-2xl p-6 mx-6 max-w-sm">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Trash2 size={18} className="text-red-500" /> Delete Account?
            </h3>
            <p className="text-sm text-gray-500 mb-5">All your data, records, and insights will be permanently deleted. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteAccount(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl font-medium text-gray-600">Cancel</button>
              <button onClick={handleLogout} className="flex-1 py-2.5 bg-red-600 rounded-xl font-medium text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
