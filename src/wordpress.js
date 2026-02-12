const axios = require("axios");

/**
 * Publish a post to WordPress via the REST API.
 *
 * Requires:
 *   WORDPRESS_URL        — e.g. https://yoursite.com
 *   WORDPRESS_USERNAME   — WordPress username
 *   WORDPRESS_APP_PASSWORD — Application Password (Users → Profile → Application Passwords)
 *
 * @param {string} title   - Post title
 * @param {string} content - Post body (HTML supported)
 * @param {string} status  - "publish", "draft", or "pending" (default: "publish")
 * @param {string[]} tags  - Optional array of tag names
 */
async function publishToWordPress(title, content, status = "publish", tags = []) {
  const wpUrl = process.env.WORDPRESS_URL;
  const username = process.env.WORDPRESS_USERNAME;
  const appPassword = process.env.WORDPRESS_APP_PASSWORD;

  if (!wpUrl || !username || !appPassword) {
    throw new Error("WordPress credentials not configured (WORDPRESS_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD)");
  }

  const url = `${wpUrl.replace(/\/+$/, "")}/wp-json/wp/v2/posts`;

  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");

  const postData = {
    title,
    content,
    status,
  };

  // If tags are provided, resolve them to IDs (create if needed)
  if (tags.length > 0) {
    postData.tags = await resolveTagIds(wpUrl, auth, tags);
  }

  try {
    const response = await axios.post(url, postData, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ WordPress post published: ${response.data.link}`);
    return {
      id: response.data.id,
      link: response.data.link,
      title: response.data.title.rendered,
    };
  } catch (err) {
    const errData = err.response?.data || err.message;
    console.error("❌ WordPress publish error:", JSON.stringify(errData));
    throw new Error("Failed to publish to WordPress");
  }
}

/**
 * Resolve tag names to WordPress tag IDs, creating tags if they don't exist.
 */
async function resolveTagIds(wpUrl, auth, tagNames) {
  const baseUrl = `${wpUrl.replace(/\/+$/, "")}/wp-json/wp/v2/tags`;
  const ids = [];

  for (const name of tagNames) {
    try {
      // Search for existing tag
      const search = await axios.get(baseUrl, {
        params: { search: name },
        headers: { Authorization: `Basic ${auth}` },
      });

      if (search.data.length > 0) {
        ids.push(search.data[0].id);
      } else {
        // Create new tag
        const create = await axios.post(
          baseUrl,
          { name },
          { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" } }
        );
        ids.push(create.data.id);
      }
    } catch (err) {
      console.warn(`Warning: Could not resolve tag "${name}":`, err.message);
    }
  }

  return ids;
}

module.exports = { publishToWordPress };
