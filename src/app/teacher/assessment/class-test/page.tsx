'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaClipboardList,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSave,
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { teacherApi } from '@/lib/api';
import { toastError, toastInfo, toastSuccess } from '@/lib/toast';

interface TeacherProfile {
  teacher_id?: string;
  name?: string;
  class_name?: string | null;
  section_name?: string | null;
  assigned_class?: string | null;
  handled_subjects?: Record<string, Record<string, string[]>>;
}

interface ClassTest {
  id: number;
  test_name: string;
  max_marks: number;
  term_display?: string;
  class_name: string;
  section_name: string;
  subject_name: string;
  created_at?: string;
}

interface StudentItem {
  student_id: string;
  student_name: string;
  roll_number?: string;
}

interface MarkEntry {
  student_id: string;
  student_name: string;
  marks_obtained: number;
}

interface ExamDropdownItem {
  term_name?: string;
}

const extractApiError = (err: any, fallback: string) =>
  err?.response?.data?.error || err?.response?.data?.detail || err?.message || fallback;

export default function TeacherClassTestPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [tests, setTests] = useState<ClassTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [loadingMarks, setLoadingMarks] = useState(false);

  const [createForm, setCreateForm] = useState({
    class_name: '',
    section: '',
    subject: '',
    term: '',
    test_name: '',
    max_marks: '',
  });

  const [editingTestId, setEditingTestId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ test_name: '', max_marks: '' });

  const [selectedTest, setSelectedTest] = useState<ClassTest | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [marksDraft, setMarksDraft] = useState<Record<string, string>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [handledClasses, setHandledClasses] = useState<Record<string, Record<string, string[]>>>({});

  const getHandledSubjectsMap = useCallback(
    (profile: TeacherProfile | null) => profile?.handled_subjects || {},
    []
  );

  const getTeacherClassList = () => {
    const classes = new Set<string>();
    if (teacherProfile?.handled_subjects) {
      Object.values(teacherProfile.handled_subjects).forEach((classMap) => {
        if (!classMap || typeof classMap !== 'object') return;
        Object.keys(classMap).forEach((cls) => cls && classes.add(cls));
      });
    }
    Object.keys(handledClasses || {}).forEach((cls) => cls && classes.add(cls));
    if (teacherProfile?.class_name) classes.add(teacherProfile.class_name);
    return Array.from(classes).sort();
  };

  const getSectionsForClass = (className: string) => {
    if (!className) return [];
    const sections = new Set<string>();
    const map = getHandledSubjectsMap(teacherProfile);
    Object.values(map).forEach((classMap) => {
      (classMap?.[className] || []).forEach((section) => section && sections.add(section));
    });
    Object.keys(handledClasses?.[className] || {}).forEach((section) => section && sections.add(section));
    if (teacherProfile?.class_name === className && teacherProfile?.section_name) {
      sections.add(teacherProfile.section_name);
    }
    return Array.from(sections).sort();
  };

  const getSubjectsForClassAndSection = (className: string, sectionName: string) => {
    if (!className || !sectionName) return [];
    const subjects = new Set<string>();
    Object.entries(getHandledSubjectsMap(teacherProfile)).forEach(([subjectName, classMap]) => {
      if ((classMap?.[className] || []).includes(sectionName)) {
        subjects.add(subjectName);
      }
    });
    (handledClasses?.[className]?.[sectionName] || []).forEach((subject) => subject && subjects.add(subject));
    return Array.from(subjects).sort();
  };

  const getCardClass = () =>
    combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg',
      get('border', 'primary'),
      theme === 'dark' ? 'bg-gray-900/40' : 'bg-white'
    );

  const getInputClass = () =>
    combine(
      'w-full rounded-lg border px-3 py-2 text-sm bg-transparent',
      get('border', 'primary'),
      get('text', 'primary')
    );

  const getPrimaryButtonClass = () =>
    combine(
      'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
      'text-white shadow-md hover:shadow-lg',
      theme === 'dark'
        ? 'bg-gradient-to-r from-blue-600 to-blue-700'
        : 'bg-gradient-to-r from-blue-500 to-blue-600'
    );

  const getSecondaryButtonClass = () =>
    combine(
      'px-3 py-2 rounded-lg text-sm font-medium border transition-all',
      get('border', 'secondary'),
      get('text', 'secondary'),
      'hover:text-[var(--color-text-primary)]'
    );

  const loadInitialData = useCallback(async () => {
    try {
      setLoadingTests(true);
      const [profileRes, examsRes, testsRes, handledRes] = await Promise.all([
        teacherApi.profile.get(),
        teacherApi.exams.list(),
        teacherApi.classTests.list(),
        teacherApi.request('teacher/my-handled-subjects/'),
      ]);

      const profilePayload: any = profileRes?.data;
      const profile: TeacherProfile | null = profilePayload?.data ?? profilePayload ?? null;
      setTeacherProfile(profile);

      if (profile?.class_name && profile?.section_name) {
        setCreateForm((prev) => ({
          ...prev,
          class_name: profile.class_name || '',
          section: profile.section_name || '',
        }));
      }

      const examsData: ExamDropdownItem[] = examsRes?.data?.data || examsRes?.data || [];
      const termSet = new Set<string>();
      examsData.forEach((exam) => {
        if (exam?.term_name) termSet.add(exam.term_name);
      });
      setAvailableTerms(Array.from(termSet).sort());

      const handledPayload: any = handledRes?.data;
      const handledData = handledPayload?.data || handledPayload || {};
      setHandledClasses(typeof handledData === 'object' && handledData ? handledData : {});

      const testsPayload: any = testsRes?.data;
      const testsList: ClassTest[] = testsPayload?.data || testsPayload || [];
      setTests(Array.isArray(testsList) ? testsList : []);
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to load class test data'));
    } finally {
      setLoadingTests(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleCreateTest = async () => {
    if (!createForm.class_name || !createForm.section || !createForm.subject || !createForm.term || !createForm.test_name || !createForm.max_marks) {
      toastError('Please fill all fields to create a class test.');
      return false;
    }

    try {
      await teacherApi.classTests.create({
        class: createForm.class_name,
        section: createForm.section,
        subject: createForm.subject,
        term: createForm.term,
        test_name: createForm.test_name,
        max_marks: Number(createForm.max_marks),
      });
      toastSuccess('Class test created.');
      setCreateForm((prev) => ({
        ...prev,
        test_name: '',
        max_marks: '',
      }));
      await loadInitialData();
      return true;
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to create class test'));
      return false;
    }
  };

  const handleEdit = (test: ClassTest) => {
    setEditingTestId(test.id);
    setEditForm({ test_name: test.test_name, max_marks: String(test.max_marks) });
  };

  const handleSaveEdit = async (testId: number) => {
    try {
      await teacherApi.classTests.update({
        test_id: testId,
        test_name: editForm.test_name,
        max_marks: Number(editForm.max_marks),
      });
      toastSuccess('Class test updated.');
      setEditingTestId(null);
      await loadInitialData();
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to update class test'));
    }
  };

  const handleDelete = async (testId: number) => {
    if (!window.confirm('Delete this class test and all marks?')) return;
    try {
      await teacherApi.classTests.delete(testId);
      toastSuccess('Class test deleted.');
      if (selectedTest?.id === testId) {
        setSelectedTest(null);
        setStudents([]);
        setMarksDraft({});
      }
      await loadInitialData();
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to delete class test'));
    }
  };

  const loadMarksForTest = async (test: ClassTest) => {
    setSelectedTest(test);
    setLoadingMarks(true);
    try {
      const [studentsRes, marksRes] = await Promise.all([
        teacherApi.studentPortal.list({ class: test.class_name, section: test.section_name }),
        teacherApi.classTestMarks.list(test.id),
      ]);

      const studentsPayload: any = studentsRes?.data?.data || studentsRes?.data || {};
      const studentList: StudentItem[] = Array.isArray(studentsPayload)
        ? studentsPayload
        : Array.isArray(studentsPayload.students)
          ? studentsPayload.students
          : [];
      setStudents(studentList);

      const marksPayload: any = marksRes?.data || {};
      const marksList: MarkEntry[] = marksPayload?.data || [];
      const markMap = new Map<string, number>();
      marksList.forEach((entry) => {
        if (!entry?.student_id) return;
        const raw = entry.marks_obtained as unknown;
        const parsed = typeof raw === 'number' ? raw : Number(raw);
        if (!Number.isNaN(parsed)) {
          markMap.set(entry.student_id, parsed);
        }
      });

      const nextDraft: Record<string, string> = {};
      studentList.forEach((student) => {
        const existing = markMap.get(student.student_id);
        nextDraft[student.student_id] = typeof existing === 'number' ? String(existing) : '';
      });
      setMarksDraft(nextDraft);
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to load marks'));
    } finally {
      setLoadingMarks(false);
    }
  };

  const handleSaveMarks = async () => {
    if (!selectedTest) return;

    const payload = Object.entries(marksDraft)
      .map(([student_id, marks]) => ({
        student_id,
        marks: marks === '' ? NaN : Number(marks),
      }))
      .filter((entry) => !Number.isNaN(entry.marks));

    if (!payload.length) {
      toastInfo('No marks to save.');
      return;
    }

    const invalid = payload.find((entry) => entry.marks < 0 || entry.marks > selectedTest.max_marks);
    if (invalid) {
      toastError(`Marks must be between 0 and ${selectedTest.max_marks}.`);
      return;
    }

    try {
      await teacherApi.classTestMarks.save({
        test_id: selectedTest.id,
        marks_data: payload,
      });
      toastSuccess('Marks saved successfully.');
      await loadMarksForTest(selectedTest);
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to save marks'));
    }
  };

  return (
    <div className={combine('dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6', get('bg', 'primary'))}>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <div className="mb-6 sm:mb-8">
          <div className={combine(
            'rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6',
            theme === 'dark' ? 'bg-gradient-to-r from-blue-700 to-blue-800' : 'bg-gradient-to-r from-blue-500 to-blue-600'
          )}>
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaClipboardList className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Class Test Manager</h1>
                  <p className="text-xs sm:text-sm text-blue-100">
                    {teacherProfile ? `Subject Teacher - ${teacherProfile.name || 'Teacher'}` : 'Loading profile...'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                
                <button
                  className={combine(getPrimaryButtonClass(), 'w-full sm:w-auto justify-center flex items-center gap-2 font-bold')}
                  onClick={() => setShowCreateModal(true)}
                >
                  <FaPlus /> Create Class Test
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={getCardClass()}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={combine('text-lg font-semibold', get('text', 'primary'))}>Your Class Tests</h2>
            {loadingTests && <span className={combine('text-sm', get('text', 'secondary'))}>Loading...</span>}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={combine('bg-gradient-to-r border-b', get('bg', 'secondary'), get('border', 'secondary'))}>
                  <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Test</th>
                  <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Class</th>
                  <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Subject</th>
                  <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Term</th>
                  <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Max Marks</th>
                  <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.length === 0 && (
                  <tr>
                    <td colSpan={6} className={combine('py-4 px-6', get('text', 'secondary'))}>
                      No class tests created yet.
                    </td>
                  </tr>
                )}
                {tests.map((test) => (
                  <tr
                    key={test.id}
                    className={combine('transition-colors border-b hover:bg-[var(--color-bg-hover)]', get('border', 'secondary'))}
                  >
                    <td className="py-4 px-6">
                      {editingTestId === test.id ? (
                        <input
                          className={getInputClass()}
                          value={editForm.test_name}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, test_name: e.target.value }))}
                        />
                      ) : (
                        <div>
                          <div className={combine('font-medium', get('text', 'primary'))}>{test.test_name}</div>
                          <div className={combine('text-xs', get('text', 'secondary'))}>
                            {test.class_name}-{test.section_name} • {test.subject_name}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className={combine('py-4 px-6', get('text', 'secondary'))}>
                      Class {test.class_name} • {test.section_name}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={combine(
                          'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                          get('border', 'secondary'),
                          get('text', 'primary'),
                          'bg-white/40 dark:bg-gray-800/40'
                        )}
                      >
                        {test.subject_name}
                      </span>
                    </td>
                    <td className={combine('py-4 px-6', get('text', 'secondary'))}>
                      {test.term_display || '—'}
                    </td>
                    <td className="py-4 px-6">
                      {editingTestId === test.id ? (
                        <input
                          className={getInputClass()}
                          value={editForm.max_marks}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, max_marks: e.target.value }))}
                          type="number"
                          min="0"
                        />
                      ) : (
                        <span className={combine('font-semibold', get('text', 'primary'))}>{test.max_marks}</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {editingTestId === test.id ? (
                          <button className={getPrimaryButtonClass()} onClick={() => handleSaveEdit(test.id)}>
                            <FaSave className="inline-block mr-1" /> Save
                          </button>
                        ) : (
                          <button className={combine('p-2 rounded-lg transition-colors', get('accent', 'warning'), 'hover:bg-[var(--color-bg-hover)]')} onClick={() => handleEdit(test)}>
                            <FaEdit />
                          </button>
                        )}
                        <button
                          className={combine('p-2 rounded-lg transition-colors', get('accent', 'primary'), 'hover:bg-[var(--color-bg-hover)]')}
                          onClick={() => loadMarksForTest(test)}
                          title="Enter Marks"
                        >
                          <FaClipboardList />
                        </button>
                        <button
                          className={combine('p-2 rounded-lg transition-colors', get('accent', 'error'), 'hover:bg-[var(--color-bg-hover)]')}
                          onClick={() => handleDelete(test.id)}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedTest && (
          <div className={getCardClass()}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className={combine('text-lg font-semibold', get('text', 'primary'))}>
                  Enter Marks: {selectedTest.test_name}
                </h2>
                <p className={combine('text-sm', get('text', 'secondary'))}>
                  {selectedTest.class_name}-{selectedTest.section_name} • {selectedTest.subject_name} • Max {selectedTest.max_marks}
                </p>
              </div>
              <button className={getPrimaryButtonClass()} onClick={handleSaveMarks} disabled={loadingMarks}>
                <FaSave className="inline-block mr-2" /> Save Marks
              </button>
            </div>

            {loadingMarks ? (
              <p className={combine('mt-4 text-sm', get('text', 'secondary'))}>Loading marks...</p>
            ) : students.length === 0 ? (
              <p className={combine('mt-4 text-sm', get('text', 'secondary'))}>No students found for this class.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={combine('bg-gradient-to-r border-b', get('bg', 'secondary'), get('border', 'secondary'))}>
                      <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Student</th>
                      <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Student ID</th>
                      <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr
                        key={student.student_id}
                        className={combine('transition-colors border-b hover:bg-[var(--color-bg-hover)]', get('border', 'secondary'))}
                      >
                        <td className={combine('py-4 px-6', get('text', 'primary'))}>{student.student_name}</td>
                        <td className={combine('py-4 px-6', get('text', 'secondary'))}>{student.student_id}</td>
                        <td className="py-4 px-6">
                          <input
                            className={getInputClass()}
                            type="number"
                            min="0"
                            max={selectedTest.max_marks}
                            value={marksDraft[student.student_id] ?? ''}
                            onChange={(e) =>
                              setMarksDraft((prev) => ({
                                ...prev,
                                [student.student_id]: e.target.value,
                              }))
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className={combine(
          'fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm',
          'bg-black/70'
        )}>
          <div className={combine(
            'rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border shadow-lg',
            get('bg', 'card'),
            get('border', 'primary')
          )}>
            <div className={combine(
              'sticky top-0 border-b px-4 sm:px-6 py-4 flex justify-between items-start gap-4',
              get('bg', 'card'),
              get('border', 'secondary')
            )}>
              <div>
                <h3 className={combine('text-base sm:text-lg font-bold', get('text', 'primary'))}>
                  Create Class Test
                </h3>
                <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                  Set the class, subject, term, and maximum marks.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className={combine('text-2xl leading-none', get('text', 'secondary'), 'hover:opacity-80')}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Class</label>
                  <select
                    value={createForm.class_name}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        class_name: e.target.value,
                        section: '',
                        subject: '',
                      }))
                    }
                    className={getInputClass()}
                  >
                    <option value="">Select Class</option>
                    {getTeacherClassList().map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Section</label>
                  <select
                    value={createForm.section}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, section: e.target.value, subject: '' }))}
                    className={getInputClass()}
                    disabled={!createForm.class_name}
                  >
                    <option value="">Select Section</option>
                    {getSectionsForClass(createForm.class_name).map((sec) => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Subject</label>
                  <select
                    value={createForm.subject}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, subject: e.target.value }))}
                    className={getInputClass()}
                    disabled={!createForm.section}
                  >
                    <option value="">Select Subject</option>
                    {getSubjectsForClassAndSection(createForm.class_name, createForm.section).map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Term</label>
                  {availableTerms.length > 0 ? (
                    <select
                      value={createForm.term}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, term: e.target.value }))}
                      className={getInputClass()}
                    >
                      <option value="">Select Term</option>
                      {availableTerms.map((term) => (
                        <option key={term} value={term}>{term}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={createForm.term}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, term: e.target.value }))}
                      className={getInputClass()}
                      placeholder="Term 1"
                    />
                  )}
                </div>
                <div>
                  <label className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Test Name</label>
                  <input
                    value={createForm.test_name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, test_name: e.target.value }))}
                    className={getInputClass()}
                    placeholder="Unit Test 1"
                  />
                </div>
                <div>
                  <label className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Max Marks</label>
                  <input
                    value={createForm.max_marks}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, max_marks: e.target.value }))}
                    className={getInputClass()}
                    placeholder="50"
                    type="number"
                    min="0"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button className={getSecondaryButtonClass()} onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button
                  className={getPrimaryButtonClass()}
                  onClick={async () => {
                    const ok = await handleCreateTest();
                    if (ok) setShowCreateModal(false);
                  }}
                >
                  <FaSave className="inline-block mr-2" />
                  Save Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
