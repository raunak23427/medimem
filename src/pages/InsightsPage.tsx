import { useApp } from '../context/AppContext';
import { getInitials, getInsightStyles, formatDate } from '../utils/helpers';
import { Sparkles, RefreshCw, Check, MessageSquare, Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { chatWithMedicalHistory } from '../services/insights';
import GuidedHistoryQA from '../components/shared/GuidedHistoryQA';
import { ClipboardCheck } from 'lucide-react';

export default function InsightsPage() {
  const { familyMembers, selectedMemberId, setSelectedMemberId, getMemberInsights, markInsightRead, insights: allInsights, regenerateInsights, getMemberRecords, getMemberMedicines } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'alerts' | 'qa' | 'chat'>('alerts');

  // Chat state
  const [messages, setMessages] = useState<Record<string, { role: 'user' | 'assistant', content: string }[]>>({});
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const insights = selectedMemberId === 'all'
    ? [...allInsights].sort((a, b) => a.priority - b.priority)
    : getMemberInsights(selectedMemberId);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (selectedMemberId === 'all') {
        for (const m of familyMembers) {
          await regenerateInsights(m.id);
        }
      } else {
        await regenerateInsights(selectedMemberId);
      }
    } catch (err) {
      console.error('Failed to regenerate insights:', err);
    }
    setRefreshing(false);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (tab === 'chat') {
      scrollToBottom();
    }
  }, [messages, tab, isTyping]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || selectedMemberId === 'all') return;
    
    const member = familyMembers.find(m => m.id === selectedMemberId);
    if (!member) return;

    const newMsg = currentMessage.trim();
    setCurrentMessage('');
    
    const memberMessages = messages[selectedMemberId] || [];
    const updatedMessages: { role: 'user' | 'assistant', content: string }[] = [...memberMessages, { role: 'user', content: newMsg }];
    
    setMessages(prev => ({ ...prev, [selectedMemberId]: updatedMessages }));
    setIsTyping(true);

    try {
      const records = getMemberRecords(selectedMemberId);
      const medicines = getMemberMedicines(selectedMemberId);
      const response = await chatWithMedicalHistory(member, records, medicines, memberMessages, newMsg);
      
      setMessages(prev => ({
        ...prev,
        [selectedMemberId]: [...updatedMessages, { role: 'assistant', content: response }]
      }));
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => ({
        ...prev,
        [selectedMemberId]: [...updatedMessages, { role: 'assistant', content: 'Sorry, I encountered an error communicating with the server. Please check your API key and connection.' }]
      }));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="pb-4 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-2 pb-3 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles size={20} className="text-teal-500" /> Insights
        </h1>
        {tab === 'alerts' && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-xl text-xs font-medium hover:bg-teal-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Analyzing...' : 'Refresh Insights'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 mb-3 shrink-0">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => setTab('alerts')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${tab === 'alerts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            <Sparkles size={13} /> Alerts
          </button>
          <button
            onClick={() => setTab('qa')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${tab === 'qa' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            <ClipboardCheck size={13} /> Q&amp;A
          </button>
          <button
            onClick={() => setTab('chat')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${tab === 'chat' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            <MessageSquare size={13} /> Chat
          </button>
        </div>
      </div>

      {/* Family Member Filter */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {tab === 'alerts' && (
            <button
              onClick={() => setSelectedMemberId('all' as string)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                selectedMemberId === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              All Members
            </button>
          )}
          {familyMembers.map(m => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedMemberId(m.id);
                if (selectedMemberId === 'all' && tab === 'chat') {
                  setSelectedMemberId(m.id);
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors flex items-center gap-1.5 ${
                selectedMemberId === m.id ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <span className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${
                selectedMemberId === m.id ? 'bg-teal-700 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {getInitials(m.name).charAt(0)}
              </span>
              {m.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {tab === 'qa' && (
        <div className="flex-1 overflow-y-auto">
          <GuidedHistoryQA />
        </div>
      )}

      {tab === 'alerts' && (
        <div className="flex-1 overflow-y-auto px-4 space-y-3">
          {refreshing && (
            <div className="bg-teal-50 rounded-xl p-3 flex items-center gap-3">
              <RefreshCw size={16} className="text-teal-600 animate-spin flex-shrink-0" />
              <p className="text-sm text-teal-700">Analyzing health records to generate insights...</p>
            </div>
          )}

          {insights.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">✨</p>
              <p className="font-semibold text-gray-900 mb-1">All clear!</p>
              <p className="text-sm text-gray-500">Add more records to get AI insights.</p>
              <button onClick={handleRefresh} className="mt-4 text-sm text-teal-600 font-medium hover:underline">
                Tap to refresh insights
              </button>
            </div>
          ) : (
            insights.map(insight => {
              const styles = getInsightStyles(insight.type);
              const member = familyMembers.find(m => m.id === insight.memberId);
              return (
                <div key={insight.id} className={`${styles.bg} rounded-xl p-4 border-l-4 ${styles.border} transition-all ${insight.isRead ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{styles.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">{insight.title}</p>
                        {!insight.isRead && (
                          <button onClick={() => markInsightRead(insight.id)} className="flex-shrink-0 p-1 hover:bg-white/50 rounded-lg transition-colors" title="Mark as read">
                            <Check size={14} className="text-gray-400" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{insight.message}</p>
                      {insight.actionRequired && (
                        <div className="mt-2 bg-white/60 rounded-lg px-3 py-2">
                          <p className="text-xs font-medium text-gray-700">👉 {insight.actionRequired}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {member && <span className="text-[10px] bg-white/60 px-2 py-0.5 rounded-full text-gray-600 font-medium">{member.name.split(' ')[0]}</span>}
                        <span className="text-[10px] text-gray-400">{formatDate(insight.generatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'chat' && (
        /* AI Chat Interface */
        <div className="flex-1 flex flex-col bg-gray-50 mx-4 rounded-2xl border border-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
          {selectedMemberId === 'all' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare size={24} className="text-teal-600" />
              </div>
              <p className="text-gray-900 font-semibold mb-2">Select a Family Member</p>
              <p className="text-sm text-gray-500">Please select a specific family member above to chat about their medical history.</p>
            </div>
          ) : (
            <>
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(messages[selectedMemberId] || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                    <Sparkles size={32} className="text-teal-500 mb-3" />
                    <p className="text-sm font-medium text-gray-900">AI Health Assistant</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Ask questions about {familyMembers.find(m => m.id === selectedMemberId)?.name.split(' ')[0]}'s medical records, lab trends, and medicines.</p>
                  </div>
                ) : (
                  (messages[selectedMemberId] || []).map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === 'user' 
                          ? 'bg-teal-600 text-white rounded-tr-sm' 
                          : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'
                      }`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))
                )}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-white border-t border-gray-100">
                <div className="flex items-end gap-2 bg-gray-50 rounded-xl p-1 border border-gray-200">
                  <textarea
                    value={currentMessage}
                    onChange={e => setCurrentMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask about health trends..."
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-3 px-3 text-sm focus:outline-none"
                    rows={1}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!currentMessage.trim() || isTyping}
                    className="p-2 mb-1 mr-1 bg-teal-600 text-white rounded-lg disabled:opacity-50 hover:bg-teal-700 transition-colors flex-shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <p className="text-[9px] text-center text-gray-400 mt-2">
                  AI can make mistakes. Always consult a doctor for medical advice.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
