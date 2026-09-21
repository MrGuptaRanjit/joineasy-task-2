import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import CreateAssignmentModal from '../components/assignments/CreateAssignmentModal';
import { CardSkeleton } from '../components/common/Skeleton';
import { 
  FileText, 
  Layers, 
  PlusCircle, 
  Filter, 
  Search, 
  ChevronRight, 
  Clock, 
  BookOpen 
} from 'lucide-react';

export default function AssignmentsList() {
  const navigate = useNavigate();
  const { isProfessor } = useAuth();
  const toast = useToast();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'INDIVIDUAL' | 'GROUP'
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/assignments');
      setAssignments(res.assignments || []);
    } catch (err) {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const filtered = assignments.filter((assign) => {
    const matchesType = filterType === 'ALL' || assign.submission_type === filterType;
    const matchesSearch = !searchQuery || 
      assign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assign.course_code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-400" />
            Academic Assignments & Projects
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isProfessor 
              ? 'Manage curriculum assignments, track student deliverables, and review grading' 
              : 'Track your upcoming milestones, group projects, and submission verifications'}
          </p>
        </div>

        {isProfessor && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Assignment</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['ALL', 'INDIVIDUAL', 'GROUP'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === type
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {type === 'ALL' ? 'All Types' : type === 'INDIVIDUAL' ? '👤 Individual' : '👥 Group'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by title or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Assignment List */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-20 rounded-2xl bg-slate-800/60 animate-pulse" />
          <div className="h-20 rounded-2xl bg-slate-800/60 animate-pulse" />
          <div className="h-20 rounded-2xl bg-slate-800/60 animate-pulse" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Assignments Found"
          description="There are no assignments matching your search criteria."
          actionLabel={isProfessor ? "Create Assignment" : undefined}
          onAction={() => setCreateModalOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((assign) => (
            <div
              key={assign.id}
              onClick={() => {
                if (isProfessor) {
                  navigate(`/assignments/${assign.id}/monitor`);
                } else {
                  navigate(`/assignments/${assign.id}`);
                }
              }}
              className="glass-panel rounded-2xl p-5 border border-slate-800/80 glass-card-hover cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl border mt-0.5 ${
                  assign.submission_type === 'GROUP'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                }`}>
                  {assign.submission_type === 'GROUP' ? <Layers className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                      {assign.course_code}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      assign.submission_type === 'GROUP'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {assign.submission_type === 'GROUP' ? '👥 Group Project' : '👤 Individual'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Max Score: <strong className="text-slate-200">{assign.max_score} pts</strong>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white hover:text-indigo-300 transition-colors">
                    {assign.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1 max-w-2xl">
                    {assign.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 self-stretch sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                <div className="text-left sm:text-right">
                  <div className="text-[11px] text-slate-400">Due Date</div>
                  <div className="text-xs font-semibold text-slate-200">
                    {new Date(assign.deadline).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {isProfessor ? (
                  <div className="text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    {assign.total_submissions || 0} Submissions
                  </div>
                ) : (
                  <StatusBadge status={assign.submission_status} />
                )}

                <ChevronRight className="w-4 h-4 text-slate-500 hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateAssignmentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => fetchAssignments()}
      />
    </div>
  );
}
