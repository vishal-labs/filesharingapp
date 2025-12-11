import axios from 'axios';

// Default to localhost:3000 if not specified (for dev)
// In production/docker, we might want relative path '/api' if served from same origin
// or configured via env.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
});

export const getFiles = async (path = '/') => {
    const response = await api.get('/files', { params: { path } });
    return response.data;
};

export const createDirectory = async (path, name) => {
    const response = await api.post('/mkdir', { path, name });
    return response.data;
};

export const deleteItem = async (path) => {
    // Delete accepts JSON body
    const response = await api.delete('/delete', { data: { path } });
    return response.data;
};

export const moveItem = async (oldPath, newPath) => {
    const response = await api.post('/move', { oldPath, newPath });
    return response.data;
};

export const uploadFiles = async (path, files, onProgress) => {
    const formData = new FormData();
    // files is a FileList or array of File objects
    Array.from(files).forEach(file => {
        formData.append('files', file);
    });

    const response = await api.post('/upload', formData, {
        params: { path },
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        },
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getDownloadUrl = (path) => {
    return `${API_URL}/download?path=${encodeURIComponent(path)}`;
};
