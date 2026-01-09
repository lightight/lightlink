importScripts('/baremux/index.js');
importScripts('/epoxy/index.js');
importScripts('/sj.config.js');

const dbReady = new Promise((resolve, reject) => {
  const req = indexedDB.open("$scramjet", 1);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    const stores = ["config", "cookies", "redirectTrackers", "referrerPolicies", "publicSuffixList"];
    for (const store of stores) {
      if (!db.objectStoreNames.contains(store)) {
        db.createObjectStore(store);
      }
    }
  };
  req.onsuccess = (e) => {
    const db = e.target.result;
    if (typeof self.__scramjet$config !== 'undefined') {
      const tx = db.transaction(["config"], "readwrite");
      const store = tx.objectStore("config");
      store.put(self.__scramjet$config, "config");
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    } else {
      db.close();
      resolve();
    }
  };
  req.onerror = () => resolve();
});

importScripts('/science/scramjet.all.js');

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

let configReady = (async () => {
  await dbReady;
  try {
    await scramjet.loadConfig();
  } catch (e) {
    console.error("loadConfig failed:", e);
  }
})();

(async () => {
  try {
    const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
    await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    console.log("BareMux transport set");
  } catch (e) {
    console.error("BareMux error:", e);
  }
})();

async function handleRequest(event) {
  if (event.request.url.includes('/science/s/')) {
    const url = new URL(event.request.url);
    const prefix = '/science/s/';
    const prefixIndex = url.pathname.indexOf(prefix);

    if (prefixIndex !== -1) {
      const encodedPath = url.pathname.substring(prefixIndex + prefix.length);

      let decodedPath;
      try {
        decodedPath = decodeURIComponent(encodedPath);
      } catch (e) {
        decodedPath = encodedPath;
      }

      if (!decodedPath.startsWith('http://') && !decodedPath.startsWith('https://')) {
        console.log("[SW] Non-proxied path detected, fetching locally:", encodedPath);
        try {
          return await fetch('/' + encodedPath.replace(/^\/+/, ''));
        } catch (e) {
          return new Response('Not Found', { status: 404 });
        }
      }
    }

    await configReady;

    if (!scramjet.config || !scramjet.config.prefix) {
      console.warn("[SW] Scramjet config/prefix missing after init");
      return new Response('Proxy not ready', { status: 503 });
    }

    try {
      console.log("[SW] Processing Scramjet request:", {
        url: event.request.url,
        prefix: scramjet.config.prefix
      });
      const routeResult = await scramjet.route(event);
      const fetchResult = await scramjet.fetch(event);
      return routeResult && fetchResult;
    } catch (e) {
      console.error("Scramjet fetch error", e);
      return new Response('Proxy Error: ' + e.message, { status: 502 });
    }
  }
  try {
    return await fetch(event.request);
  } catch (e) {
    console.warn("[SW] Fetch failed for:", event.request.url, e.message);
    return new Response('Network Error', { status: 502 });
  }
}

self.addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event));
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

