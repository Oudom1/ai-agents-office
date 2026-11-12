#!/usr/bin/env python3
"""Build a static, source-backed Microsoft KB feed from MSRC CVRF releases.
This script runs in GitHub Actions, not in end-user browsers.
It never claims a KB is applicable, unsupported, or superseded for any device.
"""
import calendar
import datetime as dt
import json
import os
import re
import sys
import urllib.error
import urllib.request
from collections import defaultdict

BASE = "https://api.msrc.microsoft.com/cvrf/v3.0/cvrf/"
OUT = os.getenv("MSRC_OUTPUT", "frontend/dist/patch-analysis/microsoft-kb-updates.json")
KB_RE = re.compile(r"^(?:KB)?(\d{4,8})$", re.I)

def months_recent(count=4):
    today = dt.datetime.now(dt.timezone.utc).date()
    year, month = today.year, today.month
    for _ in range(count):
        yield f"{year}-{calendar.month_abbr[month]}"
        month -= 1
        if month == 0:
            month, year = 12, year - 1

def request_json(url):
    req = urllib.request.Request(url, headers={"Accept":"application/json", "User-Agent":"PatchAnalysisPortal/1.0"})
    with urllib.request.urlopen(req, timeout=45) as response:
        return json.load(response)

def safe_text(v):
    if isinstance(v, dict):
        return str(v.get("Value") or "")
    return str(v or "")

def parse_document(doc, release, grouped):
    product_tree = doc.get("ProductTree") or {}
    products = {}
    for obj in product_tree.get("FullProductName") or []:
        if isinstance(obj, dict):
            products[str(obj.get("ProductID"))] = safe_text(obj.get("Value"))
    seen=0
    for vuln in doc.get("Vulnerability") or []:
        if not isinstance(vuln, dict):
            continue
        cve = str(vuln.get("CVE") or "").strip().upper()
        if not re.fullmatch(r"CVE-\d{4}-\d{4,}",cve):
            continue
        for remediation in vuln.get("Remediations") or []:
            if not isinstance(remediation,dict) or str(remediation.get("Type")) not in ("2","KBArticle"):
                continue
            raw = safe_text(remediation.get("Description")).strip()
            m = KB_RE.fullmatch(raw)
            if not m:
                continue
            kb="KB"+m.group(1)
            entry=grouped.setdefault(kb,{"kb":kb,"products":set(),"cves":set(),"releases":set(),"sourceUrls":set()})
            entry["cves"].add(cve)
            entry["releases"].add(release)
            ids=remediation.get("ProductID") or []
            if isinstance(ids,str):
                ids=[ids]
            for pid in ids:
                product=products.get(str(pid))
                if product:
                    entry["products"].add(product[:180])
            url=str(remediation.get("URL") or "").strip()
            if url.startswith("https://"):
                entry["sourceUrls"].add(url)
            seen+=1
    return seen

def main():
    grouped={}
    successful=[]
    failures=[]
    for release in months_recent(4):
        try:
            doc=request_json(BASE+release)
            extracted=parse_document(doc,release,grouped)
            successful.append({"id":release,"kbReferences":extracted})
            print(f"{release}: {extracted} KB/CVE references",file=sys.stderr)
        except Exception as exc:
            failures.append({"id":release,"error":str(exc)[:140]})
            print(f"{release}: retrieval failed: {exc}",file=sys.stderr)
    rows=[]
    for row in grouped.values():
        sources=sorted(row["sourceUrls"])
        rows.append({
            "kb":row["kb"],
            "products":sorted(row["products"])[:50],
            "cves":sorted(row["cves"])[:50],
            "releases":sorted(row["releases"],reverse=True),
            "sourceUrl":sources[0] if sources else "https://www.catalog.update.microsoft.com/Search.aspx?q="+row["kb"],
            "source": "Microsoft Security Response Center CVRF",
            "classification": "Needs verification"
        })
    rows.sort(key=lambda r:(r["releases"][0] if r["releases"] else "",int(r["kb"][2:])),reverse=True)
    status="ok" if successful and rows and not failures else "partial" if successful and rows else "unavailable"
    payload={
        "source":"Microsoft Security Response Center CVRF v3.0",
        "sourceDocumentation":"https://github.com/microsoft/MSRC-Microsoft-Security-Updates-API",
        "generatedAt":dt.datetime.now(dt.timezone.utc).isoformat(),
        "status":status,
        "scope":"Security update KBs referenced in the most recent four MSRC CVRF monthly releases; not the complete Microsoft Update Catalog, driver catalog or all KB updates.",
        "releases":successful,
        "failures":failures,
        "items":rows
    }
    os.makedirs(os.path.dirname(OUT),exist_ok=True)
    with open(OUT,"w",encoding="utf-8") as fp:
        json.dump(payload,fp,ensure_ascii=False,separators=(",",":"))
    print(f"Wrote {len(rows)} distinct KB entries to {OUT} status={status}")
    # Exit successfully with a clear unavailable result so the site can explain failures.
    # The frontend must never replace an unavailable feed with fabricated records.

if __name__=="__main__":
    main()
