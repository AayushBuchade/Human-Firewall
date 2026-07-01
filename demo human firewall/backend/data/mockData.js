const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const SALT = bcrypt.genSaltSync(10);

const users = [
  {
    id: 'user-001',
    name: 'Alice Johnson',
    email: 'alice@company.com',
    password: bcrypt.hashSync('password123', SALT),
    role: 'employee',
    orgId: 'org-001',
    department: 'Finance',
    avatar: 'AJ',
    joinedAt: '2024-01-15',
  },
  {
    id: 'user-002',
    name: 'Bob Smith',
    email: 'bob@company.com',
    password: bcrypt.hashSync('password123', SALT),
    role: 'employee',
    orgId: 'org-001',
    department: 'Engineering',
    avatar: 'BS',
    joinedAt: '2024-02-20',
  },
  {
    id: 'user-003',
    name: 'Carol White',
    email: 'carol@company.com',
    password: bcrypt.hashSync('password123', SALT),
    role: 'employee',
    orgId: 'org-001',
    department: 'HR',
    avatar: 'CW',
    joinedAt: '2024-03-10',
  },
  {
    id: 'admin-001',
    name: 'Admin User',
    email: 'admin@company.com',
    password: bcrypt.hashSync('admin123', SALT),
    role: 'admin',
    orgId: 'org-001',
    department: 'Security',
    avatar: 'AU',
    joinedAt: '2023-12-01',
  },
];

const phishingEmails = [
  {
    id: 'email-001',
    from: 'security-alerts@g00gle-verify.com',
    fromName: 'Google Security Team',
    to: 'alice@company.com',
    subject: '⚠️ Urgent: Your account will be suspended in 24 hours',
    body: `Dear User,\n\nWe have detected unusual activity on your Google account. Your account is at risk of being permanently disabled.\n\nTo verify your identity and restore full access, please click the link below IMMEDIATELY:\n\n👉 Verify Account Now → http://g00gle-account-restore.xyz/verify\n\nThis link expires in 24 hours. Failure to verify will result in permanent account suspension.\n\nRegards,\nGoogle Security Team`,
    timestamp: '2026-04-08T08:30:00Z',
    redFlags: [
      'Sender domain is "g00gle-verify.com" — NOT google.com',
      'Creates urgency with "24 hours" deadline',
      'Suspicious link points to an unknown domain',
      'Generic greeting "Dear User" instead of your name',
      'Threats of permanent suspension to cause panic',
    ],
    difficulty: 'medium',
    category: 'account_takeover',
    isPhishing: true,
  },
  {
    id: 'email-002',
    from: 'payroll@company-hr-payslip.net',
    fromName: 'HR Payroll Department',
    to: 'alice@company.com',
    subject: 'Your December Payslip is Ready - Action Required',
    body: `Hello,\n\nYour payslip for December 2025 is now available. Due to a system migration, please log in to our new portal to download your payslip and update your bank details.\n\n👉 Access Payslip Portal → http://company-hr-payslip.net/login\n\nIMPORTANT: Update your bank account details by April 10 to ensure timely salary transfer.\n\nIf you do not update your details, your salary payment may be delayed.\n\nHR Department`,
    timestamp: '2026-04-07T14:15:00Z',
    redFlags: [
      'Domain "company-hr-payslip.net" is not your official company domain',
      'Asking to update bank details via email link — HR never does this',
      'Vague reference to "system migration"',
      'Threat of delayed salary creates panic',
      'Sent from an external domain pretending to be internal HR',
    ],
    difficulty: 'hard',
    category: 'credential_harvest',
    isPhishing: true,
  },
  {
    id: 'email-003',
    from: 'noreply@microsoft.com',
    fromName: 'Microsoft 365',
    to: 'alice@company.com',
    subject: 'Your monthly subscription renewal confirmation',
    body: `Hi Alice,\n\nThank you for renewing your Microsoft 365 Business subscription.\n\nOrder Summary:\n- Microsoft 365 Business Standard (Annual)\n- Renewal Date: April 8, 2026\n- Next Billing: April 8, 2027\n- Amount: $150.00\n\nYou can manage your subscription at account.microsoft.com.\n\nIf you have questions, visit our support center.\n\nMicrosoft Corporation\n1 Microsoft Way, Redmond, WA 98052`,
    timestamp: '2026-04-06T10:00:00Z',
    redFlags: [],
    difficulty: 'easy',
    category: 'legitimate',
    isPhishing: false,
  },
  {
    id: 'email-004',
    from: 'it-support@comp4ny-helpdeskk.com',
    fromName: 'IT Support',
    to: 'alice@company.com',
    subject: 'URGENT: Click here to reset your VPN password NOW',
    body: `Hi Employee,\n\nOur IT system detected that your VPN credentials have been compromised. You must reset your password IMMEDIATELY to prevent unauthorized access to company systems.\n\nStep 1: Click the link below\nStep 2: Enter your current password\nStep 3: Set a new password\n\n🔒 Reset VPN Password → http://vpn-reset.comp4ny-helpdeskk.com/login\n\nThis is time-sensitive. If not completed within 2 hours, your account will be locked.\n\nIT Support Team`,
    timestamp: '2026-04-08T09:45:00Z',
    redFlags: [
      'Domain "comp4ny-helpdeskk.com" uses number "4" instead of letter "a"',
      'IT support never asks you to enter current password in a link',
      'Extreme urgency: "2 hours" deadline',
      'Generic "Hi Employee" instead of your name',
      'Link domain doesn\'t match company domain',
    ],
    difficulty: 'easy',
    category: 'credential_harvest',
    isPhishing: true,
  },
  {
    id: 'email-005',
    from: 'ceo.johnson@company-executive-mail.org',
    fromName: 'CEO - Robert Johnson',
    to: 'alice@company.com',
    subject: 'Confidential - Wire Transfer Needed ASAP',
    body: `Alice,\n\nI need you to handle an urgent and confidential wire transfer. We are closing a deal and need to transfer $47,500 to our partner account today.\n\nThis is time-sensitive and must be kept between us until the deal is announced. Please process this immediately:\n\nAccount Name: Global Partners LLC\nBank: Chase Bank\nAccount #: 0892-7731-9945\nRouting #: 0210-00021\n\nConfirm once done. I'm in meetings all day but reachable via email.\n\nThanks,\nRobert Johnson\nCEO`,
    timestamp: '2026-04-08T11:00:00Z',
    redFlags: [
      'CEO email domain is "company-executive-mail.org" — not official company domain',
      'Request for wire transfer via email is a major red flag (CEO Fraud / BEC)',
      '"Keep it confidential" to prevent you from verifying with others',
      'Creates urgency — "today", "ASAP"',
      '"I\'m in meetings" — makes direct verification seem impossible',
      'Providing specific bank account details in email',
    ],
    difficulty: 'hard',
    category: 'bec_fraud',
    isPhishing: true,
  },
];

const behaviorRecords = {
  'user-001': {
    userId: 'user-001',
    actions: [
      { emailId: 'email-001', action: 'clicked', timestamp: '2026-04-05T09:00:00Z' },
      { emailId: 'email-002', action: 'ignored', timestamp: '2026-04-06T10:00:00Z' },
      { emailId: 'email-004', action: 'reported', timestamp: '2026-04-07T11:00:00Z' },
    ],
    riskScore: 65,
    classification: 'vulnerable',
    lessonsCompleted: ['lesson-001'],
    trainingProgress: 20,
  },
  'user-002': {
    userId: 'user-002',
    actions: [
      { emailId: 'email-001', action: 'reported', timestamp: '2026-04-05T09:00:00Z' },
      { emailId: 'email-004', action: 'reported', timestamp: '2026-04-06T10:00:00Z' },
    ],
    riskScore: 25,
    classification: 'secure',
    lessonsCompleted: ['lesson-001', 'lesson-002', 'lesson-003'],
    trainingProgress: 60,
  },
  'user-003': {
    userId: 'user-003',
    actions: [
      { emailId: 'email-001', action: 'ignored', timestamp: '2026-04-05T09:00:00Z' },
      { emailId: 'email-002', action: 'clicked', timestamp: '2026-04-06T10:00:00Z' },
    ],
    riskScore: 50,
    classification: 'cautious',
    lessonsCompleted: ['lesson-001', 'lesson-002'],
    trainingProgress: 40,
  },
};

const trainingLessons = [
  {
    id: 'lesson-001',
    title: 'Spotting Phishing Emails',
    category: 'phishing',
    difficulty: 'beginner',
    duration: '8 min',
    xp: 100,
    icon: '🎣',
    description: 'Learn the top red flags that reveal a phishing email, even if it looks legitimate.',
    slides: [
      {
        title: 'What is Phishing?',
        content: 'Phishing is a cyberattack where criminals send fake emails pretending to be trusted sources (banks, companies, coworkers) to steal your passwords, financial info, or install malware.',
        tip: '📊 Over 3.4 billion phishing emails are sent every day!',
      },
      {
        title: 'Red Flag #1: Suspicious Sender Domain',
        content: 'Always check the full email address, not just the display name. Attackers use lookalike domains like "g00gle.com" (zero instead of O), "paypa1.com" (one instead of L), or "company-support.net" (extra word).',
        tip: '✅ Hover over the sender name to see the real email address.',
      },
      {
        title: 'Red Flag #2: Urgency & Fear Tactics',
        content: 'Phrases like "Act NOW!", "Your account will be deleted in 24 hours!", or "URGENT response needed!" are designed to make you panic and act without thinking.',
        tip: '🧘 Stop and breathe. Legitimate services give you time to respond.',
      },
      {
        title: 'Red Flag #3: Suspicious Links',
        content: 'Before clicking any link, hover over it to preview the actual URL. If the link destination doesn\'t match the expected website, do NOT click it.',
        tip: '🔍 You can right-click links and "Copy Link Address" to inspect it safely.',
      },
      {
        title: 'What To Do When You Spot Phishing',
        content: '1. DO NOT click any links\n2. DO NOT download attachments\n3. Report it to your IT/security team\n4. Delete the email\n5. If you already clicked — immediately change your passwords and notify IT',
        tip: '🛡️ Reporting phishing protects your entire organization!',
      },
    ],
  },
  {
    id: 'lesson-002',
    title: 'Social Engineering Tactics',
    category: 'social_engineering',
    difficulty: 'intermediate',
    duration: '12 min',
    xp: 150,
    icon: '🎭',
    description: 'Understand how attackers manipulate human psychology to bypass security controls.',
    slides: [
      {
        title: 'What is Social Engineering?',
        content: 'Social engineering is the art of manipulating people to give up confidential information or perform actions. Instead of hacking computers, attackers hack humans — exploiting trust, fear, curiosity, and authority.',
        tip: '🧠 85% of cyberattacks involve a human element.',
      },
      {
        title: 'Attack Type: Pretexting',
        content: 'The attacker creates a fabricated scenario (pretext) to gain your trust. Example: "Hi, I\'m from IT. We\'re doing a security audit and need your login credentials to test your account."',
        tip: '✅ Your IT team will NEVER ask for your password.',
      },
      {
        title: 'Attack Type: Baiting',
        content: 'Attackers leave infected USB drives in parking lots or send emails with "FREE Gift Card" attachments. Curiosity kills the cat — and your security.',
        tip: '🚫 Never plug in unknown USB devices. Never open unexpected "free" attachments.',
      },
      {
        title: 'Attack Type: Quid Pro Quo',
        content: '"I\'ll give you something if you give me something." An attacker may pose as tech support offering to fix a problem — but first they need your password.',
        tip: '⚠️ If something feels off, verify the person\'s identity through official channels.',
      },
      {
        title: 'Defense: Zero Trust Mindset',
        content: 'Always verify identity before sharing ANY information. When in doubt:\n1. Hang up and call back using the official number\n2. Check the company directory\n3. Ask your manager\n4. Trust your instincts — if it feels wrong, it probably is',
        tip: '🔐 "Trust but verify" — then verify again.',
      },
    ],
  },
  {
    id: 'lesson-003',
    title: 'Password Security Mastery',
    category: 'passwords',
    difficulty: 'beginner',
    duration: '6 min',
    xp: 80,
    icon: '🔑',
    description: 'Create unbreakable passwords and manage them safely.',
    slides: [
      {
        title: 'Why Password Security Matters',
        content: 'Weak passwords are the #1 cause of data breaches. In 2024, "123456" was still the most common password worldwide. A hacker can crack it in under 1 second.',
        tip: '⏱️ An 8-character password takes milliseconds to crack. 16+ characters = millions of years.',
      },
      {
        title: 'Creating Strong Passwords',
        content: 'Use a passphrase — a string of 4+ random words: "PurpleTigerMoonCoffee!". It\'s long, random, and memorable. Combine with: uppercase, lowercase, numbers, and special characters.',
        tip: '🎲 Use a password manager to generate unique, random passwords for every site.',
      },
      {
        title: 'Never Reuse Passwords',
        content: 'If one site is breached, attackers try your password on every other site (credential stuffing). If you reuse passwords, one breach compromises ALL your accounts.',
        tip: '🔐 Use a different password for every account. A password manager makes this easy.',
      },
      {
        title: 'Enable Multi-Factor Authentication (MFA)',
        content: 'MFA adds a second layer — even if your password is stolen, the attacker can\'t login without your phone or hardware key. Enable MFA on every account that offers it.',
        tip: '📱 Use an authenticator app (like Google Authenticator) rather than SMS for stronger MFA.',
      },
    ],
  },
  {
    id: 'lesson-004',
    title: 'Safe Browsing & Links',
    category: 'browsing',
    difficulty: 'beginner',
    duration: '7 min',
    xp: 90,
    icon: '🌐',
    description: 'Stay safe online by identifying dangerous websites and links.',
    slides: [
      {
        title: 'HTTPS vs HTTP',
        content: 'Always look for "https://" and the padlock icon in your browser. HTTPS means the connection is encrypted. However, note that even phishing sites can have HTTPS — it\'s necessary but not sufficient for trust.',
        tip: '🔒 HTTPS = encrypted connection. It does NOT guarantee the site is safe.',
      },
      {
        title: 'URL Inspection',
        content: 'Look carefully at the full URL. Attackers use: subdomains (google.evil.com), lookalike domains (paypa1.com), long confusing URLs to hide the real destination.',
        tip: '👁️ Focus on what comes BEFORE the first single slash after the domain.',
      },
      {
        title: 'Shortened URLs',
        content: 'Links like bit.ly/abc123 hide the real destination. Use a link expander tool (like checkshorturl.com) to see where a shortened URL actually leads before clicking.',
        tip: '🔍 Always expand short URLs before clicking, especially in emails or messages.',
      },
    ],
  },
  {
    id: 'lesson-005',
    title: 'Business Email Compromise (BEC)',
    category: 'bec',
    difficulty: 'advanced',
    duration: '15 min',
    xp: 200,
    icon: '💼',
    description: 'Learn how CEO fraud and wire transfer scams target organizations for millions.',
    slides: [
      {
        title: 'What is BEC?',
        content: 'Business Email Compromise (BEC) is a sophisticated scam targeting companies. Attackers impersonate executives (CEO, CFO) and ask employees to make wire transfers or share sensitive data. BEC caused $2.9 billion in losses in 2023 alone.',
        tip: '💰 BEC is the #1 most financially damaging cybercrime.',
      },
      {
        title: 'How BEC Works',
        content: '1. Attacker researches company (LinkedIn, website, social media)\n2. Creates lookalike email address\n3. Impersonates CEO or CFO\n4. Requests urgent wire transfer or data\n5. Claims to be too busy to call — forces email-only communication',
        tip: '📞 Always verify large financial requests with a direct phone call to the executive.',
      },
      {
        title: 'Red Flags of BEC',
        content: '• Request comes from non-company email domain\n• Extreme urgency and secrecy requested\n• Request to bypass normal financial controls\n• CEO "unavailable" for direct verification\n• Unusual bank account or new payment method',
        tip: '🚨 Any financial request that bypasses normal approval processes is a red flag.',
      },
    ],
  },
];

const attackScenarios = [
  {
    id: 'scenario-001',
    title: 'Fake Bank Login Page',
    description: 'A spoofed bank login page designed to harvest credentials',
    category: 'fake_login',
    difficulty: 'medium',
  },
  {
    id: 'scenario-002',
    title: 'SMS Smishing Attack',
    description: 'Fraudulent SMS messages impersonating delivery services',
    category: 'sms_smishing',
    difficulty: 'easy',
  },
  {
    id: 'scenario-003',
    title: 'Fake Microsoft Login',
    description: 'A convincing Microsoft 365 credential harvesting page',
    category: 'fake_login',
    difficulty: 'hard',
  },
];

// ─── New stores for email analysis feature ────────────────────────────────────

/**
 * emailLogs — stores results of every email scan from the Chrome Extension.
 * Shape: { id, userId, userEmail, orgId, subject, verdict, score, reasons,
 *           flaggedLinks, reportedPhishing, timestamp }
 * In production: replace with PostgreSQL table via SQLAlchemy / Sequelize.
 */
const emailLogs = [];

/**
 * userRiskProfiles — cumulative risk scores updated on each email scan.
 * Shape: { [userId]: { userId, cumulativeRisk, riskEvents[] } }
 * In production: replace with a DB model (RiskLog table).
 */
const userRiskProfiles = {};

// ─── Multi-tenant organization stubs (future expansion) ──────────────────────

/**
 * organizations — MVP stub for multi-tenant support.
 * All user queries should eventually be scoped by orgId.
 */
const organizations = [
  { id: 'org-001', name: 'Demo Corp', plan: 'enterprise', createdAt: '2024-01-01' },
];

module.exports = {
  users,
  phishingEmails,
  behaviorRecords,
  trainingLessons,
  attackScenarios,
  emailLogs,
  userRiskProfiles,
  organizations,
};
