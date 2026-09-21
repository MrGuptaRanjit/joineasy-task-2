import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import ProgressBar from '../components/common/ProgressBar';
import EmptyState from '../components/common/EmptyState';
import CreateCourseModal from '../components/courses/CreateCourseModal';
import { CardSkeleton } from '../components/common/Skeleton';
import { 
  BookOpen, 
  Users, 
  FileText, 
  PlusCircle, 
  Search, 
  ArrowRight 
} from 'lucide-react';

export default function CoursesList() {
  const navigate = useNavigate();
  const { isProfessor } = useAuth();
  const toast = useToast();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/courses');
      setCourses(res.courses || []);
    } catch (err) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const filtered = courses.filter((c) => {
    return !searchQuery || 
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.professor_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            {isProfessor ? 'Academic Courses Taught' : 'My Enrolled Courses'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isProfessor 
              ? 'Manage course curricula, student rosters, and assign deliverables' 
              : 'Browse your active university courses, instructors, and assignments'}
          </p>
        </div>

        {isProfessor && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Course</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by course code, title, or professor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Courses Found"
          description="There are no courses matching your search criteria."
          actionLabel={isProfessor ? "Create Course" : undefined}
          onAction={() => setCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course) => (
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
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400 truncate">
                    👨‍🏫 {course.professor_name}
                  </span>
                  <span className="flex items-center gap-1 text-indigo-300 font-semibold">
                    {course.assignments_count || 0} Tasks
                  </span>
                </div>

                {!isProfessor && (
                  <ProgressBar
                    value={course.submitted_count || 0}
                    max={course.assignments_count || 1}
                    label={`${course.submitted_count || 0} of ${course.assignments_count || 0} Completed`}
                    color="indigo"
                  />
                )}

                <div className="flex items-center justify-end text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 pt-1">
                  <span>View Syllabus & Tasks</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateCourseModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => fetchCourses()}
      />
    </div>
  );
}
