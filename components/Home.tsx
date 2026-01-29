import React from 'react';
import { brandConfig } from '../config';
import { Sparkles, Megaphone, Zap } from 'lucide-react';

interface HomeProps {
    setMode: (mode: any) => void;
}

export const Home: React.FC<HomeProps> = ({ setMode }) => {
    return (
        <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="text-center py-12 mb-8 bg-gray-50/50 rounded-b-3xl">
                <h1 className="text-4xl font-bold text-gray-900 mb-3">
                    Welcome to Creative Asset Generator
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Streamline your creative workflow by automatically generating asset variations across multiple channels, sizes, and banner permutations.
                </p>
            </div>

            {/* Main Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {/* Create New Assets Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col md:flex-row gap-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-1">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 mb-4 text-gray-600">
                            <Sparkles size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Create New Assets</h2>
                        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                            Generate asset variations for multiple channels, sizes, and banners.
                        </p>
                        <button 
                            onClick={() => setMode('DEAL_GENERATOR')}
                            className="bg-[#1e6bb8] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#165a9e] transition-colors w-full md:w-auto text-sm"
                        >
                            Get Started
                        </button>
                    </div>
                    {/* Placeholder UI Graphic */}
                    <div className="w-full md:w-48 bg-blue-50/50 rounded-lg border border-blue-100 relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-4 border-2 border-blue-100 rounded rotate-3"></div>
                        <div className="absolute inset-4 border-2 border-blue-100 rounded -rotate-3"></div>
                    </div>
                </div>

                {/* Manage Settings Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col md:flex-row gap-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-1">
                         <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 mb-4 text-gray-600">
                            <Zap size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Manage Settings</h2>
                        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                            Configure banners, assets types, templates, and system preferences.
                        </p>
                        <button 
                            onClick={() => setMode('ADMIN')}
                            className="bg-white text-[#1e6bb8] border border-[#1e6bb8] px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors w-full md:w-auto text-sm"
                        >
                            Open Admin Portal
                        </button>
                    </div>
                    {/* Placeholder UI Graphic */}
                    <div className="w-full md:w-48 bg-gray-50 rounded-lg border border-gray-100 relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,.02)_25%,rgba(0,0,0,.02)_50%,transparent_50%,transparent_75%,rgba(0,0,0,.02)_75%,rgba(0,0,0,.02))] bg-[length:20px_20px]"></div>
                        <div className="absolute inset-4 border border-gray-200 rounded">
                             <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
                                <div className="w-full h-[1px] bg-gray-200 rotate-45"></div>
                                <div className="w-full h-[1px] bg-gray-200 -rotate-45 absolute"></div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assets History Section */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-12">
                {/* Filters */}
                <div className="p-4 border-b border-gray-200 bg-gray-50/30 flex flex-wrap gap-4 items-center">
                     <div className="relative flex-1 min-w-[240px]">
                        <input 
                            type="text" 
                            placeholder="Search assets creation history by title, ID, status..." 
                            className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <div className="absolute right-3 top-2.5 text-gray-400">
                             <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                     </div>
                     
                     <div className="flex gap-4">
                         <div className="flex flex-col">
                             <label className="text-xs font-semibold text-gray-500 mb-1">Channel</label>
                             <select className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm min-w-[140px]">
                                 <option>Select Channel</option>
                             </select>
                         </div>
                         <div className="flex flex-col">
                             <label className="text-xs font-semibold text-gray-500 mb-1">Start Date</label>
                             <input type="date" className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm" />
                         </div>
                          <div className="flex flex-col">
                             <label className="text-xs font-semibold text-gray-500 mb-1">End Date</label>
                             <input type="date" className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm" />
                         </div>
                         <div className="flex items-end gap-2">
                             <button className="px-4 py-2 border border-[#1e6bb8] text-[#1e6bb8] font-medium rounded-lg text-sm hover:bg-blue-50">Filter</button>
                             <button className="px-4 py-2 text-blue-600 font-medium text-sm hover:underline">Reset</button>
                         </div>
                     </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Channel</th>
                                <th className="px-6 py-3 font-semibold">Processing Type</th>
                                <th className="px-6 py-3 font-semibold">Assets Number</th>
                                <th className="px-6 py-3 font-semibold">Date Created</th>
                                <th className="px-6 py-3 font-semibold">Status</th>
                                <th className="px-6 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {[1, 2, 3, 4, 5].map((_, i) => (
                                <tr key={i} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {i === 0 ? 'Paid Media' : 'Email'}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">Resize</td>
                                    <td className="px-6 py-4 text-gray-600">{i === 0 ? '12' : '10'}</td>
                                    <td className="px-6 py-4 text-gray-600">00/00/0000</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded border border-green-200">Completed</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-[#1e6bb8] font-medium hover:underline">View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {/* Pagination */}
                <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Items:</span>
                        <select className="border border-gray-300 rounded px-2 py-1 text-sm bg-white">
                            <option>10</option>
                        </select>
                        <span className="ml-2">1-10 of 18</span>
                    </div>
                     <div className="flex gap-1">
                        <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-500">&lt;</button>
                        <button className="px-3 py-1 bg-[#1e6bb8] text-white border border-[#1e6bb8] rounded">1</button>
                        <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-600">2</button>
                        <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-500">&gt;</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
