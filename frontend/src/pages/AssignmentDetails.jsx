import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import ProgressBar from '../components/common/ProgressBar';
import EmptyState from '../components/common/EmptyState';
import { 
  ArrowLeft, 
  Layers, 
  BookOpen, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Award, 
  ExternalLink, 
  Users, 
  Crown, 
  Send, 
  ShieldCheck, 
  AlertCircle,
  FileCode,
  Sparkles,
  Check
} from 'lucide-react';

export default function AssignmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isProfessor } = useAuth();
  const toast = useToast();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  const [submissionText, setSubmissionText] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');

  useEffect(() => {
    fetchAssignment();
  }, [id]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/assignments/${id}`);
      setAssignment(res.assignment);

      // Pre-fill submission inputs if exists
      if (res.assignment.my_submission) {
        setSubmissionText(res.assignment.my_submission.submission_text || '');
        setSubmissionUrl(res.assignment.my_submission.submission_url || '');
      }
    } catch (err) {
      toast.error('Failed to load assignment details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!submissionText && !submissionUrl) {
      toast.warning('Please provide project submission details or a repository URL');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/assignments/${id}/submit`, {
        submission_text: submissionText,
        submission_url: submissionUrl
      });
      toast.success(res.message || 'Work submitted successfully!');
      await fetchAssignment();
    } catch (err) {
      toast.error(err.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!assignment.my_submission?.id) {
      toast.warning('No active submission to acknowledge');
      return;
    }

    setAcknowledging(true);
    try {
      const res = await api.post(`/submissions/${assignment.my_submission.id}/acknowledge`);
      toast.success(res.message || 'Submission acknowledged successfully!');
      await fetchAssignment();
    } catch (err) {
      toast.error(err.message || 'Failed to acknowledge submission');
    } finally {
      setAcknowledging(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 rounded-3xl bg-slate-800/60 animate-pulse" />
        <div className="h-64 rounded-3xl bg-slate-800/60 animate-pulse" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <EmptyState
        title="Assignment Not Found"
        description="The assignment requested does not exist."
        actionLabel="Back to Dashboard"
        onAction={() => navigate(isProfessor ? '/professor/dashboard' : '/student/dashboard')}
      />
    );
  }

  const submission = assignment.my_submission;
  const isGroup = assignment.submission_type === 'GROUP';
  const userGroup = assignment.user_group;
  const isLeader = userGroup ? userGroup.leader_id === user.id : false;
  const isAcknowledged = submission?.status === 'ACKNOWLEDGED';
  const isSubmitted = submission?.status === 'SUBMITTED' || isAcknowledged;

  // Calculate Progress Percentage (0 = Not submitted, 50 = Submitted waiting ack, 100 = Acknowledged)
  let progressPercentage = 0;
  if (isAcknowledged) progressPercentage = 100;
  else if (isSubmitted) progressPercentage = 60;
  else progressPercentage = 15;

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Navigation header */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Course / Assignments</span>
      </button>

      {/* Assignment Header Card */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 border border-slate-800 shadow-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/30">
                {assignment.course_code}
              </span>
              <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                isGroup 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              }`}>
                {isGroup ? '👥 Group Project' : '👤 Individual Task'}
              </span>
              <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg">
                Points: <strong className="text-white">{assignment.max_score}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {assignment.title}
            </h1>
            <p className="text-xs text-indigo-400 font-medium">
              Course: {assignment.course_name} • Instructor: {assignment.professor_name}
            </p>
          </div>

          {/* Deadline & Status Pill */}
          <div className="glass-panel-subtle p-4 rounded-2xl border border-slate-800 flex flex-col items-start md:items-end gap-2 self-start md:self-auto min-w-[200px]">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Deadline:</span>
            </div>
            <div className="text-sm font-bold text-white">
              {new Date(assignment.deadline).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <StatusBadge status={submission?.status || 'PENDING'} size="lg" />
          </div>
        </div>

        {/* Multi-step Visual Progress Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Submission Workflow Progress
            </span>
            <span className="text-indigo-300 font-mono">{progressPercentage}% Completed</span>
          </div>

          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${
                isAcknowledged
                  ? 'from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/30'
                  : isSubmitted
                  ? 'from-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/30'
                  : 'from-amber-500 to-amber-600'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center mt-3 text-[11px] font-semibold">
            <div className={`p-1.5 rounded-lg ${progressPercentage >= 15 ? 'text-indigo-300 bg-indigo-500/10' : 'text-slate-500'}`}>
              1. Assignment Issued
            </div>
            <div className={`p-1.5 rounded-lg ${isSubmitted ? 'text-indigo-300 bg-indigo-500/10 font-bold' : 'text-slate-500'}`}>
              2. Work Submitted {isSubmitted && '✓'}
            </div>
            <div className={`p-1.5 rounded-lg ${isAcknowledged ? 'text-emerald-300 bg-emerald-500/10 font-bold' : 'text-slate-500'}`}>
              3. Acknowledged {isAcknowledged && '✓'}
            </div>
          </div>
        </div>
      </div>

      {/* Group Details & Team Membership (Only for Group Assignments) */}
      {isGroup && (
        <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-amber-500/20 bg-gradient-to-br from-slate-900 via-amber-950/10 to-slate-900">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-md">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase font-bold tracking-wider text-amber-400">Team Workspace</div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {userGroup ? userGroup.name : 'Unassigned Group'}
                </h3>
              </div>
            </div>

            {/* User role status in group */}
            {userGroup && (
              <div>
                {isLeader ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>You are the Group Leader</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Group Member (Leader: {userGroup.leader_name})</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {userGroup ? (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Team Members ({userGroup.members?.length || 0})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {userGroup.members?.map((member) => {
                  const isMemLeader = member.id === userGroup.leader_id;
                  const isCurrent = member.id === user.id;

                  return (
                    <div
                      key={member.id}
                      className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                        isMemLeader 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                          : 'bg-slate-900/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <img
                        src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`}
                        alt={member.name}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-700"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                          <span>{member.name}</span>
                          {isCurrent && <span className="text-[10px] text-indigo-400 font-mono">(You)</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          {isMemLeader ? (
                            <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                              <Crown className="w-3 h-3" /> Group Leader
                            </span>
                          ) : (
                            <span>Collaborator</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Group Acknowledgment Protocol Banner */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-white">Group Acknowledgment Rule:</strong> Any group member can contribute code or submit the project. However, only the designated <strong>Group Leader ({userGroup.leader_name})</strong> has authority to officially acknowledge and finalize the submission. When acknowledged by the leader, the verified state is instantaneously reflected for all group members and the course professor.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              ⚠️ You have not been assigned to a group for this assignment yet. Please contact your instructor or join a group.
            </div>
          )}
        </div>
      )}

      {/* Assignment Objectives & Guidelines */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-3">
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          Assignment Instructions & Requirements
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {assignment.description}
        </p>
      </div>

      {/* Submission & Acknowledgment Panel (For Students) */}
      {!isProfessor && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-400" />
                Deliverable Submission Form
              </h3>
              <p className="text-xs text-slate-400">
                {isGroup ? 'Submit on behalf of your group' : 'Submit your individual project'}
              </p>
            </div>

            <StatusBadge status={submission?.status || 'PENDING'} />
          </div>

          <form onSubmit={handleSubmitWork} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                GitHub Repository / Project URL
              </label>
              <input
                type="url"
                placeholder="https://github.com/organization/academic-project"
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
                disabled={isAcknowledged}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Submission Notes & Documentation
              </label>
              <textarea
                rows="4"
                placeholder="Describe your implementation, architecture decisions, API test results, or links to deployed demos..."
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                disabled={isAcknowledged}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>

            {!isAcknowledged && (
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Saving Submission...' : isSubmitted ? 'Update Submission' : 'Submit Assignment'}</span>
                </button>
              </div>
            )}
          </form>

          {/* Acknowledgment Action Panel */}
          {isSubmitted && (
            <div className={`p-5 rounded-2xl border transition-all ${
              isAcknowledged
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 shadow-xl shadow-emerald-950/20'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {isAcknowledged ? (
                      <>
                        <Award className="w-5 h-5 text-emerald-400" />
                        <span className="text-white">Submission Officially Acknowledged & Verified! ✓</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-5 h-5 text-amber-400" />
                        <span className="text-white">Submitted — Awaiting Final Acknowledgment</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs opacity-80 leading-relaxed">
                    {isAcknowledged ? (
                      <span>
                        Acknowledged by <strong>{submission.acknowledged_by_name || 'Group Leader'}</strong> on {new Date(submission.acknowledged_at).toLocaleString()}. Status is synced across all group members.
                      </span>
                    ) : isGroup ? (
                      isLeader ? (
                        <span>You are the Group Leader. Please click the button to officially acknowledge and finalize this submission for your team.</span>
                      ) : (
                        <span>Your team has submitted. Waiting for group leader <strong>{userGroup?.leader_name}</strong> to acknowledge.</span>
                      )
                    ) : (
                      <span>Click to acknowledge and confirm this submission.</span>
                    )}
                  </p>
                </div>

                {/* Acknowledgment Trigger Button */}
                {!isAcknowledged && (
                  <div>
                    {isGroup && !isLeader ? (
                      <button
                        disabled
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed flex items-center gap-2"
                        title="Only the Group Leader has permission to acknowledge this submission"
                      >
                        <Crown className="w-4 h-4 text-amber-500/50" />
                        <span>Leader Acknowledgment Required</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleAcknowledge}
                        disabled={acknowledging}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{acknowledging ? 'Acknowledging...' : 'Acknowledge Submission'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Professor Grade / Feedback (if available) */}
          {submission?.grade !== null && submission?.grade !== undefined && (
            <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Faculty Evaluation</span>
                <span className="text-sm font-extrabold text-white px-3 py-1 rounded-xl bg-indigo-600/30 border border-indigo-500/40">
                  Score: {submission.grade} / {assignment.max_score}
                </span>
              </div>
              {submission.feedback && (
                <p className="text-xs text-slate-300 mt-2 italic bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  "{submission.feedback}"
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* If Professor is viewing, offer direct link to Submissions Monitoring screen */}
      {isProfessor && (
        <div className="glass-panel rounded-3xl p-6 border border-purple-500/30 bg-purple-950/20 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h4 className="text-base font-bold text-white">Faculty Submissions Review</h4>
            <p className="text-xs text-slate-400">View enrolled student submissions, track leader acknowledgments, and enter grades.</p>
          </div>
          <button
            onClick={() => navigate(`/assignments/${assignment.id}/monitor`)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
          >
            <span>Open Submissions Monitor</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
