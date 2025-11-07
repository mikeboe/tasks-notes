import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ContentExtractionApi } from '@/lib/content-extraction-api';
import toast from 'react-hot-toast';

interface ContentExtractionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (markdown: string, metadata: any) => void;
}

export function ContentExtractionModal({
  open,
  onClose,
  onSuccess,
}: ContentExtractionModalProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
      } else {
        toast.error('Invalid file type. Please upload a PDF or image file.');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isValidFile(file)) {
        setSelectedFile(file);
      } else {
        toast.error('Invalid file type. Please upload a PDF or image file.');
      }
    }
  };

  const isValidFile = (file: File): boolean => {
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];
    return validTypes.includes(file.type);
  };

  const handleExtract = async () => {
    if (activeTab === 'url' && !url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    if (activeTab === 'file' && !selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setIsExtracting(true);

    try {
      const response = await ContentExtractionApi.extractContent({
        type: activeTab,
        url: activeTab === 'url' ? url : undefined,
        file: activeTab === 'file' ? selectedFile! : undefined,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Extraction failed');
      }

      toast.success('Content extracted successfully!');
      onSuccess(response.data.markdown, response.data.metadata);
      handleClose();
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to extract content'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setSelectedFile(null);
    setActiveTab('file');
    setIsExtracting(false);
    onClose();
  };

  const getFilePreview = () => {
    if (!selectedFile) return null;

    return (
      <div className="mt-4 p-4 border rounded-lg bg-secondary/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {selectedFile.type.includes('pdf') ? '📄' : '🖼️'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFile(null)}
            disabled={isExtracting}
          >
            Remove
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>📤 Extract Content</DialogTitle>
          <DialogDescription>
            Extract text from web pages, PDFs, or images and insert it into your
            note.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'file' | 'url')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Upload File</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4">
            <div className="space-y-2">
              <Label>File Upload</Label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,image/jpeg,image/jpg,image/png"
                  onChange={handleFileChange}
                  disabled={isExtracting}
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <div className="text-4xl mb-4">📁</div>
                  <p className="text-sm font-medium mb-1">
                    Drag & drop file here
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supported: PDF, JPG, PNG (max 10MB)
                  </p>
                </label>
              </div>
              {getFilePreview()}
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url-input">Website URL</Label>
              <Input
                id="url-input"
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isExtracting}
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL to extract its content as markdown
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {isExtracting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Extracting content...</span>
              <span className="text-muted-foreground">
                {activeTab === 'file' ? 'Processing file' : 'Fetching page'}
              </span>
            </div>
            <Progress value={undefined} className="w-full" />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isExtracting}
          >
            Cancel
          </Button>
          <Button onClick={handleExtract} disabled={isExtracting}>
            {isExtracting ? 'Extracting...' : 'Extract & Insert'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
