import { Pool } from 'pg';
import { User, CreateUserInput, CreateOAuthUserInput, UpdateUserInput } from '../models/user.model.js';
import pool from '../db/pool.js';

export class UserRepository {
  constructor(private pool: Pool) {}

  async create(userData: CreateUserInput & { passwordHash: string }): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, native_language)
      VALUES ($1, $2, $3)
      RETURNING id, email, password_hash as "passwordHash", name, avatar_url as "avatarUrl",
                native_language as "nativeLanguage", oauth_provider as "oauthProvider",
                oauth_id as "oauthId", created_at as "createdAt", updated_at as "updatedAt"
    `;
    const values = [userData.email, userData.passwordHash, userData.nativeLanguage];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async createOAuth(userData: CreateOAuthUserInput): Promise<User> {
    const query = `
      INSERT INTO users (email, name, avatar_url, native_language, oauth_provider, oauth_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, password_hash as "passwordHash", name, avatar_url as "avatarUrl",
                native_language as "nativeLanguage", oauth_provider as "oauthProvider",
                oauth_id as "oauthId", created_at as "createdAt", updated_at as "updatedAt"
    `;
    const values = [
      userData.email,
      userData.name || null,
      userData.avatarUrl || null,
      userData.nativeLanguage,
      userData.oauthProvider,
      userData.oauthId,
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash as "passwordHash", name, avatar_url as "avatarUrl",
             native_language as "nativeLanguage", oauth_provider as "oauthProvider",
             oauth_id as "oauthId", created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE email = $1
    `;
    const result = await this.pool.query(query, [email]);
    return result.rows[0] || null;
  }

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash as "passwordHash", name, avatar_url as "avatarUrl",
             native_language as "nativeLanguage", oauth_provider as "oauthProvider",
             oauth_id as "oauthId", created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByOAuth(provider: 'google' | 'facebook', oauthId: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash as "passwordHash", name, avatar_url as "avatarUrl",
             native_language as "nativeLanguage", oauth_provider as "oauthProvider",
             oauth_id as "oauthId", created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE oauth_provider = $1 AND oauth_id = $2
    `;
    const result = await this.pool.query(query, [provider, oauthId]);
    return result.rows[0] || null;
  }

  async update(id: string, updates: UpdateUserInput): Promise<User> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.avatarUrl !== undefined) {
      setClauses.push(`avatar_url = $${paramCount++}`);
      values.push(updates.avatarUrl);
    }
    if (updates.nativeLanguage !== undefined) {
      setClauses.push(`native_language = $${paramCount++}`);
      values.push(updates.nativeLanguage);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, password_hash as "passwordHash", name, avatar_url as "avatarUrl",
                native_language as "nativeLanguage", oauth_provider as "oauthProvider",
                oauth_id as "oauthId", created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await this.pool.query(query, [passwordHash, id]);
  }
}

// Export singleton instance
export const userRepository = new UserRepository(pool);
