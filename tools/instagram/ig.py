#!/usr/bin/env python3
"""Instagram reader for the club's agents, through Meta's official Graph API (read-only).

    python3 tools/instagram/ig.py club                 # the club's account and every post, with its numbers
    python3 tools/instagram/ig.py study USER [USER…]    # other professional accounts: what works for them
    python3 tools/instagram/ig.py hashtag TAG [--recent] # top (or recent) posts for a hashtag

Output is CSV on stdout (add  > file.csv  to save it), ready to paste into Google Sheets.

The access token is never in this file or the repository: in the club's cloud environment the network proxy
adds it to every request to graph.facebook.com. Elsewhere, set IG_TOKEN in your shell for one run.
Limits (Meta's): 30 different hashtags per 7 days; other accounts must be Business or Creator accounts;
their video files are not available, only captions and numbers.
"""
import csv, json, os, signal, subprocess, sys, urllib.parse

signal.signal(signal.SIGPIPE, signal.SIG_DFL)   # quiet when piped into head

API = 'https://graph.facebook.com/v21.0/'
CLUB_IG = '17841443948525985'   # @aivancity_tech.club (Instagram account id, not secret)


def get(path, **params):
    if os.environ.get('IG_TOKEN'):
        params['access_token'] = os.environ['IG_TOKEN']
    url = API + path + ('?' + urllib.parse.urlencode(params) if params else '')
    out = subprocess.run(['curl', '-sS', '-m', '30', url], capture_output=True, text=True)
    data = json.loads(out.stdout or '{}')
    if 'error' in data:
        sys.exit('Instagram API error: ' + data['error'].get('message', str(data['error'])))
    return data


def hook(caption):
    """The first line of a caption: what people read before 'more'."""
    return (caption or '').strip().split('\n')[0][:150]


def write(rows, cols):
    w = csv.DictWriter(sys.stdout, fieldnames=cols, extrasaction='ignore')
    w.writeheader()
    for r in rows:
        w.writerow(r)


def club():
    acc = get(CLUB_IG, fields='username,followers_count,media_count')
    print(f"# @{acc['username']} · {acc['followers_count']} followers · {acc['media_count']} posts", file=sys.stderr)
    rows, after = [], None
    while True:
        page = get(CLUB_IG + '/media', fields='id,media_product_type,media_type,caption,timestamp,permalink,like_count,comments_count',
                   limit=50, **({'after': after} if after else {}))
        for m in page.get('data', []):
            metrics = 'reach,views,saved,shares,total_interactions'
            ins = get(m['id'] + '/insights', metric=metrics)
            for x in ins.get('data', []):
                m[x['name']] = x['values'][0]['value']
            m['hook'] = hook(m.get('caption'))
            m['date'] = m['timestamp'][:10]
            rows.append(m)
        after = page.get('paging', {}).get('cursors', {}).get('after')
        if not page.get('paging', {}).get('next'):
            break
    write(rows, ['date', 'media_product_type', 'views', 'reach', 'like_count', 'comments_count', 'saved', 'shares',
                 'total_interactions', 'hook', 'permalink'])


def study(users):
    fields = ('username,name,followers_count,media_count,media.limit(25)'
              '{media_product_type,media_type,caption,like_count,comments_count,timestamp,permalink}')
    rows = []
    for u in users:
        u = u.lstrip('@')
        d = get(CLUB_IG, fields=f'business_discovery.username({u}){{{fields}}}')['business_discovery']
        f = max(d.get('followers_count') or 1, 1)
        for m in d.get('media', {}).get('data', []):
            eng = (m.get('like_count') or 0) + (m.get('comments_count') or 0)
            rows.append({'account': '@' + d['username'], 'followers': f, 'date': m['timestamp'][:10],
                         'type': m.get('media_product_type'), 'likes': m.get('like_count'), 'comments': m.get('comments_count'),
                         'engagement_per_1000_followers': round(eng * 1000 / f, 1), 'hook': hook(m.get('caption')),
                         'permalink': m['permalink']})
    rows.sort(key=lambda r: r['engagement_per_1000_followers'], reverse=True)
    write(rows, ['account', 'followers', 'date', 'type', 'likes', 'comments', 'engagement_per_1000_followers', 'hook', 'permalink'])


def hashtag(tag, recent=False):
    tag = tag.lstrip('#')
    hid = get('ig_hashtag_search', user_id=CLUB_IG, q=tag)['data'][0]['id']
    edge = 'recent_media' if recent else 'top_media'
    rows, after = [], None
    for _ in range(3):   # Meta refuses big pages here: 3 pages of 10
        d = get(f'{hid}/{edge}', user_id=CLUB_IG, limit=10, **({'after': after} if after else {}),
                fields='media_type,caption,like_count,comments_count,timestamp,permalink')
        rows += [{'hashtag': '#' + tag, 'date': m.get('timestamp', '')[:10], 'type': m.get('media_type'),
                  'likes': m.get('like_count'), 'comments': m.get('comments_count'), 'hook': hook(m.get('caption')),
                  'permalink': m.get('permalink')} for m in d.get('data', [])]
        after = d.get('paging', {}).get('cursors', {}).get('after')
        if not after or not d.get('paging', {}).get('next'):
            break
    write(rows, ['hashtag', 'date', 'type', 'likes', 'comments', 'hook', 'permalink'])


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['club']:
        club()
    elif a[:1] == ['study'] and len(a) > 1:
        study(a[1:])
    elif a[:1] == ['hashtag'] and len(a) > 1:
        hashtag(a[1], recent='--recent' in a)
    else:
        sys.exit(__doc__)
