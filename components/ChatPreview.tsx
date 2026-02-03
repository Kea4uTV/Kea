
import React, { useRef, useEffect, useState } from 'react';
import { Character, ChatMessage, AppSettings, IntroOutroConfig } from '../types';
import { decode, decodeAudioData } from '../utils/audio';

interface ChatPreviewProps {
  messages: ChatMessage[];
  characters: Character[];
  settings: AppSettings;
  previewKey: number;
  isLive: boolean;
  onToggleLive: () => void;
  sharedAudioContext: AudioContext;
}

const AnimatedText: React.FC<{ text: string; style: React.CSSProperties }> = ({ text, style }) => {
  const [displayText, setDisplayText] = useState('');
  useEffect(() => {
    setDisplayText('');
    const words = text.split(' ');
    let current = '';
    let i = 0;
    const interval = setInterval(() => {
      if (i < words.length) {
        current += (i === 0 ? '' : ' ') + words[i];
        setDisplayText(current);
        i++;
      } else { clearInterval(interval); }
    }, 50);
    return () => clearInterval(interval);
  }, [text]);
  return <div style={style} className="leading-tight break-words min-h-[1.2em]">{displayText}</div>;
};

const IntroOutroDisplay: React.FC<{ config: IntroOutroConfig }> = ({ config }) => {
  const style: React.CSSProperties = {
    fontFamily: config.fontFamily,
    fontSize: `${config.fontSize}px`,
    color: config.color,
    backgroundColor: config.backgroundColor,
    fontWeight: config.fontWeight,
    fontStyle: config.fontStyle,
    textDecoration: config.textDecoration,
    textAlign: config.textAlign,
    padding: '24px',
    borderRadius: '28px',
    boxShadow: config.shadow ? '0 20px 40px -10px rgba(0, 0, 0, 0.4)' : 'none',
    width: `calc(100% - ${config.marginH * 2}px)`,
    margin: `${config.marginV}px auto`,
    border: config.outline ? `4px solid ${config.outlineColor}` : 'none',
    transform: `scale(${config.scaleX}, ${config.scaleY}) rotate(${config.rotation}deg)`,
    transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  };
  return (
    <div className="animate-in fade-in zoom-in-90 duration-700 flex justify-center w-full" style={{ perspective: '1200px' }}>
      <div style={style}>
        <AnimatedText text={config.text} style={{ color: config.color }} />
      </div>
    </div>
  );
};

export const ChatPreview: React.FC<ChatPreviewProps> = ({ 
  messages, characters, settings, previewKey, isLive, onToggleLive, sharedAudioContext
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const musicSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  const getCharacter = (id: string) => characters.find((c) => c.id === id);

  const showIntro = settings.intro.enabled && settings.intro.text.trim() !== '';
  const showOutro = settings.outro.enabled && settings.outro.text.trim() !== '';
  const totalSteps = (showIntro ? 1 : 0) + messages.length + (showOutro ? 1 : 0);

  useEffect(() => {
    setVisibleCount(0);
    let current = 0;

    // Logic for playing background music via AudioContext for capture support
    const playMusic = async () => {
      if (settings.backgroundMusic) {
        try {
          const res = await fetch(settings.backgroundMusic);
          const arrayBuffer = await res.arrayBuffer();
          const audioBuffer = await sharedAudioContext.decodeAudioData(arrayBuffer);
          const source = sharedAudioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.loop = true;
          
          const gainNode = sharedAudioContext.createGain();
          gainNode.gain.value = settings.backgroundMusicVolume;
          
          source.connect(gainNode);
          gainNode.connect(sharedAudioContext.destination);
          
          source.start(0);
          musicSourceRef.current = source;
        } catch (e) {
          console.error("Music playback failed:", e);
        }
      }
    };

    playMusic();

    const interval = setInterval(async () => {
      current++;
      
      let msgIndex = -1;
      if (showIntro) {
        if (current > 1) msgIndex = current - 2;
      } else {
        msgIndex = current - 1;
      }

      const isOutroStep = showOutro && current === totalSteps;
      const isIntroStep = showIntro && current === 1;

      if (!isIntroStep && !isOutroStep && msgIndex >= 0 && msgIndex < messages.length) {
        const newMsg = messages[msgIndex];
        const char = getCharacter(newMsg.characterId);
        if (newMsg.audioUrl) {
          try {
            const base64Data = newMsg.audioUrl.split(',')[1];
            const audioBuffer = await decodeAudioData(decode(base64Data), sharedAudioContext, 24000, 1);
            const source = sharedAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(sharedAudioContext.destination);
            source.start();
          } catch (e) { console.error("TTS playback failed:", e); }
        } else if (char?.alertSound) {
           // Route character alert sound through the same context
           try {
             const res = await fetch(char.alertSound);
             const ab = await res.arrayBuffer();
             const buffer = await sharedAudioContext.decodeAudioData(ab);
             const src = sharedAudioContext.createBufferSource();
             src.buffer = buffer;
             src.connect(sharedAudioContext.destination);
             src.start();
           } catch (e) { console.error("Alert sound failed:", e); }
        }
      }

      setVisibleCount(current);
      if (current >= totalSteps) {
        clearInterval(interval);
        setTimeout(() => {
          musicSourceRef.current?.stop();
          musicSourceRef.current = null;
        }, 1500); 
      }
    }, settings.staggerDelay || 1500);

    return () => {
      clearInterval(interval);
      musicSourceRef.current?.stop();
      musicSourceRef.current = null;
    };
  }, [previewKey, messages, settings.staggerDelay, characters, showIntro, showOutro, totalSteps, settings.backgroundMusic, sharedAudioContext]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [visibleCount]);

  const containerStyle: React.CSSProperties = {
    width: '360px', height: '640px',
    backgroundColor: settings.canvasColor,
    backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : 'none',
    backgroundSize: settings.backgroundSize === 'repeat' ? 'auto' : settings.backgroundSize,
    backgroundRepeat: settings.backgroundSize === 'repeat' ? 'repeat' : 'no-repeat',
    backgroundPosition: 'center',
    border: '12px solid #1f2937', borderRadius: '54px',
    boxShadow: '0 50px 100px -20px rgba(0,0,0,0.4), 0 30px 60px -30px rgba(0,0,0,0.5)',
    position: 'relative',
    overflow: 'hidden'
  };

  const getAnimationStyle = (direction: string, duration: number) => {
    switch (direction) {
      case 'bottom-up': return `animate-in fade-in slide-in-from-bottom-12 duration-${duration}`;
      case 'top-down': return `animate-in fade-in slide-in-from-top-12 duration-${duration}`;
      case 'pop-in': return `animate-in zoom-in-90 fade-in duration-${duration}`;
      case 'slide-in': return `animate-in fade-in slide-in-from-left-12 duration-${duration}`;
      default: return 'animate-in fade-in duration-300';
    }
  };

  return (
    <div style={containerStyle}>
      <div ref={scrollRef} className="h-full overflow-y-auto p-5 space-y-6 scroll-smooth no-scrollbar z-10 flex flex-col pt-10">
        {showIntro && visibleCount >= 1 && <IntroOutroDisplay config={settings.intro} />}

        {messages.slice(0, Math.max(0, showIntro ? visibleCount - 1 : visibleCount)).map((msg, index) => {
          const char = getCharacter(msg.characterId);
          if (!char) return null;
          const isSelf = char.isAi;
          const animClass = getAnimationStyle(settings.animationDirection, settings.animationDuration);
          const textStyle: React.CSSProperties = { fontFamily: char.fontFamily, fontSize: `${char.fontSize}px`, fontWeight: char.fontWeight, fontStyle: char.fontStyle, textDecoration: char.textDecoration, color: char.textColor };
          return (
            <div key={`${msg.id}-${previewKey}`} className={`flex items-end gap-3 ${isSelf ? 'flex-row-reverse' : 'flex-row'} ${animClass}`}>
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="relative">
                  <img src={char.avatar} alt={char.name} className="w-11 h-11 rounded-full border-2 border-white shadow-lg object-cover bg-gray-200" />
                  {isLive && isSelf && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-ping"></div>}
                </div>
                {settings.showNames && <span className="text-[10px] text-gray-600 font-bold whitespace-nowrap drop-shadow-md bg-white/60 px-2 rounded-full border border-white/40">{char.name}</span>}
              </div>
              <div className={`relative max-w-[80%] p-4 rounded-[26px] shadow-xl border border-white/30 backdrop-blur-md`} style={{ backgroundColor: char.bubbleColor + (char.bubbleColor === '#ffffff' ? 'dd' : 'ee'), borderBottomRightRadius: isSelf && settings.showTails ? '4px' : '26px', borderBottomLeftRadius: !isSelf && settings.showTails ? '4px' : '26px' }}>
                <AnimatedText text={msg.text} style={textStyle} />
                {msg.voiceType && <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-md border border-gray-100 text-[11px] z-20">{msg.voiceType === 'Kore' ? '👨' : '👩'}</div>}
              </div>
            </div>
          );
        })}

        {showOutro && visibleCount >= totalSteps && <IntroOutroDisplay config={settings.outro} />}
        <div className="h-10 shrink-0"></div>
      </div>
    </div>
  );
};
