import React, { useState, useEffect } from 'react';
import { ArrowLeft, Eye, Download, Pencil, Check, X, Clock } from 'lucide-react';
import { CompanyConfig, HistoryItem, GeneratedResult } from '../types';

interface HistoryViewerProps {
    imageId: string | null;
    onBack: () => void;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({ imageId, onBack }) => {
    const [image, setImage] = useState<HistoryItem | null>(null);
    const [companies, setCompanies] = useState<(CompanyConfig & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editTagline, setEditTagline] = useState('');

    useEffect(() => {
        if (image) {
            setEditTagline(image.tagline);
        }
    }, [image]);

    const handleSaveTitle = async () => {
        if (!image) return;
        try {
            const res = await fetch(`/api/history/${image.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tagline: editTagline })
            });
            if (res.ok) {
                setImage({ ...image, tagline: editTagline });
                setIsEditing(false);
            }
        } catch (e) {
            console.error("Failed to update tagline", e);
        }
    };

    useEffect(() => {
        fetchCompanies();
        if (imageId) {
            fetchImage(imageId);
        }
    }, [imageId]);

    const fetchCompanies = async () => {
        try {
            const res = await fetch('/api/admin/companies');
            if (res.ok) {
                const data = await res.json();
                // Add virtual company for manual uploads (Image Resizer)
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

    const fetchImage = async (id: string) => {
        try {
            // For now fetching all and filtering
            const res = await fetch('/api/history');
            if (res.ok) {
                const history: HistoryItem[] = await res.json();
                console.log("Fetching image with ID:", id);
                console.log("Available history IDs:", history.map(h => h.id));
                const found = history.find(h => h.id === id);
                console.log("Found image:", found);
                setImage(found || null);
            }
        } catch (e) {
            console.error("Failed to fetch image", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!image) return <div className="p-8 text-center">Image not found.</div>;

    const handlePreview = (url: string) => {
        const win = window.open();
        win?.document.write(`<img src="${url}" style="max-width:100%; height:auto;">`);
    };

    return (
        <div className="max-w-7xl mx-auto">
            <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
                <ArrowLeft size={20} className="mr-2" /> Back to History
            </button>

            <div className="bg-white rounded-xl p-6 shadow-sm mb-8 border border-gray-200">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${image.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                image.status === 'failed' ? 'bg-red-100 text-red-700' :
                                    image.type === 'image_resizer' ? 'bg-orange-100 text-orange-700' :
                                        image.type === 'template_to_banner' ? 'bg-blue-100 text-blue-700' :
                                            image.activeTab === 'new' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                                }`}>
                                {image.status === 'processing' ? 'Processing...' :
                                    image.status === 'failed' ? 'Failed' :
                                        image.type === 'image_resizer' ? 'Image Resizer' :
                                            image.type === 'template_to_banner' ? 'Template to Banner' :
                                                image.activeTab === 'new' ? 'New Image' : 'Product Image'}
                            </span>
                            <span className="text-sm text-gray-500">
                                {new Date(image.timestamp).toLocaleString()}
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
                                        setEditTagline(image.tagline);
                                    }}
                                    className="p-1 hover:bg-red-100 text-red-600 rounded"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">{image.tagline}</h1>
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

            {image.status === 'processing' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-12 text-center">
                    <Clock size={48} className="mx-auto mb-4 text-blue-400 animate-spin" />
                    <h3 className="text-xl font-bold text-blue-800 mb-2">Job is Processing</h3>
                    <p className="text-blue-600">This resize operation is still in progress. Results will appear here once finished.</p>
                </div>
            )}

            {image.status === 'failed' && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-12 text-center">
                    <X size={48} className="mx-auto mb-4 text-red-400" />
                    <h3 className="text-xl font-bold text-red-800 mb-2">Operation Failed</h3>
                    <p className="text-red-600">Something went wrong during the resizing process. Check logs for details.</p>
                </div>
            )}

            <div className="space-y-8">
                {companies.map(company => {
                    const compResults = image.results.filter(r => r.companyId === company.id);
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
