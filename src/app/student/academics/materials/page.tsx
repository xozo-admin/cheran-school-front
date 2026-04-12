// app/student/academics/materials/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  FaBook, 
  FaFilePdf, 
  FaFileWord, 
  FaFilePowerpoint, 
  FaFileImage,
  FaFileAlt,
  FaDownload,
  FaEye,
  FaSearch,
  FaFilter,
  FaFolder,
  FaUserTie,
  FaCalendarAlt,
  FaSpinner,
  FaTimes,
  FaLink,
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { toastError, toastSuccess } from '@/lib/toast';
import { studentApi } from '@/lib/api';

interface StudyMaterial {
  id: number;
  section: string;
  subject_name: string | null;
  subject?: string | null;
  subject_id?: number;
  title: string;
  description: string;
  file: string | null;
  file_type?: string;
  posted_by_name: string;
  created_at: string;
  file_size?: string;
  class_name?: string;
  teacher_name?: string;
  academic_year?: string;
  posted_by?: string;
}

interface Subject {
  id: number;
  name: string;
  code?: string;
  description?: string;
  teacher?: string;
}

export default function StudyMaterialsPage() {
  const [loading, setLoading] = useState(true);
  const [classResources, setClassResources] = useState<StudyMaterial[]>([]);
  const [subjectMaterials, setSubjectMaterials] = useState<StudyMaterial[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<StudyMaterial[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [materialsYear, setMaterialsYear] = useState<string | null>(null);
  const [subjectCarouselPage, setSubjectCarouselPage] = useState(0);
  const [subjectCardsPerPage, setSubjectCardsPerPage] = useState(6);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'class' | 'subject'>('class');
  
  // Student's subjects
  const [studentSubjects, setStudentSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Fetch student's allocated subjects
  const fetchStudentSubjects = async () => {
    try {
      setLoadingSubjects(true);
      console.log('Fetching student subjects...');
      
      const response = await studentApi.subjects.mySubjects();
      const data = response.data?.data || response.data;
      console.log('Student subjects API response:', data);
      
      let subjects: Subject[] = [];
      
      // Handle API response format
      if (data.subjects && Array.isArray(data.subjects)) {
        subjects = data.subjects.map((subject: any) => ({
          id: subject.id,
          name: subject.name,
          code: subject.subject_code
        }));
      } else if (Array.isArray(data)) {
        subjects = data;
      } else if (data.data && Array.isArray(data.data)) {
        subjects = data.data;
      }
      
      console.log('Processed student subjects:', subjects);
      setStudentSubjects(subjects);
      return subjects;
      
    } catch (error: any) {
      console.error('Error fetching student subjects:', error);
      toastError('Error loading subjects');
      return [];
    } finally {
      setLoadingSubjects(false);
    }
  };

  // Fetch study materials
  const extractMaterials = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  };

  const fetchStudyMaterials = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      console.log('Fetching study materials...');
      
      const combinedRes = await studentApi.materials.combined();
      const combinedData = combinedRes.data?.data || combinedRes.data || {};

      const classResults = extractMaterials(combinedData.class_resources || combinedData.classResources || []);
      const subjectResults = extractMaterials(combinedData.subject_materials || combinedData.subjectMaterials || []);
      setMaterialsYear(combinedData.year || combinedData.academic_year || null);

      const resourcesWithType = classResults.map((resource: any) => {
        const subjectName =
          resource.subject_name ||
          resource.subject?.name ||
          resource.subject ||
          resource.subject_title ||
          null;

        return {
          ...resource,
          file_type: resource.file ? getFileType(resource.file) : 'no-file',
          subject_name: subjectName,
          posted_by_name: resource.posted_by_name || resource.posted_by || 'Unknown',
        };
      });

      setClassResources(resourcesWithType);

      const subjectsWithType = subjectResults.map((material: any) => {
        const subjectName =
          material.subject_name ||
          material.subject?.name ||
          material.subject ||
          material.subject_title ||
          material.course?.name ||
          null;

        return {
          ...material,
          file_type: material.file ? getFileType(material.file) : 'no-file',
          subject_name: subjectName,
          posted_by_name: material.posted_by_name || material.posted_by || 'Unknown',
          section: material.section || material.class_section || 'N/A',
          class_name: material.class_name || material.class_level || 'N/A',
          description: material.description || 'No description provided',
          academic_year: material.academic_year || 'N/A',
        };
      });

      console.log('Processed subject materials:', subjectsWithType);
      setSubjectMaterials(subjectsWithType);

    } catch (error) {
      console.error('Error fetching study materials:', error);
      const message = (error as any)?.response?.data?.error || 'Failed to load study materials';
      setErrorMessage(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  const initializeData = async () => {
    try {
      setLoading(true);
      await fetchStudentSubjects();
      await fetchStudyMaterials();
      toastSuccess('Study materials loaded successfully');
    } catch (error) {
      console.error('Error initializing data:', error);
      toastError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    const updateCardsPerPage = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setSubjectCardsPerPage(2);
      } else if (width < 1024) {
        setSubjectCardsPerPage(3);
      } else if (width < 1280) {
        setSubjectCardsPerPage(4);
      } else {
        setSubjectCardsPerPage(6);
      }
    };

    updateCardsPerPage();
    window.addEventListener('resize', updateCardsPerPage);
    return () => window.removeEventListener('resize', updateCardsPerPage);
  }, []);

  // ALWAYS use student's enrolled subjects for filter dropdown
  const getSubjectsForFilter = useMemo(() => {
    console.log('getSubjectsForFilter called - Active tab:', activeTab);
    console.log('Student subjects:', studentSubjects.map(s => s.name));
    
    // Always show student's enrolled subjects regardless of tab or existing materials
    const enrolledSubjectNames = studentSubjects
      .map(subject => subject.name)
      .filter(Boolean) as string[];
    
    console.log('Enrolled subject names for filter:', enrolledSubjectNames);
    return enrolledSubjectNames.sort();
  }, [studentSubjects, activeTab]);

  // Filter materials based on all criteria
  const filterMaterials = useMemo(() => {
    const materials = activeTab === 'class' ? classResources : subjectMaterials;
    
    console.log(`filterMaterials - ${activeTab} tab:`);
    console.log(`- Starting with ${materials.length} materials`);
    console.log(`- Available subjects for filter:`, getSubjectsForFilter);

    let filtered = [...materials];

    // Apply search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(material => {
        return (
          material.title.toLowerCase().includes(searchLower) ||
          material.description.toLowerCase().includes(searchLower) ||
          (material.subject_name && material.subject_name.toString().toLowerCase().includes(searchLower)) ||
          (material.posted_by_name && material.posted_by_name.toLowerCase().includes(searchLower))
        );
      });
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(material => material.file_type === typeFilter);
    }

    // Apply subject filter
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(material => {
        const materialSubject = material.subject_name?.toString().trim();
        const filterSubject = subjectFilter.trim();
        
        // Basic case-insensitive comparison
        const matches = materialSubject?.toLowerCase() === filterSubject.toLowerCase();
        
        if (!matches && materialSubject) {
          console.log(`Subject mismatch: "${materialSubject}" !== "${filterSubject}"`);
        }
        
        return matches;
      });
    }

    console.log(`- After filtering: ${filtered.length} materials remaining`);
    return filtered;
  }, [activeTab, classResources, subjectMaterials, searchTerm, typeFilter, subjectFilter, getSubjectsForFilter]);

  useEffect(() => {
    setFilteredMaterials(filterMaterials);
  }, [filterMaterials]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, typeFilter, subjectFilter]);

  const getFileType = (filename: string) => {
    if (!filename) return 'no-file';
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    if (extension === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(extension)) return 'word';
    if (['ppt', 'pptx'].includes(extension)) return 'powerpoint';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) return 'image';
    if (['mp4', 'avi', 'mov', 'wmv', 'mkv', 'flv', 'webm'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(extension)) return 'audio';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return 'archive';
    if (['txt', 'csv', 'json', 'xml', 'md'].includes(extension)) return 'text';
    if (['xls', 'xlsx'].includes(extension)) return 'excel';
    return 'other';
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf': return <FaFilePdf className="text-red-500" />;
      case 'word': return <FaFileWord className="text-blue-500" />;
      case 'powerpoint': return <FaFilePowerpoint className="text-orange-500" />;
      case 'image': return <FaFileImage className="text-green-500" />;
      case 'video': return <FaFileImage className="text-purple-500" />;
      case 'audio': return <FaFileAlt className="text-pink-500" />;
      case 'archive': return <FaFileAlt className="text-yellow-500" />;
      case 'text': return <FaFileAlt className="text-gray-500" />;
      case 'excel': return <FaFileAlt className="text-green-600" />;
      case 'no-file': return <FaExclamationTriangle className="text-yellow-500" />;
      default: return <FaFileAlt className="text-gray-500" />;
    }
  };

  const getFileTypeLabel = (fileType: string) => {
    switch (fileType) {
      case 'pdf': return 'PDF Document';
      case 'word': return 'Word Document';
      case 'powerpoint': return 'PowerPoint';
      case 'image': return 'Image';
      case 'video': return 'Video';
      case 'audio': return 'Audio';
      case 'archive': return 'Archive';
      case 'text': return 'Text File';
      case 'excel': return 'Excel Spreadsheet';
      case 'no-file': return 'No File Attached';
      default: return 'Other File';
    }
  };

  const getSubjectDisplayName = (subject?: string | null) => {
    if (!subject) return null;
    const trimmed = subject.toString().trim();
    if (!trimmed) return null;
    return trimmed.toLowerCase() === 'general materials' ? 'General' : trimmed;
  };

  const normalizeSubjectName = (subject: string): string => (
    subject
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[()]/g, ' ')
      .replace(/[\/_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );

  const SUBJECT_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
    mathematics: { bg: '#1E40AF', text: '#FFFFFF', border: '#1E40AF' },
    maths: { bg: '#1E40AF', text: '#FFFFFF', border: '#1E40AF' },
    english: { bg: '#B91C1C', text: '#FFFFFF', border: '#B91C1C' },
    science: { bg: '#166534', text: '#FFFFFF', border: '#166534' },
    'general science': { bg: '#166534', text: '#FFFFFF', border: '#166534' },
    'social science': { bg: '#EA580C', text: '#FFFFFF', border: '#EA580C' },
    'social studies': { bg: '#EA580C', text: '#FFFFFF', border: '#EA580C' },
    'computer science': { bg: '#6D28D9', text: '#FFFFFF', border: '#6D28D9' },
    physics: { bg: '#3730A3', text: '#FFFFFF', border: '#3730A3' },
    chemistry: { bg: '#DB2777', text: '#FFFFFF', border: '#DB2777' },
    biology: { bg: '#15803D', text: '#FFFFFF', border: '#15803D' },
    tamil: { bg: '#0F766E', text: '#FFFFFF', border: '#0F766E' },
    hindi: { bg: '#CA8A04', text: '#111827', border: '#CA8A04' },
    sanskrit: { bg: '#78350F', text: '#FFFFFF', border: '#78350F' },
    malayalam: { bg: '#047857', text: '#FFFFFF', border: '#047857' },
    telugu: { bg: '#0891B2', text: '#FFFFFF', border: '#0891B2' },
    kannada: { bg: '#115E59', text: '#FFFFFF', border: '#115E59' },
    urdu: { bg: '#064E3B', text: '#FFFFFF', border: '#064E3B' },
    french: { bg: '#8B5CF6', text: '#FFFFFF', border: '#8B5CF6' },
    accountancy: { bg: '#1E3A8A', text: '#FFFFFF', border: '#1E3A8A' },
    'business studies': { bg: '#7F1D1D', text: '#FFFFFF', border: '#7F1D1D' },
    economics: { bg: '#B45309', text: '#FFFFFF', border: '#B45309' },
    commerce: { bg: '#92400E', text: '#FFFFFF', border: '#92400E' },
    'commerce general': { bg: '#92400E', text: '#FFFFFF', border: '#92400E' },
    history: { bg: '#C2410C', text: '#FFFFFF', border: '#C2410C' },
    geography: { bg: '#365314', text: '#FFFFFF', border: '#365314' },
    civics: { bg: '#334155', text: '#FFFFFF', border: '#334155' },
    'political science': { bg: '#581C87', text: '#FFFFFF', border: '#581C87' },
    psychology: { bg: '#BE185D', text: '#FFFFFF', border: '#BE185D' },
    sociology: { bg: '#4D7C0F', text: '#FFFFFF', border: '#4D7C0F' },
    'physical education': { bg: '#059669', text: '#FFFFFF', border: '#059669' },
    yoga: { bg: '#2DD4BF', text: '#111827', border: '#2DD4BF' },
    art: { bg: '#C026D3', text: '#FFFFFF', border: '#C026D3' },
    drawing: { bg: '#C026D3', text: '#FFFFFF', border: '#C026D3' },
    'art drawing': { bg: '#C026D3', text: '#FFFFFF', border: '#C026D3' },
    music: { bg: '#7C3AED', text: '#FFFFFF', border: '#7C3AED' },
    dance: { bg: '#E11D48', text: '#FFFFFF', border: '#E11D48' },
    'moral science': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'value ed': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'value education': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'moral science value ed': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'environmental studies': { bg: '#4ADE80', text: '#111827', border: '#4ADE80' },
    evs: { bg: '#4ADE80', text: '#111827', border: '#4ADE80' },
  };

  const getSubjectColor = (subject: string) => {
    const normalized = normalizeSubjectName(subject);
    if (SUBJECT_COLOR_MAP[normalized]) return SUBJECT_COLOR_MAP[normalized];

    const cleaned = normalized
      .replace(/\b(subject|theory|practical|lab|core|elective)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (SUBJECT_COLOR_MAP[cleaned]) return SUBJECT_COLOR_MAP[cleaned];

    for (const [key, value] of Object.entries(SUBJECT_COLOR_MAP)) {
      if (cleaned.includes(key) || key.includes(cleaned)) {
        return value;
      }
    }

    return null;
  };

  const getSubjectBadgeStyle = (color: { bg: string; text: string; border: string }) => ({
    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.04) 42%, rgba(0,0,0,0.14) 100%), linear-gradient(135deg, ${color.bg} 0%, ${color.bg} 100%)`,
    borderColor: color.border,
    color: color.text
  });

  const getFileTypes = useMemo(() => {
    const materials = activeTab === 'class' ? classResources : subjectMaterials;
    const types = new Set<string>();
    materials.forEach(material => {
      if (material.file_type) types.add(material.file_type);
    });
    return Array.from(types).sort();
  }, [activeTab, classResources, subjectMaterials]);

  const noFileCount = useMemo(() => {
    return filteredMaterials.filter(material => material.file_type === 'no-file').length;
  }, [filteredMaterials]);

  const totalPages = Math.max(1, Math.ceil(filteredMaterials.length / 10));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * 10;
  const paginatedMaterials = filteredMaterials.slice(startIndex, startIndex + 10);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleDownload = async (material: StudyMaterial) => {
    try {
      if (!material.file) {
        toastError('No file available for download');
        return;
      }
      
      const link = document.createElement('a');
      link.href = material.file;
      link.download = material.title || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toastSuccess(`Downloading: ${material.title}`);
    } catch (error) {
      toastError('Failed to download file');
    }
  };

  const handlePreview = (material: StudyMaterial) => {
    if (!material.file) {
      toastError('No file available for preview');
      return;
    }
    
    const fileType = material.file_type;
    const previewableTypes = ['pdf', 'image', 'text'];
    
    if (previewableTypes.includes(fileType || '')) {
      window.open(material.file, '_blank', 'noopener,noreferrer');
    } else {
      handleDownload(material);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setSubjectFilter('all');
  };

  const subjectCounts = useMemo(() => {
    const totalMaterials = classResources.length + subjectMaterials.length;
    const generalCount = classResources.filter(r => !r.subject_name).length;
    const subjectMap = new Map<string, number>();

    const allMaterials = [...classResources, ...subjectMaterials];
    allMaterials.forEach((material) => {
      const name = material.subject_name?.toString().trim();
      if (!name) return;
      subjectMap.set(name, (subjectMap.get(name) || 0) + 1);
    });

    const subjectItems = Array.from(subjectMap.entries())
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count);

    return { totalMaterials, generalCount, subjectItems };
  }, [classResources, subjectMaterials]);

  const carouselItems = useMemo(() => ([
    { type: 'total' as const, label: 'Total', count: subjectCounts.totalMaterials },
    { type: 'general' as const, label: 'General', count: subjectCounts.generalCount },
    ...subjectCounts.subjectItems.map(item => ({
      type: 'subject' as const,
      label: item.subject,
      count: item.count
    }))
  ]), [subjectCounts]);

  const totalSubjectPages = Math.max(1, Math.ceil(carouselItems.length / subjectCardsPerPage));
  const safeSubjectPage = Math.min(subjectCarouselPage, totalSubjectPages - 1);
  const visibleCarouselItems = carouselItems.slice(
    safeSubjectPage * subjectCardsPerPage,
    safeSubjectPage * subjectCardsPerPage + subjectCardsPerPage
  );
  const carouselFillCount = Math.max(0, subjectCardsPerPage - visibleCarouselItems.length);

  useEffect(() => {
    if (subjectCarouselPage > totalSubjectPages - 1) {
      setSubjectCarouselPage(0);
    }
  }, [subjectCarouselPage, totalSubjectPages]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6">
        <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800">
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaBook className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Study Materials</h1>
                  <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-2">
                    Access all your learning resources in one place
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Subjects</div>
                  <div className="text-sm sm:text-base font-bold">
                    {studentSubjects.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Subject-wise Materials Carousel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <FaBook className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  Subject-wise Materials
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Total and subject distribution of resources
                </p>
              </div>
            </div>
            {carouselItems.length > subjectCardsPerPage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSubjectCarouselPage(prev => Math.max(prev - 1, 0))}
                  disabled={safeSubjectPage === 0}
                  className={`p-2 rounded-lg border transition-all ${
                    safeSubjectPage === 0
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:scale-105'
                  } bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}
                  aria-label="Previous subject cards"
                >
                  <FaChevronLeft className="text-xs sm:text-sm text-gray-700 dark:text-gray-300" />
                </button>
                <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                  {safeSubjectPage + 1}/{totalSubjectPages}
                </span>
                <button
                  onClick={() => setSubjectCarouselPage(prev => Math.min(prev + 1, totalSubjectPages - 1))}
                  disabled={safeSubjectPage === totalSubjectPages - 1}
                  className={`p-2 rounded-lg border transition-all ${
                    safeSubjectPage === totalSubjectPages - 1
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:scale-105'
                  } bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}
                  aria-label="Next subject cards"
                >
                  <FaChevronRight className="text-xs sm:text-sm text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            <div className="flex flex-nowrap gap-2 sm:gap-3 w-full">
              {carouselItems.length > 0 ? visibleCarouselItems.map((item) => {
                const subjectColor = item.type === 'subject' ? getSubjectColor(item.label) : null;
                const badgeClass = item.type === 'total'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                  : item.type === 'general'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';

                return (
                  <div
                    key={`${item.type}-${item.label}`}
                    className={`flex-1 min-w-0 rounded-lg sm:rounded-xl p-2 sm:p-3 border shadow-sm hover:shadow-md transition-all hover:scale-[1.02] ${
                      subjectColor ? '' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                    style={subjectColor ? getSubjectBadgeStyle(subjectColor) : undefined}
                  >
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <span className={`font-bold text-xs sm:text-sm truncate ${subjectColor ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        {item.label}
                      </span>
                      {subjectColor && item.type === 'subject' ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold border border-white/40 bg-white/20 text-white"
                        >
                          {item.count}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold border ${badgeClass}`}>
                          {item.count}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs ${subjectColor ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                      {item.type === 'total'
                        ? 'all materials'
                        : item.type === 'general'
                          ? 'no subject'
                          : `material${item.count !== 1 ? 's' : ''}`}
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-4 sm:py-6 md:py-8 text-gray-600 dark:text-gray-400 w-full">
                  <p className="text-xs sm:text-sm font-medium">No subject materials available</p>
                  <p className="text-xs mt-1">Subject distribution will appear once materials are available.</p>
                </div>
              )}
              {carouselItems.length > 0 && carouselFillCount > 0 && (
                Array.from({ length: carouselFillCount }).map((_, idx) => (
                  <div
                    key={`carousel-fill-${idx}`}
                    className="flex-1 min-w-0 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-transparent opacity-0 pointer-events-none"
                    aria-hidden="true"
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab('class');
                setSubjectFilter('all');
              }}
              className={`flex-1 min-w-fit py-3 px-4 text-center font-medium transition-colors ${
                activeTab === 'class'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaFolder />
                Class Resources ({classResources.length})
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('subject');
                setSubjectFilter('all');
              }}
              className={`flex-1 min-w-fit py-3 px-4 text-center font-medium transition-colors ${
                activeTab === 'subject'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 dark:text-gray-color hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaBook />
                Subject Materials ({subjectMaterials.length})
              </div>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            
            
            {(searchTerm || typeFilter !== 'all' || subjectFilter !== 'all') && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                <FaTimes /> Clear Filters
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Title, subject, description..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Subject Filter */}
            <div>
              
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">
                  All Subjects ({studentSubjects.length})
                </option>
                {studentSubjects.map(subject => (
                  <option key={subject.id} value={subject.name}>
                    {subject.name} {subject.code && `(${subject.code})`}
                  </option>
                ))}
              </select>
              
            </div>

            {/* Type Filter */}
            <div>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All File Types ({getFileTypes.length})</option>
                {getFileTypes.map(type => (
                  <option key={type} value={type}>
                    {getFileTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>

            

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 rounded-lg p-1 w-fit">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                List View
              </button>
            </div>
          </div>
        </div>

        {/* Materials Grid/List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <FaSpinner className="text-3xl text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">Loading study materials...</p>
            </div>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <FaBook className="text-5xl text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {errorMessage ? 'Unable to load materials' : 'No study materials found'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
              {errorMessage
                ? errorMessage
                : searchTerm || typeFilter !== 'all' || subjectFilter !== 'all'
                  ? 'Try adjusting your filters or search terms'
                  : activeTab === 'class'
                    ? 'No class resources available for your enrolled subjects'
                    : 'No subject materials available for your enrolled subjects'}
            </p>
            {errorMessage && (
              <button
                onClick={initializeData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Try Again
              </button>
            )}
            {studentSubjects.length === 0 ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 max-w-md mx-auto">
                <p className="text-yellow-700 dark:text-yellow-400 text-sm">
                  <strong>Note:</strong> You are not enrolled in any subjects.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 max-w-md mx-auto">
                <p className="text-blue-700 dark:text-blue-400 text-sm">
                  <strong>Your Enrolled Subjects:</strong> {studentSubjects.map(s => s.name).join(', ')}
                </p>
                <p className="text-blue-600 dark:text-blue-300 text-xs mt-1">
                  Select "All Subjects" or choose a specific subject to see materials
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
                {paginatedMaterials.map(material => (
                  <div
                    key={material.id}
                    className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 ${
                      material.subject_name && getSubjectColor(material.subject_name)
                        ? 'border-transparent'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                    style={
                      material.subject_name && getSubjectColor(material.subject_name)
                        ? getSubjectBadgeStyle(getSubjectColor(material.subject_name)!)
                        : undefined
                    }
                  >
                    {/* File Type Header */}
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          
                          <div>
                            {getSubjectDisplayName(material.subject_name) ? (
                              <div className="flex items-center gap-1 flex-wrap">
                                {(() => {
                                  const color = getSubjectColor(material.subject_name || '');
                                  const displayName = getSubjectDisplayName(material.subject_name);
                                  if (color) {
                                    return (
                                      <span
                                        className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold border"
                                        style={getSubjectBadgeStyle(color)}
                                      >
                                        {displayName}
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                      {displayName}
                                    </span>
                                  );
                                })()}
                                
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">General</span>
                            )}
                          </div>
                        </div>
                        {material.academic_year && (
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            {material.academic_year}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mt-3">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 text-sm">
                        {material.title}
                      </h3>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-xs mb-3 line-clamp-2">
                        {material.description}
                      </p>

                      {/* Metadata */}
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                          <FaUserTie className="text-purple-500 flex-shrink-0" />
                          <span className="truncate">Posted by: {material.posted_by_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                          <FaCalendarAlt className="text-blue-500 flex-shrink-0" />
                          <span>{formatDate(material.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                          <FaFolder className="text-green-500 flex-shrink-0" />
                          <span>Class: {material.class_name} - Section: {material.section}</span>
                        </div>
                        {!material.file && (
                          <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                            <FaExclamationTriangle />
                            <span className="text-xs">No file attached. Contact teacher for details.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4">
                      <div className="flex gap-2">
                        {material.file ? (
                          <>
                            <button
                              onClick={() => handlePreview(material)}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-1.5 transition-colors text-xs"
                            >
                              <FaEye size={12} /> Preview
                            </button>
                            <button
                              onClick={() => handleDownload(material)}
                              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 text-xs"
                            >
                              <FaDownload size={12} /> Download
                            </button>
                          </>
                        ) : (
                          <button
                            disabled
                            className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-lg flex items-center justify-center gap-1.5 text-xs cursor-not-allowed"
                          >
                            <FaLink size={12} /> No File Available
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Material
                      </th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Posted
                      </th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedMaterials.map(material => {
                      const subjectColor = material.subject_name ? getSubjectColor(material.subject_name) : null;
                      const subjectDisplayName = getSubjectDisplayName(material.subject_name);
                      return (
                        <tr key={material.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white dark:bg-gray-800 rounded-md shadow border border-gray-200 dark:border-gray-700">
                                {getFileIcon(material.file_type || 'other')}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900 dark:text-white truncate max-w-md">
                                  {material.title}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                  {material.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {subjectDisplayName ? (
                              subjectColor ? (
                                <span
                                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border"
                                  style={getSubjectBadgeStyle(subjectColor)}
                                >
                                  {subjectDisplayName}
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                  {subjectDisplayName}
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-gray-500 dark:text-gray-400">General</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {getFileTypeLabel(material.file_type || 'other')}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {formatDate(material.created_at)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              {material.posted_by_name}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              {material.file ? (
                                <>
                                  <button
                                    onClick={() => handlePreview(material)}
                                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1.5 transition-colors text-xs"
                                  >
                                    <FaEye size={12} /> Preview
                                  </button>
                                  <button
                                    onClick={() => handleDownload(material)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 transition-all duration-200 text-xs"
                                  >
                                    <FaDownload size={12} /> Download
                                  </button>
                                </>
                              ) : (
                                <button
                                  disabled
                                  className="px-3 py-1.5 bg-gray-500 text-white rounded-lg flex items-center gap-1.5 text-xs cursor-not-allowed"
                                >
                                  <FaLink size={12} /> No File
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Page {safePage} of {totalPages}
                  </p>
                  <div className="flex items-center space-x-1 sm:space-x-1.5">
                    <button
                      onClick={() => handlePageChange(safePage - 1)}
                      disabled={safePage === 1}
                      className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                      aria-label="Previous page"
                    >
                      <FaChevronLeft className="text-xs" />
                    </button>

                    <div className="flex space-x-0.5 sm:space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (safePage <= 3) {
                          pageNum = i + 1;
                        } else if (safePage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = safePage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs ${
                              safePage === pageNum
                                ? 'bg-blue-600 text-white border border-blue-600'
                                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                            }`}
                            aria-label={`Go to page ${pageNum}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(safePage + 1)}
                      disabled={safePage === totalPages}
                      className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                      aria-label="Next page"
                    >
                      <FaChevronRight className="text-xs" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Footer */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                    Materials Summary
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Showing {paginatedMaterials.length} of {filteredMaterials.length} filtered materials (total {activeTab === 'class' ? classResources.length : subjectMaterials.length})
                    {subjectFilter !== 'all' && ` • Filtered by: ${subjectFilter}`}
                    {noFileCount > 0 && ` • ${noFileCount} without files`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="text-gray-600 dark:text-gray-400">
                    <span className="font-semibold">Your Subjects:</span> {studentSubjects.length}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    <span className="font-semibold">File Types:</span> {getFileTypes.length}
                  </div>
                  <div className="text-blue-600 dark:text-blue-400">
                    <span className="font-semibold">Active:</span> {activeTab === 'class' ? 'Class Resources' : 'Subject Materials'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      </main>
    </div>
  );
}
