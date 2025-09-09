import fs from "node:fs/promises";
import path from "node:path";
import 'dotenv/config';

const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_LOGIN } = process.env;

async function getAppToken() {
    const url = new URL("https://id.twitch.tv/oauth2/token");
    url.searchParams.set("client_id", TWITCH_CLIENT_ID);
    url.searchParams.set("client_secret", TWITCH_CLIENT_SECRET);
    url.searchParams.set("grant_type", "client_credentials");
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) throw new Error(`Token fetch failed: ${res.status} ${res.statusText}`);
    return res.json();
}

async function getUserId(token, login) {
    const res = await fetch(`https://api.twitch.tv/helix/users?login=${login}`, {
        headers: { "Client-ID": TWITCH_CLIENT_ID, "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`User fetch failed: ${res.status} ${res.statusText}`);
    const { data } = await res.json();
    if (!data?.length) throw new Error("User not found");
    return data[0].id;
}

async function getSchedule(token, broadcasterId) {
    // Helix: GET /helix/schedule?broadcaster_id=...
    const res = await fetch(
        `https://api.twitch.tv/helix/schedule?broadcaster_id=${broadcasterId}&first=25`,
        { headers: { "Client-ID": TWITCH_CLIENT_ID, "Authorization": `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Schedule fetch failed: ${res.status} ${res.statusText}`);
    return res.json();
}

function normalize(items) {
    return items.map(it => ({
        id: it.id,
        // Titel bleibt als Fallback erhalten, angezeigt wird Kategorie:
        title: it.title ?? null,
        category: it.category?.name || it.category?.title || null,
        startTime: it.start_time,
        endTime: it.end_time ?? null,
        canceled: Boolean(it.canceled_until)
    }));
}

async function main() {
    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || !TWITCH_LOGIN) {
        throw new Error("Fehlende Umgebungsvariablen: TWITCH_CLIENT_ID/SECRET/LOGIN");
    }
    const { access_token } = await getAppToken();
    const userId = await getUserId(access_token, TWITCH_LOGIN);
    const raw = await getSchedule(access_token, userId);

    const items = normalize(raw.data?.segments ?? []);
    await fs.mkdir("public", { recursive: true });
    await fs.writeFile(
        path.join("public", "schedule.json"),
        JSON.stringify({ channel: TWITCH_LOGIN, updatedAt: new Date().toISOString(), items }, null, 2)
    );

    console.log(`Saved ${items.length} items → public/schedule.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
