import React, { useState, useEffect } from 'react';
import { generateImageWithAssets } from '../services/geminiService';
import { LayoutTemplate, Check, Play, Eye, Sun, Moon, Wand2 } from 'lucide-react';
import { CompanyConfig, TemplateConfig, GeneratedResult } from '../types';

export const TemplateToBanner: React.FC = () => {
    const [templates, setTemplates] = useState<TemplateConfig[]>([]);
    const [companies, setCompanies] = useState<(CompanyConfig & { id: string })[]>([]);

    // Selection State
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);

    // Enhancement State
    const [targetRatio, setTargetRatio] = useState<string>('16:9');
    const [promptGuidance, setPromptGuidance] = useState<string>('');
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

    // Generation State
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [results, setResults] = useState<GeneratedResult[]>([]);

    const RATIOS = [
        { label: '1:1', value: '1:1', ratio: 1 },
        { label: '3:2', value: '3:2', ratio: 1.5 },
        { label: '2:3', value: '2:3', ratio: 0.666 },
        { label: '3:4', value: '3:4', ratio: 0.75 },
        { label: '4:3', value: '4:3', ratio: 1.333 },
        { label: '4:5', value: '4:5', ratio: 0.8 },
        { label: '5:4', value: '5:4', ratio: 1.25 },
        { label: '9:16', value: '9:16', ratio: 0.5625 },
        { label: '16:9', value: '16:9', ratio: 1.777 },
        { label: '21:9', value: '21:9', ratio: 2.333 },
    ];

    useEffect(() => {
        fetchTemplates();
        fetchCompanies();
    }, []);

    // Detect ratio when template is selected
    useEffect(() => {
        if (selectedTemplateId) {
            const template = templates.find(t => t.id === selectedTemplateId);
            if (template && template.imageUrl) {
                const img = new Image();
                img.onload = () => {
                    const ratio = img.width / img.height;
                    // Find nearest ratio
                    const matched = RATIOS.reduce((prev, curr) => {
                        return (Math.abs(curr.ratio - ratio) < Math.abs(prev.ratio - ratio) ? curr : prev);
                    });
                    setTargetRatio(matched.value);
                };
                img.src = template.imageUrl;
            }
        }
    }, [selectedTemplateId, templates]);

    const fetchTemplates = async () => {
        try {
            const res = await fetch('/api/admin/templates');
            if (res.ok) setTemplates(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchCompanies = async () => {
        try {
            const res = await fetch('/api/admin/companies');
            if (res.ok) setCompanies(await res.json());
        } catch (e) { console.error(e); }
    };

    const toggleCompany = (id: string) => {
        setSelectedCompanyIds(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result as string;
                    resolve(base64String.split(',')[1]);
                };
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Failed to fetch image", e);
            return null;
        }
    };

    const handleGenerate = async () => {
        if (!selectedTemplateId || selectedCompanyIds.length === 0) {
            alert("Please select a template and at least one company.");
            return;
        }

        const template = templates.find(t => t.id === selectedTemplateId);
        if (!template) return;

        setLoading(true);
        setResults([]);
        setProgress('Initializing generation...');

        const targetCompanies = companies.filter(c => selectedCompanyIds.includes(c.id));
        const totalTasks = targetCompanies.length;
        let completed = 0;
        const newResults: GeneratedResult[] = [];

        try {
            // Get Template Image Base64
            const templateImageBase64 = await fetchImageAsBase64(template.imageUrl);
            if (!templateImageBase64) throw new Error("Failed to load template image");

            for (const company of targetCompanies) {
                setProgress(`Generating for ${company.name}...`);

                // Get Company Logo
                const logoUrl = company.logos.dark || company.logos.light;
                const logoBase64 = logoUrl ? await fetchImageAsBase64(logoUrl) : null;

                const assets = [{ mimeType: 'image/png', data: templateImageBase64 }];
                if (logoBase64) {
                    assets.push({ mimeType: 'image/png', data: logoBase64 });
                }

                // Theme specific instructions
                const themeInstruction = themeMode === 'light'
                    ? "Ensure the image has a BRIGHT, LIGHT, and clean atmosphere. Use high-key lighting, lighter backgrounds, and crisp shadows."
                    : "Ensure the image has a DARK, DRAMATIC, and elegant atmosphere. Use low-key lighting, deep rich background tones, and moody contrast.";

                const prompt = `
                    You are an expert marketing designer.
                    I have provided a TEMPLATE IMAGE (first asset) and a BRAND LOGO (second asset).
                    
                    **TASK:**
                    Create a new marketing banner for "${company.name}" that strictly follows the layout and composition of the provided TEMPLATE IMAGE, but adapts the content to match the brand's identity and the template's theme.
                    
                    **TEMPLATE CONTEXT:**
                    "${template.text}"

                    **STRICT LAYOUT & BRANDING RULES:**
                    1. **GEOMETRY LOCK:** You MUST NOT change the size, shape, or position of ANY element (text boxes, buttons, image frames). The layout must match the template geometry EXACTLY.
                    2. **TEXT SIZING:** Text MUST be sized to fit strictly within the original text boxes. Do not expand the boxes to fit the text. Shrink the text if necessary.
                    3. **BASE IMAGE:** The underlying image structure/composition MUST NOT CHANGE. Textures and lighting can be refined, but objects must not move.
                    4. **TEXT BACKGROUNDS:** IF the template has a solid background behind text, you MUST RECOLOR it using the **Company Primary Color** (${company.colors.primaryDark}) or **Secondary Color** (${company.colors.secondaryLight}).
                    5. **FONTS:** Use the **Company Font** (${company.font || 'Modern Sans'}) for ALL text.
                    6. **BUTTONS:** Buttons must be the EXACT same size/shape as the template. Recolor them to the **Company Primary Color** (${company.colors.primaryDark}) or **Secondary Color**.
                    
                    **RESTRICTIONS:** 
                       - DO NOT output hex codes as text.
                       - DO NOT change aspect ratios.
                       - DO NOT add new elements, "flair", sparkles, swirls, or decorations.
                       - DO NOT embellish the design. Keep it clean and identical to the template structure.

                    **TEMPLATE CONTEXT:**
                    "${promptGuidance}"
                    
                    **THEME:**
                    ${themeInstruction}
                    
                    **BRAND GUIDELINES (Reference Only):**
                    - Brand Name: ${company.name}
                    - Primary Color: ${company.colors.primaryDark}
                    - Secondary Color: ${company.colors.secondaryLight}
                    - Visual Style: ${company.guidelines}
                    
                    **INSTRUCTIONS:**
                    1. RETAIN the aspect ratio, composition, lighting, and "vibe" of the template image.
                    2. RETAIN any text layout structures but you can change the actual text to fit the brand if needed, or keep the template's text if it's generic (e.g. "Summer Sale").
                    3. INTEGRATE the provided BRAND LOGO naturally into the design (e.g. clearly visible but not overpowering).
                    4. RECOLOR the template's background and graphical elements using the brand's Primary or Secondary colors.
                    5. Do NOT render the hex codes (like "${company.colors.primaryDark}" or "${company.colors.secondaryLight}") as visible text in the image. They are for your reference only.
                    6. Output a high-quality commercial image with a ${targetRatio} aspect ratio.
                `;

                // Generate
                const imgData = await generateImageWithAssets(prompt, assets, targetRatio);

                if (imgData) {
                    const res: GeneratedResult = {
                        companyId: company.id,
                        companyName: company.name,
                        ratio: targetRatio,
                        imageUrl: `data:image/jpeg;base64,${imgData}`
                    };
                    setResults(prev => [...prev, res]);
                    newResults.push(res);
                }

                completed++;
                setProgress(`Generating for ${targetCompanies[completed]?.name || 'next'}...`);
            }
            setResults(newResults);

            // Save to history
            if (newResults.length > 0) {
                const historyItem: any = {
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    tagline: template.name + ' Generation',
                    type: 'template_to_banner',
                    results: newResults,
                    companyCount: targetCompanies.length
                };

                await fetch('/api/history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(historyItem)
                }).catch(e => console.error("Failed to save history", e));
            }

        } catch (error) {
            console.error("Generation error:", error);
            alert("An error occurred during generation.");
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
                <LayoutTemplate className="text-blue-900" />
                Template to Banner
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Panel: Configuration */}
                <div className="lg:col-span-4 space-y-6">

                    {/* 1. Select Template */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                            Select Template
                        </h3>
                        <div className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {templates.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => setSelectedTemplateId(t.id)}
                                    className={`
                                        cursor-pointer rounded-lg overflow-hidden border-2 transition-all relative group
                                        ${selectedTemplateId === t.id ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}
                                    `}
                                >
                                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                                        <img src={t.imageUrl} alt={t.name} className="w-full h-full object-contain p-1" />
                                    </div>
                                    <div className="p-2 bg-white text-xs font-medium text-gray-800 truncate border-t border-gray-100">
                                        <span className="block truncate">{t.name}</span>
                                    </div>
                                    {selectedTemplateId === t.id && (
                                        <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-0.5">
                                            <Check size={12} />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {templates.length === 0 && (
                                <p className="col-span-2 text-center text-gray-400 text-sm py-8">
                                    No templates found. Create one in Admin Console.
                                </p>
                            )}
                        </div>
                        {selectedTemplateId && (
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                                <span>Detected Ratio:</span>
                                <span className="font-mono font-bold bg-gray-100 px-2 py-1 rounded">{targetRatio}</span>
                            </div>
                        )}
                    </div>

                    {/* 2. Configure Output */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                            Configure
                        </h3>

                        {/* Theme */}
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-gray-500 mb-2">Color Theme</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setThemeMode('light')}
                                    className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm transition-all ${themeMode === 'light'
                                        ? 'bg-gray-50 border-blue-500 text-blue-900 ring-1 ring-blue-500'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    <Sun size={16} /> Light
                                </button>
                                <button
                                    onClick={() => setThemeMode('dark')}
                                    className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm transition-all ${themeMode === 'dark'
                                        ? 'bg-gray-900 border-gray-900 text-white'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    <Moon size={16} /> Dark
                                </button>
                            </div>
                        </div>

                        {/* Guidance */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-2">Prompt Guidance (Optional)</label>
                            <textarea
                                value={promptGuidance}
                                onChange={(e) => setPromptGuidance(e.target.value)}
                                placeholder="E.g. Add a holiday touch, make it very minimalist..."
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none h-20 resize-none"
                            />
                        </div>
                    </div>

                    {/* 3. Select Companies */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                            Select Brands
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {companies.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => toggleCompany(c.id)}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors
                                        ${selectedCompanyIds.includes(c.id) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'}
                                    `}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedCompanyIds.includes(c.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                                        {selectedCompanyIds.includes(c.id) && <Check size={14} className="text-white" />}
                                    </div>
                                    <div className="w-8 h-8 rounded bg-white flex items-center justify-center p-1 border border-gray-100">
                                        <img src={c.logos.dark || c.logos.light} alt="" className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{c.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action */}
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !selectedTemplateId || selectedCompanyIds.length === 0}
                        className="w-full bg-blue-900 text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/50 border-t-white"></div>
                                Processing...
                            </>
                        ) : (
                            <>
                                <Wand2 size={20} fill="currentColor" />
                                Generate
                            </>
                        )}
                    </button>


                </div>

                {/* Right Panel: Results */}
                <div className="lg:col-span-8">
                    {results.length > 0 || loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {results.map((res, idx) => (
                                <div key={idx} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 group">
                                    <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                                        <h4 className="font-bold text-gray-900">{res.companyName}</h4>
                                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{res.ratio}</span>
                                    </div>
                                    <div className={`relative bg-gray-100 flex items-center justify-center overflow-hidden`}>
                                        <img src={res.imageUrl} alt={res.companyName} className="max-w-full max-h-[500px] object-contain" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => handlePreview(res.imageUrl)}
                                                className="bg-white text-black p-2 rounded-full hover:bg-gray-200"
                                            >
                                                <Eye size={20} />
                                            </button>
                                            <a
                                                href={res.imageUrl}
                                                download={`banner_${res.companyName.replace(/\s+/g, '_')}.jpg`}
                                                className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-200"
                                            >
                                                Download
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Loading Skeleton Card */}
                            {loading && (
                                <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden min-h-[300px] flex flex-col animate-pulse">
                                    <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                                        <div className="h-6 w-32 bg-gray-200 rounded"></div>
                                        <div className="h-5 w-12 bg-gray-200 rounded-full"></div>
                                    </div>
                                    <div className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-8 text-center text-blue-900/50 gap-4">
                                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
                                        <div>
                                            <p className="font-bold text-lg text-gray-700">Generating Banner...</p>
                                            <p className="text-sm text-gray-500">{progress}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200">
                            <LayoutTemplate size={64} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">No results yet</p>
                            <p className="text-sm">Select a template, theme, and brands to start</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
