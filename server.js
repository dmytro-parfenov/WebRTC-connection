const ws = require('ws');
const uuid = require('uuid');

const PORT = 8080;

const wss = new ws.Server({ port: PORT });

wss.on('connection', socket => {
    const id = uuid.v4();

    socket.id = id;

    onClientConnectionChange('ClientConnected');

    const clients = Array.from(wss.clients)
        .filter(client => client !== socket)
        .map(client => client.id);

    sendTo(id, {
        type: 'Clients',
        context: clients
    });

    socket.onclose = () => {
        onClientConnectionChange('ClientDisconnected');
    };

    socket.onmessage = event => {
        if (typeof event.data !== "string") {
            return;
        }

        const data = JSON.parse(event.data);
        console.log(data);

        switch (data.type) {
            case 'Offer':
            case 'Answer':
            case 'IceCandidate':
                return onMessage(data);
        }
    };

    function onMessage(event) {
        sendTo(event.context.to, {
            type: event.type,
            context: {data: event.context.data, from: id}
        });
    }

    function onClientConnectionChange(type) {
        broadcast({
            type: type,
            context: id
        });
    }

    function sendTo(id, data) {
        wss.clients.forEach(client => {
            if (client.id !== id) {
                return;
            }

            client.send(JSON.stringify(data))
        })
    }

    function broadcast(data) {
        wss.clients.forEach(client => {
            if (!client.OPEN || client === socket) {
                return;
            }

            client.send(JSON.stringify(data));
        })
    }
});



