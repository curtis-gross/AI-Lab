import React, { useState, useEffect } from 'react';
import { ArrowLeft, Eye, Download, Pencil, Check, X } from 'lucide-react';
import { CompanyConfig, HistoryItem, GeneratedResult } from '../types';

interface HistoryViewerProps {
    dealId: string | null;
    onBack: () => void;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({ dealId, onBack }) => {
    const [deal, setDeal] = useState<HistoryItem | null>(null);
    const [companies, setCompanies] = useState<(CompanyConfig & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editTagline, setEditTagline] = useState('');

    useEffect(() => {
        if (deal) {
            setEditTagline(deal.tagline);
        }
    }, [deal]);

    const handleSaveTitle = async () => {
        if (!deal) return;
        try {
            const res = await fetch(`/api/history/${deal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tagline: editTagline })
            });
            if (res.ok) {
                setDeal({ ...deal, tagline: editTagline });
                setIsEditing(false);
            }
        } catch (e) {
            console.error("Failed to update tagline", e);
        }
    };

    useEffect(() => {
        fetchCompanies();
        if (dealId) {
            fetchDeal(dealId);
        }
    }, [dealId]);

    const fetchCompanies = async () => {
        try {
            const res = await fetch('/api/admin/companies');
            if (res.ok) {
                const data = await res.json();
                // Add virtual company for manual uploads (Deal Resizer)
                data.push({
                    id: 'manual_upload',
                    name: 'Manual Upload',
                    colors: { primaryDark: '#6b7280', secondaryLight: '#f3f4f6' },
                    logos: { dark: '', light: '' },
                    guidelines: '',
                    font: 'sans-serif'
                });
                setCompanies(data);
            }
        } catch (e) {
            console.error("Failed to fetch companies", e);
        }
    };

    const fetchDeal = async (id: string) => {
        try {
            // For now fetching all and filtering
            const res = await fetch('/api/history');
            if (res.ok) {
                const history: HistoryItem[] = await res.json();
                console.log("Fetching deal with ID:", id);
                console.log("Available history IDs:", history.map(h => h.id));
                const found = history.find(h => h.id === id);
                console.log("Found deal:", found);
                setDeal(found || null);
            }
        } catch (e) {
            console.error("Failed to fetch deal", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!deal) return <div className="p-8 text-center">Deal not found.</div>;

    const handlePreview = (url: string) => {
        const win = window.open();
        win?.document.write(`<img src="${url}" style="max-width:100%; height:auto;">`);
    };

    return (
        <div className="max-w-7xl mx-auto">
            <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
                <ArrowLeft size={20} className="mr-2" /> Back to Dashboard
            </button>

            <div className="bg-white rounded-xl p-6 shadow-sm mb-8 border border-gray-200">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${deal.type === 'deal_resizer' ? 'bg-orange-100 text-orange-700' :
                                deal.type === 'template_to_banner' ? 'bg-blue-100 text-blue-700' :
                                    deal.activeTab === 'new' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                                }`}>
                                {deal.type === 'deal_resizer' ? 'Deal Resizer' :
                                    deal.type === 'template_to_banner' ? 'Template to Banner' :
                                        deal.activeTab === 'new' ? 'New Deal' : 'Product Deal'}
                            </span>
                            <span className="text-sm text-gray-500">
                                {new Date(deal.timestamp).toLocaleString()}
                            </span>
                        </div>
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={editTagline}
                                    onChange={(e) => setEditTagline(e.target.value)}
                                    className="text-2xl font-bold text-gray-900 border-b-2 border-blue-600 focus:outline-none bg-transparent w-full"
                                    autoFocus
                                />
                                <button
                                    onClick={handleSaveTitle}
                                    className="p-1 hover:bg-green-100 text-green-600 rounded"
                                >
                                    <Check size={20} />
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditTagline(deal.tagline);
                                    }}
                                    className="p-1 hover:bg-red-100 text-red-600 rounded"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">{deal.tagline}</h1>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <Pencil size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {companies.map(company => {
                    const compResults = deal.results.filter(r => r.companyId === company.id);
                    if (compResults.length === 0) return null;

                    return (
                        <div key={company.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
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
                                                    title="Preview"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <a
                                                    href={res.imageUrl}
                                                    download={`${company.name.replace(/\s+/g, '-')}_${res.ratio}.jpg`}
                                                    className="bg-white text-black p-2 rounded-full hover:bg-gray-200"
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </a>
                                            </div>
                                        </div>
                                        <p className="text-xs text-center text-gray-500 mt-1 font-mono">{res.ratio}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
