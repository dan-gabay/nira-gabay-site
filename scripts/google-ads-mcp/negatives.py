#!/usr/bin/env python3
"""Campaign-level negative keywords for the Nira campaign, with guard rails.

Run through negatives.sh (it sets up auth and the Python env). Input is a JSON
list of terms:

  [{"text": "משרות פסיכולוג", "match": "EXACT", "category": "jobs",
    "reason": "job seeker", "cost_ils": 6.2}]

Modes:
  check     validate_only=true for every allowed term; writes nothing.
  apply     writes the AUTO-eligible terms only. Anything else is listed as
            "needs_approval" and must go to Dan. With --approved, terms that
            Dan approved by name in the thread are written too (still never
            the BLOCKED ones).
  selftest  offline tests of the rules.

Auto rule (Dan, 2026-11-03): EXACT match, category in AUTO_CATEGORIES, no
protected word, at most MAX_PER_RUN per run. Never removes anything.
See docs/google-ads-negatives.md.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys

CUSTOMER_ID = "9813608349"
CAMPAIGN_ID = "24176893630"
MAX_PER_RUN = 15
MAX_LEN = 80

# Approved by Dan on 2026-11-03 for automatic adding (exact match only).
AUTO_CATEGORIES = {
    "jobs",              # job / vacancy / salary searches
    "studies",           # courses, degrees, training, certification
    "free",              # free / no-cost / subsidised-only seekers
    "other_profession",  # professions Nira does not offer
    "therapist_name",    # another therapist's name
}
KNOWN_CATEGORIES = AUTO_CATEGORIES | {"other"}

# Never added as a negative, in any mode: Nira's own brand.
BRAND_WORDS = ["נירה", "גבאי", "nira", "gabay", "gabai"]
# Never automatic: CBT is a service Nira wants (commercial CBT must not be
# blocked; informational CBT only with Dan's separate approval).
CBT_WORDS = ["cbt", "סי בי טי", "קוגניטיבי", "קוגנטיבי", "התנהגותי"]


def norm(text):
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def classify(term):
    """Returns (decision, why). decision: auto | needs_approval | blocked."""
    text = norm(term.get("text"))
    match = (term.get("match") or "").upper()
    cat = term.get("category") or "other"
    if not text:
        return "blocked", "empty text"
    if len(text) > MAX_LEN:
        return "blocked", f"longer than {MAX_LEN} chars"
    if any(w in text for w in BRAND_WORDS):
        return "blocked", "contains Nira's name"
    if match not in ("EXACT", "PHRASE"):
        return "blocked", "only EXACT or PHRASE (no broad negatives)"
    if cat not in KNOWN_CATEGORIES:
        return "blocked", f"unknown category {cat!r}"
    if any(w in text for w in CBT_WORDS):
        return "needs_approval", "CBT term: Dan approves separately"
    if cat == "therapist_name" and len(text.split()) < 2:
        return "needs_approval", "therapist name needs first + last name"
    if match != "EXACT":
        return "needs_approval", "PHRASE match is not automatic"
    if cat not in AUTO_CATEGORIES:
        return "needs_approval", f"category {cat!r} is not automatic"
    return "auto", "approved category, exact match"


def plan(terms, existing, approved=False):
    """Splits terms into to_send / needs_approval / blocked / skipped."""
    out = {"to_send": [], "needs_approval": [], "blocked": [], "skipped": []}
    seen = set()
    for t in terms:
        key = (norm(t.get("text")), (t.get("match") or "").upper())
        decision, why = classify(t)
        row = dict(t, text=key[0], match=key[1], why=why)
        if key in seen or key[0] in existing:
            out["skipped"].append(dict(row, why="already a negative"))
            continue
        seen.add(key)
        if decision == "blocked":
            out["blocked"].append(row)
        elif decision == "needs_approval" and not approved:
            out["needs_approval"].append(row)
        else:
            out["to_send"].append(row)
    over = out["to_send"][MAX_PER_RUN:]
    out["to_send"] = out["to_send"][:MAX_PER_RUN]
    for row in over:
        out["needs_approval"].append(dict(row, why=f"over the {MAX_PER_RUN}-per-run cap"))
    return out


def ads_client():
    import google.auth
    from google.ads.googleads.client import GoogleAdsClient
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/adwords"])
    return GoogleAdsClient(credentials=creds, use_proto_plus=True)


def existing_negatives(client):
    svc = client.get_service("GoogleAdsService")
    q = ("SELECT campaign_criterion.keyword.text, campaign_criterion.keyword.match_type "
         "FROM campaign_criterion WHERE campaign_criterion.negative = TRUE "
         f"AND campaign_criterion.type = KEYWORD AND campaign.id = {CAMPAIGN_ID}")
    have = set()
    for batch in svc.search_stream(customer_id=CUSTOMER_ID, query=q):
        for r in batch.results:
            kw = r.campaign_criterion.keyword
            have.add(norm(kw.text))  # any match type already covers the text
    return have


def mutate(client, rows, validate_only):
    from google.ads.googleads.errors import GoogleAdsException
    svc = client.get_service("CampaignCriterionService")
    campaign = client.get_service("CampaignService").campaign_path(CUSTOMER_ID, CAMPAIGN_ID)
    req = client.get_type("MutateCampaignCriteriaRequest")
    req.customer_id = CUSTOMER_ID
    req.validate_only = validate_only
    req.partial_failure = not validate_only
    for row in rows:
        op = client.get_type("CampaignCriterionOperation")
        c = op.create
        c.campaign = campaign
        c.negative = True
        c.keyword.text = row["text"]
        c.keyword.match_type = getattr(client.enums.KeywordMatchTypeEnum, row["match"])
        req.operations.append(op)
    try:
        resp = svc.mutate_campaign_criteria(request=req)
    except GoogleAdsException as e:
        return {"ok": False, "request_id": e.request_id,
                "errors": [f"{err.error_code} {err.message}" for err in e.failure.errors]}
    result = {"ok": True, "added": []}
    if not validate_only:
        failed = set()
        if resp.partial_failure_error and resp.partial_failure_error.message:
            result["partial_failure"] = resp.partial_failure_error.message
        for row, r in zip(rows, resp.results):
            if r.resource_name:
                result["added"].append({"text": row["text"], "match": row["match"],
                                        "resource_name": r.resource_name})
            else:
                failed.add(row["text"])
        result["failed"] = sorted(failed)
    return result


def append_log(path, approved, result):
    if not path:
        return
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    added = ", ".join(f"[{a['text']}]" if a["match"] == "EXACT" else f"\"{a['text']}\""
                      for a in result.get("added", []))
    line = (f"\n- {stamp} negatives.py apply: campaign {CAMPAIGN_ID}, "
            f"{len(result.get('added', []))} added via Google Ads API: {added or '-'}"
            f"{' (Dan approved by name)' if approved else ' (auto rule, Dan 2026-11-03)'}\n")
    with open(path, "a", encoding="utf-8") as f:
        f.write(line)


def selftest():
    T = lambda text, cat, match="EXACT": {"text": text, "category": cat, "match": match}
    cases = [
        (T("משרות פסיכולוג ירושלים", "jobs"), "auto"),
        (T("קורס פסיכותרפיה", "studies"), "auto"),
        (T("טיפול פסיכולוגי בחינם", "free"), "auto"),
        (T("פסיכיאטר ירושלים", "other_profession"), "auto"),
        (T("ד\"ר יוסי לוי", "therapist_name"), "auto"),
        (T("לוי", "therapist_name"), "needs_approval"),
        (T("נירה גבאי", "therapist_name"), "blocked"),
        (T("Nira Gabay psychotherapy", "other"), "blocked"),
        (T("קורס cbt", "studies"), "needs_approval"),
        (T("טיפול קוגניטיבי התנהגותי חינם", "free"), "needs_approval"),
        (T("משרות", "jobs", "PHRASE"), "needs_approval"),
        (T("משרות", "jobs", "BROAD"), "blocked"),
        (T("טיפול זוגי", "other"), "needs_approval"),
        (T("x" * 81, "jobs"), "blocked"),
        (T("משהו", "weird"), "blocked"),
    ]
    bad = [(c["text"], want, classify(c)[0]) for c, want in cases if classify(c)[0] != want]
    p = plan([T("משרות", "jobs"), T("משרות", "jobs"), T("קורס", "studies")],
             existing={"קורס"})
    if [r["text"] for r in p["to_send"]] != ["משרות"] or len(p["skipped"]) != 2:
        bad.append(("plan dedupe", "1 send / 2 skipped", json.dumps(p, ensure_ascii=False)))
    many = plan([T(f"משרה {i}", "jobs") for i in range(20)], existing=set())
    if len(many["to_send"]) != MAX_PER_RUN or len(many["needs_approval"]) != 20 - MAX_PER_RUN:
        bad.append(("cap", MAX_PER_RUN, len(many["to_send"])))
    appr = plan([T("קורס cbt", "studies"), T("נירה", "other")], existing=set(), approved=True)
    if [r["text"] for r in appr["to_send"]] != ["קורס cbt"] or len(appr["blocked"]) != 1:
        bad.append(("approved never sends blocked", "", json.dumps(appr, ensure_ascii=False)))
    for b in bad:
        print("FAIL", b)
    print(f"selftest: {len(cases) + 3 - len(bad)} passed, {len(bad)} failed")
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("mode", choices=["check", "apply", "selftest"])
    ap.add_argument("terms", nargs="?", help="JSON file with the term list")
    ap.add_argument("--approved", action="store_true",
                    help="Dan approved every term in this file by name in the thread")
    ap.add_argument("--log", help="append a line to this change-log file after apply")
    a = ap.parse_args()
    if a.mode == "selftest":
        sys.exit(selftest())
    if not a.terms:
        sys.exit("negatives: a terms JSON file is required")
    with open(a.terms, encoding="utf-8") as f:
        terms = json.load(f)
    client = ads_client()
    p = plan(terms, existing_negatives(client), approved=a.approved)
    report = {"mode": a.mode, "campaign": CAMPAIGN_ID, **{k: p[k] for k in p}}
    if p["to_send"]:
        check = mutate(client, p["to_send"], validate_only=True)
        report["validation"] = check
        if a.mode == "apply" and check["ok"]:
            result = mutate(client, p["to_send"], validate_only=False)
            report["result"] = result
            if result.get("added"):
                append_log(a.log, a.approved, result)
    print(json.dumps(report, ensure_ascii=False, indent=1))
    failed = report.get("validation", {}).get("ok") is False or \
        report.get("result", {}).get("ok") is False
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
