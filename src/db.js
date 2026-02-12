const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

/**
 * Initialize the PostgreSQL database — create tables if they don't exist.
 */
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        original_name TEXT NOT NULL,
        filename TEXT NOT NULL,
        mimetype TEXT,
        size INTEGER,
        public_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        image_id TEXT REFERENCES images(id) ON DELETE SET NULL,
        caption TEXT,
        instagram_id TEXT,
        status TEXT DEFAULT 'draft',
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        published_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("✅ Database initialized (PostgreSQL)");
  } finally {
    client.release();
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

const dbApi = {
  initDb,
  pool,

  insertImage: {
    run: async (id, originalName, filename, mimetype, size, publicUrl) => {
      await pool.query(
        `INSERT INTO images (id, original_name, filename, mimetype, size, public_url) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, originalName, filename, mimetype, size, publicUrl]
      );
    },
  },

  getAllImages: {
    all: async () => {
      const { rows } = await pool.query(`SELECT * FROM images ORDER BY created_at DESC`);
      return rows;
    },
  },

  getImageById: {
    get: async (id) => {
      const { rows } = await pool.query(`SELECT * FROM images WHERE id = $1`, [id]);
      return rows[0] || null;
    },
  },

  deleteImage: {
    run: async (id) => {
      await pool.query(`DELETE FROM images WHERE id = $1`, [id]);
    },
  },

  insertPost: {
    run: async (imageId, caption) => {
      const { rows } = await pool.query(
        `INSERT INTO posts (image_id, caption, status) VALUES ($1, $2, 'draft') RETURNING id`,
        [imageId, caption]
      );
      return { lastInsertRowid: rows[0].id };
    },
  },

  updatePostStatus: {
    run: async (status, instagramId, postId) => {
      await pool.query(
        `UPDATE posts SET status = $1, instagram_id = $2, published_at = NOW(), error = NULL WHERE id = $3`,
        [status, instagramId, postId]
      );
    },
  },

  updatePostError: {
    run: async (error, postId) => {
      await pool.query(
        `UPDATE posts SET status = 'failed', error = $1 WHERE id = $2`,
        [error, postId]
      );
    },
  },

  getAllPosts: {
    all: async () => {
      const { rows } = await pool.query(`
        SELECT p.*, i.public_url as image_url, i.original_name as image_name
        FROM posts p LEFT JOIN images i ON p.image_id = i.id
        ORDER BY p.created_at DESC
      `);
      return rows;
    },
  },

  insertActivity: {
    run: async (type, message) => {
      await pool.query(
        `INSERT INTO activity_log (type, message) VALUES ($1, $2)`,
        [type, message]
      );
    },
  },

  getRecentActivity: {
    all: async () => {
      const { rows } = await pool.query(
        `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50`
      );
      return rows;
    },
  },

  getStats: {
    get: async () => {
      const { rows } = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM images)::int as total_images,
          (SELECT COUNT(*) FROM posts)::int as total_posts,
          (SELECT COUNT(*) FROM posts WHERE status = 'published')::int as published_posts,
          (SELECT COUNT(*) FROM posts WHERE status = 'failed')::int as failed_posts
      `);
      return rows[0];
    },
  },
};

module.exports = dbApi;
