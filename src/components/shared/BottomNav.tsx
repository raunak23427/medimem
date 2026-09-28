import { useApp } from '../../context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, Users, Sparkles, Settings } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Home', icon: Home },
  { path: '/records', label: 'Records', icon: FileText },
  { path: '/family', label: 'Family', icon: Users },
  { path: '/insights', label: 'Insights', icon: Sparkles },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { insights } = useApp();
  const unreadCount = insights.filter(i => !i.isRead).length;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 z-50 no-print">
      <div className="flex items-center justify-around py-2 px-1" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        {navItems.map(item => {
          const isActive = location.pathname === item.path || 
            (item.path === '/dashboard' && location.pathname === '/') ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 relative ${
                isActive 
                  ? 'text-teal-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                {item.path === '/insights' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-5 h-0.5 bg-teal-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
