'use client';

import { VoiceCompanionMode, VoicePriorityConfig, SpokenNotification } from './voiceTypes';

export class VoiceCompanionEngine {
  private recognition: any = null;
  private mode: VoiceCompanionMode = 'OFF';
  private priorityConfig: VoicePriorityConfig;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private wakeWordDetected: boolean = false;
  private speechVolume: number = 0;
  
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
        this.recognition.lang = 'en-IN'; // Multi-lingual Indian English/Hindi support

        this.setupRecognitionListeners();
      }
    }
  }

  public setMode(newMode: VoiceCompanionMode) {
    this.mode = newMode;
    if (newMode === 'OFF' || newMode === 'SILENT' || newMode === 'MEETING') {
      this.stopListening();
    } else if (newMode === 'ALWAYS_LISTENING' || newMode === 'DRIVING') {
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
    if (!this.recognition || this.isListening) return;
    try {
      this.recognition.start();
      this.isListening = true;
      this.notifyStatus();
    } catch (e) {
      console.warn('Voice Engine listening error:', e);
    }
  }

  public stopListening() {
    if (!this.recognition || !this.isListening) return;
    try {
      this.recognition.stop();
      this.isListening = false;
      this.wakeWordDetected = false;
      this.notifyStatus();
    } catch (e) {
      console.warn('Voice Engine stop listening error:', e);
    }
  }

  public speak(text: string, onEnd?: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.mode === 'SILENT' || this.mode === 'MEETING') return;

    window.speechSynthesis.cancel(); // Stop any active speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    // Pick warm natural Indian English/Hindi voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('hi-IN') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('natural'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.notifyStatus();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.notifyStatus();
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.notifyStatus();
    };

    window.speechSynthesis.speak(utterance);
  }

  public speakNotification(notification: SpokenNotification) {
    // Check priority permissions
    if (notification.priority === 'low' && !this.priorityConfig.lowPriority.dailyAnalytics) return;
    if (notification.priority === 'medium' && !this.priorityConfig.mediumPriority.messages) return;

    this.speak(notification.conversationalText);
  }

  private setupRecognitionListeners() {
    if (!this.recognition) return;

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const spokenText = (finalTranscript || interim).trim().toLowerCase();

      // Check Wake Word ("Tolee", "Hey Tolee", "Tolee listen")
      if (!this.wakeWordDetected && (spokenText.includes('tolee') || spokenText.includes('hey tolee'))) {
        this.wakeWordDetected = true;
        this.notifyStatus();
        this.speak('Yes, I am listening.', () => {
          if (this.onWakeWordCallback) this.onWakeWordCallback();
        });
      } else if (this.wakeWordDetected && finalTranscript.length > 3) {
        if (this.onCommandCallback) {
          this.onCommandCallback(finalTranscript);
        }
        // Auto reset wake word after command processing
        setTimeout(() => {
          this.wakeWordDetected = false;
          this.notifyStatus();
        }, 1500);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.notifyStatus();
      // Auto-restart if ALWAYS_LISTENING or DRIVING mode
      if (this.mode === 'ALWAYS_LISTENING' || this.mode === 'DRIVING') {
        setTimeout(() => this.startListening(), 500);
      }
    };
  }

  private notifyStatus() {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(this.isListening, this.isSpeaking, this.wakeWordDetected);
    }
  }
}
