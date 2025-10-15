#!/usr/bin/env python3
import subprocess
import collections
import argparse
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional

SESSION_GAP = 4 * 60 * 60       # 4 hours
SESSION_BASE = 60 * 60          # base 60 min for session start

def fmt(ts: int) -> str:
    return datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')

def run_git(args: List[str]) -> str:
    return subprocess.check_output(args, text=True)

def get_commits(since: Optional[str], until: Optional[str], author_filter: Optional[str]) -> Dict[str, List[Dict[str, Any]]]:
    git_args = ['git', 'log', '--all', '--pretty=format:%H|%at|%an|%ae|%s']
    if since:
        git_args.append(f'--since={since}')
    if until:
        git_args.append(f'--until={until}')

    lines = run_git(git_args).strip().splitlines()
    by_author: Dict[str, List[Dict[str, Any]]] = collections.defaultdict(list)
    for line in lines:
        parts = line.split('|', 4)
        if len(parts) < 5:
            continue
        h, ts, an, ae, subj = parts
        if author_filter and author_filter.lower() not in ae.lower():
            continue
        try:
            ts_i = int(ts)
        except ValueError:
            continue
        by_author[ae].append({'hash': h, 'ts': ts_i, 'name': an, 'email': ae, 'subject': subj})
    for ae in by_author:
        by_author[ae].sort(key=lambda c: c['ts'])
    return by_author

def build_sessions(commits: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    sessions: List[Dict[str, Any]] = []
    if not commits:
        return sessions

    sess_start_idx = 0
    for i in range(1, len(commits)):
        if commits[i]['ts'] - commits[i-1]['ts'] > SESSION_GAP:
            start_ts = commits[sess_start_idx]['ts']
            end_ts = commits[i-1]['ts']
            duration = SESSION_BASE + max(0, end_ts - start_ts)
            sessions.append({'start_ts': start_ts, 'end_ts': end_ts, 'duration_sec': duration,
                             'commits': commits[sess_start_idx:i]})
            sess_start_idx = i

    start_ts = commits[sess_start_idx]['ts']
    end_ts = commits[-1]['ts']
    duration = SESSION_BASE + max(0, end_ts - start_ts)
    sessions.append({'start_ts': start_ts, 'end_ts': end_ts, 'duration_sec': duration,
                     'commits': commits[sess_start_idx:]})
    return sessions

def numstat_between(prev_hash: Optional[str], curr_hash: str) -> Tuple[int, int]:
    if prev_hash:
        args = ['git', 'diff', '--numstat', prev_hash, curr_hash]
    else:
        args = ['git', 'diff', '--numstat', f'{curr_hash}^', curr_hash]

    try:
        out = run_git(args)
    except subprocess.CalledProcessError:
        return (0, 0)

    added, removed = 0, 0
    for line in out.strip().splitlines():
        parts = line.split('\t')
        if len(parts) < 3:
            continue
        a, r, _ = parts
        if a.isdigit():
            added += int(a)
        if r.isdigit():
            removed += int(r)
    return (added, removed)

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Calculate working hours based on git commit timestamps.\n"
            "Sessions are separated by a 4-hour gap by default.\n"
            "Each session adds a 1-hour base time for setup."
        ),
        formatter_class=argparse.RawTextHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python3 git_time.py\n"
            "  python3 git_time.py --author vladimir\n"
            "  python3 git_time.py --since 2025-09-01 --until 2025-10-01\n"
            "  python3 git_time.py --author vladimir --list-commits\n"
            "  python3 git_time.py --author vladimir@example.com --session 2\n"
            "  python3 git_time.py --no-sessions   # hide sessions section"
        )
    )
    parser.add_argument("--author", type=str, help="Filter by author email (substring match).")
    parser.add_argument("--since", type=str, help="Start date (YYYY-MM-DD).")
    parser.add_argument("--until", type=str, help="End date (YYYY-MM-DD).")
    parser.add_argument("--list-commits", action="store_true",
                        help="Print per-commit details for each session (for selected author/all).")
    parser.add_argument("--session", type=int,
                        help="Show only a single session (index starting at 1) for the selected --author.")
    parser.add_argument("--no-sessions", action="store_true",
                        help="Do not print the sessions section (boundaries).")

    args = parser.parse_args()

    by_author = get_commits(args.since, args.until, args.author)

    total = 0
    per_author_seconds = {}
    per_author_sessions = {}

    for ae, commits in by_author.items():
        sessions = build_sessions(commits)
        per_author_sessions[ae] = sessions
        author_sum = sum(s['duration_sec'] for s in sessions)
        per_author_seconds[ae] = author_sum
        total += author_sum

    print("TOTAL project hours:", round(total / 3600, 2))
    print("TOTAL person-days (8h):", round(total / 3600 / 8, 2))

    print("\nBy author (hours):")
    for ae, sec in sorted(per_author_seconds.items(), key=lambda x: -x[1]):
        print(f"{ae:30s} {round(sec / 3600, 2)}")

    if args.session is not None:
        if not args.author:
            print("\nERROR: --session requires --author to select whose sessions to show.")
            return
        matched = [k for k in per_author_sessions if args.author.lower() in k.lower()]
        if not matched:
            print(f"\nNo author matched by '{args.author}'.")
            return
        if len(matched) > 1:
            print(f"\nAmbiguous --author. Matched: {', '.join(matched)}")
            return

        key = matched[0]
        sessions = per_author_sessions.get(key, [])
        idx = args.session
        if idx < 1 or idx > len(sessions):
            print(f"\nSession index out of range. Author '{key}' has {len(sessions)} session(s).")
            return

        sess = sessions[idx - 1]
        print(f"\nAuthor: {key}")
        print(f"Session {idx:02d}: {fmt(sess['start_ts'])}  ->  {fmt(sess['end_ts'])}   "
              f"duration: {round(sess['duration_sec']/3600, 2)} h")
        print("\nCommits in this session (chronological):")
        prev_hash = None
        for c in sess['commits']:
            add, rem = numstat_between(prev_hash, c['hash'])
            print(f"- {fmt(c['ts'])} | {c['name']} <{c['email']}> | {c['hash'][:10]} | +{add} -{rem} | {c['subject']}")
            prev_hash = c['hash']
        return

    if not args.no_sessions:
        print("\nSession boundaries per author:")
        keys = sorted(per_author_sessions.keys())
        if args.author:
            keys = [k for k in keys if args.author.lower() in k.lower()]

        for ae in keys:
            sessions = per_author_sessions[ae]
            if not sessions:
                continue
            print(f"\n{ae}")
            for i, s in enumerate(sessions, 1):
                print(f"  Session {i:02d}: {fmt(s['start_ts'])}  →  {fmt(s['end_ts'])}   "
                      f"duration: {round(s['duration_sec']/3600, 2)} h")
                if args.list_commits:
                    for c_idx, c in enumerate(s['commits']):
                        prev_hash = None if c_idx == 0 else s['commits'][c_idx-1]['hash']
                        add, rem = numstat_between(prev_hash, c['hash'])
                        print(f"    • {fmt(c['ts'])} | {c['name']} <{c['email']}> | {c['hash'][:10]} | +{add} -{rem} | {c['subject']}")

if __name__ == "__main__":
    main()
