'use client';

import { useState, useEffect } from 'react';
import { FiX, FiBook, FiUsers, FiHelpCircle } from 'react-icons/fi';

interface ClassSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  standard?: any;
  type: 'class' | 'section';
}

export const ClassSectionModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  standard,
  type 
}: ClassSectionModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sectionName: '',
  });

  useEffect(() => {
    if (standard) {
      if (type === 'class') {
        setFormData({
          name: standard.name || '',
          description: standard.description || '',
          sectionName: ''
        });
      } else {
        setFormData({
          name: '',
          description: '',
          sectionName: ''
        });
      }
    } else {
      setFormData({
        name: '',
        description: '',
        sectionName: ''
      });
    }
  }, [standard, type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (type === 'class') {
      onSubmit({
        name: formData.name,
        description: formData.description
      });
    } else {
      onSubmit({
        name: formData.sectionName,
        standard: standard?.id
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {type === 'class' ? (
                    <FiBook className="w-5 h-5 text-blue-600" />
                  ) : (
                    <FiUsers className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {type === 'class' 
                      ? (standard ? 'Edit Class' : 'Add New Class')
                      : `Add Section to Class ${standard?.name}`
                    }
                  </h3>
                  <p className="text-sm text-gray-500">
                    {type === 'class' 
                      ? 'Create a new academic class'
                      : 'Add a new section to this class'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {type === 'class' ? (
                <>
                  {/* Class Name */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class Name *
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-500">
                        <FiHelpCircle className="w-3 h-3" />
                        e.g., 10, 11, 12, LKG, UKG
                      </span>
                    </label>
                    <div className="relative">
                      <FiBook className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter class name"
                        maxLength={10}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Maximum 10 characters
                    </p>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-500">
                        <FiHelpCircle className="w-3 h-3" />
                        Optional description about the class
                      </span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={4}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter class description (e.g., 'Grade 10 Science Stream')"
                      maxLength={500}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {formData.description.length}/500 characters
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Section Info */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Class Information</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          Class {standard?.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {standard?.description || 'No description available'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Existing Sections</p>
                        <p className="text-xl font-bold text-blue-600">
                          {standard?.sections?.length || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section Name */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Section Name *
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-500">
                        <FiHelpCircle className="w-3 h-3" />
                        e.g., A, B, C, or 1, 2, 3
                      </span>
                    </label>
                    <div className="relative">
                      <FiUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={formData.sectionName}
                        onChange={(e) => setFormData({...formData, sectionName: e.target.value})}
                        className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter section name"
                        maxLength={5}
                      />
                    </div>
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">Existing sections in this class:</p>
                      <div className="flex flex-wrap gap-2">
                        {standard?.sections?.map((section: any) => (
                          <span 
                            key={section.id} 
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {section.name}
                          </span>
                        )) || (
                          <span className="text-xs text-gray-500">No sections yet</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Auto-generate multiple sections */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Quick Section Creation
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Add multiple sections at once
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // This is a placeholder - you can implement batch creation
                          const sections = ['A', 'B', 'C'];
                          alert(`Would create sections: ${sections.join(', ')}`);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Add A, B, C Sections
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {type === 'class' 
                    ? (standard ? 'Update Class' : 'Create Class')
                    : 'Add Section'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}