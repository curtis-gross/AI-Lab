import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));
const port = process.env.PORT || 8080;

console.log(`Starting server configuration. Port: ${port}`);
console.log("GEMINI_API_KEY present in env:", !!process.env.GEMINI_API_KEY);

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
