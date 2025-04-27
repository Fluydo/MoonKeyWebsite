const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

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
    
    // Validate key format
    if (!/^Moon-[A-Z0-9]{8}$/.test(key)) {
        return res.status(400).json({ error: 'Invalid key format' });
    }
    
    // Check if key already exists
    if (keys.some(k => k.key === key)) {
        return res.status(400).json({ error: 'Key already exists' });
    }
    
    // Add new key
    keys.push({ key, date, status });
    
    // Save to file
    fs.writeFileSync(keysFile, JSON.stringify(keys, null, 2));
    
    res.json({ success: true });
});

app.post('/api/validate', (req, res) => {
    const { key, hwid } = req.body;
    
    // Find the key
    const keyIndex = keys.findIndex(k => k.key === key);
    if (keyIndex === -1) {
        return res.json({ success: false, message: 'Key not found' });
    }
    
    const keyData = keys[keyIndex];
    
    // Check if key is active
    if (keyData.status !== 'active') {
        return res.json({ success: false, message: 'Key is not active' });
    }
    
    // HWID checks
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
    
    // Register HWID if none exists
    keys[keyIndex].hwid = hwid;
    keys[keyIndex].activatedAt = new Date().toISOString();
    fs.writeFileSync(keysFile, JSON.stringify(keys, null, 2));
    
    res.json({ 
        success: true, 
        message: 'Key activated with this hardware', 
        isNewActivation: true 
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Endpoints:
    - GET /             : Key generator page
    - GET /key-list     : View all keys (JSON)
    - POST /save-key    : Save new key
    - POST /api/validate: Validate key with HWID`);
});