import { useEffect, useState } from 'react';
import { RecordingsApi, type Recording } from '@/lib/recordings-api';
import { RecordingStudio } from '@/components/recording/recording-studio';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Plus, Eye, Trash2, Share2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTeamContext } from '@/hooks/use-team-context';
import toast from 'react-hot-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const RecordingsPage = () => {
  const navigate = useNavigate();
  const { teamId } = useTeamContext();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [studioOpen, setStudioOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordingToDelete, setRecordingToDelete] = useState<string | null>(null);

  const loadRecordings = async () => {
    setLoading(true);
    try {
      const result = await RecordingsApi.getRecordings({
        teamId: teamId || undefined,
        limit: 50,
      });

      if (result.success && result.data) {
        setRecordings(result.data.recordings);
      } else {
        toast.error(result.error || 'Failed to load recordings');
      }
    } catch (error) {
      toast.error('Failed to load recordings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, [teamId]);

  const handleViewRecording = (recordingId: string) => {
    if (teamId) {
      navigate(`/${teamId}/recordings/${recordingId}`);
    } else {
      navigate(`/recordings/${recordingId}`);
    }
  };

  const handleDeleteClick = (recordingId: string) => {
    setRecordingToDelete(recordingId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordingToDelete) return;

    try {
      const result = await RecordingsApi.deleteRecording(recordingToDelete);
      if (result.success) {
        toast.success('Recording deleted successfully');
        loadRecordings();
      } else {
        toast.error(result.error || 'Failed to delete recording');
      }
    } catch (error) {
      toast.error('Failed to delete recording');
      console.error(error);
    } finally {
      setDeleteDialogOpen(false);
      setRecordingToDelete(null);
    }
  };

  const handleShare = async (recording: Recording) => {
    if (recording.isPublic && recording.shareToken) {
      const shareUrl = `${window.location.origin}/share/${recording.shareToken}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Share link copied to clipboard!');
      } catch (error) {
        toast.error('Failed to copy link');
      }
    } else {
      toast.error('This recording is not public');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading recordings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Screen Recordings</h1>
          <p className="text-muted-foreground">
            Record your screen, webcam, and audio to create shareable videos
          </p>
        </div>
        <Button onClick={() => setStudioOpen(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          New Recording
        </Button>
      </div>

      {recordings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Video className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No recordings yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Get started by creating your first screen recording. Capture your screen, add webcam, and share with your team.
            </p>
            <Button onClick={() => setStudioOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Recording
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recordings.map((recording) => (
            <Card key={recording.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-2 mb-2">{recording.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {recording.description || 'No description'}
                    </CardDescription>
                  </div>
                  {recording.isPublic && (
                    <span className="ml-2 px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-full">
                      Public
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {recording.asset?.s3Url && (
                  <div className="relative aspect-video bg-black rounded-md overflow-hidden mb-4">
                    <video
                      src={recording.asset.s3Url}
                      className="w-full h-full object-contain"
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 rounded-full p-3">
                        <Video className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(recording.duration)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{recording.viewCount} views</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {formatDate(recording.createdAt)}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewRecording(recording.id)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
                <div className="flex space-x-2">
                  {recording.isPublic && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare(recording)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(recording.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <RecordingStudio open={studioOpen} onOpenChange={setStudioOpen} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the recording and its video file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RecordingsPage;
