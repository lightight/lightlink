import { Server } from "socket.io";
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";
import { v4 as uuidv4 } from "uuid";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import fastifyStatic from "@fastify/static";
import dotenv from 'dotenv';
import webpush from 'web-push';
import rateLimit from "@fastify/rate-limit";
import fetch from "node-fetch";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
let VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
let VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@lightlink.space'; //change email here
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("getting vapid keys for push notifications");
    const vapidKeys = webpush.generateVAPIDKeys();
    VAPID_PUBLIC_KEY = vapidKeys.publicKey;
    VAPID_PRIVATE_KEY = vapidKeys.privateKey;
    const envPath = join(__dirname, '../.env');
    const envContent = `\nVAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}\nVAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}\nVAPID_EMAIL=mailto:admin@lightlink.space\n`; //and here
    try {
        appendFileSync(envPath, envContent);
        console.log("vapid keys saved to .env");
    } catch (e) {
        console.log("could not save vapid keys. does .env exist in the main directory?");
    }
}
//lots of config ^^^^^^^^^^^^
webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
console.log("push notifications enabled");
const DATA_FILE = join(__dirname, "data.json");
const defaultDB = {
    users: [],
    friendships: {},
    dmHistory: {},
    groups: {},
    lastUsernameChange: {},
    bannedIPs: {},
    pushSubscriptions: {},
    activeWarnings: {},
    announcements: [],
    reports: [],
    publicKeys: {},
    groupCounter: 0
};

let db = { ...defaultDB };

if (existsSync(DATA_FILE)) {
    try {
        const fileData = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
        db = { ...defaultDB, ...fileData };

        if (!Array.isArray(db.users)) db.users = [];
        if (!db.friendships) db.friendships = {};
        if (!db.dmHistory) db.dmHistory = {};
        if (!db.groups) db.groups = {};
        if (!db.lastUsernameChange) db.lastUsernameChange = {};
        if (!db.bannedIPs) db.bannedIPs = {};
        if (!db.pushSubscriptions) db.pushSubscriptions = {};
        if (!db.announcements) db.announcements = [];

        console.log("db loaded");
    } catch (e) {
        console.error("db error. starting new db");
        db = { ...defaultDB };
    }
}
function saveData() {
    try {
        writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
    } catch (e) {
        console.error("error saving db:", e);
    }
}

function getIP(socket) {
    const headers = socket.handshake.headers;
    if (headers['cf-connecting-ip']) return headers['cf-connecting-ip'];
    if (headers['x-real-ip']) return headers['x-real-ip'];
    if (headers['x-forwarded-for']) return headers['x-forwarded-for'].split(',')[0].trim();
    return socket.handshake.address;
}

export default async function profilesPlugin(fastify, opts) {
    const publicDir = join(__dirname, "public");

    fastify.register(fastifyStatic, {
        root: publicDir,
        prefix: "/",
        decorateReply: false,
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


    fastify.post("/math/feedback", async (request, reply) => {
        const { message } = request.body || {};

        if (!message || typeof message !== 'string' || !message.trim()) {
            return reply.code(400).send({ error: "message is required" });
        }

        if (!DISCORD_WEBHOOK_URL) {
            console.error("discord webhook missing in .env. did you follow the readme for correct configuration?");
            return reply.code(500).send({ error: "server config error" });
        }

        try {
            const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: `**New Feedback Report:**\n\`\`\`\n${message}\n\`\`\``
                })
            });

            if (!discordResponse.ok) {
                throw new Error(`webhook returned ${discordResponse.status} ${discordResponse.statusText}`);
            }

            return reply.send({ success: true });

        } catch (err) {
            console.error("feedback failed:", err);
            return reply.code(500).send({ error: "failed to send feedback" });
        }
    });

    fastify.get("/math/check-ban", async (request, reply) => {
        const headers = request.headers;
        let ip = headers['cf-connecting-ip']
            || headers['x-real-ip']
            || (headers['x-forwarded-for'] ? headers['x-forwarded-for'].split(',')[0].trim() : null)
            || request.ip;

        if (db.bannedIPs[ip]) {
            const ban = db.bannedIPs[ip];

            if (ban.expires && Date.now() > ban.expires) {
                delete db.bannedIPs[ip];
                saveData();
                return reply.send({ banned: false });
            }

            return reply.send({
                banned: true,
                reason: ban.reason || "You have been banned from lightlink.",
                expires: ban.expires || null
            });
        }

        return reply.send({ banned: false });
    });
    fastify.get("/math/check-warning", async (request, reply) => {
        const { username } = request.query;
        if (!username) {
            return reply.send({ warned: false });
        }

        if (db.activeWarnings && db.activeWarnings[username]) {
            const warning = db.activeWarnings[username];
            delete db.activeWarnings[username];
            saveData();
            return reply.send({
                warned: true,
                message: warning.message,
                timestamp: warning.timestamp
            });
        }

        return reply.send({ warned: false });
    });

    fastify.get("/math/announcements", async (request, reply) => {
        return reply.send({ announcements: db.announcements || [] });
    });

    fastify.get("/math/vapid-public-key", async (request, reply) => {
        return reply.send({ publicKey: VAPID_PUBLIC_KEY });
    });

    fastify.post("/math/push-subscribe", async (request, reply) => {
        const { username, subscription } = request.body || {};

        if (!username || !subscription) {
            return reply.code(400).send({ error: "usr and subscription required" });
        }

        if (!db.pushSubscriptions[username]) {
            db.pushSubscriptions[username] = [];
        }

        const exists = db.pushSubscriptions[username].some(
            sub => sub.endpoint === subscription.endpoint
        );

        if (!exists) {
            db.pushSubscriptions[username].push(subscription);
            saveData();
            console.log(`push notifications enabled for ${username}`);
        }

        return reply.send({ success: true });
    });

    async function sendPushToUser(targetUsername, payload) {
        const subscriptions = db.pushSubscriptions[targetUsername] || [];

        if (subscriptions.length === 0) {
            return;
        }

        const payloadString = JSON.stringify(payload);
        const invalidSubs = [];

        for (const subscription of subscriptions) {
            try {
                await webpush.sendNotification(subscription, payloadString);
                console.log(`push notification sent to ${targetUsername}`);
            } catch (error) {
                console.log(`push notification failed to send to ${targetUsername} because:`, error.statusCode);
                if (error.statusCode === 410 || error.statusCode === 404) {
                    invalidSubs.push(subscription.endpoint);
                }
            }
        }

        if (invalidSubs.length > 0) {
            db.pushSubscriptions[targetUsername] = subscriptions.filter(
                sub => !invalidSubs.includes(sub.endpoint)
            );
            saveData();
        }
    }

    const io = new Server(fastify.server, {
        path: "/profiles/socket.io",
        cors: { origin: "*", methods: ["GET", "POST"] },
    });

    io.on("connection", (socket) => {
        const ip = getIP(socket);
        let username = socket.handshake.auth.username?.trim();

        if (db.bannedIPs[ip]) {
            const ban = db.bannedIPs[ip];
            if (ban.expires && Date.now() > ban.expires) {
                delete db.bannedIPs[ip];
                saveData();
            } else {
                socket.emit("forceDisconnect", { reason: ban.reason || "Banned." });
                socket.disconnect(true);
                console.log(`rejected a banned ip: ${ip}`);
                return;
            }
        }

        if (!username || !db.users.includes(username)) {
            if (!username) {
                username = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals], separator: "-", length: 3 });
                while (db.users.includes(username)) {
                    username = `${username}-${uuidv4().slice(0, 4)}`;
                }
            }
            if (!db.users.includes(username)) {
                db.users.push(username);
                saveData();
            }
        }

        socket.join(username);
        console.log(`${username} connected [${ip}]`);

        const myFriends = db.friendships[username] || [];
        const myGroups = Object.values(db.groups).filter(g => g.members.includes(username));

        socket.emit("init", {
            username,
            friends: myFriends,
            groups: myGroups
        });

        socket.on("init", data => {
        });

        socket.on("registerPublicKey", ({ publicKey }) => {
            if (!publicKey) return;
            if (!db.publicKeys) db.publicKeys = {};
            db.publicKeys[username] = publicKey;
            saveData();
            socket.emit("system", { msg: "end-to-end encryption enabled" });
        });

        socket.on("getPublicKey", ({ targetUsername }) => {
            if (!db.publicKeys) db.publicKeys = {};
            const key = db.publicKeys[targetUsername];
            socket.emit("publicKey", { username: targetUsername, publicKey: key || null });
        });

        socket.on("changeUsername", ({ newName }) => {
            if (!newName || newName.length < 3 || newName.length > 20) {
                return socket.emit("system", { msg: "name must be 3-20 characters." });
            }

            const lastChange = db.lastUsernameChange[username] || 0;
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;

            if (now - lastChange < oneDay) {
                const hoursLeft = Math.ceil((oneDay - (now - lastChange)) / (60 * 60 * 1000));
                return socket.emit("system", { msg: `cooldown active. ${hoursLeft} hours left.` });
            }

            if (db.users.includes(newName)) {
                return socket.emit("system", { msg: "user already taken." });
            }

            const oldName = username;

            const uIdx = db.users.indexOf(oldName);
            if (uIdx !== -1) db.users[uIdx] = newName;

            if (db.friendships[oldName]) {
                db.friendships[newName] = db.friendships[oldName];
                delete db.friendships[oldName];
            }

            for (const user in db.friendships) {
                const list = db.friendships[user];
                const fIdx = list.indexOf(oldName);
                if (fIdx !== -1) list[fIdx] = newName;
            }

            for (const gid in db.groups) {
                const g = db.groups[gid];
                const mIdx = g.members.indexOf(oldName);
                if (mIdx !== -1) g.members[mIdx] = newName;
            }

            const newHistory = {};
            for (const key in db.dmHistory) {
                if (key.includes(oldName)) {
                    const parts = key.split('|');
                    if (parts.includes(oldName)) {
                        const other = parts.find(p => p !== oldName) || newName;
                        const newKey = [newName, other].sort().join('|');
                        newHistory[newKey] = db.dmHistory[key];
                    } else {
                        newHistory[key] = db.dmHistory[key];
                    }
                } else {
                    newHistory[key] = db.dmHistory[key];
                }
            }
            db.dmHistory = newHistory;

            db.lastUsernameChange[newName] = now;
            if (db.lastUsernameChange[oldName]) delete db.lastUsernameChange[oldName];
            saveData();

            username = newName;
            socket.leave(oldName);
            socket.join(newName);

            socket.emit("usernameChanged", { newName });
            socket.emit("system", { msg: "Username changed successfully!" });
            socket.emit("init", {
                username,
                friends: db.friendships[username] || [],
                groups: Object.values(db.groups).filter(g => g.members.includes(username))
            });

            const myFriendsList = db.friendships[username] || [];
            myFriendsList.forEach(friend => {
                io.to(friend).emit("init", {
                    username: friend,
                    friends: db.friendships[friend],
                    groups: Object.values(db.groups).filter(g => g.members.includes(friend))
                });
                io.to(friend).emit("system", { msg: `${oldName} changed name to ${newName}` });
            });

            Object.values(db.groups).forEach(g => {
                if (g.members.includes(newName)) {
                    g.members.forEach(m => {
                        if (m !== newName && !myFriendsList.includes(m)) {
                            io.to(m).emit("system", { msg: `${oldName} (group ${g.label}) changed name to ${newName}` });
                        }
                    });
                }
            });
        });

        socket.on("requestFriend", async ({ targetUsername }) => {
            if (!targetUsername || targetUsername === username) return;
            const friendsList = db.friendships[username] || [];
            if (friendsList.includes(targetUsername)) {
                return socket.emit("system", { msg: "already friends" });
            }
            io.to(targetUsername).emit("friendRequest", { from: username });
            socket.emit("system", { msg: `Request sent to ${targetUsername}` });

            const targetSockets = await io.in(targetUsername).fetchSockets();
            if (targetSockets.length === 0) {
                sendPushToUser(targetUsername, {
                    title: 'New Friend Request',
                    body: `${username} wants to be your friend`,
                    url: '/profiles/'
                });
            }
        });

        socket.on("respondFriend", ({ from, accepted }) => {
            if (!from) return;
            if (accepted) {
                if (!db.friendships[username]) db.friendships[username] = [];
                if (!db.friendships[from]) db.friendships[from] = [];

                if (!db.friendships[username].includes(from)) db.friendships[username].push(from);
                if (!db.friendships[from].includes(username)) db.friendships[from].push(username);
                saveData();

                io.to(username).emit("init", {
                    username, friends: db.friendships[username], groups: Object.values(db.groups).filter(g => g.members.includes(username))
                });
                io.to(from).emit("init", {
                    username: from, friends: db.friendships[from], groups: Object.values(db.groups).filter(g => g.members.includes(from))
                });
                io.to(from).emit("system", { msg: `${username} accepted your friend request!` });
            }
        });

        socket.on("sendDM", async ({ target, text, isEncrypted, data }) => {
            if (!text?.trim() || !target) return;
            const key = [username, target].sort().join("|");
            const entry = { from: username, text: text.trim(), ts: Date.now(), isEncrypted, data };

            if (!db.dmHistory[key]) db.dmHistory[key] = [];
            db.dmHistory[key].push(entry);

            if (!db.friendships[username]) db.friendships[username] = [];
            if (!db.friendships[target]) db.friendships[target] = [];
            if (!db.friendships[username].includes(target)) {
                db.friendships[username].push(target);
            }
            if (!db.friendships[target].includes(username)) {
                db.friendships[target].push(username);
            }

            saveData();

            io.to(target).emit("dm", { key, entry });
            io.to(username).emit("dm", { key, entry });

            io.to(target).emit("addFriend", { friend: username });
            io.to(username).emit("addFriend", { friend: target });

            const targetSockets = await io.in(target).fetchSockets();
            if (targetSockets.length === 0) {
                sendPushToUser(target, {
                    title: `Message from ${username}`,
                    body: text.trim().substring(0, 100),
                    url: '/profiles/'
                });
            }
        });

        socket.on("getDM", ({ target }) => {
            const key = [username, target].sort().join("|");
            socket.emit("dmHistory", { key, history: db.dmHistory[key] || [] });
        });

        socket.on("createGroup", ({ label, members = [] }) => {
            if (!label?.trim()) return socket.emit("system", { msg: "Invalid name" });
            db.groupCounter++;
            const groupId = `g${db.groupCounter}`;
            const memberSet = new Set([...members, username]);
            const group = { id: groupId, label: label.trim(), members: Array.from(memberSet), history: [] };
            db.groups[groupId] = group;
            saveData();

            memberSet.forEach(member => {
                io.to(member).emit("groupCreated", group);
                io.to(member).emit("system", { msg: `Added to group "${label}"` });
            });
        });

        socket.on("sendGroup", ({ groupId, text }) => {
            const group = db.groups[groupId];
            if (!group || !group.members.includes(username) || !text?.trim()) return;
            const entry = { from: username, text: text.trim(), ts: Date.now() };
            group.history.push(entry);
            saveData();
            group.members.forEach(member => io.to(member).emit("groupMsg", { groupId, entry }));
        });

        socket.on("getGroup", ({ groupId }) => {
            const group = db.groups[groupId];
            if (group && group.members.includes(username)) socket.emit("groupHistory", { history: group.history });
        });


        socket.on("adminWarn", async ({ password, target, message }) => {
            if (password !== ADMIN_PASSWORD) return socket.emit("system", { msg: "Access Denied" });

            if (!db.activeWarnings) db.activeWarnings = {};
            db.activeWarnings[target] = {
                message: message || "you have been warned by an admin.",
                timestamp: Date.now()
            };
            saveData();

            io.to(target).emit("adminWarning", { message });

            await sendPushToUser(target, {
                title: '⚠️ warning from admin',
                body: message || 'you have received a warning.',
                url: '/'
            });

            socket.emit("system", { msg: `Warned ${target}` });
        });

        socket.on("adminBan", ({ password, target, durationMinutes, reason }) => {
            if (password !== ADMIN_PASSWORD) return socket.emit("system", { msg: "Access Denied" });

            io.in(target).fetchSockets().then((sockets) => {
                if (sockets.length === 0) return socket.emit("system", { msg: "User not found or offline." });

                const targetSocket = sockets[0];
                const targetIP = getIP(targetSocket);

                let expires = null;
                if (durationMinutes) expires = Date.now() + (durationMinutes * 60 * 1000);

                db.bannedIPs[targetIP] = { reason, expires };
                saveData();

                io.to(target).emit("forceDisconnect", { reason });
                sockets.forEach(s => s.disconnect(true));

                socket.emit("system", { msg: `Banned ${target} (${targetIP})` });
            });
        });

        socket.on("adminUnban", ({ password, ip }) => {
            if (password !== ADMIN_PASSWORD) return;
            if (db.bannedIPs[ip]) {
                delete db.bannedIPs[ip];
                saveData();
                socket.emit("system", { msg: `Unbanned IP: ${ip}` });
            } else {
                socket.emit("system", { msg: "IP not found in ban list." });
            }
        });

        socket.on("adminListBans", ({ password }) => {
            if (password !== ADMIN_PASSWORD) return;
            socket.emit("system", { msg: JSON.stringify(db.bannedIPs, null, 2) });
        });

        socket.on("adminListUsers", ({ password }) => {
            if (password !== ADMIN_PASSWORD) return;

            const userList = [];
            const sockets = io.sockets.sockets;

            sockets.forEach((s) => {
                const rooms = Array.from(s.rooms).filter(r => r !== s.id);
                const user = rooms[0] || "Guest";
                const ip = getIP(s);
                userList.push(`${user}: ${ip}`);
            });

            socket.emit("system", { msg: "Online Users:\n" + userList.join("\n") });
        });

        socket.on("adminVerifyPassword", ({ password }) => {
            if (password === ADMIN_PASSWORD) {
                socket.emit("adminVerified", { success: true });
            } else {
                socket.emit("adminVerified", { success: false });
            }
        });

        socket.on("adminGetAllUsers", ({ password }) => {
            if (password !== ADMIN_PASSWORD) return;

            const onlineSockets = io.sockets.sockets;
            const onlineUsers = new Set();
            onlineSockets.forEach((s) => {
                const rooms = Array.from(s.rooms).filter(r => r !== s.id);
                if (rooms[0]) onlineUsers.add(rooms[0]);
            });

            const usersData = db.users.map(username => ({
                username,
                online: onlineUsers.has(username),
                friends: (db.friendships[username] || []).length,
                hasPush: (db.pushSubscriptions[username] || []).length > 0
            }));

            socket.emit("adminUsersList", { users: usersData });
        });
        socket.on("adminSendPush", async ({ password, target, title, body }) => {
            if (password !== ADMIN_PASSWORD) return;
            if (!target || !title || !body) {
                return socket.emit("system", { msg: "Target, title, and body required" });
            }

            const subs = db.pushSubscriptions[target];
            if (!subs || subs.length === 0) {
                return socket.emit("system", { msg: `No push subscriptions for ${target}` });
            }

            await sendPushToUser(target, { title, body, url: '/profiles/' });
            socket.emit("system", { msg: `Push notification sent to ${target}` });
        });

        socket.on("adminMute", ({ password, target, durationMinutes }) => {
            if (password !== ADMIN_PASSWORD) return;
            if (!db.mutedUsers) db.mutedUsers = {};
            const expires = durationMinutes
                ? Date.now() + (durationMinutes * 60 * 1000)
                : null;
            db.mutedUsers[target] = { expires };
            saveData();
            io.to(target).emit("system", { msg: `You have been muted${durationMinutes ? ` for ${durationMinutes} minutes` : ''}` });
            socket.emit("system", { msg: `Muted ${target}${durationMinutes ? ` for ${durationMinutes} minutes` : ' permanently'}` });
        });

        socket.on("adminUnmute", ({ password, target }) => {
            if (password !== ADMIN_PASSWORD) return;

            if (!db.mutedUsers) db.mutedUsers = {};

            if (db.mutedUsers[target]) {
                delete db.mutedUsers[target];
                saveData();
                io.to(target).emit("system", { msg: "You have been unmuted" });
                socket.emit("system", { msg: `Unmuted ${target}` });
            } else {
                socket.emit("system", { msg: `${target} is not muted` });
            }
        });

        socket.on("adminBroadcast", async ({ password, message }) => {
            if (password !== ADMIN_PASSWORD) return;
            io.emit("system", { msg: `📢 ${message}` });
            const usersWithPush = Object.keys(db.pushSubscriptions || {});
            let pushCount = 0;
            for (const user of usersWithPush) {
                if (db.pushSubscriptions[user]?.length > 0) {
                    await sendPushToUser(user, {
                        title: '📢 System Broadcast',
                        body: message,
                        url: '/'
                    });
                    pushCount++;
                }
            }

            if (!db.announcements) db.announcements = [];
            db.announcements.push({
                type: 'broadcast',
                message,
                timestamp: Date.now()
            });
            saveData();

            socket.emit("system", { msg: `broadcast sent to ${io.engine.clientsCount} connected + ${pushCount} push subscribers. better have been a good ahh reason` });
        });

        socket.on("adminGetReports", ({ password }) => {
            if (password !== ADMIN_PASSWORD) return;
            socket.emit("adminReportsList", { reports: db.reports || [] });
        });

        socket.on("adminDeleteReport", ({ password, reportId }) => {
            if (password !== ADMIN_PASSWORD) return;
            if (db.reports) {
                db.reports = db.reports.filter(r => r.id !== reportId);
                saveData();
                socket.emit("system", { msg: "Report deleted" });
                socket.emit("adminReportsList", { reports: db.reports });
            }
        });

        socket.on("reportMessage", async ({ target, text, context }) => {
            if (!target || !text) return;

            const report = {
                id: uuidv4(),
                reporter: username,
                reportedUser: target,
                message: text,
                context: context || "direct message",
                timestamp: Date.now()
            };

            if (!db.reports) db.reports = [];
            db.reports.push(report);
            saveData();

            socket.emit("system", { msg: "Report filed. Both parties have been notified." });

            io.to(target).emit("adminWarning", {
                message: `A report has been filed against your account for potential violations of our community standards. Your interactions are being reviewed. (This may be a false alarm)`
            });

            if (DISCORD_WEBHOOK_URL) {
                try {
                    await fetch(DISCORD_WEBHOOK_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            embeds: [{
                                title: "🚩 New User Report",
                                color: 0xff0000,
                                fields: [
                                    { name: "Reporter", value: username, inline: true },
                                    { name: "Reported User", value: target, inline: true },
                                    { name: "Context", value: context || "Direct Message", inline: true },
                                    { name: "Message Content", value: text }
                                ],
                                timestamp: new Date().toISOString()
                            }]
                        })
                    });
                } catch (e) {
                    console.error("couldnt send to discord:", e);
                }
            }
        });
    });
};