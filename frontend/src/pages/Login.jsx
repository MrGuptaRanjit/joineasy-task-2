import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  GraduationCap, 
  Lock, 
  Mail, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  CheckCircle2 
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const demoAccounts = [
    {
      title: 'Group Leader (Student)',
      name: 'Rahul Sharma',
      email: 'rahul@university.edu',
      role: 'STUDENT',
      desc: 'Can submit & acknowledge for team',
      badge: '👑 Leader',
      color: 'border-amber-500/40 bg-amber-500/10 text-amber-300'
    },
    {
      title: 'Group Member (Student)',
      name: 'Alex Chen',
      email: 'alex@university.edu',
      role: 'STUDENT',
      desc: 'Views shared submission & acknowledgment',
      badge: '👤 Member',
      color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
    },
    {
      title: 'Course Professor',
      name: 'Dr. Robert Davis',
      email: 'robert@university.edu',
      role: 'PROFESSOR',
      desc: 'Creates assignments & monitors submissions',
      badge: '👨‍🏫 Professor',
      color: 'border-purple-500/40 bg-purple-500/10 text-purple-300'
    }
  ];

  const handleQuickLogin = async (accEmail) => {
    setEmail(accEmail);
    setPassword('Password123!');
    setLoading(true);
    setError('');

    try {
      const res = await login(accEmail, 'Password123!');
      toast.success(`Welcome back, ${res.user.name}!`);
      if (res.user.role === 'PROFESSOR') {
        navigate('/professor/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await login(email, password);
      toast.success(`Welcome back, ${res.user.name}!`);
      if (res.user.role === 'PROFESSOR') {
        navigate('/professor/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials');
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-xl shadow-indigo-600/30 mb-4 transform hover:scale-105 transition-transform">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Academic Nexus</h2>
        <p className="mt-2 text-sm text-slate-400">
          Course Management & Collaborative Assignment Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4 sm:px-0">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
          
          {/* Quick Demo Login Preset Buttons */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                One-Click Demo Evaluator Access
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Password: Password123!</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email)}
                  disabled={loading}
                  className={`text-left p-3 rounded-2xl border transition-all hover:scale-[1.02] flex flex-col justify-between ${acc.color}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold">{acc.badge}</span>
                    </div>
                    <div className="text-xs font-semibold text-white truncate">{acc.name}</div>
                    <div className="text-[10px] opacity-80 mt-0.5 line-clamp-1">{acc.desc}</div>
                  </div>
                  <div className="mt-2 text-[10px] font-medium text-slate-300 flex items-center gap-1">
                    <span>Log in</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-xs text-slate-500 uppercase font-semibold">Or enter credentials</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                University Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all duration-200 hover:scale-[1.01] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              Create student or professor account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
