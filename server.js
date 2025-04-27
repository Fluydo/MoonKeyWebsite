const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Key storage
const keysFile = path.join(__dirname, 'keys.json');
let keys = [];

// Initialize keys.json if it doesn't exist
if (!fs.existsSync(keysFile)) {
    fs.writeFileSync(keysFile, '[]');
}

// Load keys
try {
    keys = JSON.parse(fs.readFileSync(keysFile, 'utf8'));
} catch (err) {
    console.error('Error loading keys:', err);
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/key-list', (req, res) => {
    res.json(keys);
});

app.post('/save-key', (req, res) => {
    const { key, date, status } = req.body;

    if (!/^Moon-[A-Z0-9]{8}$/.test(key)) {
        return res.status(400).json({ error: 'Invalid key format' });
    }

    if (keys.some(k => k.key === key)) {
        return res.status(400).json({ error: 'Key already exists' });
    }

    keys.push({ key, date, status });

    fs.writeFileSync(keysFile, JSON.stringify(keys, null, 2));

    res.json({ success: true });
});

app.post('/api/validate', (req, res) => {
    const { key, hwid } = req.body;

    const keyIndex = keys.findIndex(k => k.key === key);
    if (keyIndex === -1) {
        return res.json({ success: false, message: 'Key not found' });
    }

    const keyData = keys[keyIndex];

    if (keyData.status !== 'active') {
        return res.json({ success: false, message: 'Key is not active' });
    }

    if (keyData.hwid) {
        if (keyData.hwid === hwid) {
            return res.json({
                success: true,
                message: 'Valid key (HWID matches)',
                isNewActivation: false
            });
        }
        return res.json({
            success: false,
            message: 'Key already registered to different hardware'
        });
    }

    keys[keyIndex].hwid = hwid;
    keys[keyIndex].activatedAt = new Date().toISOString();
    fs.writeFileSync(keysFile, JSON.stringify(keys, null, 2));

    res.json({
        success: true,
        message: 'Key activated with this hardware',
        isNewActivation: true
    });
});

// ❌ Don't use app.listen() on Vercel!
// ✅ Export the app instead
module.exports = app;
