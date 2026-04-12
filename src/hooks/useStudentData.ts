import { useState, useEffect } from 'react';
import { studentApi } from '@/lib/api/student';

export const useStudentProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await studentApi.getProfile();
      setProfile(data.data || data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  return { profile, loading, error, refetch: fetchProfile };
};

export const useTimetable = () => {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const data = await studentApi.getTimetable();
      setTimetable(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch timetable');
    } finally {
      setLoading(false);
    }
  };

  return { timetable, loading, error, refetch: fetchTimetable };
};

export const useAttendance = () => {
  const [attendance, setAttendance] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const data = await studentApi.getAttendance();
      setAttendance(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  return { attendance, loading, error, refetch: fetchAttendance };
};

export const useAssignments = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await studentApi.getAssignments();
      setAssignments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  return { assignments, loading, error, refetch: fetchAssignments };
};

export const useGrades = () => {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const data = await studentApi.getGrades();
      setGrades(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch grades');
    } finally {
      setLoading(false);
    }
  };

  return { grades, loading, error, refetch: fetchGrades };
};

export const useSubjects = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const data = await studentApi.getSubjects();
      setSubjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  return { subjects, loading, error, refetch: fetchSubjects };
};

// export const useClassmates = (class_name?: string, section?: string) => {
//   const [classmates, setClassmates] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     fetchClassmates();
//   }, [class_name, section]);

//   const fetchClassmates = async () => {
//     try {
//       setLoading(true);
//       const data = await studentApi.getClassmates(class_name, section);
//       setClassmates(data.students || data);
//     } catch (err: any) {
//       setError(err.message || 'Failed to fetch classmates');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return { classmates, loading, error, refetch: fetchClassmates };
// };