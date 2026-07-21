// MITRE ATT&CK technique roster. Wazuh doesn't expose this list; it's a
// dashboard-side concern used to lay out the coverage heatmap and the
// threat-intel technique chips. The live alert counts come from
// /api/wazuh/alerts (or /api/wazuh/mitre when that endpoint lands).
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
