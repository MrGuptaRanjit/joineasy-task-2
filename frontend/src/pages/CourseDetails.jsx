import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import CreateAssignmentModal from '../components/assignments/CreateAssignmentModal';
import { CardSkeleton } from '../components/common/Skeleton';
import { 
  BookOpen, 
  Users, 
  FileText, 
  Calendar, 
  PlusCircle, 
  ArrowLeft, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Layers 
} from 'lucide-react';

export default function CourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isProfessor } = useAuth();
  const toast = useToast();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' | 'students'
  const [createAssignOpen, setCreateAssignOpen] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
  }, [id]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/courses/${id}`);
      setCourse(res.course);
    } catch (err) {
      toast.error('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 rounded-3xl bg-slate-800/60 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <EmptyState
        title="Course Not Found"
        description="The requested course does not exist or you do not have permission to view it."
        actionLabel="Back to Dashboard"
        onAction={() => navigate(isProfessor ? '/professor/dashboard' : '/student/dashboard')}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Previous View</span>
      </button>

      {/* Course Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 border border-slate-800 shadow-xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/30">
                {course.code}
              </span>
              <span className="text-xs font-semibold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg">
                {course.semester}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {course.name}
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              {course.description}
            </p>
          </div>

          {/* Professor / Metadata Card */}
          <div className="glass-panel-subtle p-4 rounded-2xl border border-slate-800 flex items-center gap-3.5 self-start md:self-auto min-w-[220px]">
            <img
              src={course.professor_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${course.professor_name}`}
              alt={course.professor_name}
              className="w-11 h-11 rounded-xl object-cover border border-indigo-500/30"
            />
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Instructor</div>
              <div className="text-sm font-bold text-white leading-tight">{course.professor_name}</div>
              <div className="text-xs text-indigo-400 leading-tight">{course.professor_email}</div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-t border-slate-800 mt-6 pt-4 flex-wrap gap-4">
          <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'assignments'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Assignments ({course.assignments?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'students'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Enrolled Students ({course.students?.length || 0})</span>
            </button>
          </div>

          {isProfessor && (
            <button
              onClick={() => setCreateAssignOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Assignment</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Assignments */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {course.assignments?.length === 0 ? (
            <EmptyState
              title="No Assignments Yet"
              description="There are currently no assignments published for this course."
              actionLabel={isProfessor ? "Create First Assignment" : undefined}
              onAction={() => setCreateAssignOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {course.assignments.map((assign) => (
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
                    <div className={`p-3 rounded-xl border mt-0.5 ${
                      assign.submission_type === 'GROUP'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                    }`}>
                      {assign.submission_type === 'GROUP' ? <Layers className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          assign.submission_type === 'GROUP'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {assign.submission_type === 'GROUP' ? '👥 Group Assignment' : '👤 Individual Task'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Max Score: <span className="text-slate-200 font-semibold">{assign.max_score} pts</span>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white hover:text-indigo-300 transition-colors">
                        {assign.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 max-w-2xl leading-relaxed">
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
        </div>
      )}

      {/* Tab 2: Enrolled Students */}
      {activeTab === 'students' && (
        <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Course Class Roster</h3>
            <span className="text-xs text-slate-400">{course.students?.length || 0} Total Enrolled</span>
          </div>

          <div className="divide-y divide-slate-800">
            {course.students?.map((student) => (
              <div key={student.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <img
                    src={student.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`}
                    alt={student.name}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                  />
                  <div>
                    <div className="text-sm font-bold text-white">{student.name}</div>
                    <div className="text-xs text-slate-400">{student.email}</div>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateAssignmentModal
        isOpen={createAssignOpen}
        onClose={() => setCreateAssignOpen(false)}
        onCreated={() => fetchCourseDetails()}
        defaultCourseId={course.id}
      />
    </div>
  );
}
