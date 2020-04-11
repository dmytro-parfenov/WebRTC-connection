const myVideo = document.querySelector('#my-video');
const remoteVideosSection = document.querySelector('section');

const peerConnections = [];
let localStream = null;

const socket = new WebSocket('ws://localhost:8080');

getUserMedia().then(stream => {
    myVideo.srcObject = stream;
});

socket.onmessage = ev => {
    if (typeof ev.data !== "string") {
        return;
    }

    const data = JSON.parse(ev.data);
    console.log(data);

    switch (data.type) {
        case 'ClientConnected':
            return onClientConnected(data.context);
        case 'ClientDisconnected':
            return onClientDisconnected(data.context);
        case 'Offer':
            return onOffer(data.context);
        case 'Answer':
            return onAnswer(data.context);
        case 'IceCandidate':
            return onIceCandidate(data.context);
        case 'Clients':
            return onClients(data.context);
    }
};

function getUserMedia() {
    if (localStream) {
        return Promise.resolve(localStream);
    }

    return navigator.mediaDevices.getUserMedia({video: true, audio: false}).then(stream => {
        localStream = stream;
        return stream;
    });
}

function createPeerConnection(id) {
    const peerConnection = new RTCPeerConnection();
    peerConnections.push({id, connection: peerConnection});

    peerConnection.ontrack = ev => {
        if (!ev.streams.length) {
            return;
        }

        const remoteVideo = document.createElement('video');

        remoteVideo.autoplay = true;
        remoteVideo.srcObject = ev.streams[0];
        remoteVideo.setAttribute('data-client', id);

        remoteVideosSection.appendChild(remoteVideo);
    };

    peerConnection.onicecandidate = ev => {
        sendMessage({
            type: 'IceCandidate',
            context: {to: id, data: ev.candidate}
        })
    };

    return peerConnection;
}

function sendMessage(data) {
    socket.send(JSON.stringify(data));
}

function onClients(clients) {
    if (!clients.length) {
        return;
    }

    getUserMedia().then(stream => {
        clients.forEach(client => {
            const peerConnection = createPeerConnection(client);

            stream.getTracks().forEach(track => {
                peerConnection.addTrack(track, stream);
            });

            peerConnection.createOffer({offerToReceiveVideo: true, offerToReceiveAudio: true}).then(offer => {
                return peerConnection.setLocalDescription(new RTCSessionDescription(offer)).then(() => offer);
            }).then(offer => {
                sendMessage({
                    type: 'Offer',
                    context: {data: offer, to: client}
                });
            });
        });
    });
}

function onIceCandidate(event) {
    if (!event.data) {
        return;
    }

    const peerConnection = peerConnections.find(connection => connection.id === event.from);

    if (!peerConnection) {
        return;
    }

    return peerConnection.connection.addIceCandidate(event.data);
}

function onAnswer(event) {
    const peerConnection = peerConnections.find(connection => connection.id === event.from);

    if (!peerConnection) {
        return;
    }

    return peerConnection.connection.setRemoteDescription(event.data);
}

function onOffer(event) {
    getUserMedia().then(stream => {
        const peerConnection = createPeerConnection(event.from);

        stream.getTracks().forEach(track => {
            peerConnection.addTrack(track, stream);
        });

        peerConnection.setRemoteDescription(event.data).then(() => {
            return peerConnection.createAnswer();
        }).then(answer => {
            return peerConnection.setLocalDescription(answer).then(() => answer)
        }).then(answer => {
            sendMessage({
                type: 'Answer',
                context: {data: answer, to: event.from}
            });
        });
    });
}

function onClientConnected(client) {
    /*getUserMedia().then(stream => {
        const peerConnection = createPeerConnection(client);

        stream.getTracks().forEach(track => {
            peerConnection.addTrack(track, stream);
        });

        peerConnection.createOffer({offerToReceiveVideo: true, offerToReceiveAudio: true}).then(offer => {
            return peerConnection.setLocalDescription(new RTCSessionDescription(offer)).then(() => offer);
        }).then(offer => {
            sendMessage({
                type: 'Offer',
                context: {data: offer, to: client}
            });
        });
    });*/
}

function onClientDisconnected(client) {
    const indexOf = peerConnections.findIndex(peerConnection => peerConnection.id === client);
    const element = document.querySelector(`[data-client=\'${client}\']`);

    if (indexOf >= 0) {
        peerConnections[indexOf].connection.close();
        peerConnections.splice(indexOf, 1);
    }

    if (element) {
        element.remove();
    }
}
