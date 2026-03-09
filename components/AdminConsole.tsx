import React, { useState, useEffect } from 'react';
import { Upload, Save, CheckCircle, AlertCircle, PlusCircle, ArrowLeft, Edit2, LayoutTemplate, Building2, Maximize, Eye, Trash2, Sparkles } from 'lucide-react';
import { CompanyConfig, TemplateConfig } from '../types';
import { generateImageWithAssets, analyzeTemplateImage } from '../services/geminiService';

interface ExtendedCompanyConfig extends CompanyConfig {
  id: string;
}

// TemplateConfig moved to types.ts

export const AdminConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'companies' | 'templates'>('companies');
  const [view, setView] = useState<'list' | 'editor'>('list');
  
  // Data
  const [companies, setCompanies] = useState<ExtendedCompanyConfig[]>([]);
  const [templates, setTemplates] = useState<TemplateConfig[]>([]);
  
  // Company Editor State
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [compName, setCompName] = useState('');
  const [primaryDark, setPrimaryDark] = useState('#000000');
  const [secondaryLight, setSecondaryLight] = useState('#ffffff');
  const [guidelines, setGuidelines] = useState('');
    const [font, setFont] = useState('');
  const [darkLogo, setDarkLogo] = useState<string | null>(null);
  const [lightLogo, setLightLogo] = useState<string | null>(null);

  // Template Editor State
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempText, setTempText] = useState('');
  const [tempImage, setTempImage] = useState<string | null>(null);
    const [tempAnalysis, setTempAnalysis] = useState('');
  
    const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error' | 'resizing'>('idle');
  const [message, setMessage] = useState('');

    // Resize State
    const [pendingImage, setPendingImage] = useState<string | null>(null);
    const [showResizeModal, setShowResizeModal] = useState(false);
    const [resizeRatio, setResizeRatio] = useState<string>('16:9');

    const RATIOS = [
        { label: '1:1 (Square)', value: '1:1', ratio: 1 },
        { label: '3:2', value: '3:2', ratio: 1.5 },
        { label: '2:3', value: '2:3', ratio: 0.666 },
        { label: '3:4', value: '3:4', ratio: 0.75 },
        { label: '4:3', value: '4:3', ratio: 1.333 },
        { label: '4:5', value: '4:5', ratio: 0.8 },
        { label: '5:4', value: '5:4', ratio: 1.25 },
        { label: '9:16 (Story)', value: '9:16', ratio: 0.5625 },
        { label: '16:9 (Landscape)', value: '16:9', ratio: 1.777 },
        { label: '21:9 (Ultrawide)', value: '21:9', ratio: 2.333 },
    ];

  useEffect(() => {
    if (view === 'list') {
      if (activeTab === 'companies') fetchCompanies();
      else fetchTemplates();
    }
  }, [view, activeTab]);

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/admin/companies');
      if (res.ok) setCompanies(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/templates');
      if (res.ok) setTemplates(await res.json());
    } catch (e) { console.error(e); }
  };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void, checkRatio = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            if (checkRatio) {
                checkImageRatio(result, setter);
            } else {
                setter(result);
            }
        };
      reader.readAsDataURL(file);
    }
  };

    const checkImageRatio = (base64: string, setter: (val: string) => void) => {
        const img = new Image();
        img.onload = () => {
            const ratio = img.width / img.height;
            const matched = RATIOS.find(r => Math.abs(r.ratio - ratio) < 0.05);

            if (matched) {
                setter(base64); // Fits a standard ratio
            } else {
                setPendingImage(base64);
                setShowResizeModal(true);
            }
        };
        img.src = base64;
    };

    const handleResize = async () => {
        if (!pendingImage) return;
        setStatus('resizing');
        try {
            // Use Gemini to resize
            // We need to strip the header for the service
            const rawBase64 = pendingImage.split(',')[1] || pendingImage;
            const assets = [{ mimeType: 'image/png', data: rawBase64 }];

            const prompt = `
            Resize/Reformat this marketing template to strictly match the ${resizeRatio} aspect ratio.
            Preserve ALL content, text, and style. 
            Extend the background seamlessly if needed to fit the new ratio.
            Do not crop important elements.
            Output a high quality image.
          `;

            const result = await generateImageWithAssets(prompt, assets, resizeRatio);

            if (result) {
                setTempImage(`data:image/jpeg;base64,${result}`);
                setPendingImage(null);
                setShowResizeModal(false);
                setMessage('Image resized successfully');
                setStatus('idle');
            } else {
                throw new Error("Failed to generate resized image");
            }
        } catch (e) {
            console.error(e);
            setStatus('error');
            setMessage('Resize failed');
        }
    };

    const handlePreview = (imageUrl: string) => {
        const win = window.open();
        if (win) {
            win.document.write(`<img src="${imageUrl}" style="max-width: 100%; height: auto;" />`);
            win.document.title = "Template Preview";
        }
    };

    const handleDeleteTemplate = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) return;

        try {
            const res = await fetch(`/api/admin/template/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchTemplates();
                setMessage('Template deleted');
                setStatus('success');
                setTimeout(() => setStatus('idle'), 2000);
            } else {
                alert('Failed to delete template');
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting template');
        }
    };

    const handleDeleteCompany = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete company "${name}"?`)) return;

        try {
            const res = await fetch(`/api/admin/company/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchCompanies();
                setMessage('Company deleted');
                setStatus('success');
                setTimeout(() => setStatus('idle'), 2000);
            } else {
                alert('Failed to delete company');
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting company');
        }
    };

    const saveCompany = async () => {
    if (!compName) return;
    setStatus('saving');
    try {
        const logosToSend = {
            dark: darkLogo?.startsWith('data:') ? darkLogo : null, 
            light: lightLogo?.startsWith('data:') ? lightLogo : null
        };
        const payload = {
            name: compName,
            colors: { primaryDark, secondaryLight },
            guidelines,
            font,
            logos: logosToSend
        };
        await fetch('/api/admin/company', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        setStatus('success');
        setMessage('Company saved!');
        setTimeout(() => setView('list'), 1000);
    } catch (e) { setStatus('error'); setMessage('Failed to save'); }
  };

    const handleAnalyzeTemplate = async () => {
        if (!tempImage) return;
        setStatus('analyzing');
        try {
            // Strip prefix if present
            const base64 = tempImage.split(',')[1] || tempImage;
            const analysis = await analyzeTemplateImage(base64);
            setTempAnalysis(analysis);
            setStatus('idle');
            setMessage('Analysis complete');
        } catch (e) {
            console.error(e);
            setStatus('error');
            setMessage('Analysis failed');
        }
    };

  const saveTemplate = async () => {
      if (!tempName || !tempText || !tempImage) {
          setStatus('error'); setMessage('All fields required'); return;
      }
      setStatus('saving');
      try {
          await fetch('/api/admin/template', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  id: editingTemplateId,
                  name: tempName,
                  text: tempText,
                  image: tempImage,
                  analysis: tempAnalysis
              })
          });
          setStatus('success');
          setMessage('Template saved!');
          setTimeout(() => setView('list'), 1000);
      } catch (e) { setStatus('error'); setMessage('Failed to save'); }
  };

  const renderCompanyList = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map(company => (
            <div key={company.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <div className="h-12 w-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center p-2">
                        {company.logos.dark && <img src={company.logos.dark} alt="logo" className="max-w-full max-h-full object-contain" />}
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => {
                            setEditingCompanyId(company.id);
                            setCompName(company.name);
                            setPrimaryDark(company.colors.primaryDark);
                            setSecondaryLight(company.colors.secondaryLight);
                            setGuidelines(company.guidelines);
                            setFont(company.font || '');
                            setDarkLogo(company.logos.dark);
                            setLightLogo(company.logos.light);
                            setView('editor');
                        }} className="text-gray-400 hover:text-blue-600 p-2"><Edit2 size={20} /></button>
                        <button onClick={() => handleDeleteCompany(company.id, company.name)} className="text-gray-400 hover:text-red-600 p-2">
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
                <h3 className="font-bold text-gray-900">{company.name}</h3>
            </div>
        ))}
          {companies.length === 0 && <div className="col-span-full py-12 text-center text-gray-400">No companies found.</div>}
      </div>
  );

  const renderTemplateList = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div onClick={() => {
              setEditingTemplateId(null);
              setTempName('');
              setTempText('');
              setTempImage(null);
              setTempAnalysis('');
              setView('editor');
          }} className="h-[320px] rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 flex flex-col items-center justify-center cursor-pointer transition-all group">
              <PlusCircle size={48} className="text-gray-300 group-hover:text-blue-500 mb-2" />
              <span className="text-gray-500 font-medium group-hover:text-blue-600">Create New Template</span>
          </div>

          {templates.map(template => (
              <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow relative">
                  <div className="h-[240px] w-full bg-gray-100 flex items-center justify-center overflow-hidden relative">
                      <img src={template.imageUrl} alt={template.name} className="w-full h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                              onClick={(e) => { e.stopPropagation(); handlePreview(template.imageUrl); }}
                              className="bg-white text-black p-3 rounded-full hover:bg-gray-200 shadow-lg transform scale-90 group-hover:scale-100 transition-transform"
                          >
                              <Eye size={24} />
                          </button>
                      </div>
                  </div>
                  <div className="p-4 flex justify-between items-center bg-white border-t border-gray-100">
                      <h3 className="font-bold text-gray-900 text-lg">{template.name}</h3>
                      <div className="flex gap-1">
                          <button onClick={() => {
                              setEditingTemplateId(template.id);
                              setTempName(template.name);
                              setTempText(template.text);
                              setTempImage(template.imageUrl);
                              setTempAnalysis(template.analysis || '');
                              setView('editor');
                          }} className="text-gray-400 hover:text-blue-600 p-2"><Edit2 size={20} /></button>
                          <button onClick={() => handleDeleteTemplate(template.id, template.name)} className="text-gray-400 hover:text-red-600 p-2">
                              <Trash2 size={20} />
                          </button>
                      </div>
                  </div>
              </div>
          ))}
          {templates.length === 0 && <div className="col-span-full py-12 text-center text-gray-400">No templates found.</div>}
      </div>
  );

  if (view === 'list') {
      return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Admin Console</h1>
                <button 
                    onClick={() => {
                        if (activeTab === 'companies') {
                            setEditingCompanyId(null);
                            setCompName(''); setPrimaryDark('#000000'); setSecondaryLight('#ffffff'); setGuidelines(''); setFont(''); setDarkLogo(null); setLightLogo(null);
                        } else {
                            setEditingTemplateId(null);
                            setTempName(''); setTempText(''); setTempImage(null); setTempAnalysis('');
                        }
                        setStatus('idle');
                        setView('editor');
                    }}
                    className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
                >
                    <PlusCircle size={20} />
                    Create New {activeTab === 'companies' ? 'Company' : 'Template'}
                </button>
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-8">
                <button
                    onClick={() => setActiveTab('companies')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'companies' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Building2 size={18} /> Companies
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'templates' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <LayoutTemplate size={18} /> Templates
                </button>
            </div>

            {activeTab === 'companies' ? renderCompanyList() : renderTemplateList()}
        </div>
      );
  }

  // Editor View
  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setView('list')} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
            {activeTab === 'companies' 
                ? (editingCompanyId ? `Edit ${compName}` : 'Create New Company')
                : (editingTemplateId ? `Edit ${tempName}` : 'Create New Template')
            }
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        
        {activeTab === 'companies' ? (
            // Company Form
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-8">
                    <div className="space-y-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                            <input type="text" value={compName} onChange={(e) => setCompName(e.target.value)} disabled={!!editingCompanyId} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100" />
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                                <div className="flex gap-3">
                                    <input type="color" value={primaryDark} onChange={(e) => setPrimaryDark(e.target.value)} className="h-12 w-24 rounded cursor-pointer border border-gray-300" />
                                    <input type="text" value={primaryDark} onChange={(e) => setPrimaryDark(e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono uppercase" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                                <div className="flex gap-3">
                                    <input type="color" value={secondaryLight} onChange={(e) => setSecondaryLight(e.target.value)} className="h-12 w-24 rounded cursor-pointer border border-gray-300" />
                                    <input type="text" value={secondaryLight} onChange={(e) => setSecondaryLight(e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono uppercase" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Dark Logo (Preview)</label>
                            {darkLogo ? (
                                <div className="relative h-24 w-24 bg-gray-100 rounded-lg border flex items-center justify-center group p-2">
                                    <img src={darkLogo} className="max-w-full max-h-full object-contain" />
                                    <button onClick={() => setDarkLogo(null)} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 text-xs flex items-center justify-center rounded-lg">Change</button>
                                </div>
                            ) : (
                                <label className="h-24 w-24 bg-gray-50 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"><Upload size={24} className="text-gray-400"/><input type="file" className="hidden" onChange={(e) => handleImageUpload(e, setDarkLogo)} /></label>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Light Logo (Preview)</label>
                            {lightLogo ? (
                                <div className="relative h-24 w-24 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center group p-2">
                                    <img src={lightLogo} className="max-w-full max-h-full object-contain" />
                                    <button onClick={() => setLightLogo(null)} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 text-xs flex items-center justify-center rounded-lg">Change</button>
                                </div>
                            ) : (
                                <label className="h-24 w-24 bg-gray-50 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"><Upload size={24} className="text-gray-400"/><input type="file" className="hidden" onChange={(e) => handleImageUpload(e, setLightLogo)} /></label>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mb-8">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Font</label>
                          <input type="text" value={font} onChange={(e) => setFont(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Playfair Display, Roboto, Futura..." />
                      </div>
                      <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand Guidelines</label>
                    <textarea value={guidelines} onChange={(e) => setGuidelines(e.target.value)} className="w-full h-48 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Describe brand voice, tone, and visual style..." />
                </div>
            </>
        ) : (
            // Template Form
            <div className="space-y-6 mb-8">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                    <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Summer Promo" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ideal Template Image</label>
                    {tempImage ? (
                        <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden group">
                                      <img src={tempImage} className="w-full h-full object-contain" />
                            <button onClick={() => setTempImage(null)} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center">Change Image</button>
                        </div>
                    ) : (
                        <label className="w-full h-64 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                            <Upload size={32} className="text-gray-400 mb-2" />
                            <span className="text-gray-500">Click to upload template reference image</span>
                                          <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, setTempImage, true)} />
                        </label>
                    )}
                </div>

                          {/* Resize Modal */}
                          {showResizeModal && (
                              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                                  <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
                                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                          <Maximize size={24} className="text-blue-600" />
                                          Detect & Resize
                                      </h3>
                                      <p className="text-gray-600 mb-6 text-sm">
                                          The uploaded image does not match standard aspect ratios.
                                          Select a target ratio to automatically resize it using AI.
                                      </p>

                                      <div className="grid grid-cols-3 gap-2 mb-6">
                                          {RATIOS.map(r => (
                                              <button
                                                  key={r.value}
                                                  onClick={() => setResizeRatio(r.value)}
                                                  className={`p-2 rounded border text-sm transition-colors ${resizeRatio === r.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                                              >
                                                  {r.label}
                                              </button>
                                          ))}
                                      </div>

                                      <div className="flex gap-3 justify-end">
                                          <button
                                              onClick={() => { setShowResizeModal(false); setPendingImage(null); }}
                                              className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                                          >
                                              Cancel
                                          </button>
                                          <button
                                              onClick={handleResize}
                                              disabled={status === 'resizing'}
                                              className="bg-blue-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-800 disabled:bg-gray-300"
                                          >
                                              {status === 'resizing' ? 'Resizing...' : 'Resize Image'}
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Description / Instructions</label>
                    <textarea value={tempText} onChange={(e) => setTempText(e.target.value)} className="w-full h-32 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Describe the layout, style, and goal of this template..." />
                </div>

                          <div>
                              <div className="flex justify-between items-center mb-1">
                                  <label className="block text-sm font-medium text-gray-700">AI Analysis & Composition Rules</label>
                                  <button
                                      onClick={handleAnalyzeTemplate}
                                      disabled={status === 'analyzing' || !tempImage}
                                      className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-purple-200 transition-colors"
                                  >
                                      {status === 'analyzing' ? 'Analyzing...' : <><Sparkles size={12} /> Auto-Analyze Image</>}
                                  </button>
                              </div>
                              <textarea
                                  value={tempAnalysis}
                                  onChange={(e) => setTempAnalysis(e.target.value)}
                                  className="w-full h-32 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs bg-gray-50"
                                  placeholder="AI analysis of the image layout will appear here..."
                              />
                          </div>
            </div>
        )}

        {status !== 'idle' && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${status === 'success' ? 'bg-green-50 text-green-700' : status === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            {status === 'success' ? <CheckCircle size={20} /> : status === 'error' ? <AlertCircle size={20} /> : <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-700 border-t-transparent"></div>}
            <span className="font-medium">{message || (status === 'saving' ? 'Saving...' : '')}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={activeTab === 'companies' ? saveCompany : saveTemplate} disabled={status === 'saving'} className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
            <Save size={18} />
            Save {activeTab === 'companies' ? 'Company' : 'Template'}
          </button>
        </div>

      </div>
    </div>
  );
};