import { useState, useEffect, useRef } from 'react';
import {
    Folder, File, Upload, ChevronRight, Home, MoreVertical,
    Download, Trash2, FolderPlus, ArrowLeft, RefreshCw,
    FileText, Image, Film, Music, Monitor
} from 'lucide-react';
import { getFiles, getDownloadUrl, deleteItem, createDirectory, uploadFiles, moveItem } from '../api/files';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility to format bytes
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Utility to format date
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Icon helper
const getFileIcon = (name, isDir) => {
    if (isDir) return <Folder className="w-6 h-6 text-blue-500 fill-blue-500/20" />;
    const ext = name.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image className="w-6 h-6 text-purple-500" />;
    if (['mp4', 'mov', 'webm'].includes(ext)) return <Film className="w-6 h-6 text-red-500" />;
    if (['mp3', 'wav', 'ogg'].includes(ext)) return <Music className="w-6 h-6 text-yellow-500" />;
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return <FileText className="w-6 h-6 text-gray-500" />;
    return <File className="w-6 h-6 text-gray-400" />;
};

export default function FileExplorer() {
    const [path, setPath] = useState('/');
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);

    // Refresh trigger
    const loadFiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getFiles(path);
            // Sort: Directories first, then files
            const sorted = data.files.sort((a, b) => {
                if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
                return a.isDirectory ? -1 : 1;
            });
            setFiles(sorted);
        } catch (err) {
            console.error(err);
            setError('Failed to load files');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFiles();
    }, [path]);

    const handleNavigate = (newPath) => {
        setPath(newPath);
    };

    const handleUp = () => {
        if (path === '/') return;
        const parent = path.substring(0, path.lastIndexOf('/')) || '/';
        setPath(parent);
    };

    const handleBreadcrumbClick = (index) => {
        const parts = path.split('/').filter(Boolean);
        const newPath = '/' + parts.slice(0, index + 1).join('/');
        setPath(newPath);
    };

    const handleUpload = async (e) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        setUploading(true);
        setUploadProgress(0);
        try {
            await uploadFiles(path, fileList, (progress) => {
                setUploadProgress(progress);
            });
            loadFiles();
        } catch (err) {
            alert('Upload failed');
        } finally {
            setUploading(false);
            e.target.value = null; // Reset input
        }
    };

    const handleCreateFolder = async () => {
        const name = prompt("Enter folder name:");
        if (!name) return;
        try {
            await createDirectory(path, name);
            loadFiles();
        } catch (err) {
            alert('Could not create folder');
        }
    };

    const handleDelete = async (itemName) => {
        if (!confirm(`Are you sure you want to delete "${itemName}"?`)) return;
        try {
            // Path to item
            const itemPath = path === '/' ? `/${itemName}` : `${path}/${itemName}`;
            await deleteItem(itemPath);
            loadFiles();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const handleDownload = (itemName) => {
        const itemPath = path === '/' ? `/${itemName}` : `${path}/${itemName}`;
        const url = getDownloadUrl(itemPath);
        // Trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = itemName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const breadcrumbs = path.split('/').filter(Boolean);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2 overflow-hidden">
                    <button
                        onClick={() => setPath('/')}
                        className={clsx("p-2 rounded-lg hover:bg-gray-200 text-gray-600 transition", path === '/' && "bg-gray-200 text-blue-600")}
                    >
                        <Home size={18} />
                    </button>
                    {path !== '/' && (
                        <button onClick={handleUp} className="p-2 rounded-lg hover:bg-gray-200 text-gray-600">
                            <ArrowLeft size={18} />
                        </button>
                    )}

                    <div className="flex items-center text-sm font-medium text-gray-700 overflow-x-auto whitespace-nowrap scrollbar-hide">
                        <span className="text-gray-400 mx-1">/</span>
                        {breadcrumbs.map((part, i) => (
                            <div key={i} className="flex items-center">
                                <button
                                    onClick={() => handleBreadcrumbClick(i)}
                                    className="hover:bg-gray-200 px-2 py-1 rounded-md transition"
                                >
                                    {part}
                                </button>
                                {i < breadcrumbs.length - 1 && <ChevronRight size={14} className="text-gray-400 mx-1" />}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadFiles}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={handleCreateFolder}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm text-sm font-medium"
                    >
                        <FolderPlus size={18} />
                        <span>New Folder</span>
                    </button>
                    <div className="relative">
                        <input
                            type="file"
                            multiple
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleUpload}
                        />
                        <button className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm text-sm font-medium">
                            <Upload size={18} />
                            <span>Upload</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            {uploading && (
                <div className="h-1 w-full bg-gray-100">
                    <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                    />
                </div>
            )}

            {/* File List */}
            <div className="flex-1 overflow-y-auto">
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full text-red-500 gap-2">
                        <p>{error}</p>
                        <button onClick={loadFiles} className="text-blue-600 hover:underline">Retry</button>
                    </div>
                ) : files.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                        <Folder size={64} className="text-gray-200" />
                        <p>This folder is empty</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm text-gray-500">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-700 sticky top-0 bg-opacity-95 backdrop-blur-sm z-10">
                            <tr>
                                <th scope="col" className="px-6 py-3 font-medium">Name</th>
                                <th scope="col" className="px-6 py-3 font-medium w-32">Size</th>
                                <th scope="col" className="px-6 py-3 font-medium w-48">Last Modified</th>
                                <th scope="col" className="px-6 py-3 font-medium w-24 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {files.map((file) => (
                                <tr
                                    key={file.name}
                                    className="bg-white hover:bg-gray-50 transition group cursor-pointer"
                                    onClick={() => {
                                        if (file.isDirectory) {
                                            const newPath = path === '/' ? `/${file.name}` : `${path}/${file.name}`;
                                            handleNavigate(newPath);
                                        } else {
                                            handleDownload(file.name);
                                        }
                                    }}
                                >
                                    <td className="px-6 py-4 flex items-center gap-3 font-medium text-gray-900 group-hover:text-blue-600">
                                        {getFileIcon(file.name, file.isDirectory)}
                                        <span className="truncate max-w-[300px] md:max-w-md lg:max-w-lg">{file.name}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {file.isDirectory ? '-' : formatBytes(file.size)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {formatDate(file.updatedAt)}
                                    </td>
                                    <td className="px-6 py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                            {!file.isDirectory && (
                                                <button
                                                    onClick={() => handleDownload(file.name)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(file.name)}
                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Status Bar */}
            <div className="bg-gray-50 border-t border-gray-100 px-4 py-2 text-xs text-gray-500 flex justify-between items-center">
                <span>{files.length} items</span>
                <span>{path}</span>
            </div>
        </div>
    );
}
