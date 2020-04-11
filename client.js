const express = require('express');
const path = require('path');
const https = require('https');
const fs = require('fs');

const PORT_HTTP = 3000;
const PORT_HTTPS = 3001;
const credentials = {
    key: fs.readFileSync('./ssl/key.pem'),
    cert: fs.readFileSync('./ssl/certificate.pem')
};

const appHttps = express();

appHttps.use(express.static(path.join(__dirname)));

appHttps.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

const serverHttps = https.createServer(credentials, appHttps);

serverHttps.listen(PORT_HTTPS);

var appHttp = express();

appHttp.get('*', function(req, res) {
    res.redirect(`https://${req.hostname}:${PORT_HTTPS}`);
});

appHttp.listen(PORT_HTTP);
