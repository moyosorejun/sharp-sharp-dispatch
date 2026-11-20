# Sharp Sharp Dispatch: setup guide

Checked against the official Supabase, ngrok and Vapi docs on 20 November 2026.
If a screen looks different from this guide, stop and send a screenshot instead of guessing.

You need 3 terminals open in the end:
- Terminal 1: the server (`server/`)
- Terminal 2: ngrok
- Terminal 3: the web app (`web/`)

---

## Step 1. Supabase (database)

1. Go to supabase.com, sign in, click **New project**. Pick any name and a strong database password (save it somewhere).
2. When the project is ready, click **SQL Editor** in the left sidebar.
3. Open `supabase/schema.sql` from the project folder, copy everything, paste it into the editor and click **Run**.
4. Check it worked: click **Table Editor**. You should see `orders`, `calls`, `turns` and `escalations`, and `orders` should have 20 rows.

**Get the Project URL**
- Click the **Connect** button at the top of the project dashboard. It shows the project URL.
- Backup option: your browser address bar shows `supabase.com/dashboard/project/<project-ref>`. Your URL is `https://<project-ref>.supabase.co`.

**Get the secret key**
- Go to **Settings > API Keys**.
- Copy the **secret key** (it starts with `sb_secret_`).
- If you see a **Create new API keys** button instead, click it first. It is safe.
- Do not use the Legacy API Keys tab.

---

## Step 2. Server settings (Terminal 1)

1. In `sharp-sharp-dispatch/server/`, copy `.env.example` and rename the copy to `.env`.
2. Fill in:
   ```
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
   WEB_ORIGIN=http://localhost:5173
   ```
   (The name says "service role" but the secret key goes there. That is correct.)
3. In Terminal 1, inside `server/`, run:
   ```
   npm install
   npm install @supabase/supabase-js@latest
   npm run dev
   ```
4. You should see `Agent server listening on http://localhost:3001`. Leave this terminal running.

---

## Step 3. ngrok (lets Vapi reach your laptop) (Terminal 2)

1. Sign up at ngrok.com (free).
2. Install it. In PowerShell:
   ```
   winget install ngrok -s msstore
   ```
   (Or install "ngrok" from the Microsoft Store.)
3. Copy your authtoken from dashboard.ngrok.com > **Your Authtoken**, then run:
   ```
   ngrok config add-authtoken <YOUR_AUTHTOKEN>
   ```
4. Start it:
   ```
   ngrok http 3001
   ```
   Free accounts get a free dev domain that stays the same across restarts. Copy the `https://....ngrok-free.app` address from the "Forwarding" line.
   - If you get error `ERR_NGROK_15013`, create a domain in the ngrok dashboard (Domains), then run `ngrok http 3001 --url=https://<your-domain>`.
5. In `server/.env`, set:
   ```
   PUBLIC_SERVER_URL=https://<your-domain>.ngrok-free.app
   ```
6. Check it: open `https://<your-domain>.ngrok-free.app` in your browser. You should see "Sharp Sharp Dispatch agent server is running." Leave this terminal running.

---

## Step 4. Vapi (Ada's voice)

1. Sign up at dashboard.vapi.ai.
2. In the left sidebar, open **API Keys** (under Integrations). You will see **Private API Keys** and **Public API Keys**. If either is empty, click **Add Key**.
   - Copy the **private** key into `server/.env` as `VAPI_API_KEY=...`
   - Keep the **public** key for Step 5.
3. Pick a voice: go to **Resources > Voice Library**. Filter by provider, press play to preview, and search names to find a Nigerian-sounding voice. There is no accent filter, so preview a few. Click the copy icon to copy the voice ID.
4. In `server/.env`, set the provider and the ID. The provider must be the exact string Vapi uses, for example:
   ```
   VOICE_PROVIDER=11labs      (for ElevenLabs voices)
   VOICE_PROVIDER=vapi        (for Vapi's own voices)
   VOICE_ID=<the copied id>
   ```
5. Save `server/.env`, then **restart the server** (in Terminal 1 press Ctrl+C, then `npm run dev` again) so it reads the new values.
6. Open a new terminal in `server/` and run:
   ```
   npm run create-assistant
   ```
   It prints two lines. Paste `VAPI_ASSISTANT_ID=...` into `server/.env`, and keep the ID for Step 5.
   - If it fails with an error about the model, open any assistant in the Vapi dashboard, check the Model dropdown for a valid provider and model name, and put them in `MODEL_PROVIDER` and `MODEL_NAME` in `server/.env`. Then run it again.

---

## Step 5. Web app settings (Terminal 3)

1. In `sharp-sharp-dispatch/web/`, create or open `.env` and add:
   ```
   VITE_VAPI_PUBLIC_KEY=<public key from Step 4>
   VITE_VAPI_ASSISTANT_ID=<assistant id from Step 4>
   VITE_GITHUB_URL=https://github.com/moyosorejun
   VITE_LINKEDIN_URL=https://www.linkedin.com/in/moyo-junaid-60a13b285/
   ```
2. Never put the Supabase secret key or the Vapi private key in this file.
3. In Terminal 3, inside `web/`, run `npm run dev` (stop and restart it if it was already running).

---

## Step 6. First real call

1. Open http://localhost:5173/call. The badge should say **Live call**, not Demo call.
2. Click **Talk to Ada** and allow the microphone.
3. Say: "Abeg check my order, na 1004." Wait for Ada.
4. Then say: "At hub? Wetin be that one?"

**Check:**
- The transcript shows both sides.
- The order card for SSD-1004 slides in.
- The confusion meter moves after your second line.
- The confusion chip sits under the right message.
- In Supabase Table Editor, `turns` and `calls` have new rows.

Send a screenshot of the call screen plus anything red in Terminal 1, even if it all worked.

## If something breaks

| What you see | Most likely cause |
|---|---|
| Server says it cannot connect to Supabase | Wrong `SUPABASE_URL` or secret key, or server not restarted after editing `.env` |
| `create-assistant` says unauthorized | You used the public key as `VAPI_API_KEY`. It must be the private key |
| Call page still says Demo call | `web/.env` missing a value, or Vite not restarted |
| Ada talks but the order card never appears | Vapi cannot reach the server: check ngrok is running and `PUBLIC_SERVER_URL` matches |
| Ada talks but the transcript stays empty | The browser is not receiving Vapi's messages. Tell Claude Code (it already flagged this) |
