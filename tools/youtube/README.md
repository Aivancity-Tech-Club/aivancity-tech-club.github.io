# YouTube reader (official YouTube Data API, public data, read-only)

```bash
python3 tools/youtube/yt.py channel @HANDLE            # a channel's last 50 videos, biggest breakout first
python3 tools/youtube/yt.py channel @HANDLE --shorts   # only Shorts (3 minutes or less)
```
For each video: views, likes, comments, length, and **times_usual** (its views divided by the channel's median video),
the same breakout measure as `tools/instagram/ig.py`. CSV on stdout, ready for Google Sheets.

**Access.** A Google Cloud API key restricted to the YouTube Data API v3, saved as a network secret on the club's
cloud environment (header `X-Goog-Api-Key`, host `youtube.googleapis.com`); never in this repository. On your own
computer, set `YT_KEY` in your shell for one run. Free quota: about 10,000 units a day (one channel ≈ 3 units).

It reads public numbers only. Watch time and audience retention for the club's own channel need a different,
signed-in API (YouTube Analytics); not set up yet.
