import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Eye, Image, RefreshCw } from 'lucide-react';

interface HistoryListItem {
    id: string;
    timestamp: number;
    tagline: string;
    type: string;
    status: string;
    versionsCount: number;
    hasThumbnail: boolean;
}

interface PaginatedResponse {
    items: HistoryListItem[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
}

type SortField = 'timestamp' | 'status' | 'versions';
type SortOrder = 'asc' | 'desc';

interface HistoryListProps {
    onViewItem: (id: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ onViewItem }) => {
    const [data, setData] = useState<PaginatedResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortBy, setSortBy] = useState<SortField>('timestamp');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/history/list?page=${page}&pageSize=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}`
            );
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (err) {
            console.error('Failed to fetch history list', err);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, sortBy, sortOrder]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSort = (field: SortField) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
        setPage(1);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(1);
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortBy !== field) return <ArrowUpDown size={14} className="text-gray-400" />;
        return sortOrder === 'asc'
            ? <ArrowUp size={14} className="text-blue-600" />
            : <ArrowDown size={14} className="text-blue-600" />;
    };

    const formatDate = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            completed: 'bg-green-50 text-green-700 border-green-200',
            processing: 'bg-blue-50 text-blue-700 border-blue-200',
            failed: 'bg-red-50 text-red-700 border-red-200',
        };
        const labels: Record<string, string> = {
            completed: 'Completed',
            processing: 'Processing',
            failed: 'Failed',
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {status === 'processing' && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse" />}
                {labels[status] || status}
            </span>
        );
    };

    const renderPaginationButtons = () => {
        if (!data) return null;
        const { currentPage, totalPages } = data;
        const buttons: (number | string)[] = [];

        // Always show first page
        buttons.push(1);

        if (currentPage > 3) buttons.push('...');

        // Pages around current
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            buttons.push(i);
        }

        if (currentPage < totalPages - 2) buttons.push('...');

        // Always show last page if more than 1
        if (totalPages > 1) buttons.push(totalPages);

        return buttons.map((btn, idx) => {
            if (btn === '...') {
                return <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 text-sm">…</span>;
            }
            const pageNum = btn as number;
            return (
                <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`min-w-[32px] h-8 px-2 text-sm rounded border transition-colors
                        ${currentPage === pageNum
                            ? 'bg-[#00529b] text-white border-[#00529b]'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }
                    `}
                >
                    {pageNum}
                </button>
            );
        });
    };

    // Calculate display range
    const startItem = data ? (data.currentPage - 1) * data.pageSize + 1 : 0;
    const endItem = data ? Math.min(data.currentPage * data.pageSize, data.totalItems) : 0;

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Image Resizer History</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {data ? `${data.totalItems} total resize operations` : 'Loading...'}
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#00529b] border border-[#00529b] rounded hover:bg-blue-50 transition-colors"
                >
                    <RefreshCw size={16} /> Refresh List
                </button>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-[100px]">
                                    Original Image
                                </th>
                                <th
                                    className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none"
                                    onClick={() => handleSort('timestamp')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        Date <SortIcon field="timestamp" />
                                    </div>
                                </th>
                                <th
                                    className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none"
                                    onClick={() => handleSort('status')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        Status <SortIcon field="status" />
                                    </div>
                                </th>
                                <th
                                    className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none"
                                    onClick={() => handleSort('versions')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        Versions <SortIcon field="versions" />
                                    </div>
                                </th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: pageSize }).map((_, i) => (
                                    <tr key={`skeleton-${i}`} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="w-14 h-14 bg-gray-200 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                                        <td className="px-6 py-4"><div className="h-5 bg-gray-200 rounded-full w-20" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-8" /></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-10" /></td>
                                    </tr>
                                ))
                            ) : data && data.items.length > 0 ? (
                                data.items.map(item => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => onViewItem(item.id)}
                                    >
                                        <td className="px-6 py-3">
                                            {item.hasThumbnail ? (
                                                <div className="w-14 h-14 rounded border border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                                                    <img
                                                        src={`/api/history/${item.id}/thumbnail`}
                                                        alt="Thumbnail"
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.parentElement!.innerHTML = '<div class="text-gray-400 flex items-center justify-center w-full h-full"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-14 h-14 rounded border border-gray-200 bg-gray-100 flex items-center justify-center">
                                                    <Image size={20} className="text-gray-400" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="text-sm font-medium text-gray-900">
                                                {formatDate(item.timestamp)}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">
                                                {item.tagline}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="text-sm font-medium text-gray-900">
                                                {item.versionsCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onViewItem(item.id); }}
                                                className="text-[#00529b] hover:text-[#003d75] text-sm font-medium hover:underline"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <Image size={48} className="mx-auto mb-4 text-gray-300" />
                                        <p className="text-gray-500 text-sm font-medium">No resize history found</p>
                                        <p className="text-gray-400 text-xs mt-1">Resize operations will appear here</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Bar */}
                {data && data.totalItems > 0 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
                        {/* Left: Rows per page */}
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>Rows:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                            <span className="text-gray-500">
                                {startItem}–{endItem} of {data.totalItems}
                            </span>
                        </div>

                        {/* Right: Page buttons */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={data.currentPage <= 1}
                                className="p-1.5 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {renderPaginationButtons()}
                            <button
                                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                                disabled={data.currentPage >= data.totalPages}
                                className="p-1.5 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
