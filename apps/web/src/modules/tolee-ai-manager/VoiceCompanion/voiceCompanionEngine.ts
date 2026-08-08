'use client';

import { VoiceCompanionMode, VoicePriorityConfig, SpokenNotification } from './voiceTypes';

// Pre-load Web Speech Synthesis voices globally
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        try { window.speechSynthesis.getVoices(); } catch (e) {}
      };
    }
  } catch (e) {}
}

/**
 * Mobile Audio Unlocker:
 * Bypasses iOS Safari & Android Chrome Web Audio & SpeechSynthesis Autoplay restrictions
 * by triggering a silent audio buffer on any user touch/click gesture.
 */
export function unlockMobileAudio() {
  if (typeof window === 'undefined') return;
  
  // 1. Unlock Web SpeechSynthesis
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();
      const unlockUtterance = new SpeechSynthesisUtterance('');
      unlockUtterance.volume = 0.01;
      unlockUtterance.rate = 10;
      window.speechSynthesis.speak(unlockUtterance);
    } catch (e) {
      console.warn('Audio unlock notice:', e);
    }
  }

  // 2. Create/Unlock persistent Web Audio Context & Dummy Audio Node
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      if (!(window as any)._toleeAudioCtx) {
        (window as any)._toleeAudioCtx = new AudioCtx();
      }
      const ctx = (window as any)._toleeAudioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
  } catch (e) {}

  // 3. Create persistent HTML5 Audio element to keep mobile audio channel unlocked
  try {
    if (!(window as any)._toleeUnlockedAudioElem) {
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      (window as any)._toleeUnlockedAudioElem = audio;
    }
    const elem = (window as any)._toleeUnlockedAudioElem;
    elem.play().catch(() => {});
  } catch (e) {}
}

export class VoiceCompanionEngine {
  private recognition: any = null;
  private mode: VoiceCompanionMode = 'OFF';
  private priorityConfig: VoicePriorityConfig;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private wakeWordDetected: boolean = true;
  private lastProcessedTranscript: string = '';
  private silenceTimer: any = null;
  private currentSpokenText: string = '';
  
  private onWakeWordCallback?: () => void;
  private onCommandCallback?: (transcript: string) => void;
  private onInterimCallback?: (text: string) => void;
  private onStatusChangeCallback?: (isListening: boolean, isSpeaking: boolean, wakeWord: boolean) => void;

  constructor(initialMode: VoiceCompanionMode = 'OFF') {
    this.mode = initialMode;
    this.priorityConfig = {
      highPriority: { alarms: true, meetings: true, emergencyAlerts: true, crmUrgentFollowups: true },
      mediumPriority: { messages: true, comments: true, crmLeads: true },
      lowPriority: { likes: false, followers: false, dailyAnalytics: true }
    };

    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (this.recognition) {
        this.recognition.onresult = null;
        this.recognition.onend = null;
        this.recognition.onerror = null;
      }
    } catch (e) {}

    try {
      this.recognition = new SpeechRecognition();
      const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
      
      // Continuous mode causes silent drops on Mobile Safari/Chrome; setting continuous=false on mobile is 100x more reliable
      this.recognition.continuous = !isMobile;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      const savedLang = localStorage.getItem('tolee_native_lang') || 'hi-IN';
      this.recognition.lang = savedLang;
      this.setupRecognitionListeners();
    } catch (err) {
      console.warn('SpeechRecognition init error:', err);
    }
  }

  public setMode(newMode: VoiceCompanionMode) {
    this.mode = newMode;
    if (newMode === 'OFF' || newMode === 'SILENT' || newMode === 'MEETING') {
      this.stopListening();
    } else if (newMode === 'ALWAYS_LISTENING' || newMode === 'DRIVING') {
      this.wakeWordDetected = true;
      this.startListening();
    }
  }

  public setPriorityConfig(config: VoicePriorityConfig) {
    this.priorityConfig = config;
  }

  public onWakeWord(cb: () => void) {
    this.onWakeWordCallback = cb;
  }

  public onCommand(cb: (transcript: string) => void) {
    this.onCommandCallback = cb;
  }

  public onInterim(cb: (text: string) => void) {
    this.onInterimCallback = cb;
  }

  public onStatusChange(cb: (isListening: boolean, isSpeaking: boolean, wakeWord: boolean) => void) {
    this.onStatusChangeCallback = cb;
  }

  public async startListening() {
    if (this.isListening || this.isSpeaking) return;

    if (!this.recognition) {
      this.initRecognition();
    }

    unlockMobileAudio();

    // Explicitly request browser microphone permission
    if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr) {
        console.warn('Microphone permission notice:', micErr);
      }
    }

    try {
      const savedLang = typeof window !== 'undefined' ? (localStorage.getItem('tolee_native_lang') || 'hi-IN') : 'hi-IN';
      if (this.recognition) {
        this.recognition.lang = savedLang;
        this.recognition.start();
        this.isListening = true;
        this.notifyStatus();
      }
    } catch (e: any) {
      console.warn('Voice Engine listening notice, retrying fresh instance:', e);
      this.isListening = false;
      this.initRecognition();
      try {
        if (this.recognition) {
          this.recognition.start();
          this.isListening = true;
          this.notifyStatus();
        }
      } catch (err2) {
        console.warn('Voice Engine restart failed:', err2);
      }
    }
  }

  public stopListening() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (!this.recognition) return;
    try {
      this.recognition.stop();
      this.isListening = false;
      this.notifyStatus();
    } catch (e) {
      console.warn('Voice Engine stop listening notice:', e);
    }
  }

  /**
   * Speak out response using Authentic Indian Human Voice Synthesis with Fallback Audio Engine
   */
  public speak(text: string, langCode: string = 'hi-IN', onEnd?: () => void) {
    if (typeof window === 'undefined') return;
    if (this.mode === 'SILENT' || this.mode === 'MEETING') return;
    if (!text || text.trim().length === 0) return;

    // Temporarily pause recognition while AI speaks out loud (prevents self-echo)
    this.stopListening();
    unlockMobileAudio();

    const cleanSpokenText = text
      .replace(/[*_#`[\]()]/g, '')
      .replace(/https?:\/\/\S+/gi, '')
      .trim();

    if (!cleanSpokenText) return;

    if (!('speechSynthesis' in window)) {
      this.fallbackAudioSpeak(cleanSpokenText, langCode, onEnd);
      return;
    }

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel(); // Cancel previous queued speech
    } catch (e) {}

    const utterance = new SpeechSynthesisUtterance(cleanSpokenText);
    utterance.rate = 0.92; // Natural, warm Indian conversational speed (not rushed)
    utterance.pitch = 1.02; // Human warm pitch

    // Prevent garbage collection on browser engines
    (window as any)._toleeActiveUtterance = utterance;

    const voices = window.speechSynthesis.getVoices();

    // 🇮🇳 Authentic Indian Human Voice Picker Algorithm
    let selectedVoice: SpeechSynthesisVoice | undefined = undefined;

    if (voices && voices.length > 0) {
      // 1. Search for Google Hindi / Swara / Hemant / Natural Indian Hindi voices
      selectedVoice = voices.find(v => {
        const lang = (v.lang || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        return (
          (lang.includes('hi') || name.includes('hindi') || name.includes('हिन्दी')) &&
          (name.includes('google') || name.includes('swara') || name.includes('hemant') || name.includes('madhur') || name.includes('kalpana') || name.includes('karan') || name.includes('india'))
        );
      });

      // 2. Search for any Hindi language voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => {
          const lang = (v.lang || '').toLowerCase();
          return lang.includes('hi-in') || lang.includes('hi_in') || lang.startsWith('hi');
        });
      }

      // 3. Search for Indian Accent English Voice (Neerja, Prabhat, Google English India)
      if (!selectedVoice) {
        selectedVoice = voices.find(v => {
          const lang = (v.lang || '').toLowerCase();
          const name = (v.name || '').toLowerCase();
          return (
            lang.includes('en-in') || lang.includes('en_in') || name.includes('neerja') || name.includes('prabhat') || name.includes('india')
          );
        });
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang || langCode;
    } else {
      utterance.lang = langCode || 'hi-IN';
    }

    let hasFinished = false;

    const finishSpeaking = () => {
      if (hasFinished) return;
      hasFinished = true;
      (window as any)._toleeActiveUtterance = null;
      this.isSpeaking = false;
      this.notifyStatus();
      if (onEnd) onEnd();

      // Automatically resume active listening on mobile/desktop after AI finishes speaking
      if (this.mode === 'ALWAYS_LISTENING' || this.mode === 'DRIVING') {
        setTimeout(() => this.startListening(), 400);
      }
    };

    // Calculate safety timeout based on text length
    const safetyTimeoutMs = Math.max(4000, Math.min(25000, (cleanSpokenText.length / 8) * 1000 + 4000));
    const safetyTimer = setTimeout(() => {
      if (!hasFinished) {
        console.warn('SpeechSynthesis timeout on mobile, switching to Web Audio TTS fallback...');
        try { window.speechSynthesis.cancel(); } catch(e) {}
        this.fallbackAudioSpeak(cleanSpokenText, langCode, finishSpeaking);
      }
    }, safetyTimeoutMs);

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.notifyStatus();
    };

    utterance.onend = () => {
      clearTimeout(safetyTimer);
      finishSpeaking();
    };

    utterance.onerror = (err) => {
      console.warn('SpeechSynthesis utterance error, using audio fallback:', err);
      clearTimeout(safetyTimer);
      this.fallbackAudioSpeak(cleanSpokenText, langCode, finishSpeaking);
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Failed to invoke speechSynthesis.speak, using audio fallback:', err);
      clearTimeout(safetyTimer);
      this.fallbackAudioSpeak(cleanSpokenText, langCode, finishSpeaking);
    }
  }

  /**
   * High Reliability Mobile Audio Fallback TTS Engine
   * Plays voice responses using Google Translate TTS HTML5 Audio stream
   */
  private fallbackAudioSpeak(text: string, langCode: string, onEnd?: () => void) {
    try {
      const cleanText = text.slice(0, 250);
      const langParam = langCode.startsWith('hi') ? 'hi' : langCode.startsWith('mr') ? 'mr' : langCode.startsWith('gu') ? 'gu' : langCode.startsWith('ta') ? 'ta' : langCode.startsWith('te') ? 'te' : 'hi';
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${langParam}&client=tw-ob`;
      
      let audio: HTMLAudioElement;
      if (typeof window !== 'undefined' && (window as any)._toleeUnlockedAudioElem) {
        audio = (window as any)._toleeUnlockedAudioElem;
        audio.src = audioUrl;
      } else {
        audio = new Audio(audioUrl);
      }

      this.isSpeaking = true;
      this.notifyStatus();

      audio.onended = () => {
        this.isSpeaking = false;
        this.notifyStatus();
        if (onEnd) onEnd();
      };

      audio.onerror = () => {
        this.isSpeaking = false;
        this.notifyStatus();
        if (onEnd) onEnd();
      };

      audio.play().catch(e => {
        console.warn('Fallback audio playback error on mobile:', e);
        this.isSpeaking = false;
        this.notifyStatus();
        if (onEnd) onEnd();
      });
    } catch (e) {
      this.isSpeaking = false;
      this.notifyStatus();
      if (onEnd) onEnd();
    }
  }

  public speakNotification(notification: SpokenNotification) {
    if (notification.priority === 'low' && !this.priorityConfig.lowPriority.dailyAnalytics) return;
    if (notification.priority === 'medium' && !this.priorityConfig.mediumPriority.messages) return;

    this.speak(notification.conversationalText);
  }

  private setupRecognitionListeners() {
    if (!this.recognition) return;

    this.recognition.onresult = (event: any) => {
      if (this.isSpeaking) return; // Ignore audio input while AI is speaking out loud

      let interim = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const activeText = (finalTranscript || interim).trim();
      if (!activeText) return;

      this.currentSpokenText = activeText;

      // Update HUD in real-time with what the mic is hearing
      if (this.onInterimCallback) {
        this.onInterimCallback(activeText);
      }

      if (activeText.toLowerCase().includes('tolee') || activeText.toLowerCase().includes('hey tolee')) {
        this.wakeWordDetected = true;
        this.notifyStatus();
        if (this.onWakeWordCallback) this.onWakeWordCallback();
      }

      // Debounce user silence (800ms after user finishes speaking phrase)
      if (this.silenceTimer) clearTimeout(this.silenceTimer);

      this.silenceTimer = setTimeout(() => {
        const textToProcess = this.currentSpokenText.trim();
        if (textToProcess.length > 1 && textToProcess !== this.lastProcessedTranscript) {
          this.lastProcessedTranscript = textToProcess;
          this.currentSpokenText = '';

          if (this.onCommandCallback) {
            this.onCommandCallback(textToProcess);
          }

          // Reset duplicate prevention cache after 3s
          setTimeout(() => {
            if (this.lastProcessedTranscript === textToProcess) {
              this.lastProcessedTranscript = '';
            }
          }, 3000);
        }
      }, 800);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.notifyStatus();
      if ((this.mode === 'ALWAYS_LISTENING' || this.mode === 'DRIVING') && !this.isSpeaking) {
        setTimeout(() => this.startListening(), 400);
      }
    };

    this.recognition.onerror = (err: any) => {
      console.warn('SpeechRecognition error notice:', err);
      this.isListening = false;
      this.notifyStatus();
      if ((this.mode === 'ALWAYS_LISTENING' || this.mode === 'DRIVING') && !this.isSpeaking) {
        setTimeout(() => this.startListening(), 800);
      }
    };
  }

  private notifyStatus() {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(this.isListening, this.isSpeaking, this.wakeWordDetected);
    }
  }
}
