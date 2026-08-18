/**
 * models/orgModel.js — Organization DB Operations
 *
 * Organizations are the top-level tenant boundary.
 * All users, email logs, and risk events are scoped to an org.
 *
 * Public API:
 *   createOrganization({ name, plan })
 *   findOrgById(id)
 *   listOrgs()
 */

const { query } = require('../db');

/**
 * createOrganization — inserts a new tenant organization.
 *
 * @param {{ name: string, plan?: string }} params
 * @returns {Promise<OrgRow>}
 */
async function createOrganization({ name, plan = 'free' }) {
  const validPlans = ['free', 'starter', 'enterprise'];
  const safePlan = validPlans.includes(plan) ? plan : 'free';

  const { rows } = await query(
    `INSERT INTO organizations (name, plan) VALUES ($1, $2)
     RETURNING id, name, plan, created_at`,
    [name.trim(), safePlan]
  );

  return rows[0];
}

/**
 * findOrgById — retrieves an organization by UUID.
 *
 * @param {string} id
 * @returns {Promise<OrgRow|null>}
 */
async function findOrgById(id) {
  const { rows } = await query(
    'SELECT id, name, plan, created_at FROM organizations WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

/**
 * listOrgs — returns all organizations (super-admin use only).
 *
 * @returns {Promise<OrgRow[]>}
 */
async function listOrgs() {
  const { rows } = await query(
    'SELECT id, name, plan, created_at FROM organizations ORDER BY created_at DESC'
  );
  return rows;
}

module.exports = { createOrganization, findOrgById, listOrgs };
