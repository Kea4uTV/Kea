
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Character, ChatMessage } from '../types';

interface AiGeneratorProps {
  characters: Character[];
  onGenerate: (messages: ChatMessage[]) => void;
}

export const AiGenerator: React.FC<AiGeneratorProps> = ({ characters, onGenerate }) => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  const generateScript = async () => {
    if (!topic.trim()) {
      alert("Please enter a topic or scenario first.");
      return;
    }
    if (characters.length === 0) {
      alert("Please add some characters first.");
      return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Topic: ${topic}\nCharacters: ${characters.map(c => `${c.name} (ID: ${c.id})`).join(', ')}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: `You are a script writer for a chat animation app. Generate a natural, engaging conversation based on the user's topic and the provided characters. 
          Return ONLY a valid JSON array of objects. Each object must have:
          - "characterId": the exact ID provided for that character
          - "text": the message text (natural and brief)
          
          Example output: [{"characterId": "123", "text": "Hi!"}, {"characterId": "456", "text": "Hello there."}]`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                characterId: { type: Type.STRING },
                text: { type: Type.STRING }
              },
              required: ["characterId", "text"]
            }
          }
        }
      });

      const script = JSON.parse(response.text || '[]');
      const newMessages: ChatMessage[] = script.map((msg: any) => ({
        id: Math.random().toString(36).substr(2, 9) + '-' + Date.now(),
        characterId: msg.characterId,
        text: msg.text,
        timestamp: Date.now()
      }));

      onGenerate(newMessages);
      setTopic('');
    } catch (error) {
      console.error("AI Generation failed:", error);
      alert("Failed to generate script. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-[40px] shadow-sm space-y-4 border-2 border-blue-50">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg">✨</div>
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">AI Script Generator</h3>
      </div>
      
      <div className="flex gap-2">
        <input 
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a topic (e.g. Discussing the moon landing...)"
          className="flex-1 border border-gray-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          onKeyDown={(e) => e.key === 'Enter' && generateScript()}
        />
        <button 
          onClick={generateScript}
          disabled={loading}
          className={`px-6 py-2 rounded-2xl text-sm font-bold transition-all shadow-md transform active:scale-95 whitespace-nowrap ${
            loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? 'Thinking...' : 'Generate Script'}
        </button>
      </div>
      <p className="text-[10px] text-gray-400 px-2 italic">Gemini will create a conversation using your active characters.</p>
    </div>
  );
};
