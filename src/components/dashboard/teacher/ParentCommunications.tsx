'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaComments, FaUserTie, FaEnvelope, FaPhone, FaCalendarAlt, FaReply } from 'react-icons/fa';
import { teacherAPI } from '@/lib/api/teacher';
import { toastError, toastSuccess } from '@/lib/toast';

interface Communication {
  id: string;
  parentName: string;
  studentName: string;
  studentId: string;
  type: 'email' | 'message' | 'meeting' | 'phone';
  subject: string;
  message: string;
  date: string;
  status: 'new' | 'read' | 'replied' | 'scheduled';
  priority: 'low' | 'medium' | 'high';
}

interface ParentCommunicationsProps {
  teacherData: any;
  onSendMessage: () => void;
}

export const ParentCommunications = ({ teacherData, onSendMessage }: ParentCommunicationsProps) => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'replied' | 'scheduled'>('all');

  useEffect(() => {
    loadCommunications();
  }, []);

  const loadCommunications = async () => {
    try {
      setLoading(true);
      
      // Sample communications data
      const sampleCommunications: Communication[] = [
        {
          id: 'COMM001',
          parentName: 'Mr. Sharma',
          studentName: 'Arjun Sharma',
          studentId: 'STU1001',
          type: 'email',
          subject: 'Academic Performance',
          message: 'Concerned about recent test scores',
          date: '2024-01-15',
          status: 'new',
          priority: 'high'
        },
        {
          id: 'COMM002',
          parentName: 'Mrs. Patel',
          studentName: 'Priya Patel',
          studentId: 'STU1002',
          type: 'meeting',
          subject: 'Parent-Teacher Meeting',
          message: 'Request for meeting to discuss progress',
          date: '2024-01-14',
          status: 'scheduled',
          priority: 'medium'
        },
        {
          id: 'COMM003',
          parentName: 'Mr. Kumar',
          studentName: 'Rohan Kumar',
          studentId: 'STU1003',
          type: 'message',
          subject: 'Attendance Issue',
          message: 'Wants to discuss frequent late arrivals',
          date: '2024-01-13',
          status: 'replied',
          priority: 'medium'
        },
        {
          id: 'COMM004',
          parentName: 'Mrs. Gupta',
          studentName: 'Anjali Gupta',
          studentId: 'STU1004',
          type: 'phone',
          subject: 'Homework Concern',
          message: 'Too much homework assigned',
          date: '2024-01-12',
          status: 'new',
          priority: 'low'
        },
        {
          id: 'COMM005',
          parentName: 'Mr. Roy',
          studentName: 'Siddharth Roy',
          studentId: 'STU1005',
          type: 'email',
          subject: 'Behavior Issues',
          message: 'Concerned about classroom behavior',
          date: '2024-01-11',
          status: 'read',
          priority: 'high'
        }
      ];
      
      setCommunications(sampleCommunications);
    } catch (error) {
      console.error('Error loading communications:', error);
      toastError('Failed to load parent communications');
    } finally {
      setLoading(false);
    }
  };

  const filteredCommunications = communications.filter(comm => {
    if (filter === 'all') return true;
    return comm.status === filter;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <FaEnvelope className="w-4 h-4" />;
      case 'message': return <FaComments className="w-4 h-4" />;
      case 'meeting': return <FaCalendarAlt className="w-4 h-4" />;
      case 'phone': return <FaPhone className="w-4 h-4" />;
      default: return <FaEnvelope className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-600';
      case 'message': return 'bg-green-100 text-green-600';
      case 'meeting': return 'bg-purple-100 text-purple-600';
      case 'phone': return 'bg-amber-100 text-amber-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-red-100 text-red-600';
      case 'read': return 'bg-slate-100 text-slate-600';
      case 'replied': return 'bg-green-100 text-green-600';
      case 'scheduled': return 'bg-purple-100 text-purple-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-slate-500';
    }
  };

  const handleReply = (communicationId: string) => {
    onSendMessage();
    setCommunications(prev => prev.map(comm => 
      comm.id === communicationId ? { ...comm, status: 'replied' } : comm
    ));
    toastSuccess('Opening reply interface...');
  };

  const handleMarkAsRead = (communicationId: string) => {
    setCommunications(prev => prev.map(comm => 
      comm.id === communicationId ? { ...comm, status: 'read' } : comm
    ));
    toastSuccess('Marked as read');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-6"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-pink-100 to-pink-200 rounded-lg">
            <FaComments className="text-pink-600 w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">Parent Communications</h3>
            <p className="text-sm text-slate-500">Messages and meeting requests</p>
          </div>
        </div>
        
        <div className="text-sm text-blue-600 font-medium">
          {communications.filter(c => c.status === 'new').length} new messages
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {['all', 'new', 'replied', 'scheduled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab as any)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
              filter === tab
                ? 'bg-blue-100 text-blue-600 font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-1 text-xs">
              ({tab === 'all' ? communications.length : 
                communications.filter(c => c.status === tab).length})
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredCommunications.length > 0 ? (
          filteredCommunications.map((comm, index) => (
            <motion.div
              key={comm.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl border transition-all hover:shadow-sm ${
                comm.status === 'new' 
                  ? 'border-red-200 bg-red-50/30' 
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${getTypeColor(comm.type)}`}>
                      {getTypeIcon(comm.type)}
                      {comm.type.charAt(0).toUpperCase() + comm.type.slice(1)}
                    </span>
                    
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(comm.status)}`}>
                      {comm.status.charAt(0).toUpperCase() + comm.status.slice(1)}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(comm.priority)}`}></div>
                      <span className="text-xs text-slate-500">{comm.priority}</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-semibold text-slate-900 mb-1">{comm.subject}</h4>
                    <p className="text-sm text-slate-600 mb-2">{comm.message}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <FaUserTie className="w-3 h-3" />
                        {comm.parentName}
                      </span>
                      <span>For: {comm.studentName} ({comm.studentId})</span>
                      <span>Date: {formatDate(comm.date)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  {comm.status === 'new' && (
                    <button
                      onClick={() => handleMarkAsRead(comm.id)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-all"
                    >
                      Mark Read
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleReply(comm.id)}
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-1"
                  >
                    <FaReply className="w-3 h-3" />
                    Reply
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="text-slate-400 mb-2">No communications found</div>
            <p className="text-sm text-slate-500">When parents contact you, messages will appear here</p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Total: {communications.length} messages • 
            New: {communications.filter(c => c.status === 'new').length}
          </div>
          <button 
            onClick={() => toastError('Message center coming soon')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Go to Message Center →
          </button>
        </div>
      </div>
    </div>
  );
};