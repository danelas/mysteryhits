# Instagram DM Customer Service Bot + Post Uploader

A Node.js bot that automatically responds to Instagram DMs using ChatGPT and can upload posts via the Instagram Content Publishing API. Designed to deploy on **Render**.

---

## Features

- **Auto-reply to DMs** — Receives Instagram messages via webhook and replies using ChatGPT (gpt-4o-mini)
- **Conversation memory** — Maintains per-user chat history for contextual replies
- **Upload posts** — Publish images to your Instagram feed via a simple API call
- **Render-ready** — Includes `render.yaml` for one-click deploy

---

## Prerequisites

1. **Meta Developer Account** — https://developers.facebook.com
2. **Instagram Business or Creator Account** connected to a Facebook Page
3. **Meta App** with the following products enabled:
   - **Instagram** (Basic Display or Graph API)
   - **Webhooks**
   - **Instagram Messaging** (requires app review for production)
4. **OpenAI API Key** — https://platform.openai.com

---

## Meta App Setup (Step by Step)

### 1. Create a Meta App
- Go to https://developers.facebook.com/apps and click **Create App**
- Choose **Business** type
- Add the **Instagram** and **Webhooks** products

### 2. Get Your Instagram Business Account ID
- In Graph API Explorer, query: `GET /me/accounts` with your Page token
- From the Page ID, query: `GET /{page-id}?fields=instagram_business_account`
- The returned `id` is your `INSTAGRAM_ACCOUNT_ID`

### 3. Generate a Page Access Token
- In the Meta App dashboard → Instagram → Basic Display → Generate Token
- Or use Graph API Explorer to generate a **long-lived Page Access Token**
- This goes in `INSTAGRAM_ACCESS_TOKEN`

### 4. Set Up Webhooks
- In your Meta App → Webhooks → Instagram
- **Callback URL**: `https://your-render-app.onrender.com/webhook`
- **Verify Token**: same string you put in `VERIFY_TOKEN` env var
- Subscribe to: `messages` field

### 5. Instagram Messaging Access
- For production use, submit your app for **App Review** with the `instagram_manage_messages` permission
- For development/testing, you can test with your own account as an admin/tester of the app

---

## Environment Variables

| Variable | Description |
|---|---|
| `INSTAGRAM_APP_ID` | Meta App ID |
| `INSTAGRAM_APP_SECRET` | Meta App Secret |
| `INSTAGRAM_ACCESS_TOKEN` | Page Access Token with Instagram permissions |
| `INSTAGRAM_ACCOUNT_ID` | Instagram Business Account ID |
| `VERIFY_TOKEN` | Custom string for webhook verification |
| `OPENAI_API_KEY` | OpenAI API key |
| `SYSTEM_PROMPT` | (Optional) Custom system prompt for ChatGPT |
| `PORT` | (Optional) Server port, defaults to 3000 |

---

## Local Development

```bash
# 1. Clone and install
git clone <your-repo-url>
cd instagram-bot
npm install

# 2. Create .env from template
cp .env.example .env
# Fill in your credentials in .env

# 3. Run
npm run dev
```

For local webhook testing, use [ngrok](https://ngrok.com):
```bash
ngrok http 3000
# Use the ngrok HTTPS URL as your webhook callback URL in Meta App settings
```

---

## Deploy on Render

### Option A: One-click with render.yaml
1. Push this repo to GitHub
2. Go to https://render.com → **New** → **Blueprint**
3. Connect your repo — Render reads `render.yaml` automatically
4. Fill in the environment variables when prompted
5. Deploy

### Option B: Manual
1. Go to https://render.com → **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. Add all environment variables from the table above
5. Deploy

Once deployed, update your Meta App webhook callback URL to:
```
https://your-service-name.onrender.com/webhook
```

---

## API Endpoints

### `GET /` — Health check
Returns `{ "status": "ok", "service": "Instagram DM Bot" }`

### `GET /webhook` — Meta webhook verification
Handled automatically by Meta during webhook setup.

### `POST /webhook` — Incoming Instagram messages
Meta sends DM events here. The bot auto-replies via ChatGPT.

### `POST /post` — Upload a post to Instagram
```bash
curl -X POST https://your-app.onrender.com/post \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/photo.jpg",
    "caption": "Hello from the bot! 🤖"
  }'
```

> **Note**: Instagram's Content Publishing API requires a publicly accessible image URL. Upload images to S3, Cloudinary, or similar first.

---

## Architecture

```
Instagram User sends DM
        ↓
Meta Webhook → POST /webhook
        ↓
webhook.js → processMessage()
        ↓
chat.js → generateReply() → OpenAI ChatGPT
        ↓
instagram.js → sendReply() → Instagram Messaging API
        ↓
User receives reply in DMs
```

---

## Notes

- **Rate Limits**: Meta and OpenAI both have rate limits. For high-volume use, add queuing (e.g., Bull/Redis).
- **Token Expiry**: Page Access Tokens expire. Use a long-lived token or implement token refresh.
- **App Review**: Instagram Messaging requires Meta App Review for production. Test with app admins/testers during development.
- **Conversation History**: Stored in-memory. For production, use Redis or a database.

---

## License

MIT
