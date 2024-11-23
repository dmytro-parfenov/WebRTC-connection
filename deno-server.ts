type Client = {
    readonly id: string;
    readonly socket: WebSocket;
};

const clients = new Set<Client>();

const broadcast = (...args: Parameters<WebSocket["send"]>) =>
    clients.forEach(({ socket }) => socket.send(...args));

Deno.serve({
    port: 8080,
    handler: (req) => {
        if (req.headers.get("upgrade") !== "websocket") {
            return new Response("Only WebSocket connection supported", {
                status: 501,
            });
        }

        const { socket, response } = Deno.upgradeWebSocket(req);

        const client = { id: crypto.randomUUID(), socket };

        socket.addEventListener("open", () => {
            broadcast(JSON.stringify({
                type: "ClientConnected",
                context: client.id,
            }));

            const clientIds = Array.from(clients).map(({ id }) => id);

            socket.send(JSON.stringify({
                type: "Clients",
                context: clientIds,
            }));

            clients.add(client);
        });

        socket.addEventListener("close", () => {
            clients.delete(client);

            broadcast(JSON.stringify({
                type: "ClientDisconnected",
                context: client.id,
            }));
        });

        socket.addEventListener(
            "message",
            (event) => {
                try {
                    const data = JSON.parse(event.data) as {
                        context: { to: string };
                    };

                    const receiver = clients.values().find((
                        { id: receiverId },
                    ) => receiverId === data.context.to);

                    receiver?.socket.send(JSON.stringify({
                        ...data,
                        context: {
                            ...data.context,
                            from: client.id,
                        },
                    }));
                } catch (error) {
                    console.error(error);
                }
            },
        );

        return response;
    },
});
