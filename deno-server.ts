type Client = {
    readonly id: string;
    readonly socket: WebSocket;
};

const clients = new Set<Client>();

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
            const clientIds = Array.from(clients).map(({ id }) => id);

            socket.send(JSON.stringify({
                type: "Clients",
                context: clientIds,
            }));

            clients.add(client);
        });

        socket.addEventListener("close", () => {
            clients.delete(client);

            clients.forEach(({ socket }) =>
                socket.send(JSON.stringify({
                    type: "ClientDisconnected",
                    context: client.id,
                }))
            );
        });

        socket.addEventListener(
            "message",
            (event) => {
                try {
                    const data = JSON.parse(event.data) as {
                        context: { to: string };
                    };

                    const receiver = clients.values().find((
                        { id },
                    ) => id === data.context.to);

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
