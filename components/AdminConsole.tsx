import React, { useState, useEffect } from 'react';
import { Upload, Save, CheckCircle, AlertCircle, PlusCircle, ArrowLeft, Edit2, LayoutTemplate, Building2 } from 'lucide-react';
import { CompanyConfig } from '../types';

interface ExtendedCompanyConfig extends CompanyConfig {
  id: string;
}

interface TemplateConfig {
    id: string;
    name: string;
    text: string;
    imageUrl: string;
}

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
  const [darkLogo, setDarkLogo] = useState<string | null>(null);
  const [lightLogo, setLightLogo] = useState<string | null>(null);

  // Template Editor State
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempText, setTempText] = useState('');
  const [tempImage, setTempImage] = useState<string | null>(null);
  
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
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

  const saveTemplate = async () => {
      if (!tempName || !tempText || !tempImage) {
          setStatus('error'); setMessage('All fields required'); return;
      }
      setStatus('saving');
      try {
          await fetch('/api/admin/template', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: tempName, text: tempText, image: tempImage })
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
                    <button onClick={() => {
                        setEditingCompanyId(company.id);
                        setCompName(company.name);
                        setPrimaryDark(company.colors.primaryDark);
                        setSecondaryLight(company.colors.secondaryLight);
                        setGuidelines(company.guidelines);
                        setDarkLogo(company.logos.dark);
                        setLightLogo(company.logos.light);
                        setView('editor');
                    }} className="text-gray-400 hover:text-blue-600 p-2"><Edit2 size={20} /></button>
                </div>
                <h3 className="font-bold text-gray-900">{company.name}</h3>
            </div>
        ))}
        {companies.length === 0 && <div className="col-span-full py-12 text-center text-gray-400">No companies found.</div>}
      </div>
  );

  const renderTemplateList = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
              <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group">
                  <div className="h-48 bg-gray-100 overflow-hidden relative">
                      {template.imageUrl && <img src={template.imageUrl} alt={template.name} className="w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white font-medium px-4 text-center">{template.text}</span>
                      </div>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">{template.name}</h3>
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
                            setCompName(''); setPrimaryDark('#000000'); setSecondaryLight('#ffffff'); setGuidelines(''); setDarkLogo(null); setLightLogo(null);
                        } else {
                            setEditingTemplateId(null);
                            setTempName(''); setTempText(''); setTempImage(null);
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
                            <img src={tempImage} className="w-full h-full object-cover" />
                            <button onClick={() => setTempImage(null)} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center">Change Image</button>
                        </div>
                    ) : (
                        <label className="w-full h-64 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                            <Upload size={32} className="text-gray-400 mb-2" />
                            <span className="text-gray-500">Click to upload template reference image</span>
                            <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, setTempImage)} />
                        </label>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Description / Instructions</label>
                    <textarea value={tempText} onChange={(e) => setTempText(e.target.value)} className="w-full h-32 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Describe the layout, style, and goal of this template..." />
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