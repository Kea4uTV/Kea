
import React, { useState } from 'react';
import { AppSettings, AnimationDirection } from '../types';
import { GoogleGenAI } from "@google/genai";

interface SettingsPanelProps {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, setSettings }) => {
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleChange = (key: keyof AppSettings, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('backgroundImage', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('backgroundMusic', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() && !settings.backgroundImage) {
      alert("Please enter a description for the background.");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const parts: any[] = [];

      if (settings.backgroundImage) {
        const base64Data = settings.backgroundImage.split(',')[1];
        const mimeType = settings.backgroundImage.split(',')[0].split(':')[1].split(';')[0];
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        });
      }

      parts.push({ text: imagePrompt || "A professional high-quality background for a chat application" });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: "9:16",
          }
        }
      });

      let foundImage = false;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          const imageUrl = `data:image/png;base64,${base64EncodeString}`;
          handleChange('backgroundImage', imageUrl);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        alert("Could not generate image. Please try a different prompt.");
      } else {
        setImagePrompt('');
      }
    } catch (error) {
      console.error("Image generation failed:", error);
      alert("Failed to generate background image.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-[40px] shadow-sm space-y-4 text-sm border border-gray-100">
      <div className="grid grid-cols-[130px_1fr] items-center gap-4">
        <label className="text-gray-600 font-medium">Animation Duration:</label>
        <input 
          type="range" min="0" max="2000" step="50"
          value={settings.animationDuration}
          onChange={(e) => handleChange('animationDuration', Number(e.target.value))}
          className="accent-blue-500"
        />

        <label className="text-gray-600 font-medium">Stagger Delay:</label>
        <input 
          type="range" min="100" max="5000" step="100"
          value={settings.staggerDelay || 1000}
          onChange={(e) => handleChange('staggerDelay', Number(e.target.value))}
          className="accent-blue-500"
        />

        <label className="text-gray-600 font-medium">Animation Direction:</label>
        <select 
          value={settings.animationDirection}
          onChange={(e) => handleChange('animationDirection', e.target.value as AnimationDirection)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 w-full text-xs bg-white outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="bottom-up">Slide Up (From Bottom)</option>
          <option value="top-down">Slide Down (From Top)</option>
          <option value="pop-in">Pop In (Center Out)</option>
          <option value="slide-in">Slide In (Sides)</option>
        </select>

        <label className="text-gray-600 font-medium">Bitrate:</label>
        <input 
          type="number"
          value={settings.bitrate}
          onChange={(e) => handleChange('bitrate', Number(e.target.value))}
          className="border border-gray-200 rounded-xl px-3 py-1.5 w-full bg-white outline-none"
        />

        <label className="text-gray-600 font-medium text-khmer">Css style font:</label>
        <input 
          type="text"
          value={settings.font}
          onChange={(e) => handleChange('font', e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 w-full bg-white outline-none"
        />

        <label className="text-gray-600 font-medium text-khmer">Canvas Width:</label>
        <input 
          type="number"
          value={settings.canvasWidth}
          onChange={(e) => handleChange('canvasWidth', Number(e.target.value))}
          className="border border-gray-200 rounded-xl px-3 py-1.5 w-full bg-white outline-none"
        />

        <label className="text-gray-600 font-medium text-khmer">Canvas Height:</label>
        <input 
          type="number"
          value={settings.canvasHeight}
          onChange={(e) => handleChange('canvasHeight', Number(e.target.value))}
          className="border border-gray-200 rounded-xl px-3 py-1.5 w-full bg-white outline-none"
        />

        <label className="text-gray-600 font-medium text-khmer">Canvas Color:</label>
        <div className="flex items-center gap-2">
          <input 
            type="color"
            value={settings.canvasColor}
            onChange={(e) => handleChange('canvasColor', e.target.value)}
            className="w-10 h-10 rounded-xl border-none cursor-pointer p-0 bg-transparent shadow-sm"
          />
          <input 
            type="text"
            value={settings.canvasColor}
            onChange={(e) => handleChange('canvasColor', e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 flex-1 text-xs bg-white outline-none"
          />
        </div>

        <label className="text-gray-600 font-medium text-khmer">Background Image:</label>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="Prompt for AI Background..."
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              className="flex-1 border border-gray-200 rounded-2xl px-4 py-2 text-xs focus:ring-2 focus:ring-blue-100 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateImage()}
            />
            <button 
              onClick={handleGenerateImage}
              disabled={isGenerating}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-md transition-all transform active:scale-95 ${
                isGenerating ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isGenerating ? '⌛' : '✨'}
            </button>
          </div>
          <div className="flex items-center gap-3">
             <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 flex-1"
              />
              {settings.backgroundImage && (
                <button 
                  onClick={() => handleChange('backgroundImage', undefined)}
                  className="text-red-400 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest px-2"
                >
                  Clear
                </button>
              )}
          </div>
        </div>

        <div className="col-span-2 h-px bg-gray-100 my-2"></div>

        <label className="text-gray-600 font-medium text-khmer">Music Background:</label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept="audio/*" 
              onChange={handleMusicUpload}
              className="text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 flex-1"
            />
            {settings.backgroundMusic && (
              <button 
                onClick={() => handleChange('backgroundMusic', undefined)}
                className="text-red-400 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest px-2"
              >
                Clear
              </button>
            )}
          </div>
          {settings.backgroundMusic && (
            <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">VOLUME</span>
              <input 
                type="range" min="0" max="1" step="0.05"
                value={settings.backgroundMusicVolume}
                onChange={(e) => handleChange('backgroundMusicVolume', Number(e.target.value))}
                className="flex-1 accent-orange-500 h-1"
              />
              <span className="text-[10px] text-gray-500 w-8 text-center">{Math.round(settings.backgroundMusicVolume * 100)}%</span>
            </div>
          )}
        </div>

        <div className="col-span-2 h-px bg-gray-100 my-2"></div>

        <label className="text-gray-600 font-medium text-khmer">Show Names:</label>
        <input 
          type="checkbox"
          checked={settings.showNames}
          onChange={(e) => handleChange('showNames', e.target.checked)}
          className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 shadow-sm"
        />

        <label className="text-gray-600 font-medium text-khmer">Show Tails:</label>
        <input 
          type="checkbox"
          checked={settings.showTails}
          onChange={(e) => handleChange('showTails', e.target.checked)}
          className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 shadow-sm"
        />
      </div>
    </div>
  );
};
