/**
 * db/seed.js — Database Seed Script
 *
 * Creates the schema and seeds initial data for local development.
 *
 * Run ONCE after setting up PostgreSQL:
 *   node db/seed.js
 *
 * What it does:
 *  1. Drops and recreates all tables (schema.sql)
 *  2. Seeds the default organization
 *  3. Seeds demo admin + employee users with hashed passwords
 *
 * Credentials seeded:
 *   admin@company.com  / admin123
 *   alice@company.com  / password123
 *   bob@company.com    / password123
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs      = require('fs');
const path    = require('path');
const bcrypt  = require('bcryptjs');
const { query, testConnection } = require('./index');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
const BCRYPT_ROUNDS  = 12;

// ─── Seed Data ─────────────────────────────────────────────────────────────────

const DEMO_USERS = [
  {
    name:       'Admin User',
    email:      'admin@company.com',
    password:   'admin123',
    role:       'admin',
    department: 'Security',
  },
  {
    name:       'Alice Johnson',
    email:      'alice@company.com',
    password:   'password123',
    role:       'employee',
    department: 'Finance',
  },
  {
    name:       'Bob Smith',
    email:      'bob@company.com',
    password:   'password123',
    role:       'employee',
    department: 'Engineering',
  },
  {
    name:       'Carol White',
    email:      'carol@company.com',
    password:   'password123',
    role:       'employee',
    department: 'HR',
  },
];

// ─── Main Seed Function ────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱 Aware Guard — Database Seed\n');

  // 1. Test connectivity
  await testConnection();

  // 2. Apply schema (creates tables if not exist — idempotent)
  console.log('📄 Applying schema...');
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await query(schemaSql);
  console.log('   ✓ Schema applied');

  // 3. Seed users
  console.log('\n👤 Seeding users...');
  for (const userData of DEMO_USERS) {
    const existingResult = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND org_id = $2',
      [userData.email, DEFAULT_ORG_ID]
    );

    if (existingResult.rows.length > 0) {
      console.log(`   ⟳ Skipping ${userData.email} (already exists)`);
      continue;
    }

    const passwordHash = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);

    await query(
      `INSERT INTO users (name, email, password_hash, role, department, org_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userData.name, userData.email, passwordHash, userData.role, userData.department, DEFAULT_ORG_ID]
    );

    console.log(`   ✓ Created ${userData.role}: ${userData.email} (password: ${userData.password})`);
  }

  console.log('\n✅ Seed complete!\n');
  console.log('📋 Login credentials:');
  DEMO_USERS.forEach(u => {
    console.log(`   ${u.role.padEnd(8)} → ${u.email.padEnd(25)} / ${u.password}`);
  });
  console.log('\n🚀 Start the server: npm run dev\n');

  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message);
  console.error('\nMake sure PostgreSQL is running and your .env is configured correctly.');
  console.error('Check db/.env.example for the required variables.\n');
  process.exit(1);
});
