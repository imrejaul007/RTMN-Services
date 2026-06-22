import { useCallback, useState } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in MB
  onUpload: (file: File) => Promise<void>;
  label?: string;
  description?: string;
  disabled?: boolean;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface UploadedFile {
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

export function FileUpload({
  accept = '*',
  maxSize = 10,
  onUpload,
  label = 'Upload File',
  description,
  disabled = false,
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `File size exceeds ${maxSize}MB limit`;
    }
    return null;
  };

  const processFile = async (file: File) => {
    const error = validateFile(file);
    const newFile: UploadedFile = {
      file,
      status: error ? 'error' : 'uploading',
      progress: 0,
      error: error || undefined,
    };

    setUploadedFiles((prev) => [...prev, newFile]);

    if (!error) {
      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.file === file && f.status === 'uploading' && f.progress < 90
                ? { ...f, progress: f.progress + 10 }
                : f
            )
          );
        }, 100);

        await onUpload(file);

        clearInterval(progressInterval);
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.file === file ? { ...f, status: 'success', progress: 100 } : f
          )
        );
      } catch (err) {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
              : f
          )
        );
      }
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      files.forEach(processFile);
    },
    [disabled, onUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || !e.target.files) return;

      const files = Array.from(e.target.files);
      files.forEach(processFile);
      e.target.value = '';
    },
    [disabled, onUpload]
  );

  const removeFile = (file: File) => {
    setUploadedFiles((prev) => prev.filter((f) => f.file !== file));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept={accept}
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        <Upload
          className={`mx-auto h-12 w-12 ${
            isDragging ? 'text-primary-500' : 'text-gray-400'
          }`}
        />
        <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </p>
        {description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Max file size: {maxSize}MB
        </p>
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {uploadedFiles.map((uploadedFile, index) => (
            <li
              key={`${uploadedFile.file.name}-${index}`}
              className="flex items-center gap-3 p-3 bg-white dark:bg-dark-100"
            >
              <div className="flex-shrink-0">
                <File className="h-8 w-8 text-gray-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {uploadedFile.file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(uploadedFile.file.size)}
                </p>

                {uploadedFile.status === 'uploading' && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                      <div
                        className="bg-primary-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadedFile.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                {uploadedFile.status === 'uploading' && (
                  <Loader2 className="h-5 w-5 text-primary-600 animate-spin" />
                )}
                {uploadedFile.status === 'success' && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {uploadedFile.status === 'error' && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <button
                      onClick={() => removeFile(uploadedFile.file)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Specialized upload components for different file types
export function PDFUpload(props: Omit<FileUploadProps, 'accept' | 'maxSize'>) {
  return (
    <FileUpload
      {...props}
      accept=".pdf"
      maxSize={50}
      label="Upload PDF Book"
      description="Drag and drop a PDF file, or click to select"
    />
  );
}

export function CSVUpload(props: Omit<FileUploadProps, 'accept' | 'maxSize'>) {
  return (
    <FileUpload
      {...props}
      accept=".csv"
      maxSize={5}
      label="Upload CSV File"
      description="For menu data or bulk imports"
    />
  );
}

export function JSONUpload(props: Omit<FileUploadProps, 'accept' | 'maxSize'>) {
  return (
    <FileUpload
      {...props}
      accept=".json"
      maxSize={5}
      label="Upload JSON File"
      description="Structured data files"
    />
  );
}

export default FileUpload;
