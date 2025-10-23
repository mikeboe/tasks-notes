import { useState, useRef, useCallback } from 'react';
import type { RecordingSettings } from '@/lib/recordings-api';

export interface UseScreenRecorderOptions {
  onRecordingComplete?: (blob: Blob, duration: number) => void;
  onError?: (error: Error) => void;
}

export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
}

export const useScreenRecorder = (options?: UseScreenRecorderOptions) => {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updateDuration = useCallback(() => {
    if (startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
      setState(prev => ({ ...prev, duration: Math.floor(elapsed / 1000) }));
    }
  }, []);

  const startRecording = useCallback(async (settings: RecordingSettings) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      chunksRef.current = [];

      // Request screen capture
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
        } as MediaTrackConstraints,
        audio: settings.hasSystemAudio,
      });

      screenStreamRef.current = screenStream;

      // Combine all streams
      const tracks: MediaStreamTrack[] = [...screenStream.getVideoTracks()];

      // Add webcam if enabled
      if (settings.hasWebcam) {
        try {
          const webcamStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 320 },
              height: { ideal: 240 },
              facingMode: 'user',
            },
            audio: false,
          });
          webcamStreamRef.current = webcamStream;
          // Webcam will be composited separately in the UI
        } catch (err) {
          console.error('Failed to get webcam stream:', err);
          // Continue without webcam
        }
      }

      // Add microphone audio if enabled
      if (settings.hasMicrophone) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100,
            },
          });
          audioStreamRef.current = audioStream;
          tracks.push(...audioStream.getAudioTracks());
        } catch (err) {
          console.error('Failed to get microphone stream:', err);
        }
      }

      // Add system audio if available
      if (settings.hasSystemAudio && screenStream.getAudioTracks().length > 0) {
        tracks.push(...screenStream.getAudioTracks());
      }

      // Create combined stream
      const combinedStream = new MediaStream(tracks);

      // Check for supported MIME types
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('No supported MIME type found for recording');
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType });

        // Calculate actual duration from timestamps
        const actualDuration = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);

        // Clean up streams
        screenStreamRef.current?.getTracks().forEach(track => track.stop());
        webcamStreamRef.current?.getTracks().forEach(track => track.stop());
        audioStreamRef.current?.getTracks().forEach(track => track.stop());

        screenStreamRef.current = null;
        webcamStreamRef.current = null;
        audioStreamRef.current = null;

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        options?.onRecordingComplete?.(blob, actualDuration);
      };

      mediaRecorder.onerror = (event) => {
        const error = new Error('MediaRecorder error: ' + (event as any).error);
        setState(prev => ({ ...prev, error: error.message, isRecording: false }));
        options?.onError?.(error);
      };

      // Handle user stopping screen share
      screenStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;

      // Start timer
      timerRef.current = setInterval(updateDuration, 1000);

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        error: null,
      });

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to start recording');
      setState(prev => ({ ...prev, error: err.message }));
      options?.onError?.(err);
    }
  }, [state.duration, options, updateDuration]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      pausedTimeRef.current += Date.now() - startTimeRef.current;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, [state.isRecording, state.isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(updateDuration, 1000);

      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [state.isRecording, state.isPaused, updateDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      setState(prev => ({ ...prev, isRecording: false, isPaused: false }));
    }
  }, [state.isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      chunksRef.current = []; // Clear chunks so onstop handler doesn't call onRecordingComplete

      screenStreamRef.current?.getTracks().forEach(track => track.stop());
      webcamStreamRef.current?.getTracks().forEach(track => track.stop());
      audioStreamRef.current?.getTracks().forEach(track => track.stop());

      screenStreamRef.current = null;
      webcamStreamRef.current = null;
      audioStreamRef.current = null;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (state.isRecording) {
        mediaRecorderRef.current.stop();
      }

      setState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        error: null,
      });
    }
  }, [state.isRecording]);

  const getWebcamStream = useCallback(() => {
    return webcamStreamRef.current;
  }, []);

  return {
    state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    getWebcamStream,
  };
};
