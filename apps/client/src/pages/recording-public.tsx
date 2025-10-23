import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RecordingsApi, type Recording } from '@/lib/recordings-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const RecordingPublicPage = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecording = async () => {
      if (!shareToken) {
        setLoading(false);
        return;
      }

      try {
        const result = await RecordingsApi.getPublicRecording(shareToken);

        if (result.success && result.data) {
          setRecording(result.data);

          // Increment view count
          await RecordingsApi.incrementViewCount(result.data.id);
        } else {
          toast.error(result.error || 'Recording not found');
        }
      } catch (error) {
        toast.error('Failed to load recording');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadRecording();
  }, [shareToken]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-lg text-muted-foreground">Loading recording...</div>
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Recording Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This recording does not exist or is no longer public.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto p-6 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold mb-2">{recording.title}</h1>
          <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(recording.duration)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{recording.viewCount} views</span>
            </div>
            <span>•</span>
            <span>{formatDate(recording.createdAt)}</span>
          </div>
        </div>

        {/* Video Player */}
        <Card className="mb-8 overflow-hidden shadow-2xl">
          <CardContent className="p-0">
            {recording.asset?.s3Url && (
              <video
                src={recording.asset.s3Url}
                controls
                autoPlay
                className="w-full bg-black"
                style={{ maxHeight: '70vh' }}
              />
            )}
          </CardContent>
        </Card>

        {/* Description */}
        {recording.description && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{recording.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-8">
          <p>Powered by Screen Recorder</p>
        </div>
      </div>
    </div>
  );
};

export default RecordingPublicPage;
