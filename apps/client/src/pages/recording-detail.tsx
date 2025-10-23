import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RecordingsApi, type Recording } from '@/lib/recordings-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Share2, Trash2, Edit2, Save, X, Eye, Clock } from 'lucide-react';
import { useAuth } from '@/context/NewAuthContext';
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

const RecordingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { teamId } = useTeamContext();

  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [editData, setEditData] = useState({
    title: '',
    description: '',
    isPublic: false,
  });

  const loadRecording = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const result = await RecordingsApi.getRecording(id);

      if (result.success && result.data) {
        setRecording(result.data);
        setEditData({
          title: result.data.title,
          description: result.data.description || '',
          isPublic: result.data.isPublic,
        });

        // Increment view count
        await RecordingsApi.incrementViewCount(id);
      } else {
        toast.error(result.error || 'Failed to load recording');
        navigate(teamId ? `/${teamId}/recordings` : '/recordings');
      }
    } catch (error) {
      toast.error('Failed to load recording');
      console.error(error);
      navigate(teamId ? `/${teamId}/recordings` : '/recordings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecording();
  }, [id]);

  const handleSave = async () => {
    if (!id || !recording) return;

    try {
      const result = await RecordingsApi.updateRecording(id, editData);

      if (result.success && result.data) {
        setRecording(result.data);
        setIsEditing(false);
        toast.success('Recording updated successfully');
      } else {
        toast.error(result.error || 'Failed to update recording');
      }
    } catch (error) {
      toast.error('Failed to update recording');
      console.error(error);
    }
  };

  const handleCancelEdit = () => {
    if (recording) {
      setEditData({
        title: recording.title,
        description: recording.description || '',
        isPublic: recording.isPublic,
      });
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      const result = await RecordingsApi.deleteRecording(id);

      if (result.success) {
        toast.success('Recording deleted successfully');
        navigate(teamId ? `/${teamId}/recordings` : '/recordings');
      } else {
        toast.error(result.error || 'Failed to delete recording');
      }
    } catch (error) {
      toast.error('Failed to delete recording');
      console.error(error);
    }
  };

  const handleShare = async () => {
    if (!recording) return;

    if (recording.isPublic && recording.shareToken) {
      const shareUrl = `${window.location.origin}/share/${recording.shareToken}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Share link copied to clipboard!');
      } catch (error) {
        toast.error('Failed to copy link');
      }
    } else {
      toast.error('Make this recording public to share it');
    }
  };

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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOwner = user && recording && recording.userId === user.id;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading recording...</div>
        </div>
      </div>
    );
  }

  if (!recording) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <Button
        variant="ghost"
        onClick={() => navigate(teamId ? `/${teamId}/recordings` : '/recordings')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Recordings
      </Button>

      <div className="space-y-6">
        {/* Video Player */}
        <Card>
          <CardContent className="p-0">
            {recording.asset?.s3Url && (
              <video
                src={recording.asset.s3Url}
                controls
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: '600px' }}
              />
            )}
          </CardContent>
        </Card>

        {/* Recording Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        value={editData.title}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        className="text-2xl font-bold mb-2"
                      />
                    ) : (
                      <CardTitle className="text-2xl mb-2">{recording.title}</CardTitle>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(recording.duration)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{recording.viewCount} views</span>
                      </div>
                    </div>
                  </div>
                  {recording.isPublic && !isEditing && (
                    <span className="ml-4 px-3 py-1 text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-full">
                      Public
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      placeholder="Add a description..."
                      rows={4}
                      className="mt-2"
                    />
                  ) : (
                    <p className="text-muted-foreground mt-2">
                      {recording.description || 'No description provided.'}
                    </p>
                  )}
                </div>

                {isOwner && isEditing && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="space-y-0.5">
                      <Label htmlFor="public-toggle">Make Public</Label>
                      <p className="text-sm text-muted-foreground">Allow anyone with the link to view</p>
                    </div>
                    <Switch
                      id="public-toggle"
                      checked={editData.isPublic}
                      onCheckedChange={(checked) =>
                        setEditData({ ...editData, isPublic: checked })
                      }
                    />
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-4 border-t">
                  Created on {formatDate(recording.createdAt)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Sidebar */}
          {isOwner && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit Details
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={handleShare}
                        disabled={!recording.isPublic}
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Copy Share Link
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full justify-start"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Recording
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button className="w-full justify-start" onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={handleCancelEdit}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {recording.settings && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recording Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {recording.settings.hasWebcam && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Webcam</span>
                          <span className="font-medium">
                            {recording.settings.webcamPosition} ({recording.settings.webcamShape})
                          </span>
                        </div>
                      )}
                      {recording.settings.hasMicrophone && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Microphone</span>
                          <span className="font-medium">Enabled</span>
                        </div>
                      )}
                      {recording.settings.hasSystemAudio && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">System Audio</span>
                          <span className="font-medium">Enabled</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

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
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RecordingDetailPage;
