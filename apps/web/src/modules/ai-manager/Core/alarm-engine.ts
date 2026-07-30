'use client';

let audioCtx: AudioContext | null = null;
let alarmInterval: any = null;

// Play Loud Phone Alarm Ringtone Tone via Web Audio API
export function playRingtoneAlarm() {
  stopRingtoneAlarm();
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();

    let toggle = false;
    alarmInterval = setInterval(() => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(toggle ? 880 : 1046, audioCtx.currentTime); // High pitch alarm frequency
      
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);

      toggle = !toggle;
    }, 400);
  } catch (err) {
    console.error("Failed to start Web Audio Alarm:", err);
  }
}

// Stop Audio Ringtone Alarm & Speech Instantly
export function stopRingtoneAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  if (audioCtx) {
    try {
      audioCtx.close();
    } catch (e) {}
    audioCtx = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// AI Voice Speech Synthesis
export function speakAlarmVoice(text: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }
}

// Web Browser Push Notification
export function triggerSystemNotification(title: string, body: string) {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'tolee-ai-alarm',
        requireInteraction: true
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico', tag: 'tolee-ai-alarm', requireInteraction: true });
        }
      });
    }
  }
}
