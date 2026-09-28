import { useApp } from '../context/AppContext';
import { getMemberSlotState } from '../lib/planLimits';
import { useNavigate } from 'react-router-dom';
import { getInitials, generateId } from '../utils/helpers';
import { Plus, ChevronRight, Heart, X, Check } from 'lucide-react';
import { useState } from 'react';
import type { FamilyMember } from '../types';

const CONDITIONS = ['Diabetes', 'Hypertension', 'Heart Disease', 'Asthma', 'Thyroid', 'PCOS', 'Arthritis', 'None', 'Other'];
const RELATIONSHIPS = ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Other'] as const;

export default function FamilyPage() {
  const { profile, familyMembers, setSelectedMemberId, addFamilyMember, getMemberRecords } = useApp();
  const navigate = useNavigate();
  const slot = getMemberSlotState(profile, familyMembers);
  const [showAddMember, setShowAddMember] = useState(false);

  // Add member form state
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState<string>('Spouse');
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState<'male' | 'female' | 'other'>('male');
  const [newBloodGroup, setNewBloodGroup] = useState('');
  const [newConditions, setNewConditions] = useState<string[]>([]);
  const [newMaritalStatus, setNewMaritalStatus] = useState<FamilyMember['maritalStatus']>('unknown');
  const [newOccupation, setNewOccupation] = useState('');
  const [newToxin, setNewToxin] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [newWeight, setNewWeight] = useState('');

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
      maritalStatus: newMaritalStatus,
      occupation: newOccupation || undefined,
      toxinExposure: newToxin.split(',').map(t => t.trim()).filter(Boolean),
      heightCm: newHeight === '' ? null : Number(newHeight),
      weightKg: newWeight === '' ? null : Number(newWeight),
      createdAt: new Date().toISOString(),
    };
    addFamilyMember(member);
    setShowAddMember(false);
    setNewName(''); setNewAge(''); setNewBloodGroup(''); setNewConditions([]);
    setNewMaritalStatus('unknown'); setNewOccupation(''); setNewToxin('');
    setNewHeight(''); setNewWeight('');
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
      <div className="px-4 pt-2 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Heart size={20} className="text-red-400" /> Family
          </h1>
          <p className="text-[10px] text-gray-400">
            {slot.used} of {slot.limit} members — {profile.plan === 'free' ? 'Free plan' : profile.plan === 'family' ? 'Family plan' : 'Annual plan'}
          </p>
        </div>
        <button
          onClick={() => slot.canAdd ? setShowAddMember(true) : navigate('/settings')}
          className={`text-xs font-medium flex items-center gap-0.5 ${slot.canAdd ? 'text-teal-600 hover:underline' : 'text-amber-600 hover:underline'}`}
        >
          <Plus size={12} /> {slot.canAdd ? 'Add Member' : 'Upgrade to add'}
        </button>
      </div>

      {/* Free-plan limit banner */}
      {slot.isAtLimit && (
        <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <div className="text-amber-600 text-base">⭐</div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-amber-800">You're on the {profile.plan === 'free' ? 'Free' : profile.plan} plan ({slot.limit} members max)</p>
            <p className="text-[10px] text-amber-700 mt-0.5">
              {profile.plan === 'free'
                ? 'Upgrade to Family or Annual to add up to 6 family members + unlimited records + advanced AI.'
                : 'You\'ve reached the limit for this plan.'}
            </p>
            <button onClick={() => navigate('/settings')} className="text-xs text-amber-800 font-semibold underline mt-1">
              View plans →
            </button>
          </div>
        </div>
      )}

      {/* Add Member Form */}
      {showAddMember && slot.canAdd && (
        <div className="mx-4 mb-4 bg-teal-50 rounded-xl p-4 border border-teal-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-teal-800">New Family Member</h4>
            <button onClick={() => setShowAddMember(false)} className="p-1 hover:bg-teal-100 rounded-lg">
              <X size={14} className="text-teal-600" />
            </button>
          </div>
          <div className="space-y-2.5">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name"
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white" />
            <div className="grid grid-cols-2 gap-2">
              <select value={newRelationship} onChange={e => setNewRelationship(e.target.value)}
                className="text-sm px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white">
                {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="flex gap-2">
                <input type="number" value={newAge} onChange={e => setNewAge(e.target.value)} placeholder="Age"
                  className="flex-1 text-sm px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white" />
                <select value={newGender} onChange={e => setNewGender(e.target.value as 'male' | 'female' | 'other')}
                  className="w-16 text-xs px-2 py-2.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white">
                  <option value="male">M</option>
                  <option value="female">F</option>
                  <option value="other">O</option>
                </select>
              </div>
            </div>
            <input value={newBloodGroup} onChange={e => setNewBloodGroup(e.target.value)} placeholder="Blood group (e.g. B+)"
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white" />
            <div className="grid grid-cols-2 gap-2">
              <select value={newMaritalStatus} onChange={e => setNewMaritalStatus(e.target.value as FamilyMember['maritalStatus'])}
                className="text-sm px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white">
                <option value="unknown">Marital status</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
                <option value="separated">Separated</option>
              </select>
              <input value={newOccupation} onChange={e => setNewOccupation(e.target.value)} placeholder="Occupation"
                className="text-sm px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white" />
            </div>
            <input value={newToxin} onChange={e => setNewToxin(e.target.value)} placeholder="Toxin exposure (comma separated)"
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min={50} max={250} value={newHeight} onChange={e => setNewHeight(e.target.value)} placeholder="Height (cm)"
                className="text-sm px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white" />
              <input type="number" min={1} max={500} step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="Weight (kg)"
                className="text-sm px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none bg-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Health Conditions</label>
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
              className="w-full py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-teal-700 transition-colors">
              Add Member
            </button>
          </div>
        </div>
      )}

      <div className="px-4 space-y-3">
        {familyMembers.map(m => {
          const recordCount = getMemberRecords(m.id).length;
          return (
            <button
              key={m.id}
              onClick={() => { setSelectedMemberId(m.id); navigate('/dashboard'); }}
              className="w-full flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all text-left"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                m.relationship === 'self' ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700'
              }`}>
                {getInitials(m.name)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{m.name}</p>
                <p className="text-sm text-gray-500 capitalize">{m.relationship} • {m.age}yrs • {m.gender}{m.bloodGroup ? ` • ${m.bloodGroup}` : ''}</p>
                {m.conditions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {m.conditions.map(c => (
                      <span key={c} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-medium rounded-full">{c}</span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-1">{recordCount} record{recordCount !== 1 ? 's' : ''} on file</p>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
