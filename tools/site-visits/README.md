# Website visits (Cloudflare Web Analytics, read-only)

```bash
python3 tools/site-visits/visits.py       # last 7 days
python3 tools/site-visits/visits.py 30    # last 30 days
```
Total visits and page views, visits per day, top pages, where visits came from, and countries.
The site loads Cloudflare's script (`assets/analytics.js`): no cookies, nothing personal. Counting started on
11 Nov 2026. Over long periods Cloudflare samples, so numbers are estimates (often rounded to tens).

"Direct" visits have no referrer: links opened from WhatsApp, email apps or QR codes usually look like this.
To tell channels apart, links should carry `?src=` (ig, li, tt, yt, wa, mail) and the site should record it
(Backlog: channel tracking).

**Access.** A Cloudflare API token with only *Account Analytics: Read*, saved as a network secret on the club's
cloud environment (host `api.cloudflare.com`); never in this repository. The account id in the script is not secret.
