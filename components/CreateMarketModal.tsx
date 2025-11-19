import React, { useState } from 'react';
import { MarketCategory } from '../types';
import { web3Service } from '../services/web3Service';
import { GoogleGenAI } from "@google/genai";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateMarketModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<MarketCategory>(MarketCategory.SPORTS);
  const [outcome1, setOutcome1] = useState('');
  const [outcome2, setOutcome2] = useState('');
  const [days, setDays] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // AI Image State
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateImage = async () => {
    if (!title) {
        alert("Please enter a title first so the AI knows what to generate!");
        return;
    }
    setIsGeneratingImage(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Using imagen-4.0-generate-001 for high quality market covers
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A high quality, cinematic 3D render or illustration for a prediction market about: ${title}. ${desc ? 'Context: ' + desc : ''}. Vibrant colors, clean composition, suitable for a card background. No text.`,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '16:9', // Wider for card headers
            },
        });

        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
        setGeneratedImageUrl(imageUrl);

    } catch (error) {
        console.error("Failed to generate image:", error);
        alert("Failed to generate image. Please try again.");
    } finally {
        setIsGeneratingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const now = Math.floor(Date.now() / 1000);
    const lockTime = now + (days * 24 * 60 * 60);
    const resolveTime = lockTime + 86400; // 1 day after lock

    try {
      await web3Service.createMarket({
        title,
        description: desc,
        category,
        outcomes: [outcome1, outcome2],
        lockTime,
        resolveTime,
        imageUrl: generatedImageUrl || undefined, // Pass generated image
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="bg-celo-green/10 dark:bg-celo-green/20 p-6 border-b border-celo-green/10 dark:border-celo-green/5">
          <h2 className="text-xl font-bold text-celo-dark dark:text-white">Create Prediction Market</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">Launch a new market on the Celo blockchain.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Question / Title</label>
            <input 
              required
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Will ETH hit $5k this month?" 
              className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white border p-2.5 focus:ring-2 focus:ring-celo-green focus:border-celo-green outline-none transition"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Description (Optional)</label>
            <textarea 
              value={desc} 
              onChange={e => setDesc(e.target.value)}
              placeholder="Add more context..." 
              rows={2}
              className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white border p-2.5 focus:ring-2 focus:ring-celo-green focus:border-celo-green outline-none transition resize-none"
            />
          </div>

          {/* AI Image Generation Section */}
          <div>
             <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Market Cover Image</label>
             
             {generatedImageUrl ? (
                 <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 group">
                     <img src={generatedImageUrl} alt="AI Generated" className="w-full h-full object-cover" />
                     <button 
                        type="button"
                        onClick={() => setGeneratedImageUrl(null)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                     <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur">
                        ✨ AI Generated
                     </div>
                 </div>
             ) : (
                 <button 
                   type="button"
                   onClick={handleGenerateImage}
                   disabled={isGeneratingImage || !title}
                   className="w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:border-celo-green dark:hover:border-celo-green hover:bg-celo-green/5 dark:hover:bg-celo-green/5 transition gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                     {isGeneratingImage ? (
                         <>
                           <div className="w-5 h-5 border-2 border-celo-green border-t-transparent rounded-full animate-spin"></div>
                           <span className="text-sm">Dreaming up an image...</span>
                         </>
                     ) : (
                         <>
                            <span className="text-2xl">✨</span>
                            <span className="text-sm font-medium">Generate AI Cover Image</span>
                         </>
                     )}
                 </button>
             )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Category</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value as MarketCategory)}
              className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white border p-2.5 outline-none"
            >
              {Object.values(MarketCategory).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Outcome 1</label>
                <input 
                  required
                  type="text" 
                  value={outcome1}
                  onChange={e => setOutcome1(e.target.value)}
                  placeholder="Yes" 
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white border p-2.5 outline-none"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Outcome 2</label>
                <input 
                  required
                  type="text" 
                  value={outcome2}
                  onChange={e => setOutcome2(e.target.value)}
                  placeholder="No" 
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white border p-2.5 outline-none"
                />
            </div>
          </div>

          <div>
             <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Duration (Days)</label>
             <input 
               type="number" 
               min="1"
               value={days}
               onChange={e => setDays(parseInt(e.target.value))}
               className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white border p-2.5 outline-none"
             />
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition">Cancel</button>
            <button 
              type="submit" 
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl font-bold bg-celo-green text-white shadow-lg shadow-celo-green/30 hover:shadow-xl hover:-translate-y-0.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Launch Market'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};