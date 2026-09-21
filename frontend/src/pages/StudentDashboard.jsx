import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import ProgressBar from '../components/common/ProgressBar';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import { CardSkeleton } from '../components/common/Skeleton';
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Award, 
  Calendar, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  UserCheck, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    const handleUpdate = () => fetchDashboardData();
    window.addEventListener('assignments:updated', handleUpdate);
    return () => window.removeEventListener('assignments:updated', handleUpdate);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [coursesRes, assignmentsRes] = await Promise.all([
        api.get('/courses'),
        api.get('/assignments')
      ]);

      setCourses(coursesRes.courses || []);
      setAssignments(assignmentsRes.assignments || []);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate student statistics
  const totalCourses = courses.length;
  const pendingCount = assignments.filter(a => a.submission_status === 'PENDING' || a.submission_status === 'OVERDUE').length;
  const submittedCount = assignments.filter(a => a.submission_status === 'SUBMITTED').length;
  const acknowledgedCount = assignments.filter(a => a.submission_status === 'ACKNOWLEDGED').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 border border-indigo-500/20 shadow-xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Fall 2026 Academic Term</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-100">{user?.name}</span>!
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-xl">
              Here is your active course enrollment overview, submission milestones, and team project status.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => navigate('/assignments')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
            >
              <span>View All Assignments</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Enrolled Courses"
          value={totalCourses}
          subtitle="Active this term"
          icon={BookOpen}
          color="indigo"
        />
        <StatCard
          title="Pending Submissions"
          value={pendingCount}
          subtitle="Action required"
          icon={Clock}
          color="amber"
          badge={pendingCount > 0 ? 'Due soon' : 'All clear'}
        />
        <StatCard
          title="Submitted"
          value={submittedCount}
          subtitle="Under review"
          icon={CheckCircle2}
          color="cyan"
        />
        <StatCard
          title="Acknowledged"
          value={acknowledgedCount}
          subtitle="Verified & final"
          icon={Award}
          color="emerald"
        />
      </div>

      {/* Enrolled Courses Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              My Enrolled Courses
            </h2>
            <p className="text-xs text-slate-400">Click any course card to inspect its assignments and syllabus</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            title="No Enrolled Courses"
            description="You are not enrolled in any academic courses yet."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => navigate(`/courses/${course.id}`)}
                className="glass-panel rounded-2xl p-5 border border-slate-800 glass-card-hover cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-xs font-bold">
                      {course.code}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                      {course.semester}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {course.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3">
                  {/* Professor Info */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-300 font-bold">
                      👨‍🏫
                    </div>
                    <span className="text-xs text-slate-300 font-medium truncate">
                      {course.professor_name}
                    </span>
                  </div>

                  {/* Submission Progress */}
                  <ProgressBar
                    value={course.submitted_count || 0}
                    max={course.assignments_count || 1}
                    label={`${course.submitted_count || 0} of ${course.assignments_count || 0} Completed`}
                    color="indigo"
                  />

                  {/* Upcoming Deadline Pill */}
                  {course.upcoming_deadline && (
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        Next deadline:
                      </span>
                      <span className="text-slate-200 font-medium">
                        {new Date(course.upcoming_deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Assignments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Upcoming Assignments & Projects
          </h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-16 rounded-xl bg-slate-800/60 animate-pulse" />
            <div className="h-16 rounded-xl bg-slate-800/60 animate-pulse" />
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState
            title="No Assignments Found"
            description="You're all caught up! There are no assignments assigned right now."
          />
        ) : (
          <div className="space-y-3">
            {assignments.slice(0, 5).map((assign) => (
              <div
                key={assign.id}
                onClick={() => navigate(`/assignments/${assign.id}`)}
                className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800/80 glass-card-hover cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl border mt-0.5 ${
                    assign.submission_type === 'GROUP' 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                      : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                  }`}>
                    {assign.submission_type === 'GROUP' ? <Layers className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {assign.course_code}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        assign.submission_type === 'GROUP'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {assign.submission_type === 'GROUP' ? '👥 Group Project' : '👤 Individual'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {assign.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
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

                  <StatusBadge status={assign.submission_status} />

                  <ChevronRight className="w-4 h-4 text-slate-500 hidden sm:block" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
