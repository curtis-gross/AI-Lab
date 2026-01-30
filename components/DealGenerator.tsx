import React, { useState, useEffect } from 'react';
import { generateImageWithAssets } from '../services/geminiService';
import { Upload, X, Image as ImageIcon, PlusCircle, Sun, Moon, Eye, History, Trash2, ArrowRight } from 'lucide-react';
import { CompanyConfig, GeneratedResult, HistoryItem } from '../types';

// Helper to fetch image URL to base64
const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Return raw base64 without header
                resolve(base64String.split(',')[1]);
            };
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to fetch image", e);
        return null;
    }
};

export const DealGenerator: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'new' | 'include_product'>('new');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    // History functionality is now handled via Home page and Deal Details
    // We only need to save to history, not display it here.

    // Inputs
    const [tagline, setTagline] = useState("Instant savings on Valentine's Day items");
    const [customBgPrompt, setCustomBgPrompt] = useState('Valentines day lunch setting in a kitchen');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

    // Data
    const [companies, setCompanies] = useState<(CompanyConfig & { id: string })[]>([]);
    const [results, setResults] = useState<GeneratedResult[]>([]);

    useEffect(() => {
        fetchCompanies();
    }, []);



    const saveToHistory = async (newItem: HistoryItem) => {
        try {
            await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
        } catch (e) {
            console.error("Failed to save history to server", e);
        }
    };



    const fetchCompanies = async () => {
        try {
            const res = await fetch('/api/admin/companies');
            if (res.ok) {
                const data = await res.json();
                setCompanies(data);
            }
        } catch (e) {
            console.error("Failed to fetch companies", e);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                const base64Content = base64String.split(',')[1] || base64String;
                setUploadedImage(base64Content);
                setResults([]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (activeTab === 'include_product' && !uploadedImage) {
            alert("Please upload an image first.");
            return;
        }
        if (companies.length === 0) {
            alert("No companies found. Please create a company in the Admin Console first.");
            return;
        }

        setLoading(true);
        setResults([]);
        setProgress('Initializing generation...');

        const ratios = ['1:1', '4:3', '16:9', '9:16'];
        const totalTasks = companies.length * ratios.length;
        let completed = 0;
        const allResults: GeneratedResult[] = [];

        try {
            for (const company of companies) {
                setProgress(`Preparing assets for ${company.name}...`);
                
                // Fetch logos
                const darkLogoBase64 = company.logos.dark ? await fetchImageAsBase64(company.logos.dark) : null;
                const lightLogoBase64 = company.logos.light ? await fetchImageAsBase64(company.logos.light) : null;

                // Prepare assets list (product + logos)
                const assets: { mimeType: string, data: string }[] = [];
                
                // Add Product Image (if include_product mode)
                if (activeTab === 'include_product' && uploadedImage) {
                    assets.push({ mimeType: 'image/png', data: uploadedImage });
                }

                // Select Logo based on Theme
                const selectedLogo = themeMode === 'light' ? darkLogoBase64 : lightLogoBase64;

                if (selectedLogo) {
                    assets.push({ mimeType: 'image/png', data: selectedLogo });
                } else {
                    const fallbackLogo = darkLogoBase64 || lightLogoBase64;
                    if (fallbackLogo) assets.push({ mimeType: 'image/png', data: fallbackLogo });
                }

                setProgress(`Generating for ${company.name}...`);
                
                const companyPrompts = ratios.map(async (ratio) => {
                    const backgroundInstruction = `The background should be: ${customBgPrompt}.`;
                    const themeInstruction = themeMode === 'light' 
                        ? "Ensure the image has a BRIGHT, LIGHT, and airy atmosphere. Use high-key lighting."
                        : "Ensure the image has a DARK, DRAMATIC, and elegant atmosphere. Use low-key lighting and deep rich tones.";

                    const brandingInstruction = `
                        **Branding Guidelines:**
                        - Brand Name: "${company.name}"
                        - Primary Color: ${company.colors.primaryDark}
                        - Secondary Color: ${company.colors.secondaryLight}
                        - Font Preference: ${company.font || "Standard commercial font"}
                        - Visual Style: ${company.guidelines || "Professional and clean commercial style."}
                        
                        **Logo Placement:**
                        - I have provided the ${company.name} logo as an input image. 
                        - You MUST composite this logo into the final image.
                        - Place the logo tastefully in a corner or appropriate branding area.
                        - Ensure the logo is legible against the ${themeMode} background.
                        ${activeTab === 'include_product' ? '- The first input image is the PRODUCT. The second input image is the LOGO.' : '- The input image provided is the LOGO.'}
                    `;
                    
                    const fullPrompt = activeTab === 'new' 
                        ? `A promotional deal image. ${backgroundInstruction} ${themeInstruction} ${brandingInstruction} Text overlay: "${tagline}". Commercial photography style, high resolution.`
                        : `A promotional deal image using the provided product. ${backgroundInstruction} ${themeInstruction} ${brandingInstruction} The product must be centrally positioned and fully visible. Text overlay: "${tagline}". Commercial photography style.`;

                    const imgData = await generateImageWithAssets(fullPrompt, assets, ratio);

                    if (imgData) {
                        return {
                            companyId: company.id,
                            companyName: company.name,
                            ratio,
                            imageUrl: `data:image/jpeg;base64,${imgData}`
                        };
                    }
                    return null;
                });

                const companyResults = await Promise.all(companyPrompts);
                const valid = companyResults.filter((r): r is GeneratedResult => r !== null);
                
                allResults.push(...valid);
                setResults(prev => [...prev, ...valid]);
                
                completed += ratios.length;
                setProgress(`Completed ${completed} of ${totalTasks} images...`);
            }

            // Save to history
            const newItem: HistoryItem = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                tagline,
                activeTab: activeTab as 'new' | 'include_product',
                results: allResults, // We need to capture the accumulated results
                companyCount: companies.length
            };

            if (allResults.length > 0) {
                saveToHistory(newItem);
            } else {
                console.warn("No results generated, skipping history save.");
            }

        } catch (error) {
            console.error("Generation error:", error);
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
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Deal Generator</h2>

            {/* Top Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8 w-fit">
                <button
                    onClick={() => setActiveTab('new')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'new' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <PlusCircle size={18} /> New Deal
                </button>
                <button
                    onClick={() => setActiveTab('include_product')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'include_product' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <ImageIcon size={18} /> Include Product in Deal
                </button>

            </div>

            {/* Tab Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Input Column */}
                <div className="bg-white rounded-xl shadow-lg p-6 h-fit lg:col-span-1">
                    
                    {/* Upload (Only for Include Product) */}
                    {activeTab === 'include_product' && (
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase">1. Upload Product</h3>
                            {!uploadedImage ? (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors bg-gray-50 cursor-pointer">
                                    <label className="cursor-pointer flex flex-col items-center">
                                        <Upload size={32} className="text-gray-400 mb-2" />
                                        <span className="text-gray-600 font-medium text-sm">Click to upload</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    </label>
                                </div>
                            ) : (
                                <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                    <img src={`data:image/png;base64,${uploadedImage}`} alt="Uploaded Preview" className="w-full h-32 object-contain" />
                                    <button
                                        onClick={() => { setUploadedImage(null); setResults([]); }}
                                        className="absolute top-2 right-2 bg-white/80 p-1 rounded-full text-black hover:bg-white"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase">
                            {activeTab === 'include_product' ? '2. Background Style' : '1. Background Style'}
                        </h3>
                        <textarea
                            value={customBgPrompt}
                            onChange={(e) => setCustomBgPrompt(e.target.value)}
                            className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:border-blue-900 focus:outline-none h-24 resize-none"
                            placeholder="e.g. Valentines day lunch setting in a kitchen"
                        />
                    </div>

                    {/* Theme Selection */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase">Theme Preference</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setThemeMode('light')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${
                                    themeMode === 'light' 
                                    ? 'bg-gray-100 border-blue-500 text-blue-900 ring-1 ring-blue-500' 
                                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                <Sun size={18} /> Light
                            </button>
                            <button
                                onClick={() => setThemeMode('dark')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${
                                    themeMode === 'dark' 
                                    ? 'bg-gray-900 border-gray-900 text-white' 
                                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                <Moon size={18} /> Dark
                            </button>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase">
                            {activeTab === 'include_product' ? '3. Deal Tagline' : '2. Deal Tagline'}
                        </h3>
                        <textarea
                            value={tagline}
                            onChange={(e) => setTagline(e.target.value)}
                            className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:border-blue-900 focus:outline-none h-24 resize-none"
                            placeholder="e.g. Instant savings on Valentine's Day items"
                        />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading || (activeTab === 'include_product' && !uploadedImage)}
                        className="w-full bg-blue-900 text-white px-6 py-4 rounded-lg font-bold text-lg hover:bg-blue-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Generating...' : `Generate All`}
                    </button>
                    
                    {companies.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Generating 4 sizes for {companies.length} active companies.
                        </p>
                    )}
                </div>

                <div className="lg:col-span-3 space-y-8">
                    {loading && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex items-center gap-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-800 border-t-transparent"></div>
                            <span className="font-medium">{progress}</span>
                        </div>
                    )}

                    {results.length > 0 ? (
                        companies.map(company => {
                            const compResults = results.filter(r => r.companyId === company.id);
                            if (compResults.length === 0) return null;

                                        return (
                                            <div key={company.id} className="border-t border-gray-200 pt-8 first:border-0 first:pt-0">
                                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                    <span className="w-2 h-8 rounded-full" style={{ backgroundColor: company.colors.primaryDark }}></span>
                                                    {company.name}
                                                </h3>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    {compResults.map((res, idx) => (
                                                        <div key={idx} className="group relative">
                                                            <div className="bg-gray-100 rounded-lg overflow-hidden shadow-sm aspect-square flex items-center justify-center">
                                                                <img src={res.imageUrl} alt={`${res.ratio}`} className="max-w-full max-h-full object-contain" />
                                                            </div>
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white rounded-lg gap-2">
                                                                <span className="font-bold text-lg">{res.ratio}</span>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handlePreview(res.imageUrl)}
                                                                        className="bg-white text-black p-2 rounded-full hover:bg-gray-200"
                                                                        title="Preview in new tab"
                                                                    >
                                                                        <Eye size={16} />
                                                                    </button>
                                                                    <a
                                                                        href={res.imageUrl}
                                                                        download={`${company.name.replace(/\s+/g, '-')}_${res.ratio}.jpg`}
                                                                        className="bg-white text-black px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-200"
                                                                    >
                                                                        Download
                                                                    </a>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-center text-gray-500 mt-1 font-mono">{res.ratio}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })
                    ) : (
                        !loading && (
                            <div className="h-96 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <p className="text-lg">Generated assets will appear here.</p>
                                <p className="text-sm">Select 'New Deal' or 'Include Product in Deal' to start.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};
