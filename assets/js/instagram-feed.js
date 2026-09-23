// Live Instagram feed via Behold.so's public feed JSON endpoints
// (feeds.behold.so/<FEED_ID>) — no Meta API key, no 60-day token refresh,
// safe to call directly from the browser since Behold holds the real
// credentials on its own backend. Real response shape per Behold's docs:
// { posts: [{ permalink, timestamp, altText, prunedCaption,
//   sizes: { small|medium|large|full: { mediaUrl, width, height } }, ... }] }
//
// Both of the user's accounts feed into one merged, timestamp-sorted grid
// rather than two separately labeled rows — matches the same "consistent,
// not split by source" direction already applied to the YouTube section.
(function () {
  var FEED_URLS = [
    "YOUR_API_URL_1MCREATIVE",
    "YOUR_API_URL_STRAIGHTFORKWARD"
  ];
  var POST_COUNT = 6; // 2 full rows at 3-column desktop width

  var loadingEl = document.getElementById("ig-feed-loading");
  var gridEl = document.getElementById("ig-feed-grid");
  var errorEl = document.getElementById("ig-feed-error");
  if (!loadingEl || !gridEl || !errorEl) return;

  // allSettled, not all: one account's feed failing shouldn't take the
  // other down with it — show whatever real posts are actually available.
  Promise.allSettled(
    FEED_URLS.map(function (url) {
      return fetch(url).then(function (res) {
        if (!res.ok) throw new Error("Instagram feed request failed: " + res.status);
        return res.json();
      });
    })
  ).then(function (results) {
    var posts = [];
    results.forEach(function (result) {
      if (result.status === "fulfilled" && result.value && Array.isArray(result.value.posts)) {
        posts = posts.concat(result.value.posts);
      } else if (result.status === "rejected") {
        console.error("Instagram feed:", result.reason);
      }
    });

    var usable = posts.filter(function (post) {
      return post && post.permalink && post.sizes && (post.sizes.medium || post.sizes.small || post.sizes.large);
    });

    if (!usable.length) {
      showError();
      return;
    }

    usable.sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    renderGrid(usable.slice(0, POST_COUNT));
  });

  function renderGrid(posts) {
    posts.forEach(function (post) {
      var size = post.sizes.medium || post.sizes.small || post.sizes.large;

      var item = document.createElement("a");
      item.className = "ig-feed-item";
      item.href = post.permalink;
      item.target = "_blank";
      item.rel = "noopener";

      var img = document.createElement("img");
      img.src = size.mediaUrl;
      img.alt = post.altText || post.prunedCaption || "Instagram post";
      img.loading = "lazy";
      img.width = size.width;
      img.height = size.height;

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
