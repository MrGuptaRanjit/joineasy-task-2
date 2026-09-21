import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  CheckSquare, 
  Users, 
  PlusCircle,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose, onOpenCreateModal }) {
  const { isProfessor } = useAuth();

  const navItems = isProfessor
    ? [
        { to: '/professor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/courses', label: 'Courses Taught', icon: BookOpen },
        { to: '/assignments', label: 'Assignments', icon: FileText },
      ]
    : [
        { to: '/student/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
        { to: '/courses', label: 'Enrolled Courses', icon: BookOpen },
        { to: '/assignments', label: 'Assignments', icon: FileText },
      ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed md:sticky top-16 z-40 h-[calc(100vh-4rem)] w-64 glass-panel border-r border-slate-800/80 p-4 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-6">
          {/* Mobile Header */}
          <div className="flex items-center justify-between md:hidden pb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation</span>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
              Main Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Quick Actions (For Professor) */}
          {isProfessor && onOpenCreateModal && (
            <div className="pt-4 border-t border-slate-800/80">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
                Quick Actions
              </div>
              <button
                onClick={() => {
                  onClose?.();
                  onOpenCreateModal();
                }}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all hover:scale-[1.02]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Assignment</span>
              </button>
            </div>
          )}
        </div>

        {/* Academic term footer */}
        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-center">
          <div className="text-[11px] text-slate-400 font-medium">Academic Term</div>
          <div className="text-xs font-bold text-indigo-400 mt-0.5">Fall 2026 Semester</div>
        </div>
      </aside>
    </>
  );
}
