/**
 * Schema version history and migration functions for persisted data.
 *
 * Each domain has a current schema version and an ordered list of migration
 * functions. When the stored version is less than the current version, all
 * applicable migrations run in order.
 *
 * To add a new migration:
 * 1. Bump the schemaVersion in store.service.ts DOMAINS config
 * 2. Add a migration function to the array below
 * 3. The function receives the full store instance and transforms data in place
 */

import type Store from 'electron-store'

// ── Types ──────────────────────────────────────────────────────

export interface Migration {
  /** From which version this migration upgrades */
  from: number
  /** Human-readable description */
  description: string
  /** Migration function — reads and writes directly to the store */
  up: (store: Store) => void
}

export interface DomainSchema {
  currentVersion: number
  migrations: Migration[]
}

// ── Domain schemas ─────────────────────────────────────────────

/** Settings domain — v1 is initial version (post-split from legacy config.json) */
export const settingsSchema: DomainSchema = {
  currentVersion: 1,
  migrations: [],
}

/** History domain — v1 is initial version */
export const historySchema: DomainSchema = {
  currentVersion: 1,
  migrations: [],
}

/** Session domain — v1 is initial version (snapshot + summary) */
export const sessionSchema: DomainSchema = {
  currentVersion: 1,
  migrations: [],
}

/** Secrets domain — v1 is initial version */
export const secretsSchema: DomainSchema = {
  currentVersion: 1,
  migrations: [],
}

// ── Schema lookup ──────────────────────────────────────────────

export function getSchema(domain: string): DomainSchema | undefined {
  const schemas: Record<string, DomainSchema> = {
    settings: settingsSchema,
    history: historySchema,
    session: sessionSchema,
    secrets: secretsSchema,
  }
  return schemas[domain]
}

// ── Migration runner ───────────────────────────────────────────

/**
 * Run any pending migrations for a domain store.
 * Returns the number of migrations applied.
 */
export function runMigrations(domain: string, store: Store): number {
  const schema = getSchema(domain)
  if (!schema) return 0

  // Read stored version (default 1 if not present)
  const storedVersion = (store.get('__schema_version') as number) || 1

  const pending = schema.migrations.filter((m) => m.from >= storedVersion)

  let applied = 0
  for (const migration of pending) {
    try {
      migration.up(store)
      applied++
    } catch (err) {
      // If a migration fails, abort the chain to avoid corrupting data
      throw new Error(
        `Migration "${migration.description}" (from v${migration.from}) failed: ${err}`,
      )
    }
  }

  // Update stored version
  if (applied > 0) {
    store.set('__schema_version', schema.currentVersion)
  }

  return applied
}
