self.addEventListener("install", (event) => {
  self.skipWaiting();
  console.log("Service Worker instalado.");
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  console.log("Service Worker activado.");
});

self.addEventListener("push", (event) => {
  const data = event.data.json();
  console.log("Notificación Push recibida", data);

  const options = {
    body: data.body,
    icon: "icon.png",
    badge: "badge.png"
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Función para enviar una notificación
function sendNotification(message) {
  self.registration.showNotification(message.title, {
    body: message.body,
    icon: "icon.png",
    badge: "badge.png",
  });
  console.log(`Notificación enviada: ${message.body}`);
}

// Función para ejecutar el ciclo de verificación
function startNotificationCycle() {
  const interval = 5000; // Verificar cada 5 segundos
  setInterval(() => {
    // Recuperar el último timestamp de la notificación
    const lastNotificationTime = localStorage.getItem("lastNotificationTime");

    // Si no ha pasado el tiempo suficiente desde la última notificación (por ejemplo, 60 segundos)
    const currentTime = Date.now();
    if (!lastNotificationTime || (currentTime - lastNotificationTime) > 60000) { // 60 segundos
      // Si es hora de enviar la notificación, mostrarla
      const message = {
        title: "Curiosidad",
        body: "Esto es un mensaje de ejemplo.",
      };

      sendNotification(message);

      // Guardar el timestamp de la última notificación
      localStorage.setItem("lastNotificationTime", currentTime);
    }
  }, interval); // Cada 5 segundos
}

// Iniciar el ciclo de notificaciones
startNotificationCycle();
