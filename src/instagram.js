const axios = require("axios");

const GRAPH_API = "https://graph.instagram.com/v21.0";
const GRAPH_FB_API = "https://graph.facebook.com/v21.0";

/**
 * Send a text reply to an Instagram user via the Messaging API.
 * Uses the Instagram-scoped user ID (IGSID) as the recipient.
 */
async function sendReply(recipientId, text) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;

  const url = `${GRAPH_FB_API}/${igAccountId}/messages`;

  try {
    const response = await axios.post(
      url,
      {
        recipient: { id: recipientId },
        message: { text },
      },
      {
        params: { access_token: accessToken },
        headers: { "Content-Type": "application/json" },
      }
    );
    console.log("✅ Reply sent:", response.data);
    return response.data;
  } catch (err) {
    const errData = err.response?.data || err.message;
    console.error("❌ Failed to send reply:", JSON.stringify(errData));
    throw new Error("Failed to send Instagram reply");
  }
}

/**
 * Upload a post (image) to Instagram.
 *
 * Two-step process via the Content Publishing API:
 * 1. Create a media container with the image URL + caption
 * 2. Publish the container
 *
 * @param {string} imageUrl - Publicly accessible image URL
 * @param {string} caption  - Post caption text
 */
async function uploadPost(imageUrl, caption) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;

  // Step 1: Create media container
  console.log("📤 Creating media container…");
  const containerRes = await axios.post(
    `${GRAPH_API}/${igAccountId}/media`,
    null,
    {
      params: {
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      },
    }
  );

  const creationId = containerRes.data.id;
  console.log(`📦 Container created: ${creationId}`);

  // Step 2: Wait for the container to be ready, then publish
  // Instagram may take a few seconds to process the image
  await waitForContainerReady(creationId, accessToken);

  console.log("📢 Publishing post…");
  const publishRes = await axios.post(
    `${GRAPH_API}/${igAccountId}/media_publish`,
    null,
    {
      params: {
        creation_id: creationId,
        access_token: accessToken,
      },
    }
  );

  console.log("✅ Post published:", publishRes.data);
  return publishRes.data;
}

/**
 * Poll the container status until it's ready (or timeout).
 */
async function waitForContainerReady(containerId, accessToken, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const statusRes = await axios.get(`${GRAPH_API}/${containerId}`, {
      params: {
        fields: "status_code",
        access_token: accessToken,
      },
    });

    const status = statusRes.data.status_code;
    console.log(`   Container status: ${status}`);

    if (status === "FINISHED") return;
    if (status === "ERROR") throw new Error("Media container processing failed");

    // Wait 2 seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Media container processing timed out");
}

/**
 * Reply to a public Instagram comment.
 * Uses POST /{comment-id}/replies with the message text.
 */
async function replyToComment(commentId, text) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  const url = `${GRAPH_API}/${commentId}/replies`;

  try {
    const response = await axios.post(url, null, {
      params: {
        message: text,
        access_token: accessToken,
      },
    });
    console.log("✅ Comment reply sent:", response.data);
    return response.data;
  } catch (err) {
    const errData = err.response?.data || err.message;
    console.error("❌ Failed to reply to comment:", JSON.stringify(errData));
    throw new Error("Failed to reply to Instagram comment");
  }
}

module.exports = { sendReply, uploadPost, replyToComment };
