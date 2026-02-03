
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SettingsPanel } from './components/SettingsPanel';
import { CharacterPanel } from './components/CharacterPanel';
import { ChatPreview } from './components/ChatPreview';
import { AiGenerator } from './components/AiGenerator';
import { Character, ChatMessage, AppSettings, IntroOutroConfig } from './types';
import { decode, decodeAudioData, createBlob } from './utils/audio';

const GOOGLE_FONTS = ['Battambang', 'Kantumruy Pro', 'Dangrek', 'Moul', 'Freehand', 'Koulen', 'Koh Santepheap', 'Inter', 'Arial'];

const DEFAULT_INTRO_OUTRO: IntroOutroConfig = {
  text: '',
  enabled: false,
  fontFamily: 'Battambang',
  fontSize: 28,
  color: '#ffffff',
  backgroundColor: '#2563eb',
  fontWeight: 'bold',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'center',
  shadow: true,
  outline: true,
  outlineColor: '#1d4ed8',
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  marginV: 20,
  marginH: 10,
};

const INITIAL_CHARACTERS: Character[] = [
  { id: 'grandpa', name: 'លោកតា', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', bubbleColor: '#ffffff', textColor: '#374151', isAi: false, fontFamily: 'Battambang', fontSize: 14, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none' },
  { id: 'monk', name: 'ព្រះសង្ឃ', avatar: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=100&h=100&fit=crop', bubbleColor: '#2563eb', textColor: '#ffffff', isAi: true, fontFamily: 'Battambang', fontSize: 14, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none' },
  { id: 'grandmother', name: 'យាយជី', avatar: 'https://images.unsplash.com/photo-1517677129300-07b130802f46?w=100&h=100&fit=crop', bubbleColor: '#ffffff', textColor: '#374151', isAi: false, fontFamily: 'Kantumruy Pro', fontSize: 14, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none' },
];

const INITIAL_SETTINGS: AppSettings = {
  animationDuration: 500,
  staggerDelay: 1500,
  holdDuration: 1000,
  startDelay: 0,
  bitrate: 2500000,
  font: '32px Battambang',
  canvasWidth: 720,
  canvasHeight: 1080,
  canvasColor: '#ffffff',
  backgroundSize: 'cover',
  backgroundMusicVolume: 0.5,
  showNames: true,
  showTails: true,
  animationDirection: 'bottom-up',
  intro: { ...DEFAULT_INTRO_OUTRO, text: 'អត្ថន័យបុណ្យ មាឃបូជា', enabled: true },
  outro: { ...DEFAULT_INTRO_OUTRO, text: 'សូមអនុមោទនា!', backgroundColor: '#10b981', outlineColor: '#065f46', enabled: true },
  showAiGenerator: true,
};

function App() {
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [characters, setCharacters] = useState<Character[]>(INITIAL_CHARACTERS);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', characterId: 'grandpa', text: 'លោកតា តើថ្ងៃនេះជាថ្ងៃបុណ្យអ្វីដែរ?', timestamp: Date.now() },
    { id: '2', characterId: 'monk', text: 'ចម្រើនពរចៅ! ថ្ងៃនេះគឺជាថ្ងៃបុណ្យមាឃបូជា។', timestamp: Date.now() + 1 },
    { id: '3', characterId: 'grandmother', text: 'ត្រូវហើយចៅ! ជាថ្ងៃរំលឹកដល់ការប្រជុំសាវ័កទាំង ១២៥០ អង្គ។', timestamp: Date.now() + 2 },
  ]);
  const [isLive, setIsLive] = useState(false);
  const [previewKey, setPreviewKey] = useState(0); 
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);

  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  // Recording Ref
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const getSharedAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  const stopLive = useCallback(() => {
    setIsLive(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  const generateAndPlayTTS = async (messageId: string, text: string, voice: 'Kore' | 'Puck') => {
    setTtsLoadingId(`${messageId}-${voice}`);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioUrl = `data:audio/pcm;base64,${base64Audio}`;
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, audioUrl, voiceType: voice } : m));
        const ctx = getSharedAudioContext();
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
      }
    } catch (err) {
      console.error("TTS failed:", err);
    } finally {
      setTtsLoadingId(null);
    }
  };

  const startLive = async () => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("Missing API Key");
      const ai = new GoogleGenAI({ apiKey });
      const ctx = getSharedAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsLive(true);
            const source = ctx.createMediaStreamSource(stream);
            const scriptProcessor = ctx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(ctx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            if (message.serverContent?.inputTranscription) currentInputTranscription.current += message.serverContent.inputTranscription.text;
            if (message.serverContent?.outputTranscription) currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            if (message.serverContent?.turnComplete) {
              const userText = currentInputTranscription.current.trim();
              const aiText = currentOutputTranscription.current.trim();
              if (userText) setMessages(prev => [...prev, { id: Date.now().toString() + '-user', characterId: characters[0].id, text: userText, timestamp: Date.now() }]);
              if (aiText) setMessages(prev => [...prev, { id: Date.now().toString() + '-ai', characterId: characters.find(c => c.isAi)?.id || characters[0].id, text: aiText, timestamp: Date.now() }]);
              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';
            }
            if (message.serverContent?.interrupted) { sourcesRef.current.forEach(s => s.stop()); sourcesRef.current.clear(); nextStartTimeRef.current = 0; }
          },
          onerror: (e) => console.error('Gemini Live Error:', e),
          onclose: () => stopLive(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: `You are a script writer assistant. You participate in a conversation to help write a script about Khmer culture or religious events.`,
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const startExport = async (format: 'webm' | 'mp4') => {
    setIsExporting(true);
    const ctx = getSharedAudioContext();
    const dest = ctx.createMediaStreamDestination();
    
    // Connect context destination to our recording destination
    // In a real production app, we would connect nodes directly to dest for a cleaner signal
    // but for simplicity we rely on the global context capture if possible.
    
    recorderRef.current = new MediaRecorder(dest.stream);
    chunksRef.current = [];
    
    recorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: format === 'webm' ? 'video/webm' : 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `animation.${format}`;
      a.click();
      setIsExporting(false);
    };

    recorderRef.current.start();
    setPreviewKey(prev => prev + 1);

    // Stop recording after the estimated duration
    const showIntro = settings.intro.enabled && settings.intro.text.trim() !== '';
    const showOutro = settings.outro.enabled && settings.outro.text.trim() !== '';
    const totalSteps = (showIntro ? 1 : 0) + messages.length + (showOutro ? 1 : 0);
    const estimatedDuration = (totalSteps * (settings.staggerDelay || 1500)) + 2000;

    setTimeout(() => {
      recorderRef.current?.stop();
    }, estimatedDuration);
  };

  const updateIntroOutro = (type: 'intro' | 'outro', updates: Partial<IntroOutroConfig>) => {
    setSettings(prev => ({
      ...prev,
      [type]: { ...prev[type], ...updates }
    }));
  };

  const renderIntroOutroUI = (type: 'intro' | 'outro') => {
    const config = settings[type];
    return (
      <div className={`p-6 rounded-[40px] border-2 ${config.enabled ? 'border-blue-400 bg-blue-50/30' : 'border-gray-100 bg-gray-50/30'} transition-all space-y-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={config.enabled} 
              onChange={(e) => updateIntroOutro(type, { enabled: e.target.checked })}
              className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 border-gray-300 shadow-sm"
            />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{type} Style & Content</span>
          </div>
          <div className="flex gap-2">
            <input type="color" value={config.backgroundColor} onChange={(e) => updateIntroOutro(type, { backgroundColor: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer p-0 border-none bg-transparent shadow-sm" title="Bg Color" />
            <input type="color" value={config.color} onChange={(e) => updateIntroOutro(type, { color: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer p-0 border-none bg-transparent shadow-sm" title="Text Color" />
            <input type="color" value={config.outlineColor} onChange={(e) => updateIntroOutro(type, { outlineColor: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer p-0 border-none bg-transparent shadow-sm" title="Outline Color" />
          </div>
        </div>
        
        <textarea 
          value={config.text}
          onChange={(e) => updateIntroOutro(type, { text: e.target.value })}
          placeholder={`Enter ${type} text...`}
          className="w-full border border-gray-200 rounded-[24px] px-5 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 bg-white min-h-[80px] resize-none shadow-inner"
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
             <div className="flex gap-2">
                <select 
                  value={config.fontFamily} 
                  onChange={(e) => updateIntroOutro(type, { fontFamily: e.target.value })}
                  className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white outline-none flex-1 shadow-sm"
                >
                  {GOOGLE_FONTS.map(f => <option key={f} value={f} style={{fontFamily: f}}>{f}</option>)}
                </select>
                <input 
                  type="number" 
                  value={config.fontSize} 
                  onChange={(e) => updateIntroOutro(type, { fontSize: Number(e.target.value) })}
                  className="w-16 text-xs border border-gray-200 rounded-xl px-2 py-2 text-center outline-none shadow-sm"
                />
             </div>
             <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button onClick={() => updateIntroOutro(type, { fontWeight: config.fontWeight === 'bold' ? 'normal' : 'bold' })} className={`flex-1 py-2 text-xs font-bold border-r ${config.fontWeight === 'bold' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>B</button>
                <button onClick={() => updateIntroOutro(type, { fontStyle: config.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`flex-1 py-2 text-xs italic border-r ${config.fontStyle === 'italic' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>I</button>
                <button onClick={() => updateIntroOutro(type, { textDecoration: config.textDecoration === 'underline' ? 'none' : 'underline' })} className={`flex-1 py-2 text-xs border-r ${config.textDecoration === 'underline' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>U</button>
                <button onClick={() => updateIntroOutro(type, { textDecoration: config.textDecoration === 'line-through' ? 'none' : 'line-through' })} className={`flex-1 py-2 text-xs line-through ${config.textDecoration === 'line-through' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>S</button>
             </div>
          </div>
          <div className="space-y-3">
             <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button onClick={() => updateIntroOutro(type, { textAlign: 'left' })} className={`flex-1 py-2 text-xs border-r ${config.textAlign === 'left' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>L</button>
                <button onClick={() => updateIntroOutro(type, { textAlign: 'center' })} className={`flex-1 py-2 text-xs border-r ${config.textAlign === 'center' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>C</button>
                <button onClick={() => updateIntroOutro(type, { textAlign: 'right' })} className={`flex-1 py-2 text-xs ${config.textAlign === 'right' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>R</button>
             </div>
             <div className="flex gap-4">
               <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={config.shadow} onChange={(e) => updateIntroOutro(type, { shadow: e.target.checked })} className="rounded text-blue-600" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase group-hover:text-blue-600">Shadow</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={config.outline} onChange={(e) => updateIntroOutro(type, { outline: e.target.checked })} className="rounded text-blue-600" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase group-hover:text-blue-600">Outline</span>
               </label>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase">Scale X-Y: {config.scaleX.toFixed(1)}x, {config.scaleY.toFixed(1)}y</label>
              <div className="flex gap-2">
                 <input type="range" min="0.5" max="2" step="0.1" value={config.scaleX} onChange={(e) => updateIntroOutro(type, { scaleX: Number(e.target.value) })} className="flex-1 accent-blue-600" />
                 <input type="range" min="0.5" max="2" step="0.1" value={config.scaleY} onChange={(e) => updateIntroOutro(type, { scaleY: Number(e.target.value) })} className="flex-1 accent-blue-600" />
              </div>
           </div>
           <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase">Rotation: {config.rotation}° | Margins: {config.marginV}v, {config.marginH}h</label>
              <input type="range" min="-180" max="180" step="1" value={config.rotation} onChange={(e) => updateIntroOutro(type, { rotation: Number(e.target.value) })} className="w-full accent-blue-600" />
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-10 max-w-7xl mx-auto flex flex-col md:flex-row gap-10">
      <div className="flex-1 space-y-10 order-2 md:order-1">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
               <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
               <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Gemini Chat Animator</h1>
            </div>
            <div className="text-[10px] font-bold text-gray-400 bg-gray-50 px-4 py-1.5 rounded-full uppercase tracking-[0.2em]">Preview Mode</div>
          </div>
          <SettingsPanel settings={settings} setSettings={setSettings} />
        </div>

        {settings.showAiGenerator && (
           <AiGenerator characters={characters} onGenerate={(newMsgs) => setMessages(prev => [...prev, ...newMsgs])} />
        )}

        <CharacterPanel 
          characters={characters} 
          onUpdate={setCharacters} 
          onAdd={() => {
            const id = Date.now().toString();
            setCharacters([...characters, { id, name: `សមាជិកថ្មី`, avatar: `https://picsum.photos/seed/${id}/100/100`, bubbleColor: '#ffffff', textColor: '#374151', isAi: false, fontFamily: 'Battambang', fontSize: 14, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none' }]);
          }}
          onDelete={(id) => setCharacters(prev => prev.filter(c => c.id !== id))}
        />

        <div className="bg-white p-8 rounded-[40px] shadow-sm space-y-8 border border-gray-100">
           <div className="flex justify-between items-center px-2">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Recent Messages</h3>
             <button onClick={() => setMessages([])} className="text-[10px] font-bold text-red-400 hover:text-red-500 uppercase tracking-wider transition-colors">Clear All</button>
           </div>
           
           <div className="space-y-6">
              {renderIntroOutroUI('intro')}
              
              <div className="space-y-4">
                {messages.map((m) => {
                  const char = characters.find(c => c.id === m.characterId);
                  return (
                    <div key={m.id} className="flex gap-3 items-start group animate-in fade-in slide-in-from-left-2">
                      <button onClick={() => {
                        setMessages(prev => prev.map(msg => {
                          if (msg.id === m.id) {
                            const curIdx = characters.findIndex(c => c.id === msg.characterId);
                            const nextIdx = (curIdx + 1) % characters.length;
                            return { ...msg, characterId: characters[nextIdx].id };
                          }
                          return msg;
                        }));
                      }} className="bg-white hover:bg-gray-50 px-4 py-2 rounded-2xl text-[11px] shrink-0 font-bold text-gray-700 border border-gray-200 shadow-sm transition-all h-10 min-w-[100px]">{char?.name || 'Deleted'}</button>
                      <textarea value={m.text} onChange={(e) => setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, text: e.target.value } : msg))} className="border border-gray-200 rounded-2xl px-4 py-2.5 text-sm flex-1 bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 resize-none min-h-[40px] overflow-hidden shadow-sm" rows={1} onInput={(e) => { const target = e.target as HTMLTextAreaElement; target.style.height = 'auto'; target.style.height = target.scrollHeight + 'px'; }} />
                      <div className="flex flex-col gap-1.5 items-center shrink-0">
                        <button onClick={() => generateAndPlayTTS(m.id, m.text, 'Kore')} disabled={ttsLoadingId === `${m.id}-Kore`} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-md transition-all transform active:scale-90 border-2 ${m.voiceType === 'Kore' ? 'bg-blue-600 border-blue-400 text-white' : ttsLoadingId === `${m.id}-Kore` ? 'bg-gray-200 animate-pulse border-gray-100' : 'bg-white border-blue-100 text-blue-600 hover:bg-blue-50'}`}>👨</button>
                        <button onClick={() => generateAndPlayTTS(m.id, m.text, 'Puck')} disabled={ttsLoadingId === `${m.id}-Puck`} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-md transition-all transform active:scale-90 border-2 ${m.voiceType === 'Puck' ? 'bg-pink-600 border-pink-400 text-white' : ttsLoadingId === `${m.id}-Puck` ? 'bg-gray-200 animate-pulse border-gray-100' : 'bg-white border-pink-100 text-pink-600 hover:bg-pink-50'}`}>👩</button>
                      </div>
                      <button onClick={() => setMessages(prev => prev.filter(pm => pm.id !== m.id))} className="w-10 h-10 bg-yellow-400 hover:bg-yellow-500 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md transition-all hover:rotate-90 mt-0"> - </button>
                    </div>
                  )
                })}
              </div>

              {renderIntroOutroUI('outro')}
           </div>

           <div className="flex flex-col items-center gap-4 pt-6 border-t border-gray-50">
             <button onClick={() => setMessages(prev => [...prev, { id: Date.now().toString(), characterId: characters[0].id, text: 'អត្ថបទសាកល្បង...', timestamp: Date.now() }])} className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-full flex items-center justify-center text-4xl shadow-xl hover:shadow-orange-200 transition-all transform hover:scale-110 active:scale-95"> + </button>
             
             <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Toggle AI Generator Section</span>
                <button 
                  onClick={() => setSettings(prev => ({ ...prev, showAiGenerator: !prev.showAiGenerator }))}
                  className={`px-6 py-2 rounded-full text-xs font-bold transition-all shadow-md ${settings.showAiGenerator ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
                >
                  {settings.showAiGenerator ? 'ON' : 'OFF'}
                </button>
             </div>
           </div>
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-center gap-6 order-1 md:order-2">
        <ChatPreview 
          messages={messages} 
          characters={characters} 
          settings={settings} 
          previewKey={previewKey} 
          isLive={isLive} 
          onToggleLive={isLive ? stopLive : startLive}
          sharedAudioContext={getSharedAudioContext()}
        />
        
        <div className="flex flex-col items-center gap-4 w-full px-4">
          <button 
            onClick={isLive ? stopLive : startLive} 
            className={`w-full max-w-[360px] px-8 py-3 rounded-2xl text-sm font-bold shadow-xl transition-all transform active:scale-95 border whitespace-nowrap ${isLive ? 'bg-red-500 text-white border-red-400 animate-pulse ring-4 ring-red-100' : 'bg-blue-600 text-white border-blue-400 hover:bg-blue-700'}`}
          >
            {isLive ? '🔴 Stop Voice Interaction' : '🎙️ Start Voice Live Interaction'}
          </button>
          
          <div className="flex flex-col gap-4 w-full max-w-[360px]">
            <button onClick={() => setPreviewKey(prev => prev + 1)} className="btn-play-preview hover:brightness-110 text-white px-10 py-4 rounded-2xl text-base font-bold shadow-xl transition-all transform active:scale-95 active:shadow-inner">Play Preview</button>
            <div className="flex gap-4 p-2 bg-white/50 backdrop-blur-sm rounded-3xl border border-blue-100 shadow-lg">
              <button onClick={() => startExport('webm')} disabled={isExporting} className="bg-white hover:bg-gray-50 border border-gray-100 flex-1 py-3 rounded-2xl text-xs font-bold text-gray-700 shadow-md transition-all transform active:scale-95 disabled:opacity-50">
                {isExporting ? 'Exporting...' : 'Save .webm'}
              </button>
              <button onClick={() => startExport('mp4')} disabled={isExporting} className="bg-white hover:bg-gray-50 border border-gray-100 flex-1 py-3 rounded-2xl text-xs font-bold text-gray-700 shadow-md transition-all transform active:scale-95 disabled:opacity-50">
                {isExporting ? 'Exporting...' : 'Save .mp4'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
