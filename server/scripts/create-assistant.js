// Creates or updates the 3 tools and the "Ada" assistant in your Vapi account.
// Run from the server folder:  npm run create-assistant
//
// First run: creates everything and prints the assistant id.
//   Put it in server/.env as VAPI_ASSISTANT_ID=...
// Every run after that: updates the same assistant and its tools in place
//   (prompt, voice, model, tool definitions, server URL), so tuning Ada's
//   prompt never leaves duplicate Adas in the Vapi dashboard.
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const VAPI = 'https://api.vapi.ai';
const { VAPI_API_KEY, PUBLIC_SERVER_URL, VAPI_SERVER_SECRET } = process.env;

if (!VAPI_API_KEY || !PUBLIC_SERVER_URL) {
  console.error('Set VAPI_API_KEY and PUBLIC_SERVER_URL in server/.env first.');
  process.exit(1);
}

const serverUrl = `${PUBLIC_SERVER_URL.replace(/\/$/, '')}/vapi`;
const server = VAPI_SERVER_SECRET ? { url: serverUrl, secret: VAPI_SERVER_SECRET } : { url: serverUrl };

async function vapi(method, route, body) {
  const res = await fetch(`${VAPI}${route}`, {
    method,
    headers: { Authorization: `Bearer ${VAPI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${route} failed: ${JSON.stringify(json)}`);
  return json;
}

const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'check_order',
      description: 'Look up a Sharp Sharp Dispatch order by its ID (format SSD-1004) and return its status and details.',
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'string', description: 'The order ID, e.g. SSD-1004. If the caller only gives digits, pass the digits.' },
        },
        required: ['order_id'],
      },
    },
    server,
  },
  {
    type: 'function',
    function: {
      name: 'find_order',
      description: 'Find an order for a caller who does not know their order ID, using the name on the order AND the delivery area. Only use after the caller has checked their SMS or receipt and still cannot find the ID.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'The name on the order, as the caller said it.' },
          delivery_area: { type: 'string', description: 'The area the package is going to, e.g. Victoria Island, Surulere, Abuja.' },
        },
        required: ['customer_name', 'delivery_area'],
      },
    },
    server,
  },
  {
    type: 'function',
    async: true, // runs in the background so the caller never waits for logging
    function: {
      name: 'log_turn',
      description:
        'Record how confused the caller seems. Call exactly once per caller message, before replying. Never skip it and never call it twice for the same message.',
      parameters: {
        type: 'object',
        properties: {
          caller_said: {
            type: 'string',
            description:
              "The caller's last message, word for word, in correct spelling. Speech-to-text often mishears Pidgin (e.g. 'a beg' for abeg, 'what in' for wetin, 'they' for dey), so fix misheard words using the conversation for context. Write Pidgin in standard Nigerian Pidgin spelling (abeg, wetin, dey, sabi, wahala, comot, oya, una, wey, na, sef, sha, abi, shey, ehn). Do not translate, summarise or add words. This text is shown in the live transcript.",
          },
          language: { type: 'string', enum: ['english', 'pidgin', 'mixed'] },
          confusion_score: { type: 'integer', minimum: 0, maximum: 3, description: '0 clear, 1 slightly unsure, 2 confused, 3 lost or frustrated' },
          ladder_level: { type: 'integer', minimum: 0, maximum: 3, description: 'The explanation level you are about to use: 0 normal, 1 smaller steps, 2 analogy, 3 offer a human' },
          signals: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['pidgin_confusion_phrase', 'english_confusion_phrase', 'repeated_question', 'wrong_paraphrase', 'short_unsure_reply', 'frustration', 'asked_for_human'],
            },
          },
        },
        required: ['caller_said', 'language', 'confusion_score', 'ladder_level'],
      },
    },
    server,
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_human',
      description: 'Hand the caller over to a human agent and send an alert to the support team.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', enum: ['caller_asked', 'still_confused', 'damaged_or_missing_item', 'payment_problem', 'order_not_found', 'reschedule_or_address_change'] },
          summary: { type: 'string', description: 'Two or three sentences a human agent can act on: who, which order, what the problem is, what was already explained.' },
          order_id: { type: 'string' },
          caller_language: { type: 'string', enum: ['english', 'pidgin', 'mixed'] },
        },
        required: ['reason', 'summary'],
      },
    },
    server,
  },
];

// Deepgram keyterm prompting (nova-3, field `keyterm`, max 100 terms of
// up to 50 chars each). Biases the transcriber toward Pidgin and our own words.
const PIDGIN_TERMS = [
  'abeg', 'wetin', 'dey', 'sabi', 'wahala', 'no wahala', 'comot', 'abi', 'oya', 'una',
  'wey', 'na', 'fit', 'sef', 'sha', 'abeg no vex', 'I no get am', 'wetin you talk', 'how far', 'shey',
  'ehn', 'make I', 'e don', 'e never', 'we dey come',
  'ehen', 'no vex', 'I no understand', 'you dey follow', 'small small', 'wetin dey happen', 'make una',
];
const BRAND_TERMS = ['Sharp Sharp Dispatch', 'SSD'];
// The 20 order ids seeded in supabase/schema.sql
const ORDER_TERMS = Array.from({ length: 20 }, (_, i) => `SSD-${1001 + i}`);
const DIGIT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const keyterm = [...PIDGIN_TERMS, ...BRAND_TERMS, ...ORDER_TERMS];
if (keyterm.length > 100) throw new Error(`Deepgram allows 100 keyterms, got ${keyterm.length}`);

// ---------------------------------------------------------------
// Speech-to-text. Pick with TRANSCRIBER in .env: openai | azure | deepgram.
//   openai:   gpt-4o-transcribe, steered by a prompt to write Pidgin in
//             Pidgin spelling instead of "correcting" it to English.
//   azure:    Nigerian English (en-NG) accent model. English spelling.
//   deepgram: nova-3 English with Pidgin keyterms. Hears Pidgin as English.
// Deepgram is always the fallback if the chosen provider fails.
// ---------------------------------------------------------------
const OPENAI_STT_PROMPT = [
  'Phone call to Sharp Sharp Dispatch, a parcel delivery company in Lagos, Nigeria.',
  'Callers speak Nigerian Pidgin, Nigerian English, or a mix of both.',
  'Write Pidgin exactly as spoken, in standard Pidgin spelling. Never convert it to standard English.',
  'Pidgin words: abeg, wetin, dey, sabi, wahala, no wahala, comot, abi, oya, una, wey, na, fit, sef, sha, shey, ehn, ehen, no vex, abeg no vex, I no get am, I no understand, wetin you talk, how far, make I, e don, e never, you dey follow, small small, we dey come.',
  'Order IDs look like SSD-1004 (S S D then four digits).',
  'Example: "Abeg check my order, na SSD-1004." "At hub? Wetin be that one?" "I still no get am."',
].join(' ');
if (OPENAI_STT_PROMPT.length > 1024) throw new Error(`gpt-4o-transcribe prompt max is 1024 chars, got ${OPENAI_STT_PROMPT.length}`);

const deepgram = { provider: 'deepgram', model: 'nova-3', language: 'en', keyterm };
const TRANSCRIBERS = {
  openai: { provider: 'openai', model: 'gpt-4o-transcribe', language: 'en', prompt: OPENAI_STT_PROMPT },
  azure: { provider: 'azure', language: 'en-NG' },
  deepgram,
};
const transcriberName = (process.env.TRANSCRIBER || 'openai').trim().toLowerCase();
if (!TRANSCRIBERS[transcriberName]) throw new Error(`TRANSCRIBER must be one of: ${Object.keys(TRANSCRIBERS).join(', ')}`);
const transcriber =
  transcriberName === 'deepgram'
    ? deepgram
    : { ...TRANSCRIBERS[transcriberName], fallbackPlan: { transcribers: [deepgram] } };

// Updates the assistant's existing tools (matched by function name) and
// creates any that are missing. Returns the tool ids in definition order.
async function syncTools(existingIds) {
  const existing = new Map();
  for (const id of existingIds) {
    try {
      const tool = await vapi('GET', `/tool/${id}`);
      if (tool.function?.name) existing.set(tool.function.name, tool.id);
    } catch (e) {
      console.warn(`  could not read tool ${id}, skipping it: ${e.message}`);
    }
  }
  const ids = [];
  for (const def of toolDefinitions) {
    const name = def.function.name;
    const id = existing.get(name);
    if (id) {
      await vapi('PATCH', `/tool/${id}`, def);
      console.log(`  updated ${name}: ${id}`);
      ids.push(id);
    } else {
      const tool = await vapi('POST', '/tool', def);
      console.log(`  created ${name}: ${tool.id}`);
      ids.push(tool.id);
    }
  }
  return ids;
}

async function main() {
  const systemPrompt = await readFile(path.join(here, '../../prompts/system-prompt.md'), 'utf8');
  const assistantId = process.env.VAPI_ASSISTANT_ID?.trim();

  let existingToolIds = [];
  if (assistantId) {
    console.log(`Updating assistant ${assistantId}...`);
    const current = await vapi('GET', `/assistant/${assistantId}`); // fails loudly if the id is wrong
    existingToolIds = current.model?.toolIds ?? [];
  } else {
    console.log('No VAPI_ASSISTANT_ID in .env, creating a new assistant...');
  }

  console.log(`Transcriber: ${transcriberName}${transcriberName === 'deepgram' ? '' : ' (Deepgram fallback)'}`);
  console.log('Tools:');
  const toolIds = await syncTools(existingToolIds);

  const body = {
    name: 'Ada - Sharp Sharp Dispatch',
    firstMessage: 'Hello, welcome to Sharp Sharp Dispatch. My name na Ada. You fit talk to me for English or Pidgin. How I fit help you today?',
    model: {
      provider: process.env.MODEL_PROVIDER || 'openai',
      model: process.env.MODEL_NAME || 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }],
      toolIds,
    },
    voice: {
      provider: process.env.VOICE_PROVIDER || '11labs',
      voiceId: process.env.VOICE_ID,
      ...((process.env.VOICE_PROVIDER || '11labs') === '11labs' && {
        model: 'eleven_turbo_v2_5', // fast, but smoother than the flash models
        stability: 0.5,
        similarityBoost: 0.75,
        optimizeStreamingLatency: 2, // higher values trade smoothness for speed
      }),
      // Send the voice whole sentences, not clause-sized scraps: each chunk
      // is spoken separately, so splitting at commas made Ada sound choppy.
      chunkPlan: {
        enabled: true,
        minCharacters: 50,
        punctuationBoundaries: ['.', '!', '?', ';'],
        formatPlan: {
          enabled: true,
          // "SSD-1004" was read as "SSD minus one thousand and four": Vapi's
          // "dash" formatter turns hyphens into "minus", so it is left out,
          // and every order ID gets an exact spoken form.
          formattersEnabled: [
            'markdown', 'asterisk', 'quote', 'newline', 'colon', 'acronym', 'dollarAmount', 'email',
            'date', 'time', 'distance', 'unit', 'percentage', 'phoneNumber', 'number', 'stripAsterisk',
          ],
          replacements: [
            ...ORDER_TERMS.flatMap((id) => {
              const spoken = `S S D, ${id.slice(4).split('').map((d) => DIGIT_WORDS[d]).join(' ')}`;
              return [id, id.replace('-', ''), id.replace('-', ' ')].map((key) => ({ type: 'exact', key, value: spoken, replaceAllEnabled: true }));
            }),
            { type: 'regex', regex: '[Ss]\\s?[Ss]\\s?[Dd][\\s-]*(\\d)(\\d)(\\d)(\\d)', value: 'S S D, $1 $2 $3 $4' },
          ],
        },
      },
    },
    transcriber,
    // Turn-taking. Vapi's default waits 1.5s after any transcript with no
    // punctuation; spoken order numbers get a little longer so digits said
    // with gaps aren't cut in half.
    startSpeakingPlan: {
      waitSeconds: 0.3,
      transcriptionEndpointingPlan: { onPunctuationSeconds: 0.1, onNoPunctuationSeconds: 0.8, onNumberSeconds: 0.8 },
    },
    // A caller's "hmm" or "ehen" should not cut Ada off mid-sentence
    // (5 interruptions in one test call). Two real words still do.
    stopSpeakingPlan: {
      numWords: 2,
      voiceSeconds: 0.3,
      backoffSeconds: 1,
      acknowledgementPhrases: [
        'okay', 'ok', 'alright', 'yes', 'yeah', 'right', 'i see', 'i understand', 'got it', 'sure', 'uh-huh', 'mm-hmm',
        'hmm', 'ehen', 'ehn', 'yes o', 'okay o', 'oya', 'na so', 'i dey follow', 'i hear', 'i don hear', 'correct',
      ],
    },
    server,
    serverMessages: ['end-of-call-report', 'speech-update'],
    // What reaches the browser. The live call view needs model-output (Ada's
    // generated text by turnId), conversation-update (her greeting), transcript
    // (caller only), tool-calls (order card) and speech-update.
    clientMessages: [
      'conversation-update', 'model-output', 'transcript', 'tool-calls', 'speech-update',
      'status-update', 'user-interrupted', 'hang', 'voice-input', 'function-call', 'transfer-update',
    ],
  };

  if (assistantId) {
    await vapi('PATCH', `/assistant/${assistantId}`, body);
    console.log(`\nDone. Updated assistant ${assistantId}.`);
  } else {
    const assistant = await vapi('POST', '/assistant', body);
    console.log(`\nDone. Assistant id: ${assistant.id}`);
    console.log('Add these lines so the next run updates this assistant instead of making a new one:');
    console.log(`  server/.env   VAPI_ASSISTANT_ID=${assistant.id}`);
    console.log(`  web/.env      VITE_VAPI_ASSISTANT_ID=${assistant.id}`);
  }
  console.log('Open the Vapi dashboard, find "Ada - Sharp Sharp Dispatch" and click "Talk" to test it.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
