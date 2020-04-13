const fs = require('fs');

module.exports = {
    credentials: {
        key: fs.readFileSync('./ssl/key.pem'),
        cert: fs.readFileSync('./ssl/certificate.pem')
    }
};
