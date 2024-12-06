const videoElement = document.querySelector('#video');

const remoteVideosElement = document.querySelector('section');

const peerConnections = [];

let localStream = null;

const socket = new WebSocket(`//webrtc-happy-chimpunk-62.deno.dev`);

getUserMedia().then(stream => {
    videoElement.srcObject = stream;
});

socket.onmessage = ev => {
    try {
        const data = JSON.parse(ev.data);

        switch (data.type) {
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
    } catch (error) {
        console.error(error);
    }
};

function getUserMedia() {
    if (localStream) {
        return Promise.resolve(localStream);
    }

    return navigator.mediaDevices.getUserMedia({video: true, audio: true}).then(stream => {
        localStream = stream;

        return stream;
    });
}

function createPeerConnection(id) {
    const peerConnection = new RTCPeerConnection();
    peerConnections.push({id, connection: peerConnection});

    const remoteVideo = document.createElement('video');
    remoteVideo.autoplay = true;
    remoteVideo.controls = true;
    remoteVideo.setAttribute('data-client', id);

    peerConnection.ontrack = ev => {
        const stream = ev.streams[0];

        if (remoteVideo.srcObject === stream) {
            return;
        }

        remoteVideo.srcObject = stream;

        if (queryRemoteVideoElement(id)) {
            return;
        }

        remoteVideosElement.appendChild(remoteVideo);

        updateRemoteVideosGridMultiplier();
    };

    peerConnection.onicecandidate = ev => {
        sendMessage({
            type: 'IceCandidate', context: {to: id, data: ev.candidate}
        })
    };

    return peerConnection;
}

function sendMessage(data) {
    socket.send(JSON.stringify(data));
}

function onClients(clients) {
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
                    type: 'Offer', context: {data: offer, to: client}
                });
            });
        });
    });
}

function onIceCandidate(event) {
    const peerConnection = peerConnections.find(connection => connection.id === event.from);

    return peerConnection?.connection.addIceCandidate(event.data);
}

function onAnswer(event) {
    const peerConnection = peerConnections.find(connection => connection.id === event.from);

    return peerConnection?.connection.setRemoteDescription(event.data);
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
                type: 'Answer', context: {data: answer, to: event.from}
            });
        });
    });
}

function onClientDisconnected(client) {
    const peerConnectionIndex = peerConnections.findIndex(peerConnection => peerConnection.id === client);

    if (peerConnectionIndex < 0) {
        return;
    }

    peerConnections[peerConnectionIndex]?.connection.close();

    peerConnections.splice(peerConnectionIndex, 1);

    queryRemoteVideoElement(client)?.remove();

    updateRemoteVideosGridMultiplier();
}

function queryRemoteVideoElement(client) {
    return document.querySelector(`[data-client=\'${client}\']`);
}

function updateRemoteVideosGridMultiplier() {
    const remoteVideosLengthSqrt = Math.sqrt(remoteVideosElement.children.length);

    const gridMultiplier = remoteVideosLengthSqrt % 1 > 0 ? Math.ceil(remoteVideosLengthSqrt) : remoteVideosLengthSqrt;

    remoteVideosElement.style.setProperty("--grid-multiplier", gridMultiplier.toString(10));
}
