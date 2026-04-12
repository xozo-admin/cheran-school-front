'use client';

import { FaFileAlt, FaCheckCircle, FaClock, FaExclamationCircle, FaUsers } from 'react-icons/fa';
import { motion } from 'framer-motion';

export const AssignmentStatus = () => {
  const assignments = [
    { id: 1, title: 'Algebra Homework', class: 'Grade 10-A', submitted: 32, total: 35, due: 'Today', status: 'grading', color: 'blue' },
    { id: 2, title: 'Calculus Quiz', class: 'Grade 12-C', submitted: 28, total: 30, due: 'Tomorrow', status: 'submitted', color: 'purple' },
    { id: 3, title: 'Geometry Project', class: 'Grade 11-B', submitted: 25, total: 28, due: 'Dec 15', status: 'pending', color: 'amber' },
    { id: 4, title: 'Statistics Exam', class: 'Grade 10-B', submitted: 30, total: 32, due: 'Dec 18', status: 'graded', color: 'green' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'grading': return <FaClock className="text-amber-500" />;
      case 'submitted': return <FaCheckCircle className="text-blue-500" />;
      case 'pending': return <FaExclamationCircle className="text-red-500" />;
      case 'graded': return <FaCheckCircle className="text-green-500" />;
      default: return <FaFileAlt className="text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'grading': return { bg: 'bg-amber-100', text: 'text-amber-700' };
      case 'submitted': return { bg: 'bg-blue-100', text: 'text-blue-700' };
      case 'pending': return { bg: 'bg-red-100', text: 'text-red-700' };
      case 'graded': return { bg: 'bg-green-100', text: 'text-green-700' };
      default: return { bg: 'bg-slate-100', text: 'text-slate-700' };
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg">
            <FaFileAlt className="text-amber-600 w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Assignment Status</h3>
            <p className="text-xs text-slate-500">Track submissions & grading</p>
          </div>
        </div>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All
        </button>
      </div>
      
      <div className="space-y-4">
        {assignments.map((assignment, index) => {
          const submissionRate = (assignment.submitted / assignment.total) * 100;
          const colors = getStatusColor(assignment.status);
          
          return (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-xl bg-gradient-to-r from-white to-slate-50/50 border border-slate-100 hover:border-blue-200 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    {getStatusIcon(assignment.status)}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                      {assignment.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <FaUsers className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">{assignment.class}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${colors.bg} ${colors.text}`}>
                  {assignment.status}
                </span>
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Submissions</span>
                  <span className="font-medium text-slate-900">
                    {assignment.submitted}/{assignment.total} ({submissionRate.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full rounded-full ${
                      submissionRate > 90 ? 'bg-green-500' :
                      submissionRate > 70 ? 'bg-blue-500' :
                      submissionRate > 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${submissionRate}%` }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <FaClock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">Due: {assignment.due}</span>
                </div>
                <motion.button 
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 rounded-lg hover:from-blue-100 hover:to-blue-200 text-xs font-medium transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {assignment.status === 'graded' ? 'View' : 'Grade'}
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};