const CACHE_NAME = "moddakr-cache-v3";
const OFFLINE_CACHE = "moddakr-offline-v3";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://cdn.tailwindcss.com"
];

const OFFLINE_FALLBACK_PAGE = "./index.html";

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("[SW] Skip waiting");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Installation failed:", error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[SW] Claiming clients");
        return self.clients.claim();
      })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip chrome extensions
  if (event.request.url.startsWith("chrome-extension://")) {
    return;
  }

  // 👇👇👇 بداية الكود الجديد الذي أضفناه 👇👇👇
  // استثناء روابط اليوتيوب والروابط غير الصحيحة من التخزين
  if (event.request.url.includes('youtube.com') || 
      event.request.url.includes('youtu.be') || 
      !event.request.url.startsWith('http')) {
      return; // توقف هنا ولا تكمل، دع الرابط يعمل بالإنترنت العادي
  }
  // 👆👆👆 نهاية الكود الجديد 👆👆👆

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseToCache = response.clone();
        // Only cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log("[SW] Serving from cache:", event.request.url);
              return cachedResponse;
            }
            // If not in cache and it's a navigation request, return offline page
            if (event.request.mode === "navigate") {
              return caches.match(OFFLINE_FALLBACK_PAGE);
            }
            // Return a basic offline response
            return new Response("Offline - content not available", {
              status: 503,
              statusText: "Service Unavailable",
              headers: new Headers({
                "Content-Type": "text/plain"
              })
            });
          });
      })
  );
});

// Background sync for pending data
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag);
  if (event.tag === "sync-moddakr-data") {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  try {
    // Get pending sync data from IndexedDB or localStorage
    const pendingData = await getPendingSync();
    if (pendingData && pendingData.length > 0) {
      console.log("[SW] Syncing pending data:", pendingData.length, "items");
      // Simulate sync process
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Clear pending sync after successful sync
      await clearPendingSync();
      // Notify all clients about successful sync
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: "SYNC_COMPLETE",
          message: "Data synced successfully"
        });
      });
    }
  } catch (error) {
    console.error("[SW] Sync failed:", error);
  }
}

async function getPendingSync() {
  // This would typically read from IndexedDB
  // For now, return empty array as placeholder
  return [];
}

async function clearPendingSync() {
  // This would typically clear IndexedDB
  console.log("[SW] Pending sync cleared");
}

// Push notification support
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");
  const options = {
    body: event.data ? event.data.text() : "لديك مراجعة جديدة!",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='20' fill='%23081c15'/%3E%3Ctext x='96' y='125' font-size='100' text-anchor='middle' fill='%2363f163'%3E💡%3C/text%3E%3C/svg%3E",
    badge: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='10' fill='%23081c15'/%3E%3Ctext x='48' y='62' font-size='40' text-anchor='middle' fill='%2363f163'%3E💡%3C/text%3E%3C/svg%3E",
    vibrate: [200, 100, 200],
    tag: "moddakr-notification",
    requireInteraction: false
  };
  event.waitUntil(
    self.registration.showNotification("مُدَّكِر", options)
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");
  event.notification.close();
  event.waitUntil(
    clients.openWindow("./")
  );
});

console.log("[SW] Service worker script loaded");
