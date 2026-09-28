import { useApp } from '../../context/AppContext';
import { Bell, LogOut } from 'lucide-react';
import { getInitials } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function TopNav() {
  const { profile, insights, logout } = useApp();
  const navigate = useNavigate();
  const unreadCount = insights.filter(i => !i.isRead).length;
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            Medi<span className="text-teal-600">Mem</span>
          </span>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/insights')}
            className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Bell size={20} className="text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold hover:ring-2 ring-teal-200 transition-all"
            >
              {getInitials(profile.name)}
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-44 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{profile.name}</p>
                    <p className="text-xs text-gray-500">{profile.email}</p>
                  </div>
                  <button
                    onClick={() => { navigate('/settings'); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => { logout(); navigate('/'); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
