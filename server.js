import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Ratio Mapping Helpers ---

// Supported Gemini Image aspect ratios
const SUPPORTED_RATIOS = [
  { str: '1:1', val: 1 },
  { str: '3:4', val: 0.75 },
  { str: '4:3', val: 1.33 },
  { str: '9:16', val: 0.56 },
  { str: '16:9', val: 1.77 },
  { str: '4:5', val: 0.8 },
  { str: '5:4', val: 1.25 },
  { str: '2:3', val: 0.66 },
  { str: '3:2', val: 1.5 },
  { str: '21:9', val: 2.33 }
];

const parseRatio = (ratioStr) => {
  if (typeof ratioStr === 'number') return ratioStr;

  // Handle strings like "Mobile Portrait (4:5)" or "Custom (1.91:1)"
  const match = ratioStr.match(/\(([\d.]+:\d+)\)/) || ratioStr.match(/([\d.]+:\d+)/);
  const actualRatio = match ? match[1] : ratioStr;

  const [w, h] = actualRatio.split(':').map(Number);
  if (!w || !h) return 1;
  return w / h;
};

const getClosestSupportedRatio = (targetRatioStr) => {
  // If it's already in the list (exact string match), return it
  if (SUPPORTED_RATIOS.some(r => r.str === targetRatioStr)) return targetRatioStr;

  const targetVal = parseRatio(targetRatioStr);

  // Find closest
  let closest = SUPPORTED_RATIOS[0];
  let minDiff = Math.abs(targetVal - closest.val);

  for (const ratio of SUPPORTED_RATIOS) {
    const diff = Math.abs(targetVal - ratio.val);
    if (diff < minDiff) {
      minDiff = diff;
      closest = ratio;
    }
  }

  console.log(`[Resizer] Mapping unsupported ratio ${targetRatioStr} (${targetVal.toFixed(2)}) to API-supported ${closest.str} (${closest.val})`);
  return closest.str;
};

// Background Jobs Store
const activeJobs = new Map();

const app = express();
app.use(express.json({ limit: '50mb' }));
const port = process.env.PORT || 8080;

console.log(`Starting server configuration. Port: ${port}`);
console.log("GEMINI_API_KEY present in env:", !!process.env.GEMINI_API_KEY);

const storagePath = path.join(__dirname, 'storage');
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
}

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// --- API Routes ---

// API Key Proxy
app.get('/api/key', (req, res) => {
  let apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    // Trim and clean
    apiKey = apiKey.trim();
    if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
      apiKey = apiKey.slice(1, -1);
    }

    const keyPrefix = apiKey.substring(0, 4);
    console.log(`Serving API Key. Length: ${apiKey.length}, Prefix: ${keyPrefix}***`);
    res.json({ apiKey: apiKey });
  } else {
    console.error('GEMINI_API_KEY not set in environment variables.');
    res.status(500).json({ error: 'API key not configured on the server.' });
  }
});

// --- User Management ---

const usersFile = path.join(__dirname, 'storage', 'users.json');

// Initialize with default admin if no users file exists
if (!fs.existsSync(usersFile)) {
  const defaultUsers = [
    {
      username: 'admin',
      name: 'Admin User',
      initials: 'AD',
      password: '123654',
      role: 'admin',
      createdAt: new Date().toISOString()
    }
  ];
  fs.writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2));
}

const getUsers = () => {
  try {
    return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  } catch (e) {
    return [];
  }
};

const saveUsers = (users) => {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
};

// Login Endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    return res.json({
      success: true,
      user: {
        username: user.username,
        name: user.name,
        initials: user.initials,
        role: user.role
      }
    });
  }

  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// List Users (paginated)
app.get('/api/admin/users', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 10));
    const sortBy = req.query.sortBy || 'username';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    const users = getUsers().map(u => ({
      username: u.username,
      name: u.name,
      initials: u.initials,
      role: u.role,
      createdAt: u.createdAt
    }));

    // Sort
    users.sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case 'name':
          valA = a.name || '';
          valB = b.name || '';
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'role':
          valA = a.role || '';
          valB = b.role || '';
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'username':
        default:
          valA = a.username || '';
          valB = b.username || '';
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
    });

    const totalItems = users.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const items = users.slice(startIndex, startIndex + pageSize);

    res.json({ items, totalItems, totalPages, currentPage: safePage, pageSize });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Create User
app.post('/api/admin/users', (req, res) => {
  try {
    const { username, name, password, role } = req.body;
    if (!username || !name || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const users = getUsers();
    if (users.find(u => u.username === username)) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const newUser = {
      username,
      name,
      initials,
      password,
      role,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);
    res.json({ success: true, user: { username, name, initials, role, createdAt: newUser.createdAt } });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update User
app.put('/api/admin/users/:username', (req, res) => {
  try {
    const { username } = req.params;
    const { name, password, role } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }

    const users = getUsers();
    const index = users.findIndex(u => u.username === username);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent removing the last admin
    if (users[index].role === 'admin' && role !== 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin role' });
      }
    }

    const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    users[index].name = name;
    users[index].initials = initials;
    users[index].role = role;
    if (password) users[index].password = password;

    saveUsers(users);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete User
app.delete('/api/admin/users/:username', (req, res) => {
  try {
    const { username } = req.params;
    const users = getUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }

    const filtered = users.filter(u => u.username !== username);
    saveUsers(filtered);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// --- Image Resizer Background Jobs ---

app.post('/api/resizer/start', (req, res) => {
  const { uploadedBanner, targetSizes, promptGuidance, name } = req.body;

  if (!uploadedBanner || !targetSizes) {
    return res.status(400).json({ error: 'Missing image or sizes' });
  }

  const jobId = Date.now().toString();
  const job = {
    id: jobId,
    name: name || 'Resized Banner Upload',
    status: 'processing',
    progress: 'Initializing...',
    completedCount: 0,
    totalCount: targetSizes.length,
    results: [],
    timestamp: Date.now()
  };

  activeJobs.set(jobId, job);

  // Start background processing
  (async () => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not set");

      const client = new GoogleGenAI({ apiKey });

      for (const sizeObj of targetSizes) {
        job.progress = `Generating ${sizeObj.label} (${job.completedCount + 1} of ${targetSizes.length})...`;

        const ratioStr = sizeObj.ratio;
        const safeRatio = getClosestSupportedRatio(ratioStr);

        const prompt = `
                    You are an expert graphic designer.
                    Your task is to RESIZE/REFORMAT this exact image to a NEW aspect ratio of ${safeRatio} (${sizeObj.label}).
                    
                    **CRITICAL INSTRUCTIONS:**
                    1. ${promptGuidance}
                    2. PRESERVE key text and branding elements.
                    3. Extend the background seamlessly.
                    4. The output MUST be a high-quality commercial image.
                `;

        const response = await client.models.generateContent({
          model: "gemini-3-pro-image-preview",
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { data: uploadedBanner, mimeType: 'image/png' } }
            ]
          }],
          config: {
            responseModalities: ["IMAGE", "TEXT"],
            imageConfig: {
              aspectRatio: safeRatio,
              imageSize: "1K"
            }
          }
        });

        // Extract image from response
        const candidates = response?.candidates || response?.response?.candidates;
        if (candidates && candidates.length > 0) {
          for (const candidate of candidates) {
            const parts = candidate?.content?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                  job.results.push({
                    companyId: 'manual_upload',
                    companyName: 'Custom Upload',
                    ratio: sizeObj.label,
                    usedRatio: safeRatio,
                    imageUrl: `data:image/jpeg;base64,${part.inlineData.data}`,
                    timestamp: Date.now()
                  });
                }
              }
            }
          }
        }

        job.completedCount++;
      }

      job.status = 'completed';
      job.progress = 'All resizes completed!';

      // Update history entry
      const historyItem = {
        id: jobId,
        timestamp: job.timestamp,
        tagline: job.name,
        type: 'image_resizer',
        status: 'completed',
        results: job.results,
        companyCount: 1
      };

      const historyFilePath = path.join(__dirname, 'storage', 'history', `${jobId}.json`);
      fs.writeFileSync(historyFilePath, JSON.stringify(historyItem, null, 2));

      // Clean up from active jobs after some time (1 hour)
      setTimeout(() => activeJobs.delete(jobId), 3600000);

    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      job.status = 'failed';
      job.progress = `Error: ${error.message}`;

      // Update history entry with failure
      try {
        const historyFilePath = path.join(__dirname, 'storage', 'history', `${jobId}.json`);
        if (fs.existsSync(historyFilePath)) {
          const content = fs.readFileSync(historyFilePath, 'utf8');
          const item = JSON.parse(content);
          item.status = 'failed';
          fs.writeFileSync(historyFilePath, JSON.stringify(item, null, 2));
        }
      } catch (historyError) {
        console.error(`Failed to update history for failed job ${jobId}:`, historyError);
      }
    }
  })();

  // Create initial history entry with 'processing' status
  const initialHistoryItem = {
    id: jobId,
    timestamp: job.timestamp,
    tagline: job.name,
    type: 'image_resizer',
    status: 'processing',
    results: [],
    companyCount: 1
  };

  const historyDir = path.join(__dirname, 'storage', 'history');
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }
  const historyFilePath = path.join(historyDir, `${jobId}.json`);
  fs.writeFileSync(historyFilePath, JSON.stringify(initialHistoryItem, null, 2));

  res.json({ jobId });
});

app.get('/api/resizer/jobs', (req, res) => {
  res.json(Array.from(activeJobs.values()).sort((a, b) => b.timestamp - a.timestamp));
});

app.get('/api/resizer/jobs/:id', (req, res) => {
  const job = activeJobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// --- Admin Routes ---

// List Companies
app.get('/api/admin/companies', (req, res) => {
  try {
    const storagePath = path.join(__dirname, 'storage');
    if (!fs.existsSync(storagePath)) {
      return res.json([]);
    }

    // Filter for directories that are NOT 'templates'
    const companies = fs.readdirSync(storagePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name !== 'templates')
      .map(dirent => {
        const configPath = path.join(storagePath, dirent.name, 'config.json');
        if (fs.existsSync(configPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const getLogoUrl = (filename) => {
              if (!filename) return null;
              return `/api/admin/company/${dirent.name}/logo/${filename}`;
            };
            return {
              ...config,
              id: dirent.name,
              logos: {
                dark: getLogoUrl(config.logos?.dark),
                light: getLogoUrl(config.logos?.light)
              }
            };
          } catch (e) {
            console.error(`Error reading config for ${dirent.name}`, e);
            return null;
          }
        }
        return null;
      })
      .filter(c => c !== null);

    res.json(companies);
  } catch (error) {
    console.error('Error listing companies:', error);
    res.status(500).json({ error: 'Failed to list companies' });
  }
});

// Serve Company Logos
app.get('/api/admin/company/:id/logo/:filename', (req, res) => {
  const { id, filename } = req.params;
  if (id.includes('..') || filename.includes('..')) return res.status(400).send('Invalid path');

  const filePath = path.join(__dirname, 'storage', id, filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Not found');
  }
});

// Save Company
app.post('/api/admin/company', (req, res) => {
  try {
    const { name, colors, guidelines, font, logos } = req.body;

    if (!name || !colors || !logos) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sanitizedFolder = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const storagePath = path.join(__dirname, 'storage', sanitizedFolder);

    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    const saveBase64 = (base64Str, fileName) => {
      if (!base64Str) return null;
      const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer;
      if (matches && matches.length === 3) {
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(base64Str, 'base64');
      }
      const filePath = path.join(storagePath, fileName);
      fs.writeFileSync(filePath, buffer);
      return filePath;
    };

    saveBase64(logos.dark, 'logo_dark.png');
    saveBase64(logos.light, 'logo_light.png');

    const config = {
      name,
      colors,
      guidelines,
      font,
      logos: {
        dark: 'logo_dark.png',
        light: 'logo_light.png'
      },
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(path.join(storagePath, 'config.json'), JSON.stringify(config, null, 2));
    res.json({ success: true, path: storagePath });

  } catch (error) {
    console.error('Error saving company:', error);
    res.status(500).json({ error: 'Failed to save company configuration' });
  }
});

// Delete Company
app.delete('/api/admin/company/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (id.includes('..') || id.includes('/')) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const companyPath = path.join(__dirname, 'storage', id);
    if (fs.existsSync(companyPath)) {
      fs.rmSync(companyPath, { recursive: true, force: true });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Company not found' });
    }
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});


// --- History Routes (New) ---

const historyDir = path.join(__dirname, 'storage', 'history');
if (!fs.existsSync(historyDir)) {
  fs.mkdirSync(historyDir, { recursive: true });
}

// Save History
app.post('/api/history', (req, res) => {
  try {
    const item = req.body;
    if (!item || !item.id) {
      return res.status(400).json({ error: 'Invalid history item' });
    }
    const filePath = path.join(historyDir, `${item.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(item, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving history:', error);
    res.status(500).json({ error: 'Failed to save history' });
  }
});

// List History
app.get('/api/history', (req, res) => {
  try {
    const files = fs.readdirSync(historyDir).filter(f => f.endsWith('.json'));
    const history = files.map(file => {
      try {
        const content = fs.readFileSync(path.join(historyDir, file), 'utf8');
        return JSON.parse(content);
      } catch (e) {
        console.error(`Error reading history file ${file}:`, e);
        return null;
      }
    }).filter(item => item !== null);

    // Sort by timestamp descending
    history.sort((a, b) => b.timestamp - a.timestamp);

    res.json(history);
  } catch (error) {
    console.error('Error listing history:', error);
    res.status(500).json({ error: 'Failed to list history' });
  }
});

// Paginated History List
app.get('/api/history/list', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 10));
    const sortBy = req.query.sortBy || 'timestamp';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    const files = fs.readdirSync(historyDir).filter(f => f.endsWith('.json'));
    const allItems = files.map(file => {
      try {
        const content = fs.readFileSync(path.join(historyDir, file), 'utf8');
        const item = JSON.parse(content);
        return {
          id: item.id,
          timestamp: item.timestamp,
          tagline: item.tagline || 'Untitled',
          type: item.type || 'image_generator',
          status: item.status || 'completed',
          versionsCount: Array.isArray(item.results) ? item.results.length : 0,
          hasThumbnail: Array.isArray(item.results) && item.results.length > 0
        };
      } catch (e) {
        return null;
      }
    }).filter(item => item !== null);

    // Sort
    allItems.sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case 'status':
          valA = a.status || '';
          valB = b.status || '';
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'versions':
          valA = a.versionsCount;
          valB = b.versionsCount;
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        case 'timestamp':
        default:
          valA = a.timestamp || 0;
          valB = b.timestamp || 0;
          return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });

    const totalItems = allItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const items = allItems.slice(startIndex, startIndex + pageSize);

    res.json({
      items,
      totalItems,
      totalPages,
      currentPage: safePage,
      pageSize
    });
  } catch (error) {
    console.error('Error listing paginated history:', error);
    res.status(500).json({ error: 'Failed to list history' });
  }
});

// History Thumbnail - returns the first result image
app.get('/api/history/:id/thumbnail', (req, res) => {
  try {
    const { id } = req.params;
    if (id.includes('..') || id.includes('/')) {
      return res.status(400).send('Invalid ID');
    }

    const filePath = path.join(historyDir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Not found');
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const item = JSON.parse(content);

    if (!item.results || item.results.length === 0 || !item.results[0].imageUrl) {
      return res.status(404).send('No thumbnail available');
    }

    const imageUrl = item.results[0].imageUrl;
    // Handle base64 data URIs
    const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      res.set('Content-Type', mimeType);
      res.set('Cache-Control', 'public, max-age=3600');
      return res.send(buffer);
    }

    // If it's a URL, redirect
    return res.redirect(imageUrl);
  } catch (error) {
    console.error('Error serving thumbnail:', error);
    res.status(500).send('Failed to serve thumbnail');
  }
});

// Delete History
app.delete('/api/history/:id', (req, res) => {
  try {
    const { id } = req.params;
    // Basic sanitization
    if (id.includes('..') || id.includes('/')) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const filePath = path.join(historyDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'History item not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete history' });
  }
});

// Update History (Rename)
app.patch('/api/history/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { tagline } = req.body;

    if (id.includes('..') || id.includes('/')) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const filePath = path.join(historyDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const item = JSON.parse(content);

      // Update fields
      if (tagline !== undefined) item.tagline = tagline;

      fs.writeFileSync(filePath, JSON.stringify(item, null, 2));
      res.json({ success: true, item });
    } else {
      res.status(404).json({ error: 'History item not found' });
    }
  } catch (error) {
    console.error('Error updating history:', error);
    res.status(500).json({ error: 'Failed to update history' });
  }
});

// --- Template Routes ---

// List Templates
app.get('/api/admin/templates', (req, res) => {
  try {
    const templatesPath = path.join(__dirname, 'storage', 'templates');
    if (!fs.existsSync(templatesPath)) {
      return res.json([]);
    }

    const templates = fs.readdirSync(templatesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const configPath = path.join(templatesPath, dirent.name, 'template.json');
        if (fs.existsSync(configPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return {
              ...config,
              id: dirent.name,
              imageUrl: config.image ? `/api/admin/template/${dirent.name}/image/${config.image}` : null
            };
          } catch (e) {
            return null;
          }
        }
        return null;
      })
      .filter(t => t !== null);

    res.json(templates);
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// Serve Template Image
app.get('/api/admin/template/:id/image/:filename', (req, res) => {
  const { id, filename } = req.params;
  if (id.includes('..') || filename.includes('..')) return res.status(400).send('Invalid path');

  const filePath = path.join(__dirname, 'storage', 'templates', id, filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Not found');
  }
});

// Save Template
app.post('/api/admin/template', (req, res) => {
  try {
    const { name, text, image, analysis } = req.body; // image is base64

    if (!name || !text || !image) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sanitizedFolder = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const templatePath = path.join(__dirname, 'storage', 'templates', sanitizedFolder);

    if (!fs.existsSync(templatePath)) {
      fs.mkdirSync(templatePath, { recursive: true });
    }

    // Save Image
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(image, 'base64');
    }
    const imageName = 'template_image.png';
    fs.writeFileSync(path.join(templatePath, imageName), buffer);

    // Save Config
    const config = {
      name,
      text,
      image: imageName,
      analysis: analysis || '',
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(path.join(templatePath, 'template.json'), JSON.stringify(config, null, 2));
    res.json({ success: true });

  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// Delete Template
app.delete('/api/admin/template/:id', (req, res) => {
  try {
    const { id } = req.params;
    // Basic sanitization
    if (id.includes('..') || id.includes('/')) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const templatePath = path.join(__dirname, 'storage', 'templates', id);
    if (fs.existsSync(templatePath)) {
      fs.rmSync(templatePath, { recursive: true, force: true });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Template not found' });
    }
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// --- Size Routes (New) ---

const sizesFile = path.join(__dirname, 'storage', 'sizes.json');

// Initialize Default Sizes
if (!fs.existsSync(sizesFile)) {
  const defaultSizes = [
    { id: '1', label: 'Web Hero', ratio: '16:9' },
    { id: '2', label: 'Mobile Full Screen', ratio: '9:16' },
    { id: '3', label: 'RCS Rich Card', ratio: '3:2' },
    { id: '4', label: 'RCS Carousel', ratio: '4:3' },
    { id: '5', label: 'Square', ratio: '1:1' },
    { id: '6', label: 'RCS Short Card', ratio: '3:1' },
    { id: '7', label: 'Mobile Card', ratio: '2:3' },
    { id: '8', label: 'Web Leaderboard', ratio: '21:9' },
    { id: '9', label: 'Medium Rectangle', ratio: '5:4' },
    { id: '10', label: 'Mobile Portrait', ratio: '4:5' }
  ];
  fs.writeFileSync(sizesFile, JSON.stringify(defaultSizes, null, 2));
}

// List Sizes
app.get('/api/admin/sizes', (req, res) => {
  try {
    if (fs.existsSync(sizesFile)) {
      const sizes = JSON.parse(fs.readFileSync(sizesFile, 'utf8'));
      res.json(sizes);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error listing sizes:', error);
    res.status(500).json({ error: 'Failed to list sizes' });
  }
});

// Add Size
app.post('/api/admin/size', (req, res) => {
  try {
    const { label, ratio } = req.body;
    if (!label || !ratio) {
      return res.status(400).json({ error: 'Label and Ratio are required' });
    }

    const sizes = fs.existsSync(sizesFile) ? JSON.parse(fs.readFileSync(sizesFile, 'utf8')) : [];
    const newSize = {
      id: Date.now().toString(),
      label,
      ratio
    };
    sizes.push(newSize);
    fs.writeFileSync(sizesFile, JSON.stringify(sizes, null, 2));
    res.json({ success: true, size: newSize });

  } catch (error) {
    console.error('Error adding size:', error);
    res.status(500).json({ error: 'Failed to add size' });
  }
});

// Update Size
app.put('/api/admin/size/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { label, ratio } = req.body;

    if (!label || !ratio) {
      return res.status(400).json({ error: 'Label and Ratio are required' });
    }

    if (fs.existsSync(sizesFile)) {
      let sizes = JSON.parse(fs.readFileSync(sizesFile, 'utf8'));
      const index = sizes.findIndex(s => s.id === id);
      if (index !== -1) {
        sizes[index] = { ...sizes[index], label, ratio };
        fs.writeFileSync(sizesFile, JSON.stringify(sizes, null, 2));
        res.json({ success: true, size: sizes[index] });
      } else {
        res.status(404).json({ error: 'Size not found' });
      }
    } else {
      res.status(404).json({ error: 'Sizes file not found' });
    }
  } catch (error) {
    console.error('Error updating size:', error);
    res.status(500).json({ error: 'Failed to update size' });
  }
});

// Delete Size
app.delete('/api/admin/size/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (fs.existsSync(sizesFile)) {
      let sizes = JSON.parse(fs.readFileSync(sizesFile, 'utf8'));
      sizes = sizes.filter(s => s.id !== id);
      fs.writeFileSync(sizesFile, JSON.stringify(sizes, null, 2));
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Sizes file not found' });
    }
  } catch (error) {
    console.error('Error deleting size:', error);
    res.status(500).json({ error: 'Failed to delete size' });
  }
});


// --- Favorites Routes ---

const favoritesDir = path.join(__dirname, 'storage', 'favorites');
if (!fs.existsSync(favoritesDir)) {
  fs.mkdirSync(favoritesDir, { recursive: true });
}

// Get user favorites
app.get('/api/favorites/:username', (req, res) => {
  try {
    const { username } = req.params;
    if (username.includes('..') || username.includes('/')) {
      return res.status(400).json({ error: 'Invalid username' });
    }

    const filePath = path.join(favoritesDir, `${username}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      res.json(data);
    } else {
      res.json({ favorites: [] });
    }
  } catch (error) {
    console.error('Error getting favorites:', error);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
});

// Save user favorites
app.put('/api/favorites/:username', (req, res) => {
  try {
    const { username } = req.params;
    if (username.includes('..') || username.includes('/')) {
      return res.status(400).json({ error: 'Invalid username' });
    }

    const { favorites } = req.body;
    if (!Array.isArray(favorites)) {
      return res.status(400).json({ error: 'favorites must be an array' });
    }

    const filePath = path.join(favoritesDir, `${username}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ favorites }, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving favorites:', error);
    res.status(500).json({ error: 'Failed to save favorites' });
  }
});


// --- Help Center Route ---

app.post('/api/help/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Gemini API key not configured' });

    const client = new GoogleGenAI({ apiKey });
    
    const context = `
You are a helpful support assistant for the "Marketing Portal". 
The portal has the following features:
1. **Image Generator**: Create new marketing images using AI. Users select audience, campaign type, and enter a prompt. Supports product image uploads.
2. **Image Resizer**: Resize existing banners to multiple formats (Web Hero 16:9, Mobile 9:16, etc.) using AI outpainting to extend backgrounds.
3. **Template Builder**: Create reusable templates by analyzing an uploaded design.
4. **Theme History**: View past jobs, download assets, and see status of generations.
5. **Administration**: Manage users (add/remove), company branding (logos, colors), and image size presets. Only admins can access this.

Answer the user's question based on this information. Keep it concise and helpful.
`;

    const response = await client.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: [{
        role: "user",
        parts: [{ text: `${context}\n\nUser Question: ${question}` }]
      }]
    });

    const candidate = response.candidates?.[0] || response.response?.candidates?.[0];
    const textPart = candidate?.content?.parts?.find(p => p.text);
    const answer = textPart ? textPart.text : "I couldn't generate an answer at this time.";
    res.json({ answer });
  } catch (error) {
    console.error('Help API Error:', error);
    res.status(500).json({ error: 'Failed to get help' });
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// The "catchall" handler
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});

process.on('SIGINT', () => {
  console.log('Server shutting down');
  process.exit(0);
});
