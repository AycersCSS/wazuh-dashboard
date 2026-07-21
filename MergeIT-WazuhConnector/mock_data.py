import time
import random


def _uid() -> str:
    return f"test-{int(time.time() * 1000)}-{random.randint(100000, 999999)}"


def _iso(ago_ms: int = 0) -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - ago_ms / 1000))


def mock_agents(params: dict | None = None) -> dict:
    uid = _uid()
    items = []
    n = random.randint(5, 8)
    for i in range(n):
        items.append({
            "id": f"{i + 1:03d}",
            "name": f"agent-{uid}-{i + 1}",
            "ip": f"192.168.1.{100 + i}",
            "status": "active" if i % 3 == 0 else ("disconnected" if i % 3 == 1 else "pending"),
            "version": "Wazuh v4.9.0",
            "os": {"name": "Windows 11", "version": "23H2", "arch": "x86_64"},
            "lastKeepAlive": _iso(random.randint(0, 3_600_000)),
            "group": ["default", "windows"] if i % 2 == 0 else ["default"],
            "region": "eu-west-1",
            "manager": "wazuh-manager",
        })
    return {"data": {"affected_items": items, "total_affected_items": len(items)}, "error": 0, "testRun": uid}


def mock_agents_status_count() -> dict:
    uid = _uid()
    return {
        "active": 38 + random.randint(0, 5),
        "disconnected": 5 + random.randint(0, 3),
        "pending": 3 + random.randint(0, 2),
        "never_connected": 1,
        "testRun": uid,
        "timestamp": _iso(),
    }


def mock_alerts(limit: int = 100, time_range: str = "7d") -> dict:
    uid = _uid()
    n = min(limit, random.randint(6, 10))
    critical, high, warning = [], [], []
    for i in range(n):
        level = 14 if i % 3 == 0 else (12 if i % 3 == 1 else 7)
        alert = {
            "id": f"alert-{uid}-{i + 1}",
            "timestamp": _iso(random.randint(0, 86_400_000)),
            "rule": {
                "id": str(100000 + i),
                "level": level,
                "description": f"Test alert {uid}-{i + 1}",
                "groups": ["test", "syscheck"],
                "mitre": {"id": "T1059", "tactic": "Execution", "technique": "Command and Scripting Interpreter"} if i % 2 == 0 else None,
            },
            "agent": {
                "id": f"{(i % 5) + 1:03d}",
                "name": f"agent-{uid}-{(i % 5) + 1}",
                "ip": f"192.168.1.{100 + (i % 5)}",
            },
            "data": {"srcip": f"10.0.0.{i + 1}", "dstip": f"192.168.1.{50 + i}"},
            "location": f"/var/log/secure",
        }
        if level >= 14:
            critical.append(alert)
        elif level >= 12:
            high.append(alert)
        else:
            warning.append(alert)
    return {"critical": critical, "high": high, "warning": warning, "total": n, "testRun": uid}


def mock_vulnerabilities(params: dict | None = None) -> dict:
    uid = _uid()
    n = random.randint(6, 10)
    items = []
    for i in range(n):
        sevs = ["critical", "high", "medium", "low"]
        sev = sevs[i % 4]
        items.append({
            "cve": f"CVE-2024-{10000 + i + random.randint(1, 99)}",
            "title": f"Test Vulnerability {uid}-{i + 1}",
            "package": f"test-package-{i + 1}",
            "version": f"1.{i}.{random.randint(0, 99)}",
            "severity": sev,
            "cvss": float(round(9.0 - (i % 4) * 1.5, 1)),
            "agentCount": random.randint(1, 5),
            "fixedVersion": f"1.{i}.{random.randint(100, 199)}",
            "publishedAt": _iso(random.randint(0, 86_400_000 * 30)),
        })
    return {"data": {"affected_items": items, "total_affected_items": len(items)}, "error": 0, "testRun": uid}


def mock_fim(params: dict | None = None) -> dict:
    uid = _uid()
    n = random.randint(5, 8)
    actions = ["modified", "added", "deleted"]
    items = []
    for i in range(n):
        items.append({
            "id": f"syscheck-{uid}-{i + 1}",
            "path": f"C:\\Windows\\System32\\test-{i + 1}.dll",
            "type": "file",
            "action": actions[i % 3],
            "user": "SYSTEM" if i % 2 == 0 else "Administrator",
            "size": random.randint(1024, 500_000),
            "timestamp": _iso(random.randint(0, 86_400_000)),
            "mtime": _iso(random.randint(0, 86_400_000)),
            "md5": f"md5-{uid}-{i + 1}",
            "sha1": f"sha1-{uid}-{i + 1}",
            "sha256": f"sha256-{uid}-{i + 1}",
            "agent": {"id": f"{(i % 5) + 1:03d}", "name": f"agent-{(i % 5) + 1}"},
        })
    return {"data": {"affected_items": items, "total_affected_items": len(items)}, "error": 0, "testRun": uid}


def mock_rules(params: dict | None = None) -> dict:
    uid = _uid()
    n = random.randint(8, 12)
    items = []
    for i in range(n):
        items.append({
            "id": str(100000 + i),
            "level": (i % 15) + 1,
            "description": f"Test rule {uid}-{i + 1}",
            "groups": ["test", "syscheck"],
            "status": "enabled" if i % 4 != 0 else "disabled",
            "modified": _iso(random.randint(0, 86_400_000 * 7)),
            "hits24h": random.randint(0, 500),
        })
    return {"data": {"affected_items": items, "total_affected_items": len(items)}, "error": 0, "testRun": uid}


def mock_compliance(framework: str, params: dict | None = None) -> dict:
    uid = _uid()
    n = 4
    items = []
    for i in range(n):
        passed = i % 2 == 0
        items.append({
            "id": f"compliance-{uid}-{i + 1}",
            "title": f"Test Compliance Check {i + 1}",
            "status": "passed" if passed else "failed",
            "description": f"Compliance test item {i + 1}",
            "requirement": f"REQ-{1000 + i}",
            "control": f"CTRL-{i + 1}",
            "pass": 8 if passed else 3,
            "fail": 0 if passed else 2,
            "total": 8 if passed else 5,
        })
    return {"data": {"affected_items": items, "total_affected_items": len(items)}, "error": 0, "testRun": uid}


def mock_logs(params: dict | None = None) -> dict:
    uid = _uid()
    n = random.randint(15, 25)
    items = []
    for i in range(n):
        lvl = "error" if i % 4 == 0 else ("warning" if i % 4 == 1 else "info")
        items.append({
            "id": f"log-{uid}-{i + 1}",
            "timestamp": _iso(i * 60_000),
            "level": lvl,
            "severity": "high" if lvl == "error" else ("medium" if lvl == "warning" else "info"),
            "message": f"Test log entry {i + 1}: System check completed",
            "component": "wazuh-manager",
            "source": "wazuh-manager",
            "agent": "manager",
        })
    return {"data": {"affected_items": items, "total_affected_items": len(items)}, "error": 0, "testRun": uid}


def mock_manager() -> dict:
    uid = _uid()
    return {
        "manager": f"wazuh-manager-{uid}",
        "workers": {"active": 4 + random.randint(0, 2), "total": 4 + random.randint(0, 2)},
        "indexer": {"name": f"wazuh-indexer-{uid}", "version": "4.9.0"},
        "apiLatencyP95Ms": 42 + random.randint(0, 50),
        "testRun": uid,
    }


def mock_tenants() -> dict:
    # Stable IDs so displayNameFor / tierFor map correctly
    return {"tenants": ["acme-corp", "globex-inc", "initech", "stark-industries"]}


def mock_threat_actors() -> dict:
    uid = _uid()
    return {
        "actors": [
            {
                "id": f"actor-{uid}-1",
                "name": "APT Demo-1",
                "origin": "Unknown",
                "targetSectors": ["Finance", "Healthcare"],
                "ttps": ["T1059", "T1078", "T1021"],
                "observed24h": random.randint(1, 12),
            },
            {
                "id": f"actor-{uid}-2",
                "name": "APT Demo-2",
                "origin": "Eastern Europe",
                "targetSectors": ["Manufacturing", "Energy"],
                "ttps": ["T1566", "T1055"],
                "observed24h": random.randint(0, 8),
            },
            {
                "id": f"actor-{uid}-3",
                "name": "APT Demo-3",
                "origin": "Global",
                "targetSectors": ["Technology"],
                "ttps": ["T1190", "T1486"],
                "observed24h": random.randint(0, 5),
            },
        ],
        "total": 3,
        "testRun": uid,
    }


def mock_integrations(integration_id: str) -> dict:
    uid = _uid()
    names = {
        "microsoft-365": ("Microsoft 365", "Microsoft Graph API"),
        "ninjaone": ("NinjaOne", "NinjaOne RMM API"),
        "bitdefender": ("Bitdefender", "GravityZone API"),
        "cyber-essentials": ("Cyber Essentials Plus", "MergeIT evidence pack"),
        "customer-portal": ("Customer Portal", "MergeIT portal API"),
    }
    name, vendor = names.get(integration_id, (integration_id.replace("-", " ").title(), "Demo Vendor"))
    return {
        "id": integration_id,
        "name": name,
        "vendor": vendor,
        "status": "Connected",
        "lastSyncAt": _iso(90_000),
        "kpis": [
            {"label": "Synced", "value": str(150 + random.randint(0, 50)), "trend": "up"},
            {"label": "Events (24h)", "value": str(1200 + random.randint(0, 200)), "trend": "up"},
            {"label": "Errors", "value": str(random.randint(0, 3)), "trend": "down"},
        ],
        "recent": [
            {
                "id": f"evt-{uid}-{i + 1}",
                "time": _iso((i + 1) * 3_600_000),
                "timestamp": _iso((i + 1) * 3_600_000),
                "severity": "info" if i % 2 == 0 else "medium",
                "tenant": "acme-corp",
                "primary": f"user-{i + 1}@acme.example",
                "description": f"Demo event {i + 1} for {name}",
                "title": f"Demo event {i + 1}",
                "wazuhRuleId": str(91000 + i),
                "type": "event",
            }
            for i in range(4)
        ],
        "healthMetrics": [
            {"label": "Status", "value": f"Demo mode · {uid}", "tone": "ok"},
            {"label": "Latency p95", "value": f"{40 + random.randint(0, 40)} ms", "tone": "ok"},
        ],
        "testRun": uid,
    }
