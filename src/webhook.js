const { sendReply, replyToComment } = require("./instagram");
const { generateReply, generateCommentReply } = require("./chat");

/**
 * GET /webhook – Meta verification handshake.
 * Meta sends hub.mode, hub.verify_token, and hub.challenge.
 */
function handleWebhookVerification(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }
  console.warn("❌ Webhook verification failed");
  return res.sendStatus(403);
}

/**
 * POST /webhook – Incoming messaging events from Instagram.
 * We respond with 200 immediately, then process asynchronously.
 */
async function handleWebhookEvent(req, res) {
  // Always respond 200 quickly so Meta doesn't retry
  res.sendStatus(200);

  try {
    const body = req.body;

    // Debug: log every incoming webhook payload
    console.log("📨 Webhook received:", JSON.stringify(body, null, 2));

    if (body.object !== "instagram") {
      console.log(`⚠️ Ignoring webhook object type: ${body.object}`);
      return;
    }

    for (const entry of body.entry || []) {
      // Handle DMs
      for (const event of entry.messaging || []) {
        await processMessage(event);
      }

      // Handle comments
      for (const change of entry.changes || []) {
        if (change.field === "comments") {
          await processComment(change.value);
        }
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err.message);
  }
}

/**
 * Process a single messaging event.
 */
async function processMessage(event) {
  // Ignore echoes of our own messages
  if (event.message?.is_echo) return;

  const senderId = event.sender?.id;
  const messageText = event.message?.text;

  if (!senderId || !messageText) {
    console.log("Received non-text message or missing sender, skipping.");
    return;
  }

  console.log(`📩 Message from ${senderId}: ${messageText}`);

  // Generate a ChatGPT reply
  const replyText = await generateReply(senderId, messageText);
  console.log(`🤖 Reply to ${senderId}: ${replyText}`);

  // Send it back via Instagram
  await sendReply(senderId, replyText);
}

/**
 * Process a comment event.
 */
async function processComment(comment) {
  const commentId = comment.id;
  const commentText = comment.text;
  const from = comment.from;

  // Ignore our own comments
  if (from?.id === process.env.INSTAGRAM_ACCOUNT_ID) return;

  if (!commentId || !commentText) {
    console.log("Received comment without text or id, skipping.");
    return;
  }

  console.log(`💬 Comment from ${from?.username || from?.id}: ${commentText}`);

  // Generate a ChatGPT reply using the comment prompt
  const replyText = await generateCommentReply(commentText);
  console.log(`🤖 Comment reply: ${replyText}`);

  // Post the reply under the comment
  await replyToComment(commentId, replyText);
}

module.exports = { handleWebhookVerification, handleWebhookEvent };
