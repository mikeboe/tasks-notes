import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileVideo, CheckCircle, AlertCircle } from 'lucide-react';
import { VideoApi, VideoUtils, type Asset, type UploadProgress, VideoApiError } from '@/lib/video-api';

export const VideoUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadedAsset, setUploadedAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => VideoUtils.isVideoFile(file));
    
    if (videoFile) {
      setSelectedFile(videoFile);
      setError(null);
    } else {
      setError('Please select a video file');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (VideoUtils.isVideoFile(file)) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please select a video file');
      }
    }
  }, []);

  const uploadFile = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setUploadProgress({ loaded: 0, total: selectedFile.size, percentage: 0 });

    try {
      const result = await VideoApi.uploadVideo(selectedFile, (progress) => {
        setUploadProgress(progress);
      });
      
      if (result.success) {
        setUploadedAsset(result.data);
        setSelectedFile(null);
        setUploadProgress(null);
      } else {
        throw new VideoApiError(result.message || 'Upload failed');
      }
    } catch (err) {
      setError(err instanceof VideoApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadedAsset(null);
    setError(null);
    setUploadProgress(null);
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileVideo className="h-5 w-5" />
            <span>Video Upload</span>
          </CardTitle>
          <CardDescription>
            Upload video files to S3-compatible storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!uploadedAsset ? (
            <div className="space-y-4">
              {/* File Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                } ${selectedFile ? 'border-primary bg-primary/5' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="video-upload"
                  disabled={uploading}
                />
                
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileVideo className="mx-auto h-12 w-12 text-primary" />
                    <div className="text-sm font-medium">{selectedFile.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {VideoUtils.formatFileSize(selectedFile.size)} • {selectedFile.type}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      className="mt-2"
                      disabled={uploading}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="text-lg font-medium">Drop video files here</div>
                    <div className="text-sm text-muted-foreground">
                      or{' '}
                      <label
                        htmlFor="video-upload"
                        className="text-primary hover:underline cursor-pointer"
                      >
                        browse to choose files
                      </label>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Supports MP4, AVI, MOV, and other video formats
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {uploading && uploadProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress.percentage}%</span>
                  </div>
                  <Progress value={uploadProgress.percentage} className="w-full" />
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="flex items-center space-x-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{error}</span>
                </div>
              )}

              {/* Upload Button */}
              {selectedFile && !uploading && (
                <Button onClick={uploadFile} className="w-full" disabled={uploading}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Video
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Success State */}
              <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">Video uploaded successfully!</span>
              </div>

              {/* Upload Details */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Upload Details:</div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>File: {uploadedAsset.originalFileName}</div>
                  <div>Size: {VideoUtils.formatFileSize(uploadedAsset.fileSize)}</div>
                  <div>Type: {uploadedAsset.mimeType}</div>
                  <div>Uploaded: {new Date(uploadedAsset.createdAt).toLocaleString()}</div>
                </div>
              </div>

              {/* Reset Button */}
              <Button variant="outline" onClick={resetUpload} className="w-full">
                Upload Another Video
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoUpload;