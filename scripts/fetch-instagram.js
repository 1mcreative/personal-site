#!/usr/bin/env node
// Self-hosted alternative to Behold.so: refreshes both Instagram accounts'
// long-lived tokens and writes their merged, timestamp-sorted media to a
// static JSON file the frontend fetches same-origin. Built because Behold's
// free tier only covers 1 connected account and this site needs 2.
//
// Run on a schedule via .github/workflows/instagram-feed.yml — each account
// needs its own initial 60-day token, generated once via the Meta App
// Dashboard's own "Generate token" button (Instagram > API setup with
// Instagram business login). See INSTAGRAM_SETUP.md for the full walkthrough.
//
// API reference confirmed directly against Meta's current docs before
// writing this (not from memory): refresh_access_token needs a token at
// least 24h old and not yet expired, returns a new token valid for another
// 60 days; the media node's thumbnail_url only exists on VIDEO items (its
// own media_url on VIDEO points at the video file, not something an <img>
// can render).

const fs = require("fs");
const path = require("path");

const ACCOUNTS = [
  { name: "1mcreative", tokenEnv: "IG_TOKEN_1MCREATIVE", idEnv: "IG_USER_ID_1MCREATIVE" },
  { name: "straightforkward", tokenEnv: "IG_TOKEN_STRAIGHTFORKWARD", idEnv: "IG_USER_ID_STRAIGHTFORKWARD" }
];

const OUTPUT_PATH = path.join(__dirname, "..", "assets", "data", "instagram-feed.json");
const TOKENS_OUT_PATH = path.join(__dirname, "refreshed-tokens.json");
const MEDIA_FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
const MEDIA_LIMIT = 12;
const POST_COUNT = 12;

async function refreshToken(token) {
  const url = "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=" + encodeURIComponent(token);
  const res = await fetch(url);
  if (!res.ok) throw new Error("refresh failed: " + res.status + " " + (await res.text()));
  const data = await res.json();
  if (!data.access_token) throw new Error("refresh response missing access_token");
  return data.access_token;
}

async function fetchMedia(igUserId, token) {
  const url = "https://graph.instagram.com/" + igUserId + "/media?fields=" + MEDIA_FIELDS + "&limit=" + MEDIA_LIMIT + "&access_token=" + encodeURIComponent(token);
  const res = await fetch(url);
  if (!res.ok) throw new Error("media fetch failed: " + res.status + " " + (await res.text()));
  const data = await res.json();
  return Array.isArray(data.data) ? data.data : [];
}

function toImageUrl(item) {
  return item.media_type === "VIDEO" ? item.thumbnail_url : item.media_url;
}

async function run() {
  const allPosts = [];
  const refreshedTokens = {};
  let anySucceeded = false;

  for (const account of ACCOUNTS) {
    const token = process.env[account.tokenEnv];
    const igUserId = process.env[account.idEnv];
    if (!token || !igUserId) {
      console.error("Skipping " + account.name + ": missing " + account.tokenEnv + " or " + account.idEnv);
      continue;
    }

    try {
      const newToken = await refreshToken(token);
      const media = await fetchMedia(igUserId, newToken);

      media.forEach(function (item) {
        const imageUrl = toImageUrl(item);
        if (!imageUrl || !item.permalink) return;
        allPosts.push({
          id: item.id,
          permalink: item.permalink,
          imageUrl: imageUrl,
          caption: item.caption || "",
          timestamp: item.timestamp,
          account: account.name
        });
      });

      // Only persist the new token once we know it actually worked end to
      // end (refresh + a successful media fetch) — never overwrite a
      // possibly-still-good stored token with one we haven't proven works.
      refreshedTokens[account.tokenEnv] = newToken;
      anySucceeded = true;
      console.log(account.name + ": refreshed token, fetched " + media.length + " media items");
    } catch (err) {
      console.error(account.name + " failed:", err.message);
    }
  }

  if (!anySucceeded) {
    console.error("Every account failed — leaving the existing feed file untouched.");
    process.exit(1);
  }

  allPosts.sort(function (a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  const output = {
    generatedAt: new Date().toISOString(),
    posts: allPosts.slice(0, POST_COUNT)
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log("Wrote " + output.posts.length + " posts to " + OUTPUT_PATH);

  // Never committed: the workflow reads this, pushes each value to GitHub
  // Secrets via `gh secret set`, then deletes the file.
  fs.writeFileSync(TOKENS_OUT_PATH, JSON.stringify(refreshedTokens));
}

run().catch(function (err) {
  console.error("Unexpected failure:", err);
  process.exit(1);
});
