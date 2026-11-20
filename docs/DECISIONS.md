# Build process and trade-offs

This document explains how Ada was built, the choices made along the way, and what each choice costs. The short version: the hardest part of this project is not the confusion ladder, it is **hearing Nigerian Pidgin correctly**, and that problem is only partly solved.

## How it was built

1. **Brief and data first.** A design brief (`docs/design-brief.md`) fixed the brand, screens and copy rules. `supabase/schema.sql` defined the tables (`orders`, `calls`, `turns`, `escalations`) and 20 fake orders, SSD-1001 to SSD-1020, each chosen to exercise a different delivery status.
2. **Server tools.** `server/index.js` is one Express endpoint (`/vapi`) that receives everything Vapi sends: tool calls, speech events and the end-of-call report. A separate read-only `/api` router feeds the web app.
3. **Agent as code.** `server/scripts/create-assistant.js` creates Ada and her tools through the Vapi API, and on every later run updates the same assistant in place. Prompt, voice, transcriber and tool definitions live in the repo, not in dashboard clicks, so every change is reviewable.
4. **Web app on a mock engine.** The live call view (`web/src/pages/Call.tsx`) was built against a scripted mock engine that dispatches the exact same state as a real call. The UI could be designed and demoed with no API keys, and the demo still works today with `?demo`.
5. **Live engine.** `web/src/call/vapiEngine.ts` swaps the mock for the Vapi Web SDK. Real calls exposed problems the mock could not: misheard Pidgin, one message split into many bubbles, and Ada's bubbles showing her audio transcribed back instead of what she meant to say.
6. **Fixing what real calls showed.** Transcription accuracy, bubble grouping, and callers who do not know their order ID were all handled after live testing. Those fixes are the trade-offs below.

## Trade-offs

### 1. Pidgin transcription is not good, and that is the biggest weakness

**The problem.** No speech-to-text model available through Vapi is trained on Nigerian Pidgin. Ada uses Deepgram `nova-3` with `language: 'en'`, which hears Pidgin as English: "abeg" becomes "a beg", "wetin" becomes "what in", "dey" becomes "they". Live testing showed Pidgin was almost never transcribed with correct spelling.

**What was tried, in order:**

| Approach | What it does | Result |
|---|---|---|
| Deepgram keyterms | 54 terms (Pidgin words and phrases, the brand name, all 20 order IDs) passed as `keyterm` to bias recognition | Helps order IDs and the brand. Does not fix Pidgin spelling, because the model has no Pidgin vocabulary to bias toward |
| Display correction map | `web/src/call/displayFix.ts` rewrites common mis-hearings on screen only ("a beg" to "abeg") | Cheap and instant, but fragile. Only catches patterns someone wrote down, and "what in the world" would become "wetin the world", so it is skipped once the caller is known to speak English |
| LLM rewrite | An LLM rewrites the caller's exact words in correct Pidgin spelling (`caller_said`), and the transcript shows that version. First done by Ada's `log_turn` tool, now by the server's scorer (trade-off 4) | Works because the LLM has the whole conversation as context. Still on, as a second layer |
| OpenAI `gpt-4o-mini-transcribe` with a prompt (current) | Replaces Deepgram as the transcriber. Its free-text `prompt` tells it callers speak Pidgin and lists the Pidgin spellings to use, so it can write "abeg" and "I no get am" instead of English look-alikes. Deepgram with keyterms stays as the automatic fallback | Fixed most Pidgin spelling. The full `gpt-4o-transcribe` was tried first but averaged 0.94s per turn (Deepgram: 0.2 to 0.6s), so the faster mini model is used; `OPENAI_STT_MODEL` switches back |

The transcriber is one setting, `TRANSCRIBER` in `server/.env` (`openai`, `azure` or `deepgram`), applied with `npm run create-assistant`, so providers can be compared on the same test phrases.

**What the current approach costs:**

- **Latency.** Ada writes the full corrected sentence as a tool argument before replying, so replies can start slightly later than before.
- **Trust.** The bubble shows an LLM's reconstruction, not a recording. It could in principle paraphrase or "fix" something the caller really said. The prompt forbids translating or summarising, and the raw transcript is still stored, but the displayed text is Ada's interpretation.
- **A visible switch.** While the caller speaks, the live typing line shows the raw transcript. About a second after they stop, the bubble switches to the corrected version.
- **It fixes display, not hearing.** If the transcriber mishears badly enough that Ada misunderstands, the correction is wrong too. Better recognition is still the real fix.

**Not tried yet:** Azure Speech with `en-NG` (Nigerian English), available as `TRANSCRIBER=azure`. It will not write Pidgin spelling, but it may hear Nigerian accents better and give the LLM cleaner text to correct. Longer term, a Nigerian speech provider such as Spitch is on the roadmap.

### 1b. Latency, interruptions and voice rhythm

Vapi's call logs (`GET /call`, `artifact.performanceMetrics`) showed an average of about 2.5 to 2.8 seconds from the caller finishing to Ada speaking, with some turns at 4 to 5.7 seconds. The causes and fixes:

| Cause found in the logs | Fix |
|---|---|
| Ada called `log_turn` on its own before replying, so every turn needed an extra model round trip, sometimes two (it was called twice in one turn) | The prompt and tool description now say: call it once, in the same response as the spoken reply |
| Vapi waits 1.5s after any transcript without punctuation before replying | `onNoPunctuationSeconds` lowered to 0.8s; numbers get 0.8s so digits said with gaps are not cut in half |
| Five interruptions in one call: any "hmm" from the caller cut Ada off mid-sentence, leaving fragments like "E be like..." | Interrupting now takes two real words, and Pidgin acknowledgements ("ehen", "yes o", "na so") are ignored |
| Choppy voice: text was sent to the voice in clause-sized chunks split at commas, each spoken separately | Chunks are now at least 50 characters and split only at sentence ends; ElevenLabs `eleven_turbo_v2_5` with less aggressive streaming optimisation |
| "SSD-1004" was spoken as "SSD minus..." | A voice formatting rule rewrites order IDs as "S S D, 1 0 0 4" |
| Misheard IDs ("10 204") failed, so Ada asked for a full repeat | `check_order` returns `did_you_mean` (real IDs one edit away) for Ada to confirm |

- **Cost:** bigger voice chunks can add a fraction of a second before Ada starts talking, in exchange for smoother speech. Ignoring short acknowledgements means a caller who says only "no" will not stop her mid-sentence.

### 2. Ada's bubbles show what she generated, not what was heard

Ada's bubbles are built from Vapi's `model-output` tokens (grouped by `turnId`), not from a transcript of her own voice, which had its own transcription errors. Her greeting does not go through the model, so `conversation-update` fills in any assistant message `model-output` never sent.

- **Cost:** text can appear slightly ahead of her voice, and if the caller interrupts her, the bubble still shows the sentence she did not finish saying.

### 3. One bubble per turn

Consecutive final transcripts from the same speaker merge into one bubble until the other person talks, and partial transcripts show as a live typing line inside it. This reads like a chat instead of a stream of fragments.

- **Cost:** one bubble can now hold two logged turns. Confusion chips are attached by following each `log_turn` call to the caller bubble it describes, and a merged bubble shows the chips for its latest turn. If those tool-call messages ever fail to reach the browser, the view falls back to matching by count, which can misplace chips.

### 4. Confusion is scored by the LLM, not a trained model

Ada silently judges confusion from 0 to 3 and picks an explanation level, using phrases, repeated questions and wrong paraphrases defined in `prompts/system-prompt.md`. What gets **recorded** is scored separately, on the server.

- **Why an LLM:** no labelled dataset of confused Pidgin callers exists, and an LLM handles code-switching and context well enough for a demo.
- **Cost:** the score is a heuristic. It is not validated, and it can drift between calls.

**How it is recorded, and why it moved.** Ada first logged each turn herself with a `log_turn` tool before replying. Call logs showed this cost an extra model round trip every turn, and the model was inconsistent about it: sometimes it spoke a fragment ("No wahala."), stopped for the tool, then carried on, which callers heard as a 3 to 5 second freeze; sometimes it skipped the log entirely, leaving the confusion meter blank. Prompt wording did not fix either.

Now `server/scoring.js` does it. Vapi sends the server a `conversation-update` each time a message is added; once Ada has replied to a caller turn, that turn and her reply go to `openai/gpt-oss-120b` on Groq, which returns the confusion score, signals, language, the caller's words in correct Pidgin spelling, and the ladder level Ada's reply actually used.

- **Gain:** Ada answers without any tool call in the way, and every turn is scored.
- **Cost:** the meter updates a few seconds after Ada starts replying, not before. It needs a Groq API key on the server. Ada's in-the-moment judgement and the recorded score come from two different models and can occasionally disagree.
- **Exactly once:** several serverless instances can receive updates at the same time, so each call row has a `scored_turns` counter that a request must advance (an atomic compare-and-set) before scoring a turn.
- Pause length is measured on the server from speech events and is approximate.

### 5. Finding an order without the order ID

Callers often do not know their ID. Ada first tells them where to find it (it starts with SSD, and is in the booking SMS and email and on the seller's receipt; these are assumptions for this fictional company). If they still cannot find it, `find_order` looks it up by **name and delivery area together**.

- **Why both:** a name alone would let anyone fish for other people's orders. Ada never reads out an order unless both match.
- **Loose matching:** names and areas arrive through speech-to-text, so matching compares word prefixes ("Funmi" matches "Funmilayo", "VI" matches Victoria Island). A badly misheard name finds nothing, and Ada asks the caller to repeat it, then offers a human.
- **What a real company would do instead:** match on the caller's phone number. The demo has no phone column and browser calls have no caller ID.

### 6. Secrets stay on the server

The browser only ever has the Vapi **public** key and talks to a read-only API. The Vapi private key and Supabase secret key live in `server/.env`, which is git-ignored. An optional shared secret (`VAPI_SERVER_SECRET`) stops anyone except Vapi calling the tool endpoint.

### 7. Hosting

Both halves run on Vercel: the web app as a static site (`web/vercel.json` sends every route to the React app) and the Express server as a single Vercel Function (`server/index.js` exports the app; it only calls `listen()` locally). Vercel was chosen over Render's free tier because Render sleeps after 15 idle minutes and takes 30 to 60 seconds to wake, which would break the first call's tool lookups.

- **Cost of serverless:** function instances share no memory, so the pause timing that used to live in a `Map` now lives on the `calls` row (`assistant_stopped_at`, `pending_pause_ms`). That adds two small database writes per turn. If those columns are missing, the server falls back to memory, which is only reliable on a single long-running server.
- **Grants:** newer Supabase projects do not give API roles access to tables created in the SQL editor, so `schema.sql` ends with explicit grants to `service_role`. The browser never talks to Supabase, so no other role gets access.
- **Deploys are manual** (`vercel deploy --prod` from `server/` and `web/`), not triggered by pushes to GitHub.
- Local development still works with ngrok: point `PUBLIC_SERVER_URL` back at the ngrok domain and run `npm run create-assistant`.

## Known limitations at a glance

- Pidgin transcription is weak (see trade-off 1); the transcript shows Ada's corrected version, not raw speech.
- Confusion scoring is an LLM heuristic.
- Order lookup without an ID depends on the name being heard correctly.
- Tested with a small group of callers only.
- Hosted on Vercel free tier with manual deploys; pause timing costs extra database writes because functions are stateless.
