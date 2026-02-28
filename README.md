# Family Chat

A private real-time chat app for family and friends, with a locally-deployed AI assistant.

## Features

- Real-time messaging (direct messages and group chats)
- AI assistant powered by Ollama (local, private — your data never leaves your machine)
- Web app + iOS (Expo Router shared codebase)
- Internet access via Cloudflare Tunnel (free, persistent URLs, no VPN needed)
- Invite-only — admin creates accounts for family members

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Fastify + Socket.io |
| Database | SQLite (via Prisma) |
| Frontend | Expo Router (React Native Web + iOS) |
| LLM | Ollama (local) |
| Tunnel | Cloudflare Tunnel |

---

## Setup

### Prerequisites

- Node.js 20+
- npm 9+
- [Ollama](https://ollama.com) (installed separately)
- A Cloudflare account (free) + domain (for internet access)

---

### 1. Install dependencies

```bash
cd family-chat
npm install          # installs both server and client deps
```

---

### 2. Configure the server

```bash
cd server
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="<generate with: openssl rand -hex 32>"
ADMIN_USERNAME="yourname"
ADMIN_PASSWORD="a-strong-password"
ADMIN_DISPLAY_NAME="Your Name"
OLLAMA_MODEL="llama3.2"   # or mistral, qwen2.5, deepseek-r1, etc.
```

---

### 3. Set up the database

```bash
cd server
npm run db:migrate    # creates dev.db and applies schema
npm run seed          # creates the AI bot user + your admin account
```

---

### 4. Set up Ollama (local AI)

```bash
# Install Ollama: https://ollama.com/download
# Then pull a model (pick one based on your RAM):

ollama pull llama3.2       # ~2GB RAM, fast, good quality (recommended)
ollama pull mistral        # ~4GB RAM, excellent quality
ollama pull qwen2.5        # ~4GB RAM, great for multilingual
ollama pull deepseek-r1    # ~4GB RAM, strong reasoning
ollama pull llama3.2:1b    # ~1GB RAM, fastest, lower quality

# Start Ollama server (runs in background):
ollama serve
```

Update `OLLAMA_MODEL` in `server/.env` to match what you pulled.

---

### 5. Start the development servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# Server running at http://localhost:3000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# Web app at http://localhost:8081
```

Open http://localhost:8081 and sign in with your admin credentials.

---

### 6. Add family members

As admin, create accounts for each family member from the command line or via the API:

```bash
# Using curl (replace TOKEN with your JWT from login):
curl -X POST http://localhost:3000/auth/register \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"mom","displayName":"Mom","password":"their-password"}'
```

Or use the Prisma Studio UI:
```bash
cd server && npm run db:studio
```

---

### 7. Set up Cloudflare Tunnel (internet access)

This lets family members access the app from anywhere without a VPN.

```bash
# Install cloudflared
brew install cloudflared

# Log in to Cloudflare (opens browser)
cloudflared tunnel login

# Create a tunnel
cloudflared tunnel create family-chat

# Copy the example config
cp cloudflared.yml.example ~/.cloudflared/config.yml

# Edit ~/.cloudflared/config.yml:
# - Replace <TUNNEL_ID> with your tunnel ID
# - Replace <YOUR_USERNAME> with your macOS username
# - Replace familychat.yourdomain.com with your actual domain

# Create DNS records in Cloudflare dashboard (or via CLI):
cloudflared tunnel route dns family-chat familychat.yourdomain.com

# Run the tunnel
cloudflared tunnel run family-chat
```

#### Production: Serve everything on one port

Build the web client and let Fastify serve it:
```bash
cd client
npm run build:web          # outputs to client/dist/

cd ../server
# Ensure CLIENT_DIST_PATH="../client/dist" in .env
npm start                  # production mode
```

Then in `~/.cloudflared/config.yml`, use the single-ingress config (all traffic → port 3000).

#### Update client for production

In `client/.env`:
```env
EXPO_PUBLIC_API_URL=https://familychat.yourdomain.com
EXPO_PUBLIC_WS_URL=https://familychat.yourdomain.com
```

---

### 8. iOS (Expo Go)

1. Install [Expo Go](https://expo.dev/go) on your iPhone
2. Set `EXPO_PUBLIC_API_URL` in `client/.env` to your Cloudflare URL
3. Run `cd client && npm start`
4. Scan the QR code with your iPhone camera

For a standalone iOS app build:
```bash
cd client
npx eas build --platform ios
```

---

## Using the AI Assistant

The AI bot user is `@ai` (displayed as "AI Assistant").

**To chat with the bot directly:**
- Tap "New Chat" → select "AI Assistant" → send a message

**To add the bot to a group chat:**
- When creating a group, select "AI Assistant" along with family members
- In the group, mention `@ai` or `@bot` to trigger a response

The bot has context of the last 20 messages in the conversation.

---

## Project Structure

```
family-chat/
├── server/           # Fastify backend + Socket.io + bot
│   ├── prisma/       # Database schema and migrations
│   └── src/
│       ├── bot/      # LLM bot orchestrator
│       ├── routes/   # REST API routes
│       ├── services/ # Business logic
│       └── plugins/  # Socket.io setup
│
└── client/           # Expo Router app (web + iOS)
    ├── app/          # File-based routes
    ├── components/   # Reusable UI components
    ├── contexts/     # Auth + Socket contexts
    ├── hooks/        # useMessages, useConversations
    └── lib/          # API client, socket, storage
```

---

## Switching LLM Models

```bash
# Pull any model from https://ollama.com/library
ollama pull qwen2.5:7b
ollama pull deepseek-r1:7b
ollama pull phi4

# Update server/.env:
OLLAMA_MODEL=qwen2.5:7b

# Restart the server
```

## Migrating to PostgreSQL

When you're ready to switch from SQLite to PostgreSQL:

1. In `server/prisma/schema.prisma`, change `provider = "sqlite"` → `"postgresql"`
2. Set `DATABASE_URL` to your PostgreSQL connection string
3. Run `npm run db:migrate`

No application code changes needed.
