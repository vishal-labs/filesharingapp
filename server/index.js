const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_PATH = process.env.ROOT_PATH || '/';

app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50gb' }));
app.use(express.urlencoded({ limit: '50gb', extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Multer config for streaming upload to disk
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // We need to resolve destination from query param 'path'
        // But multer middleware runs before we can easily access it in a clean way 
        // if we use `upload.array`.
        // Alternatively, we can pass path in query. 
        // CAUTION: Multer destination is static or computed here. 
        // We will assume 'path' is passed in query.
        const uploadPath = req.query.path || '/';
        const dest = resolvePath(uploadPath);
        fs.ensureDirSync(dest);
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: Infinity } // No limit as requested
});

const resolvePath = (reqPath) => {
    return reqPath ? path.join(ROOT_PATH, reqPath) : ROOT_PATH;
};

// API: List Files
app.get('/api/files', async (req, res) => {
    try {
        const queryPath = req.query.path || '/';
        const absolutePath = resolvePath(queryPath);

        if (!await fs.pathExists(absolutePath)) {
            return res.status(404).json({ error: 'Path not found' });
        }

        const stats = await fs.stat(absolutePath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'Not a directory' });
        }

        const files = await fs.readdir(absolutePath);
        const fileList = await Promise.all(files.map(async (file) => {
            try {
                const filePath = path.join(absolutePath, file);
                const fileStats = await fs.stat(filePath);
                return {
                    name: file,
                    isDirectory: fileStats.isDirectory(),
                    size: fileStats.size,
                    updatedAt: fileStats.mtime,
                };
            } catch (err) {
                return null;
            }
        }));

        res.json({
            path: queryPath,
            files: fileList.filter(Boolean)
        });
    } catch (err) {
        console.error('Error listing files:', err);
        if (err.code === 'ENOENT') {
            return res.status(404).json({ error: 'Path not found', code: 'ENOENT' });
        }
        if (err.code === 'EACCES') {
            return res.status(403).json({ error: 'Permission denied', code: 'EACCES' });
        }
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

// API: Upload
app.post('/api/upload', upload.array('files'), (req, res) => {
    // Files are uploaded by multer storage configuration
    res.json({ message: 'Upload successful', files: req.files });
});

// API: Download
app.get('/api/download', async (req, res) => {
    try {
        const queryPath = req.query.path;
        if (!queryPath) return res.status(400).json({ error: 'Path required' });

        const absolutePath = resolvePath(queryPath);
        if (!await fs.pathExists(absolutePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(absolutePath);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Create Directory
app.post('/api/mkdir', async (req, res) => {
    try {
        const { path: queryPath, name } = req.body;
        if (!queryPath || !name) return res.status(400).json({ error: 'Path and name required' });

        const absolutePath = path.join(resolvePath(queryPath), name);
        await fs.ensureDir(absolutePath);
        res.json({ message: 'Directory created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Delete
app.delete('/api/delete', async (req, res) => {
    try {
        const { path: queryPath } = req.body; // Expect JSON body
        if (!queryPath) return res.status(400).json({ error: 'Path required' });

        const absolutePath = resolvePath(queryPath);
        await fs.remove(absolutePath);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Move/Rename
app.post('/api/move', async (req, res) => {
    try {
        // oldPath and newPath are relative to ROOT
        const { oldPath, newPath } = req.body;
        if (!oldPath || !newPath) return res.status(400).json({ error: 'oldPath and newPath required' });

        const absOld = resolvePath(oldPath);
        const absNew = resolvePath(newPath);

        await fs.move(absOld, absNew, { overwrite: false });
        res.json({ message: 'Moved/Renamed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SPA Fallback: Serve index.html for any unknown non-API route
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Serving files from: ${ROOT_PATH}`);
});
