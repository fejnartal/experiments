const CACHE_KEY = "notificaciones-cache";
let programandoNotificacion = false;

self.addEventListener("install", event => {
    self.skipWaiting();
    logMessage("Service Worker instalado.");
});

self.addEventListener("activate", event => {
    event.waitUntil(self.clients.claim());
    logMessage("Service Worker activado.");
});

self.addEventListener("message", async (event) => {
    if (event.data.action === "start") {
        logMessage("Activando notificaciones automáticas.");
        await verificarYObtenerMensajes();
        programarSiguienteNotificacion();
    } else if (event.data.action === "stop") {
        programandoNotificacion = false;
        await caches.delete(CACHE_KEY);
        logMessage("Notificaciones detenidas y caché eliminada.");
    }
});

async function verificarYObtenerMensajes() {
    let cache = await caches.open(CACHE_KEY);
    let respuesta = await cache.match("mensajes");

    if (!respuesta || (await respuesta.json()).length === 0) {
        await obtenerMensajes();
    }
}

async function obtenerMensajes() {
    try {
        logMessage("Solicitando nuevos mensajes...");
        let mensajes = [];

        for (let i = 0; i < 5; i++) {
            let res = await fetch("https://uselessfacts.jsph.pl/random.json?language=en");
            let dato = await res.json();
            mensajes.push(dato.text);
        }

        let cache = await caches.open(CACHE_KEY);
        await cache.put("mensajes", new Response(JSON.stringify(mensajes)));

        logMessage("Mensajes obtenidos y guardados en caché.");
    } catch (err) {
        logMessage("Error obteniendo mensajes: " + err);
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

            if (mensajes.length === 0) {
                logMessage("No quedan mensajes en caché. Solicitando más...");
                obtenerMensajes();
            }

            return mensaje;
        }
    }

    return "No hay mensajes guardados.";
}

async function enviarNotificacion() {
    let mensaje = await obtenerMensajeGuardado();
    self.registration.showNotification("Curiosidad", { body: mensaje });
    logMessage("Notificación enviada: " + mensaje);

    // Programar la siguiente notificación en 1 minuto
    if (programandoNotificacion) {
        setTimeout(() => enviarNotificacion(), 60 * 1000);
    }
}

function programarSiguienteNotificacion() {
    if (!programandoNotificacion) {
        programandoNotificacion = true;
        logMessage("Iniciando notificaciones periódicas.");
        enviarNotificacion();
    }
}

function logMessage(message) {
    let timestamp = new Date().toLocaleTimeString();
    let fullMessage = `[${timestamp}] ${message}`;
    self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ log: fullMessage }));
    });
    console.log(fullMessage);
}
