import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface ImageUploadProps {
  onUploadSuccess: (imageId: string, imageUrl: string) => void;
  onUploadError?: (error: string) => void;
  userId: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  userId,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    
    if (error) {
      setValidationError(error);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setValidationError(null);
    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setValidationError('Please select an image file.');
      return;
    }

    if (!altText.trim()) {
      setValidationError('Alt text is required for accessibility.');
      return;
    }

    setIsUploading(true);
    setValidationError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('altText', altText.trim());
      formData.append('createdBy', userId);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          const imageUrl = `/api/images/${response.id}/file`;
          onUploadSuccess(response.id, imageUrl);
          
          // Reset form
          setSelectedFile(null);
          setAltText('');
          setPreviewUrl(null);
          setUploadProgress(null);
        } else {
          const error = JSON.parse(xhr.responseText);
          const errorMessage = error.error || 'Failed to upload image';
          setValidationError(errorMessage);
          onUploadError?.(errorMessage);
        }
        setIsUploading(false);
      });

      xhr.addEventListener('error', () => {
        const errorMessage = 'Network error occurred during upload';
        setValidationError(errorMessage);
        onUploadError?.(errorMessage);
        setIsUploading(false);
      });

      xhr.open('POST', '/api/images');
      xhr.send(formData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      setValidationError(errorMessage);
      onUploadError?.(errorMessage);
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setAltText('');
    setPreviewUrl(null);
    setUploadProgress(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Upload Image</h2>

      {/* Drag and Drop Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Select image file"
        />

        {!previewUrl ? (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop an image here, or{' '}
              <button
                type="button"
                onClick={handleBrowseClick}
                className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              >
                browse
              </button>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              JPEG, PNG, or WebP up to 10MB
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-64 mx-auto rounded"
            />
            <p className="text-sm text-gray-600">
              {selectedFile?.name} ({Math.round((selectedFile?.size || 0) / 1024)} KB)
            </p>
            <button
              type="button"
              onClick={handleCancel}
              className="text-sm text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-2 py-1"
              disabled={isUploading}
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Alt Text Input */}
      {selectedFile && (
        <div className="mt-4">
          <label
            htmlFor="altText"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Alt Text <span className="text-red-500">*</span>
          </label>
          <input
            id="altText"
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe the image for accessibility"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isUploading}
            required
            aria-required="true"
            aria-describedby="altTextHelp"
          />
          <p id="altTextHelp" className="mt-1 text-xs text-gray-500">
            Provide a brief description of the image for screen reader users
          </p>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.percentage}%` }}
              role="progressbar"
              aria-valuenow={uploadProgress.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md"
          role="alert"
        >
          <p className="text-sm text-red-800">{validationError}</p>
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && (
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || !altText.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isUploading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
