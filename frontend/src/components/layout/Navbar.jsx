import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  LogOut, 
  UserCheck, 
  ChevronDown, 
  Sparkles,
  Menu,
  ShieldCheck,
  BookOpen
} from 'lucide-react';

export default function Navbar({ onMobileMenuToggle }) {
  const { user, logout, switchAccount, isProfessor } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [showSwitchDropdown, setShowSwitchDropdown] = useState(false);

  const demoAccounts = [
    { email: 'rahul@university.edu', name: 'Rahul Sharma', role: 'Student (Group Leader)', tag: 'Leader' },
    { email: 'alex@university.edu', name: 'Alex Chen', role: 'Student (Group Member)', tag: 'Member' },
    { email: 'priya@university.edu', name: 'Priya Patel', role: 'Student (Group Member)', tag: 'Member' },
    { email: 'marcus@university.edu', name: 'Marcus Brown', role: 'Student (Individual)', tag: 'Student' },
    { email: 'robert@university.edu', name: 'Dr. Robert Davis', role: 'Professor (CS Dept)', tag: 'Professor' },
    { email: 'elena@university.edu', name: 'Prof. Elena Vance', role: 'Professor (Cloud Systems)', tag: 'Professor' },
  ];

  const handleSwitch = async (email) => {
    try {
      setShowSwitchDropdown(false);
      const switchedUser = await switchAccount(email);
      toast.success(`Switched account to ${switchedUser.name} (${switchedUser.role})`);
      if (switchedUser.role === 'PROFESSOR') {
        navigate('/professor/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      toast.error('Failed to switch demo account');
    }
  };

  const handleLogout = () => {
    logout();
    toast.info('Logged out successfully');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMobileMenuToggle}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 focus:outline-none"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div 
              onClick={() => navigate(isProfessor ? '/professor/dashboard' : '/student/dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  Academic Nexus
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    SaaS
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 block -mt-0.5">Course & Submission Platform</span>
              </div>
            </div>
          </div>

          {/* Right Navigation & Profile Controls */}
          <div className="flex items-center gap-3">
            {/* Demo Quick Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSwitchDropdown(!showSwitchDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 text-xs font-semibold shadow-sm transition-all"
                title="Quick switch between demo testing accounts"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Switch Role</span>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
              </button>

              {showSwitchDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowSwitchDropdown(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl glass-panel border border-slate-700/80 shadow-2xl py-2 z-50 text-slate-100">
                    <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      ⚡ Quick Demo Switcher
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {demoAccounts.map((acc) => (
                        <button
                          key={acc.email}
                          onClick={() => handleSwitch(acc.email)}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-indigo-600/20 transition-colors ${
                            user?.email === acc.email ? 'bg-indigo-500/15 text-indigo-300 font-semibold' : 'text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-medium text-white">{acc.name}</div>
                            <div className="text-[11px] text-slate-400">{acc.role}</div>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            acc.tag === 'Leader' 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : acc.tag === 'Professor'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {acc.tag}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Role Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <span className={`w-2 h-2 rounded-full ${isProfessor ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
              <span className="text-xs font-semibold text-slate-200">
                {user?.role === 'PROFESSOR' ? '👨‍🏫 Professor' : '🎓 Student'}
              </span>
            </div>

            {/* User Avatar & Name */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <img
                src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'User'}`}
                alt={user?.name}
                className="w-8 h-8 rounded-xl object-cover border border-slate-700 shadow-sm"
              />
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-white leading-tight">{user?.name}</div>
                <div className="text-[10px] text-slate-400 leading-tight truncate max-w-[120px]">{user?.email}</div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
