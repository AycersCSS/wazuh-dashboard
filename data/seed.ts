import type {
  Agent, Alert, ComplianceControl, FimEvent, KpiSummary, Rule, Vulnerability
} from "@/types";

// Deterministic pseudo-random so server/client renders match.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20240622);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const regions = ["us-east-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1", "ap-northeast-1"];
const osTemplates = [
  { name: "Ubuntu", versions: ["20.04", "22.04", "24.04"] },
  { name: "Debian", versions: ["11", "12"] },
  { name: "RHEL",   versions: ["8.8", "9.3"] },
  { name: "CentOS", versions: ["7.9", "8.5"] },
  { name: "Amazon Linux", versions: ["2", "2023"] },
  { name: "Windows Server", versions: ["2019", "2022"] },
  { name: "macOS", versions: ["13.6", "14.5"] }
];
const groups = ["default", "web-servers", "db-servers", "workstations", "kubernetes", "dmz", "compliance-pci", "cloud-aws"];
export const mitreTactics = [
  { id: "TA0001", tactic: "Initial Access",     techniques: ["T1190", "T1566.001", "T1078"] },
  { id: "TA0002", tactic: "Execution",          techniques: ["T1059.004", "T1204.002", "T1047"] },
  { id: "TA0003", tactic: "Persistence",        techniques: ["T1543", "T1547", "T1098"] },
  { id: "TA0005", tactic: "Defense Evasion",    techniques: ["T1070.004", "T1027", "T1562.001"] },
  { id: "TA0006", tactic: "Credential Access",  techniques: ["T1110.003", "T1003.001", "T1555"] },
  { id: "TA0007", tactic: "Discovery",          techniques: ["T1083", "T1057", "T1087.002"] },
  { id: "TA0008", tactic: "Lateral Movement",   techniques: ["T1021.001", "T1021.002", "T1570"] },
  { id: "TA0010", tactic: "Exfiltration",       techniques: ["T1041", "T1567.002", "T1052.001"] },
  { id: "TA0011", tactic: "Command and Control",techniques: ["T1071.001", "T1090.003", "T1572"] }
];
const ruleTemplates = [
  { desc: "SSH brute force attempt blocked",            groups: ["authentication", "ssh"] },
  { desc: "Suspicious PowerShell encoded command",      groups: ["windows", "powershell"] },
  { desc: "Linux kernel module loaded",                 groups: ["linux", "integrity"] },
  { desc: "Outbound connection to known C2",            groups: ["network", "c2"] },
  { desc: "Multiple failed logins for root",            groups: ["authentication", "pam"] },
  { desc: "Modification of /etc/passwd",                groups: ["fim", "linux"] },
  { desc: "AWS IAM policy attached to role",            groups: ["cloud", "aws"] },
  { desc: "Sudoers file changed",                       groups: ["fim", "privileges"] },
  { desc: "Web server 4xx spike from single IP",        groups: ["web", "nginx"] },
  { desc: "New SUID binary detected",                   groups: ["linux", "integrity"] },
  { desc: "DNS query for known DGA family",             groups: ["network", "dns"] },
  { desc: "User added to privileged group",             groups: ["authentication", "windows"] },
  { desc: "Process spawned from /tmp",                  groups: ["linux", "execution"] },
  { desc: "Kubernetes secret read by workload",         groups: ["k8s", "cloud"] },
  { desc: "TLS certificate about to expire",            groups: ["integrity", "tls"] }
];
const decoders = [
  { name: "sshd",     parent: "auth"   },
  { name: "sudo",     parent: "pam"    },
  { name: "nginx-access", parent: "web" },
  { name: "auditd",   parent: "linux"  },
  { name: "powershell", parent: "windows" },
  { name: "kubelet",  parent: "k8s"    }
];
const locations = [
  "/var/log/secure", "/var/log/auth.log", "/var/log/audit/audit.log",
  "C:\\\\Windows\\\\System32\\\\winevt\\\\Logs\\\\Security.evtx",
  "/var/log/nginx/access.log", "/var/log/syslog",
  "/var/log/kubelet.log", "/var/log/wazuh/archives/archives.log"
];

// ----- Agents -----
export const agents: Agent[] = Array.from({ length: 64 }, (_, i) => {
  const os = pick(osTemplates);
  const status: Agent["status"] =
    i < 48 ? "active" : i < 58 ? "disconnected" : i < 62 ? "pending" : "never_connected";
  const lastKeepAlive = new Date(Date.now() - (status === "active" ? between(2, 90) : between(1800, 86400)) * 1000);
  return {
    id: String(100 + i).padStart(4, "0"),
    name: `${os.name.toLowerCase().replace(/\s+/g, "-")}-${String(i).padStart(3, "0")}`,
    ip: `${10}.${between(0, 4)}.${between(1, 254)}.${between(2, 254)}`,
    os: { name: os.name, version: pick(os.versions), arch: rand() > 0.7 ? "arm64" : "x86_64" },
    group: Array.from(new Set([pick(groups), pick(groups)])),
    status,
    lastKeepAlive: lastKeepAlive.toISOString(),
    version: "4.9.0",
    region: pick(regions),
    manager: rand() > 0.5 ? "manager-prod-01" : "manager-prod-02"
  };
});

// ----- Alerts -----
const mitreLookup: Record<string, { id: string; tactic: string; technique: string }> = {};
mitreTactics.forEach(t => t.techniques.forEach(tech => {
  mitreLookup[tech] = { id: t.id, tactic: t.tactic, technique: tech };
}));

export const alerts: Alert[] = Array.from({ length: 220 }, (_, i) => {
  const rule = ruleTemplates[i % ruleTemplates.length];
  const level = (between(2, 15) as any);
  const ag = pick(agents);
  const tech = pick(mitreTactics).techniques[0];
  const ts = new Date(Date.now() - i * between(45, 600) * 1000);
  return {
    id: `EVT-${(1_000_000 + i).toString(16).toUpperCase()}`,
    timestamp: ts.toISOString(),
    rule: {
      id: `5${between(1000, 9999)}`,
      level,
      description: rule.desc,
      groups: rule.groups,
      mitre: rand() > 0.35 ? mitreLookup[tech] : undefined
    },
    agent: { id: ag.id, name: ag.name, ip: ag.ip },
    location: pick(locations),
    decoder: pick(decoders),
    data: { srcip: `${between(1,254)}.${between(0,254)}.${between(0,254)}.${between(1,254)}` },
    acknowledged: rand() > 0.85
  };
});

// ----- Vulnerabilities -----
const cveSeeds = [
  ["CVE-2024-3094", "XZ Utils backdoor (liblzma)", "liblzma5", "5.6.0", "5.6.1"],
  ["CVE-2024-21413","Microsoft Outlook RCE",      "outlook",   "16.0",  "16.0.1"],
  ["CVE-2023-44487","HTTP/2 Rapid Reset DoS",     "nginx",     "1.24.0","1.25.3"],
  ["CVE-2024-1086", "Linux kernel netfilter UAF",  "linux",     "6.6.0", "6.6.15"],
  ["CVE-2024-21626","runc fd leak container esc.", "runc",      "1.1.11","1.1.12"],
  ["CVE-2023-50164","Apache Struts file upload",   "struts2-core","2.5.30","2.5.33"],
  ["CVE-2024-6387", "OpenSSH regreSSHion",         "openssh",   "8.5p1","9.8p1"],
  ["CVE-2024-27198","TeamCity auth bypass",        "teamcity",  "2023.11","2023.11.3"],
  ["CVE-2024-21893","Ivanti Connect Secure cmd inj.","ivanti", "22.7R1", null],
  ["CVE-2024-1709", "ConnectWise ScreenConnect auth bypass","screenconnect","23.9.8","23.9.9"],
  ["CVE-2024-2879", "GLPI SQL injection",          "glpi",      "10.0.14","10.0.15"],
  ["CVE-2024-23222","WebKit type confusion",       "webkit",    "17.3",  "17.4"]
];
const sevMap: Vulnerability["severity"][] = ["critical","high","high","medium","low"];

export const vulnerabilities: Vulnerability[] = cveSeeds.map((row, i) => {
  const [cve, title, pkg, ver, fix] = row as [string, string, string, string, string | null];
  return {
    cve,
    title,
    package: pkg,
    version: ver,
    fixedVersion: fix ?? undefined,
    severity: sevMap[i % sevMap.length],
    cvss: 9.8 - (i * 0.4) % 5,
    agentCount: between(2, 38),
    publishedAt: new Date(Date.now() - between(1, 180) * 86400 * 1000).toISOString()
  };
});

// ----- Compliance -----
export const compliance: ComplianceControl[] = [
  { framework: "PCI DSS",  control: "1.2.1",  title: "Configuration standards for network security controls", pass: 38, fail: 4,  total: 42 },
  { framework: "PCI DSS",  control: "2.2.4",  title: "Only necessary services, protocols, daemons enabled",     pass: 51, fail: 2,  total: 53 },
  { framework: "PCI DSS",  control: "8.3.1",  title: "Strong cryptography for authentication credentials",      pass: 60, fail: 7,  total: 67 },
  { framework: "HIPAA",    control: "164.312(a)(1)", title: "Access control — unique user identification",        pass: 28, fail: 3,  total: 31 },
  { framework: "HIPAA",    control: "164.312(b)",   title: "Audit controls",                                  pass: 19, fail: 1,  total: 20 },
  { framework: "GDPR",     control: "Art. 32",      title: "Security of processing",                          pass: 41, fail: 5,  total: 46 },
  { framework: "NIST 800-53", control: "AC-2",     title: "Account management",                                pass: 22, fail: 2,  total: 24 },
  { framework: "NIST 800-53", control: "SI-4",     title: "Information system monitoring",                     pass: 33, fail: 6,  total: 39 },
  { framework: "ISO 27001",  control: "A.9.2.3",  title: "Management of privileged access rights",             pass: 26, fail: 1,  total: 27 },
  { framework: "ISO 27001",  control: "A.12.4.1", title: "Event logging",                                     pass: 44, fail: 3,  total: 47 }
];

// ----- Rules -----
export const rules: Rule[] = Array.from({ length: 36 }, (_, i) => {
  const tmpl = ruleTemplates[i % ruleTemplates.length];
  return {
    id: `5${(1000 + i * 17).toString()}`,
    description: tmpl.desc,
    level: (between(2, 15) as any),
    groups: tmpl.groups,
    status: i % 9 === 0 ? "disabled" : "enabled",
    modified: new Date(Date.now() - between(1, 90) * 86400 * 1000).toISOString(),
    hits24h: between(0, 14_500)
  };
});

// ----- FIM -----
export const fimEvents: FimEvent[] = Array.from({ length: 60 }, (_, i) => {
  const ag = pick(agents.filter(a => a.status === "active"));
  const paths = ["/etc/passwd", "/etc/sudoers", "/etc/ssh/sshd_config", "/usr/bin/", "/var/www/html/index.php", "C:\\\\Windows\\\\System32\\\\drivers\\\\etc\\\\hosts"];
  return {
    id: `FIM-${(800_000 + i).toString(16).toUpperCase()}`,
    timestamp: new Date(Date.now() - i * between(120, 1500) * 1000).toISOString(),
    agent: ag.name,
    path: pick(paths),
    action: pick(["modified", "added", "deleted"] as const),
    user: pick(["root", "admin", "svc-deploy", "www-data", "ubuntu"]),
    size: between(120, 82_000)
  };
});

// ----- KPI summary -----
export const kpi: KpiSummary = (() => {
  const active = agents.filter(a => a.status === "active").length;
  const disconnected = agents.filter(a => a.status === "disconnected").length;
  return {
    agentsTotal: agents.length,
    agentsActive: active,
    agentsDisconnected: disconnected,
    alerts24h: alerts.length,
    alertsCritical: alerts.filter(a => a.rule.level >= 13).length,
    vulnsOpen: vulnerabilities.reduce((s, v) => s + v.agentCount, 0),
    complianceScore:
      compliance.reduce((s, c) => s + c.pass, 0) /
      compliance.reduce((s, c) => s + c.total, 0),
    mitreTechniquesObserved: new Set(alerts.filter(a => a.rule.mitre).map(a => a.rule.mitre!.technique)).size,
    eventsPerSecond: 1284
  };
})();

// ----- 24h alert timeline (per hour) -----
export const alertTimeline = Array.from({ length: 24 }, (_, h) => {
  const total = between(35, 220);
  const critical = Math.round(total * (0.04 + rand() * 0.07));
  const high     = Math.round(total * (0.10 + rand() * 0.08));
  const medium   = Math.round(total * (0.18 + rand() * 0.10));
  const low      = total - critical - high - medium;
  return { hour: `${String(h).padStart(2, "0")}:00`, critical, high, medium, low };
});

// ----- Threat Intel -----
export interface ThreatActor {
  id: string;
  name: string;
  origin: string;
  targetSectors: string[];
  ttps: string[]; // technique IDs
  observed24h: number;
}

export const threatActors: ThreatActor[] = [
  { id: "TA-001", name: "Volt Typhoon",       origin: "China",         targetSectors: ["Energy", "Communications"], ttps: ["T1190", "T1078", "T1027"],     observed24h: 14 },
  { id: "TA-002", name: "Scattered Spider",   origin: "Unknown",       targetSectors: ["Telco", "Hospitality"],      ttps: ["T1566.001", "T1078", "T1003"],  observed24h: 9  },
  { id: "TA-003", name: "APT29",              origin: "Russia",        targetSectors: ["Government", "Healthcare"], ttps: ["T1071.001", "T1027", "T1543"],   observed24h: 6  },
  { id: "TA-004", name: "Lazarus Group",      origin: "North Korea",   targetSectors: ["Finance", "Crypto"],         ttps: ["T1567.002", "T1059.004"],         observed24h: 3  },
  { id: "TA-005", name: "FIN7",               origin: "Unknown",       targetSectors: ["Retail", "Hospitality"],     ttps: ["T1059.001", "T1027", "T1547"],   observed24h: 11 },
  { id: "TA-006", name: "OilRig",             origin: "Iran",          targetSectors: ["Government", "Energy"],      ttps: ["T1071.001", "T1505"],             observed24h: 4  },
  { id: "TA-007", name: "Magecart",           origin: "Unknown",       targetSectors: ["Retail", "E-commerce"],      ttps: ["T1059.007", "T1557"],             observed24h: 7  },
  { id: "TA-008", name: "TA505",              origin: "Unknown",       targetSectors: ["Finance"],                   ttps: ["T1486", "T1489"],                 observed24h: 2  },
  { id: "TA-009", name: "Kimsuky",            origin: "North Korea",   targetSectors: ["Government", "Think tanks"], ttps: ["T1566.001", "T1071.001"],          observed24h: 5  }
];

// ----- Top countries (geolocation) -----
export const geoTop = [
  { country: "United States", code: "US", events: 2410, lat: 38,  lng: -97  },
  { country: "Germany",       code: "DE", events: 1180, lat: 51,  lng: 9    },
  { country: "Brazil",        code: "BR", events:  742, lat: -14, lng: -51  },
  { country: "China",         code: "CN", events:  691, lat: 35,  lng: 105  },
  { country: "United Kingdom",code: "GB", events:  512, lat: 55,  lng: -3   },
  { country: "India",         code: "IN", events:  488, lat: 20,  lng: 78   },
  { country: "Russia",        code: "RU", events:  401, lat: 60,  lng: 100  },
  { country: "Japan",         code: "JP", events:  338, lat: 36,  lng: 138  },
  { country: "Australia",     code: "AU", events:  291, lat: -25, lng: 134  },
  { country: "South Africa",  code: "ZA", events:  198, lat: -29, lng: 25   }
];
