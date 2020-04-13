const express = require('express');
const path = require('path');
const https = require('https');
const ssl = require('./ssl');

const PORT = 3000;

const app = express();

app.use(express.static(path.join(__dirname)));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

const server = https.createServer(ssl.credentials, app);

server.listen(PORT, () => {
    console.log(`Client is listening on https://localhost:${PORT}`);
});
