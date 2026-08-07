'use client';

import { VoiceCompanionMode, VoicePriorityConfig, SpokenNotification } from './voiceTypes';

export function unlockMobileAudio() {
  if (typeof window === 'undefined') return;
  
  // Unlock SpeechSynthesis audio playback on Mobile Safari & Android Chrome
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();
      const unlockUtterance = new SpeechSynthesisUtterance(' ');
      unlockUtterance.volume = 0.01;
      unlockUtterance.rate = 10;
      window.speechSynthesis.speak(unlockUtterance);
    } catch (e) {
      console.warn('Audio unlock notice:', e);
    }
  }
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
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
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
      console.warn('Voice Engine listening notice, retrying with fresh instance:', e);
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

  public speak(text: string, langCode: string = 'hi-IN', onEnd?: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.mode === 'SILENT' || this.mode === 'MEETING') return;
    if (!text || text.trim().length === 0) return;

    // Temporarily pause recognition while AI speaks out loud (prevents self-echo)
    this.stopListening();

    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel(); // Cancel previous queued speech
    } catch (e) {}

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Smooth, mature human cadence
    utterance.pitch = 1.0;  // Warm natural human pitch
    utterance.lang = langCode;

    // PREVENT GARBAGE COLLECTION: Store reference on window object!
    (window as any)._toleeActiveUtterance = utterance;

    const voices = window.speechSynthesis.getVoices();

    // 🇮🇳 Authentic Indian Voice Selection Engine (Eliminating Western Accents)
    // 1. Prioritize explicit Hindi Indian voices (hi-IN, hi_IN, Swara, Hemant, Madhur, Google हिन्दी)
    let indianVoice = voices.find(v => {
      const lang = v.lang.toLowerCase();
      const name = v.name.toLowerCase();
      return (
        lang.includes('hi-in') || 
        lang.includes('hi_in') || 
        name.includes('swara') || 
        name.includes('hemant') || 
        name.includes('madhur') || 
        name.includes('kalpana') || 
        name.includes('karan') || 
        name.includes('हिन्दी') || 
        name.includes('hindi')
      );
    });

    // 2. Fallback to Indian English voices (en-IN, Neerja, Prabhat, Google English India)
    if (!indianVoice) {
      indianVoice = voices.find(v => {
        const lang = v.lang.toLowerCase();
        const name = v.name.toLowerCase();
        return (
          lang.includes('en-in') || 
          lang.includes('en_in') || 
          name.includes('neerja') || 
          name.includes('prabhat') || 
          name.includes('india')
        );
      });
    }

    // 3. Fallback to any voice with 'hi' in language tag
    if (!indianVoice) {
      indianVoice = voices.find(v => v.lang.toLowerCase().startsWith('hi'));
    }

    if (indianVoice) {
      utterance.voice = indianVoice;
      utterance.lang = indianVoice.lang || 'hi-IN';
    } else {
      utterance.lang = 'hi-IN';
    }

    let hasFinished = false;

    const finishSpeaking = () => {
      if (hasFinished) return;
      hasFinished = true;
      (window as any)._toleeActiveUtterance = null;
      this.isSpeaking = false;
      this.notifyStatus();
      if (onEnd) onEnd();

      // Automatically resume active listening as soon as AI finishes speaking!
      if (this.mode === 'ALWAYS_LISTENING' || this.mode === 'DRIVING') {
        setTimeout(() => this.startListening(), 400);
      }
    };

    // Calculate maximum expected speaking duration with safety margin
    const safetyTimeoutMs = Math.max(3500, Math.min(20000, (text.length / 10) * 1000 + 3000));
    const safetyTimer = setTimeout(() => {
      if (!hasFinished) {
        console.warn('SpeechSynthesis safety timeout triggered, resuming listening...');
        try { window.speechSynthesis.cancel(); } catch(e) {}
        finishSpeaking();
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
      console.warn('SpeechSynthesis utterance error:', err);
      clearTimeout(safetyTimer);
      finishSpeaking();
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Failed to invoke speechSynthesis.speak:', err);
      clearTimeout(safetyTimer);
      finishSpeaking();
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
        if (textToProcess.length > 2 && textToProcess !== this.lastProcessedTranscript) {
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
