const CACHE_KEY = "notificaciones-cache";
const LOGS_KEY = "logs";
const INTERVALO_MS = 60 * 1000; // 1 minuto para pruebas rápidas
let notificacionesActivas = true;

self.addEventListener("install", () => {
    self.skipWaiting();
    logMessage("Service Worker instalado.");
});

self.addEventListener("activate", event => {
    event.waitUntil(self.clients.claim());
    logMessage("Service Worker activado.");
});

self.addEventListener("message", async (event) => {
    if (event.data.action === "start") {
        notificacionesActivas = true;
        logMessage("Inicio de notificaciones.");
        await obtenerMensajes();
        programarNotificaciones();
    } else if (event.data.action === "stop") {
        notificacionesActivas = false;
        await caches.delete(CACHE_KEY);
        logMessage("Notificaciones detenidas y caché eliminada.");
    }
});

async function obtenerMensajes() {
    try {
        let res = await fetch("https://api.quotable.io/quotes?limit=5");
        let datos = await res.json();
        let mensajes = datos.results.map(q => q.content);
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
            return mensaje;
        }
    }
    return "No hay mensajes guardados.";
}

async function programarNotificaciones() {
    if (!notificacionesActivas) {
        logMessage("Las notificaciones están desactivadas. No se programarán más.");
        return;
    }

    let permiso = await Notification.requestPermission();
    if (permiso !== "granted") {
        logMessage("Permiso de notificaciones denegado. Deteniendo.");
        return;
    }

    let mensaje = await obtenerMensajeGuardado();
    self.registration.showNotification("Notificación", { body: mensaje });
    logMessage("Notificación enviada: " + mensaje);

    setTimeout(programarNotificaciones, INTERVALO_MS);
}

function logMessage(message) {
    let timestamp = new Date().toLocaleTimeString();
    let fullMessage = `[${timestamp}] ${message}\n`;

    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({ log: fullMessage });
        });
    });

    self.registration.storage.get(LOGS_KEY).then(existingLogs => {
        let logs = existingLogs || "";
        logs += fullMessage;
        self.registration.storage.set(LOGS_KEY, logs);
    });
}

self.addEventListener("message", (event) => {
    if (event.data.logRequest) {
        self.registration.storage.get(LOGS_KEY).then(logs => {
            event.source.postMessage({ logs: logs || "No hay logs disponibles." });
        });
    }
});
