const express = require('express');
const path = require('path');
const https = require('https');
const fs = require('fs');

const PORT = 3000;
const credentials = {
    key: fs.readFileSync('./ssl/key.pem'),
    cert: fs.readFileSync('./ssl/certificate.pem')
};

const app = express();

app.use(express.static(path.join(__dirname)));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

const server = https.createServer(credentials, app);

server.listen(PORT, () => {
    console.log(`Client is listening on https://localhost:${PORT}`);
});
