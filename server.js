const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// CSV file path
const CSV_FILE = path.join(__dirname, 'data', 'locations.csv');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(CSV_FILE))) {
    fs.mkdirSync(path.dirname(CSV_FILE), { recursive: true });
}

// Initialize CSV file with headers if it doesn't exist
function initializeCSV() {
    if (!fs.existsSync(CSV_FILE)) {
        const headers = 'ID,Device,Latitude,Longitude,Accuracy,Timestamp,UserAgent,CreatedAt\n';
        fs.writeFileSync(CSV_FILE, headers);
        console.log('📁 Created new CSV file with headers');
    }
}

// Store location in CSV
function saveToCSV(locationData) {
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
    console.log('💾 Saved to CSV from device:', locationData.device);
}

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Store location endpoint
app.post('/api/locations', (req, res) => {
    try {
        console.log('📍 Received location data:', req.body);
        
        const { latitude, longitude, accuracy, timestamp, userAgent } = req.body;

        // Validate required fields
        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        // Create location object with device info
        const locationData = {
            id: 'loc_' + Math.random().toString(36).substr(2, 9),
            device: getDeviceInfo(userAgent),
            latitude: parseFloat(latitude).toFixed(6),
            longitude: parseFloat(longitude).toFixed(6),
            accuracy: accuracy || 0,
            timestamp: timestamp || new Date().toISOString(),
            userAgent: userAgent || '',
            createdAt: new Date().toISOString()
        };

        // Save to CSV
        saveToCSV(locationData);

        console.log('✅ Location stored from device:', locationData.device);

        res.status(201).json({
            success: true,
            message: 'Location stored successfully',
            data: locationData
        });

    } catch (error) {
        console.error('❌ Error storing location:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to store location data',
            error: error.message
        });
    }
});

// Get all locations from CSV
app.get('/api/locations', (req, res) => {
    try {
        if (!fs.existsSync(CSV_FILE)) {
            return res.json({
                success: true,
                data: [],
                count: 0
            });
        }

        const csvData = fs.readFileSync(CSV_FILE, 'utf8');
        const lines = csvData.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const locations = [];

        // Skip header row and process data
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
            data: locations,
            count: locations.length
        });

    } catch (error) {
        console.error('Error reading CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to read locations',
            error: error.message
        });
    }
});

// Get locations map page
app.get('/map', (req, res) => {
    res.sendFile(path.join(__dirname, 'map.html'));
});

// Helper function to get device info
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

// Initialize CSV file when server starts
initializeCSV();

// Start server
app.listen(PORT, () => {
    console.log(`📍 Location Server running on port ${PORT}`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    console.log(`🗺️ Map View: http://localhost:${PORT}/map`);
    console.log(`💾 Storage: ${CSV_FILE}`);
});