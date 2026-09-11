'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Trash2, Send } from 'lucide-react';

// Global audio tracker so only one voice note plays at a time
let currentlyPlayingAudio: HTMLAudioElement | null = null;

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number | null;
  isMe?: boolean;
}

export function VoiceMessagePlayer({ audioUrl, duration, isMe }: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState<number>(() => {
    if (typeof duration === 'number' && duration > 0) return Math.round(duration);
    return 0;
  });
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync duration if prop updates
  useEffect(() => {
    if (typeof duration === 'number' && duration > 0) {
      setTotalDuration(Math.round(duration));
    }
  }, [duration]);

  // Clean up when unmounting
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        if (currentlyPlayingAudio === audio) {
          currentlyPlayingAudio = null;
        }
      }
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Pause any other playing voice message
      if (currentlyPlayingAudio && currentlyPlayingAudio !== audio) {
        currentlyPlayingAudio.pause();
      }
      currentlyPlayingAudio = audio;

      // If at end or finished, restart from start
      const dur = totalDuration > 0 ? totalDuration : audio.duration;
      if (audio.ended || (isFinite(dur) && dur > 0 && audio.currentTime >= dur - 0.2)) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }

      audio.playbackRate = playbackRate;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn("[VoicePlayer] Playback error or abort:", err);
            setIsPlaying(false);
          });
      }
    }
  };

  const handleSpeedToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRate: 1 | 1.5 | 2 = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const effectiveDuration = totalDuration > 0 ? totalDuration : (audioRef.current?.duration && isFinite(audioRef.current.duration) ? audioRef.current.duration : 0);
  const progressPercent = effectiveDuration > 0 ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100)) : 0;

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[220px] sm:min-w-[260px] max-w-full select-none">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={(e) => {
          const ct = e.currentTarget.currentTime;
          setCurrentTime(ct);
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (d && !isNaN(d) && isFinite(d) && d > 0) {
            setTotalDuration(Math.round(d));
          }
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (d && !isNaN(d) && isFinite(d) && d > 0) {
            setTotalDuration(Math.round(d));
          }
        }}
        onError={(e) => {
          console.warn("[VoicePlayer] Audio error event:", e);
          setIsPlaying(false);
        }}
      />

      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all active:scale-95 cursor-pointer ${
          isMe 
            ? 'bg-white text-teal-700 hover:bg-white/90' 
            : 'bg-primary text-white hover:bg-primary/90'
        }`}
        title={isPlaying ? "Pause" : "Play voice note"}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
        <div className="relative flex items-center w-full group">
          <div className="flex items-center justify-between w-full h-5 gap-[2px] opacity-70 pointer-events-none">
            {[35, 60, 40, 80, 55, 90, 70, 45, 85, 65, 95, 40, 75, 50, 85, 60, 40, 70, 90, 50, 30].map((h, i) => {
              const barPercent = (i / 21) * 100;
              const isPassed = barPercent <= progressPercent;
              return (
                <span
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`w-1 rounded-full transition-colors duration-100 ${
                    isPassed
                      ? isMe ? 'bg-white' : 'bg-primary'
                      : isMe ? 'bg-white/40' : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                />
              );
            })}
          </div>

          <input
            type="range"
            min={0}
            max={effectiveDuration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] leading-none">
          <span className={`font-mono font-medium ${isMe ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
            {formatTime(isPlaying ? currentTime : (effectiveDuration || currentTime))}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSpeedToggle}
              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full transition-all cursor-pointer ${
                isMe
                  ? 'bg-black/20 text-white hover:bg-black/30'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
              title="Toggle speed"
            >
              {playbackRate}x
            </button>
            <Mic className={`w-3.5 h-3.5 ${isMe ? 'text-white/70' : 'text-teal-600 dark:text-teal-400'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface VoiceRecorderProps {
  onSendVoice: (audioBlob: Blob, duration: number, viewOnce?: boolean) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSendVoice, onCancel }: VoiceRecorderProps) {
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewOnce, setViewOnce] = useState(false);
  const [waveformAmplitudes, setWaveformAmplitudes] = useState<number[]>(() => new Array(32).fill(15));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Timing refs for 100% accurate, zero-drift wall-clock counting
  const startTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Web Audio API refs for real-time live microphone visualizer
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function initRecorder() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });

        if (isCancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        // Initialize Web Audio Context for live audio wave
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.65;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateWaveform = () => {
              if (analyserRef.current && !isCancelled) {
                analyserRef.current.getByteFrequencyData(dataArray);
                // Sample 32 values mapped between 10% and 95% height
                const bars: number[] = [];
                const step = Math.max(1, Math.floor(dataArray.length / 32));
                for (let i = 0; i < 32; i++) {
                  const val = dataArray[i * step] || 0;
                  const normalized = Math.max(10, Math.min(95, Math.round((val / 255) * 85 + 10)));
                  bars.push(normalized);
                }
                setWaveformAmplitudes(bars);
                animationFrameRef.current = requestAnimationFrame(updateWaveform);
              }
            };

            animationFrameRef.current = requestAnimationFrame(updateWaveform);
          }
        } catch (audioErr) {
          console.warn("[VoiceRecorder] AudioContext visualizer warning:", audioErr);
        }

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
            ? 'audio/ogg;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/mp4')
              ? 'audio/mp4'
              : '';

        const recorder = mimeType 
          ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 })
          : new MediaRecorder(stream);

        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        // Start timeslice recording
        recorder.start(100);

        // Start wall-clock timer
        startTimeRef.current = Date.now();
        accumulatedTimeRef.current = 0;

        timerIntervalRef.current = setInterval(() => {
          if (startTimeRef.current > 0) {
            const elapsed = Math.floor((accumulatedTimeRef.current + (Date.now() - startTimeRef.current)) / 1000);
            setRecordingSeconds(elapsed);
          }
        }, 100);

      } catch (err: any) {
        console.error("Microphone access error:", err);
        alert("Unable to access microphone: " + (err.message || 'Permission denied'));
        onCancel();
      }
    }

    initRecorder();

    return () => {
      isCancelled = true;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [onCancel]);

  const togglePauseResume = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (!isPaused) {
      // Pause
      if (recorder.state === 'recording') {
        recorder.pause();
      }
      if (startTimeRef.current > 0) {
        accumulatedTimeRef.current += Date.now() - startTimeRef.current;
        startTimeRef.current = 0;
      }
      setIsPaused(true);
    } else {
      // Resume
      if (recorder.state === 'paused') {
        recorder.resume();
      }
      startTimeRef.current = Date.now();
      setIsPaused(false);
    }
  };

  const handleFinishAndSend = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      onCancel();
      return;
    }

    const finalDuration = Math.max(1, recordingSeconds);

    recorder.onstop = () => {
      const mime = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mime });
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      onSendVoice(audioBlob, finalDuration, viewOnce);
    };

    try {
      recorder.requestData();
      recorder.stop();
    } catch {
      recorder.stop();
    }
  };

  const handleDiscard = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    onCancel();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center justify-between w-full h-11 sm:h-12 px-3 sm:px-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-full shadow-md animate-in fade-in duration-150 select-none">
      {/* Left: Discard / Trash Button */}
      <button
        type="button"
        onClick={handleDiscard}
        className="p-1.5 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer shrink-0"
        title="Delete voice recording"
      >
        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.75]" />
      </button>

      {/* Middle: Blinking Recording Dot + Timer + Live Frequency Waveform */}
      <div className="flex-1 flex items-center gap-2 sm:gap-3 px-2 min-w-0">
        {/* Red blinking dot */}
        <div className="flex items-center justify-center shrink-0">
          <span className={`w-2.5 h-2.5 rounded-full bg-red-500 ${!isPaused ? 'animate-pulse' : 'opacity-60'}`} />
        </div>

        {/* Real-time wall-clock timer */}
        <span className="text-xs sm:text-sm font-mono font-semibold text-zinc-800 dark:text-zinc-200 shrink-0 min-w-[36px]">
          {formatTimer(recordingSeconds)}
        </span>

        {/* Live dynamic audio frequency waveform bars */}
        <div className="flex-1 flex items-center justify-center h-6 gap-[2px] sm:gap-[3px] overflow-hidden opacity-85 px-1">
          {waveformAmplitudes.map((h, i) => (
            <span
              key={i}
              style={{ height: isPaused ? '15%' : `${h}%` }}
              className={`w-[2.5px] sm:w-[3px] rounded-full transition-all duration-75 shrink-0 ${
                isPaused 
                  ? 'bg-zinc-300 dark:bg-zinc-700' 
                  : 'bg-teal-600 dark:bg-teal-400'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Right Controls: Pause/Resume + View Once + Send */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Pause / Resume Button */}
        <button
          type="button"
          onClick={togglePauseResume}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            isPaused
              ? 'text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30'
              : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
          }`}
          title={isPaused ? "Resume recording" : "Pause recording"}
        >
          {isPaused ? (
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          ) : (
            <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          )}
        </button>

        {/* WhatsApp View-Once Toggle */}
        <button
          type="button"
          onClick={() => setViewOnce(prev => !prev)}
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-extrabold text-xs transition-all cursor-pointer border ${
            viewOnce 
              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 scale-105' 
              : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
          title={viewOnce ? "View once is ON" : "View once is OFF"}
        >
          <span>①</span>
        </button>

        {/* WhatsApp Green Send Button */}
        <button
          type="button"
          onClick={handleFinishAndSend}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          title="Send voice note"
        >
          <Send className="w-4 h-4 fill-white -ml-0.5" />
        </button>
      </div>
    </div>
  );
}
