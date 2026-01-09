import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import { createBareServer } from "@tomphttp/bare-server-node";
import profilesPlugin from "../profiles/server.js";
import dotenv from "dotenv";
import fetch from "node-fetch";
import rateLimit from "@fastify/rate-limit";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootPath = join(__dirname, "..");
const publicPath = join(rootPath, "public");
const profilesPublicPath = join(__dirname, "../profiles/public");
const scramjetPath = join(__dirname, "../scramjet");
const uvPath = join(__dirname, "../uv");
const epoxyPath = join(__dirname, "../node_modules/@mercuryworkshop/epoxy-transport/dist");
const baremuxPath = join(__dirname, "../node_modules/@mercuryworkshop/bare-mux/dist");

wisp.options.allow_udp_streams = false;
wisp.options.dns_servers = ["1.1.1.1", "8.8.8.8"];

const bare = createBareServer("/history/");

const fastify = Fastify({
  serverFactory: (handler) => {
    return createServer()
      .on("request", (req, res) => {
        if (bare.shouldRoute(req)) {
          bare.routeRequest(req, res);
        } else {
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
          handler(req, res);
        }
      })
      .on("upgrade", (req, socket, head) => {
        if (bare.shouldRoute(req)) bare.routeUpgrade(req, socket, head);
        else if (req.url?.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
      });
  },
});

await fastify.register(rateLimit, {
  max: 200,
  timeWindow: "1 minute",
  cache: 5000,
  allowList: ["127.0.0.1", "localhost"],
  errorResponseBuilder: (req, context) => ({
    success: false,
    error: "Too many requests, please try again later."
  }),
  skipOnError: true
});

fastify.addHook("onSend", async (req, reply, payload) => {
  reply.removeHeader("X-Frame-Options");
  reply.removeHeader("Content-Security-Policy");
  return payload;
});

const swHeader = (res, path) => {
  if (path.endsWith("sw.js") || path.endsWith("worker.js")) {
    res.setHeader("Service-Worker-Allowed", "/");
  }
};

fastify.register(fastifyStatic, { root: scramjetPath, prefix: "/science/", decorateReply: false, setHeaders: swHeader });
fastify.register(fastifyStatic, { root: uvPath, prefix: "/english/", decorateReply: false, setHeaders: swHeader });
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false });
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false });
fastify.register(profilesPlugin, { prefix: "/profiles" });

fastify.post("/math/feedback", async (request, reply) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK;

  if (!webhookUrl) {
    return reply.code(500).send({ success: false, error: "Feedback service not configured" });
  }

  const { message, username, feedbackType } = request.body || {};

  if (!message || message.trim().length === 0) {
    return reply.code(400).send({ success: false, error: "Message is required" });
  }

  if (message.length > 2000) {
    return reply.code(400).send({ success: false, error: "Message too long (max 2000 characters)" });
  }

  const embed = {
    title: `📬 New Feedback${feedbackType ? ` - ${feedbackType}` : ""}`,
    description: message.trim(),
    color: feedbackType === "Bug Report" ? 0xef4444 : feedbackType === "Feature Request" ? 0x60a5fa : 0x10b981,
    fields: [],
    timestamp: new Date().toISOString()
  };

  if (username) {
    embed.fields.push({ name: "User", value: username, inline: true });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
      throw new Error("Discord API error");
    }

    return reply.send({ success: true, message: "Feedback sent successfully!" });
  } catch (error) {
    console.error("[Feedback] Failed to send:", error);
    return reply.code(500).send({ success: false, error: "Failed to send feedback" });
  }
});

fastify.get("/math/weather", async (request, reply) => {
  try {
    const res = await fetch('https://wttr.in/?format=%C+%t');
    if (!res.ok) throw new Error('wttr.in failed');
    const text = await res.text();
    return { success: true, text: text.trim() };
  } catch (error) {
    try {
      const res = await fetch('https://wttr.in/?format=j1');
      const data = await res.json();
      return { success: true, data };
    } catch (e) {
      return reply.code(500).send({ success: false, error: "Failed to fetch weather" });
    }
  }
});

fastify.register(fastifyStatic, { root: publicPath, prefix: "/", decorateReply: true, setHeaders: swHeader });

fastify.setNotFoundHandler((req, reply) => {
  if (req.raw.url.startsWith("/profiles") && !req.raw.url.includes(".")) {
    return reply.sendFile("index.html", profilesPublicPath);
  }
  reply.code(404).sendFile("404.html", rootPath);
});

const port = Number(process.env.PORT || "1100") || 1100;
fastify.listen({ port, host: "0.0.0.0" }).then(() => {
  console.log(`lightlink is running on  http://localhost:${port}. not the correct port? configure it in src/index.js`);
});