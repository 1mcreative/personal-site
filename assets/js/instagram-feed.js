// Self-hosted alternative to Behold.so, whose free tier only covers 1
// connected Instagram account — this site needs 2. A scheduled GitHub
// Action (.github/workflows/instagram-feed.yml, see scripts/fetch-instagram.js)
// refreshes both accounts' tokens and writes their merged, timestamp-sorted
// posts to assets/data/instagram-feed.json; this just fetches that
// same-origin static file. No third-party service, no API key ever
// touches the browser, no per-source limit.
(function () {
  var DATA_URL = "/assets/data/instagram-feed.json";
  var POST_COUNT = 6; // 2 full rows at 3-column desktop width

  var loadingEl = document.getElementById("ig-feed-loading");
  var gridEl = document.getElementById("ig-feed-grid");
  var errorEl = document.getElementById("ig-feed-error");
  if (!loadingEl || !gridEl || !errorEl) return;

  // no-cache, not the default: the workflow rewrites this file roughly
  // daily, and a returning visitor's browser otherwise has no reason to
  // ever re-check it once cached — confirmed directly in this session's
  // own local testing, where a stale cached response persisted across a
  // brand new tab until this was added.
  fetch(DATA_URL, { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("Instagram feed data request failed: " + res.status);
      return res.json();
    })
    .then(function (data) {
      var posts = (data && data.posts) || [];
      if (!posts.length) throw new Error("Instagram feed data has no posts yet");
      renderGrid(posts.slice(0, POST_COUNT));
    })
    .catch(function (err) {
      console.error("Instagram feed:", err);
      showError();
    });

  function renderGrid(posts) {
    posts.forEach(function (post) {
      var item = document.createElement("a");
      item.className = "ig-feed-item";
      item.href = post.permalink;
      item.target = "_blank";
      item.rel = "noopener";

      var img = document.createElement("img");
      img.src = post.imageUrl;
      img.alt = post.caption ? post.caption.slice(0, 140) : "Instagram post";
      img.loading = "lazy";

      item.appendChild(img);
      gridEl.appendChild(item);
    });

    loadingEl.hidden = true;
    gridEl.hidden = false;
  }

  function showError() {
    loadingEl.hidden = true;
    errorEl.hidden = false;
  }
})();
