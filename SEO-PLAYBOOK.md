# SEO Playbook

How this site's SEO pass was actually done, written generically enough to reuse on
any other static/small site. Part 1 and Part 3 apply to literally any website. Part 2
is the account-setup work only a site owner can do. Part 4 is Jekyll/GitHub-Pages-
specific, kept separate so the rest stays portable.

This is a checklist, not a guarantee. Every item here improves the *conditions* for
ranking — crawlability, indexability, relevance signals, how the page looks when
shared or listed. None of it can force a ranking. See Part 3 before promising anyone
a #1 spot.

---

## Part 1: On-page checklist (any site, any CMS)

Go page by page, not site-wide-and-done — a sitewide template fix catches maybe half
of this; the rest is per-page content.

**Every real, indexable page needs:**
- [ ] A unique `<title>`, ideally 50-60 characters including your site name, with the
      page's actual subject near the front. Don't repeat the site name inside the
      page's own title if your template already appends it elsewhere — that produces
      "Resume | Bhavesh Nakum | Bhavesh Nakum"-style duplication.
- [ ] A unique meta description, ~150-160 characters, written like a reason to click,
      not a keyword list. Reuse real facts already on the page; don't invent claims.
- [ ] Exactly one `<h1>`, and a logical `h2`/`h3` hierarchy under it (no skipped
      levels, no heading stuffing). Every real content section should have a heading,
      even a visually small one — screen readers and crawlers both navigate by them.
- [ ] Exactly one canonical `<link>` pointing at the page's own clean URL. Check for
      this specifically if you're using an SEO plugin/tag alongside any hand-written
      `<head>` code — the single most common way to get a duplicate is a template
      emitting one and a plugin emitting another, both correct, both present.
- [ ] Open Graph + Twitter Card tags (title/description auto-follow from the above on
      most SEO plugins; `og:image` needs a real 1200x630 image — a missing og:image
      is one of the most common gaps and it's invisible until someone actually shares
      the link).
- [ ] At least a baseline entity schema (JSON-LD `Person` or `Organization`, whichever
      fits) so search engines and AI answer engines can resolve "who/what is this"
      as one consistent thing, not guess from scattered text. Add more specific
      schema (`Article`, `Product`, `FAQPage`, `BreadcrumbList`, etc.) only where the
      content actually matches that type — don't add `FAQPage` schema to a page
      that isn't laid out as questions and answers.
- [ ] Real `alt` text on meaningful images (empty `alt=""` only for genuinely
      decorative images that add no information). This is an accessibility
      requirement first, an SEO one second, and the two rarely conflict.
- [ ] No orphan pages: every real page should be reachable by a link from your nav,
      footer, or another page — not just present in the sitemap. A page nothing
      links to gets crawled less often and ranks worse than the same content linked
      from your homepage.

**Sitewide, once:**
- [ ] An XML sitemap listing only pages you actually want indexed. Thin placeholder
      pages, demo/iframe targets, and utility pages (a standalone effect demo, a
      print stylesheet target, etc.) don't belong in it.
- [ ] A `robots.txt` that allows crawling and points at the sitemap. Use `Allow: /`
      plus per-page `noindex` meta tags for "don't index this yet" — not
      `Disallow`. A disallowed page can still show up in results as a bare link
      with no snippet, because Google never got to fetch the page and see the
      noindex directive; an allowed-but-noindexed page gets dropped cleanly.
- [ ] Thin/placeholder pages (a stub with one line of "coming soon" text) get
      `noindex` until they have real content. A handful of empty pages rarely tanks
      a whole site's ranking by itself, but it's genuinely not helping, and it's a
      confusing result for anyone who lands on one from search.
- [ ] A custom 404 page. Most static hosts (GitHub Pages included) serve a
      `/404.html` you provide with a real HTTP 404 status automatically, which
      already tells crawlers not to index it — you don't need a separate noindex
      meta tag on top of that, just confirm your host actually does this.
- [ ] Mobile-responsive at every real width, not just the breakpoints you happened
      to test — no horizontal scroll, no clipped content, touch targets at least
      44x44px. Verify this by actually opening the page at several widths in a
      browser, not by reading the CSS and assuming it's fine (see "How this was
      verified" below for why that specifically matters).

## Part 2: Analytics & search console setup

This part needs the site owner's own accounts — an assistant can wire up the code
that *reads* these values, but can't create the accounts or hold the credentials.

**Google Search Console** (search performance data, indexing control):
1. Go to [search.google.com/search-console](https://search.google.com/search-console),
   sign in with the Google account you want to own this.
2. Add a property. "URL prefix" (e.g. `https://yoursite.com/`) verifies just that
   exact URL via an HTML tag or file; "Domain" verifies everything under the domain
   at once via a DNS TXT record but needs access to your domain's DNS settings.
   URL prefix + HTML tag is the simplest path for most static sites.
3. Verify via the HTML tag method: GSC gives you a `google-site-verification`
   meta tag value. Paste it into your site's config (see Part 4 for exactly where
   on this site) and deploy; GSC checks for the tag automatically.
4. Once verified, submit your sitemap URL (`https://yoursite.com/sitemap.xml`)
   under Sitemaps in the left nav.
5. Use URL Inspection (top search bar in GSC) on each real page and click "Request
   indexing" to nudge Google to crawl it sooner than it might on its own.
6. Check back after a few days to weeks: the Performance report shows real
   impressions/clicks/average position per query once Google has data, and the
   Coverage/Pages report shows what's actually indexed vs excluded and why.

**Bing Webmaster Tools** (same idea, for Bing/Yahoo/DuckDuckGo's index):
1. Go to [bing.com/webmasters](https://www.bing.com/webmasters).
2. Easiest path: "Import from Google Search Console" — it pulls your verified
   property and sitemap straight from GSC, no separate verification step.
3. Manual path if you'd rather not connect the two: same HTML-tag verification
   idea, using a `msvalidate.01` meta tag instead.

**Google Analytics 4** (traffic and behavior data):
1. Go to [analytics.google.com](https://analytics.google.com), create a GA4
   property for your domain.
2. Under Admin → Data Streams, add a Web stream for your site; it gives you a
   Measurement ID shaped like `G-XXXXXXXXXX`.
3. Paste that ID into your site's config (Part 4 has the exact spot on this site)
   and deploy.
4. **Click tracking, mostly for free:** GA4's "Enhanced Measurement" is on by
   default for new web streams and automatically tracks outbound link clicks
   (any link to a different domain), file downloads (PDF, docx, etc. — this
   covers a résumé download with zero extra code), scroll depth, and a few
   others. Check Admin → Data Streams → your stream → Enhanced Measurement to
   confirm it's on. You only need custom events for what that doesn't cover:
   same-origin actions like a `mailto:`/`tel:` click (not "outbound" in GA4's
   eyes) or a JS form submission that doesn't navigate the page.
5. Real data takes a little while to populate and a bit longer to become
   statistically meaningful — don't judge it from the first day.

## Part 3: What this can and can't do

Be honest about this part, especially if you're doing this for someone else's site.

- **Branded searches** (someone searching your own name, or your site's exact
  name) rank well quickly once a page is indexed and has correct, unique
  metadata — there's little competition for a specific person's or brand's own
  name.
- **Broad/generic searches** (a plain job title, a common product category, a
  single competitive word) are a genuinely different problem. On-page work
  alone does not win these. They need backlinks from other real sites, content
  depth published over time, and domain authority that accumulates gradually —
  months to years, not a metadata pass. Don't promise a #1 spot for a generic
  term off the back of an SEO cleanup; promise better *conditions*, and name the
  specific things (backlinks, content, time) that actually move a competitive
  ranking.
- **Timeline to expect:** indexing a newly-fixed page is typically days to a
  couple of weeks after requesting it in Search Console. Ranking movement from
  on-page fixes shows up over weeks to months, gradually, not as a step change.
- **What a plain HTML/CSS/JS fetch can verify vs. what it can't:** title tags,
  meta descriptions, headings, canonical URLs, structured data, alt text,
  sitemap/robots correctness — all directly checkable by reading the page.
  Actual Core Web Vitals, real-user page speed, and backlink profile need
  separate tools (PageSpeed Insights, Search Console's own Core Web Vitals
  report, a backlink checker) — don't guess at these from source alone.

## How this was verified (do this, don't skip it)

Every fix in this pass was checked against the *actual rendered output*, not just
the source. That distinction caught three real bugs that reading the templates
alone never would have:

1. **A duplicate canonical tag**, pre-existing, from an SEO plugin's tag and a
   separate hand-written `<link rel="canonical">` both firing on every page.
2. **A worse duplicate** I introduced myself, immediately after fixing #1: an
   HTML comment that referenced the plugin's tag *by its literal syntax*
   (`{% seo %}`) to explain why the hand-written version was removed. Liquid (and
   most templating languages) doesn't know what an HTML comment is — it executes
   any tag syntax it finds in the raw file, comment or not. Writing the tag's name
   inside the comment executed it a second time, recreating the exact duplicate
   the comment was explaining the fix for.
3. **A tracking snippet that fired even when "unconfigured."** The plan was: leave
   a config value as an empty string, gate the analytics snippet behind
   `{% if that_value %}`, and it renders nothing until someone fills it in. It
   didn't work, because in this templating engine an empty string is truthy —
   only a fully-absent/null value or `false` is falsy. The guard needs an
   explicit `!= ""` (or your language's real empty-check), not bare truthiness.

None of these three were visible from reading the template files in isolation.
All three showed up immediately on building the site and reading the actual output
HTML. The general lesson, not specific to this stack: **after any change to
shared head/template code, rebuild (or reload) and read the real output for the
thing you changed — don't infer it from the source.** The same applies to layout/
CSS changes: open the page in a real browser at a few real widths rather than
reasoning about whether the CSS should work.

Also worth repeating for copy changes specifically: a plain-text search for a
special character (an em dash, a curly quote, etc.) can miss its HTML-entity form
(`&mdash;` vs the literal `—` character) and can miss occurrences inside embedded
JS string literals that only become visible at runtime (a status message set via
`textContent`, an `alt` attribute built in JS). Search for both forms, and check
script files, not just markup files, for any user-visible strings.

---

## Part 4: Jekyll / GitHub Pages specifics (this site)

Skip this part if the site you're applying this playbook to isn't Jekyll — Parts
1-3 above are the portable pieces.

- This site uses the `jekyll-seo-tag` and `jekyll-sitemap` gems, both already in
  the `Gemfile`. They cover most of Part 1's meta-tag and sitemap mechanics
  automatically from each page's front matter (`title`, `description`) and site
  config — you mostly need to keep front matter accurate per page, not hand-roll
  tags.
- `jekyll-seo-tag` already natively supports search-console verification via
  `_config.yml`:
  ```yaml
  webmaster_verifications:
    google: "..."   # Search Console HTML-tag verification code
    bing: "..."      # Bing Webmaster Tools verification code
  ```
  Don't hand-roll your own verification `<meta>` tags alongside this — that's
  exactly the duplicate-tag trap from the "How this was verified" section above.
- `google_analytics` in `_config.yml` and `_includes/analytics.html` on this repo
  hold the GA4 wiring: paste a real Measurement ID into `_config.yml` and it goes
  live sitewide with no other changes.
- A page needs Jekyll front matter (even an empty `---` / `---` pair) to get
  Liquid processing at all. A file with no front matter is copied through
  byte-for-byte as a static file — any `{% %}`/`{{ }}` in it is never evaluated
  and shows up as literal text on the live page.
- A custom `404.html` at the repo root with `permalink: /404.html` is served by
  GitHub Pages with a real HTTP 404 status automatically.
- `exclude:` in `_config.yml` keeps a file out of the built site entirely (used
  here for internal docs like this one, `README.md`, etc.) — different from
  per-page `sitemap: false`, which still builds and serves the page, just leaves
  it out of `sitemap.xml`.
