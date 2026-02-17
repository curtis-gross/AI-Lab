import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
    PlusCircle, X, Users, RefreshCw
} from 'lucide-react';

interface UserItem {
    username: string;
    name: string;
    initials: string;
    role: string;
    createdAt: string;
}

interface PaginatedResponse {
    items: UserItem[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
}

type SortField = 'username' | 'name' | 'role';
type SortOrder = 'asc' | 'desc';

interface UserFormData {
    username: string;
    name: string;
    password: string;
    role: string;
}

export const AdminUsers: React.FC = () => {
    const [data, setData] = useState<PaginatedResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortBy, setSortBy] = useState<SortField>('username');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);
    const [formData, setFormData] = useState<UserFormData>({ username: '', name: '', password: '', role: 'user' });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/admin/users?page=${page}&pageSize=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}`
            );
            if (res.ok) {
                setData(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, sortBy, sortOrder]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSort = (field: SortField) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setPage(1);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(1);
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ username: '', name: '', password: '', role: 'user' });
        setFormError('');
        setShowModal(true);
    };

    const openEditModal = (user: UserItem) => {
        setEditingUser(user);
        setFormData({ username: user.username, name: user.name, password: '', role: user.role });
        setFormError('');
        setShowModal(true);
    };

    const handleSave = async () => {
        setFormError('');
        if (!formData.name.trim() || !formData.role) {
            setFormError('Name and role are required');
            return;
        }
        if (!editingUser && (!formData.username.trim() || !formData.password)) {
            setFormError('Username and password are required');
            return;
        }

        setSaving(true);
        try {
            const isEdit = !!editingUser;
            const url = isEdit ? `/api/admin/users/${editingUser.username}` : '/api/admin/users';
            const method = isEdit ? 'PUT' : 'POST';

            const body: any = { name: formData.name, role: formData.role };
            if (!isEdit) {
                body.username = formData.username;
                body.password = formData.password;
            } else if (formData.password) {
                body.password = formData.password;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const result = await res.json();
            if (!res.ok) {
                setFormError(result.error || 'Operation failed');
                return;
            }

            setShowModal(false);
            fetchData();
        } catch (err) {
            setFormError('Network error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/admin/users/${deleteTarget.username}`, { method: 'DELETE' });
            const result = await res.json();
            if (!res.ok) {
                alert(result.error || 'Failed to delete user');
                return;
            }
            setDeleteTarget(null);
            fetchData();
        } catch (err) {
            alert('Network error');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortBy !== field) return <ArrowUpDown size={14} className="text-gray-400" />;
        return sortOrder === 'asc'
            ? <ArrowUp size={14} className="text-blue-600" />
            : <ArrowDown size={14} className="text-blue-600" />;
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getRoleBadge = (role: string) => {
        const styles: Record<string, string> = {
            admin: 'bg-purple-50 text-purple-700 border-purple-200',
            user: 'bg-blue-50 text-blue-700 border-blue-200',
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${styles[role] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {role}
            </span>
        );
    };

    const renderPaginationButtons = () => {
        if (!data) return null;
        const { currentPage, totalPages } = data;
        const buttons: (number | string)[] = [];
        buttons.push(1);
        if (currentPage > 3) buttons.push('...');
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            buttons.push(i);
        }
        if (currentPage < totalPages - 2) buttons.push('...');
        if (totalPages > 1) buttons.push(totalPages);

        return buttons.map((btn, idx) => {
            if (btn === '...') return <span key={`e-${idx}`} className="px-2 py-1 text-gray-400 text-sm">…</span>;
            const p = btn as number;
            return (
                <button key={p} onClick={() => setPage(p)}
                    className={`min-w-[32px] h-8 px-2 text-sm rounded border transition-colors ${currentPage === p ? 'bg-[#00529b] text-white border-[#00529b]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >{p}</button>
            );
        });
    };

    const startItem = data ? (data.currentPage - 1) * data.pageSize + 1 : 0;
    const endItem = data ? Math.min(data.currentPage * data.pageSize, data.totalItems) : 0;

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {data ? `${data.totalItems} total users` : 'Loading...'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#00529b] border border-[#00529b] rounded hover:bg-blue-50 transition-colors">
                        <RefreshCw size={16} /> Refresh List
                    </button>
                    <button onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#00529b] rounded hover:bg-[#003d75] transition-colors">
                        <PlusCircle size={16} /> Add User
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-[80px]">
                                    Avatar
                                </th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none"
                                    onClick={() => handleSort('username')}>
                                    <div className="flex items-center gap-1.5">Account <SortIcon field="username" /></div>
                                </th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none"
                                    onClick={() => handleSort('role')}>
                                    <div className="flex items-center gap-1.5">Role <SortIcon field="role" /></div>
                                </th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: pageSize }).map((_, i) => (
                                    <tr key={`sk-${i}`} className="animate-pulse">
                                        <td className="px-6 py-3"><div className="h-10 w-10 rounded-full bg-gray-200" /></td>
                                        <td className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-32" /><div className="h-3 bg-gray-100 rounded w-24 mt-1" /></td>
                                        <td className="px-6 py-3"><div className="h-5 bg-gray-200 rounded-full w-16" /></td>
                                        <td className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                                        <td className="px-6 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                                    </tr>
                                ))
                            ) : data && data.items.length > 0 ? (
                                data.items.map(user => (
                                    <tr key={user.username} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="h-10 w-10 rounded-full bg-[#7CA1B3] text-white flex items-center justify-center font-semibold text-sm">
                                                {user.initials}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                                            <div className="text-xs text-gray-500">{user.name}</div>
                                        </td>
                                        <td className="px-6 py-3">{getRoleBadge(user.role)}</td>
                                        <td className="px-6 py-3 text-sm text-gray-600">
                                            {user.createdAt ? formatDate(user.createdAt) : '-'}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => openEditModal(user)}
                                                    className="text-[#00529b] hover:text-[#003d75] text-sm font-medium hover:underline">
                                                    Edit
                                                </button>
                                                <button onClick={() => setDeleteTarget(user)}
                                                    className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline">
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <Users size={48} className="mx-auto mb-4 text-gray-300" />
                                        <p className="text-gray-500 text-sm font-medium">No users found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {data && data.totalItems > 0 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>Rows:</span>
                            <select value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                            <span className="text-gray-500">{startItem}–{endItem} of {data.totalItems}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={data.currentPage <= 1}
                                className="p-1.5 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft size={16} />
                            </button>
                            {renderPaginationButtons()}
                            <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={data.currentPage >= data.totalPages}
                                className="p-1.5 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-900">
                                {editingUser ? 'Edit User' : 'Create User'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Username */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    disabled={!!editingUser}
                                    className="w-full border border-gray-300 p-2.5 rounded text-sm focus:border-[#00529b] focus:ring-1 focus:ring-[#00529b] focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    placeholder="Enter username"
                                />
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Full Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border border-gray-300 p-2.5 rounded text-sm focus:border-[#00529b] focus:ring-1 focus:ring-[#00529b] focus:outline-none"
                                    placeholder="Enter full name"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                                    Password {editingUser && <span className="normal-case font-normal text-gray-400">(leave blank to keep current)</span>}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full border border-gray-300 p-2.5 rounded text-sm focus:border-[#00529b] focus:ring-1 focus:ring-[#00529b] focus:outline-none"
                                    placeholder={editingUser ? '••••••••' : 'Enter password'}
                                />
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full border border-gray-300 p-2.5 rounded text-sm focus:border-[#00529b] focus:ring-1 focus:ring-[#00529b] focus:outline-none bg-white"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>

                        {formError && (
                            <div className="mt-4 bg-red-50 text-red-600 text-sm p-3 rounded border border-red-100">
                                {formError}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#00529b] rounded hover:bg-[#003d75] disabled:bg-gray-300 transition-colors">
                                {saving ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteTarget(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Delete User</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to delete <strong>{deleteTarget.name}</strong> ({deleteTarget.username})?
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteTarget(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
