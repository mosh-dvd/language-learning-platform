import { Pool } from 'pg';
import { CachedAudio, CreateCachedAudio } from '../models/cachedAudio.model.js';

export class CachedAudioRepository {
  constructor(private pool: Pool) {}

  async create(data: CreateCachedAudio): Promise<CachedAudio> {
    const result = await this.pool.query(
      `INSERT INTO cached_audio (image_text_id, language_code, text_hash, audio_url, provider)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, image_text_id as "imageTextId", language_code as "languageCode", 
                 text_hash as "textHash", audio_url as "audioUrl", provider, 
                 created_at as "createdAt", last_accessed as "lastAccessed", access_count as "accessCount"`,
      [data.imageTextId || null, data.languageCode, data.textHash, data.audioUrl, data.provider]
    );
    return result.rows[0];
  }

  async findByTextHash(textHash: string, languageCode: string, provider: string): Promise<CachedAudio | null> {
    const result = await this.pool.query(
      `SELECT id, image_text_id as "imageTextId", language_code as "languageCode", 
              text_hash as "textHash", audio_url as "audioUrl", provider, 
              created_at as "createdAt", last_accessed as "lastAccessed", access_count as "accessCount"
       FROM cached_audio
       WHERE text_hash = $1 AND language_code = $2 AND provider = $3`,
      [textHash, languageCode, provider]
    );
    return result.rows[0] || null;
  }

  async updateAccessInfo(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE cached_audio
       SET last_accessed = CURRENT_TIMESTAMP, access_count = access_count + 1
       WHERE id = $1`,
      [id]
    );
  }

  async deleteOldEntries(daysOld: number): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM cached_audio
       WHERE last_accessed < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
       RETURNING id`,
      []
    );
    return result.rowCount || 0;
  }

  async findOldEntries(daysOld: number): Promise<CachedAudio[]> {
    const result = await this.pool.query(
      `SELECT id, image_text_id as "imageTextId", language_code as "languageCode", 
              text_hash as "textHash", audio_url as "audioUrl", provider, 
              created_at as "createdAt", last_accessed as "lastAccessed", access_count as "accessCount"
       FROM cached_audio
       WHERE last_accessed < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'`,
      []
    );
    return result.rows;
  }
}
