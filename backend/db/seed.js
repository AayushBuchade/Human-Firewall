/**
 * db/seed.js — Upgraded Database Seed Script
 *
 * Populates all 19 PostgreSQL tables with a massive, realistic synthetic dataset:
 * - 1 Demo Organization (Demo Corp)
 * - 10 Departments (Engineering, HR, Finance, Marketing, Sales, IT, Operations, Legal, Procurement, Customer Support)
 * - 60+ Employees with behaviorally realistic stats (streaks, attempts, scores, etc.)
 * - 15 Deep Cybersecurity Training Courses, each with Lessons and Interactive Questions
 * - 50+ Phishing Templates covering 9 distinct categories
 * - Hundreds of Phishing Simulations, Phishing Events, Risk Events, Risk Scores, and Activity Logs
 * - Badges and Awarded Badges
 *
 * Credentials seeded:
 *   admin@company.com          / admin123
 *   highrisk@company.com       / password123
 *   mediumrisk@company.com     / password123
 *   lowrisk@company.com        / password123
 *   highlytrained@company.com  / password123
 *   beginner@company.com       / password123
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs      = require('fs');
const path    = require('path');
const bcrypt  = require('bcryptjs');
const { query, testConnection, getClient } = require('./index');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
const BCRYPT_ROUNDS  = 10;

// ─── 1. Fictional Employee Generation Data ─────────────────────────────────────
const DEPARTMENTS = [
  'Finance', 'Engineering', 'HR', 'Sales', 'Marketing', 'IT', 'Operations', 'Legal', 'Procurement', 'Customer Support'
];

const JOB_ROLES = {
  Finance: ['Accountant', 'Finance Analyst', 'Senior Accountant', 'Finance Director'],
  Engineering: ['Software Engineer', 'Senior Software Engineer', 'QA Engineer', 'DevOps Specialist'],
  HR: ['HR Executive', 'HR Specialist', 'HR Manager', 'Talent Acquisition Partner'],
  Sales: ['Sales Executive', 'Account Executive', 'Sales Manager', 'Business Development Representative'],
  Marketing: ['Marketing Analyst', 'Marketing Coordinator', 'Marketing Manager', 'Content Strategist'],
  IT: ['IT Administrator', 'Helpdesk Specialist', 'System Administrator', 'Network Engineer'],
  Operations: ['Operations Coordinator', 'Operations Specialist', 'Operations Manager', 'Project Manager'],
  Legal: ['Legal Associate', 'Legal Assistant', 'Compliance Officer', 'Corporate Counsel'],
  Procurement: ['Procurement Officer', 'Procurement Analyst', 'Purchasing Agent', 'Procurement Manager'],
  'Customer Support': ['Support Specialist', 'Support Coordinator', 'Senior Support Specialist', 'Customer Success Manager']
};

const FIRST_NAMES = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
  'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua',
  'Lisa', 'Nancy', 'Sandra', 'Betty', 'Ashley', 'Emily', 'Kimberly', 'Margaret', 'Donna', 'Michelle'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson',
  'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White',
  'Lopez', 'Lee', 'Gonzalez', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Perez', 'Hall',
  'Young', 'Allen', 'Sanchez', 'Wright', 'King', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson'
];

// ─── 2. Phishing Email Template Categories & Core Templates ────────────────────
const PHISHING_TEMPLATES_DATA = [
  // 1. Credential Phishing
  {
    subject: '⚠️ Security Alert: M365 SSO Re-Authentication Required',
    sender_name: 'Microsoft Account Security',
    sender_email: 'no-reply@login-microsoft365.test',
    category: 'Credential Phishing',
    difficulty: 'Intermediate',
    attack_technique: 'SSO Login Cloned',
    risk_score: 55,
    expected_user_action: 'Ignore',
    red_flags: ['Sender domain uses ".test" instead of ".com"', 'Creates urgency to prevent account lock', 'Includes suspicious redirection URL'],
    body: `Microsoft 365 Security Notice\n\nYour session has expired. To maintain security, we require you to re-authenticate your Single Sign-On (SSO) credentials immediately.\n\n👉 Access SSO Portal → http://login-microsoft365.test/sso/login\n\nIf you do not authenticate within 4 hours, your email and collaboration tools will be disabled.\n\nMicrosoft Security Center`,
    explanation: 'Microsoft will never host login warnings on lookalike domains ending with .test.'
  },
  {
    subject: '🚨 Critical Password Expiration Warning',
    sender_name: 'IT Identity Service',
    sender_email: 'it-support@corp-training.test',
    category: 'Credential Phishing',
    difficulty: 'Beginner',
    attack_technique: 'Credential Harvesting',
    risk_score: 45,
    expected_user_action: 'Ignore',
    red_flags: ['Generic greeting', 'Extremely short deadline', 'Lookalike internal domain'],
    body: `Hello Employee,\n\nYour corporate domain password expires in 12 hours. If you do not update it now, you will lose access to all internal resources, VPN, and email.\n\n👉 Keep Current Password & Update Here → http://it-support.corp-training.test/pwd-reset\n\nIT Operations Department`,
    explanation: 'Legitimate IT support never requests a password reset through direct links claiming short expirations.'
  },
  {
    subject: 'Google Workspace: Security Alert for your Account',
    sender_name: 'Workspace Security Admin',
    sender_email: 'admin@mail-awareness.test',
    category: 'Credential Phishing',
    difficulty: 'Advanced',
    attack_technique: 'Spear Phishing',
    risk_score: 70,
    expected_user_action: 'Ignore',
    red_flags: ['Suspicious sender email domain', 'Unusual location sign-in alert'],
    body: `Dear User,\n\nWe detected a sign-in attempt from an unrecognized device in Moscow, Russia. If this was not you, please verify your identity and secure your Google Workspace account immediately.\n\n👉 Secure Workspace Account Now → http://google-verify.mail-awareness.test/security\n\nGoogle Security Operations`,
    explanation: 'Security alerts always come from the main company domain (google.com), not an external .test domain.'
  },
  {
    subject: 'Action Required: SSO Multi-Factor Authentication Reset',
    sender_name: 'Okta Support Services',
    sender_email: 'okta-alerts@okta-auth.test',
    category: 'Credential Phishing',
    difficulty: 'Expert',
    attack_technique: 'SSO Bypass Scams',
    risk_score: 85,
    expected_user_action: 'Ignore',
    red_flags: ['Highly specialized sender name', 'OAuth credentials prompt link'],
    body: `Okta Security Administration\n\nOur system detected multiple failed MFA attempts on your corporate identity portal. For your protection, your MFA token has been reset. You must scan the recovery QR code or register your mobile authenticator to access applications.\n\n👉 Register MFA Token → http://okta-auth.test/register-mfa\n\nSecurity Operations Team`,
    explanation: 'Okta administrators do not send unsolicited emails requesting users to re-register MFA tokens.'
  },

  // 2. Financial Scams
  {
    subject: 'Payment Overdue: Invoice #2026-88094',
    sender_name: 'Accounts Payable - Global Solutions',
    sender_email: 'billing@global-finance.test',
    category: 'Financial Scams',
    difficulty: 'Intermediate',
    attack_technique: 'Invoice Fraud',
    risk_score: 60,
    expected_user_action: 'Ignore',
    red_flags: ['Mismatched domain in email header', 'Requests bank detail change', 'Urgent payment demand'],
    body: `Dear Partner,\n\nThis is a final reminder that invoice #2026-88094 ($14,850.00) is now 14 days overdue. Please process the payment to our updated banking coordinates attached in our billing portal immediately to avoid account suspension.\n\n👉 Access Invoice Portal → http://global-finance.test/invoice/pay\n\nRegards,\nAccounts Payable`,
    explanation: 'Change of billing details via email is a classic fraud technique. Always call directly to confirm.'
  },
  {
    subject: 'Urgent Payroll Update: Verify Bank Routing Number',
    sender_name: 'Corporate Payroll Admin',
    sender_email: 'payroll@corp-training.test',
    category: 'Financial Scams',
    difficulty: 'Advanced',
    attack_technique: 'Direct Deposit Fraud',
    risk_score: 75,
    expected_user_action: 'Ignore',
    red_flags: ['Threat of salary delay', 'Asks to submit credentials and banking info'],
    body: `Hello Team,\n\nWe encountered a transmission failure with our direct deposit file for this upcoming pay cycle. To ensure your salary is processed correctly, please log into the employee bank detail form and re-submit your routing and account information.\n\n👉 Update Bank Details Portal → http://payroll.corp-training.test/bank-details\n\nFailure to update by Friday will delay your monthly paycheck.\n\nHR & Payroll Team`,
    explanation: 'Payroll systems do not ask for direct bank details update via unsolicited external links.'
  },
  {
    subject: 'Approved: Expense Reimbursement Report #XP-0089',
    sender_name: 'Expensify Finance Service',
    sender_email: 'noreply@expensify-processing.test',
    category: 'Financial Scams',
    difficulty: 'Intermediate',
    attack_technique: 'Financial Approvals',
    risk_score: 50,
    expected_user_action: 'Ignore',
    red_flags: ['Vague expense reference', 'External site login prompt'],
    body: `Hello User,\n\nYour expense report #XP-0089 for the amount of $412.50 has been approved. The funds will be transferred to your selected bank account in 2-3 business days. Please log in to download the full itemized receipt details.\n\n👉 Download Receipt PDF → http://expensify-processing.test/expense/report\n\nExpensify Automations`,
    explanation: 'Unsolicited receipt download links from external domains are high-risk sources for Trojan attacks.'
  },

  // 3. Business Email Compromise (BEC)
  {
    subject: 'CONFIDENTIAL: Quick assistance requested by the CEO',
    sender_name: 'CEO Robert Johnson (Executive)',
    sender_email: 'ceo.johnson@corp-executive-mail.test',
    category: 'Business Email Compromise',
    difficulty: 'Advanced',
    attack_technique: 'Executive Impersonation',
    risk_score: 80,
    expected_user_action: 'Ignore',
    red_flags: ['External email address posing as internal CEO', 'Demand for secrecy', 'Urgent wire request'],
    body: `Hi,\n\nI'm currently tied up in an important acquisition meeting and cannot take calls. I need you to handle a highly confidential vendor payment of $35,000 for me today. This transaction must go out immediately to secure the contract.\n\nPlease reply to this email right away so I can send the bank instructions. Keep this private as the deal is not public yet.\n\nThanks,\nRobert Johnson\nCEO, Demo Corp`,
    explanation: 'CEOs do not ask employees to perform confidential bank transactions via alternative personal domains.'
  },
  {
    subject: 'Urgent task from your Manager',
    sender_name: 'Internal Manager',
    sender_email: 'manager.updates@corp-executive-mail.test',
    category: 'Business Email Compromise',
    difficulty: 'Intermediate',
    attack_technique: 'Manager Request',
    risk_score: 65,
    expected_user_action: 'Ignore',
    red_flags: ['Generic manager name', 'Asks to buy gift cards or execute fast changes'],
    body: `Hello,\n\nAre you at your desk right now? I need you to run a quick errand for me. I need to send gift cards to our clients as a reward, but I am in a conference. Can you buy $500 worth of Apple gift cards and send me the codes?\n\nI will reimburse you via expensify today. Let me know if you can do this immediately.\n\nSent from my iPhone`,
    explanation: 'Managers buying gift cards via email request is a typical social engineering tactic.'
  },

  // 4. HR Attacks
  {
    subject: 'New Corporate Remote Work & Leave Policy 2026',
    sender_name: 'HR Policy Department',
    sender_email: 'hr@corp-training.test',
    category: 'HR Attacks',
    difficulty: 'Beginner',
    attack_technique: 'Policy Impersonation',
    risk_score: 50,
    expected_user_action: 'Ignore',
    red_flags: ['Unexpected change in remote policy', 'External login page redirection'],
    body: `Hi Team,\n\nIn response to feedback, Demo Corp is updating its hybrid work and vacation allotment policy. Please read the document and sign the acknowledgement form by the end of the week.\n\n👉 Remote Policy Document → http://hr.corp-training.test/policies/remote-2026\n\nHuman Resources Office`,
    explanation: 'Remote policy adjustments should be verified on the official corporate intranet, not email links.'
  },
  {
    subject: 'Q1 Performance Review Schedule - Review Document',
    sender_name: 'Performance Review Board',
    sender_email: 'hr-reviews@corp-training.test',
    category: 'HR Attacks',
    difficulty: 'Intermediate',
    attack_technique: 'Performance Review Scams',
    risk_score: 60,
    expected_user_action: 'Ignore',
    red_flags: ['Highly emotional subject (reviews)', 'Direct download link'],
    body: `Hello,\n\nYour self-assessment and Q1 manager review files have been published to our HR portal. Please check the feedback and schedules to confirm your slot.\n\n👉 View Performance Feedback → http://hr.corp-training.test/reviews/q1\n\nHR Administrator`,
    explanation: 'Performance review alerts should not ask you to enter credentials via general external links.'
  },

  // 5. IT Attacks
  {
    subject: 'MFA Security Setup: Update Authenticator Settings',
    sender_name: 'IT Helpdesk Services',
    sender_email: 'support@example-security.test',
    category: 'IT Attacks',
    difficulty: 'Intermediate',
    attack_technique: 'MFA Reset Request',
    risk_score: 65,
    expected_user_action: 'Ignore',
    red_flags: ['Urgency', 'Requires credential verification'],
    body: `Dear User,\n\nWe are upgrading our active directory systems to support mandatory FIDO2 hardware keys. To ensure your account is registered for authentication, please sign in to the IT validation terminal.\n\n👉 Validate Auth Token → http://support.example-security.test/it/mfa-register\n\nIT Service Desk`,
    explanation: 'Service desks do not request unsolicited security validation via lookalike email pages.'
  },
  {
    subject: 'CRITICAL: VPN Client Software Patch Required',
    sender_name: 'IT Infrastructure Team',
    sender_email: 'networks@example-security.test',
    category: 'IT Attacks',
    difficulty: 'Advanced',
    attack_technique: 'Malware Download',
    risk_score: 75,
    expected_user_action: 'Ignore',
    red_flags: ['Direct .exe or zip file download', 'Severe network warnings'],
    body: `Attention Employee,\n\nA zero-day vulnerability (CVE-2294) is actively exploited in our current Cisco VPN client. You must download and run the security patch immediately to maintain intranet connectivity.\n\n👉 Download VPN Patch v3.4.1 → http://networks.example-security.test/vpn/patch\n\nNetwork Operations Center`,
    explanation: 'Software patches are deployed automatically by IT management tools, never as email links.'
  },

  // 6. Cloud Attacks
  {
    subject: 'File Shared: "Project Budget Q3.xlsx" in OneDrive',
    sender_name: 'SharePoint Online',
    sender_email: 'sharepoint@mail-awareness.test',
    category: 'Cloud Attacks',
    difficulty: 'Intermediate',
    attack_technique: 'Document Collaboration',
    risk_score: 55,
    expected_user_action: 'Ignore',
    red_flags: ['Fake file-sharing domain', 'Unexpected budget spreadsheet'],
    body: `SharePoint Online\n\nA coworker has shared the file "Project Budget Q3.xlsx" with you. You must sign in to your corporate Microsoft account to view or edit this file online.\n\n👉 Open Document Online → http://sharepoint.mail-awareness.test/shared/budget\n\nMicrosoft cloud services.`,
    explanation: 'Collaboration sharing alerts should be verified directly inside your Office/OneDrive application.'
  },
  {
    subject: 'Google Drive: Storage Quota Exceeded (Action Required)',
    sender_name: 'Google Storage Admin',
    sender_email: 'drive@mail-awareness.test',
    category: 'Cloud Attacks',
    difficulty: 'Beginner',
    attack_technique: 'Quota Exceeded Alert',
    risk_score: 45,
    expected_user_action: 'Ignore',
    red_flags: ['Suspicious sender address', 'Link points to storage upgrade portal'],
    body: `Workspace Storage Warning\n\nYour Google Drive storage is 99% full. To prevent loss of incoming emails and document synchronization, please log into the storage manager and expand your capacity.\n\n👉 Access Storage Manager → http://drive.mail-awareness.test/capacity\n\nGoogle Workspace Admin Team`,
    explanation: 'Storage limits are managed by company admins. Google will not email individuals to pay or sign in externally.'
  },

  // 7. Delivery Attacks
  {
    subject: 'USPS Notice: Scheduled Delivery Delay - Action Needed',
    sender_name: 'USPS Shipping Desk',
    sender_email: 'delivery@usps-shipping.test',
    category: 'Delivery Attacks',
    difficulty: 'Beginner',
    attack_technique: 'Package Tracking Scams',
    risk_score: 40,
    expected_user_action: 'Ignore',
    red_flags: ['Uses personal email context', 'External links asking for home address confirmation'],
    body: `USPS Delivery Manager\n\nWe were unable to deliver your package #US-88094 due to an incomplete address. Please verify your delivery coordinates within 48 hours to schedule a second attempt.\n\n👉 Update Delivery Address → http://delivery.usps-shipping.test/track-package\n\nUnited States Postal Service`,
    explanation: 'Delivery firms do not ask you to update details for package arrivals via non-standard domains.'
  },

  // 8. Social Engineering
  {
    subject: 'Urgent: Charity Donation Request - Hurricane Relief Fund',
    sender_name: 'Charity Relief Coordinator',
    sender_email: 'donations@relief-charity.test',
    category: 'Social Engineering',
    difficulty: 'Intermediate',
    attack_technique: 'Charity Phishing',
    risk_score: 50,
    expected_user_action: 'Ignore',
    red_flags: ['Exploiting recent events (hurricanes)', 'Direct donation processing link'],
    body: `Dear Demo Corp Team,\n\nIn light of the recent natural disaster, we are raising funds for displaced families. The executive board has agreed to match employee donations. Please log in and pledge your donation.\n\n👉 Pledge Relief Donation → http://donations.relief-charity.test/donate\n\nCharity Committee`,
    explanation: 'Relief donations matching should occur through HR officially, not an external donation portal.'
  },

  // 9. Advanced Scenarios
  {
    subject: 'Security Alert: QR Code Scan Required for Mobile Token',
    sender_name: 'IT Identity Assurance',
    sender_email: 'identity@example-security.test',
    category: 'Advanced Scenarios',
    difficulty: 'Expert',
    attack_technique: 'QR-code phishing',
    risk_score: 90,
    expected_user_action: 'Ignore',
    red_flags: ['QR code scan requested in email', 'Claims critical security bypass'],
    body: `Cybersecurity Division Warning\n\nWe are implementing device-level compliance verification. Scan the QR code below using your mobile camera and enter your corporate credential set to register your smartphone.\n\n[QR-CODE IMAGE SIMULATION: Scan QR Code to register device]\n\n👉 Register Mobile Endpoint → http://identity.example-security.test/qr-verify\n\nIdentity Operations Team`,
    explanation: 'QR code phishing (Quishing) bypasses standard email link scanning filters. Never scan QR codes from emails.'
  }
];

// ─── Additional Handcrafted Phishing Templates ────────────────────────────────
const EXTRA_TEMPLATES = [
  { subject: 'Zoom: Your Cloud Recording is Ready', sender_name: 'Zoom Notifications', sender_email: 'recordings@zoom-cloud.test', category: 'Credential Phishing', difficulty: 'Intermediate', attack_technique: 'Fake Cloud Recording', risk_score: 55, expected_user_action: 'Ignore', red_flags: ['Fake Zoom domain', 'Login required to view recording'], body: 'Hi,\n\nYour Zoom meeting recording from yesterday is now available. Click below to access the cloud recording before it expires in 7 days.\n\n👉 View Recording → http://zoom-cloud.test/recording/view\n\nZoom Video Communications', explanation: 'Zoom sends recordings from zoom.us, not zoom-cloud.test.' },
  { subject: 'LinkedIn: Someone viewed your profile', sender_name: 'LinkedIn Notifications', sender_email: 'alerts@linked-network.test', category: 'Credential Phishing', difficulty: 'Beginner', attack_technique: 'Social Media Impersonation', risk_score: 40, expected_user_action: 'Ignore', red_flags: ['Wrong sender domain', 'Curiosity exploitation'], body: 'Hi Professional,\n\nA recruiter from a Fortune 500 company viewed your LinkedIn profile. See who viewed you and connect with them.\n\n👉 See Who Viewed You → http://linked-network.test/profile/views\n\nLinkedIn Notifications', explanation: 'LinkedIn notifications come from linkedin.com, not external domains.' },
  { subject: 'DocuSign: Please review and sign document', sender_name: 'DocuSign eSignature', sender_email: 'signing@docu-esign.test', category: 'Credential Phishing', difficulty: 'Advanced', attack_technique: 'Document Signing Impersonation', risk_score: 70, expected_user_action: 'Ignore', red_flags: ['Fake DocuSign domain', 'Urgency to sign NDA', 'No specific document details'], body: 'CONFIDENTIAL\n\nA document requiring your signature has been sent by the Legal Department. Please review and electronically sign the updated Non-Disclosure Agreement within 24 hours.\n\n👉 Review Document → http://docu-esign.test/sign/nda-2026\n\nDocuSign Electronic Signature Service', explanation: 'DocuSign emails come from docusign.com and always include the sender name and specific document ID.' },
  { subject: 'Slack: New message from your manager', sender_name: 'Slack Workspace', sender_email: 'notifications@slack-workspace.test', category: 'Business Email Compromise', difficulty: 'Intermediate', attack_technique: 'Collaboration Tool Impersonation', risk_score: 55, expected_user_action: 'Ignore', red_flags: ['External Slack domain', 'Vague manager reference'], body: 'You have a new direct message from your manager in #general:\n\n"Can you hop on a quick call? I need to discuss something urgent and private."\n\n👉 Open in Slack → http://slack-workspace.test/messages/dm\n\nSlack Technologies', explanation: 'Slack notifications come from slack.com. Vague urgent requests from "your manager" are social engineering.' },
  { subject: 'Tax Refund Notification - IRS Form 1099', sender_name: 'Internal Revenue Service', sender_email: 'refunds@irs-gov.test', category: 'Financial Scams', difficulty: 'Beginner', attack_technique: 'Tax Refund Scam', risk_score: 50, expected_user_action: 'Ignore', red_flags: ['IRS never emails about refunds', 'Fake government domain'], body: 'Dear Taxpayer,\n\nAfter reviewing your tax records, you are eligible for a refund of $1,847.00. To process your refund, please verify your identity and banking information.\n\n👉 Claim Your Refund → http://irs-gov.test/refund/claim\n\nInternal Revenue Service', explanation: 'The IRS never initiates contact via email about tax refunds or requests banking information online.' },
  { subject: 'AWS: Billing Alert — Account Suspension Imminent', sender_name: 'Amazon Web Services', sender_email: 'billing@aws-services.test', category: 'Cloud Attacks', difficulty: 'Advanced', attack_technique: 'Cloud Provider Impersonation', risk_score: 75, expected_user_action: 'Ignore', red_flags: ['Fake AWS domain', 'Account suspension threat', 'Payment update link'], body: 'AWS Billing Alert\n\nYour payment method on file has been declined. Your AWS resources (EC2, S3, RDS) will be terminated in 48 hours unless payment is updated.\n\nOutstanding balance: $342.18\n\n👉 Update Payment Method → http://aws-services.test/billing/update\n\nAmazon Web Services Billing', explanation: 'AWS billing alerts come from aws.amazon.com. Always log into the AWS Console directly.' },
  { subject: 'FedEx: Customs clearance required for your shipment', sender_name: 'FedEx International', sender_email: 'customs@fedex-shipping.test', category: 'Delivery Attacks', difficulty: 'Intermediate', attack_technique: 'Customs Fee Scam', risk_score: 50, expected_user_action: 'Ignore', red_flags: ['Fake FedEx domain', 'Customs fee payment request'], body: 'FedEx International Shipping\n\nYour package #FX-9928841 is held at customs and requires a clearance fee of $18.50 before delivery can proceed.\n\n👉 Pay Customs Fee → http://fedex-shipping.test/customs/pay\n\nFedEx International Operations', explanation: 'FedEx does not email customers to pay customs fees via external links.' },
  { subject: 'Dropbox: Shared folder access expiring', sender_name: 'Dropbox Team', sender_email: 'sharing@dropbox-files.test', category: 'Cloud Attacks', difficulty: 'Beginner', attack_technique: 'File Sharing Scam', risk_score: 45, expected_user_action: 'Ignore', red_flags: ['Non-Dropbox domain', 'Access expiration urgency'], body: 'Hi,\n\nYour access to the shared folder "Q4 Financial Reports" will expire in 24 hours. Sign in to Dropbox to retain access.\n\n👉 Keep Access → http://dropbox-files.test/shared/retain\n\nThe Dropbox Team', explanation: 'Dropbox sharing notifications come from dropbox.com, not external domains.' },
  { subject: 'Urgent Legal Notice: Copyright Infringement Claim', sender_name: 'Legal Compliance Department', sender_email: 'legal@compliance-notice.test', category: 'Social Engineering', difficulty: 'Advanced', attack_technique: 'Legal Threat Scam', risk_score: 70, expected_user_action: 'Ignore', red_flags: ['Fear-inducing legal language', 'External compliance domain', 'Download attachment request'], body: 'NOTICE OF COPYRIGHT INFRINGEMENT\n\nWe have identified unauthorized use of copyrighted material associated with your corporate account. Failure to respond within 72 hours may result in legal action.\n\n👉 View Infringement Details → http://compliance-notice.test/legal/case\n\nLegal Compliance Department', explanation: 'Legitimate legal notices are served formally, not via emails demanding immediate clicks.' },
  { subject: 'Microsoft Teams: Meeting invitation from Board of Directors', sender_name: 'Microsoft Teams', sender_email: 'meetings@teams-invite.test', category: 'Business Email Compromise', difficulty: 'Advanced', attack_technique: 'Meeting Invitation Phishing', risk_score: 65, expected_user_action: 'Ignore', red_flags: ['Fake Teams domain', 'Board meeting creates authority pressure'], body: 'Microsoft Teams Meeting\n\nYou have been invited to an emergency board meeting scheduled for today at 3:00 PM EST. Please join using the link below.\n\nTopic: Organizational Restructuring — Confidential\n\n👉 Join Meeting → http://teams-invite.test/meeting/board\n\nMicrosoft Teams', explanation: 'Teams meeting invites come from microsoft.com. Emergency board meetings targeting regular employees are suspicious.' },
  { subject: 'Your Netflix account has been suspended', sender_name: 'Netflix Support', sender_email: 'support@netflix-account.test', category: 'Credential Phishing', difficulty: 'Beginner', attack_technique: 'Account Suspension Scam', risk_score: 40, expected_user_action: 'Ignore', red_flags: ['Not a corporate email', 'Fake Netflix domain', 'Account suspension urgency'], body: 'Dear Customer,\n\nWe were unable to validate your payment information. Your Netflix account has been suspended. Update your payment details to restore access.\n\n👉 Update Payment → http://netflix-account.test/billing\n\nNetflix Support Team', explanation: 'Personal service phishing in corporate inboxes should be immediately flagged as suspicious.' },
  { subject: 'GitHub: Suspicious login to your account', sender_name: 'GitHub Security', sender_email: 'security@github-alerts.test', category: 'IT Attacks', difficulty: 'Advanced', attack_technique: 'Developer Tool Impersonation', risk_score: 65, expected_user_action: 'Ignore', red_flags: ['Fake GitHub domain', 'Login from unknown IP'], body: 'GitHub Security Alert\n\nWe detected a login to your GitHub account from an unrecognized IP address (103.42.18.91) in Beijing, China. If this was not you, please secure your account immediately.\n\n👉 Review Security Events → http://github-alerts.test/security\n\nGitHub Security Team', explanation: 'GitHub security alerts come from github.com. Always navigate to GitHub directly to check.' },
  { subject: 'Cisco Webex: Your recording has been shared', sender_name: 'Webex Collaboration', sender_email: 'webex@cisco-collab.test', category: 'IT Attacks', difficulty: 'Intermediate', attack_technique: 'Collaboration Recording Scam', risk_score: 55, expected_user_action: 'Ignore', red_flags: ['Fake Cisco domain', 'Auto-generated recording name'], body: 'Webex Recording Available\n\nA new recording "All-Hands Meeting 08-13-2026" has been shared with you. Click below to view the recording.\n\n👉 Play Recording → http://cisco-collab.test/recordings/play\n\nCisco Webex', explanation: 'Webex recordings are delivered from webex.com domains, not external imitations.' },
  { subject: 'Congratulations! You won a $500 Amazon Gift Card', sender_name: 'Rewards Center', sender_email: 'rewards@gift-promo.test', category: 'Social Engineering', difficulty: 'Beginner', attack_technique: 'Prize/Reward Scam', risk_score: 35, expected_user_action: 'Ignore', red_flags: ['Too good to be true', 'Unknown rewards program', 'External domain'], body: 'CONGRATULATIONS!\n\nYou have been selected as this months winner of a $500 Amazon Gift Card! Claim your prize now before it expires.\n\n👉 Claim Gift Card → http://gift-promo.test/claim\n\nEmployee Rewards Center', explanation: 'Unsolicited prize notifications are almost always scams. Legitimate rewards come through official HR channels.' },
  { subject: 'Supplier Portal: New Purchase Order Requires Approval', sender_name: 'SAP Ariba Network', sender_email: 'procurement@sap-ariba.test', category: 'Financial Scams', difficulty: 'Expert', attack_technique: 'Supply Chain Attack', risk_score: 80, expected_user_action: 'Ignore', red_flags: ['Fake SAP domain', 'Urgent PO approval request', 'Supply chain context'], body: 'SAP Ariba Network\n\nA new purchase order (PO-2026-44891) for $87,500 requires your immediate approval. The supplier has flagged this as time-critical for Q3 delivery deadlines.\n\n👉 Approve Purchase Order → http://sap-ariba.test/po/approve\n\nSAP Ariba Procurement', explanation: 'SAP Ariba communications come from ariba.com. Always approve POs through the actual SAP system.' },
  { subject: 'Windows Defender: Trojan detected on your device', sender_name: 'Microsoft Defender ATP', sender_email: 'defender@ms-security.test', category: 'IT Attacks', difficulty: 'Intermediate', attack_technique: 'Fake Antivirus Alert', risk_score: 60, expected_user_action: 'Ignore', red_flags: ['Fake Microsoft domain', 'Fear-inducing malware alert', 'Download link'], body: 'Windows Defender Advanced Threat Protection\n\nCRITICAL: Trojan:Win32/Emotet.A detected on your workstation. Your device has been quarantined. Download and run the emergency cleanup tool immediately.\n\n👉 Download Cleanup Tool → http://ms-security.test/defender/clean\n\nMicrosoft Security Response Center', explanation: 'Microsoft Defender alerts appear in the Windows Security app, not via email download links.' },
  { subject: 'Annual Benefits Enrollment Now Open', sender_name: 'Employee Benefits Portal', sender_email: 'benefits@hr-benefits.test', category: 'HR Attacks', difficulty: 'Intermediate', attack_technique: 'Benefits Enrollment Scam', risk_score: 55, expected_user_action: 'Ignore', red_flags: ['External HR domain', 'SSN/banking info request'], body: 'Dear Employee,\n\nOpen enrollment for 2027 health, dental, and vision benefits is now live. You must complete your selections by Friday to avoid defaulting to the minimum plan.\n\nPlease have your SSN and banking details ready.\n\n👉 Start Enrollment → http://hr-benefits.test/enrollment\n\nHR Benefits Administration', explanation: 'Benefits enrollment portals are accessed through your companys official HRIS system, never external email links.' },
  { subject: 'Wire Transfer Confirmation: $28,400 sent', sender_name: 'Treasury Operations', sender_email: 'treasury@corp-banking.test', category: 'Financial Scams', difficulty: 'Expert', attack_technique: 'Wire Transfer Notification Fraud', risk_score: 85, expected_user_action: 'Ignore', red_flags: ['Fake treasury domain', 'Large unexpected transfer', 'Reversal link'], body: 'Wire Transfer Confirmation\n\nA wire transfer of $28,400.00 has been initiated from your department budget to Vendor: GlobalTech Solutions Ltd. If you did not authorize this, click below to reverse the transaction within 2 hours.\n\n👉 Reverse Transaction → http://corp-banking.test/wire/reverse\n\nTreasury Operations Department', explanation: 'Wire transfer notifications creating urgency to "reverse" are designed to steal banking credentials.' },
  { subject: 'Atlassian Jira: Critical bug assigned to you', sender_name: 'Jira Service Desk', sender_email: 'jira@atlassian-cloud.test', category: 'IT Attacks', difficulty: 'Advanced', attack_technique: 'Developer Workflow Attack', risk_score: 60, expected_user_action: 'Ignore', red_flags: ['Fake Atlassian domain', 'Critical priority creates urgency'], body: 'Jira Service Desk Notification\n\n[CRITICAL] BUG-4491 has been assigned to you by the CTO. Priority: Blocker. The production deployment is halted until this is resolved.\n\n👉 View Issue → http://atlassian-cloud.test/jira/BUG-4491\n\nAtlassian Jira', explanation: 'Jira notifications come from atlassian.net. Always open issues directly in your Jira dashboard.' },
  { subject: 'Your Uber receipt for $0.00', sender_name: 'Uber Receipts', sender_email: 'receipts@uber-rides.test', category: 'Social Engineering', difficulty: 'Beginner', attack_technique: 'Receipt Curiosity Trap', risk_score: 35, expected_user_action: 'Ignore', red_flags: ['Fake Uber domain', '$0.00 receipt creates curiosity', 'Personal service in work email'], body: 'Your Trip with Uber\n\nYour Uber ride on Aug 13, 2026 has been completed.\nTotal: $0.00\n\nThis looks unusual? View your trip details and dispute the charge.\n\n👉 View Receipt → http://uber-rides.test/receipt\n\nUber Technologies, Inc.', explanation: 'Suspicious $0 receipts are designed to make you click out of curiosity. Uber receipts come from uber.com.' },
  { subject: 'Salesforce: Your password will expire in 1 hour', sender_name: 'Salesforce Identity', sender_email: 'identity@salesforce-crm.test', category: 'Credential Phishing', difficulty: 'Advanced', attack_technique: 'CRM Credential Theft', risk_score: 70, expected_user_action: 'Ignore', red_flags: ['Fake Salesforce domain', 'Extremely short expiry window'], body: 'Salesforce Security\n\nYour Salesforce password expires in 1 hour. All CRM access including dashboards, reports, and customer records will be locked until you reset your credentials.\n\n👉 Reset Password Now → http://salesforce-crm.test/password/reset\n\nSalesforce Identity Services', explanation: 'Salesforce password resets come from salesforce.com. One-hour expiry windows are unusual and suspicious.' },
  { subject: 'Apple ID: Unusual purchase detected - $999.99', sender_name: 'Apple Support', sender_email: 'support@apple-id.test', category: 'Financial Scams', difficulty: 'Beginner', attack_technique: 'Fake Purchase Alert', risk_score: 45, expected_user_action: 'Ignore', red_flags: ['Fake Apple domain', 'Large purchase creates panic', 'Cancellation link'], body: 'Apple ID Purchase Confirmation\n\nA purchase of $999.99 for MacBook Pro was made with your Apple ID. If you did not make this purchase, cancel it immediately.\n\n👉 Cancel Purchase → http://apple-id.test/purchases/cancel\n\nApple Support', explanation: 'Apple purchase alerts come from apple.com. Fake large purchases are designed to create panic clicks.' },
  { subject: 'Board Resolution: Immediate organizational changes', sender_name: 'Executive Office', sender_email: 'board@executive-comm.test', category: 'Business Email Compromise', difficulty: 'Expert', attack_technique: 'Executive Authority Exploitation', risk_score: 80, expected_user_action: 'Ignore', red_flags: ['External executive domain', 'Confidentiality pressure', 'Organizational fear'], body: 'STRICTLY CONFIDENTIAL\n\nThe Board of Directors has approved immediate organizational restructuring. Your position may be affected. Review the attached restructuring plan and confirm your acknowledgment by end of day.\n\n👉 View Restructuring Plan → http://executive-comm.test/board/plan\n\nOffice of the CEO', explanation: 'Organizational changes are communicated through official internal channels, not external email links.' },
  { subject: 'Stripe: Payout failed — action required', sender_name: 'Stripe Payments', sender_email: 'payouts@stripe-pay.test', category: 'Financial Scams', difficulty: 'Advanced', attack_technique: 'Payment Processor Impersonation', risk_score: 65, expected_user_action: 'Ignore', red_flags: ['Fake Stripe domain', 'Failed payout urgency'], body: 'Stripe Dashboard Notification\n\nYour scheduled payout of $12,340.00 has failed due to an invalid bank account on file. Update your banking details to receive your funds.\n\n👉 Update Bank Account → http://stripe-pay.test/settings/bank\n\nStripe Payments', explanation: 'Stripe communications come from stripe.com. Always update banking details through the Stripe Dashboard directly.' },
  { subject: 'IT Department: Mandatory software update', sender_name: 'Corporate IT Services', sender_email: 'updates@corp-it.test', category: 'IT Attacks', difficulty: 'Intermediate', attack_technique: 'Fake Software Update', risk_score: 60, expected_user_action: 'Ignore', red_flags: ['External IT domain', 'Mandatory .exe download'], body: 'MANDATORY NOTICE\n\nAll employees must install the latest security patch (v4.2.1) for the corporate communication suite. Download and run the installer before 5 PM today.\n\n👉 Download Patch → http://corp-it.test/updates/patch-v4.2.1.exe\n\nCorporate IT Services', explanation: 'Software updates are deployed via IT management tools (SCCM, Intune), never as email download links.' },
  { subject: 'WeTransfer: Someone sent you files', sender_name: 'WeTransfer', sender_email: 'noreply@we-transfer.test', category: 'Cloud Attacks', difficulty: 'Intermediate', attack_technique: 'File Transfer Impersonation', risk_score: 55, expected_user_action: 'Ignore', red_flags: ['Fake WeTransfer domain', 'Unknown file sender'], body: 'WeTransfer\n\njohn.doe@partner.com sent you 3 files (24.8 MB)\n\nFiles:\n- Contract_Final_v3.pdf\n- Payment_Schedule.xlsx\n- NDA_Signed.pdf\n\nDownload expires in 7 days.\n\n👉 Download Files → http://we-transfer.test/download\n\nWeTransfer B.V.', explanation: 'WeTransfer links come from wetransfer.com. Unexpected file transfers from unknown senders are high-risk.' },
  { subject: 'Pension Fund: Annual statement ready', sender_name: 'Corporate Pension Services', sender_email: 'pension@retirement-fund.test', category: 'HR Attacks', difficulty: 'Intermediate', attack_technique: 'Pension/Retirement Scam', risk_score: 55, expected_user_action: 'Ignore', red_flags: ['External pension domain', 'Financial information request'], body: 'Dear Employee,\n\nYour annual pension statement for FY2025-2026 is now available. Log in to review your retirement fund balance and beneficiary details.\n\n👉 View Pension Statement → http://retirement-fund.test/statement\n\nCorporate Pension Administration', explanation: 'Pension statements are accessed through your official benefits portal, not external email links.' },
  { subject: 'Verify your identity: Suspicious activity on your SSO', sender_name: 'Azure Active Directory', sender_email: 'identity@azure-auth.test', category: 'Credential Phishing', difficulty: 'Expert', attack_technique: 'Azure AD Impersonation', risk_score: 85, expected_user_action: 'Ignore', red_flags: ['Fake Azure domain', 'Identity verification request', 'SSO credential harvesting'], body: 'Azure Active Directory Security\n\nWe have detected unusual sign-in activity on your enterprise SSO account. Multiple failed attempts from unrecognized devices require immediate identity verification.\n\n👉 Verify Identity → http://azure-auth.test/identity/verify\n\nMicrosoft Azure Security', explanation: 'Azure AD alerts come from microsoft.com domains. Never verify identity through external links.' },
  { subject: 'Company Survey: Employee Satisfaction (Required)', sender_name: 'People & Culture Team', sender_email: 'survey@employee-voice.test', category: 'HR Attacks', difficulty: 'Beginner', attack_technique: 'Survey Data Harvesting', risk_score: 40, expected_user_action: 'Ignore', red_flags: ['External survey domain', 'Mandatory completion pressure'], body: 'Hi Team,\n\nAs part of our commitment to workplace excellence, please complete the mandatory Employee Satisfaction Survey. Your responses are anonymous and confidential.\n\n👉 Start Survey → http://employee-voice.test/survey/2026\n\nPeople & Culture Department', explanation: 'Internal surveys are hosted on official company tools (SurveyMonkey, Qualtrics via SSO), not unknown domains.' },
];
PHISHING_TEMPLATES_DATA.push(...EXTRA_TEMPLATES);

// ─── Legitimate (safe) emails mixed into inbox ────────────────────────────────
const LEGITIMATE_EMAILS = [
  { subject: 'Team Standup — Daily Sync at 10:00 AM', sender_name: 'Engineering Team', sender_email: 'engineering@company.com', category: 'Legitimate Email', difficulty: 'Beginner', attack_technique: 'Internal Communication', risk_score: 0, expected_user_action: 'Mark Safe', red_flags: [], body: 'Hi Team,\n\nReminder: Daily standup is at 10:00 AM in Conference Room B and via Teams.\n\nAgenda:\n- Sprint progress review\n- Blocker discussion\n- Deployment schedule\n\nSee you there,\nEngineering Lead', explanation: 'Internal meeting reminders from verified company domains are legitimate.' },
  { subject: 'Q3 All-Hands Meeting — Save the Date', sender_name: 'People Operations', sender_email: 'peopleops@company.com', category: 'Legitimate Email', difficulty: 'Beginner', attack_technique: 'Internal Communication', risk_score: 0, expected_user_action: 'Mark Safe', red_flags: [], body: 'Dear Colleagues,\n\nOur Q3 All-Hands meeting is scheduled for August 28 at 2:00 PM EST.\n\nTopics include company performance, product roadmap, and open Q&A with leadership.\n\nCalendar invite has been sent separately.\n\nPeople Operations', explanation: 'Company-wide announcements from HR/People Ops on the corporate domain are expected.' },
  { subject: 'IT Maintenance Window — Sunday 2:00–4:00 AM', sender_name: 'IT Service Desk', sender_email: 'itsupport@company.com', category: 'Legitimate Email', difficulty: 'Beginner', attack_technique: 'Internal Communication', risk_score: 0, expected_user_action: 'Mark Safe', red_flags: [], body: 'Notice: Scheduled maintenance on VPN and email servers this Sunday from 2:00–4:00 AM EST.\n\nServices may be briefly unavailable. No action is required from employees.\n\nIT Service Desk\nExt. 4400', explanation: 'Maintenance notices from verified IT on the company domain are legitimate.' },
  { subject: 'Your expense report EXP-2026-1847 has been approved', sender_name: 'Finance Operations', sender_email: 'finance@company.com', category: 'Legitimate Email', difficulty: 'Intermediate', attack_technique: 'Internal Communication', risk_score: 0, expected_user_action: 'Mark Safe', red_flags: [], body: 'Hello,\n\nYour expense report EXP-2026-1847 for $342.50 has been approved.\n\nReimbursement will appear in your next payroll cycle (Aug 30).\n\nView details in the internal expense portal (no external link required).\n\nFinance Operations', explanation: 'Expense approvals referencing internal systems without external links are legitimate.' },
  { subject: 'Welcome to Demo Corp — Onboarding Checklist', sender_name: 'HR Onboarding', sender_email: 'hr@company.com', category: 'Legitimate Email', difficulty: 'Beginner', attack_technique: 'Internal Communication', risk_score: 0, expected_user_action: 'Mark Safe', red_flags: [], body: 'Welcome aboard!\n\nYour onboarding checklist:\n1. Complete security awareness training\n2. Set up MFA on your account\n3. Review the employee handbook on the intranet\n4. Schedule your 30-day check-in with your manager\n\nHR Onboarding Team', explanation: 'Onboarding emails from HR on the corporate domain are standard legitimate communications.' },
  { subject: 'Security Tip of the Week: Enable MFA', sender_name: 'Security Awareness Team', sender_email: 'security@company.com', category: 'Legitimate Email', difficulty: 'Beginner', attack_technique: 'Internal Communication', risk_score: 0, expected_user_action: 'Mark Safe', red_flags: [], body: 'Security Tip of the Week\n\nMulti-Factor Authentication (MFA) adds a critical layer of protection to your account.\n\nIf you haven\'t enabled MFA yet, visit the internal IT portal from your browser bookmarks (do not use email links).\n\nStay secure,\nSecurity Awareness Team', explanation: 'Security awareness tips from the official security team domain are legitimate.' },
  { subject: 'Project Atlas — Sprint 14 Retrospective Notes', sender_name: 'Sarah Chen', sender_email: 'sarah.chen@company.com', category: 'Legitimate Email', difficulty: 'Intermediate', attack_technique: 'Internal Communication', risk_score: 0, expected_user_action: 'Mark Safe', red_flags: [], body: 'Team,\n\nAttached are the retrospective notes from Sprint 14.\n\nKey takeaways:\n- Deployment pipeline improvements shipped\n- Two critical bugs resolved\n- Action items assigned in Jira\n\nNotes are on the shared drive.\n\nSarah', explanation: 'Colleague emails from verified @company.com addresses about internal projects are legitimate.' },
  { subject: 'Office Closure — Public Holiday Aug 15', sender_name: 'Facilities Management', sender_email: 'facilities@company.com', category: 'Legitimate Email', difficulty: 'Beginner', attack_technique: 'Internal Communication', risk_score: 0, expected_user_action: 'Mark Safe', red_flags: [], body: 'All Employees,\n\nThe office will be closed on August 15 for the public holiday.\n\nEmergency IT support remains available via the helpdesk hotline.\n\nFacilities Management', explanation: 'Facilities announcements on the company domain are legitimate.' },
];
PHISHING_TEMPLATES_DATA.push(...LEGITIMATE_EMAILS);

// Generate additional synthetic templates programmatically (reach 80+ total)
const GEN_CATEGORIES = ['Credential Phishing', 'Financial Scams', 'IT Attacks', 'HR Attacks', 'Cloud Attacks', 'Delivery Attacks', 'Social Engineering', 'Business Email Compromise', 'Advanced Scenarios'];
const GEN_TECHNIQUES = ['Urgency Exploitation', 'Authority Impersonation', 'Fear Inducement', 'Curiosity Bait', 'Reward Lure', 'Scarcity Pressure', 'Familiarity Abuse', 'Spear Phishing', 'Clone Phishing', 'Smishing Simulation'];
const GEN_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const GEN_DOMAINS = ['example-security.test', 'corp-training.test', 'mail-awareness.test', 'verify-portal.test', 'secure-login.test'];

for (let i = 0; i < 35; i++) {
  const cat = GEN_CATEGORIES[i % GEN_CATEGORIES.length];
  const tech = GEN_TECHNIQUES[i % GEN_TECHNIQUES.length];
  const diff = GEN_DIFFICULTIES[i % GEN_DIFFICULTIES.length];
  const domain = GEN_DOMAINS[i % GEN_DOMAINS.length];
  PHISHING_TEMPLATES_DATA.push({
    subject: `[Simulation #${i + 48}] Action Required — ${tech}`,
    sender_name: `${cat.split(' ')[0]} Alerts`,
    sender_email: `alerts-${i}@${domain}`,
    category: cat,
    difficulty: diff,
    attack_technique: tech,
    risk_score: 35 + (i % 55),
    expected_user_action: 'Ignore',
    red_flags: ['Synthetic sender domain', 'Urgency language', 'Unexpected request'],
    body: `${cat} Simulation\n\nThis is synthetic training email #${i + 48}. An attacker using ${tech} is attempting to manipulate you into taking immediate action.\n\n👉 Review Simulation → http://${domain}/sim/${i + 48}\n\nSecurity Training System`,
    explanation: `This simulated ${cat.toLowerCase()} email uses ${tech.toLowerCase()} — a common social engineering technique.`,
  });
}

// ─── 3. Courses, Modules, Lessons, Questions Data ─────────────────────────────
const TRAINING_DATA = [
  {
    title: 'Phishing Fundamentals',
    category: 'phishing',
    difficulty: 'beginner',
    duration: '10 min',
    xp: 120,
    icon: '🎣',
    description: 'Learn the primary indicators of simulated and real phishing attempts.',
    slides: [
      { title: 'What is Phishing?', content: 'Phishing is a social engineering attack where criminals send spoofed messages to trick you into sharing passwords, installing malware, or authorization code bypasses.', tip: '📊 Over 80% of corporate data breaches start with email phishing!' },
      { title: 'Spotting Lookalike Domains', content: 'Always check the full sender email domain, not just the display name. Attackers use lookalike domains (typosquatting) like microsoft-support.org or g00gle.com.', tip: '🔍 Hover over the sender name to reveal the real email address.' }
    ],
    questions: [
      {
        question_text: 'What is the most secure response to an email from an unknown sender demanding urgent password updates?',
        options: ['Click the link and inspect the page', 'Ignore the email and report it to IT Support', 'Enter fake credentials to test the site', 'Forward it to your colleagues to ask them'],
        correct_option_index: 1,
        explanation: 'Reporting suspicious emails to IT is the safest course of action and alerts security teams.'
      }
    ]
  },
  {
    title: 'Social Engineering',
    category: 'social_engineering',
    difficulty: 'intermediate',
    duration: '15 min',
    xp: 150,
    icon: '🎭',
    description: 'Recognize manipulation techniques like pretexting, baiting, and urgency.',
    slides: [
      { title: 'Manipulation Tactics', content: 'Social engineers exploit human traits like curiosity, fear, helpfulness, and trust. If someone asks you to bypass processes out of urgency, be skeptical.', tip: '🧠 Human hacking is often easier than technical network bypass.' }
    ],
    questions: [
      {
        question_text: 'An attacker calls pretending to be IT and asks for your MFA backup codes to "solve a synchronization error." This is:',
        options: ['Spear phishing', 'Baiting', 'Pretexting / Social Engineering', 'A legitimate request'],
        correct_option_index: 2,
        explanation: 'Pretexting involves creating a fake scenario (IT admin) to extract credentials or security codes.'
      }
    ]
  },
  {
    title: 'Password Security',
    category: 'passwords',
    difficulty: 'beginner',
    duration: '8 min',
    xp: 100,
    icon: '🔑',
    description: 'Create unbreakable passphrase sets and secure login tokens.',
    slides: [
      { title: 'Passphrase Advantage', content: 'Instead of short passwords, use passphrases of 4+ random words. For example: "sunset-giraffe-stapler-beach". They are highly resistant to brute force attacks.', tip: '🔑 Length is the single most important factor in password strength!' }
    ],
    questions: [
      {
        question_text: 'Which password is the most resistant to brute-force guessing?',
        options: ['Pa$$w0rd123', 'admin123', 'carpet-purple-coffee-ocean', 'JohnSmith1995'],
        correct_option_index: 2,
        explanation: 'A four-word passphrase is extremely long and hard to guess while being easier to remember.'
      }
    ]
  },
  {
    title: 'MFA Security',
    category: 'passwords',
    difficulty: 'beginner',
    duration: '10 min',
    xp: 110,
    icon: '📱',
    description: 'Understand multi-factor authentication modes and guard against push fatigue.',
    slides: [
      { title: 'Push Bombing/Fatigue', content: 'Attackers who obtain your password might trigger constant push authentication alerts on your phone. Approving these out of fatigue compromises your account.', tip: '🚨 NEVER approve an MFA push notification you did not actively initiate.' }
    ],
    questions: [
      {
        question_text: 'What should you do if you receive multiple unsolicited MFA login prompt notices on your phone?',
        options: ['Approve it to clear the notification list', 'Ignore them and go to sleep', 'Deny the request and change your account password immediately', 'Delete the authenticator app'],
        correct_option_index: 2,
        explanation: 'Unsolicited notifications mean someone has your password. You must block the login and change your password.'
      }
    ]
  },
  {
    title: 'Suspicious URLs',
    category: 'browsing',
    difficulty: 'intermediate',
    duration: '12 min',
    xp: 130,
    icon: '🌐',
    description: 'How to safely inspect links, expand shortened URLs, and check SSL certificates.',
    slides: [
      { title: 'URL Anatomy', content: 'Before clicking, inspect what is right before the first slash: e.g., in http://signin.microsoft.com.security-verify.net/auth, the actual domain is "security-verify.net", not Microsoft.', tip: '👁️ Always read URLs from right to left starting from the domain extension.' }
    ],
    questions: [
      {
        question_text: 'Where does the link lead: http://amazon.support.com.verification-portal.xyz/login?',
        options: ['amazon.com', 'support.com', 'verification-portal.xyz', 'amazon.support.com'],
        correct_option_index: 2,
        explanation: 'The actual domain is always the portion immediately preceding the top-level domain (.xyz) and first single slash.'
      }
    ]
  },
  {
    title: 'Business Email Compromise',
    category: 'bec',
    difficulty: 'advanced',
    duration: '15 min',
    xp: 200,
    icon: '💼',
    description: 'Learn CEO fraud, supplier invoice scams, and how to verify bank transfers.',
    slides: [
      { title: 'The Secrecy Trap', content: 'BEC emails often request complete secrecy and ask to bypass normal billing procedures. They claim the request is time-critical to induce panic.', tip: '📞 Always verify payment detail changes via a secondary, trusted voice channel.' }
    ],
    questions: [
      {
        question_text: 'Your CEO sends a confidential email asking you to wire $25,000 immediately to a new bank account. What is the correct protocol?',
        options: ['Perform the wire immediately as requested', 'Reply to the email requesting invoice attachments', 'Call the CEO on a known number or verify in person before sending funds', 'Forward to the CFO and let them deal with it'],
        correct_option_index: 2,
        explanation: 'BEC attacks rely on emails. Independent voice verification halts wire fraud.'
      }
    ]
  },
  {
    title: 'Safe Email Handling',
    category: 'phishing',
    difficulty: 'beginner',
    duration: '8 min',
    xp: 90,
    icon: '📧',
    description: 'Best practices for managing attachments, external email banners, and spam.',
    slides: [
      { title: 'Attachment Payloads', content: 'Malicious macros are frequently stored inside Word (.doc) and Excel (.xls) sheets. Avoid running macros on files downloaded from external senders.', tip: '📎 PDF and HTML attachments can also carry redirection scripts.' }
    ],
    questions: [
      {
        question_text: 'What should you do if an external email attachment prompts you to "Enable Editing" or "Enable Macros" to view content?',
        options: ['Enable it so you can see the text', 'Report the email and delete the attachment safely', 'Forward it to your personal email to open', 'Save it to your desktop and run a scan'],
        correct_option_index: 1,
        explanation: 'Enabling macros allows arbitrary script executions. This should be blocked.'
      }
    ]
  },
  {
    title: 'QR Code Phishing',
    category: 'phishing',
    difficulty: 'advanced',
    duration: '10 min',
    xp: 140,
    icon: '📱',
    description: 'Spotting "Quishing" attacks targeting mobile cameras and bypass credentials.',
    slides: [
      { title: 'The Rise of Quishing', content: 'Because modern email scanners find it hard to inspect images, attackers embed QR codes in emails. When scanned, it leads your mobile device to credential phishing sites.', tip: '📷 Treat QR codes in emails with extreme caution, especially for login actions.' }
    ],
    questions: [
      {
        question_text: 'Why do hackers use QR codes in emails instead of standard links?',
        options: ['QR codes look more professional', 'QR codes bypass typical email gateway link scanners', 'QR codes load pages faster on desktop', 'QR codes encrypt the credential connection'],
        correct_option_index: 1,
        explanation: 'Many legacy gateways scan plain links but do not extract and scan QR codes in image attachments.'
      }
    ]
  },
  {
    title: 'USB & Removable Media Safety',
    category: 'social_engineering',
    difficulty: 'intermediate',
    duration: '9 min',
    xp: 110,
    icon: '💾',
    description: 'Prevent malware infections from unknown USB drives and charging ports.',
    slides: [
      { title: 'The Parking Lot Trick', content: 'Attackers drop USB drives containing custom Trojans in office parking lots. Out of curiosity, employees plug them in, initiating keylogger downloads.', tip: '💾 If you find a flash drive, turn it in to Security; never plug it into any device.' }
    ],
    questions: [
      {
        question_text: 'You find a USB drive labeled "Salary Review Q4" on the breakroom table. What is the safest response?',
        options: ['Plug it into your personal laptop first', 'Plug it into your work desktop to see who owns it', 'Hand it over to IT Security immediately without plugging it in', 'Throw it in the trash'],
        correct_option_index: 2,
        explanation: 'USB drives are active execution vectors. Handing it to IT protects the network.'
      }
    ]
  },
  {
    title: 'Public Wi-Fi Security',
    category: 'browsing',
    difficulty: 'beginner',
    duration: '10 min',
    xp: 100,
    icon: '📶',
    description: 'Protecting remote devices when connecting from airports, hotels, and cafes.',
    slides: [
      { title: 'Man-in-the-Middle Attacks', content: 'On public Wi-Fi networks, attackers can intercept data packets or set up lookalike access points. Using a Corporate VPN secures network tunnels.', tip: '📶 Always verify the exact Wi-Fi SSID with hotel/cafe employees.' }
    ],
    questions: [
      {
        question_text: 'Which is the safest way to connect to corporate resources from a coffee shop?',
        options: ['Join the open coffee shop network directly', 'Use your phone hotspot or join cafe Wi-Fi with your Corporate VPN enabled', 'Use HTTP connection sites only', 'Turn off your firewall for faster login'],
        correct_option_index: 1,
        explanation: 'VPNs encrypt all traffic, preventing local intercept attempts on open networks.'
      }
    ]
  },
  {
    title: 'Data Protection',
    category: 'bec',
    difficulty: 'intermediate',
    duration: '12 min',
    xp: 130,
    icon: '🛡️',
    description: 'Best practices for handling PII, GDPR compliance, and data storage policies.',
    slides: [
      { title: 'What is PII?', content: 'Personally Identifiable Information (PII) includes emails, phone numbers, SSNs, and addresses. Leaking PII causes severe fines and corporate liability.', tip: '🔐 Always encrypt spreadsheets containing client details before sharing.' }
    ],
    questions: [
      {
        question_text: 'Which data item constitutes Personally Identifiable Information (PII)?',
        options: ['Company operating system type', 'Customer home address and phone details', 'Office printer model number', 'Stock ticker symbols list'],
        correct_option_index: 1,
        explanation: 'Home addresses and phone numbers identify unique individuals, constituting PII.'
      }
    ]
  },
  {
    title: 'Secure Remote Work',
    category: 'social_engineering',
    difficulty: 'beginner',
    duration: '10 min',
    xp: 90,
    icon: '🏠',
    description: 'Maintaining workstation safety, physical locks, and home routers.',
    slides: [
      { title: 'Physical Security', content: 'Remote work requires vigilance. Lock your screens when walking away, even at home or cafes. Secure your home router with a non-default administrator passkey.', tip: '🖥️ press Windows Key + L to instantly lock your Windows computer screen.' }
    ],
    questions: [
      {
        question_text: 'When working from a local library or cafe, what physical action is required when leaving your desk for a moment?',
        options: ['Ask a stranger to watch your laptop', 'Cover your screen with a notebook', 'Lock your computer screen and carry valuable drives with you', 'Leave it active to keep the connection open'],
        correct_option_index: 2,
        explanation: 'Locking screens stops local access. Never trust strangers with devices.'
      }
    ]
  },
  {
    title: 'Incident Reporting',
    category: 'phishing',
    difficulty: 'beginner',
    duration: '7 min',
    xp: 100,
    icon: '🚨',
    description: 'How to notify security teams, report suspicious clicks, and write incident tickets.',
    slides: [
      { title: 'Speed Saves Networks', content: 'If you accidentally click a malicious link or enter your password, do not hide it. Informing security in minutes lets them isolate your device and rotate tokens.', tip: '⏱️ Immediate response is key to mitigating active network breaches.' }
    ],
    questions: [
      {
        question_text: 'You accidentally clicked a phishing link and entered your login credentials. What is your immediate next action?',
        options: ['Hope nothing happens and continue working', 'Change your password immediately and submit an incident report to the IT Security Team', 'Wait until your next manager evaluation to report it', 'Reinstall your web browser'],
        correct_option_index: 1,
        explanation: 'Fast password change stops attackers, and notifying security allows audit monitoring.'
      }
    ]
  },
  {
    title: 'AI-Generated Phishing',
    category: 'phishing',
    difficulty: 'advanced',
    duration: '11 min',
    xp: 150,
    icon: '🤖',
    description: 'Understand how LLMs are used to generate grammatically perfect spear-phishing emails.',
    slides: [
      { title: 'The End of Bad Grammar', content: 'Historically, phishing had poor spelling. Now, attackers use LLMs to write perfect emails custom-tailored to your role or department.', tip: '🤖 Pay attention to the logic and request, not just the spelling and layout.' }
    ],
    questions: [
      {
        question_text: 'Why is AI-generated phishing harder to detect than traditional spam?',
        options: ['It uses special encrypted fonts', 'It contains zero grammar errors and is personalized based on publicly available job info', 'It disables your browser security headers', 'It has fake SSL padlocks in the email header'],
        correct_option_index: 1,
        explanation: 'Generative AI removes classic grammar mistakes and designs highly plausible templates.'
      }
    ]
  },
  {
    title: 'Deepfake & Impersonation',
    category: 'social_engineering',
    difficulty: 'expert',
    duration: '15 min',
    xp: 180,
    icon: '🗣️',
    description: 'Detecting synthetic video and audio clonings of executives or vendors.',
    slides: [
      { title: 'Voice and Video Cloning', content: 'Attackers clone the voice of your CEO from public speeches and call accounting requesting instant bank adjustments. Always require dual authorization workflows.', tip: '🗣️ Verify audio-only wire requests by asking internal questions not available online.' }
    ],
    questions: [
      {
        question_text: 'You receive an urgent Microsoft Teams video call from your Director requesting an emergency cash transfer, but their lip sync seems slightly laggy. What is the risk?',
        options: ['Poor network speed only', 'Deepfake video injection attack', 'A bug in Teams software', 'System memory overload'],
        correct_option_index: 1,
        explanation: 'Laggy Lip-sync and strange movements suggest real-time generative deepfakes used for voice/video frauds.'
      }
    ]
  }
];

// Enrich each course with additional slides and quiz questions for deeper learning
const EXTRA_SLIDES_BY_CATEGORY = {
  phishing: [
    { title: 'Real-World Case Study', content: 'In 2024, a major healthcare provider lost 4.5 million patient records after an employee clicked a fake IT password reset email. The entire breach started with one convincing message.', tip: '📰 Search "phishing breach case study" to learn from real incidents.' },
    { title: 'The Report Button', content: 'Most corporate email clients have a "Report Phishing" button. Using it sends the email to your security team for analysis and protects colleagues from the same attack.', tip: '🚨 Reporting takes 5 seconds but can save the entire organization.' },
  ],
  social_engineering: [
    { title: 'Authority & Urgency', content: 'Attackers often pose as executives or IT admins and create artificial deadlines. Always verify unexpected requests through a separate trusted channel.', tip: '📞 When in doubt, call the person directly using a known phone number.' },
    { title: 'Tailgating & Physical SE', content: 'Social engineering isn\'t just digital. Attackers may follow employees through secure doors or leave infected USB drives in parking lots.', tip: '🚪 Never hold secure doors open for unrecognized individuals.' },
  ],
  passwords: [
    { title: 'Password Managers', content: 'Enterprise password managers generate and store unique passwords for every account. This eliminates password reuse — the #1 cause of credential stuffing attacks.', tip: '🔐 Ask IT about your company\'s approved password manager.' },
  ],
  browsing: [
    { title: 'HTTPS vs HTTP', content: 'HTTPS encrypts data in transit but does NOT guarantee a site is legitimate. Phishing sites can also use HTTPS certificates.', tip: '🔒 The padlock icon means encrypted — not necessarily safe.' },
  ],
  bec: [
    { title: 'Vendor Impersonation', content: 'Attackers compromise or spoof vendor email accounts and send fake invoices with updated bank details. Finance teams must verify all payment changes by phone.', tip: '💰 Never change vendor payment details based on email alone.' },
  ],
};

for (const course of TRAINING_DATA) {
  const extras = EXTRA_SLIDES_BY_CATEGORY[course.category] || EXTRA_SLIDES_BY_CATEGORY.phishing;
  course.slides.push(...extras.slice(0, 2));
  if (course.questions.length === 1) {
    course.questions.push({
      question_text: `After completing "${course.title}", what is the most important takeaway?`,
      options: ['Ignore all emails from unknown senders', 'Apply the techniques learned and report suspicious activity', 'Disable your antivirus for faster email loading', 'Share passwords with your team for backup'],
      correct_option_index: 1,
      explanation: 'Applying learned security practices and reporting suspicious activity protects the entire organization.',
    });
  }
}

// ─── 4. Badges ────────────────────────────────────────────────────────────────
const BADGES = [
  { name: 'Phishing Hunter', description: 'Correctly report 5 simulated phishing attempts.', icon: '🎣', requirement_type: 'phishing_reported', requirement_threshold: 5 },
  { name: 'URL Detective', description: 'Complete the Suspicious URLs course with a perfect score.', icon: '🔍', requirement_type: 'quiz_completed', requirement_threshold: 1 },
  { name: 'MFA Guardian', description: 'Successfully pass the MFA authentication assessment.', icon: '🛡️', requirement_type: 'mfa_score', requirement_threshold: 1 },
  { name: 'Security Champion', description: 'Earn 1000 total training experience points (XP).', icon: '🏆', requirement_type: 'xp_earned', requirement_threshold: 1000 },
  { name: 'Incident Reporter', description: 'Report a simulated attack within 10 minutes of arrival.', icon: '🚨', requirement_type: 'report_speed', requirement_threshold: 1 },
  { name: 'Social Engineering Expert', description: 'Complete all social engineering category training units.', icon: '🎭', requirement_type: 'social_completed', requirement_threshold: 1 },
  { name: 'Cyber Defender', description: 'Maintain a 5-day active security streak.', icon: '🔥', requirement_type: 'security_streak', requirement_threshold: 5 }
];

// ─── Main Seeding Process ──────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 Aware Guard Cybersecurity SaaS — Upgraded DB Seeder\n');

  await testConnection();

  console.log('📄 Executing schema rebuild (schema.sql)...');
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await query(schemaSql);
  console.log('   ✓ Schema reset and tables established.');

  // 1. Seed Departments
  console.log('\n🏢 Seeding Departments...');
  const deptMap = {};
  for (const deptName of DEPARTMENTS) {
    const res = await query(
      'INSERT INTO departments (org_id, name) VALUES ($1, $2) RETURNING id',
      [DEFAULT_ORG_ID, deptName]
    );
    deptMap[deptName] = res.rows[0].id;
    console.log(`   ✓ Department: ${deptName} (${res.rows[0].id})`);
  }

  // 2. Hash Passwords and Seed Demo Accounts
  console.log('\n👤 Seeding Administrative and Demo Accounts...');
  const hashedAdminPassword = await bcrypt.hash('admin123', BCRYPT_ROUNDS);
  const hashedPassword = await bcrypt.hash('password123', BCRYPT_ROUNDS);

  // Admin Account
  await query(
    `INSERT INTO users (name, email, password_hash, role, department, org_id, job_role, risk_score, risk_level, avatar)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    ['Security Officer', 'admin@company.com', hashedAdminPassword, 'admin', 'Security', DEFAULT_ORG_ID, 'Chief Information Security Officer', 12, 'Very Secure', 'SO']
  );
  console.log('   ✓ Admin Account: admin@company.com / admin123');

  // Demo Employees
  const DEMO_EMPLOYEES_CONFIG = [
    {
      name: 'High Risk Employee',
      email: 'highrisk@company.com',
      department: 'Finance',
      job_role: 'Accountant',
      risk_score: 88,
      risk_level: 'Critical',
      phishing_attempts: 12,
      phishing_clicked: 9,
      phishing_reported: 1,
      credential_submission_attempts: 5,
      training_completed: 1,
      training_progress: 7,
      training_xp: 120,
      lessons_completed: JSON.stringify(['Phishing Fundamentals']),
      failed_quizzes: 4,
      successful_quizzes: 1,
      security_streak: 0,
      total_simulations: 12,
      avatar: 'HR'
    },
    {
      name: 'Medium Risk Employee',
      email: 'mediumrisk@company.com',
      department: 'Sales',
      job_role: 'Sales Executive',
      risk_score: 52,
      risk_level: 'Moderate Risk',
      phishing_attempts: 10,
      phishing_clicked: 4,
      phishing_reported: 3,
      credential_submission_attempts: 1,
      training_completed: 3,
      training_progress: 20,
      training_xp: 330,
      lessons_completed: JSON.stringify(['Phishing Fundamentals', 'Social Engineering', 'Password Security']),
      failed_quizzes: 2,
      successful_quizzes: 3,
      security_streak: 2,
      total_simulations: 10,
      avatar: 'MR'
    },
    {
      name: 'Low Risk Employee',
      email: 'lowrisk@company.com',
      department: 'Engineering',
      job_role: 'Software Engineer',
      risk_score: 18,
      risk_level: 'Very Secure',
      phishing_attempts: 15,
      phishing_clicked: 1,
      phishing_reported: 13,
      credential_submission_attempts: 0,
      training_completed: 10,
      training_progress: 66,
      training_xp: 1140,
      lessons_completed: JSON.stringify([
        'Phishing Fundamentals', 'Social Engineering', 'Password Security', 'MFA Security',
        'Suspicious URLs', 'Safe Email Handling', 'QR Code Phishing', 'Secure Remote Work',
        'Incident Reporting', 'AI-Generated Phishing'
      ]),
      failed_quizzes: 0,
      successful_quizzes: 10,
      security_streak: 9,
      total_simulations: 15,
      avatar: 'LR'
    },
    {
      name: 'Highly Trained Employee',
      email: 'highlytrained@company.com',
      department: 'IT',
      job_role: 'IT Administrator',
      risk_score: 8,
      risk_level: 'Very Secure',
      phishing_attempts: 20,
      phishing_clicked: 0,
      phishing_reported: 19,
      credential_submission_attempts: 0,
      training_completed: 15,
      training_progress: 100,
      training_xp: 2010,
      lessons_completed: JSON.stringify(TRAINING_DATA.map(t => t.title)),
      failed_quizzes: 0,
      successful_quizzes: 15,
      security_streak: 15,
      total_simulations: 20,
      avatar: 'HT'
    },
    {
      name: 'Beginner Employee',
      email: 'beginner@company.com',
      department: 'Customer Support',
      job_role: 'Support Specialist',
      risk_score: 40,
      risk_level: 'Low Risk',
      phishing_attempts: 4,
      phishing_clicked: 1,
      phishing_reported: 1,
      credential_submission_attempts: 0,
      training_completed: 0,
      training_progress: 0,
      training_xp: 0,
      lessons_completed: JSON.stringify([]),
      failed_quizzes: 1,
      successful_quizzes: 0,
      security_streak: 0,
      total_simulations: 4,
      avatar: 'BE'
    }
  ];

  const userResMap = {};

  for (const emp of DEMO_EMPLOYEES_CONFIG) {
    const userRes = await query(
      `INSERT INTO users (
        name, email, password_hash, role, department, department_id, org_id, job_role,
        risk_score, risk_level, phishing_attempts, phishing_clicked, phishing_reported,
        credential_submission_attempts, training_completed, training_progress, training_xp,
        lessons_completed, failed_quizzes, successful_quizzes, security_streak, total_simulations, avatar, last_activity
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23, NOW() - INTERVAL '1 hour')
       RETURNING id`,
      [
        emp.name, emp.email, hashedPassword, 'employee', emp.department, deptMap[emp.department], DEFAULT_ORG_ID, emp.job_role,
        emp.risk_score, emp.risk_level, emp.phishing_attempts, emp.phishing_clicked, emp.phishing_reported,
        emp.credential_submission_attempts, emp.training_completed, emp.training_progress, emp.training_xp,
        emp.lessons_completed, emp.failed_quizzes, emp.successful_quizzes, emp.security_streak, emp.total_simulations, emp.avatar
      ]
    );
    userResMap[emp.email] = userRes.rows[0].id;
    console.log(`   ✓ Demo Employee: ${emp.email} (Risk Score: ${emp.risk_score})`);
  }

  // 3. Seed Fictional Large Dataset (65 employees)
  console.log('\n👥 Seeding 65 Synthetic Employees...');
  for (let i = 0; i < 65; i++) {
    const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const name = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@company.test`;
    const dept = DEPARTMENTS[i % DEPARTMENTS.length];
    const deptId = deptMap[dept];
    const rolesList = JOB_ROLES[dept];
    const job_role = rolesList[i % rolesList.length];

    // Seed randomized but behaviorally aligned stats
    // Types of profiles: Secure, Cautious, High Risk, Critical
    const dice = Math.random();
    let risk_score, risk_level;
    let phishing_attempts, phishing_clicked, phishing_reported, credential_submission_attempts;
    let training_completed, training_progress, training_xp, failed_quizzes, successful_quizzes;
    let security_streak, total_simulations;

    if (dice < 0.25) {
      // Secure Employee (low risk)
      phishing_attempts = 10 + Math.floor(Math.random() * 8);
      phishing_clicked = Math.floor(Math.random() * 2);
      phishing_reported = phishing_attempts - phishing_clicked - Math.floor(Math.random() * 2);
      credential_submission_attempts = 0;
      training_completed = 8 + Math.floor(Math.random() * 8);
      training_progress = Math.round((training_completed / 15) * 100);
      training_xp = training_completed * 120;
      successful_quizzes = training_completed;
      failed_quizzes = Math.floor(Math.random() * 2);
      security_streak = 5 + Math.floor(Math.random() * 10);
    } else if (dice < 0.65) {
      // Cautious (low-moderate risk)
      phishing_attempts = 8 + Math.floor(Math.random() * 8);
      phishing_clicked = 1 + Math.floor(Math.random() * 3);
      phishing_reported = Math.max(0, phishing_attempts - phishing_clicked - 2 - Math.floor(Math.random() * 2));
      credential_submission_attempts = Math.floor(Math.random() * 2);
      training_completed = 4 + Math.floor(Math.random() * 6);
      training_progress = Math.round((training_completed / 15) * 100);
      training_xp = training_completed * 110;
      successful_quizzes = training_completed;
      failed_quizzes = 1 + Math.floor(Math.random() * 3);
      security_streak = Math.floor(Math.random() * 5);
    } else if (dice < 0.90) {
      // High Risk (High risk)
      phishing_attempts = 10 + Math.floor(Math.random() * 6);
      phishing_clicked = 5 + Math.floor(Math.random() * 4);
      phishing_reported = Math.floor(Math.random() * 2);
      credential_submission_attempts = 2 + Math.floor(Math.random() * 3);
      training_completed = 1 + Math.floor(Math.random() * 3);
      training_progress = Math.round((training_completed / 15) * 100);
      training_xp = training_completed * 100;
      successful_quizzes = training_completed;
      failed_quizzes = 3 + Math.floor(Math.random() * 4);
      security_streak = 0;
    } else {
      // Critical Risk
      phishing_attempts = 12 + Math.floor(Math.random() * 6);
      phishing_clicked = 9 + Math.floor(Math.random() * 4);
      phishing_reported = 0;
      credential_submission_attempts = 4 + Math.floor(Math.random() * 4);
      training_completed = 0;
      training_progress = 0;
      training_xp = 0;
      successful_quizzes = 0;
      failed_quizzes = 4 + Math.floor(Math.random() * 5);
      security_streak = 0;
    }

    total_simulations = phishing_attempts;

    // Calculate deterministic risk score based on formula
    // Base 40
    // + click = +30, ignore/miss = +10, report = -15
    // - training_completed = -10
    // - successful_quizzes = -5
    // + credential_attempts = +40
    const rawScore = 40 + (phishing_clicked * 30) + ((phishing_attempts - phishing_clicked - phishing_reported) * 10)
                     - (phishing_reported * 15) - (training_completed * 10) - (successful_quizzes * 5)
                     + (credential_submission_attempts * 40);
    risk_score = Math.max(0, Math.min(100, rawScore));

    if (risk_score <= 20) risk_level = 'Very Secure';
    else if (risk_score <= 40) risk_level = 'Low Risk';
    else if (risk_score <= 60) risk_level = 'Moderate Risk';
    else if (risk_score <= 80) risk_level = 'High Risk';
    else risk_level = 'Critical';

    const avatar = fn[0] + ln[0];
    const lessonsList = TRAINING_DATA.slice(0, training_completed).map(t => t.title);

    await query(
      `INSERT INTO users (
        name, email, password_hash, role, department, department_id, org_id, job_role,
        risk_score, risk_level, phishing_attempts, phishing_clicked, phishing_reported,
        credential_submission_attempts, training_completed, training_progress, training_xp,
        lessons_completed, failed_quizzes, successful_quizzes, security_streak, total_simulations, avatar, last_activity
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23, NOW() - (INTERVAL '1 day' * $24))` ,
      [
        name, email, hashedPassword, 'employee', dept, deptId, DEFAULT_ORG_ID, job_role,
        risk_score, risk_level, phishing_attempts, phishing_clicked, phishing_reported,
        credential_submission_attempts, training_completed, training_progress, training_xp,
        JSON.stringify(lessonsList), failed_quizzes, successful_quizzes, security_streak, total_simulations, avatar, i % 10
      ]
    );
  }
  console.log('   ✓ Generated 65 synthetic employee database records successfully.');

  // 4. Seed Training Courses, Modules, Lessons, Questions
  console.log('\n📖 Seeding Training System (15 Courses, Lessons & Quizzes)...');
  const lessonMapByTitle = {};
  for (const course of TRAINING_DATA) {
    const courseRes = await query(
      `INSERT INTO training_courses (title, description, category, difficulty, duration, xp, icon)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [course.title, course.description, course.category, course.difficulty, course.duration, course.xp, course.icon]
    );
    const courseId = courseRes.rows[0].id;

    // Create 1 module per course
    const modRes = await query(
      `INSERT INTO training_modules (course_id, title, description, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [courseId, `${course.title} Core`, `General requirements for ${course.title}`, 1]
    );
    const moduleId = modRes.rows[0].id;

    // Create 1 lesson per module (with embedded slides JSON)
    const slidesData = course.slides.map(s => ({
      title: s.title,
      content: s.content,
      tip: s.tip
    }));

    const lessonRes = await query(
      `INSERT INTO training_lessons (module_id, title, content, tip, slides, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [moduleId, course.title, course.slides[0].content, course.slides[0].tip || '', JSON.stringify(slidesData), 1]
    );
    const lessonId = lessonRes.rows[0].id;

    // Create questions for the quiz
    for (const q of course.questions) {
      await query(
        `INSERT INTO training_questions (lesson_id, question_text, options, correct_option_index, explanation, type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [lessonId, q.question_text, JSON.stringify(q.options), q.correct_option_index, q.explanation, 'multiple_choice']
      );
    }
    console.log(`   ✓ Course created: "${course.title}" with quiz.`);
    lessonMapByTitle[course.title] = lessonId;
  }

  // Fix demo user lessons_completed — convert course titles to lesson UUIDs
  console.log('\n🔗 Linking training progress to lesson IDs...');
  const demoLessonTitles = {
    'highrisk@company.com': ['Phishing Fundamentals'],
    'mediumrisk@company.com': ['Phishing Fundamentals', 'Social Engineering', 'Password Security'],
    'lowrisk@company.com': [
      'Phishing Fundamentals', 'Social Engineering', 'Password Security', 'MFA Security',
      'Suspicious URLs', 'Safe Email Handling', 'QR Code Phishing', 'Secure Remote Work',
      'Incident Reporting', 'AI-Generated Phishing',
    ],
    'highlytrained@company.com': TRAINING_DATA.map(t => t.title),
  };

  for (const [email, titles] of Object.entries(demoLessonTitles)) {
    const ids = titles.map(t => lessonMapByTitle[t]).filter(Boolean);
    await query(
      `UPDATE users SET lessons_completed = $1 WHERE email = $2`,
      [JSON.stringify(ids), email]
    );
  }

  // Update synthetic employees with lesson IDs based on training_completed count
  const synthUsers = await query(
    `SELECT id, training_completed FROM users WHERE email LIKE '%@company.test'`
  );
  const allLessonIds = TRAINING_DATA.map(t => lessonMapByTitle[t.title]).filter(Boolean);
  for (const u of synthUsers.rows) {
    const ids = allLessonIds.slice(0, u.training_completed);
    await query(`UPDATE users SET lessons_completed = $1 WHERE id = $2`, [JSON.stringify(ids), u.id]);
  }
  console.log('   ✓ Training progress linked to lesson UUIDs.');

  // 5. Seed Phishing Templates
  console.log('\n🎣 Seeding Phishing Templates (60 Scenarios)...');
  const templateIds = [];
  for (const t of PHISHING_TEMPLATES_DATA) {
    const templateRes = await query(
      `INSERT INTO phishing_templates (subject, sender_name, sender_email, body, category, difficulty, attack_technique, risk_score, red_flags, expected_user_action, explanation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [t.subject, t.sender_name, t.sender_email, t.body, t.category, t.difficulty, t.attack_technique, t.risk_score, JSON.stringify(t.red_flags), t.expected_user_action, t.explanation]
    );
    templateIds.push(templateRes.rows[0].id);
  }
  console.log(`   ✓ Seeding completed. ${templateIds.length} scenarios stored.`);

  // 5b. Seed per-user phishing inbox (25+ emails per employee)
  console.log('\n📬 Seeding per-user phishing inboxes (25+ emails each)...');
  const allTemplatesRes = await query('SELECT id, category FROM phishing_templates ORDER BY created_at ASC');
  const allTemplates = allTemplatesRes.rows;
  const phishingPool = allTemplates.filter(t => t.category !== 'Legitimate Email');
  const safePool = allTemplates.filter(t => t.category === 'Legitimate Email');

  const allEmployees = await query(`SELECT id, email, phishing_clicked, phishing_reported, phishing_attempts FROM users WHERE role = 'employee'`);
  let simCount = 0;

  for (const emp of allEmployees.rows) {
    const inboxSize = 25 + Math.floor(Math.random() * 6);
    const selectedIds = new Set();
    const inboxTemplates = [];

    // ~25% safe emails, rest phishing
    const safeCount = Math.max(3, Math.floor(inboxSize * 0.25));
    for (let s = 0; s < safeCount && safePool.length > 0; s++) {
      const t = safePool[Math.floor(Math.random() * safePool.length)];
      if (!selectedIds.has(t.id)) { selectedIds.add(t.id); inboxTemplates.push(t); }
    }
    while (inboxTemplates.length < inboxSize && phishingPool.length > 0) {
      const t = phishingPool[Math.floor(Math.random() * phishingPool.length)];
      if (!selectedIds.has(t.id)) { selectedIds.add(t.id); inboxTemplates.push(t); }
    }

    // Pre-populate historical actions for employees with existing stats
    let clicksLeft = parseInt(emp.phishing_clicked || 0, 10);
    let reportsLeft = parseInt(emp.phishing_reported || 0, 10);
    const actedTotal = clicksLeft + reportsLeft;

    for (let i = 0; i < inboxTemplates.length; i++) {
      const tmpl = inboxTemplates[i];
      let status = 'sent';
      let actedAt = null;

      if (i < actedTotal) {
        if (reportsLeft > 0) {
          status = tmpl.category === 'Legitimate Email' ? 'marked_safe' : 'reported';
          reportsLeft--;
        } else if (clicksLeft > 0) {
          status = 'clicked';
          clicksLeft--;
        } else {
          status = 'ignored';
        }
        actedAt = `NOW() - (INTERVAL '1 day' * ${Math.floor(Math.random() * 14) + 1})`;
      }

      if (actedAt) {
        await query(
          `INSERT INTO phishing_simulations (user_id, template_id, status, created_at, acted_at)
           VALUES ($1, $2, $3, NOW() - (INTERVAL '1 hour' * $4), ${actedAt})`,
          [emp.id, tmpl.id, status, i]
        );
      } else {
        await query(
          `INSERT INTO phishing_simulations (user_id, template_id, status, created_at)
           VALUES ($1, $2, $3, NOW() - (INTERVAL '1 hour' * $4))`,
          [emp.id, tmpl.id, status, i]
        );
      }
      simCount++;
    }
  }
  console.log(`   ✓ Created ${simCount} per-user simulation inbox entries.`);

  // 6. Seed Campaigns
  console.log('\n📢 Seeding Campaigns...');
  const campaignRes = await query(
    `INSERT INTO campaigns (org_id, name, target_departments, attack_category, difficulty, num_simulations, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '30 days', NOW() + INTERVAL '30 days') RETURNING id`,
    [DEFAULT_ORG_ID, 'Q3 Global Phishing Test', JSON.stringify(['Finance', 'Sales', 'Engineering']), 'Credential Phishing', 'Intermediate', 3]
  );
  const campaignId = campaignRes.rows[0].id;
  console.log(`   ✓ Campaign Q3 Active: ${campaignId}`);

  // 7. Seed Badges
  console.log('\n🏅 Seeding Gamification Badges...');
  const badgeMap = {};
  for (const b of BADGES) {
    const badgeRes = await query(
      'INSERT INTO badges (name, description, icon, requirement_type, requirement_threshold) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [b.name, b.description, b.icon, b.requirement_type, b.requirement_threshold]
    );
    badgeMap[b.name] = badgeRes.rows[0].id;
  }
  console.log('   ✓ Badges populated.');

  // 8. Seed Historical events, simulations, risk history, and security logs for demo accounts
  console.log('\n📈 Generating Historical Activities, Risk Trends & Logs...');
  const allUsersRes = await query('SELECT id, email, risk_score, name FROM users WHERE role = $1', ['employee']);
  for (const row of allUsersRes.rows) {
    const userId = row.id;

    // Award badges to low-risk and highly-trained users
    if (row.email === 'lowrisk@company.com' || row.email === 'highlytrained@company.com') {
      await query(
        'INSERT INTO employee_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, badgeMap['Security Champion']]
      );
      await query(
        'INSERT INTO employee_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, badgeMap['Cyber Defender']]
      );
    }

    // Risk timeline history (7 points back)
    for (let dayOffset = 7; dayOffset >= 0; dayOffset--) {
      // Simulate historical risk trend
      const historicScore = Math.max(10, Math.min(100, row.risk_score + (dayOffset * 3) - Math.floor(Math.random() * 6)));
      await query(
        'INSERT INTO risk_scores (user_id, score, recorded_at) VALUES ($1, $2, NOW() - (INTERVAL \'1 day\' * $3))',
        [userId, historicScore, dayOffset]
      );
    }

    // Add security activities
    if (row.email === 'highrisk@company.com') {
      await query(`INSERT INTO security_activity (user_id, activity_type, description, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL '2 days')`, [userId, 'FAILED_PHISHING', 'Clicked on M365 SSO simulated phishing link.']);
      await query(`INSERT INTO security_activity (user_id, activity_type, description, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL '1 day')`, [userId, 'SUBMITTED_CREDENTIALS', 'Submitted password credentials on credential harvesting warning page.']);
      await query(`INSERT INTO risk_events (user_id, org_id, score_change, score_after, severity, trigger, reason, details) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, DEFAULT_ORG_ID, +30, 88, 'critical', 'phishing_simulation', 'Clicked credential harvesting link and input active password.', JSON.stringify({ category: 'Credential Phishing' })]
      );
    } else if (row.email === 'highlytrained@company.com') {
      await query(`INSERT INTO security_activity (user_id, activity_type, description, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL '3 days')`, [userId, 'COMPLETED_LESSON', 'Successfully completed Phishing Fundamentals course.']);
      await query(`INSERT INTO security_activity (user_id, activity_type, description, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL '2 days')`, [userId, 'REPORTED_PHISHING', 'Reported simulated billing invoice phishing attempt.']);
      await query(`INSERT INTO security_activity (user_id, activity_type, description, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL '1 day')`, [userId, 'COMPLETED_LESSON', 'Completed all required corporate security training lessons.']);
    } else {
      // General activities
      await query(`INSERT INTO security_activity (user_id, activity_type, description, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL '4 days')`, [userId, 'COMPLETED_LESSON', 'Completed Password Security overview training.']);
      await query(`INSERT INTO security_activity (user_id, activity_type, description, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL '1 day')`, [userId, 'REPORTED_PHISHING', 'Reported fake package delivery alert.']);
    }
  }

  console.log('\n✅ SEEDING COMPLETED SUCCESSFULLY!');
  console.log('----------------------------------------------------');
  console.log('Admin Account:        admin@company.com       / admin123');
  console.log('High-risk employee:   highrisk@company.com    / password123');
  console.log('Medium-risk employee: mediumrisk@company.com  / password123');
  console.log('Low-risk employee:    lowrisk@company.com     / password123');
  console.log('Highly-trained:       highlytrained@company.com / password123');
  console.log('Beginner employee:    beginner@company.com    / password123');
  console.log('----------------------------------------------------\n');

  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ DB Seeding Failed:', err);
  process.exit(1);
});
