# Instagram reader (official Meta Graph API, read-only)

Lets the agents read Instagram without anyone copying numbers by hand.

```bash
python3 tools/instagram/ig.py club                    # @aivancity_tech.club: every post with views, reach, likes, comments, saves, shares
python3 tools/instagram/ig.py study duolingo konbini   # other Business/Creator accounts: their recent posts, best first (engagement per 1,000 followers)
python3 tools/instagram/ig.py hashtag hackathon        # top posts for a hashtag (add --recent for the newest)
```
Each prints CSV, ready for Google Sheets (`08 Data / Post results`, `03 Marketing / Inspiration`).

**Access.** A Meta app *aivancity Tech Club agents* (development mode, business portfolio *aivancity Tech Club*),
linked to the club's Facebook Page and Instagram. Its token is stored as a network secret on the club's cloud
environment, so the proxy adds it to requests to `graph.facebook.com`; it is never in the repository.
To run it on your own computer, set `IG_TOKEN` in your shell for that one command.

**What Meta allows.** Only read access (no posting). Other accounts must be Business or Creator accounts and their
video files are not available, only captions and numbers. At most 30 different hashtags per 7 days.
Reading a post from its link (oEmbed) needs a Meta review, so for a single Reel, give the agent the account name.
