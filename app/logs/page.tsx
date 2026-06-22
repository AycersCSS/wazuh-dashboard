"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, Search, Pause, Play, Download, Filter, ChevronRight, Info, AlertTriangle, XCircle } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import { useToasts } from "@/hooks/useToasts";

type LogLine = { ts: string; level: "info"|"warn"|"error"|"debug"|"fatal"; src: string; msg: string };

const baseLogs: LogLine[] = [
  { ts: "2026-06-22T02:14:38Z", level: "info",  src: "wazuh-modulesd",  msg: "Vulnerability detector scan completed in 41.2s (412 packages)." },
  { ts: "2026-06-22T02:14:21Z", level: "info",  src: "wazuh-monitord",  msg: "Daily report generated: 1,284 events processed." },
  { ts: "2026-06-22T02:13:55Z", level: "warn",  src: "wazuh-db",        msg: "Reindexing completed with 1,204 updated entries." },
  { ts: "2026-06-22T02:13:11Z", level: "error", src: "wazuh-integratord", msg: "VirusTotal API rate limit reached; queueing 8 jobs." },
  { ts: "2026-06-22T02:12:48Z", level: "info",  src: "wazuh-apid",      msg: "API request from 10.0.4.21 GET /agents?status=active (38ms)." },
  { ts: "2026-06-22T02:12:02Z", level: "debug", src: "wazuh-analysisd", msg: "Decoder chain matched: sshd -> system -> authentication" },
  { ts: "2026-06-22T02:11:39Z", level: "info",  src: "wazuh-syscheckd", msg: "FIM baseline locked on agent 0102 (1,418 files)." },
  { ts: "2026-06-22T02:10:51Z", level: "warn",  src: "wazuh-modulesd",  msg: "AWS SQS polling exceeded 800ms threshold (avg 812ms)." },
  { ts: "2026-06-22T02:10:08Z", level: "info",  src: "wazuh-remoted",   msg: "Shared configuration merged for group 'web-servers'." }
];

const levelMeta = {
  debug: { color: "text-muted",    Icon: Info },
  info:  { color: "text-info",     Icon: Info },
  warn:  { color: "text-medium",   Icon: AlertTriangle },
  error: { color: "text-critical", Icon: XCircle },
  fatal: { color: "text-critical", Icon: XCircle }
} as const;

type Level = keyof typeof levelMeta;
const allLevels: Level[] = ["debug","info","warn","error","fatal"];

export default function LogsPage() {
  const toasts = useToasts();
  const [paused, setPaused] = useState(false);
  const [q, setQ] = useState("");
  const [activeLevels, setActiveLevels] = useState<Set<Level>>(new Set(allLevels));
  const [stream, setStream] = useState<LogLine[]>(() => [...baseLogs]);
  const tailRef = useRef<HTMLDivElement>(null);

  // Simulated live tail
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      const sources = ["wazuh-modulesd","wazuh-apid","wazuh-analysisd","wazuh-syscheckd","wazuh-monitord","wazuh-db"];
      const levels: Level[] = ["info","info","info","debug","warn","error"];
      const msgs = [
        "Decoder chain matched: auditd -> linux",
        "FIM diff computed in 14ms for 248 files",
        "Indexer shard rebalanced (3 → 4 primary)",
        "API key rotated for service 'wazuh-svc'",
        "Agent 0142 reported keepalive (4.9.0)"
      ];
      const next = {
        ts: new Date().toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        src: sources[Math.floor(Math.random() * sources.length)],
        msg: msgs[Math.floor(Math.random() * msgs.length)]
      };
      setStream(curr => [next, ...curr].slice(0, 200));
    }, 2500);
    return () => window.clearInterval(id);
  }, [paused]);

  // auto-scroll to top when not paused
  useEffect(() => {
    if (!paused && tailRef.current) tailRef.current.scrollTop = 0;
  }, [stream, paused]);

  const filtered = stream.filter(l =>
    activeLevels.has(l.level as Level) &&
    (!q.trim() || l.msg.toLowerCase().includes(q.toLowerCase()) || l.src.toLowerCase().includes(q.toLowerCase()))
  );

  function toggleLevel(l: Level) {
    const s = new Set(activeLevels);
    if (s.has(l)) s.delete(l); else s.add(l);
    setActiveLevels(s);
  }

  function exportLogs() {
    const txt = filtered.map(l => `${l.ts} [${l.level.toUpperCase()}] ${l.src}: ${l.msg}`).join("\n");
    const url = URL.createObjectURL(new Blob([txt], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = `wazuh-${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.log`;
    a.click(); URL.revokeObjectURL(url);
    toasts.push({ variant: "success", title: `Exported ${filtered.length} log lines` });
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-muted font-mono uppercase tracking-wider">
            <span className="text-signal-400">Configure</span><span>·</span><span>Logs</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight">Log viewer</h1>
          <p className="text-[12.5px] text-muted">Live tail of manager logs. Filter, search, and export.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { setPaused(p => !p); toasts.push({ variant: "info", title: paused ? "Tail resumed" : "Tail paused", duration: 1500 }); }} className="btn">
            {paused ? <Play size={12} /> : <Pause size={12} />}{paused ? "Resume tail" : "Pause tail"}
          </button>
          <button className="btn" onClick={exportLogs}><Download size={12} />Export</button>
        </div>
      </header>

      <Card padded={false}
        header={
          <>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-primary truncate">
                <span className="flex items-center gap-2"><FileText size={12} className="text-muted" />manager · /var/ossec/logs/ossec.log</span>
              </div>
              <div className="text-[11px] text-muted truncate">{paused ? "Tail paused" : "Tailing live…"}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {allLevels.map(l => (
                  <button type="button" key={l} onClick={() => toggleLevel(l)} className={cn("chip cursor-pointer uppercase text-[10px]", activeLevels.has(l) && (l === "error" || l === "fatal" ? "bg-sev-critical" : l === "warn" ? "bg-sev-medium" : l === "info" ? "bg-sev-info" : ""))}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="relative w-[280px]">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input className="input" placeholder="grep /search…" value={q} onChange={e => setQ(e.target.value)} />
              </div>
            </div>
          </>
        }
      >
        <div ref={tailRef} className="font-mono text-[11.5px] leading-[1.6] surface-2 border-t border-soft max-h-[64vh] overflow-y-auto">
          {filtered.map((l, i) => {
            const M = levelMeta[l.level as Level];
            return (
              <div key={`${l.ts}-${i}`} className="flex items-start gap-2 px-3 py-1 hover:surface-3 border-b border-soft">
                <span className="text-muted shrink-0 w-[68px]">{formatTime(l.ts)}</span>
                <span className={cn("uppercase w-[44px] shrink-0 font-semibold text-[10.5px]", M.color)}>{l.level}</span>
                <span className="text-signal-300 w-[160px] shrink-0 truncate">{l.src}</span>
                <span className="text-secondary flex-1">{l.msg}</span>
                <button type="button"
                  onClick={() => { navigator.clipboard?.writeText(`${l.ts} [${l.level}] ${l.src}: ${l.msg}`); toasts.push({ variant: "success", title: "Log line copied", duration: 1500 }); }}
                  className="btn btn-sm btn-icon btn-ghost shrink-0"
                ><ChevronRight size={11} /></button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-4 py-12 text-center text-muted">No log lines match the current filters.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
