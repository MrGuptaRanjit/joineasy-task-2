import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import ProgressBar from '../components/common/ProgressBar';
import EmptyState from '../components/common/EmptyState';
import CreateAssignmentModal from '../components/assignments/CreateAssignmentModal';
import CreateCourseModal from '../components/courses/CreateCourseModal';
import { CardSkeleton } from '../components/common/Skeleton';
import { 
  Users, 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Award, 
  PlusCircle, 
  Sparkles, 
  Layers, 
  ArrowRight,
  TrendingUp,
  FolderPlus
} from 'lucide-react';

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createAssignModalOpen, setCreateAssignModalOpen] = useState(false);
  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false);
  const [selectedCourseForAssign, setSelectedCourseForAssign] = useState(null);

  useEffect(() => {
    fetchProfessorData();

    const handleUpdate = () => fetchProfessorData();
    window.addEventListener('assignments:updated', handleUpdate);
    return () => window.removeEventListener('assignments:updated', handleUpdate);
  }, []);

  const fetchProfessorData = async () => {
    try {
      setLoading(true);
      const [coursesRes, assignmentsRes] = await Promise.all([
        api.get('/courses'),
        api.get('/assignments')
      ]);

      setCourses(coursesRes.courses || []);
      setAssignments(assignmentsRes.assignments || []);
    } catch (err) {
      toast.error('Failed to load professor dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  // Analytics Aggregation
  const totalCourses = courses.length;
  const totalStudents = courses.reduce((acc, c) => acc + (c.enrolled_students_count || 0), 0);
  const totalAssignments = assignments.length;
  const totalSubmitted = courses.reduce((acc, c) => acc + (c.total_submissions || 0), 0);
  const totalAcknowledged = courses.reduce((acc, c) => acc + (c.acknowledged_submissions || 0), 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Professor Header Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 border border-purple-500/20 shadow-xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Academic Faculty Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Professor Dashboard: <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-200">{user?.name}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-xl">
              Manage course syllabi, assign individual & group milestones, and monitor student submission acknowledgments.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap self-start md:self-auto">
            <button
              onClick={() => setCreateCourseModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all hover:scale-105"
            >
              <FolderPlus className="w-4 h-4 text-indigo-400" />
              <span>New Course</span>
            </button>
            <button
              onClick={() => {
                setSelectedCourseForAssign(null);
                setCreateAssignModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Assignment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Students"
          value={totalStudents}
          subtitle="Enrolled across courses"
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Assignments"
          value={totalAssignments}
          subtitle="Active curriculum items"
          icon={FileText}
          color="purple"
        />
        <StatCard
          title="Submissions Received"
          value={totalSubmitted}
          subtitle="Submitted by students"
          icon={CheckCircle2}
          color="cyan"
        />
        <StatCard
          title="Acknowledged"
          value={totalAcknowledged}
          subtitle="Finalized submissions"
          icon={Award}
          color="emerald"
        />
      </div>

      {/* Courses Taught Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              Courses You Teach
            </h2>
            <p className="text-xs text-slate-400">Class rosters, assignment completion rates, and curriculum management</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            title="No Courses Found"
            description="You have not created any courses yet. Get started by creating your first course."
            actionLabel="Create First Course"
            onAction={() => setCreateCourseModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course) => {
              const submissionRate = course.assignments_count > 0 && course.enrolled_students_count > 0
                ? Math.min(100, Math.round((course.total_submissions / (course.assignments_count * course.enrolled_students_count)) * 100))
                : 0;

              return (
                <div
                  key={course.id}
                  className="glass-panel rounded-2xl p-5 border border-slate-800 glass-card-hover flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold">
                        {course.code}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                        {course.semester}
                      </span>
                    </div>

                    <h3 
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className="text-base font-bold text-white hover:text-indigo-300 transition-colors cursor-pointer line-clamp-1"
                    >
                      {course.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        {course.enrolled_students_count} Students
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <FileText className="w-3.5 h-3.5 text-purple-400" />
                        {course.assignments_count} Assignments
                      </span>
                    </div>

                    <ProgressBar
                      value={course.total_submissions || 0}
                      max={(course.assignments_count * course.enrolled_students_count) || 1}
                      label="Submission Activity"
                      color="purple"
                    />

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => navigate(`/courses/${course.id}`)}
                        className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-center transition-colors"
                      >
                        View Syllabus
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCourseForAssign(course.id);
                          setCreateAssignModalOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors flex items-center gap-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add Task</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assignments & Submissions Management Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Published Assignments & Submissions Tracking
            </h2>
            <p className="text-xs text-slate-400">Select any assignment to inspect individual and group submissions in real-time</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-16 rounded-xl bg-slate-800/60 animate-pulse" />
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState
            title="No Assignments Published"
            description="You haven't created any assignments yet."
            actionLabel="Create Assignment"
            onAction={() => setCreateAssignModalOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            {assignments.map((assign) => (
              <div
                key={assign.id}
                className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800/80 glass-card-hover flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl border mt-0.5 ${
                    assign.submission_type === 'GROUP' 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                      : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                  }`}>
                    {assign.submission_type === 'GROUP' ? <Layers className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
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
                        {assign.submission_type === 'GROUP' ? '👥 Group Assignment' : '👤 Individual'}
                      </span>
                    </div>

                    <h4 
                      onClick={() => navigate(`/assignments/${assign.id}/monitor`)}
                      className="text-sm font-bold text-white hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      {assign.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {assign.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 self-stretch sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                  <div className="text-left sm:text-right">
                    <div className="text-[11px] text-slate-400">Submissions</div>
                    <div className="text-xs font-semibold text-emerald-400">
                      {assign.total_submissions || 0} Submitted ({assign.acknowledged_count || 0} Ack)
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/assignments/${assign.id}/monitor`)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all hover:scale-105"
                  >
                    <span>Submissions Monitor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateAssignmentModal
        isOpen={createAssignModalOpen}
        onClose={() => setCreateAssignModalOpen(false)}
        onCreated={() => fetchProfessorData()}
        defaultCourseId={selectedCourseForAssign}
      />

      <CreateCourseModal
        isOpen={createCourseModalOpen}
        onClose={() => setCreateCourseModalOpen(false)}
        onCreated={() => fetchProfessorData()}
      />
    </div>
  );
}
