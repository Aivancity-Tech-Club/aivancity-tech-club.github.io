#!/usr/bin/env python3
"""Website visits for the club's agents, from Cloudflare Web Analytics (read-only, no cookies, nothing personal).

    python3 tools/site-visits/visits.py            # last 7 days
    python3 tools/site-visits/visits.py 30         # last 30 days

Prints: total visits and page views, visits per day, top pages, and where visitors came from.
A "visit" starts when someone arrives from outside the site; links opened from WhatsApp, email or a QR code
usually arrive with no referrer, so they show as "direct". Pages that carry ?src= (ig, li, wa, mail…) are
counted per source once the site records it.

The Cloudflare token is never in this file: in the club's cloud environment the network proxy adds it to every
request to api.cloudflare.com. It only has "Account Analytics: Read".
"""
import datetime as dt, json, signal, subprocess, sys

signal.signal(signal.SIGPIPE, signal.SIG_DFL)
ACCOUNT = 'c127d67cafe6867e7d87b404a0f380ac'   # Cloudflare account id (identifies the account; not a secret)
HOST = 'aivancity-tech-club.github.io'

Q = '''query($acc: String!, $since: Time!, $until: Time!, $host: String!) { viewer { accounts(filter: {accountTag: $acc}) {
  total: rumPageloadEventsAdaptiveGroups(limit: 1, filter: {datetime_geq: $since, datetime_lt: $until, requestHost: $host}) { count sum { visits } }
  byDay: rumPageloadEventsAdaptiveGroups(limit: 100, filter: {datetime_geq: $since, datetime_lt: $until, requestHost: $host}, orderBy: [date_ASC]) { count sum { visits } dimensions { date } }
  byPage: rumPageloadEventsAdaptiveGroups(limit: 20, filter: {datetime_geq: $since, datetime_lt: $until, requestHost: $host}, orderBy: [count_DESC]) { count sum { visits } dimensions { requestPath } }
  bySource: rumPageloadEventsAdaptiveGroups(limit: 15, filter: {datetime_geq: $since, datetime_lt: $until, requestHost: $host}, orderBy: [sum_visits_DESC]) { sum { visits } dimensions { refererHost } }
  byCountry: rumPageloadEventsAdaptiveGroups(limit: 5, filter: {datetime_geq: $since, datetime_lt: $until, requestHost: $host}, orderBy: [sum_visits_DESC]) { sum { visits } dimensions { countryName } }
} } }'''


def main(days):
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    var = {'acc': ACCOUNT, 'host': HOST, 'since': (now - dt.timedelta(days=days)).strftime('%Y-%m-%dT%H:%M:%SZ'),
           'until': now.strftime('%Y-%m-%dT%H:%M:%SZ')}
    out = subprocess.run(['curl', '-sS', '-m', '30', 'https://api.cloudflare.com/client/v4/graphql', '-H', 'Content-Type: application/json',
                          '-d', json.dumps({'query': Q, 'variables': var})], capture_output=True, text=True).stdout
    d = json.loads(out or '{}')
    if d.get('errors') or not d.get('data'):
        sys.exit('Cloudflare error: ' + json.dumps(d.get('errors') or d)[:400])
    a = d['data']['viewer']['accounts'][0]
    t = (a['total'] or [{'count': 0, 'sum': {'visits': 0}}])[0]
    print(f"Website visits, last {days} days (until {var['until'][:16]} UTC): {t['sum']['visits']} visits, {t['count']} page views")
    print('\nPer day (date, visits, page views)')
    for r in a['byDay']:
        print(f"  {r['dimensions']['date']}  {r['sum']['visits']:>4}  {r['count']:>5}")
    print('\nTop pages (page views, visits that started there, page)')
    for r in a['byPage']:
        print(f"  {r['count']:>5}  {r['sum']['visits']:>4}  {r['dimensions']['requestPath']}")
    print('\nWhere visits came from (visits, source; "direct" = WhatsApp, email, QR codes, typed links)')
    for r in a['bySource']:
        if not r['sum']['visits']:
            continue   # pages opened from inside the site
        print(f"  {r['sum']['visits']:>4}  {r['dimensions']['refererHost'] or 'direct'}")
    print('\nCountries (visits)')
    for r in a['byCountry']:
        print(f"  {r['sum']['visits']:>4}  {r['dimensions']['countryName']}")


if __name__ == '__main__':
    main(int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 7)
