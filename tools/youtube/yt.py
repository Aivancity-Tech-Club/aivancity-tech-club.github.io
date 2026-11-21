#!/usr/bin/env python3
"""YouTube reader for the club's agents, through Google's official YouTube Data API (public data, read-only).

    python3 tools/youtube/yt.py channel @HANDLE [@HANDLE…]   # recent videos, biggest breakout first
    python3 tools/youtube/yt.py channel @HANDLE --shorts      # only videos of 3 minutes or less (Shorts)

For each video: views, likes, comments, length, and times_usual = its views divided by that channel's median
video (the same breakout measure as tools/instagram/ig.py). CSV on stdout, ready for Google Sheets.

The API key is never in this file: in the club's cloud environment the network proxy adds it to every request
to youtube.googleapis.com. Elsewhere, set YT_KEY in your shell for one run.
Quota: about 10,000 units a day for free; one channel costs about 3 units, so this is never a problem.
"""
import csv, json, os, re, signal, statistics, subprocess, sys, urllib.parse

signal.signal(signal.SIGPIPE, signal.SIG_DFL)   # quiet when piped into head
API = 'https://youtube.googleapis.com/youtube/v3/'


def get(path, **params):
    if os.environ.get('YT_KEY'):
        params['key'] = os.environ['YT_KEY']
    out = subprocess.run(['curl', '-sS', '-m', '30', API + path + '?' + urllib.parse.urlencode(params)], capture_output=True, text=True)
    data = json.loads(out.stdout or '{}')
    if 'error' in data:
        sys.exit('YouTube API error: ' + data['error'].get('message', str(data['error'])))
    return data


def seconds(iso):
    """PT1M5S -> 65"""
    m = re.match(r'P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', iso or '')
    d, h, mi, s = (int(x or 0) for x in m.groups()) if m else (0, 0, 0, 0)
    return d * 86400 + h * 3600 + mi * 60 + s


def channel(handles, shorts_only=False):
    rows = []
    for h in handles:
        h = h if h.startswith('@') else '@' + h
        items = get('channels', part='snippet,statistics,contentDetails', forHandle=h).get('items', [])
        if not items:
            print(f'# {h}: no channel with this handle', file=sys.stderr)
            continue
        c = items[0]
        subs = int(c['statistics'].get('subscriberCount') or 0)
        print(f"# {h} · {c['snippet']['title']} · {subs} subscribers · {c['statistics'].get('videoCount')} videos", file=sys.stderr)
        if not int(c['statistics'].get('videoCount') or 0):
            continue   # no video yet (and no uploads playlist)
        uploads = c['contentDetails']['relatedPlaylists']['uploads']
        ids = [x['contentDetails']['videoId'] for x in get('playlistItems', part='contentDetails', playlistId=uploads, maxResults=50).get('items', [])]
        if not ids:
            continue
        vids = get('videos', part='snippet,statistics,contentDetails', id=','.join(ids)).get('items', [])
        mine = []
        for v in vids:
            length = seconds(v['contentDetails'].get('duration'))
            if shorts_only and length > 180:
                continue
            s = v['statistics']
            mine.append({'channel': h, 'subscribers': subs, 'date': v['snippet']['publishedAt'][:10],
                         'type': 'short' if length <= 180 else 'video', 'seconds': length,
                         'views': int(s.get('viewCount') or 0), 'likes': int(s.get('likeCount') or 0),
                         'comments': int(s.get('commentCount') or 0), 'title': v['snippet']['title'][:150],
                         'url': 'https://www.youtube.com/watch?v=' + v['id']})
        usual = statistics.median([m['views'] for m in mine]) if mine else 1
        for m in mine:
            m['usual_views'] = round(usual)
            m['times_usual'] = round(m['views'] / (usual or 1), 1)
        rows += mine
    rows.sort(key=lambda r: r['times_usual'], reverse=True)
    w = csv.DictWriter(sys.stdout, fieldnames=['channel', 'subscribers', 'date', 'type', 'seconds', 'views', 'usual_views',
                                               'times_usual', 'likes', 'comments', 'title', 'url'])
    w.writeheader()
    w.writerows(rows)


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['channel'] and len([x for x in a[1:] if not x.startswith('--')]):
        channel([x for x in a[1:] if not x.startswith('--')], shorts_only='--shorts' in a)
    else:
        sys.exit(__doc__)
