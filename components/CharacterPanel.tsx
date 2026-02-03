
import React, { useRef } from 'react';
import { Character } from '../types';

interface CharacterPanelProps {
  characters: Character[];
  onUpdate: (chars: Character[]) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

const GOOGLE_FONTS = [
  'Battambang',
  'Kantumruy Pro',
  'Dangrek',
  'Moul',
  'Freehand',
  'Koulen',
  'Koh Santepheap',
  'Inter',
  'Arial',
];

export const CharacterPanel: React.FC<CharacterPanelProps> = ({ characters, onUpdate, onAdd, onDelete }) => {
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const audioInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const updateChar = (id: string, updates: Partial<Character>) => {
    onUpdate(characters.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleAvatarClick = (id: string) => {
    fileInputRefs.current[id]?.click();
  };

  const handleAvatarChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateChar(id, { avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioClick = (id: string) => {
    audioInputRefs.current[id]?.click();
  };

  const handleAudioChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateChar(id, { alertSound: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white p-6 rounded-[40px] shadow-sm space-y-6">
      <h3 className="text-sm font-bold text-gray-400 px-2 uppercase tracking-wider">CHARACTERS & STYLES</h3>
      <div className="space-y-4">
        {characters.map((char) => (
          <div key={char.id} className="bg-gray-50 p-4 rounded-3xl border border-gray-100 relative group transition-all hover:shadow-md">
            <div className="flex gap-4">
              {/* Avatar */}
              <div className="relative cursor-pointer shrink-0" onClick={() => handleAvatarClick(char.id)}>
                <img 
                  src={char.avatar} 
                  alt={char.name} 
                  className="w-16 h-16 rounded-full border-4 border-white shadow-sm object-cover bg-white" 
                />
                <div className="absolute inset-0 bg-black/10 rounded-full opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity text-[8px] text-white font-bold uppercase">Image</div>
                <input 
                  type="file" 
                  ref={el => fileInputRefs.current[char.id] = el}
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleAvatarChange(char.id, e)}
                />
              </div>
              
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex gap-2 items-center">
                  {/* Name Input */}
                  <input 
                    type="text" 
                    value={char.name}
                    onChange={(e) => updateChar(char.id, { name: e.target.value })}
                    className="border border-gray-200 rounded-xl px-4 py-1.5 flex-1 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                    placeholder="Character Name"
                  />
                  
                  {/* Audio/Alert button */}
                  <button 
                    onClick={() => handleAudioClick(char.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${char.alertSound ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                    title="Upload Alert Sound"
                  >
                    <span className="text-xs">🔊</span>
                  </button>
                  <input 
                    type="file" 
                    ref={el => audioInputRefs.current[char.id] = el}
                    className="hidden" 
                    accept="audio/*"
                    onChange={(e) => handleAudioChange(char.id, e)}
                  />

                  {/* Colors - compact squares */}
                  <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                    <input 
                      type="color" 
                      value={char.bubbleColor} 
                      onChange={(e) => updateChar(char.id, { bubbleColor: e.target.value })}
                      className="w-6 h-6 border-none cursor-pointer rounded-lg p-0 bg-transparent"
                      title="Bubble Color"
                    />
                    <input 
                      type="color" 
                      value={char.textColor} 
                      onChange={(e) => updateChar(char.id, { textColor: e.target.value })}
                      className="w-6 h-6 border-none cursor-pointer rounded-lg p-0 bg-transparent"
                      title="Text Color"
                    />
                  </div>

                  <button 
                    onClick={() => onDelete(char.id)}
                    className="w-8 h-8 bg-yellow-400 hover:bg-yellow-500 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-sm transition-colors shrink-0"
                    title="Delete Character"
                  >
                    -
                  </button>
                </div>

                {/* Font Controls Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <select 
                    value={char.fontFamily}
                    onChange={(e) => updateChar(char.id, { fontFamily: e.target.value })}
                    className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-100 flex-1 min-w-[120px]"
                  >
                    {GOOGLE_FONTS.map(font => (
                      <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                    ))}
                  </select>

                  <input 
                    type="number"
                    value={char.fontSize}
                    onChange={(e) => updateChar(char.id, { fontSize: Number(e.target.value) })}
                    className="w-14 text-xs border border-gray-200 rounded-xl px-2 py-1.5 outline-none bg-white text-center"
                    title="Font Size"
                  />

                  <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <button 
                      onClick={() => updateChar(char.id, { fontWeight: char.fontWeight === 'bold' ? 'normal' : 'bold' })}
                      className={`px-3 py-1.5 text-xs font-bold border-r border-gray-100 transition-colors ${char.fontWeight === 'bold' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                    >B</button>
                    <button 
                      onClick={() => updateChar(char.id, { fontStyle: char.fontStyle === 'italic' ? 'normal' : 'italic' })}
                      className={`px-3 py-1.5 text-xs italic border-r border-gray-100 transition-colors ${char.fontStyle === 'italic' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                    >I</button>
                    <button 
                      onClick={() => updateChar(char.id, { textDecoration: char.textDecoration === 'underline' ? 'none' : 'underline' })}
                      className={`px-3 py-1.5 text-xs underline transition-colors ${char.textDecoration === 'underline' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                    >U</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center pt-2">
        <button 
          onClick={onAdd}
          className="w-14 h-14 bg-orange-400 hover:bg-orange-500 text-white rounded-full flex items-center justify-center text-4xl shadow-xl transition-all transform hover:scale-110 active:scale-95"
          title="Add Character"
        >
          +
        </button>
      </div>
    </div>
  );
};
