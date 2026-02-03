
export interface Character {
  id: string;
  name: string;
  avatar: string;
  bubbleColor: string;
  textColor: string;
  isAi: boolean;
  // Font settings
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  // Audio settings
  alertSound?: string;
}

export interface ChatMessage {
  id: string;
  characterId: string;
  text: string;
  timestamp: number;
  audioUrl?: string; // Data URL of the generated TTS
  voiceType?: 'Kore' | 'Puck'; // To remember which voice was generated
}

export type AnimationDirection = 'bottom-up' | 'top-down' | 'pop-in' | 'slide-in';

export interface IntroOutroConfig {
  text: string;
  enabled: boolean;
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline' | 'line-through';
  textAlign: 'left' | 'center' | 'right';
  shadow: boolean;
  outline: boolean;
  outlineColor: string;
  scaleX: number;
  scaleY: number;
  rotation: number;
  marginV: number;
  marginH: number;
}

export interface AppSettings {
  animationDuration: number;
  staggerDelay: number;
  holdDuration: number;
  startDelay: number;
  bitrate: number;
  font: string;
  canvasWidth: number;
  canvasHeight: number;
  canvasColor: string;
  backgroundImage?: string;
  backgroundSize: 'cover' | 'contain' | 'auto' | '100% 100%' | 'repeat';
  backgroundMusic?: string;
  backgroundMusicVolume: number;
  showNames: boolean;
  showTails: boolean;
  animationDirection: AnimationDirection;
  intro: IntroOutroConfig;
  outro: IntroOutroConfig;
  showAiGenerator: boolean; // New toggle feature based on screenshot request
}

export interface TranscriptionItem {
  text: string;
  type: 'user' | 'model';
  timestamp: number;
}
