'use client';

import { VoiceCompanionMode, VoicePriorityConfig, SpokenNotification } from './voiceTypes';

export class VoiceCompanionEngine {
  private recognition: any = null;
  private mode: VoiceCompanionMode = 'OFF';
  private priorityConfig: VoicePriorityConfig;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private wakeWordDetected: boolean = true;
  private lastProcessedTranscript: string = '';
  
  private onWakeWordCallback?: () => void;
  private onCommandCallback?: (transcript: string) => void;
  private onStatusChangeCallback?: (isListening: boolean, isSpeaking: boolean, wakeWord: boolean) => void;

  constructor(initialMode: VoiceCompanionMode = 'OFF') {
    this.mode = initialMode;
    this.priorityConfig = {
      highPriority: {
        alarms: true,
        meetings: true,
        emergencyAlerts: true,
        crmUrgentFollowups: true
      },
      mediumPriority: {
        messages: true,
        comments: true,
        crmLeads: true
      },
      lowPriority: {
        likes: false,
        followers: false,
        dailyAnalytics: true
      }
    };

    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-IN'; // Multi-lingual Hindi/Marathi/English

        this.setupRecognitionListeners();
      }
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

  public onStatusChange(cb: (isListening: boolean, isSpeaking: boolean, wakeWord: boolean) => void) {
    this.onStatusChangeCallback = cb;
  }

  public startListening() {
    if (!this.recognition || this.isListening || this.isSpeaking) return;
    try {
      this.recognition.start();
      this.isListening = true;
      this.notifyStatus();
    } catch (e) {
      console.warn('Voice Engine listening notice:', e);
    }
  }

  public stopListening() {
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

    // Temporarily pause recognition while AI speaks out loud (prevents self-echo)
    this.stopListening();

    window.speechSynthesis.cancel(); // Cancel previous queued speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.lang = langCode;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.toLowerCase().includes(langCode.toLowerCase()) || v.lang.includes('hi-IN') || v.lang.includes('en-IN'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.notifyStatus();
    };

    const finishSpeaking = () => {
      this.isSpeaking = false;
      this.notifyStatus();
      if (onEnd) onEnd();

      // Automatically resume active listening as soon as AI finishes speaking!
      if (this.mode === 'ALWAYS_LISTENING' || this.mode === 'DRIVING') {
        setTimeout(() => this.startListening(), 400);
      }
    };

    utterance.onend = finishSpeaking;
    utterance.onerror = finishSpeaking;

    window.speechSynthesis.speak(utterance);
  }

  public speakNotification(notification: SpokenNotification) {
    if (notification.priority === 'low' && !this.priorityConfig.lowPriority.dailyAnalytics) return;
    if (notification.priority === 'medium' && !this.priorityConfig.mediumPriority.messages) return;

    this.speak(notification.conversationalText);
  }

  private setupRecognitionListeners() {
    if (!this.recognition) return;

    this.recognition.onresult = (event: any) => {
      if (this.isSpeaking) return; // Ignore audio input while AI is speaking

      let interim = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const rawText = (finalTranscript || interim).trim();
      const spokenText = rawText.toLowerCase();

      if (spokenText.includes('tolee') || spokenText.includes('hey tolee')) {
        this.wakeWordDetected = true;
        this.notifyStatus();
        if (this.onWakeWordCallback) this.onWakeWordCallback();
      }

      // Process ANY spoken command for final transcripts (length > 2)
      if (finalTranscript.trim().length > 2) {
        const cleanedTranscript = finalTranscript.trim();
        
        // Prevent duplicate processing of identical rapid transcripts
        if (cleanedTranscript !== this.lastProcessedTranscript) {
          this.lastProcessedTranscript = cleanedTranscript;
          
          if (this.onCommandCallback) {
            this.onCommandCallback(cleanedTranscript);
          }

          // Reset last transcript cache after 3 seconds
          setTimeout(() => {
            if (this.lastProcessedTranscript === cleanedTranscript) {
              this.lastProcessedTranscript = '';
            }
          }, 3000);
        }
      }
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
