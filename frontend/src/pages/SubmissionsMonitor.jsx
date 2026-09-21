import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import ProgressBar from '../components/common/ProgressBar';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import { 
  ArrowLeft, 
  Users, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Award, 
  ExternalLink, 
  Filter, 
  Crown, 
  Check, 
  MessageSquare,
  Search
} from 'lucide-react';

export default function SubmissionsMonitor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Grading Modal State
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [id, activeFilter]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const url = activeFilter === 'ALL'
        ? `/assignments/${id}/submissions`
        : `/assignments/${id}/submissions?status=${activeFilter}`;
      const res = await api.get(url);
      setData(res);
    } catch (err) {
      toast.error('Failed to load submissions monitor data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGradeModal = (item) => {
    setSelectedSubmission(item);
    setGradeInput(item.grade !== null && item.grade !== undefined ? item.grade : '');
    setFeedbackInput(item.feedback || '');
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!selectedSubmission?.submission?.id) {
      toast.warning('Cannot grade an item without an active submission');
      return;
    }

    setSavingGrade(true);
    try {
      await api.post(`/submissions/${selectedSubmission.submission.id}/grade`, {
        grade: gradeInput,
        feedback: feedbackInput
      });
      toast.success('Grade and evaluation feedback recorded!');
      setSelectedSubmission(null);
      await fetchSubmissions();
    } catch (err) {
      toast.error(err.message || 'Failed to save grade');
    } finally {
      setSavingGrade(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-48 rounded-3xl bg-slate-800/60 animate-pulse" />
        <div className="h-64 rounded-3xl bg-slate-800/60 animate-pulse" />
      </div>
    );
  }

  const assignment = data?.assignment;
  const stats = data?.statistics || {
    total_entities: 0,
    submitted_count: 0,
    acknowledged_count: 0,
    pending_count: 0,
    overdue_count: 0,
    submission_rate: 0
  };

  const filterTabs = [
    { key: 'ALL', label: 'All', count: stats.total_entities },
    { key: 'SUBMITTED', label: 'Submitted', count: stats.submitted_count },
    { key: 'ACKNOWLEDGED', label: 'Acknowledged', count: stats.acknowledged_count },
    { key: 'PENDING', label: 'Pending', count: stats.pending_count },
    { key: 'OVERDUE', label: 'Overdue', count: stats.overdue_count },
  ];

  const filteredSubmissions = (data?.submissions || []).filter(item => {
    if (!searchQuery) return true;
    const name = item.type === 'GROUP' ? item.group?.name : item.student?.name;
    const email = item.type === 'GROUP' ? item.group?.leader_email : item.student?.email;
    return name?.toLowerCase().includes(searchQuery.toLowerCase()) || email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Professor Dashboard</span>
      </button>

      {/* Assignment Overview & Analytics */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 border border-purple-500/20 shadow-xl bg-gradient-to-r from-slate-900 via-purple-950/30 to-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 font-mono text-xs font-bold border border-purple-500/30">
                {assignment?.course_code}
              </span>
              <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                assignment?.submission_type === 'GROUP'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              }`}>
                {assignment?.submission_type === 'GROUP' ? '👥 Group Assignment' : '👤 Individual Task'}
              </span>
              <span className="text-xs text-slate-400">
                Max Score: <strong className="text-white">{assignment?.max_score} pts</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {assignment?.title}
            </h1>
            <p className="text-xs text-slate-400">
              Deadline: {new Date(assignment?.deadline).toLocaleString()}
            </p>
          </div>

          {/* Submission Rate Metric Progress */}
          <div className="glass-panel-subtle p-5 rounded-2xl border border-slate-800 min-w-[260px] space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-300 font-bold">
              <span>Overall Completion</span>
              <span className="text-emerald-400 font-mono text-sm">{stats.submission_rate}%</span>
            </div>
            <ProgressBar
              value={stats.submitted_count}
              max={stats.total_entities || 1}
              showPercentage={false}
              color="emerald"
            />
            <div className="flex justify-between text-[11px] text-slate-400 pt-1">
              <span>{stats.submitted_count} of {stats.total_entities} Submitted</span>
              <span className="text-emerald-400">{stats.acknowledged_count} Acknowledged</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === tab.key
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeFilter === tab.key ? 'bg-purple-800 text-purple-100' : 'bg-slate-800 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search student or group name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Submissions Roster List / Table */}
      <div className="glass-panel rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl">
        {filteredSubmissions.length === 0 ? (
          <EmptyState
            title="No Submissions Match Filter"
            description="There are no student or group submissions matching the current filter criteria."
          />
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredSubmissions.map((item) => {
              const isGroupItem = item.type === 'GROUP';
              const hasSub = !!item.submission;

              return (
                <div
                  key={item.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                >
                  {/* Entity Information (Student or Group) */}
                  <div className="flex items-start gap-4">
                    {isGroupItem ? (
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-md">
                        <Users className="w-6 h-6" />
                      </div>
                    ) : (
                      <img
                        src={item.student?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${item.student?.name}`}
                        alt={item.student?.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-700 flex-shrink-0"
                      />
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-white">
                          {isGroupItem ? item.group?.name : item.student?.name}
                        </h4>
                        <StatusBadge status={item.status} size="sm" />
                        {item.grade !== null && item.grade !== undefined && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                            Score: {item.grade}/{assignment.max_score}
                          </span>
                        )}
                      </div>

                      {/* Group Specific Info */}
                      {isGroupItem ? (
                        <div className="text-xs text-slate-400 space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-300/90 font-medium">
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            <span>Leader: {item.group?.leader_name}</span>
                            <span className="text-[10px] text-slate-500">({item.group?.leader_email})</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <span>Members:</span>
                            <span className="text-slate-300">
                              {item.group?.members?.map(m => m.name).join(', ')}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">
                          {item.student?.email}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submission Timestamp & Action Controls */}
                  <div className="flex items-center justify-between md:justify-end gap-6 self-stretch md:self-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-left md:text-right space-y-0.5">
                      {hasSub ? (
                        <>
                          <div className="text-xs text-slate-300 font-medium">
                            Submitted: {new Date(item.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {item.acknowledged_at ? (
                            <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 md:justify-end">
                              <Award className="w-3 h-3" />
                              <span>Acknowledged by {item.acknowledged_by_name || 'Leader'}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-amber-400">
                              Awaiting leader acknowledgment
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-slate-500 italic">
                          No submission recorded yet
                        </div>
                      )}
                    </div>

                    {/* Review Button */}
                    <button
                      onClick={() => handleOpenGradeModal(item)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        hasSub
                          ? 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                      }`}
                    >
                      <span>{hasSub ? 'Review & Grade' : 'View Info'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review & Grade Modal */}
      <Modal
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        title={selectedSubmission?.type === 'GROUP' ? `Submission Review: ${selectedSubmission?.group?.name}` : `Submission Review: ${selectedSubmission?.student?.name}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {/* Submission Details */}
          {selectedSubmission?.submission ? (
            <div className="space-y-4">
              {/* Repository URL */}
              {selectedSubmission.submission.submission_url && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Submitted Repository / Artifact URL
                  </label>
                  <a
                    href={selectedSubmission.submission.submission_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-mono break-all transition-colors"
                  >
                    <span>{selectedSubmission.submission.submission_url}</span>
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  </a>
                </div>
              )}

              {/* Notes / Text */}
              {selectedSubmission.submission.submission_text && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Student Notes & Overview
                  </label>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedSubmission.submission.submission_text}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Submitted At:</span>
                  <strong>{new Date(selectedSubmission.submitted_at).toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Acknowledgment:</span>
                  <strong className={selectedSubmission.acknowledged_at ? 'text-emerald-400' : 'text-amber-400'}>
                    {selectedSubmission.acknowledged_at ? `Acknowledged (${new Date(selectedSubmission.acknowledged_at).toLocaleDateString()})` : 'Pending Leader Acknowledgment'}
                  </strong>
                </div>
              </div>

              {/* Grade Form */}
              <form onSubmit={handleSaveGrade} className="pt-3 border-t border-slate-800 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Award Grade (Max: {assignment?.max_score})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={assignment?.max_score || 100}
                      value={gradeInput}
                      onChange={(e) => setGradeInput(e.target.value)}
                      placeholder="e.g. 95"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Faculty Feedback
                  </label>
                  <textarea
                    rows="3"
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder="Provide constructive feedback for the student or group..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={savingGrade}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-all disabled:opacity-50"
                  >
                    {savingGrade ? 'Saving...' : 'Submit Grade & Feedback'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <Clock className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-sm text-slate-300">This student / group has not submitted their work yet.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
