import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useHealthData } from '../context/HealthDataContext';
import type { FamilyMember, LifestyleProfile, PhysicalActivity, DietType } from '../types';
import { generateId } from '../utils/helpers';
import { Plus, X, ChevronRight } from 'lucide-react';

const RELATIONSHIPS = ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Other'] as const;
const PHYSICAL_ACTIVITIES: PhysicalActivity[] = ['walking', 'running', 'cycling', 'gym', 'sports', 'yoga', 'none'];

export default function OnboardingPage() {
  const { completeOnboarding } = useApp();
  const { saveMedicalHistory } = useHealthData();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1 - Head of family
  const [headName, setHeadName] = useState('');
  const [headAge, setHeadAge] = useState('');
  const [headGender, setHeadGender] = useState<'male' | 'female' | 'other'>('male');
  const [headPhone, setHeadPhone] = useState('');

  // Step 2 - Family members
  const [members, setMembers] = useState<Array<{ name: string; relationship: string; age: string; gender: string }>>([]);

  // Step 3 - Lifestyle (for the head of family)
  const [diet, setDiet] = useState<DietType>('mixed');
  const [smoking, setSmoking] = useState<LifestyleProfile['smoking']>('never');
  const [alcohol, setAlcohol] = useState<LifestyleProfile['alcohol']>('never');
  const [activities, setActivities] = useState<PhysicalActivity[]>([]);
  const [sleepHours, setSleepHours] = useState('');
  const toggleActivity = (a: PhysicalActivity) => {
    setActivities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  };

  const addMember = () => {
    if (members.length >= 6) return;
    setMembers([...members, { name: '', relationship: 'Spouse', age: '', gender: 'male' }]);
  };

  const removeMember = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const updateMember = (idx: number, field: string, value: string) => {
    const updated = [...members];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated[idx] as any)[field] = value;
    setMembers(updated);
  };

  const handleFinish = () => {
    const selfId = generateId();
    const selfMember: FamilyMember = {
      id: selfId,
      name: headName || 'User',
      relationship: 'self',
      age: parseInt(headAge) || 30,
      gender: headGender,
      conditions: [],
      bloodGroup: null,
      emergencyContact: null,
      doctorName: null,
      doctorPhone: null,
      allergies: [],
      createdAt: new Date().toISOString(),
    };

    const familyMembers: FamilyMember[] = [
      selfMember,
      ...members.filter(m => m.name.trim()).map((m, i) => ({
        id: generateId(),
        name: m.name || `Member ${i + 1}`,
        relationship: m.relationship.toLowerCase() as FamilyMember['relationship'],
        age: parseInt(m.age) || 30,
        gender: m.gender as FamilyMember['gender'],
        conditions: [],
        bloodGroup: null,
        emergencyContact: null,
        doctorName: null,
        doctorPhone: null,
        allergies: [],
        createdAt: new Date().toISOString(),
      })),
    ];

    // Save the head-of-family's lifestyle snapshot from step 3
    const lifestyle: LifestyleProfile = {
      diet, appetite: 'normal',
      physicalActivities: activities,
      physicalActivityHoursPerWeek: null,
      addictions: [], addictionDetails: '',
      smoking, smokingPackYears: null,
      alcohol, sleepHours: sleepHours === '' ? null : Number(sleepHours),
      bowelHabit: 'regular', bowelNotes: '',
      bladderTimesDay: null, bladderTimesNight: null, bladderAbnormality: '',
      occupation: '', stressLevel: 'moderate',
    };
    saveMedicalHistory({
      memberId: selfId,
      chiefComplaint: null, presentIllness: null,
      chronicConditions: [], infectiousHistory: [], surgicalHistory: [],
      hospitalizations: [], allergies: [], familyHistory: [],
      lifestyle, mentalHealth: [],
      updatedAt: new Date().toISOString(),
    });

    completeOnboarding(
      { name: headName || 'User', phone: headPhone, age: parseInt(headAge) || 30, gender: headGender },
      familyMembers
    );
    navigate('/dashboard');
  };

  return (
    <div className="min-h-dvh bg-white">
      {/* Progress Bar */}
      <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => step > 1 && setStep(step - 1)} className="text-sm text-gray-500 hover:text-teal-600">
            {step > 1 ? '← Back' : ''}
          </button>
          <span className="ml-auto text-sm text-gray-400">Step {step} of 3</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <div className="px-6 pb-8 max-w-sm mx-auto">
        {/* Step 1 */}
        {step === 1 && (
          <div className="animate-in slide-in-from-right">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Who's the head of the family?</h2>
            <p className="text-sm text-gray-500 mb-6">This will be the primary account holder.</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Full Name</label>
                <input
                  value={headName}
                  onChange={e => setHeadName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 focus:outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Age</label>
                  <input
                    type="number"
                    value={headAge}
                    onChange={e => setHeadAge(e.target.value)}
                    placeholder="Age"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Gender</label>
                  <select
                    value={headGender}
                    onChange={e => setHeadGender(e.target.value as 'male' | 'female' | 'other')}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 focus:outline-none text-sm bg-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Phone Number</label>
                <input
                  value={headPhone}
                  onChange={e => setHeadPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 focus:outline-none text-sm"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full mt-8 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm shadow-teal-200"
            >
              Continue <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Add your family members</h2>
            <p className="text-sm text-gray-500 mb-6">Up to 6 members on the free plan. You can add more later.</p>

            <div className="space-y-3">
              {members.map((m, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 relative">
                  <button onClick={() => removeMember(i)} className="absolute top-3 right-3 p-1 hover:bg-gray-200 rounded-lg transition-colors">
                    <X size={16} className="text-gray-400" />
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={m.name}
                      onChange={e => updateMember(i, 'name', e.target.value)}
                      placeholder="Name"
                      className="col-span-2 px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none text-sm"
                    />
                    <select
                      value={m.relationship}
                      onChange={e => updateMember(i, 'relationship', e.target.value)}
                      className="px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none text-sm bg-white"
                    >
                      {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={m.age}
                        onChange={e => updateMember(i, 'age', e.target.value)}
                        placeholder="Age"
                        className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none text-sm"
                      />
                      <select
                        value={m.gender}
                        onChange={e => updateMember(i, 'gender', e.target.value)}
                        className="w-20 px-2 py-2.5 rounded-lg border border-gray-200 focus:border-teal-500 focus:outline-none text-xs bg-white"
                      >
                        <option value="male">M</option>
                        <option value="female">F</option>
                        <option value="other">O</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {members.length < 6 && (
              <button
                onClick={addMember}
                className="w-full mt-4 border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-teal-400 hover:text-teal-600 flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={18} /> Add member
              </button>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm shadow-teal-200"
              >
                Continue <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Lifestyle quick-pass */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">A few lifestyle questions</h2>
            <p className="text-sm text-gray-500 mb-6">Helps us tailor insights. Existing conditions can be added later from Medical History.</p>

            <div className="mb-5">
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Diet</label>
              <div className="grid grid-cols-3 gap-2">
                {(['vegetarian', 'non-vegetarian', 'vegan', 'eggetarian', 'mixed'] as DietType[]).map((d) => (
                  <button key={d} onClick={() => setDiet(d)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-colors ${
                      diet === d ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}>
                    {d.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Smoking</label>
              <div className="grid grid-cols-3 gap-2">
                {(['never', 'former', 'current'] as const).map((s) => (
                  <button key={s} onClick={() => setSmoking(s)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-colors ${
                      smoking === s ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Alcohol</label>
              <div className="grid grid-cols-4 gap-2">
                {(['never', 'occasional', 'regular', 'heavy'] as const).map((a) => (
                  <button key={a} onClick={() => setAlcohol(a)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-medium capitalize transition-colors ${
                      alcohol === a ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Physical activity (select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {PHYSICAL_ACTIVITIES.map((a) => {
                  const on = activities.includes(a);
                  return (
                    <button key={a} onClick={() => toggleActivity(a)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                        on ? 'bg-emerald-500 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}>
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Average sleep (hours/night)</label>
              <input type="number" min={0} max={24} step="0.5" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)}
                placeholder="e.g. 7"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 focus:outline-none text-sm" />
            </div>

            <div className="bg-blue-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-blue-700">💡 You can add medical history, conditions, and lab values later from the Medical History tab.</p>
            </div>

            <button
              onClick={handleFinish}
              className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm shadow-teal-200 text-base"
            >
              ✨ Finish Setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
