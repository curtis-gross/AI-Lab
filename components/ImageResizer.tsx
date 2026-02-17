import React, { useState, useEffect } from 'react';
import { Upload, X, Eye, Layers, History, ChevronRight, Clock, Download, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import { GeneratedResult, ImageSize } from '../types';
import { generateImageWithAssets } from '../services/geminiService';

interface ImageResizerProps {
    activeTask: {
        status: 'idle' | 'processing' | 'completed';
        progress: string;
        results: GeneratedResult[];
        totalSizes: number;
        completedSizes: number;
    };
    onStartResize: (uploadedBanner: string, targetSizes: any[], promptGuidance: string) => void;
}

export const ImageResizer: React.FC<ImageResizerProps> = ({ activeTask, onStartResize }) => {
    const [view, setView] = useState<'new' | 'history'>('new');
    const [history, setHistory] = useState<any[]>([]);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

    const [availableSizes, setAvailableSizes] = useState<ImageSize[]>([]);
    const [selectedSizeIds, setSelectedSizeIds] = useState<Set<string>>(new Set());
    const [uploadedBanner, setUploadedBanner] = useState<string | null>(null);
    const [promptGuidance, setPromptGuidance] = useState('Keep the main product and text legible. Extend the background naturally.');

    // Regeneration State
    const [selectedResult, setSelectedResult] = useState<GeneratedResult | null>(null);
    const [refinePrompt, setRefinePrompt] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [displayedResults, setDisplayedResults] = useState<GeneratedResult[]>([]);

    useEffect(() => {
        fetch('/api/admin/sizes')
            .then(res => res.json())
            .then((data: ImageSize[]) => {
                setAvailableSizes(data);
                setSelectedSizeIds(new Set(data.map(s => s.id)));
            });

        loadHistory();
    }, []);

    // Refresh history when active task completes
    useEffect(() => {
        if (activeTask.status === 'completed' || activeTask.status === 'idle') {
            loadHistory();
        }
    }, [activeTask.status]);

    // Sync active task results to local display state
    useEffect(() => {
        setDisplayedResults(activeTask.results);
    }, [activeTask.results]);

    const loadHistory = async () => {
        try {
            const res = await fetch('/api/history');
            const data = await res.json();
            // Filter only image_resizer type
            setHistory(data.filter((item: any) => item.type === 'image_resizer').sort((a: any, b: any) => b.timestamp - a.timestamp));
        } catch (err) {
            console.error("Failed to load history", err);
        }
    };

    const handleGenerate = () => {
        if (!uploadedBanner) return;
        const targetSizes = availableSizes.filter(s => selectedSizeIds.has(s.id));
        onStartResize(uploadedBanner, targetSizes, promptGuidance);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setUploadedBanner(base64String.split(',')[1] || base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleSize = (id: string) => {
        const newSet = new Set(selectedSizeIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedSizeIds(newSet);
    };

    const handleRegenerate = async () => {
        if (!selectedResult) return;

        setIsRegenerating(true);
        try {
            // Determine source image: use uploadedBanner if available (best quality), otherwise use the result itself (image-to-image)
            let sourceImageBase64 = uploadedBanner;
            let usingFallback = false;

            if (!sourceImageBase64) {
                // Extract base64 from selectedResult.imageUrl
                const match = selectedResult.imageUrl.match(/^data:image\/\w+;base64,(.+)$/);
                if (match) {
                    sourceImageBase64 = match[1];
                    usingFallback = true;
                } else {
                    // Fetch if it's a URL (unlikely in this app flow but good for robustness)
                    try {
                        const res = await fetch(selectedResult.imageUrl);
                        const blob = await res.blob();
                        const reader = new FileReader();
                        sourceImageBase64 = await new Promise((resolve) => {
                            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                            reader.readAsDataURL(blob);
                        });
                        usingFallback = true;
                    } catch (e) {
                        console.error("Failed to fetch source image", e);
                        alert("Could not load source image for regeneration.");
                        setIsRegenerating(false);
                        return;
                    }
                }
            }

            // Call API
            const result = await generateImageWithAssets(
                refinePrompt || "Regenerate this image",
                [{ mimeType: 'image/png', data: sourceImageBase64 as string }],
                selectedResult.ratio, // Use the existing ratio string, api helper will parse it
                "gemini-3-pro-image-preview"
            );

            if (result && result.imageBase64) {
                const newResult: GeneratedResult = {
                    ...selectedResult,
                    imageUrl: `data:image/jpeg;base64,${result.imageBase64}`,
                    warning: usingFallback ? "Regenerated from previous result (original source missing)" : undefined
                };

                // Update UI State
                if (view === 'new') {
                    // Update local displayed results for active task
                    setDisplayedResults(prev => prev.map(r => r.ratio === selectedResult.ratio ? newResult : r));
                } else if (view === 'history' && selectedHistoryItem) {
                    // Update history item
                    const updatedResults = selectedHistoryItem.results.map((r: GeneratedResult) => r.ratio === selectedResult.ratio ? newResult : r);
                    const updatedItem = { ...selectedHistoryItem, results: updatedResults };
                    
                    setSelectedHistoryItem(updatedItem);
                    
                    // Persist to server
                    await fetch('/api/history', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedItem)
                    });
                    
                    // Refresh main history list
                    loadHistory();
                }
                
                // Update the selected result in the modal to show the new version immediately
                setSelectedResult(newResult);
                setRefinePrompt(''); // Clear prompt
            } else {
                alert("Failed to regenerate image. Please try again.");
            }
        } catch (error) {
            console.error("Regeneration failed", error);
            alert("An error occurred during regeneration.");
        } finally {
            setIsRegenerating(false);
        }
    };

    const openRegenerateModal = (result: GeneratedResult) => {
        setSelectedResult(result);
        setRefinePrompt('');
    };

    const renderRegenerateModal = () => {
        if (!selectedResult) return null;

        return (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
                    {/* Image Preview */}
                    <div className="w-full md:w-2/3 bg-gray-100 flex items-center justify-center p-6 relative">
                        <img 
                            src={selectedResult.imageUrl} 
                            alt={selectedResult.ratio} 
                            className="max-w-full max-h-[70vh] object-contain shadow-lg rounded-lg"
                        />
                         <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-bold backdrop-blur-md">
                            {selectedResult.ratio}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="w-full md:w-1/3 p-6 flex flex-col bg-white">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Sparkles className="text-blue-600" size={20} />
                                Refine Image
                            </h3>
                            <button 
                                onClick={() => setSelectedResult(null)}
                                className="text-gray-400 hover:text-gray-800 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {!uploadedBanner && (
                            <div className="mb-4 bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg flex items-start gap-2 border border-yellow-100">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                <p>Original source image not found. Regeneration will use the current image as a base, which may affect quality.</p>
                            </div>
                        )}

                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                New Prompt Guidance
                            </label>
                            <textarea
                                value={refinePrompt}
                                onChange={(e) => setRefinePrompt(e.target.value)}
                                placeholder="E.g., Make the background darker, add more lens flare, remove the text..."
                                className="w-full h-32 rounded-lg border-2 border-gray-200 p-3 text-sm focus:border-blue-900 focus:outline-none resize-none mb-4"
                            />
                            <p className="text-xs text-gray-400 mb-6">
                                The AI will try to preserve the layout while applying your changes.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 mt-auto">
                            <button
                                onClick={handleRegenerate}
                                disabled={isRegenerating || !refinePrompt.trim()}
                                className="w-full bg-blue-900 text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isRegenerating ? (
                                    <>
                                        <RefreshCw size={18} className="animate-spin" />
                                        Regenerating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={18} />
                                        Regenerate
                                    </>
                                )}
                            </button>
                            <a
                                href={selectedResult.imageUrl}
                                download
                                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <Download size={16} />
                                Download Current
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderHistory = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-500 bg-white rounded-xl border-2 border-dashed">
                    <History size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No History Found</p>
                </div>
            )}
            {history.map(item => (
                <div
                    key={item.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => setSelectedHistoryItem(item)}
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="bg-blue-50 text-blue-700 p-2 rounded-lg">
                            <Layers size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-wider">
                            <Clock size={10} />
                            {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <h4 className="font-bold text-gray-800 mb-1 truncate">{item.tagline}</h4>
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-xs text-gray-500">{item.results?.length || 0} resizes generated</p>
                        {item.status === 'processing' && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                PROCESSING
                            </span>
                        )}
                        {item.status === 'failed' && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                                FAILED
                            </span>
                        )}
                    </div>
                    <div className="flex items-center text-blue-600 text-xs font-bold group-hover:gap-1 transition-all">
                        {item.status === 'processing' ? 'Tracking Growth...' : 'View Results'} <ChevronRight size={14} />
                    </div>
                </div>
            ))}
        </div>
    );

    const renderSelectedHistory = (item: any) => (
        <div className="space-y-6">
            <button
                onClick={() => setSelectedHistoryItem(null)}
                className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1"
            >
                <ChevronRight size={16} className="rotate-180" /> Back to History
            </button>
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-8 border-b pb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{item.tagline}</h3>
                        <p className="text-sm text-gray-500">{new Date(item.timestamp).toLocaleString()}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${item.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        item.status === 'failed' ? 'bg-red-50 text-red-700 border-red-100' :
                            'bg-green-50 text-green-700 border-green-100'
                        }`}>
                        {(item.status || 'COMPLETED').toUpperCase()}
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {item.results.map((res: GeneratedResult, idx: number) => (
                        <div 
                            key={idx} 
                            className="group relative cursor-pointer"
                            onClick={() => openRegenerateModal(res)}
                        >
                            <div className="bg-gray-100 rounded-lg overflow-hidden shadow-sm aspect-square flex items-center justify-center border border-gray-200 transition-all group-hover:ring-2 ring-blue-500">
                                <img src={res.imageUrl} alt={res.ratio} className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white rounded-lg gap-2">
                                <span className="font-bold text-lg">{res.ratio}</span>
                                <div className="flex gap-2 items-center text-xs bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                    <Sparkles size={12} /> Click to Edit
                                </div>
                            </div>
                            <div className="mt-2 text-center text-xs font-mono font-bold text-gray-500">
                                {res.ratio}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-6">
            {renderRegenerateModal()}
            
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <Layers className="text-blue-900" />
                    Image Resizer
                </h2>
                <div className="flex bg-gray-200 p-1 rounded-lg">
                    <button
                        onClick={() => { setView('new'); setSelectedHistoryItem(null); }}
                        className={`px-4 py-2 rounded-md transition-all text-sm font-bold ${view === 'new' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        New Resize
                    </button>
                    <button
                        onClick={() => { setView('history'); loadHistory(); }}
                        className={`px-4 py-2 rounded-md transition-all text-sm font-bold flex items-center gap-2 ${view === 'history' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <History size={16} />
                        History
                    </button>
                </div>
            </div>

            {view === 'history' ? (
                selectedHistoryItem ? renderSelectedHistory(selectedHistoryItem) : renderHistory()
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Input Column */}
                    <div className="bg-white rounded-xl shadow-lg p-6 h-fit lg:col-span-1">
                        <div className="mb-6">
                            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">1. Upload Image</h3>
                            {!uploadedBanner ? (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors bg-gray-50 cursor-pointer">
                                    <label className="cursor-pointer flex flex-col items-center">
                                        <Upload size={32} className="text-gray-400 mb-2" />
                                        <span className="text-gray-600 font-medium text-sm">Click to upload image</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    </label>
                                </div>
                            ) : (
                                <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                    <img src={`data:image/png;base64,${uploadedBanner}`} alt="Uploaded" className="w-full h-auto object-contain max-h-64" />
                                    <button
                                        onClick={() => setUploadedBanner(null)}
                                        className="absolute top-2 right-2 bg-white/80 p-1 rounded-full text-black hover:bg-white"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mb-6">
                            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">2. Guidance</h3>
                            <textarea
                                value={promptGuidance}
                                onChange={(e) => setPromptGuidance(e.target.value)}
                                className="w-full rounded-lg border-2 border-gray-200 p-3 text-sm focus:border-blue-900 focus:outline-none h-24 resize-none"
                            />
                        </div>

                        <div className="mb-6">
                            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">3. Sizes</h3>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                {availableSizes.map(size => (
                                    <label key={size.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${selectedSizeIds.has(size.id) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <input type="checkbox" checked={selectedSizeIds.has(size.id)} onChange={() => toggleSize(size.id)} className="rounded" />
                                        <span className="text-[10px] font-bold text-gray-800">{size.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={activeTask.status === 'processing' || !uploadedBanner}
                            className="w-full bg-blue-900 text-white py-4 rounded-lg font-bold hover:bg-blue-800 transition-colors disabled:bg-gray-300"
                        >
                            {activeTask.status === 'processing' ? 'Currently Processing...' : 'Generate New Resizes'}
                        </button>
                    </div>

                    {/* Results Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {activeTask.status !== 'idle' && (
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-900">Active Generation</h3>
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">
                                        {activeTask.completedSizes} / {activeTask.totalSizes} Done
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-4">
                                    <div
                                        className="bg-blue-600 h-full transition-all duration-500 shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                                        style={{ width: `${(activeTask.completedSizes / activeTask.totalSizes) * 100}%` }}
                                    ></div>
                                </div>
                                <p className="text-sm text-gray-600 italic">{activeTask.progress}</p>
                            </div>
                        )}

                        {displayedResults.length > 0 && (
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-6">Generated Assets</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    {displayedResults.map((res, idx) => (
                                        <div 
                                            key={idx} 
                                            className="group relative cursor-pointer"
                                            onClick={() => openRegenerateModal(res)}
                                        >
                                            <div className="bg-gray-100 rounded-lg overflow-hidden aspect-square flex items-center justify-center border transition-all group-hover:ring-2 ring-blue-500">
                                                <img src={res.imageUrl} alt={res.ratio} className="max-w-full max-h-full object-contain" />
                                            </div>
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white rounded-lg gap-2">
                                                <span className="font-bold">{res.ratio}</span>
                                                <div className="flex gap-2 items-center text-xs bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                                    <Sparkles size={12} /> Click to Edit
                                                </div>
                                            </div>
                                            <div className="mt-2 text-center text-xs font-mono font-bold text-gray-500">{res.ratio}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTask.status === 'idle' && displayedResults.length === 0 && (
                            <div className="h-96 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed">
                                <Layers size={48} className="mb-4 opacity-50" />
                                <p className="text-lg font-medium">Ready to Resize</p>
                                <p className="text-sm">Upload an image and select sizes to begin.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
