import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Sparkles, Calendar, BookOpen, Users, FileText, Check } from 'lucide-react';

export default function CreateAssignmentModal({ isOpen, onClose, onCreated, defaultCourseId }) {
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    course_id: defaultCourseId || '',
    title: '',
    description: '',
    deadline: '',
    submission_type: 'INDIVIDUAL',
    max_score: 100,
  });

  useEffect(() => {
    if (isOpen) {
      fetchCourses();
      if (defaultCourseId) {
        setFormData(prev => ({ ...prev, course_id: defaultCourseId }));
      }
    }
  }, [isOpen, defaultCourseId]);

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await api.get('/courses');
      setCourses(res.courses || []);
      if (!formData.course_id && res.courses?.length > 0) {
        setFormData(prev => ({ ...prev, course_id: res.courses[0].id }));
      }
    } catch (err) {
      toast.error('Failed to load courses for assignment form');
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.course_id || !formData.deadline || !formData.description) {
      toast.warning('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/assignments', formData);
      toast.success('Assignment published successfully!');
      onCreated?.();
      onClose();
      // Reset form
      setFormData({
        course_id: defaultCourseId || (courses[0]?.id || ''),
        title: '',
        description: '',
        deadline: '',
        submission_type: 'INDIVIDUAL',
        max_score: 100,
      });
    } catch (err) {
      toast.error(err.message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Academic Assignment" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Course Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Course <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <select
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none"
              required
            >
              <option value="" disabled>Select a course...</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Assignment Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Distributed Database Architecture Benchmark"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        {/* Submission Type (Individual vs Group) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Submission Type <span className="text-rose-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, submission_type: 'INDIVIDUAL' })}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                formData.submission_type === 'INDIVIDUAL'
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Individual Work</span>
              {formData.submission_type === 'INDIVIDUAL' && <Check className="w-4 h-4 ml-1 text-indigo-400" />}
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, submission_type: 'GROUP' })}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                formData.submission_type === 'GROUP'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Group / Team Work</span>
              {formData.submission_type === 'GROUP' && <Check className="w-4 h-4 ml-1 text-amber-400" />}
            </button>
          </div>
          {formData.submission_type === 'GROUP' && (
            <p className="mt-1.5 text-xs text-amber-400/90 flex items-center gap-1.5">
              <span>👑 In group assignments, the group leader must acknowledge the submission on behalf of all members.</span>
            </p>
          )}
        </div>

        {/* Deadline & Max Score */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Deadline <span className="text-rose-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Max Score / Points
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={formData.max_score}
              onChange={(e) => setFormData({ ...formData, max_score: e.target.value })}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Assignment Details & Guidelines <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows="4"
            placeholder="Explain objectives, deliverables, grading criteria, and submission specifications..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {submitting ? 'Publishing...' : 'Publish Assignment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
