import fs from "node:fs/promises";
import path from "node:path";
import 'dotenv/config';

const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_LOGIN } = process.env;

function getCurrentWeekMondayIso() {
    const now = new Date();
    const day = now.getDay();
    const daysSinceMonday = (day + 6) % 7;

    const monday = new Date(now);
    monday.setDate(now.getDate() - daysSinceMonday);
    monday.setHours(0, 0, 0, 0);

    return monday.toISOString();
}

function getCurrentWeekBounds(now = new Date()) {
    const day = now.getDay();
    const daysSinceMonday = (day + 6) % 7;

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceMonday);
    weekStart.setHours(0, 0, 0, 0);

    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(weekStart.getDate() + 7);

    return { weekStart, nextWeekStart };
}

function isPastDayInCurrentWeek(dateIso, now = new Date()) {
    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) return false;

    const { weekStart, nextWeekStart } = getCurrentWeekBounds(now);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    return date >= weekStart && date < nextWeekStart && date < todayStart;
}

async function loadExistingScheduleItems(filePath) {
    try {
        const content = await fs.readFile(filePath, "utf-8");
        const parsed = JSON.parse(content);
        return Array.isArray(parsed?.items) ? parsed.items : [];
    } catch {
        return [];
    }
}

function mergeItems(existingItems, freshItems, now = new Date()) {
    const freshById = new Map(freshItems.map(item => [item.id, item]));
    const preservedFromExisting = existingItems.filter(
        item => !freshById.has(item.id) && isPastDayInCurrentWeek(item.startTime, now)
    );

    return [...freshItems, ...preservedFromExisting]
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
}

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

async function getSchedule(token, broadcasterId, startTime) {
    const allSegments = [];
    let cursor = null;

    while (true) {
        const url = new URL("https://api.twitch.tv/helix/schedule");
        url.searchParams.set("broadcaster_id", broadcasterId);
        url.searchParams.set("first", "25");
        url.searchParams.set("start_time", startTime);
        if (cursor) url.searchParams.set("after", cursor);

        const res = await fetch(url, {
            headers: { "Client-ID": TWITCH_CLIENT_ID, "Authorization": `Bearer ${token}` }
        });
        if (res.status === 404) return { data: null };
        if (!res.ok) throw new Error(`Schedule fetch failed: ${res.status} ${res.statusText}`);

        const page = await res.json();
        const segments = page?.data?.segments ?? [];
        allSegments.push(...segments);

        cursor = page?.pagination?.cursor ?? null;
        if (!cursor) break;
    }

    return { data: { segments: allSegments } };
}

async function getBoxArts(token, categoryIds) {
    if (!categoryIds.length) return {};
    const url = new URL("https://api.twitch.tv/helix/games");
    categoryIds.forEach(id => url.searchParams.append("id", id));
    const res = await fetch(url, {
        headers: { "Client-ID": TWITCH_CLIENT_ID, "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) return {};
    const { data } = await res.json();
    return Object.fromEntries(data.map(g => [g.id, g.box_art_url]));
}

function normalize(items, boxArtMap) {
    return items.map(it => ({
        id: it.id,
        title: it.title ?? null,
        category: it.category?.name ?? null,
        categoryId: it.category?.id ?? null,
        boxArtUrl: it.category?.id ? (boxArtMap[it.category.id] ?? null) : null,
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
    const startTime = getCurrentWeekMondayIso();
    const raw = await getSchedule(access_token, userId, startTime);

    const segments = raw.data?.segments ?? [];
    const categoryIds = [...new Set(segments.map(s => s.category?.id).filter(Boolean))];
    const boxArtMap = await getBoxArts(access_token, categoryIds);

    const freshItems = normalize(segments, boxArtMap);
    const schedulePath = path.join("public", "schedule.json");
    const existingItems = await loadExistingScheduleItems(schedulePath);
    const items = mergeItems(existingItems, freshItems);
    await fs.mkdir("public", { recursive: true });
    await fs.writeFile(
        schedulePath,
        JSON.stringify({ channel: TWITCH_LOGIN, updatedAt: new Date().toISOString(), items }, null, 2)
    );

    console.log(`Saved ${items.length} items -> public/schedule.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
