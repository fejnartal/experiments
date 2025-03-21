const CACHE_KEY = "notificaciones-cache";
const INTERVALO_MS = 20 * 60 * 1000; // 20 minutos

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("message", async (event) => {
    if (event.data.action === "start") {
        await obtenerMensajes();
        programarNotificaciones();
    }
});

async function obtenerMensajes() {
    try {
        let res = await fetch("https://api.quotable.io/quotes?limit=5");
        let datos = await res.json();
        let mensajes = datos.results.map(q => q.content);
        await caches.open(CACHE_KEY).then(cache => cache.put("mensajes", new Response(JSON.stringify(mensajes))));
    } catch (err) {
        console.error("Error obteniendo mensajes:", err);
    }
}

async function obtenerMensajeGuardado() {
    let cache = await caches.open(CACHE_KEY);
    let respuesta = await cache.match("mensajes");
    if (respuesta) {
        let mensajes = await respuesta.json();
        if (mensajes.length > 0) {
            let mensaje = mensajes.shift();
            await cache.put("mensajes", new Response(JSON.stringify(mensajes)));
            return mensaje;
        }
    }
    return "No hay mensajes guardados.";
}

function programarNotificaciones() {
    setInterval(async () => {
        let mensaje = await obtenerMensajeGuardado();
        self.registration.showNotification("Notificación", { body: mensaje });
    }, INTERVALO_MS);
}
