# Family Chat

A private real-time chat app for family and friends, with a locally-deployed AI assistant.

## Features

- Real-time messaging (direct messages and group chats)
- AI assistant powered by Ollama (local, private — your data never leaves your machine)
- Web app + iOS (Expo Router shared codebase), installable as a PWA
- Internet access via ngrok (persistent static URL, no VPN needed)
- Invite-only — admin creates accounts for family members
- Unread message indicators
- Date separators in chat (Today, Yesterday, etc.)
- @mention autocomplete

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Fastify + Socket.io |
| Database | SQLite (via Prisma) |
| Frontend | Expo Router (React Native Web + iOS) |
| LLM | Ollama (local) |
| Tunnel | ngrok |

---

## Setup

### Prerequisites

- Node.js 20+
- npm 9+
- [Ollama](https://ollama.com) (installed separately)
- An [ngrok](https://ngrok.com) account (free) for internet access

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
OLLAMA_MODEL="qwen3:4b-instruct"   # or llama3.2, mistral, etc.
```

---

### 3. Set up the database

```bash
cd server
npx prisma migrate deploy   # creates dev.db and applies schema
npm run seed                # creates the AI bot user + your admin account
```

---

### 4. Set up Ollama (local AI)

```bash
# Install Ollama: https://ollama.com/download
# Then pull a model (pick one based on your RAM):

ollama pull qwen3:4b-instruct  # ~2.5GB, recommended (supports think mode)
ollama pull llama3.1:8b        # ~5GB, excellent quality
ollama pull qwen2.5:14b        # ~9GB, best quality that fits on 11GB VRAM
ollama pull llama3.2:1b        # ~1GB, fastest, lower quality

# Ollama starts automatically if installed via snap/brew.
# Otherwise start manually:
ollama serve
```

Update `OLLAMA_MODEL` in `server/.env` to match what you pulled.

**GPU acceleration:** Ollama automatically detects and uses NVIDIA/AMD GPUs. No configuration needed.

**Largest model for an NVIDIA GTX 1080 Ti (11GB VRAM):**

| Fits comfortably | ~VRAM |
|---|---|
| qwen3:4b-instruct | 3GB |
| llama3.1:8b (Q4) | 5GB |
| qwen2.5:14b (Q4) | 9GB ← recommended max |

---

### 5. Configure ngrok (internet access)

1. Sign up at [ngrok.com](https://ngrok.com) (free)
2. Get your free static domain at [dashboard.ngrok.com/domains](https://dashboard.ngrok.com/domains)
3. Add your authtoken:
   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```
4. Update `client/.env`:
   ```env
   EXPO_PUBLIC_API_URL=https://your-domain.ngrok-free.app
   EXPO_PUBLIC_WS_URL=https://your-domain.ngrok-free.app
   ```

---

### 6. Build and start

**Build the client and server:**
```bash
# Build server
cd server && npm run build

# Build client web app
cd ../client && npm run build:web -- --clear
```

**Start everything:**
```bash
# Terminal 1 — server
cd server && npm start

# Terminal 2 — ngrok
ngrok http --domain=your-domain.ngrok-free.app 3000
```

Open `https://your-domain.ngrok-free.app` and sign in with your admin credentials.

---

### 7. Install as a mobile app (PWA — free, no App Store)

On iPhone or Android:
1. Open Safari/Chrome → go to your ngrok URL
2. Tap **Share** → **Add to Home Screen**
3. It installs with its own icon and launches fullscreen

No Apple Developer account or App Store required.

---

### 8. Add family members

As admin, go to **Bot Settings** → **Add Member**, or use the API:

```bash
curl -X POST https://your-domain.ngrok-free.app/auth/register \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"mom","displayName":"Mom","password":"their-password"}'
```

---

## Operations

### Auto-start on boot (systemd)

Run the setup script once to install systemd user services:

```bash
chmod +x scripts/setup-services.sh
./scripts/setup-services.sh
```

Then enable auto-start without login:
```bash
sudo loginctl enable-linger $USER
```

**Useful commands:**
```bash
systemctl --user status family-chat family-chat-ngrok
systemctl --user restart family-chat
journalctl --user -u family-chat -f       # live server logs
journalctl --user -u family-chat-ngrok -f # live ngrok logs
```

> **Note:** Ollama (installed via snap) auto-starts on boot automatically.

---

### Database backup

Run manually:
```bash
./scripts/backup-db.sh
```

Schedule daily backups at 2am (run `crontab -e` and add):
```
0 2 * * * /home/snie/Projects/family-chat-local-ai/scripts/backup-db.sh
```

Backups are saved to `~/family-chat-backups/`. The last 30 are kept automatically.

---

### Changing the password

The admin password in `.env` is only used during the initial seed. To change it after setup, update both `.env` and the database:

```bash
cd server
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient();
bcrypt.hash('your-new-password', 12)
  .then(hash => db.user.update({ where: { username: 'admin' }, data: { passwordHash: hash } }))
  .then(() => { console.log('Done'); db.\$disconnect(); });
"
```

---

### Switching LLM models

```bash
# Pull any model from https://ollama.com/library
ollama pull qwen2.5:14b
ollama pull llama3.1:8b
ollama pull deepseek-r1:7b

# Update server/.env:
OLLAMA_MODEL=qwen2.5:14b

# Restart the server
systemctl --user restart family-chat
```

You can also change the model and system prompt from the **Bot Settings** screen in the app (admin only).

---

### Rebuilding after config changes

If you change `client/.env` (e.g. after changing your ngrok domain):

```bash
cd client
npm run build:web -- --clear    # clears Metro cache and rebuilds
systemctl --user restart family-chat
```

---

## Security notes

- The ngrok URL is publicly reachable. Anyone who discovers it can attempt to log in. The server has rate limiting (100 req/min) to slow brute-force attempts.
- Keep your ngrok authtoken private — rotate it at [dashboard.ngrok.com/authtokens](https://dashboard.ngrok.com/authtokens) if it's ever exposed.
- JWT tokens expire after 30 days (`JWT_EXPIRY` in `.env`).

---

## Using the AI Assistant

The AI bot user is `@ai` (displayed as "AI Assistant").

**To chat with the bot directly:**
- Tap "New Chat" → select "AI Assistant" → send a message

**To add the bot to a group chat:**
- When creating a group, select "AI Assistant" along with family members
- In the group, mention `@ai` or `@bot` to trigger a response

**Think Mode** (admin setting): enables chain-of-thought reasoning. Supported by `qwen3`, `deepseek-r1`, and similar models. Slower but more accurate.

---

## Project Structure

```
family-chat/
├── scripts/
│   ├── setup-services.sh  # systemd auto-start setup
│   └── backup-db.sh       # SQLite backup
│
├── server/           # Fastify backend + Socket.io + bot
│   ├── prisma/       # Database schema and migrations
│   └── src/
│       ├── bot/      # LLM bot orchestrator
│       ├── routes/   # REST API routes
│       ├── services/ # Business logic
│       └── plugins/  # Socket.io setup
│
└── client/           # Expo Router app (web + iOS PWA)
    ├── app/          # File-based routes
    ├── components/   # Reusable UI components
    ├── contexts/     # Auth + Socket contexts
    ├── hooks/        # useMessages, useConversations
    └── lib/          # API client, socket, storage
```

---

## Migrating to PostgreSQL

When you're ready to switch from SQLite to PostgreSQL:

1. In `server/prisma/schema.prisma`, change `provider = "sqlite"` → `"postgresql"`
2. Set `DATABASE_URL` to your PostgreSQL connection string
3. Run `npx prisma migrate deploy`

No application code changes needed.
