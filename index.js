const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Define the directory where ISO games are stored
const ISO_DIRECTORY = path.join(__dirname, 'iso');

// Set up multer for handling file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, ISO_DIRECTORY);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Array to store banned IPs
let bannedIPs = [];
// Array to store accessed IPs
let accessedIPs = [];

app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Middleware to check if IP is banned
const checkBannedIP = (req, res, next) => {
    const clientIP = req.ip;
    accessedIPs.push(clientIP); // Log accessed IP
    if (bannedIPs.includes(clientIP)) {
        return res.status(403).send('You are banned from accessing this site!');
    }
    next();
};

// Admin credentials
const adminCredentials = {
    users: { 'admin': 'password' },
    challenge: true
};

// Admin page
app.get('/admin', basicAuth(adminCredentials), (req, res) => {
    res.render('admin', { accessedIPs });
});

// Ban IP
app.post('/ban', basicAuth(adminCredentials), (req, res) => {
    const ip = req.body.ip;
    if (!bannedIPs.includes(ip)) {
        bannedIPs.push(ip);
        res.send(`IP ${ip} banned successfully.`);
    } else {
        res.send(`IP ${ip} is already banned.`);
    }
});

// Unban IP
app.post('/unban', basicAuth(adminCredentials), (req, res) => {
    const ip = req.body.ip;
    if (bannedIPs.includes(ip)) {
        bannedIPs = bannedIPs.filter(bannedIP => bannedIP !== ip);
        res.send(`IP ${ip} unbanned successfully.`);
    } else {
        res.send(`IP ${ip} is not currently banned.`);
    }
});

// Index page
app.get('/', checkBannedIP, (req, res) => {
    // Get a list of all ISO files in the directory
    fs.readdir(ISO_DIRECTORY, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.render('index', { isoFiles: files });
    });
});

// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Download ISO file
app.get('/download', (req, res) => {
    const filename = req.query.filename;
    const filePath = path.join(ISO_DIRECTORY, filename);
    res.download(filePath, filename, (err) => {
        if (err) {
            console.error('Error downloading file:', err);
            res.status(500).send('Internal Server Error');
        }
    });
});
