'use client';

import { useState } from 'react';
import { FaUpload, FaTimes, FaFileCsv, FaCheck, FaExclamationTriangle, FaDownload } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi } from '@/lib/api';

type CsvUploadResponse = {
  message?: string;
  summary?: Record<string, string | number>;
  errors?: string[];
  headers_received?: string[];
  error?: string;
  details?: string;
};

export default function CsvUploadFloating() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CsvUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const rowErrors = result?.errors ?? [];
  const errorCount = rowErrors.length;
  const hasRowErrors = errorCount > 0;

  // Function to clean CSV content
  const cleanCSVContent = (content: string): string => {
    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.substring(1);
    }
    
    // Split into lines
    let lines = content.split(/\r\n|\r|\n/);
    
    // Clean each line - remove newlines within quoted fields
    let cleanedLines: string[] = [];
    let inQuotedField = false;
    let currentLine = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Count quotes in the line
      const quoteCount = (line.match(/"/g) || []).length;
      
      if (!inQuotedField) {
        // Not in a quoted field
        if (quoteCount % 2 === 0) {
          // Even number of quotes - no open quotes
          cleanedLines.push(line);
        } else {
          // Odd number of quotes - starting a quoted field
          inQuotedField = true;
          currentLine = line;
        }
      } else {
        // Currently in a quoted field
        currentLine += ' ' + line.replace(/"/g, ''); // Join with space, remove quotes
        if (quoteCount % 2 !== 0) {
          // Odd number of quotes - ending a quoted field
          inQuotedField = false;
          cleanedLines.push(currentLine);
          currentLine = '';
        }
      }
    }
    
    // If we ended still in a quoted field, add the remaining
    if (inQuotedField && currentLine) {
      cleanedLines.push(currentLine);
    }
    
    // Remove empty lines and trim
    cleanedLines = cleanedLines
      .filter(line => line.trim().length > 0)
      .map(line => {
        // Remove extra spaces and normalize
        return line
          .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
          .replace(/,\s+/g, ',') // Remove spaces after commas
          .replace(/\s+,/g, ',') // Remove spaces before commas
          .trim();
      });
    
    // Ensure we have at least a header row
    if (cleanedLines.length === 0) {
      throw new Error('CSV file appears to be empty');
    }
    
    return cleanedLines.join('\n');
  };

  // Function to create properly formatted CSV
  const createCSVBlob = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          let content = e.target?.result as string;
          
          // Clean the CSV content
          content = cleanCSVContent(content);
          
          // Create UTF-8 encoded blob
          const encoder = new TextEncoder();
          const data = encoder.encode('\uFEFF' + content); // Add BOM
          
          const blob = new Blob([data], { 
            type: 'text/csv;charset=utf-8' 
          });
          
          resolve(blob);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = (err) => reject(err);
      reader.readAsText(file, 'UTF-8');
    });
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Create cleaned CSV blob
      const csvBlob = await createCSVBlob(file);
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', csvBlob, 'cleaned_upload.csv');

     

      const res = await adminApi.setUpCsv.post(formData);
      const data = res?.data as CsvUploadResponse;

      if (!data || data.error) {
        setError(data?.error || data?.details || 'Upload failed');
      } else {
        setResult(data);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      const apiError = err?.response?.data as CsvUploadResponse | undefined;
      const fallback = err?.message || 'Error processing CSV file. Please check the format.';

      if (apiError) {
        setResult(apiError);
        const primaryError =
          apiError.error ||
          apiError.details ||
          (apiError.errors && apiError.errors.length > 0 ? apiError.errors[0] : null);
        setError(primaryError || fallback);
      } else {
        setError(fallback);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please select a valid CSV file');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please drop a valid CSV file');
    }
  };

  // Download a properly formatted CSV template
  const downloadTemplate = () => {
    const csvTemplate = `student_id,student_name,email,father_name,mother_name,parent_phone,mother_phone,dob,gender,class,section,date_of_admission,student_address,teacher_id,teacher_name,teacher_phone,teacher_email,teacher_dob,teacher_joining_date,qualification,department,teacher_address,staff_id,staff_name,staff_phone,staff_email,staff_role,staff_joining_date,staff_address
STU001,John Doe,john.student@schooldemo.edu,Michael Doe,Sarah Doe,1234567890,1234567891,2008-05-15,Male,10,A,2025-06-01,"12 North Street, Chennai",,,,,,,,,,,,,,,,
,,,,,,,,,,,,,TCH001,Anita Rao,9876500010,anita.teacher@schooldemo.edu,1985-08-20,2020-06-15,MSc Physics,Science,"45 Teacher Colony, Chennai",,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,STF001,Ramesh Kumar,9876500100,ramesh.staff@schooldemo.edu,operations_staff,2021-04-12,"Staff Quarters, Chennai"`;

    // Create UTF-8 encoded blob with BOM
    const encoder = new TextEncoder();
    const data = encoder.encode('\uFEFF' + csvTemplate);
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Preview CSV content by downloading a cleaned preview file
  const previewCSV = async () => {
    if (!file) return;
    
    try {
      const csvBlob = await createCSVBlob(file);
      const url = URL.createObjectURL(csvBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preview_${file.name.replace(/\.csv$/i, '')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Preview error:', err);
      setError('Could not generate CSV preview file.');
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-4 rounded-full shadow-xl transition-all"
      >
        <FaUpload className="w-5 h-5" />
      </motion.button>

      {/* Upload Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-50 w-96 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-200/50"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-2 rounded-lg">
                  <FaFileCsv className="text-blue-600 w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    Upload CSV Data
                  </h3>
                  <p className="text-xs text-gray-500">Add students, teachers & staff</p>
                </div>
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FaTimes className="text-gray-500 hover:text-gray-700 w-4 h-4" />
              </button>
            </div>

            {/* Template Download Button */}
            <button
              onClick={downloadTemplate}
              className="w-full mb-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              <FaDownload /> Download CSV Template
            </button>

            {/* File Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 mb-6 text-center cursor-pointer transition-all ${
                dragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : file 
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              }`}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              
              <div className="flex flex-col items-center gap-4">
                <FaFileCsv className={`text-4xl ${file ? 'text-green-500' : 'text-gray-400'}`} />
                
                <div>
                  {file ? (
                    <>
                      <p className="font-medium text-gray-700 mb-1">✅ File Selected</p>
                      <p className="text-sm text-gray-600 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          previewCSV();
                        }}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                      >
                        Download Preview CSV
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-gray-700 mb-1">
                        {dragOver ? '✨ Drop file here' : '📁 Drag & drop or click to upload'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Supports .csv files only
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className={`w-full py-3 rounded-xl font-semibold transition-all ${
                loading || !file
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
              } text-white shadow-lg flex items-center justify-center gap-2`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FaUpload className="w-4 h-4" />
                  <span>Upload CSV</span>
                </>
              )}
            </button>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="text-red-500 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-700">Error</p>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                    <div className="mt-3 text-xs text-red-500 space-y-1">
                      <p><strong>Common CSV issues to fix:</strong></p>
                      <p>1. Remove line breaks within fields</p>
                      <p>2. Ensure consistent quoting (use "" for quotes within fields)</p>
                      <p>3. Save as UTF-8 CSV format</p>
                      <p>4. Use the template above as reference</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success Result */}
            {result && (
              <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 p-2 rounded-full">
                    {hasRowErrors ? (
                      <FaExclamationTriangle className="text-amber-600" />
                    ) : (
                      <FaCheck className="text-green-600" />
                    )}
                  </div>
                  <div>
                    <p className={`font-bold ${hasRowErrors ? 'text-amber-700' : 'text-green-700'}`}>
                      {hasRowErrors ? 'Upload Completed With Issues' : 'Upload Successful!'}
                    </p>
                    <p className="text-green-600 text-sm">{result.message || 'CSV processed successfully'}</p>
                  </div>
                </div>

                {/* Summary */}
                {/* {result.summary && (
                  <div className="rounded-lg border border-green-200 bg-white p-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Upload Summary</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(result.summary).map(([key, value]) => (
                        <div key={key} className="rounded-md bg-green-50 px-2 py-1">
                          <p className="text-[11px] uppercase tracking-wide text-gray-500">
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm font-semibold text-green-700">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )} */}

                {/* Errors */}
                {/* {hasRowErrors && (
                  <div className="mt-4 pt-4 border-t border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FaExclamationTriangle className="text-red-500" />
                      <p className="text-red-600 font-medium">
                        {errorCount} issue{errorCount !== 1 ? 's' : ''} found
                      </p>
                    </div>
                    <div className="max-h-32 overflow-y-auto pr-2">
                      <ul className="space-y-1.5">
                        {rowErrors.map((err: string, i: number) => (
                          <li key={i} className="text-sm text-red-500 pl-2 border-l-2 border-red-300 py-1">
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )} */}
              </div>
            )}

            {/* CSV Format Instructions */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">📋 Required CSV Format:</p>
              <div className="text-xs text-gray-600 space-y-1">
                <p className="mt-2 text-blue-600">💡 Download the template above for correct format</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
