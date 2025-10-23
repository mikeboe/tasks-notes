import { useState, useCallback, useEffect } from 'react';
import { useScreenRecorder } from '@/hooks/use-screen-recorder';
import { WebcamOverlay } from './webcam-overlay';
import { ClickHighlight } from './click-highlight';
import { AssetsApi } from '@/lib/assets-api';
import { RecordingsApi, type RecordingSettings } from '@/lib/recordings-api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Video, Mic, Pause, Play, Square, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useTeamContext } from '@/hooks/use-team-context';

interface RecordingStudioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type StudioStage = 'setup' | 'recording' | 'preview' | 'uploading';

export const RecordingStudio = ({ open, onOpenChange }: RecordingStudioProps) => {
  const navigate = useNavigate();
  const { teamId } = useTeamContext();

  const [stage, setStage] = useState<StudioStage>('setup');
  const [settings, setSettings] = useState<RecordingSettings>({
    hasWebcam: true,
    webcamPosition: 'bottom-right',
    webcamShape: 'circle',
    hasMicrophone: true,
    hasSystemAudio: false,
  });

  const [recordingData, setRecordingData] = useState<{
    blob: Blob | null;
    duration: number;
    videoUrl: string | null;
  }>({
    blob: null,
    duration: 0,
    videoUrl: null,
  });

  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    isPublic: false,
  });

  const [uploadProgress] = useState(0);

  const { state, startRecording, pauseRecording, resumeRecording, stopRecording, cancelRecording, getWebcamStream } =
    useScreenRecorder({
      onRecordingComplete: (blob, duration) => {
        setRecordingData({
          blob,
          duration,
          videoUrl: URL.createObjectURL(blob),
        });
        setStage('preview');
        setMetadata(prev => ({
          ...prev,
          title: `Recording ${new Date().toLocaleString()}`,
        }));
      },
      onError: (error) => {
        toast.error(error.message);
        setStage('setup');
      },
    });

  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording(settings);
      setStage('recording');
    } catch (error) {
      toast.error('Failed to start recording');
      console.error(error);
    }
  }, [settings, startRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleCancelRecording = useCallback(() => {
    cancelRecording();
    setStage('setup');
    setRecordingData({ blob: null, duration: 0, videoUrl: null });
  }, [cancelRecording]);

  const handleSaveRecording = useCallback(async () => {
    if (!recordingData.blob) {
      toast.error('No recording data available');
      return;
    }

    if (!metadata.title.trim()) {
      toast.error('Please enter a title for your recording');
      return;
    }

    setStage('uploading');

    try {
      // Convert blob to file
      const file = new File([recordingData.blob], `recording-${Date.now()}.webm`, {
        type: recordingData.blob.type,
      });

      // Upload video file
      const uploadResult = await AssetsApi.uploadFile(file);

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || 'Failed to upload video');
      }

      // Create recording record
      const recordingResult = await RecordingsApi.createRecording({
        assetId: uploadResult.data.id,
        title: metadata.title,
        description: metadata.description || undefined,
        duration: recordingData.duration,
        isPublic: metadata.isPublic,
        settings,
        teamId: teamId || undefined,
      });

      if (!recordingResult.success || !recordingResult.data) {
        throw new Error(recordingResult.error || 'Failed to create recording');
      }

      toast.success('Recording saved successfully!');
      onOpenChange(false);

      // Navigate to recording detail page
      if (teamId) {
        navigate(`/${teamId}/recordings/${recordingResult.data.id}`);
      } else {
        navigate(`/recordings/${recordingResult.data.id}`);
      }

      // Reset state
      setStage('setup');
      setRecordingData({ blob: null, duration: 0, videoUrl: null });
      setMetadata({ title: '', description: '', isPublic: false });
    } catch (error) {
      console.error('Save recording error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save recording');
      setStage('preview'); // Go back to preview on error
    }
  }, [recordingData, metadata, settings, teamId, navigate, onOpenChange]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup video URL on unmount
  useEffect(() => {
    return () => {
      if (recordingData.videoUrl) {
        URL.revokeObjectURL(recordingData.videoUrl);
      }
    };
  }, [recordingData.videoUrl]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      if (state.isRecording) {
        cancelRecording();
      }
      setStage('setup');
      if (recordingData.videoUrl) {
        URL.revokeObjectURL(recordingData.videoUrl);
      }
      setRecordingData({ blob: null, duration: 0, videoUrl: null });
      setMetadata({ title: '', description: '', isPublic: false });
    }
  }, [open, state.isRecording, cancelRecording, recordingData.videoUrl]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {stage === 'setup' && 'Recording Setup'}
              {stage === 'recording' && 'Recording...'}
              {stage === 'preview' && 'Preview & Save'}
              {stage === 'uploading' && 'Uploading...'}
            </DialogTitle>
            <DialogDescription>
              {stage === 'setup' && 'Configure your recording settings before you begin'}
              {stage === 'recording' && 'Your screen is being recorded'}
              {stage === 'preview' && 'Review your recording and add details'}
              {stage === 'uploading' && 'Please wait while we save your recording'}
            </DialogDescription>
          </DialogHeader>

          {/* Setup Stage */}
          {stage === 'setup' && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="webcam">Webcam</Label>
                    <p className="text-sm text-muted-foreground">Include webcam feed in recording</p>
                  </div>
                  <Switch
                    id="webcam"
                    checked={settings.hasWebcam}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, hasWebcam: checked }))
                    }
                  />
                </div>

                {settings.hasWebcam && (
                  <>
                    <div className="space-y-2 pl-6">
                      <Label>Webcam Position</Label>
                      <RadioGroup
                        value={settings.webcamPosition}
                        onValueChange={(value) =>
                          setSettings((prev) => ({
                            ...prev,
                            webcamPosition: value as RecordingSettings['webcamPosition'],
                          }))
                        }
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="top-left" id="top-left" />
                          <Label htmlFor="top-left">Top Left</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="top-right" id="top-right" />
                          <Label htmlFor="top-right">Top Right</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="bottom-left" id="bottom-left" />
                          <Label htmlFor="bottom-left">Bottom Left</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="bottom-right" id="bottom-right" />
                          <Label htmlFor="bottom-right">Bottom Right</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2 pl-6">
                      <Label>Webcam Shape</Label>
                      <RadioGroup
                        value={settings.webcamShape}
                        onValueChange={(value) =>
                          setSettings((prev) => ({
                            ...prev,
                            webcamShape: value as RecordingSettings['webcamShape'],
                          }))
                        }
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="circle" id="circle" />
                          <Label htmlFor="circle">Circle</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="rounded" id="rounded" />
                          <Label htmlFor="rounded">Rounded Rectangle</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="microphone">Microphone</Label>
                    <p className="text-sm text-muted-foreground">Record audio from microphone</p>
                  </div>
                  <Switch
                    id="microphone"
                    checked={settings.hasMicrophone}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, hasMicrophone: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="system-audio">System Audio</Label>
                    <p className="text-sm text-muted-foreground">Record system audio (may not work in all browsers)</p>
                  </div>
                  <Switch
                    id="system-audio"
                    checked={settings.hasSystemAudio}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, hasSystemAudio: checked }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStartRecording}>
                  <Video className="mr-2 h-4 w-4" />
                  Start Recording
                </Button>
              </div>
            </div>
          )}

          {/* Recording Stage */}
          {stage === 'recording' && (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500 animate-pulse">
                  <div className="w-6 h-6 rounded-full bg-white" />
                </div>

                <div className="text-4xl font-mono font-bold">{formatDuration(state.duration)}</div>

                <div className="flex items-center justify-center space-x-2">
                  {settings.hasWebcam && (
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Camera className="h-4 w-4" />
                      <span>Webcam On</span>
                    </div>
                  )}
                  {settings.hasMicrophone && (
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Mic className="h-4 w-4" />
                      <span>Mic On</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center space-x-2">
                {!state.isPaused ? (
                  <Button variant="outline" onClick={pauseRecording}>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                ) : (
                  <Button variant="outline" onClick={resumeRecording}>
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                  </Button>
                )}
                <Button variant="destructive" onClick={handleStopRecording}>
                  <Square className="mr-2 h-4 w-4" />
                  Stop Recording
                </Button>
                <Button variant="ghost" onClick={handleCancelRecording}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Preview Stage */}
          {stage === 'preview' && recordingData.videoUrl && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <video
                  src={recordingData.videoUrl}
                  controls
                  className="w-full rounded-lg bg-black"
                  style={{ maxHeight: '400px' }}
                />

                <div className="text-sm text-muted-foreground">
                  Duration: {formatDuration(recordingData.duration)}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={metadata.title}
                    onChange={(e) => setMetadata((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="My awesome recording"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={metadata.description}
                    onChange={(e) => setMetadata((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Add a description..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="public">Make Public</Label>
                    <p className="text-sm text-muted-foreground">Allow anyone with the link to view</p>
                  </div>
                  <Switch
                    id="public"
                    checked={metadata.isPublic}
                    onCheckedChange={(checked) =>
                      setMetadata((prev) => ({ ...prev, isPublic: checked }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCancelRecording}>
                  Discard
                </Button>
                <Button onClick={handleSaveRecording}>Save Recording</Button>
              </div>
            </div>
          )}

          {/* Uploading Stage */}
          {stage === 'uploading' && (
            <div className="space-y-6 py-8">
              <div className="text-center space-y-4">
                <div className="text-lg font-medium">Uploading your recording...</div>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">This may take a few moments</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Overlays during recording (outside modal) */}
      {stage === 'recording' && (
        <>
          {settings.hasWebcam && settings.webcamPosition && (
            <WebcamOverlay
              stream={getWebcamStream()}
              position={settings.webcamPosition}
              shape={settings.webcamShape || 'circle'}
            />
          )}
          <ClickHighlight />
        </>
      )}
    </>
  );
};
