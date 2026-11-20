# Sharp Sharp Dispatch: a voice support agent that notices when you're lost

Ada is a voice support agent for a fictional Nigerian delivery company. She speaks English and Nigerian Pidgin, tracks orders, and, most importantly, **notices when a caller is confused and changes how she explains things** before escalating to a human.

> Sharp Sharp Dispatch is a made-up company for this demo. All orders and names are fake.

**Try it:** [sharp-sharp-dispatch.vercel.app](https://sharp-sharp-dispatch.vercel.app). Open the call page and talk to Ada in English or Pidgin, or add `?demo` to `/call` for a scripted call with no mic.

## Why

Most support bots notice anger, not confusion. And most of them don't understand how Nigerians actually sound when they're lost: "wetin you talk?", "I no get am", "abeg explain am again". Ada uses ideas from cognitive load theory: when someone is confused, reduce the load (smaller steps), then reframe (a familiar analogy), and only then hand over to a human.

## How it works

```
Caller (browser or phone)
        |
      Vapi  (speech-to-text -> LLM -> Nigerian-accent voice)
        |
        |-- check_order(order_id)        -> Express API -> Supabase (orders)
        |-- find_order(name, area)       -> Express API -> Supabase (orders), for callers without an ID
        |-- conversation-update          -> Express API -> Groq scores each caller turn -> Supabase (turns)
        |-- escalate_to_human(summary)   -> Express API -> Supabase + n8n -> WhatsApp / email
        |-- speech-update events         -> Express API (measures caller pauses)
        '-- end-of-call-report           -> Express API -> Supabase (calls)

Browser (web/)  <- Vapi Web SDK events: caller transcript, Ada's model output, tool calls
                <- read-only Express API: orders, confusion turns, escalations
```

The web app's live call view shows the transcript (one bubble per turn), Ada's voice orb, the confusion meter, the explanation ladder and the order card as they happen. Add `?demo` to `/call` for a scripted call that needs no keys or mic.

**The explanation ladder**

| Level | When | What Ada does |
|---|---|---|
| 0 | Caller is clear | Short, direct answer |
| 1 | Confusion score 2 | Smaller steps, then "You dey follow?" |
| 2 | Still confused, or score 3 | Everyday Nigerian analogy (bus park, danfo, street with no name) |
| 3 | Still lost, or asks for a person | Offers a human and escalates |

## Stack

Vapi (OpenAI gpt-4o-mini-transcribe speech-to-text with Deepgram fallback, OpenAI gpt-4o, ElevenLabs voice), Groq (confusion scoring), Node.js + Express, Supabase (Postgres), n8n, React + Vite + Tailwind.

## Docs

- [docs/SETUP.md](docs/SETUP.md): step-by-step setup with every dashboard click.
- [docs/DECISIONS.md](docs/DECISIONS.md): how it was built, and the trade-offs, especially Pidgin transcription.
- [docs/design-brief.md](docs/design-brief.md): brand and UI brief for the web app.

## Setup

1. **Supabase:** create a project, open the SQL Editor, paste and run `supabase/schema.sql`. This creates the tables and 20 mock orders (SSD-1001 to SSD-1020).
2. **Server:**
   ```bash
   cd server
   npm install
   cp .env.example .env   # fill in your keys
   npm run dev
   ```
3. **Expose the server** so Vapi can reach it while developing. Claim the free static domain in your ngrok dashboard so the URL never changes between restarts:
   ```bash
   ngrok http --url=your-name.ngrok-free.app 3001
   ```
   Put the https URL in `PUBLIC_SERVER_URL` in `.env`.
4. **Pick a voice** in the Vapi dashboard (Voice Library, search "Nigerian") and put its provider and id in `.env`.
5. **Create the agent:**
   ```bash
   npm run create-assistant
   ```
   Copy the assistant id it prints into `VAPI_ASSISTANT_ID` in `server/.env` (and `VITE_VAPI_ASSISTANT_ID` in `web/.env`). After that, running the same command updates Ada in place, so you can tune the prompt without creating duplicates.
6. In the Vapi dashboard, open **Ada - Sharp Sharp Dispatch** and click **Talk**. Try: "I wan check my order, na SSD 1004."

## Test script

- English, clear: "Can you check order 1002?"
- Pidgin, confused: "Abeg check 1004." then "At hub? Wetin be that one?" then "I still no get am."
- Address problem: order 1008 or 1020.
- Escalation: "Abeg make I talk to person."
- No order ID: "I no know my order number." then the name "Emeka Nwosu" and the area "Victoria Island" (finds SSD-1004).

## Known limitations

Full reasoning in [docs/DECISIONS.md](docs/DECISIONS.md).

- **Pidgin transcription is the weakest part.** No speech-to-text model available through Vapi is trained on Pidgin, so Deepgram hears it as English ("abeg" becomes "a beg"). Keyterms help with order IDs but not Pidgin spelling. The transcript shows Ada's correctly spelled version of what the caller said, which is an LLM reconstruction and adds a little reply latency. The raw transcript is kept.
- Confusion scoring is a heuristic from the LLM, not a validated model.
- Finding an order without its ID needs the caller's name and area to be heard correctly. A real deployment would match on the caller's phone number.
- Pause timing is measured on the server from speech events and is approximate.
- Pushing to `main` redeploys the server and web app on Vercel, but Ada's own settings live on Vapi: run `npm run create-assistant` in `server/` after changing her prompt or config.
- Tested with a small group of callers.

## Roadmap

- Try Azure Speech with Nigerian English (`en-NG`) to see if it hears accents better than Deepgram
- Pidgin, Yoruba, Hausa and Igbo via Nigerian speech APIs (e.g. Spitch)
- A phone number callers can dial
- Feed long pauses back to the agent in real time
- Use escalation history to improve the analogies
