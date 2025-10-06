const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// CSV file path
const CSV_FILE = path.join(__dirname, 'locations.csv');

// Initialize CSV file
if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, 'ID,Device,Latitude,Longitude,Accuracy,Timestamp,UserAgent,CreatedAt\n');
    console.log('📁 Created CSV file');
}

// Helper function to detect device
function getDeviceInfo(userAgent) {
    if (!userAgent) return 'Unknown Device';
    if (/mobile/i.test(userAgent)) return 'Mobile';
    if (/tablet/i.test(userAgent)) return 'Tablet';
    if (/android/i.test(userAgent)) return 'Android';
    if (/iphone|ipod/i.test(userAgent)) return 'iPhone';
    if (/ipad/i.test(userAgent)) return 'iPad';
    if (/windows/i.test(userAgent)) return 'Windows PC';
    if (/mac/i.test(userAgent)) return 'Mac';
    if (/linux/i.test(userAgent)) return 'Linux';
    return 'Desktop';
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/map', (req, res) => {
    res.sendFile(path.join(__dirname, 'map.html'));
});

// Store location
app.post('/api/locations', (req, res) => {
    try {
        const { latitude, longitude, accuracy, timestamp, userAgent } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'Latitude and longitude required' });
        }

        const locationData = {
            id: 'loc_' + Math.random().toString(36).substring(2, 9),
            device: getDeviceInfo(userAgent),
            latitude: parseFloat(latitude).toFixed(6),
            longitude: parseFloat(longitude).toFixed(6),
            accuracy: accuracy || 0,
            timestamp: timestamp || new Date().toISOString(),
            userAgent: userAgent || '',
            createdAt: new Date().toISOString()
        };

        // Save to CSV
        const csvRow = [
            locationData.id,
            `"${locationData.device}"`,
            locationData.latitude,
            locationData.longitude,
            locationData.accuracy,
            `"${locationData.timestamp}"`,
            `"${locationData.userAgent.replace(/"/g, '""')}"`,
            `"${locationData.createdAt}"`
        ].join(',') + '\n';
        
        fs.appendFileSync(CSV_FILE, csvRow);

        res.json({
            success: true,
            message: 'Location shared!',
            data: locationData
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get all locations
app.get('/api/locations', (req, res) => {
    try {
        if (!fs.existsSync(CSV_FILE)) {
            return res.json({ success: true, data: [], count: 0 });
        }

        const csvData = fs.readFileSync(CSV_FILE, 'utf8');
        const lines = csvData.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const locations = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
            if (values.length === headers.length) {
                const location = {};
                headers.forEach((header, index) => {
                    location[header] = values[index];
                });
                locations.push(location);
            }
        }

        res.json({
            success: true,
            data: locations.reverse(),
            count: locations.length
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error reading data' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running on Render!',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Location Tracker running on port ${PORT}`);
    console.log(`📍 Share: https://your-app.onrender.com`);
    console.log(`🗺️  Map: https://your-app.onrender.com/map`);
});
