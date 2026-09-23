# Instagram feed setup

One-time setup for the self-hosted Instagram feed (`scripts/fetch-instagram.js`,
`.github/workflows/instagram-feed.yml`). Built as a free, unlimited-accounts
alternative to Behold.so, whose free tier only covers one connected account.

Every step below has to be done by you — it needs your own Meta developer
account and your own login to both Instagram accounts, none of which
Claude can do on your behalf.

## 1. Convert both accounts to Business or Creator

Meta's current API (Instagram API with Instagram Login) only works with
Business or Creator accounts, not plain Personal ones. In the Instagram
app: **Settings → Account type and tools → Switch to professional account**.
Creator is enough, free, and reversible. Do this for both `@1mcreative`
and `@straightforkward` if either is still Personal.

## 2. Create a Meta developer app

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
   and create a new app (choose the "Other" use case if asked, then
   "Business" type).
2. In the app's dashboard, add the **Instagram** product.
3. Go to **Instagram → API setup with Instagram business login**.

You will **not** need to submit this app for App Review — Review is only
required for apps that access accounts the developer doesn't own. Since
you're only connecting your own two accounts, Standard Access (the
default) is enough.

## 3. Connect both accounts and generate tokens

Still on the **API setup with Instagram business login** page:

1. Add both `@1mcreative` and `@straightforkward` as accounts on the app
   (you'll authenticate each via Instagram directly in this flow).
2. For each account, click **Generate token**, log in via Instagram, and
   approve the permissions.
3. Copy each resulting token immediately — it's shown once. This is a
   60-day long-lived token.
4. On the same page, note each account's **Instagram user ID** (shown
   next to the connected account) — you'll need this too.

You should end up with 4 values: a token and a user ID, for each account.

## 4. Create a GitHub token for secret rotation

The workflow needs to update its own stored tokens every time it refreshes
them (Meta issues a new token on every refresh rather than extending the
old one). That needs its own GitHub token, separate from the Instagram ones:

1. [github.com/settings/tokens](https://github.com/settings/tokens) →
   **Generate new token (classic)**.
2. Scope: `repo` (needed to manage this repository's secrets).
3. Set an expiration you're comfortable with (you'll need to regenerate
   this and update `SECRETS_PAT` when it expires — a plain calendar
   reminder is enough).
4. Copy the token immediately.

## 5. Add all 5 secrets to this repository

Repository → **Settings → Secrets and variables → Actions → New repository
secret**. Add:

| Secret name | Value |
| --- | --- |
| `IG_TOKEN_1MCREATIVE` | Token from step 3, for @1mcreative |
| `IG_USER_ID_1MCREATIVE` | User ID from step 3, for @1mcreative |
| `IG_TOKEN_STRAIGHTFORKWARD` | Token from step 3, for @straightforkward |
| `IG_USER_ID_STRAIGHTFORKWARD` | User ID from step 3, for @straightforkward |
| `SECRETS_PAT` | GitHub token from step 4 |

## 6. Run it once manually

Repository → **Actions → Refresh Instagram feed → Run workflow**. Check
the run's logs — you should see `<account>: refreshed token, fetched N
media items` for both accounts, then a commit updating
`assets/data/instagram-feed.json`. After that, it runs daily on its own.

If something fails, the logs will say which account and why — the most
likely causes are a typo in a secret name/value, an account that's still
Personal (not Business/Creator), or a token that was copied incompletely.

## What happens if it breaks later

Meta has changed this API more than once. If the scheduled run starts
failing, the site keeps showing whatever was last fetched successfully —
nothing goes blank — but you'll want to check the Action's logs in
**Actions → Refresh Instagram feed** to see what changed. This is the
real tradeoff against paying for Behold: it's free and unlimited, but
you're the one who finds out if Meta breaks something, not a company
whose job is to already have fixed it.
