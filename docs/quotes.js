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
        programandoNotificacion = true;
        await verificarYObtenerMensajes();
        registrarBackgroundSync();
    } else if (event.data.action === "stop") {
        programandoNotificacion = false;
        await caches.delete(CACHE_KEY);
        logMessage("Notificaciones detenidas y caché eliminada.");
    }
});

// Función para obtener los mensajes y almacenarlos en caché
async function verificarYObtenerMensajes() {
    let cache = await caches.open(CACHE_KEY);
    let respuesta = await cache.match("mensajes");

    if (!respuesta || (await respuesta.json()).length === 0) {
        await obtenerMensajes();
    }
}

// Función para obtener nuevos mensajes de la API
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

// Función para obtener un mensaje guardado desde la caché
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

// Función para enviar la notificación
async function enviarNotificacion() {
    if (!programandoNotificacion) return;

    let mensaje = await obtenerMensajeGuardado();
    self.registration.showNotification("Curiosidad", { body: mensaje });
    logMessage("Notificación enviada: " + mensaje);
}

// Función para registrar el sync en segundo plano
async function registrarBackgroundSync() {
    if ('SyncManager' in self) {
        logMessage("Registrando el Background Sync...");
        try {
            await self.registration.sync.register('notificaciones-sync');
        } catch (err) {
            logMessage("Error registrando Background Sync: " + err);
        }
    } else {
        logMessage("Background Sync no soportado en este navegador.");
    }
}

// Función que maneja el evento de Background Sync
self.addEventListener('sync', event => {
    if (event.tag === 'notificaciones-sync') {
        logMessage("Ejecutando sincronización de notificaciones...");
        enviarNotificacion(); // Enviar notificación
    }
});

function logMessage(message) {
    let timestamp = new Date().toLocaleTimeString();
    let fullMessage = `[${timestamp}] ${message}`;
    self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ log: fullMessage }));
    });
    console.log(fullMessage);
}
