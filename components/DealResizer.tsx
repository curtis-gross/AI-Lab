import React, { useState } from 'react';
import { generateImageWithAssets } from '../services/geminiService';
import { Upload, X, Eye, Layers } from 'lucide-react';
import { GeneratedResult } from '../types';

export const DealResizer: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    
    // Inputs
    const [uploadedBanner, setUploadedBanner] = useState<string | null>(null);
    const [promptGuidance, setPromptGuidance] = useState('Keep the main product and text legible. Extend the background naturally.');
    
    // Results
    const [results, setResults] = useState<GeneratedResult[]>([]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                const base64Content = base64String.split(',')[1] || base64String;
                setUploadedBanner(base64Content);
                setResults([]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!uploadedBanner) {
            alert("Please upload a deal banner first.");
            return;
        }

        setLoading(true);
        setResults([]);
        setProgress('Initializing resizing...');

        const ratios = ['1:1', '4:3', '16:9', '9:16'];
        const totalTasks = ratios.length;
        let completed = 0;
        const newResults: GeneratedResult[] = [];

        try {
            const tasks = ratios.map(async (ratio) => {
                const prompt = `
                    You are an expert graphic designer.
                    I have provided a deal banner image.
                    Your task is to RESIZE/REFORMAT this exact banner to a NEW aspect ratio of ${ratio}.
                    
                    **CRITICAL INSTRUCTIONS:**
                    1. ${promptGuidance}
                    2. PRESERVE key text and branding elements.
                    3. If the new ratio is wider, extend the background seamlessly.
                    4. If the new ratio is taller, extend the background vertically seamlessly.
                    5. Do NOT change the font style or logo significantly if possible, but you are regenerating the image so aim for high fidelity to the original vibe.
                    6. The output MUST be a high-quality commercial image.
                `;

                // We send the uploaded banner as a reference asset
                const assets = [{ mimeType: 'image/png', data: uploadedBanner }];
                
                const imgData = await generateImageWithAssets(prompt, assets, ratio);

                if (imgData) {
                    const result: GeneratedResult = {
                        companyId: 'manual_upload', // Placeholder
                        companyName: 'Custom Upload',
                        ratio,
                        imageUrl: `data:image/jpeg;base64,${imgData}`
                    };
                    completed++;
                    setProgress(`Completed ${completed} of ${totalTasks} sizes...`);
                    return result;
                }
                return null;
            });

            const taskResults = await Promise.all(tasks);
            const valid = taskResults.filter((r): r is GeneratedResult => r !== null);
            setResults(valid);

            // Save to history
            if (valid.length > 0) {
                const historyItem: any = {
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    tagline: 'Resized Banner Upload',
                    type: 'deal_resizer',
                    results: valid,
                    companyCount: 1
                };

                try {
                    await fetch('/api/history', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(historyItem)
                    });
                } catch (e) {
                    console.error("Failed to save history", e);
                }
            }

        } catch (error) {
            console.error("Resizing error:", error);
        } finally {
            setLoading(false);
            setProgress('');
        }
    };

    const handlePreview = (imageUrl: string) => {
        const win = window.open();
        if (win) {
            win.document.write(`<img src="${imageUrl}" style="max-width: 100%; height: auto;" />`);
            win.document.title = "Image Preview";
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <Layers className="text-blue-900" />
                Deal Resizer
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Input Column */}
                <div className="bg-white rounded-xl shadow-lg p-6 h-fit lg:col-span-1">
                    
                    {/* 1. Upload Banner */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase">1. Upload Deal Banner</h3>
                        {!uploadedBanner ? (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors bg-gray-50 cursor-pointer">
                                <label className="cursor-pointer flex flex-col items-center">
                                    <Upload size={32} className="text-gray-400 mb-2" />
                                    <span className="text-gray-600 font-medium text-sm">Click to upload banner</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                </label>
                            </div>
                        ) : (
                            <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                <img src={`data:image/png;base64,${uploadedBanner}`} alt="Uploaded Banner" className="w-full h-auto object-contain max-h-64" />
                                <button
                                    onClick={() => { setUploadedBanner(null); setResults([]); }}
                                    className="absolute top-2 right-2 bg-white/80 p-1 rounded-full text-black hover:bg-white"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 2. Prompt Guidance */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase">2. Preservation Guidance</h3>
                        <p className="text-xs text-gray-400 mb-2">Tell the AI what to keep or how to handle the resizing.</p>
                        <textarea
                            value={promptGuidance}
                            onChange={(e) => setPromptGuidance(e.target.value)}
                            className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:border-blue-900 focus:outline-none h-32 resize-none"
                            placeholder="e.g. Keep the main product and text legible. Extend the background naturally."
                        />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading || !uploadedBanner}
                        className="w-full bg-blue-900 text-white px-6 py-4 rounded-lg font-bold text-lg hover:bg-blue-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : 'Generate 4 Sizes'}
                    </button>
                </div>

                {/* Results Column */}
                <div className="lg:col-span-2 space-y-8">
                    {loading && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex items-center gap-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-800 border-t-transparent"></div>
                            <span className="font-medium">{progress}</span>
                        </div>
                    )}

                    {results.length > 0 ? (
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Resized Output</h3>
                            <div className="grid grid-cols-2 gap-6">
                                {results.map((res, idx) => (
                                    <div key={idx} className="group relative">
                                        <div className="bg-gray-100 rounded-lg overflow-hidden shadow-sm aspect-square flex items-center justify-center border border-gray-200">
                                            <img src={res.imageUrl} alt={`${res.ratio}`} className="max-w-full max-h-full object-contain" />
                                        </div>
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white rounded-lg gap-2">
                                            <span className="font-bold text-lg">{res.ratio}</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handlePreview(res.imageUrl)}
                                                    className="bg-white text-black p-2 rounded-full hover:bg-gray-200"
                                                    title="Preview"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <a
                                                    href={res.imageUrl}
                                                    download={`resized_${res.ratio.replace(':','-')}.jpg`}
                                                    className="bg-white text-black px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-200"
                                                >
                                                    Download
                                                </a>
                                            </div>
                                        </div>
                                        <p className="text-xs text-center text-gray-500 mt-2 font-mono font-bold">{res.ratio}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        !loading && (
                            <div className="h-96 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <Layers size={48} className="mb-4 opacity-50" />
                                <p className="text-lg font-medium">No resized assets yet.</p>
                                <p className="text-sm">Upload a banner and click Generate to see results.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};
