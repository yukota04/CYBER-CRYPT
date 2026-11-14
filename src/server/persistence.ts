/**
 * Neon Postgres persistence for CYBER-CRYPT.
 *
 * The game server keeps a low-latency in-memory model (Maps/arrays) and this module
 * mirrors it into Postgres: only rows whose JSON changed since the last flush are
 * upserted, and rows removed from memory are deleted. Offline run saves (big
 * dungeon snapshots) are written through directly instead of being diffed.
 *
 * When DATABASE_URL is missing, the server falls back to the legacy data/db.json file.
 */
import pg from 'pg';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

export interface PersistedSnapshot {
  users: { id: string; login?: string; username?: string; role?: string; email?: string; createdAt?: number }[];
  cloudSaves: { userId: string }[];
  onlineLoadouts: { playerId: string; characterClass?: string | null }[];
  kv: Record<string, unknown>;
}

export interface RunSaveRow {
  slot: string;
  savedAt: number;
  data: unknown;
}

const SCHEMA_VERSION = 1;

const MIGRATIONS: Record<number, string[]> = {
  1: [
    `CREATE TABLE IF NOT EXISTS cc_users (
      id TEXT PRIMARY KEY,
      login TEXT NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player',
      email TEXT,
      created_at BIGINT,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS cc_users_login_idx ON cc_users (lower(login))`,
    `CREATE INDEX IF NOT EXISTS cc_users_username_idx ON cc_users (lower(username))`,
    `CREATE TABLE IF NOT EXISTS cc_cloud_saves (
      user_id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS cc_run_saves (
      user_id TEXT NOT NULL,
      slot TEXT NOT NULL,
      saved_at BIGINT NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, slot)
    )`,
    `CREATE TABLE IF NOT EXISTS cc_online_loadouts (
      stash_key TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      character_class TEXT,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS cc_kv (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  ]
};

type Table = 'cc_users' | 'cc_cloud_saves' | 'cc_online_loadouts' | 'cc_kv';

export class PostgresStore {
  private pool: pg.Pool;
  /** table -> id -> last persisted JSON */
  private persisted = new Map<Table, Map<string, string>>();
  private flushing: Promise<void> | null = null;
  private pending: PersistedSnapshot | null = null;
  /**
   * Diff-driven DELETEs are dangerous: a boot that failed to hydrate memory then
   * flushed would wipe Neon accounts. Only enable after a successful load (or an
   * intentional first-time seed of an empty database).
   */
  private rowDeletesEnabled = false;

  constructor(connectionString: string) {
    const opts = { connectionString, max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 15_000 };
    let host = '';
    try {
      host = new URL(connectionString).hostname;
    } catch {
      /* invalid URL: let the driver report it */
    }
    // Neon: use the serverless driver (Postgres over WebSocket/443, works behind firewalls
    // that block 5432). Any other Postgres: plain node-postgres over TCP.
    this.pool = host.endsWith('.neon.tech')
      ? (new NeonPool(opts) as unknown as pg.Pool)
      : new pg.Pool(opts);
    this.pool.on('error', err => console.error('[CYBER-CRYPT][db] idle client error:', err.message));
    for (const t of ['cc_users', 'cc_cloud_saves', 'cc_online_loadouts', 'cc_kv'] as Table[]) {
      this.persisted.set(t, new Map());
    }
  }

  async migrate(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`CREATE TABLE IF NOT EXISTS cc_schema_migrations (
        version INT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
      const { rows } = await client.query('SELECT COALESCE(MAX(version), 0) AS v FROM cc_schema_migrations');
      const current = Number(rows[0]?.v || 0);
      for (let v = current + 1; v <= SCHEMA_VERSION; v++) {
        await client.query('BEGIN');
        try {
          for (const stmt of MIGRATIONS[v]) await client.query(stmt);
          await client.query('INSERT INTO cc_schema_migrations (version) VALUES ($1)', [v]);
          await client.query('COMMIT');
          console.log(`[CYBER-CRYPT][db] applied schema migration v${v}`);
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }
    } finally {
      client.release();
    }
  }

  /** Enable cascading row deletes in writeDiff (call only after hydrate or first seed). */
  enableRowDeletes() {
    this.rowDeletesEnabled = true;
  }

  /** True once Neon was successfully read into the in-memory diff baseline. */
  get isHydrated(): boolean {
    return this.rowDeletesEnabled;
  }

  async countUsers(): Promise<number> {
    const { rows } = await this.pool.query('SELECT COUNT(*)::int AS n FROM cc_users');
    return Number(rows[0]?.n || 0);
  }

  /** Returns null when the database has never been populated. */
  async load(): Promise<PersistedSnapshot | null> {
    const [users, saves, loadouts, kv] = await Promise.all([
      this.pool.query('SELECT id, data FROM cc_users'),
      this.pool.query('SELECT user_id, data FROM cc_cloud_saves'),
      this.pool.query('SELECT stash_key, data FROM cc_online_loadouts'),
      this.pool.query('SELECT key, value FROM cc_kv')
    ]);
    if (users.rowCount === 0 && kv.rowCount === 0) return null;

    const snap: PersistedSnapshot = { users: [], cloudSaves: [], onlineLoadouts: [], kv: {} };
    for (const r of users.rows) {
      snap.users.push(r.data);
      this.persisted.get('cc_users')!.set(r.id, JSON.stringify(r.data));
    }
    for (const r of saves.rows) {
      snap.cloudSaves.push(r.data);
      this.persisted.get('cc_cloud_saves')!.set(r.user_id, JSON.stringify(r.data));
    }
    for (const r of loadouts.rows) {
      snap.onlineLoadouts.push(r.data);
      this.persisted.get('cc_online_loadouts')!.set(r.stash_key, JSON.stringify(r.data));
    }
    for (const r of kv.rows) {
      snap.kv[r.key] = r.value;
      this.persisted.get('cc_kv')!.set(r.key, JSON.stringify(r.value));
    }
    // Hydrated from Neon — safe to mirror removals later
    this.rowDeletesEnabled = true;
    return snap;
  }

  /** Queue a snapshot to be diffed + written. Concurrent calls coalesce. */
  save(snapshot: PersistedSnapshot): Promise<void> {
    this.pending = snapshot;
    if (!this.flushing) {
      this.flushing = (async () => {
        try {
          while (this.pending) {
            const next = this.pending;
            this.pending = null;
            const ok = await this.writeDiff(next);
            if (!ok && !this.pending) {
              // Neon may be waking from scale-to-zero or briefly unreachable: back off and retry.
              await new Promise(r => setTimeout(r, 2000));
              if (!this.pending) this.pending = next;
            }
          }
        } finally {
          this.flushing = null;
        }
      })();
    }
    return this.flushing;
  }

  async flush(): Promise<void> {
    while (this.flushing) await this.flushing;
  }

  private async writeDiff(snap: PersistedSnapshot): Promise<boolean> {
    const rowsByTable: Record<Table, Map<string, { json: string; obj: any }>> = {
      cc_users: new Map(),
      cc_cloud_saves: new Map(),
      cc_online_loadouts: new Map(),
      cc_kv: new Map()
    };
    for (const u of snap.users) rowsByTable.cc_users.set(u.id, { json: JSON.stringify(u), obj: u });
    for (const s of snap.cloudSaves) rowsByTable.cc_cloud_saves.set(s.userId, { json: JSON.stringify(s), obj: s });
    for (const l of snap.onlineLoadouts) {
      const key = `${l.playerId}:${l.characterClass || 'striker'}`;
      rowsByTable.cc_online_loadouts.set(key, { json: JSON.stringify(l), obj: l });
    }
    for (const [k, v] of Object.entries(snap.kv)) rowsByTable.cc_kv.set(k, { json: JSON.stringify(v), obj: v });

    let client: pg.PoolClient;
    try {
      client = await this.pool.connect();
    } catch (err) {
      console.error('[CYBER-CRYPT][db] connect failed:', (err as Error).message);
      return false;
    }
    const committed: [Table, string, string | null][] = [];
    try {
      await client.query('BEGIN');
      for (const table of Object.keys(rowsByTable) as Table[]) {
        const prev = this.persisted.get(table)!;
        const cur = rowsByTable[table];
        for (const [id, { json, obj }] of cur) {
          if (prev.get(id) === json) continue;
          await this.upsert(client, table, id, json, obj);
          committed.push([table, id, json]);
        }
        // NEVER delete accounts via incomplete in-memory snapshots (deploy / failed hydrate).
        // Other tables may sync deletes only after a successful Neon load.
        if (table === 'cc_users') {
          // Accounts are append/upsert only — never cascade-delete from memory diffs.
          continue;
        }
        if (!this.rowDeletesEnabled) continue;
        const removed = [...prev.keys()].filter(id => !cur.has(id));
        if (removed.length) {
          const col = table === 'cc_cloud_saves' ? 'user_id' : table === 'cc_kv' ? 'key' : 'stash_key';
          await client.query(`DELETE FROM ${table} WHERE ${col} = ANY($1::text[])`, [removed]);
          for (const id of removed) committed.push([table, id, null]);
        }
      }
      await client.query('COMMIT');
      for (const [table, id, json] of committed) {
        if (json === null) this.persisted.get(table)!.delete(id);
        else this.persisted.get(table)!.set(id, json);
      }
      return true;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[CYBER-CRYPT][db] persist failed (retrying):', (err as Error).message);
      return false;
    } finally {
      client.release();
    }
  }

  private async upsert(client: pg.PoolClient, table: Table, id: string, json: string, obj: any) {
    switch (table) {
      case 'cc_users':
        await client.query(
          `INSERT INTO cc_users (id, login, username, role, email, created_at, data, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb, now())
           ON CONFLICT (id) DO UPDATE SET login=EXCLUDED.login, username=EXCLUDED.username, role=EXCLUDED.role,
             email=EXCLUDED.email, created_at=EXCLUDED.created_at, data=EXCLUDED.data, updated_at=now()`,
          [id, obj.login || id, obj.username || id, obj.role || 'player', obj.email || null, Number(obj.createdAt) || null, json]
        );
        return;
      case 'cc_cloud_saves':
        await client.query(
          `INSERT INTO cc_cloud_saves (user_id, data, updated_at) VALUES ($1,$2::jsonb, now())
           ON CONFLICT (user_id) DO UPDATE SET data=EXCLUDED.data, updated_at=now()`,
          [id, json]
        );
        return;
      case 'cc_online_loadouts':
        await client.query(
          `INSERT INTO cc_online_loadouts (stash_key, player_id, character_class, data, updated_at) VALUES ($1,$2,$3,$4::jsonb, now())
           ON CONFLICT (stash_key) DO UPDATE SET player_id=EXCLUDED.player_id, character_class=EXCLUDED.character_class,
             data=EXCLUDED.data, updated_at=now()`,
          [id, obj.playerId, obj.characterClass || null, json]
        );
        return;
      case 'cc_kv':
        await client.query(
          `INSERT INTO cc_kv (key, value, updated_at) VALUES ($1,$2::jsonb, now())
           ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`,
          [id, json]
        );
        return;
    }
  }

  // ---- Offline run saves (write-through) ----
  async listRunSaves(userId: string): Promise<RunSaveRow[]> {
    const { rows } = await this.pool.query(
      'SELECT slot, saved_at, data FROM cc_run_saves WHERE user_id = $1',
      [userId]
    );
    return rows.map(r => ({ slot: r.slot, savedAt: Number(r.saved_at), data: r.data }));
  }

  /** Upserts only if the incoming save is not older than the stored one. Returns false on conflict. */
  async putRunSave(userId: string, slot: string, savedAt: number, json: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `INSERT INTO cc_run_saves (user_id, slot, saved_at, data, updated_at) VALUES ($1,$2,$3,$4::jsonb, now())
       ON CONFLICT (user_id, slot) DO UPDATE SET saved_at=EXCLUDED.saved_at, data=EXCLUDED.data, updated_at=now()
       WHERE cc_run_saves.saved_at <= EXCLUDED.saved_at`,
      [userId, slot, savedAt, json]
    );
    return (rowCount || 0) > 0;
  }

  async deleteRunSave(userId: string, slot: string): Promise<void> {
    await this.pool.query('DELETE FROM cc_run_saves WHERE user_id = $1 AND slot = $2', [userId, slot]);
  }

  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.flush();
    await this.pool.end();
  }
}
