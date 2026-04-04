'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Play, RefreshCw, XCircle, AlertTriangle, Smartphone, CheckCircle2,
  Zap, Shield, Network, Brain, ExternalLink, Ban, Eye,
  ChevronDown, ChevronUp, Timer, Info, Sparkles,
  PlayCircle, Cpu, BarChart3, BookOpen, FlaskConical, ArrowRight, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─── Types ────────────────────────────────────────────────────────────────────
type UCGroup = 'A' | 'B' | 'C' | 'D' | 'E';

interface UseCase {
  id: string; group: UCGroup; title: string; description: string; persona: string;
  expectedDecision: string; apiEndpoint: string; navigateTo?: string; navigateLabel?: string;
  payload?: Record<string, unknown>;
  apiMode?: 'score' | 'alert' | 'case' | 'explain' | 'report' | 'dashboard' | 'knowledge';
  alertId?: string; caseId?: string;
  whatToLookFor?: string;
}

interface UCResult {
  state: 'idle' | 'loading' | 'done' | 'error';
  decision?: string; score?: number; reason_codes?: string[]; explanation?: string;
  pre_txn_id?: string; narrative?: string; steps?: string[];
  durationMs?: number; apiCalled?: string; error?: string; rawSummary?: string;
}

interface CustomForm {
  scenario_description: string; from_account: string; to_account: string;
  amount: string; txn_type: string; channel: string; device_known: string;
  ip_address: string; geo_location: string; ai_narrative?: string;
}

// ─── 34 Use Cases ─────────────────────────────────────────────────────────────
const USE_CASES: UseCase[] = [
  // ── Group A: Pre-Transaction Prevention ─────────────────────────────────────
  {
    id: 'UC-01', group: 'A',
    title: 'Behavioral Risk Scoring',
    description: 'The system computes a real-time risk score before any money moves, using 5 weighted signal dimensions: amount anomaly (how far this transaction deviates from the account\'s average), time anomaly (is it outside normal hours?), device risk (is this a trusted device?), beneficiary risk (is the receiver flagged?), and graph/network risk (are there circular patterns?). The score determines whether Chakravyuh approves, blocks, requests MFA, or sends for manual analyst review — all in milliseconds, before bank settlement.',
    persona: '👤 Ravi Kumar — retail UPI user, average ₹5K–₹20K. Now initiating ₹75,000 UPI to a known beneficiary from a trusted device at 11 AM from Mumbai. Moderate amount deviation of ~5x.',
    expectedDecision: 'mfa',
    apiEndpoint: 'POST /api/transactions/score',
    navigateTo: '/analyst/pre-txn-analytics', navigateLabel: 'View in Pre-Txn Analytics',
    apiMode: 'score',
    whatToLookFor: 'Watch for score 30–60 → MFA decision. Amount slightly elevated but device trusted.',
    payload: { from_account: 'ACC-UC01', to_account: 'ACC-BENE-01', amount: 75000, txn_type: 'UPI', channel: 'mobile', device_known: true, ip_address: '117.192.44.3', geo_location: 'Mumbai', currency: 'INR' },
  },
  {
    id: 'UC-02', group: 'A',
    title: 'Device Intelligence & High-Risk IP',
    description: 'Device fingerprinting is one of the most reliable fraud signals. The system checks whether the current device ID is in the account\'s registered device registry. An unknown device combined with a high-risk IP range (such as Tor exit nodes, known fraud infrastructure IPs like 185.x.x.x) dramatically increases the risk score. Here, a first-time mobile banking session originates from an IP used in previous fraud cases, with a brand-new unregistered device — triggering an immediate BLOCK.',
    persona: '👤 Meera Joshi — account opened 2 months ago, zero mobile banking history. Attempting ₹4.5L NEFT to an unknown HDFC account from device DEV-NEW-99 (not registered), IP 185.220.101.55 (Tor exit node, high-risk classification), from Delhi when account is registered in Chennai.',
    expectedDecision: 'block',
    apiEndpoint: 'POST /api/transactions/score',
    navigateTo: '/analyst/pre-txn-analytics', navigateLabel: 'View in Pre-Txn Analytics',
    apiMode: 'score',
    whatToLookFor: 'Score ≥80 → BLOCK. Look for reason codes: HIGH_RISK_IP, NEW_DEVICE, AMOUNT_DEVIATION.',
    payload: { from_account: 'ACC-UC02', to_account: 'ACC-BENE-02', amount: 450000, txn_type: 'NEFT', channel: 'mobile', device_known: false, ip_address: '185.220.101.55', geo_location: 'Delhi', currency: 'INR' },
  },
  {
    id: 'UC-03', group: 'A',
    title: 'Low-Risk Transaction Approval',
    description: 'Not every transaction is risky — the system must accurately approve legitimate transactions to avoid false positives that harm customer experience. This use case demonstrates a monthly corporate payroll credit: the amount is within the account\'s normal range, the device is registered and trusted, the IP is a known corporate network in Bangalore, the time is within business hours (9:30 AM), and the beneficiary account has received salary credits before. All 5 signals score low, resulting in auto-approval without any friction.',
    persona: '👤 Sanjay Patel — corporate employee, receives ₹95,000 salary via NEFT every month from ACC-CORP-PAY (payroll account). Trusted device, registered IP, business hours, known beneficiary.',
    expectedDecision: 'approve',
    apiEndpoint: 'POST /api/transactions/score',
    navigateTo: '/analyst/pre-txn-analytics', navigateLabel: 'View in Pre-Txn Analytics',
    apiMode: 'score',
    whatToLookFor: 'Score <30 → APPROVE. Minimal or no reason codes. All 5 signals within baseline.',
    payload: { from_account: 'ACC-CORP-PAY', to_account: 'ACC-UC03', amount: 95000, txn_type: 'NEFT', channel: 'net_banking', device_known: true, ip_address: '103.21.58.12', geo_location: 'Bangalore', currency: 'INR' },
  },
  {
    id: 'UC-04', group: 'A',
    title: 'Extreme Amount Anomaly Detection',
    description: 'The amount anomaly signal computes the deviation ratio: (current amount ÷ account\'s 90-day average). An account with a ₹8,000 average suddenly attempting a ₹38 lakh RTGS transfer to a Suspense account is a deviation ratio of 475x. Chakravyuh\'s scoring engine assigns a high component score for amount_anomaly alone (0.25 × 100 = 25 points), and when combined with an unknown device and high-risk IP, the total score breaches 80 — triggering an immediate BLOCK before RTGS settlement.',
    persona: '👤 Priya Singh — small business owner, avg transaction ₹8K. Attempting ₹38L RTGS to ACC-SUSPENSE-04 (no prior transaction history, opened 3 days ago) from new device DEV-UNK, IP 185.190.24.10 (proxy/VPN).',
    expectedDecision: 'block',
    apiEndpoint: 'POST /api/transactions/score',
    navigateTo: '/analyst/pre-txn-analytics', navigateLabel: 'View in Pre-Txn Analytics',
    apiMode: 'score',
    whatToLookFor: 'Score ≥80 → BLOCK. AMOUNT_DEVIATION will be the primary reason code. 475x baseline deviation.',
    payload: { from_account: 'ACC-UC04', to_account: 'ACC-SUSPENSE-04', amount: 3800000, txn_type: 'RTGS', channel: 'net_banking', device_known: false, ip_address: '185.190.24.10', geo_location: 'Chennai', currency: 'INR' },
  },
  {
    id: 'UC-05', group: 'A',
    title: 'Off-Hours Transaction Anomaly',
    description: 'Time-of-transaction is a strong behavioral signal. When account activity logs show a user exclusively transacts between 9 AM and 8 PM for 18 months, a 3:17 AM IMPS becomes highly anomalous. The TIME_ANOMALY reason code fires with high weight. This is a classic Account Takeover signal — attackers often operate at night when the victim is asleep and cannot receive MFA notifications immediately. Chakravyuh flags this for manual analyst review rather than outright blocking, as a small number of legitimate late-night transactions do occur.',
    persona: '👤 Arjun Nair — salaried professional, 18 months of transaction history, 100% within 9 AM–8 PM window. Current transaction: IMPS ₹2.85L at 03:17 IST to a first-time beneficiary in Kolkata from a trusted device but unusual IP.',
    expectedDecision: 'manual_review',
    apiEndpoint: 'POST /api/transactions/score',
    navigateTo: '/analyst/pre-txn-analytics', navigateLabel: 'View in Pre-Txn Analytics',
    apiMode: 'score',
    whatToLookFor: 'Score 60–80 → MANUAL_REVIEW. TIME_ANOMALY reason code. Check if beneficiary is new.',
    payload: { from_account: 'ACC-UC05', to_account: 'ACC-BENE-05', amount: 285000, txn_type: 'IMPS', channel: 'mobile', device_known: true, ip_address: '49.207.61.88', geo_location: 'Pune', currency: 'INR' },
  },
  {
    id: 'UC-06', group: 'A',
    title: 'First-Time Beneficiary Screening',
    description: 'Sending money to a beneficiary an account has never transacted with before is a moderate-risk signal — especially when the amount is large. Chakravyuh tracks beneficiary history per account and flags FIRST_TIME_BENEFICIARY when no prior transaction exists with the receiver. When combined with a large transfer amount, this becomes a strong indicator of fraud (social engineering victims often transfer money to attackers\' mule accounts they\'ve never used before). This scenario shows a ₹6.75L NEFT to a shell company account the sender has never used.',
    persona: '👤 Kavita Desai — financial manager, average ₹15K transactions. Being social engineered — transferring ₹6.75L NEFT to ACC-FIRSTTIME-06 (a freshly-created shell company at a Tier-2 bank) from a trusted device at a normal hour.',
    expectedDecision: 'manual_review',
    apiEndpoint: 'POST /api/transactions/score',
    navigateTo: '/analyst/pre-txn-analytics', navigateLabel: 'View in Pre-Txn Analytics',
    apiMode: 'score',
    whatToLookFor: 'FIRST_TIME_BENEFICIARY + AMOUNT_DEVIATION. Score 60–80 → MANUAL_REVIEW.',
    payload: { from_account: 'ACC-UC06', to_account: 'ACC-FIRSTTIME-06', amount: 675000, txn_type: 'NEFT', channel: 'net_banking', device_known: true, ip_address: '122.161.0.5', geo_location: 'Ahmedabad', currency: 'INR' },
  },
  {
    id: 'UC-07', group: 'A',
    title: 'High-Velocity Transaction Detection',
    description: 'Velocity fraud involves multiple rapid transactions in a short time window — a signature behavior of mule chains and account takeovers. This is Deepak Joshi\'s 4th consecutive IMPS in 18 minutes, each to a different receiver. The graph_risk signal fires because the receiving accounts (ACC-MULE-07) are known mule accounts from prior investigations, and the rapid chaining is consistent with layering. Combined with an unregistered device on an internal IP (commonly used in mobile banking fraud bots), the score exceeds 80.',
    persona: '👤 Deepak Joshi — account showing 4 consecutive IMPSs in 18 minutes: ₹1.8L → ₹2.1L → ₹3.5L → ₹4.9L. All to first-time beneficiaries. Current transaction: the 4th IMPS at ₹4.9L to ACC-MULE-07, unknown device, internal IP.',
    expectedDecision: 'block',
    apiEndpoint: 'POST /api/transactions/score',
    navigateTo: '/analyst/pre-txn-analytics', navigateLabel: 'View in Pre-Txn Analytics',
    apiMode: 'score',
    whatToLookFor: 'GRAPH_RISK + NEW_DEVICE signals. Score ≥80 → BLOCK. Rapid velocity pattern.',
    payload: { from_account: 'ACC-UC07', to_account: 'ACC-MULE-07', amount: 490000, txn_type: 'IMPS', channel: 'mobile', device_known: false, ip_address: '192.168.1.100', geo_location: 'Kolkata', currency: 'INR' },
  },
  {
    id: 'UC-08', group: 'A',
    title: 'Account Takeover + High-Value Drain',
    description: 'Account Takeover (ATO) is the highest-severity fraud pattern. The attacker\'s kill chain: (1) Credential stuffing from leaked database, (2) Login from Tor node IP 185.220.101.99, (3) Password reset via SMS OTP interception, (4) Trusted beneficiary removed and new mule account added as beneficiary, (5) Maximum RTGS initiated 22 minutes after login. Chakravyuh detects the entire chain: new device + high-risk IP + amount 76x above baseline + first-time beneficiary + graph risk from the mule account\'s known network → BLOCK fires before RTGS settlement.',
    persona: '👤 Suresh Agarwal — HNI account (₹85K avg). Attacker logged in 22 minutes ago from IP 185.220.101.99 (Tor), changed password, added new beneficiary ACC-ATTACKER-08, now initiating ₹65L RTGS.',
    expectedDecision: 'block',
    apiEndpoint: 'POST /api/transactions/score',
    navigateTo: '/analyst/pre-txn-analytics', navigateLabel: 'View in Pre-Txn Analytics',
    apiMode: 'score',
    whatToLookFor: 'All 5 signals firing simultaneously. Score ≥80 → BLOCK. Multiple reason codes.',
    payload: { from_account: 'ACC-UC08', to_account: 'ACC-ATTACKER-08', amount: 6500000, txn_type: 'RTGS', channel: 'net_banking', device_known: false, ip_address: '185.220.101.99', geo_location: 'Unknown', currency: 'INR' },
  },
  {
    id: 'UC-09', group: 'A',
    title: 'Step-Up MFA Intervention',
    description: 'MFA (step-up authentication) is triggered when the risk score is in the 30–60 range — suspicious enough to warrant verification, but not conclusive enough to block. This prevents legitimate customers from being falsely blocked while still adding friction for potential attackers. Anita Kulkarni\'s transaction is borderline: the amount is moderately elevated (₹1.95L vs avg ₹40K), the device is unregistered (she recently changed phones), but the IP and location are consistent with her history. Score lands at ~45 → MFA challenge sent before settlement.',
    persona: '👤 Anita Kulkarni — housewife with ₹40K avg, recently changed to a new phone (device not yet registered). Sending ₹1.95L UPI to reimburse a family member. Moderate risk: new device but normal IP and location.',
    expectedDecision: 'mfa',
    apiEndpoint: 'POST /api/transactions/score',
    navigateTo: '/analyst/pre-txn-analytics', navigateLabel: 'View in Pre-Txn Analytics',
    apiMode: 'score',
    whatToLookFor: 'Score 30–60 → MFA. NEW_DEVICE fires but amount and location are within range.',
    payload: { from_account: 'ACC-UC09', to_account: 'ACC-BENE-09', amount: 195000, txn_type: 'UPI', channel: 'mobile', device_known: false, ip_address: '203.197.22.14', geo_location: 'Hyderabad', currency: 'INR' },
  },

  // ── Group B: Post-Transaction Investigation ──────────────────────────────────
  {
    id: 'UC-10', group: 'B',
    title: 'Circular Fund Flow Detection',
    description: 'Circular fund flow is the most classic money laundering pattern. The NetworkX graph engine identifies 3-hop RTGS cycles: Meridian Holdings (SBI) sent ₹1.85Cr to Aarav Traders (HDFC), which forwarded to Sunrise Finance (UCO Bank), which returned ₹1.79Cr to Meridian Holdings — completing the circle within 36 hours. A 2.97% extraction spread (₹5.5L) is siphoned off each cycle. This matches PMLA Section 3 layering typology. Alert ALT-001 is the first hop detection; the full case is CASE-001.',
    persona: '🔍 Graph engine flags ALT-001: Meridian Holdings India Pvt Ltd (SBI 30765432189) → Aarav Traders (HDFC 50100421836529) → Sunrise Finance (UCO 0230014781923) → back to Meridian. ₹1.85Cr cycled, ₹5.5L extracted.',
    expectedDecision: 'manual_review',
    apiEndpoint: 'GET /api/alerts/ALT-001',
    navigateTo: '/analyst/alerts', navigateLabel: 'Open Alert Inbox',
    apiMode: 'alert', alertId: 'ALT-001',
    whatToLookFor: 'Alert type: circular_transfer. Risk score: 92. Severity: CRITICAL. Case linked: CASE-001.',
  },
  {
    id: 'UC-11', group: 'B',
    title: 'Circular Return Leg Detection',
    description: 'This alert captures the return leg of the same circular scheme as UC-10. Alert ALT-002 fires when Sunrise Finance (UCO Bank) completes the round-trip by sending ₹1.79Cr back to Meridian Holdings, confirming the circular nature with high confidence. The combination of ALT-001 and ALT-002 together confirm a fully circular layering operation. Both alerts are linked to CASE-001, allowing the analyst to see the complete fund flow in a single investigation context.',
    persona: '🔍 Graph engine confirms round-trip: Sunrise Finance Pvt Ltd (UCO 0230014781923) → Meridian Holdings (SBI 30765432189). ₹1.79Cr return at 18:50 IST — 4.5 hours after the initial transfer. Circular transfer confirmed.',
    expectedDecision: 'manual_review',
    apiEndpoint: 'GET /api/alerts/ALT-002',
    navigateTo: '/analyst/alerts', navigateLabel: 'Open Alert Inbox',
    apiMode: 'alert', alertId: 'ALT-002',
    whatToLookFor: 'Alert type: circular_transfer_return. Risk score: 95. Both ALT-001 and ALT-002 link to CASE-001.',
  },
  {
    id: 'UC-12', group: 'B',
    title: 'Account Takeover Alert',
    description: 'ALT-003 represents a confirmed Account Takeover pattern. Priya Sharma\'s NRO account at Axis Bank initiated a ₹43.5L NEFT at 03:12 IST — 97x above her baseline. The initiating device DEV-0089 is completely absent from the registered device registry. The IP 49.36.212.87 (Jio, geo-located to Kolkata) does not match the account holder\'s registered city (Delhi). The beneficiary account 0462002198765432 (Vijay Kumar, PNB Kolkata) was opened only 12 days ago — a classic mule account setup. All signals combine for a risk score of 97/100.',
    persona: '🔍 Axis Bank NRO account 917021847362019 (Priya Sharma, Delhi) — ₹43.5L NEFT at 03:12 IST to PNB Kolkata mule account, unknown device DEV-0089, foreign IP, beneficiary opened 12 days ago.',
    expectedDecision: 'block',
    apiEndpoint: 'GET /api/alerts/ALT-003',
    navigateTo: '/analyst/alerts', navigateLabel: 'Open Alert Inbox',
    apiMode: 'alert', alertId: 'ALT-003',
    whatToLookFor: 'Alert type: account_takeover. Risk score: 97. All 5 ATO indicators present simultaneously.',
  },
  {
    id: 'UC-13', group: 'B',
    title: 'Structuring & Threshold Avoidance',
    description: 'Structuring is the practice of splitting large transactions into amounts just below the regulatory reporting threshold (₹10 lakh in India) to avoid FIU-IND STR filing obligations. ALT-005 flags 6 transfers of ₹98,000 each (just below ₹1L) from Sterling Capital\'s current account to Suyash Sawant\'s savings account over 48 hours. The total transfer is ₹5.88L — if done as a single transfer it might not cross the ₹10L STR threshold, but the pattern itself is a PMLA Section 3 red flag indicator recognized by FIU-IND.',
    persona: '🔍 Sterling Capital Ltd (Kotak 1234567890123) → Suyash Sawant (HDFC 9876543210987): 6 × ₹98,000 IMPS over 48 hours. Each just below ₹1L threshold. Total: ₹5.88L. Structuring pattern confirmed.',
    expectedDecision: 'manual_review',
    apiEndpoint: 'GET /api/alerts/ALT-005',
    navigateTo: '/analyst/alerts', navigateLabel: 'Open Alert Inbox',
    apiMode: 'alert', alertId: 'ALT-005',
    whatToLookFor: 'Alert type: structuring. Multiple transactions just below threshold. PMLA Section 3 indicator.',
  },
  {
    id: 'UC-14', group: 'B',
    title: 'Dormant Account Reactivation',
    description: 'A dormant account (no activity for 12+ months) suddenly reactivating with high-value inbound transfers is a textbook mule account activation pattern. Attackers acquire dormant accounts from willing participants or via identity fraud, then use them as transit accounts to layer dirty money. CASE-001 spans this pattern — the Meridian Holdings → Aarav Traders layering chain involves accounts that had been dormant before the scheme started, suggesting the chain was pre-arranged for this purpose.',
    persona: '🔍 CASE-001 investigation: Aarav Traders (HDFC 50100421836529) last active 14 months ago. Suddenly receives ₹1.85Cr RTGS inbound and immediately forwards ₹1.79Cr onward within 4 hours. Zero prior legitimate business transactions.',
    expectedDecision: 'manual_review',
    apiEndpoint: 'GET /api/cases/CASE-001',
    navigateTo: '/analyst/cases', navigateLabel: 'Open Cases',
    apiMode: 'case', caseId: 'CASE-001',
    whatToLookFor: 'CASE-001 status: investigating. Circular transfers: true. Hop count: 3. Linked alerts: ALT-001, ALT-002.',
  },
  {
    id: 'UC-15', group: 'B',
    title: 'Synthetic Identity & Fund Tracing',
    description: 'Synthetic identity fraud involves creating fake or partially-fabricated identities to open bank accounts used for financial crime. CASE-003 covers Horizon Ventures India Pvt Ltd (Kotak) — a company incorporated only 6 weeks before the suspicious transactions, with no legitimate business activity, whose directors have no credit history, and whose PAN details don\'t match MCA records. The transaction chain traces through 4 hops to merge with the Meridian Holdings circular flow from CASE-001, suggesting a coordinated scheme.',
    persona: '🔍 CASE-003: Horizon Ventures India Pvt Ltd (Kotak 1634087654321) — incorporated 6 weeks ago, zero legitimate transactions, directors PAN mismatch. Received ₹2.3Cr over 5 days from 3 different accounts, immediately forwarded to 4-hop chain.',
    expectedDecision: 'manual_review',
    apiEndpoint: 'GET /api/cases/CASE-003',
    navigateTo: '/analyst/cases', navigateLabel: 'Open Cases',
    apiMode: 'case', caseId: 'CASE-003',
    whatToLookFor: 'CASE-003 status: investigating. synthetic_identity alert type. Linked to broader scheme.',
  },
  {
    id: 'UC-16', group: 'B',
    title: 'AI-Generated Alert Explanation',
    description: 'When an analyst opens an alert, they can request an AI-generated briefing from Chakravyuh\'s LLM layer (gpt-4o-mini). The system loads the full alert context — risk score, reason codes, account details, amount, device analysis, network graph signals — and sends it to the model with a structured prompt instructing it to act as a Senior Fraud Analyst at FIU-IND. The result is a professional investigation briefing in plain English: what triggered the alert, why it is suspicious, what the analyst must do next, and applicable PMLA/RBI obligations.',
    persona: '🧑‍💼 Analyst Kavya Rao opens ALT-001 (Meridian Holdings circular transfer, 92/100) and asks "Why was this flagged?". GPT-4o-mini responds with a full FIU-analyst-style briefing in under 3 seconds.',
    expectedDecision: 'manual_review',
    apiEndpoint: 'GET /api/alerts/ALT-001/explain',
    navigateTo: '/analyst/alerts', navigateLabel: 'Open Alert Inbox',
    apiMode: 'explain', alertId: 'ALT-001',
    whatToLookFor: 'Full LLM explanation text. If OpenAI key not configured, system returns template fallback.',
  },
  {
    id: 'UC-17', group: 'B',
    title: 'Evidence Package for Prosecution',
    description: 'Once a case is confirmed as fraud, the analyst must assemble an evidence package that is legally defensible in court or for STR submission to FIU-IND. Chakravyuh\'s evidence metadata includes: alert IDs with timestamps, transaction IDs with UTR references, device forensics, network graph nodes/edges, behavioral deviation analysis, and a SHA-256 chain-of-custody hash. The hash ensures that evidence has not been tampered with between collection and submission to the Financial Intelligence Unit.',
    persona: '🧑‍💼 Analyst Rahul Mehta working CASE-005 (mule network, ₹4.1Cr, escalated). Building evidence package for STR filing: full alert chain ALT-007+ALT-008, SHA-256 hash, transaction IDs, and analyst notes.',
    expectedDecision: 'block',
    apiEndpoint: 'GET /api/cases/CASE-005',
    navigateTo: '/analyst/cases', navigateLabel: 'Open Cases',
    apiMode: 'case', caseId: 'CASE-005',
    whatToLookFor: 'CASE-005 evidence array, SHA-256 hash, linked alert IDs, timeline with timestamps.',
  },
  {
    id: 'UC-18', group: 'B',
    title: 'FIU-IND Compliance Report Generation',
    description: 'Under PMLA 2002, Indian banks must file Suspicious Transaction Reports (STRs) with FIU-IND within 7 working days of suspicion. Chakravyuh\'s ReportLab-powered PDF generator creates a SAR-quality compliance document for CASE-005: Section A (subject identification), Section B (nature of suspicious activity), Section C (typology indicators), Section D (risk assessment), and Section E (actions taken). The PDF includes the SHA-256 chain-of-custody hash on the cover page, ensuring legal admissibility.',
    persona: '🧑‍💼 Compliance Officer Deepika Sharma — filing STR for CASE-005 (confirmed mule network, ₹4.1Cr). PDF generated with full narrative, transaction graph, evidence hash. Submitted to FIU-IND via FINnet portal.',
    expectedDecision: 'block',
    apiEndpoint: 'GET /api/report/CASE-005/pdf',
    navigateTo: '/analyst/cases', navigateLabel: 'Open Cases',
    apiMode: 'report', caseId: 'CASE-005',
    whatToLookFor: 'PDF download triggered. Check HTTP response headers for X-Custody-Hash and X-Report-Id.',
  },

  // ── Group C: Analyst Dashboard ────────────────────────────────────────────────
  {
    id: 'UC-19', group: 'C',
    title: 'Alert Inbox — Risk-Ranked View',
    description: 'The analyst dashboard presents all open alerts ranked by risk score descending, so the most critical cases are always at the top. Each alert card shows: risk score, severity badge, alert type, account name, amount, and time elapsed since detection. Analysts can filter by severity (critical/high/medium/low) and status (new/open/investigating/resolved). This view corresponds to calling GET /api/alerts — the same endpoint that powers the live Alert Inbox page in the Analyst Console.',
    persona: '🧑‍💼 Analyst opens inbox — sees ALT-001 (92/100, CRITICAL, circular_transfer), ALT-003 (97/100, CRITICAL, account_takeover), ALT-007 (88/100, CRITICAL, mule_network) at the top.',
    expectedDecision: 'manual_review',
    apiEndpoint: 'GET /api/alerts/ALT-001',
    navigateTo: '/analyst/alerts', navigateLabel: 'Open Alert Inbox',
    apiMode: 'alert', alertId: 'ALT-001',
    whatToLookFor: 'Alert count, severity distribution, risk_score. Open the Alert Inbox to see the full ranked list.',
  },
  {
    id: 'UC-20', group: 'C',
    title: 'Alert Detail — Full Context Drill-Down',
    description: 'When an analyst clicks into an alert, they see the full investigation context: behavioral analysis (baseline vs current amount, time anomaly flag), device analysis (known/unknown device, IP risk classification, geo-location), network analysis (circular transfers flag, hop count, connected suspicious accounts), the AI-generated LLM explanation, and the complete alert metadata. This maps to GET /api/alerts/{id} and returns all evidence arrays needed for a complete investigation decision.',
    persona: '🧑‍💼 Analyst Priya Kumari drills into ALT-004 (synthetic_identity, HDFC): sees behavioral deviation of 48x, unknown device, corporate IP, layering detected in network graph. Reviews full evidence for case escalation decision.',
    expectedDecision: 'manual_review',
    apiEndpoint: 'GET /api/alerts/ALT-004',
    navigateTo: '/analyst/alerts', navigateLabel: 'Open Alert Inbox',
    apiMode: 'alert', alertId: 'ALT-004',
    whatToLookFor: 'ALT-004 type: synthetic_identity. Full behavioral, device, and network arrays visible.',
  },
  {
    id: 'UC-21', group: 'C',
    title: 'Analyst Action — Mark Safe & Approve',
    description: 'After reviewing all signals, an analyst may determine that a transaction is legitimate despite triggering automated alerts. This is a APPROVE action: the analyst overrides the system decision, notes their reasoning, and marks the alert resolved. This transaction is a clean payment from a known corporate account: ₹42,000 UPI, trusted device, business hours, known beneficiary, normal Mumbai IP. All signals are within baseline — a correct approve.',
    persona: '🧑‍💼 Senior Analyst reviews flagged transaction: ACC-UC21 → ACC-SAFE-21, ₹42K UPI, trusted device, standard IP, 10 AM. Concludes: false positive. Marks as safe and approves. Zero risk signals.',
    expectedDecision: 'approve',
    apiEndpoint: 'POST /api/transactions/score',
    navigateTo: '/analyst/manual-review', navigateLabel: 'Open Manual Review',
    apiMode: 'score',
    whatToLookFor: 'Score <30 → APPROVE. Confirm no reason codes fire. Analyst would mark this resolved.',
    payload: { from_account: 'ACC-UC21', to_account: 'ACC-SAFE-21', amount: 42000, txn_type: 'UPI', channel: 'mobile', device_known: true, ip_address: '103.21.58.12', geo_location: 'Mumbai', currency: 'INR' },
  },
  {
    id: 'UC-22', group: 'C',
    title: 'Analyst Action — Confirm & Block',
    description: 'When fraud evidence is conclusive, the analyst issues a BLOCK decision: the transaction is stopped, the account is flagged, and the case is escalated for STR filing. This RTGS transfer of ₹28L to a known mule account (ACC-MULE-22 has appeared in 3 prior cases) from an unknown device on a high-risk IP is unmistakable fraud. Score is ≥80, all reason codes fire, and the receiving account\'s mule history is conclusive. The analyst blocks and initiates CASE creation for FIU reporting.',
    persona: '🧑‍💼 Analyst confirms ATO-driven RTGS: ACC-UC22 → ACC-MULE-22, ₹28L, unknown device, IP 185.220.101.77 (Tor exit), receiver has 3 prior fraud cases. Decision: BLOCK + escalate to CASE.',
    expectedDecision: 'block',
    apiEndpoint: 'POST /api/transactions/score',
    navigateTo: '/analyst/manual-review', navigateLabel: 'Open Manual Review',
    apiMode: 'score',
    whatToLookFor: 'Score ≥80 → BLOCK. Multiple reason codes. GRAPH_RISK from mule account history.',
    payload: { from_account: 'ACC-UC22', to_account: 'ACC-MULE-22', amount: 2800000, txn_type: 'RTGS', channel: 'net_banking', device_known: false, ip_address: '185.220.101.77', geo_location: 'Unknown', currency: 'INR' },
  },
  {
    id: 'UC-23', group: 'C',
    title: 'Analyst Action — Escalate to MFA',
    description: 'For borderline cases, the analyst can require the customer to complete step-up authentication before the transaction proceeds. This is less disruptive than a full block and appropriate when the signal is ambiguous. Anita Kulkarni\'s IMPS from a new phone (recently changed device) to a first-time but legitimate-looking beneficiary in Pune sits exactly in the MFA zone (score ~45). The analyst chooses to let the transaction proceed but requires OTP verification from the registered mobile number first.',
    persona: '🧑‍💼 Analyst reviews: ACC-UC23 → ACC-NEW-23, ₹1.85L IMPS, new device (recently changed phone), first-time beneficiary. Score borderline. Decision: step-up MFA challenge sent to customer\'s registered mobile.',
    expectedDecision: 'mfa',
    apiEndpoint: 'POST /api/transactions/score',
    navigateTo: '/analyst/manual-review', navigateLabel: 'Open Manual Review',
    apiMode: 'score',
    whatToLookFor: 'Score 30–60 → MFA. NEW_DEVICE + FIRST_TIME_BENEFICIARY without high-risk IP.',
    payload: { from_account: 'ACC-UC23', to_account: 'ACC-NEW-23', amount: 185000, txn_type: 'IMPS', channel: 'mobile', device_known: false, ip_address: '49.207.61.20', geo_location: 'Pune', currency: 'INR' },
  },
  {
    id: 'UC-24', group: 'C',
    title: 'Analyst Action — Add to Watchlist',
    description: 'Sometimes there is insufficient evidence to block or confirm fraud, but suspicious patterns warrant ongoing monitoring. The analyst marks the account for watchlist monitoring — 30-day period where all transactions are automatically flagged for review regardless of risk score. This action is submitted via POST /api/feedback/confirm with outcome="watchlist". The learning loop records this as a soft signal that increases the account\'s future risk scoring weight.',
    persona: '🧑‍💼 Analyst notices subtle structuring pattern across 5 accounts but cannot confirm fraud yet — amounts are just within normal range. Places all 5 accounts on 30-day watchlist. Feedback stored to model learning pipeline.',
    expectedDecision: 'manual_review',
    apiEndpoint: 'POST /api/feedback/confirm + POST /api/knowledge/search',
    navigateTo: '/analyst/cases', navigateLabel: 'Open Cases',
    apiMode: 'knowledge',
    whatToLookFor: 'Feedback submitted successfully. Knowledge base returns similar watchlist pattern cases.',
  },
  {
    id: 'UC-25', group: 'C',
    title: 'Analyst Action — Confirm Fraud for STR',
    description: 'Confirming fraud is the final and most consequential analyst action. When an analyst submits outcome="confirmed_fraud" for CASE-005, the system: (1) updates the case status to confirmed_fraud, (2) stores the outcome to the model learning pipeline (improving future detection accuracy), (3) triggers STR pre-population for FIU-IND submission, and (4) adds the involved accounts to the high-risk account registry. This closes the loop between detection, investigation, and reporting.',
    persona: '🧑‍💼 Analyst Rahul confirms CASE-005 (mule network, ₹4.1Cr) as confirmed fraud after 48 hours of investigation. System fires: case status update + STR pre-fill + model feedback + account blacklist — all atomically.',
    expectedDecision: 'block',
    apiEndpoint: 'POST /api/feedback/confirm + POST /api/knowledge/search',
    navigateTo: '/analyst/cases', navigateLabel: 'Open Cases',
    apiMode: 'knowledge',
    whatToLookFor: 'Feedback response: status updated. Knowledge search returns similar mule network patterns from ChromaDB.',
  },

  // ── Group D: Executive Dashboard ──────────────────────────────────────────────
  {
    id: 'UC-26', group: 'D',
    title: 'Enterprise-Wide Risk KPIs',
    description: 'The executive dashboard aggregates system-wide fraud intelligence into C-suite-ready KPIs. The GET /api/dashboard/executive endpoint returns: total fraud detected this month (₹ exposure), total fraud prevented by pre-transaction blocking, false positive rate (percentage of flagged transactions that were legitimate), detection rate, and a model health summary. The GET /api/dashboard/analyst endpoint provides the analyst-level counters: open alerts by severity, cases by status, average resolution time.',
    persona: '👔 Chief Risk Officer Vikram Rao opens the executive dashboard for the Monday morning risk review: sees ₹12.3Cr fraud detected, ₹3.1Cr prevented by Chakravyuh pre-transaction engine, 23 open cases, 87% detection rate.',
    expectedDecision: 'approve',
    apiEndpoint: 'GET /api/dashboard/executive + /api/dashboard/analyst',
    navigateTo: '/executive', navigateLabel: 'Open Executive Dashboard',
    apiMode: 'dashboard',
    whatToLookFor: 'total_alerts, model_health.f1_score, compliance.score. Both dashboard endpoints called in parallel.',
  },
  {
    id: 'UC-27', group: 'D',
    title: 'Regulatory Exposure & Penalty Risk',
    description: 'The RBI and FIU-IND impose significant penalties on banks that fail to file STRs within the mandated timeframe (7 working days of suspicion under PMLA 2002). The executive dashboard\'s compliance section shows: number of cases requiring STR filing, number already filed vs overdue, estimated regulatory penalty exposure (₹), last external audit date, and overall compliance score. This enables the CCO to prioritize which cases need immediate STR submission to avoid regulatory sanctions.',
    persona: '👔 Chief Compliance Officer Sunita Nair reviews regulatory exposure: 3 STRs due within 72 hours, 1 overdue by 2 days (₹5L estimated penalty), compliance score 78/100. Flags urgent escalation to MLRO.',
    expectedDecision: 'approve',
    apiEndpoint: 'GET /api/dashboard/executive → compliance section',
    navigateTo: '/executive', navigateLabel: 'Open Executive Dashboard',
    apiMode: 'dashboard',
    whatToLookFor: 'compliance.score, compliance.sars_filed, regulatory_exposure. Check executive dashboard page.',
  },
  {
    id: 'UC-28', group: 'D',
    title: 'ML Model Health Monitoring',
    description: 'ML models degrade over time as fraud patterns evolve — a phenomenon called model drift. The executive dashboard\'s model health panel tracks: accuracy, precision, recall, F1 score, last retrained date, and explainability metrics. A drop in recall means the model is missing fraud (dangerous). A drop in precision means too many false positives (operational burden). The CTO/Head of Risk Technology uses this panel to decide when to trigger a model retraining cycle and validate that Chakravyuh\'s detection quality is maintained.',
    persona: '👔 Head of Risk Technology Anand Raj reviews model metrics: F1=0.89, Precision=0.91, Recall=0.87. Last retrained 18 days ago. Recall trending down over 7 days — schedules retraining review for next sprint.',
    expectedDecision: 'approve',
    apiEndpoint: 'GET /api/dashboard/executive → model_health section',
    navigateTo: '/executive', navigateLabel: 'Open Executive Dashboard',
    apiMode: 'dashboard',
    whatToLookFor: 'model_health.f1_score, model_health.precision, model_health.recall, model_health.last_trained.',
  },
  {
    id: 'UC-29', group: 'D',
    title: 'Fraud Trend Analysis — 12-Month View',
    description: 'Trend analysis reveals whether the bank\'s fraud prevention posture is improving or deteriorating over time. The executive dashboard plots: monthly fraud detected (₹), monthly fraud prevented (₹), number of cases, and the prevention-to-detection ratio. A rising prevention ratio means Chakravyuh\'s pre-transaction blocking is maturing. A spike in detected but unblocked fraud signals model drift or new attack vectors emerging. The CFO uses this for quarterly board presentations and ROI justification.',
    persona: '👔 CFO Meena Krishnan presents to the board: 12-month chart showing fraud detected climbing from ₹3.2Cr (April) to ₹12.3Cr (March) — 3.8x growth YoY, but prevention rate improved from 22% to 38% over same period.',
    expectedDecision: 'approve',
    apiEndpoint: 'GET /api/dashboard/executive → trends section',
    navigateTo: '/executive', navigateLabel: 'Open Executive Dashboard',
    apiMode: 'dashboard',
    whatToLookFor: 'Monthly trend data. Check executive dashboard Recharts line graph for 12-month view.',
  },
  {
    id: 'UC-30', group: 'D',
    title: 'Board-Level Compliance & Audit Summary',
    description: 'This use case simulates the board-level quarterly compliance review. Both dashboard endpoints are called simultaneously to produce a combined view: operational metrics from the analyst dashboard (alert volumes, average resolution time, analyst workload) combined with strategic metrics from the executive dashboard (compliance score, SARs filed this quarter, external audit dates, regulatory exposure). This two-endpoint parallel call pattern gives the fullest picture of the bank\'s fraud risk posture in a single API call.',
    persona: '👔 Board Compliance Committee quarterly meeting: combined view of analyst metrics (340 alerts processed, avg 4.2h resolution) + executive metrics (compliance 78/100, 14 STRs filed Q1, external audit in 28 days).',
    expectedDecision: 'approve',
    apiEndpoint: 'GET /api/dashboard/analyst + GET /api/dashboard/executive (parallel)',
    navigateTo: '/executive', navigateLabel: 'Open Executive Dashboard',
    apiMode: 'dashboard',
    whatToLookFor: 'Both endpoints called in parallel. Combined analyst + executive data in response summary.',
  },

  // ── Group E: Learning Loop ──────────────────────────────────────────────────────
  {
    id: 'UC-31', group: 'E',
    title: 'Analyst Feedback to Learning Pipeline',
    description: 'Every analyst confirmation (approved, confirmed_fraud, watchlist) is submitted to POST /api/feedback/confirm and stored in the feedback repository. This creates a labeled training dataset of analyst-adjudicated cases. The feedback includes case_id, outcome, analyst_id, and optional notes. Over time, this dataset can be used to retrain the scoring model with analyst-validated ground truth, improving both precision and recall. This closes the automation loop between live detection and model improvement.',
    persona: '🤖 System runs POST /api/feedback/confirm for CASE-005 (confirmed_fraud, analyst_id: demo). Feedback stored to feedback_store. Knowledge base simultaneously queried to surface similar patterns for training context.',
    expectedDecision: 'approve',
    apiEndpoint: 'POST /api/feedback/confirm + POST /api/knowledge/search',
    navigateTo: '/analyst/cases', navigateLabel: 'Open Cases',
    apiMode: 'knowledge',
    whatToLookFor: 'Feedback response success. Knowledge search returns relevant training context from ChromaDB.',
  },
  {
    id: 'UC-32', group: 'E',
    title: 'Adaptive Risk Score Calibration',
    description: 'After confirmed fraud outcomes are recorded, the scoring engine\'s calibration stats are updated. For each confirmed fraud, the corresponding reason codes are given higher weight in future scoring distributions. For false positives, the affected signals are recalibrated downward. This creates an adaptive, continuously-improving detector that gets more accurate with each analyst decision — addressing model drift automatically without requiring manual retraining for every change.',
    persona: '🤖 After 50 confirmed_fraud outcomes this week, the scoring distribution stats update: AMOUNT_DEVIATION threshold drops from 85th percentile to 82nd percentile (3 more transactions will be flagged), NEW_DEVICE weight increases from 0.20 to 0.22.',
    expectedDecision: 'approve',
    apiEndpoint: 'POST /api/feedback/confirm → model stats updated',
    navigateTo: '/analyst/cases', navigateLabel: 'Open Cases',
    apiMode: 'knowledge',
    whatToLookFor: 'Feedback stored successfully. Check that the system responds with status confirmation.',
  },
  {
    id: 'UC-33', group: 'E',
    title: 'ChromaDB Semantic Case Retrieval',
    description: 'Chakravyuh maintains a vector store (ChromaDB) of historical fraud cases, policy documents, and investigation patterns. When an analyst investigates a new case, the system uses semantic search to retrieve the 3 most similar historical cases — helping the analyst pattern-match the current investigation against past confirmed frauds. The vector embeddings capture semantic similarity across fraud typologies, so "hawala money transfer via shell companies" will retrieve structuring and layering cases even if those exact words don\'t appear in the query.',
    persona: '🤖 ChromaDB receives query: "circular transfer layering mule account hawala". Returns top-3 nearest historical cases by cosine similarity: CASE-001 (circular flow, 0.94 similarity), CASE-005 (mule network, 0.88), and a 2024 hawala case (0.81).',
    expectedDecision: 'approve',
    apiEndpoint: 'POST /api/knowledge/search (ChromaDB semantic search)',
    navigateTo: '/analyst/cases', navigateLabel: 'Open Cases',
    apiMode: 'knowledge',
    whatToLookFor: 'Knowledge results array with content and similarity scores. First result should be most relevant case.',
  },
  {
    id: 'UC-34', group: 'E',
    title: 'RAG-Powered LLM Explanation Engine',
    description: 'Chakravyuh\'s LLM explanation layer uses Retrieval-Augmented Generation (RAG): ChromaDB retrieves the most relevant fraud knowledge (policies, historical cases, RBI guidelines) and passes it as context to GPT-4o-mini. This means the model\'s responses are grounded in Chakravyuh\'s specific knowledge base rather than generic LLM knowledge. The /explain endpoint for ALT-001 retrieves circular transfer policy context, layering typology documentation, and PMLA Section 3 guidance — then generates an expert-quality analyst briefing.',
    persona: '🤖 GPT-4o-mini + ChromaDB RAG: ALT-001 context retrieved → circular transfer policy + PMLA Section 3 guidance → model generates: "The 3-hop RTGS cycle with 2.97% extraction spread meets the FIU-IND definition of layering under PMLA 2002..."',
    expectedDecision: 'approve',
    apiEndpoint: 'GET /api/alerts/ALT-001/explain (RAG → GPT-4o-mini)',
    navigateTo: '/analyst/alerts', navigateLabel: 'Open Alert Inbox',
    apiMode: 'explain', alertId: 'ALT-001',
    whatToLookFor: 'Full LLM explanation with PMLA references. API calls ChromaDB then GPT-4o-mini in sequence.',
  },
];

// ─── Config ────────────────────────────────────────────────────────────────────
const GROUPS: Record<UCGroup, { label: string; color: string; bg: string; border: string; icon: React.ElementType; ucs: number }> = {
  A: { label: 'A. Pre-Transaction Prevention', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Shield, ucs: 9 },
  B: { label: 'B. Post-Transaction Investigation', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: Network, ucs: 9 },
  C: { label: 'C. Analyst Dashboard', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: Eye, ucs: 7 },
  D: { label: 'D. Executive Dashboard', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: BarChart3, ucs: 5 },
  E: { label: 'E. Learning Loop', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', icon: Brain, ucs: 4 },
};

const DECISION_CFG: Record<string, { label: string; color: string; bar: string; icon: React.ElementType; bg: string }> = {
  block:         { label: 'BLOCKED',       color: 'text-red-700 bg-red-100 border-red-200',          bar: 'bg-red-500',    icon: Ban,           bg: 'bg-red-50' },
  manual_review: { label: 'MANUAL REVIEW', color: 'text-orange-700 bg-orange-100 border-orange-200', bar: 'bg-orange-500', icon: AlertTriangle, bg: 'bg-orange-50' },
  mfa:           { label: 'MFA REQUIRED',  color: 'text-amber-700 bg-amber-100 border-amber-200',    bar: 'bg-amber-500',  icon: Smartphone,    bg: 'bg-amber-50' },
  approve:       { label: 'APPROVED',      color: 'text-green-700 bg-green-100 border-green-200',    bar: 'bg-green-500',  icon: CheckCircle2,  bg: 'bg-green-50' },
};

function riskBar(s: number) { return s >= 80 ? 'bg-red-500' : s >= 60 ? 'bg-orange-500' : s >= 30 ? 'bg-amber-500' : 'bg-green-500'; }
function riskText(s: number) { return s >= 80 ? 'text-red-600 font-bold' : s >= 60 ? 'text-orange-600 font-bold' : s >= 30 ? 'text-amber-600' : 'text-green-600'; }

// ─── API caller ────────────────────────────────────────────────────────────────
async function callAPI(uc: UseCase): Promise<Partial<UCResult>> {
  const t0 = performance.now();
  const ms = () => Math.round(performance.now() - t0);

  if (uc.apiMode === 'score' && uc.payload) {
    const res = await fetch(`${API_BASE}/api/transactions/score`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(uc.payload) });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const d = await res.json();
    return { decision: d.decision, score: Math.round(d.score ?? 0), reason_codes: d.reason_codes ?? [], explanation: d.explanation ?? undefined, pre_txn_id: d.pre_txn_id, apiCalled: 'POST /api/transactions/score', durationMs: ms() };
  }
  if (uc.apiMode === 'explain' && uc.alertId) {
    const res = await fetch(`${API_BASE}/api/alerts/${uc.alertId}/explain`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Alert ${uc.alertId} not found`);
    const d = await res.json();
    return { decision: 'manual_review', score: d.risk_score ?? 72, explanation: d.explanation ?? d.message, apiCalled: `GET /api/alerts/${uc.alertId}/explain`, durationMs: ms() };
  }
  if (uc.apiMode === 'alert' && uc.alertId) {
    const res = await fetch(`${API_BASE}/api/alerts/${uc.alertId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Alert ${uc.alertId} not found`);
    const d = await res.json(); const a = d.alert ?? d;
    return { decision: a.status === 'open' || a.status === 'new' ? 'manual_review' : a.status === 'escalated' ? 'block' : 'manual_review', score: a.risk_score ?? 70, rawSummary: `Type: ${a.alert_type ?? '—'} · Severity: ${a.severity ?? '—'} · Account: ${a.account_name ?? '—'}`, apiCalled: `GET /api/alerts/${uc.alertId}`, durationMs: ms() };
  }
  if (uc.apiMode === 'case' && uc.caseId) {
    const res = await fetch(`${API_BASE}/api/cases/${uc.caseId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Case ${uc.caseId} not found`);
    const d = await res.json(); const c = d.case ?? d;
    return { decision: c.status === 'confirmed_fraud' || c.status === 'escalated' ? 'block' : 'manual_review', score: c.risk_score ?? 68, rawSummary: `Status: ${c.status ?? '—'} · Exposure: ₹${Number(c.total_exposure ?? 0).toLocaleString('en-IN')} · Assigned: ${c.assigned_to ?? '—'}`, apiCalled: `GET /api/cases/${uc.caseId}`, durationMs: ms() };
  }
  if (uc.apiMode === 'report' && uc.caseId) {
    const res = await fetch(`${API_BASE}/api/report/${uc.caseId}/pdf`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Report for ${uc.caseId} not found`);
    return { decision: 'block', score: 85, rawSummary: `PDF generated · SHA-256 hash: ${res.headers.get('X-Custody-Hash')?.slice(0,16) ?? 'see response header'}…`, apiCalled: `GET /api/report/${uc.caseId}/pdf`, durationMs: ms() };
  }
  if (uc.apiMode === 'dashboard') {
    const [r1, r2] = await Promise.all([fetch(`${API_BASE}/api/dashboard/analyst`), fetch(`${API_BASE}/api/dashboard/executive`)]);
    const [a, e] = await Promise.all([r1.json(), r2.json()]);
    return { decision: 'approve', score: 0, explanation: `Total alerts: ${a.total_alerts ?? '—'} · Open cases: ${a.open_cases ?? '—'} · Model F1: ${e.model_health?.f1_score ?? '—'} · Compliance: ${e.compliance?.score ?? '—'}%`, apiCalled: 'GET /api/dashboard/analyst + /executive', durationMs: ms() };
  }
  if (uc.apiMode === 'knowledge') {
    const [r1, r2] = await Promise.all([
      fetch(`${API_BASE}/api/feedback/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ case_id: 'CASE-005', confirmed_fraud: true, analyst_id: 'demo' }) }),
      fetch(`${API_BASE}/api/knowledge/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'circular transfer layering mule account hawala structuring', top_k: 3 }) }),
    ]);
    const [fb, kb] = await Promise.all([r1.json(), r2.json()]);
    const top = kb.results?.[0]?.content ?? 'Similar cases retrieved from knowledge base.';
    return { decision: 'approve', score: 0, explanation: top.slice(0, 400), rawSummary: `Feedback: ${fb.status ?? 'stored'}`, apiCalled: 'POST /api/feedback/confirm + /api/knowledge/search', durationMs: ms() };
  }
  throw new Error('Unknown apiMode');
}

// ─── Narrative builder ─────────────────────────────────────────────────────────
function buildNarrative(uc: UseCase, r: Partial<UCResult>): { narrative: string; steps: string[] } {
  const d = r.decision ?? uc.expectedDecision;
  const s = r.score ?? 0;
  const rc = r.reason_codes ?? [];
  const dLabel = DECISION_CFG[d]?.label ?? d.toUpperCase();

  if (uc.apiMode === 'score') {
    const amt = Number(uc.payload?.amount ?? 0);
    return {
      narrative: `The scoring engine received a ${uc.payload?.txn_type} of ₹${amt.toLocaleString('en-IN')} from ${uc.payload?.from_account} to ${uc.payload?.to_account}. ${rc.length ? `Reason codes: ${rc.slice(0, 3).join(', ')}. ` : ''}Risk score: ${s}/100 → decision: ${dLabel}.${d === 'block' ? ' Transaction stopped before the money moved.' : d === 'mfa' ? ' Customer must complete step-up OTP before settlement.' : d === 'manual_review' ? ' Queued in Manual Review for analyst decision.' : ' Auto-approved, no friction added.'}`,
      steps: [
        `1. Transaction arrived: ${uc.payload?.from_account} → ${uc.payload?.to_account}`,
        `2. ₹${amt.toLocaleString('en-IN')} | ${uc.payload?.txn_type} | Channel: ${uc.payload?.channel} | Currency: INR`,
        `3. Device trust check → ${uc.payload?.device_known ? '✓ TRUSTED device (reduces risk)' : '✗ UNKNOWN device (risk +15pts)'}`,
        `4. IP reputation check → ${String(uc.payload?.ip_address).startsWith('185.') ? '✗ HIGH-RISK IP 185.x.x.x detected (risk +10pts)' : '✓ IP within normal range'}`,
        `5. 5-signal scoring: amount_anomaly × 0.25 + time_anomaly × 0.15 + device_risk × 0.20 + beneficiary_risk × 0.20 + graph_risk × 0.20`,
        `6. Weighted sum → Risk Score: ${s}/100`,
        rc.length ? `7. Reason codes fired: ${rc.join(', ')}` : `7. No reason codes — all 5 signals within baseline thresholds`,
        `8. Threshold: <30=approve, 30–60=mfa, 60–80=manual_review, ≥80=block → ${dLabel}`,
        s >= 30 ? `9. LLM briefing generated (gpt-4o-mini) and attached to response` : `9. Score <30 — no LLM call needed for low-risk approvals`,
        `10. Logged to pre_txn_queue + response returned in ${r.durationMs}ms`,
      ],
    };
  }
  if (uc.apiMode === 'explain') {
    return {
      narrative: r.explanation ? `GPT-4o-mini generated the following analyst briefing for alert ${uc.alertId}: "${r.explanation.slice(0, 200)}…"` : `Alert ${uc.alertId} loaded. LLM explainer invoked with full alert context.`,
      steps: [`1. GET /api/alerts/${uc.alertId}/explain called`, `2. Alert context loaded: risk_score, reason_codes, behavioral signals, account details`, `3. ChromaDB retrieves relevant fraud policy context (RAG)`, `4. gpt-4o-mini generates analyst-quality briefing with PMLA references`, `5. Response returned in ${r.durationMs}ms`],
    };
  }
  if (uc.apiMode === 'alert') {
    return {
      narrative: `Alert ${uc.alertId} retrieved: ${r.rawSummary ?? ''}. Full payload includes risk score, alert type, behavioral signals, device forensics, network analysis, and linked case/transaction IDs.`,
      steps: [`1. GET /api/alerts/${uc.alertId} called`, `2. Alert metadata, risk score (${s}/100), and linked evidence loaded`, `3. Behavioral, device, and network analysis arrays included`, `4. Related case and transaction IDs resolved`, `5. Response returned in ${r.durationMs}ms`],
    };
  }
  if (uc.apiMode === 'case') {
    return {
      narrative: `Case ${uc.caseId} retrieved: ${r.rawSummary ?? ''}. Investigation context includes full evidence package (behavioral analysis, device forensics, network graph nodes/edges), SHA-256 integrity hash, analyst notes, and timeline.`,
      steps: [`1. GET /api/cases/${uc.caseId} called`, `2. Case summary, status, and total_exposure loaded`, `3. Evidence arrays: behavioral, device, network analysis fetched`, `4. SHA-256 chain-of-custody hash verified`, `5. Transaction graph nodes and edges serialized for React Flow`, `6. Response returned in ${r.durationMs}ms`],
    };
  }
  if (uc.apiMode === 'report') {
    return {
      narrative: `FIU-IND compliance PDF report generated for ${uc.caseId}. ${r.rawSummary ?? ''}. Report contains SAR narrative sections A–E, full transaction graph summary, reason codes, analyst notes, and SHA-256 custody hash for legal admissibility.`,
      steps: [`1. GET /api/report/${uc.caseId}/pdf called`, `2. Case confirmed_fraud status verified before generation`, `3. ReportLab PDF engine constructs Section A–E STR narrative`, `4. GPT-4o-mini generates SAR narrative text`, `5. SHA-256 hash computed over full PDF content`, `6. Binary PDF stream returned with Content-Disposition header in ${r.durationMs}ms`],
    };
  }
  if (uc.apiMode === 'dashboard') {
    return {
      narrative: `Both dashboard endpoints called simultaneously. ${r.explanation ?? 'Dashboard metrics loaded — alerts, model health, compliance, and fraud trends all returned.'}.`,
      steps: [`1. GET /api/dashboard/analyst → alert counts, severity distribution, scoring stats`, `2. GET /api/dashboard/executive → KPIs, model health, compliance, trend data`, `3. Both HTTP calls ran in parallel (Promise.all) for faster response`, `4. Combined response returned in ${r.durationMs}ms`],
    };
  }
  if (uc.apiMode === 'knowledge') {
    return {
      narrative: `Analyst feedback submitted (outcome: confirmed_fraud). ${r.rawSummary ?? ''}. Knowledge base searched and returned similar historical cases: "${(r.explanation ?? '').slice(0, 200)}…"`,
      steps: [`1. POST /api/feedback/confirm — confirmed_fraud outcome stored for CASE-005`, `2. Case status updated in feedback store + model stats recalibrated`, `3. POST /api/knowledge/search — semantic embedding query to ChromaDB`, `4. Top-3 similar cases retrieved by cosine similarity`, `5. LLM generates grounded answer from retrieved case context (RAG)`, `6. Both calls ran in parallel, completed in ${r.durationMs}ms`],
    };
  }
  return { narrative: r.explanation ?? 'API call completed.', steps: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const CUSTOM_DEF: CustomForm = {
  scenario_description: '',
  from_account: 'ACC-CUSTOM-01',
  to_account: 'ACC-CUSTOM-02',
  amount: '500000',
  txn_type: 'UPI',
  channel: 'mobile',
  device_known: 'false',
  ip_address: '185.220.101.55',
  geo_location: 'Mumbai',
  ai_narrative: '',
};

export default function DemoSimulatorPage() {
  const router = useRouter();
  const [results, setResults] = useState<Record<string, UCResult>>({});
  const [running, setRunning] = useState(false);
  const [expandedUC, setExpandedUC] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<UCGroup>>(new Set());
  const [activeFilter, setActiveFilter] = useState<UCGroup | 'ALL'>('ALL');
  const [customForm, setCustomForm] = useState<CustomForm>(CUSTOM_DEF);
  const [customResult, setCustomResult] = useState<UCResult | null>(null);
  const [customRunning, setCustomRunning] = useState(false);
  const [generating, setGenerating] = useState(false);

  const setResult = useCallback((id: string, patch: Partial<UCResult>) => {
    setResults(prev => ({ ...prev, [id]: { ...(prev[id] ?? { state: 'idle' as const }), ...patch } as UCResult }));
  }, []);

  const runUC = useCallback(async (uc: UseCase) => {
    setResult(uc.id, { state: 'loading' });
    try {
      const raw = await callAPI(uc);
      const { narrative, steps } = buildNarrative(uc, raw);
      setResult(uc.id, { state: 'done', ...raw, narrative, steps });
      setExpandedUC(uc.id);
    } catch (err) {
      setResult(uc.id, { state: 'error', error: err instanceof Error ? err.message : 'API error' });
    }
  }, [setResult]);

  const runGroup = useCallback(async (g: UCGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    await Promise.all(USE_CASES.filter(u => u.group === g).map(runUC));
  }, [runUC]);

  const runAll = useCallback(async () => {
    setRunning(true);
    setResults({});
    const toRun = activeFilter === 'ALL' ? USE_CASES : USE_CASES.filter(u => u.group === activeFilter);
    await Promise.all(toRun.map(runUC));
    setRunning(false);
  }, [activeFilter, runUC]);

  // ── AI Scenario Generator ──────────────────────────────────────────────────
  const generateScenario = async () => {
    if (!customForm.scenario_description.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/scenarios/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: customForm.scenario_description }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCustomForm(prev => ({
        ...prev,
        from_account: data.from_account ?? prev.from_account,
        to_account: data.to_account ?? prev.to_account,
        amount: String(data.amount ?? prev.amount),
        txn_type: data.txn_type ?? prev.txn_type,
        channel: data.channel ?? prev.channel,
        device_known: data.device_known === true ? 'true' : 'false',
        ip_address: data.ip_address ?? prev.ip_address,
        geo_location: data.geo_location ?? prev.geo_location,
        ai_narrative: data.narrative ?? '',
      }));
    } catch (err) {
      console.error('Scenario generation failed', err);
    } finally {
      setGenerating(false);
    }
  };

  // ── Custom Score Runner ────────────────────────────────────────────────────
  const runCustom = async () => {
    setCustomRunning(true);
    setCustomResult({ state: 'loading' });
    const t0 = performance.now();
    try {
      const res = await fetch(`${API_BASE}/api/transactions/score`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_account: customForm.from_account,
          to_account: customForm.to_account,
          amount: parseFloat(customForm.amount),
          txn_type: customForm.txn_type,
          channel: customForm.channel,
          device_known: customForm.device_known === 'true',
          ip_address: customForm.ip_address,
          geo_location: customForm.geo_location,
          currency: 'INR',
        }),
      });
      const data = await res.json();
      const score = Math.round(data.score ?? 0);
      const decision = data.decision ?? 'approve';
      const rc: string[] = data.reason_codes ?? [];
      const elapsed = Math.round(performance.now() - t0);
      const dLabel = DECISION_CFG[decision]?.label ?? decision.toUpperCase();
      setCustomResult({
        state: 'done', decision, score, reason_codes: rc, explanation: data.explanation,
        pre_txn_id: data.pre_txn_id, apiCalled: 'POST /api/transactions/score', durationMs: elapsed,
        narrative: customForm.ai_narrative
          ? `AI-generated scenario: ${customForm.ai_narrative} — Scored ${score}/100 → ${dLabel}.${rc.length ? ` Signals: ${rc.join(', ')}.` : ''}`
          : `Custom transaction scored ${score}/100 — decision: ${dLabel}.${rc.length ? ` Signals: ${rc.join(', ')}.` : ''}`,
        steps: [
          `1. Transaction: ${customForm.from_account} → ${customForm.to_account}`,
          `2. ₹${parseFloat(customForm.amount).toLocaleString('en-IN')} | ${customForm.txn_type} | ${customForm.channel}`,
          `3. Device: ${customForm.device_known === 'true' ? '✓ Trusted/registered' : '✗ Unknown/new device'}`,
          `4. IP: ${customForm.ip_address} | Location: ${customForm.geo_location}`,
          `5. 5-signal scoring engine ran (amount, time, device, beneficiary, graph)`,
          `6. Risk score: ${score}/100`,
          rc.length ? `7. Signals: ${rc.join(', ')}` : `7. No signals — all within baseline`,
          `8. Decision: ${dLabel} — returned in ${elapsed}ms`,
        ],
      });
    } catch (err) {
      setCustomResult({ state: 'error', error: err instanceof Error ? err.message : 'API error' });
    } finally {
      setCustomRunning(false);
    }
  };

  const displayed = activeFilter === 'ALL' ? USE_CASES : USE_CASES.filter(u => u.group === activeFilter);
  const doneCount = displayed.filter(u => results[u.id]?.state === 'done').length;
  const errCount = displayed.filter(u => results[u.id]?.state === 'error').length;

  return (
    <>
      <Header title="Testing Test Cases — 34 Use Cases" />
      <div className="p-6 space-y-6">

        {/* ─ Hero ──────────────────────────────────────────────────────────── */}
        <div className="rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <h2 className="text-base font-bold flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-primary" />Testing Test Cases — All 34 Use Cases
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                Each card fires a <strong>real API call</strong> with real data (ALT-001–010, CASE-001–005).
                After running, see the full pipeline walkthrough, risk signals, AI explanation, and navigate to the live page.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {(['ALL', 'A', 'B', 'C', 'D', 'E'] as const).map(g => (
                  <button key={g} onClick={() => setActiveFilter(g)}
                    className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      activeFilter === g ? 'bg-primary text-white border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/40')}>
                    {g === 'ALL' ? 'All 34' : `${GROUPS[g].label.split('.')[0]}. ${GROUPS[g].label.split('. ')[1].split(' ').slice(0, 2).join(' ')} (${GROUPS[g].ucs})`}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setResults({}); setCustomResult(null); }} disabled={running} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />Reset
              </Button>
              <Button size="sm" onClick={runAll} disabled={running} className="gap-1.5">
                {running ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {running ? 'Running…' : `Fire ${displayed.length} Scenarios`}
              </Button>
            </div>
          </div>
          {Object.keys(results).length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>{doneCount} done · {errCount} errors · {displayed.length - doneCount - errCount} remaining</span>
                <span>{Math.round((doneCount / Math.max(displayed.length, 1)) * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(doneCount / Math.max(displayed.length, 1)) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* ─ Group sections ────────────────────────────────────────────────── */}
        {(['A', 'B', 'C', 'D', 'E'] as UCGroup[])
          .filter(g => activeFilter === 'ALL' || activeFilter === g)
          .map(g => {
            const gc = GROUPS[g];
            const gUCs = USE_CASES.filter(u => u.group === g);
            const isOpen = !collapsedGroups.has(g);
            const doneCnt = gUCs.filter(u => results[u.id]?.state === 'done').length;
            return (
              <div key={g}>
                <div className={cn('flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer mb-3', gc.bg, gc.border)}
                  onClick={() => setCollapsedGroups(prev => { const n = new Set(prev); isOpen ? n.add(g) : n.delete(g); return n; })}>
                  <div className="flex items-center gap-3">
                    <gc.icon className={cn('h-4 w-4', gc.color)} />
                    <span className={cn('text-sm font-semibold', gc.color)}>{gc.label}</span>
                    <Badge variant="outline" className="text-[10px]">{doneCnt}/{gc.ucs} done</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1" disabled={running}
                      onClick={(e) => runGroup(g, e)}>
                      <Play className="h-3 w-3" />Run Group
                    </Button>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 mb-2">
                    {gUCs.map(uc => {
                      const r = results[uc.id];
                      const state = r?.state ?? 'idle';
                      const dec = r?.decision ?? uc.expectedDecision;
                      const dc = DECISION_CFG[dec] ?? DECISION_CFG.approve;
                      const DecIcon = dc.icon;
                      const isExp = expandedUC === uc.id;
                      return (
                        <Card key={uc.id} className={cn('transition-all duration-200 shadow-sm',
                          state === 'loading' && 'ring-2 ring-blue-300',
                          state === 'done' && 'ring-1 ring-green-200',
                          state === 'error' && 'ring-1 ring-red-200')}>
                          <CardHeader className="pb-2 pt-4 px-4">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.5 rounded', gc.bg, gc.color)}>{uc.id}</span>
                                  {state !== 'idle' && (
                                    <Badge className={cn('text-[10px] px-1.5 py-0 border',
                                      state === 'loading' ? 'bg-blue-100 text-blue-700 border-blue-200'
                                        : state === 'error' ? 'bg-red-100 text-red-600 border-red-200' : dc.color)}>
                                      {state === 'loading'
                                        ? <span className="flex items-center gap-1"><RefreshCw className="h-2.5 w-2.5 animate-spin" />Running…</span>
                                        : state === 'error' ? 'Error'
                                        : <span className="flex items-center gap-1"><DecIcon className="h-2.5 w-2.5" />{dc.label}</span>}
                                    </Badge>
                                  )}
                                </div>
                                <CardTitle className="text-sm mt-1 leading-tight">{uc.title}</CardTitle>
                              </div>
                              <Button variant="outline" size="sm" className="h-7 w-7 p-0 flex-shrink-0"
                                disabled={running || state === 'loading'} onClick={() => runUC(uc)}>
                                {state === 'loading' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                              </Button>
                            </div>
                          </CardHeader>

                          <CardContent className="px-4 pb-4 space-y-2">
                            <p className="text-xs text-muted-foreground leading-relaxed">{uc.description}</p>
                            <p className="text-[11px] text-foreground/60 italic leading-relaxed">{uc.persona}</p>

                            {uc.whatToLookFor && (
                              <div className="flex items-start gap-1.5 rounded bg-amber-50 border border-amber-200 px-2.5 py-2">
                                <Eye className="h-3 w-3 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-700 leading-relaxed"><span className="font-semibold">Watch for: </span>{uc.whatToLookFor}</p>
                              </div>
                            )}

                            {uc.payload && (
                              <div className="rounded bg-muted/50 px-2.5 py-2 font-mono text-[10px] space-y-0.5">
                                <div className="flex gap-2"><span className="text-muted-foreground w-14">From</span><span className="truncate">{String(uc.payload.from_account)}</span></div>
                                <div className="flex gap-2"><span className="text-muted-foreground w-14">To</span><span className="truncate">{String(uc.payload.to_account)}</span></div>
                                <div className="flex gap-2"><span className="text-muted-foreground w-14">Amount</span><span>₹{Number(uc.payload.amount).toLocaleString('en-IN')}</span></div>
                                <div className="flex gap-2"><span className="text-muted-foreground w-14">Device</span><span className={uc.payload.device_known ? 'text-green-600' : 'text-red-500'}>{uc.payload.device_known ? '✓ Trusted' : '✗ Unknown'}</span></div>
                                <div className="flex gap-2"><span className="text-muted-foreground w-14">IP</span><span className={String(uc.payload.ip_address).startsWith('185.') ? 'text-red-500' : 'text-green-600'}>{String(uc.payload.ip_address)}</span></div>
                              </div>
                            )}
                            {(uc.alertId || uc.caseId) && (
                              <div className="rounded bg-muted/50 px-2.5 py-2 font-mono text-[10px] space-y-0.5">
                                {uc.alertId && <div className="flex gap-2"><span className="text-muted-foreground w-14">Alert ID</span><span className="text-purple-600 font-bold">{uc.alertId}</span></div>}
                                {uc.caseId && <div className="flex gap-2"><span className="text-muted-foreground w-14">Case ID</span><span className="text-orange-600 font-bold">{uc.caseId}</span></div>}
                              </div>
                            )}

                            <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground inline-block truncate max-w-full">{uc.apiEndpoint}</span>

                            {state === 'done' && r && (
                              <div className="rounded-lg border bg-background p-3 space-y-2">
                                {r.score !== undefined && r.score > 0 && (
                                  <div>
                                    <div className="flex justify-between mb-1 text-[11px]">
                                      <span className="text-muted-foreground">Risk Score</span>
                                      <span className={riskText(r.score)}>{r.score}/100</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                      <div className={cn('h-full rounded-full transition-all duration-700', riskBar(r.score))} style={{ width: `${r.score}%` }} />
                                    </div>
                                  </div>
                                )}
                                {r.rawSummary && <p className="text-[11px] text-foreground/70 italic">{r.rawSummary}</p>}
                                {r.reason_codes && r.reason_codes.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {r.reason_codes.map(rc => <span key={rc} className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{rc}</span>)}
                                  </div>
                                )}
                                <button className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                                  onClick={() => setExpandedUC(isExp ? null : uc.id)}>
                                  {isExp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  {isExp ? 'Hide details' : 'What happened? →'}
                                </button>
                                {isExp && (
                                  <div className="space-y-3 pt-2 border-t">
                                    <div className="rounded bg-muted/40 p-2.5">
                                      <p className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Info className="h-3 w-3" />What happened</p>
                                      <p className="text-[11px] text-foreground leading-relaxed">{r.narrative}</p>
                                    </div>
                                    {r.steps && r.steps.length > 0 && (
                                      <div className="rounded bg-muted/40 p-2.5">
                                        <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><Cpu className="h-3 w-3" />Pipeline steps</p>
                                        <ol className="space-y-0.5">
                                          {r.steps.map((step, i) => (
                                            <li key={i} className="text-[11px] text-foreground/80 flex items-start gap-1.5">
                                              <ArrowRight className="h-2.5 w-2.5 mt-0.5 flex-shrink-0 text-primary/50" />{step}
                                            </li>
                                          ))}
                                        </ol>
                                      </div>
                                    )}
                                    {r.explanation && (
                                      <div className="rounded bg-primary/5 border border-primary/10 p-2.5">
                                        <p className="text-[10px] font-semibold text-primary mb-1 flex items-center gap-1"><Brain className="h-3 w-3" />AI / System Output</p>
                                        <p className="text-[11px] text-foreground leading-relaxed">{r.explanation.slice(0, 500)}{r.explanation.length > 500 ? '…' : ''}</p>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t flex-wrap gap-1">
                                      <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{r.durationMs}ms</span>
                                      <span className="font-mono truncate max-w-[160px]">{r.apiCalled}</span>
                                      {r.pre_txn_id && <span className="font-mono text-primary truncate max-w-[100px]">#{r.pre_txn_id.slice(-8)}</span>}
                                    </div>
                                    {uc.navigateTo && (
                                      <Button size="sm" className="w-full h-8 text-xs gap-2" onClick={() => router.push(uc.navigateTo!)}>
                                        <ExternalLink className="h-3.5 w-3.5" />{uc.navigateLabel}
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {state === 'error' && (
                              <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-1">
                                <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1"><XCircle className="h-3.5 w-3.5" />API Error</p>
                                <p className="text-[11px] text-red-500">{r?.error}</p>
                                <p className="text-[10px] text-muted-foreground">Backend running? → http://localhost:8000/docs</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

        {/* ─ AI-Powered Custom Scenario ──────────────────────────────────────── */}
        <Card className="shadow-sm border-2 border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />AI-Powered Custom Scenario Builder
            </CardTitle>
            <CardDescription className="text-xs">
              Describe any fraud scenario in plain English → AI generates realistic transaction parameters → score it live with the full pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* AI Description input */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-primary">Step 1: Describe your scenario</p>
              </div>
              <Textarea
                className="text-xs min-h-[80px] resize-none"
                placeholder="e.g. A retired teacher in Bhopal whose account was hacked overnight — attacker transferred ₹12 lakh RTGS at 2 AM to an unknown mule account in West Bengal from an unregistered device on a suspicious IP. The account had an average transaction of ₹8,000."
                value={customForm.scenario_description}
                onChange={e => setCustomForm(f => ({ ...f, scenario_description: e.target.value }))}
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Button size="sm" onClick={generateScenario} disabled={generating || !customForm.scenario_description.trim()} className="gap-2">
                  {generating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  {generating ? 'Generating…' : 'Generate with AI'}
                </Button>
                <p className="text-[11px] text-muted-foreground">GPT-4o-mini will convert your description into transaction parameters below</p>
              </div>
              {customForm.ai_narrative && (
                <div className="rounded bg-primary/10 border border-primary/20 p-2.5">
                  <p className="text-[10px] font-semibold text-primary mb-1 flex items-center gap-1"><Brain className="h-3 w-3" />AI Scenario Analysis</p>
                  <p className="text-[11px] text-foreground leading-relaxed">{customForm.ai_narrative}</p>
                </div>
              )}
            </div>

            {/* Transaction parameters */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />Step 2: Review & customize parameters
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'From Account', key: 'from_account', type: 'text' },
                  { label: 'To Account', key: 'to_account', type: 'text' },
                  { label: 'Amount (₹)', key: 'amount', type: 'number' },
                  { label: 'IP Address', key: 'ip_address', type: 'text' },
                  { label: 'Location / City', key: 'geo_location', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <p className="text-[11px] text-muted-foreground mb-1 font-medium">{f.label}</p>
                    <Input className="h-8 text-xs" type={f.type}
                      value={customForm[f.key as keyof CustomForm]}
                      onChange={e => setCustomForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1 font-medium">Transaction Type</p>
                  <Select value={customForm.txn_type} onValueChange={v => setCustomForm(f => ({ ...f, txn_type: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPI" className="text-xs">UPI — Instant, any amount</SelectItem>
                      <SelectItem value="IMPS" className="text-xs">IMPS — Instant, up to ₹5L</SelectItem>
                      <SelectItem value="NEFT" className="text-xs">NEFT — Batch settlement</SelectItem>
                      <SelectItem value="RTGS" className="text-xs">RTGS — High value ≥₹2L, immediate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1 font-medium">Banking Channel</p>
                  <Select value={customForm.channel} onValueChange={v => setCustomForm(f => ({ ...f, channel: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile" className="text-xs">Mobile Banking App</SelectItem>
                      <SelectItem value="net_banking" className="text-xs">Internet / Net Banking</SelectItem>
                      <SelectItem value="branch" className="text-xs">Branch Counter</SelectItem>
                      <SelectItem value="atm" className="text-xs">ATM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1 font-medium">Device Trust</p>
                  <Select value={customForm.device_known} onValueChange={v => setCustomForm(f => ({ ...f, device_known: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true" className="text-xs">✓ Trusted — registered device</SelectItem>
                      <SelectItem value="false" className="text-xs">✗ Unknown — new or unregistered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button size="sm" onClick={runCustom} disabled={customRunning} className="gap-2">
                {customRunning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Score This Scenario
              </Button>
              <span className="text-[11px] text-muted-foreground">
                High-risk tip: IP <code className="bg-muted px-1 rounded">185.x.x.x</code> + Unknown device + large RTGS amount → BLOCK
              </span>
            </div>

            {/* Result */}
            {customResult && customResult.state !== 'idle' && (
              <div className={cn('rounded-lg border p-4 space-y-3', customResult.state === 'error' ? 'bg-red-50 border-red-200' : 'bg-background')}>
                {customResult.state === 'loading' && <div className="flex items-center gap-2 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" />Scoring scenario…</div>}
                {customResult.state === 'error' && <p className="text-sm text-red-600 font-medium flex items-center gap-2"><XCircle className="h-4 w-4" />{customResult.error}</p>}
                {customResult.state === 'done' && customResult.decision && (() => {
                  const dc = DECISION_CFG[customResult.decision] ?? DECISION_CFG.approve;
                  const DecIcon = dc.icon;
                  return (
                    <>
                      <div className={cn('flex items-center gap-3 rounded-lg border px-4 py-3', dc.bg)}>
                        <DecIcon className="h-5 w-5" />
                        <div>
                          <p className="text-sm font-bold">{dc.label}</p>
                          <p className="text-xs opacity-75">{customResult.narrative}</p>
                        </div>
                      </div>
                      {customResult.score !== undefined && customResult.score > 0 && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground font-medium">Risk Score</span>
                            <span className={cn('font-bold', riskText(customResult.score))}>{customResult.score}/100</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className={cn('h-full rounded-full', riskBar(customResult.score))} style={{ width: `${customResult.score}%` }} />
                          </div>
                        </div>
                      )}
                      {customResult.reason_codes && customResult.reason_codes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {customResult.reason_codes.map(rc => <span key={rc} className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">{rc}</span>)}
                        </div>
                      )}
                      {customResult.steps && (
                        <div className="rounded bg-muted/40 p-3">
                          <p className="text-[10px] font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Cpu className="h-3 w-3" />Pipeline walkthrough</p>
                          <ol className="space-y-1">
                            {customResult.steps.map((s, i) => (
                              <li key={i} className="text-[11px] text-foreground/80 flex items-start gap-1.5">
                                <ArrowRight className="h-2.5 w-2.5 mt-0.5 flex-shrink-0 text-primary/50" />{s}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {customResult.explanation && (
                        <div className="rounded bg-primary/5 border border-primary/10 p-2.5">
                          <p className="text-[10px] font-semibold text-primary mb-1 flex items-center gap-1"><Brain className="h-3 w-3" />AI Explanation</p>
                          <p className="text-[11px] text-foreground leading-relaxed">{customResult.explanation.slice(0, 500)}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground border-t pt-2 flex-wrap">
                        <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{customResult.durationMs}ms</span>
                        {customResult.pre_txn_id && <span className="font-mono text-primary">ID: {customResult.pre_txn_id}</span>}
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 ml-auto"
                          onClick={() => router.push('/analyst/pre-txn-analytics')}>
                          <ExternalLink className="h-3 w-3" />View in Analytics
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─ Coverage matrix ────────────────────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />Use Case Coverage Matrix — 34/34</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left pb-2 pr-3 w-16">UC</th>
                    <th className="text-left pb-2 pr-3">Title</th>
                    <th className="text-left pb-2 pr-3 hidden md:table-cell">API / Data ID</th>
                    <th className="text-left pb-2 w-24">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {USE_CASES.map(uc => {
                    const r = results[uc.id];
                    const gc = GROUPS[uc.group];
                    return (
                      <tr key={uc.id} className="hover:bg-accent/30">
                        <td className="py-1.5 pr-3">
                          <span className={cn('font-mono font-bold text-[10px] px-1.5 py-0.5 rounded', gc.bg, gc.color)}>{uc.id}</span>
                        </td>
                        <td className="py-1.5 pr-3 font-medium">{uc.title}</td>
                        <td className="py-1.5 pr-3 font-mono text-muted-foreground text-[10px] hidden md:table-cell">
                          {uc.alertId ?? uc.caseId ?? uc.apiEndpoint.split(' ')[1]}
                        </td>
                        <td className="py-1.5">
                          {!r || r.state === 'idle' ? <span className="text-muted-foreground text-[10px]">—</span>
                            : r.state === 'loading' ? <span className="flex items-center gap-1 text-blue-600 text-[10px]"><RefreshCw className="h-3 w-3 animate-spin" />Running</span>
                            : r.state === 'error' ? <span className="flex items-center gap-1 text-red-600 text-[10px]"><XCircle className="h-3 w-3" />Error</span>
                            : <span className="flex items-center gap-1 text-green-600 text-[10px]"><CheckCircle2 className="h-3 w-3" />{r.durationMs}ms</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </>
  );
}
