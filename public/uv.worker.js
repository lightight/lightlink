importScripts('/baremux/index.js');
importScripts('/epoxy/index.js');
importScripts('/english/uv.bundle.js');
importScripts('/uv.config.js');
importScripts('/english/uv.sw.js');

const uv = new UVServiceWorker();
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

(async () => {
    try {
        const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
        await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    } catch (e) { console.error("UV Transport Error", e); }
})();

self.addEventListener('fetch', event => {
    const prefix = self.__uv$config.prefix;
    if (event.request.url.startsWith(location.origin + prefix)) {
        const pathAfterPrefix = event.request.url.substring((location.origin + prefix).length);
        let decodedPath;
        try {
            decodedPath = self.__uv$config.decodeUrl(pathAfterPrefix);
        } catch (e) {
            decodedPath = pathAfterPrefix;
        }

        if (!decodedPath.startsWith('http://') && !decodedPath.startsWith('https://')) {
            console.log("[UV] Non-proxied path detected, fetching locally:", pathAfterPrefix);
            event.respondWith(fetch('/' + pathAfterPrefix.replace(/^\/+/, '')).catch(() =>
                new Response('Not Found', { status: 404 })
            ));
            return;
        }

        event.respondWith(uv.fetch(event));
    }
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));