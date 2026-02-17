import React, { useState, useEffect } from 'react';
import { Save, PlusCircle, ArrowLeft, Trash2, Edit2, Monitor } from 'lucide-react';
import { ImageSize } from '../types';

export const AdminSizes: React.FC = () => {
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [sizes, setSizes] = useState<ImageSize[]>([]);

    // Editor State
    const [sizeLabel, setSizeLabel] = useState('');
    const [sizeRatio, setSizeRatio] = useState('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (view === 'list') fetchSizes();
    }, [view]);

    const fetchSizes = async () => {
        try {
            const res = await fetch('/api/admin/sizes');
            if (res.ok) setSizes(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleDeleteSize = async (id: string) => {
        if (!window.confirm(`Delete this size?`)) return;
        try {
            const res = await fetch(`/api/admin/size/${id}`, { method: 'DELETE' });
            if (res.ok) { fetchSizes(); setMessage('Size deleted'); setStatus('success'); setTimeout(() => setStatus('idle'), 2000); }
        } catch (e) { console.error(e); }
    };

    const handleEditSize = (size: ImageSize) => {
        setEditingId(size.id);
        setSizeLabel(size.label);
        setSizeRatio(size.ratio);
        setStatus('idle');
        setView('editor');
    };

    const saveSize = async () => {
        if (!sizeLabel || !sizeRatio) {
            setStatus('error'); setMessage('Label and Ratio required'); return;
        }
        setStatus('saving');
        try {
            const url = editingId ? `/api/admin/size/${editingId}` : '/api/admin/size';
            const method = editingId ? 'PUT' : 'POST';

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: sizeLabel, ratio: sizeRatio })
            });
            setStatus('success');
            setMessage(editingId ? 'Size updated!' : 'Size saved!');
            setTimeout(() => { setView('list'); fetchSizes(); setEditingId(null); }, 1000);
        } catch (e) { setStatus('error'); setMessage('Failed to save'); }
    };

    if (view === 'list') {
        return (
            <div className="max-w-6xl mx-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Image Sizes</h1>
                    <button
                        onClick={() => { setEditingId(null); setSizeLabel(''); setSizeRatio(''); setStatus('idle'); setView('editor'); }}
                        className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
                    >
                        <PlusCircle size={20} />
                        Add New Size
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-4">Label</th>
                                <th className="px-6 py-4">Ratio</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sizes.map(size => (
                                <tr key={size.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-bold text-gray-800">{size.label}</td>
                                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                                        <span className="bg-gray-50 px-2 py-1 rounded border border-gray-100">{size.ratio}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-3">
                                        <button onClick={() => handleEditSize(size)} className="text-gray-400 hover:text-blue-600 transition-colors">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDeleteSize(size.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {sizes.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">No image sizes defined.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto p-8">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setView('list')} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ArrowLeft size={24} /></button>
                <h1 className="text-3xl font-bold text-gray-900">{editingId ? 'Edit Size' : 'Create New Size'}</h1>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Display Label</label>
                    <input type="text" value={sizeLabel} onChange={(e) => setSizeLabel(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Instagram Post" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
                    <input type="text" value={sizeRatio} onChange={(e) => setSizeRatio(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 1:1, 16:9" />
                    <p className="text-xs text-gray-500 mt-1">Format: W:H (e.g. 16:9) or Decimal (e.g. 1.91:1)</p>
                </div>

                {status !== 'idle' && (
                    <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        <span className="text-sm font-medium">{message}</span>
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <button onClick={saveSize} disabled={status === 'saving'} className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
                        <Save size={18} /> {editingId ? 'Update Size' : 'Save Size'}
                    </button>
                </div>
            </div>
        </div>
    );
};
