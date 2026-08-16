require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Render terminates TLS at its own proxy, so without this req.ip is the proxy's
// address — the same value for every visitor. The per-IP AI budget below would then
// be one global bucket that a single enthusiastic user drains for everyone.
app.set('trust proxy', true);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Enhanced Scenario Data ---
const scenarios = {
  sarah: {
    orderId: 'PAY-789XLB',
    name: "Sarah Johnson",
    description: "Wrong Item Received",
    initialMessage: "I ordered an iPhone 15 Pro but got an iPhone 14! This is unacceptable! I need a replacement now with compensation!",
    evidence: {
      barcode: "https://drive.google.com/file/d/1JWu_ht4350vqCv3ERzcuSvjv9Iqv3qOy",
      packagingSlip: "https://drive.google.com/file/d/1YKcXdFbmT_McIikTpy1lORkmZMtKZ8KR",
      shippingLabel: "https://drive.google.com/file/d/1iEL7Qjic6Fw9UdWjxhpa3kv3HFm7iG8R"
    },
    steps: {
      initial: {
        options: [
          { id: 1, text: "I apologize for the error. May I have your order ID?", correct: true },
          { id: 2, text: "Hi, thank you for reaching out today, how can I help again?", correct: false },
          { id: 3, text: "We'll need you to return the item first", correct: false },
          { id: 4, text: "Your replacement will ship in 5 days", correct: false }
        ],
        correctResponse: "It's PAY-789XLB. Hurry up and fix this!",
        wrongResponse: "What the hell are you talking about? This is your company's fault!",
        wrongOptions: [
          { id: 1, text: "I apologize for the error. May I have your order ID?", correct: true },
          { id: 2, text: "We'll need you to return the item first", correct: false }
        ],
        nextStep: 'got_order_id'
      },
      got_order_id: {
        options: [
          { id: 1, text: "Thank you for your order ID, let me check your case in 2-3 minutes", correct: true },
          { id: 2, text: "Ok, this is noted, thank you", correct: false },
          { id: 3, text: "Very nice of you for giving the order ID", correct: false },
          { id: 4, text: "Alright, then", correct: false }
        ],
        correctResponse: "Ok fine, you gotta be back soon, I don't have all day",
        wrongResponse: "Ok, I have given you my order ID, now what? You want to run from your responsibility?",
        wrongOptions: [
          { id: 1, text: "Very nice of you for giving the order ID", correct: false },
          { id: 2, text: "Thank you for your order ID, let me check your case in 2-3 minutes", correct: true }
        ],
        nextStep: 'waiting_period',
        needsWait: true,
        waitDuration: 120000
      },
      waiting_period: {
        options: [
          { id: 1, text: "Could you please send me the incorrect item barcode, packaging slip, and outer box shipping label? I need these documents to proceed.", correct: true },
          { id: 2, text: "Would you accept a similar item with same-day shipping?", correct: false },
          { id: 3, text: "Hi Sarah, your package is now showing a warehouse picking error.", correct: false },
          { id: 4, text: "Hi Sarah, your phone is showing a gateway timeout (Code 402).", correct: false }
        ],
        correctResponse: "Oh my god, you don't believe me? This is annoying",
        wrongResponse: "What are you talking about? What does that even mean?",
        wrongOptions: [
          { id: 1, text: "Could you please send me the incorrect item barcode, packaging slip, and outer box shipping label? I need these documents to proceed.", correct: true },
          { id: 2, text: "Would you accept a similar item with same-day shipping?", correct: false }
        ],
        nextStep: 'evidence_request',
        showEvidence: true
      },
      evidence_request: {
        options: [
          { id: 1, text: "Hi Sarah, thank you for the data. We do apologize that your package is already lost by the courier. Do you need the contact person of the courier to discuss?", correct: false },
          { id: 2, text: "Hi Sarah, I've verified your bank transfer for order PAY-789XLB. While we haven't received confirmation yet, I've initiated a manual override.", correct: false },
          { id: 3, text: "Hi Sarah, thank you for the data. We will dispatch the correct item today! Please return the wrong item to our courier when you receive the correct item. Your new order PAY-789XLB (Apple iPhone 15 Pro) will arrive within the next working day. I've added a USD 20 voucher for the hassle.", correct: true },
          { id: 4, text: "Would you consider a refund for this order?", correct: false }
        ],
        correctResponse: "Ok then. Please add the voucher now. otherwise i will chat you back",
        wrongResponse: "It doesn't make any sense",
        wrongOptions: [
          { id: 2, text: "Hi Sarah, I've verified your bank transfer for order PAY-789XLB. While we haven't received confirmation yet, I've initiated a manual override.", correct: false },
          { id: 3, text: "Hi Sarah, thank you for the data. We will dispatch the correct item today! Please return the wrong item to our courier when you receive the correct item. Your new order PAY-789XLB (Apple iPhone 15 Pro) will arrive within the next working day. I've added a USD 20 voucher for the hassle.", correct: true },
          { id: 4, text: "Would you consider a refund for this order?", correct: false }
        ],
        nextStep: 'voucher_confirmation'
      },
      voucher_confirmation: {
        options: [
          { id: 1, text: "Sure Sarah, you will definitely have your voucher in your account within 1-2 hours", correct: true },
          { id: 2, text: "so, you don't believe me?", correct: false },
          { id: 3, text: "Why you double check that?", correct: false }
        ],
        correctResponse: "Ok, i will remember that!",
        wrongResponse: "i can say whatever i want!",
        wrongOptions: [
          { id: 1, text: "Sure Sarah, you will definitely have your voucher in your account within 1-2 hours", correct: true },
          { id: 2, text: "so, you don't believe me?", correct: false }
        ],
        nextStep: 'reconfirmation',
        terminateOnSecondWrong: true,
        terminationFeedback: "Customer is frustrated because of your unprofessional behavior. Please check KB and Best Practice to learn how to handle customer properly."
      },
      reconfirmation: {
        options: [
          { id: 1, text: "Ok then", correct: false },
          { id: 2, text: "sure", correct: false },
          { id: 3, text: "Ok Sarah, anything else with can help you with?", correct: true }
        ],
        correctResponse: "nothing, that's all for today.",
        wrongResponse: "we'll see",
        wrongOptions: [
          { id: 1, text: "Ok then", correct: false },
          { id: 3, text: "Ok Sarah, anything else with can help you with?", correct: true }
        ],
        nextStep: 'resolution',
        terminateOnSecondWrong: false,
        reconfirmationStep: true
      },
      resolution: {
        options: [
          { id: 1, text: "Thank you for reaching out today. I will end this chat. Have a good day.", correct: true }
        ],
        correctResponse: null,
        nextStep: 'completed'
      }
    },
    prompt: `You're Sarah Johnson, angry about receiving wrong iPhone. 
             Your order ID is PAY-789XLB. 
             Provide evidence only when asked specifically about:
             - Barcode
             - Packaging slip
             - Shipping label
             Calm down only when offered replacement + voucher.`
  },
  michael: {
    orderId: 'KLX-13PLC',
    name: "Michael Chen",
    description: "Return Rejected",
    initialMessage: "What the f*ck! I returned those headphones because the product is damaged when i received, and now you're telling me I don't get a refund? I want to speak to someone who can actually help, or I'm going to report this to the police!",
    evidence: {
      damageImage: "https://drive.google.com/file/d/1zP60wW7ryl9XsCCTxxaMEddQl4vgMaDp"
    },
    steps: {
      initial: {
        options: [
          { id: 2, text: "Sorry, we already rejected your return. Nothing I can do.", correct: false },
          { id: 1, text: "I truly understand how you feel. May I have your order ID to check what went wrong?", correct: true },
          { id: 3, text: "Kindly wait while I check for you.", correct: false }
        ],
        correctResponse: "It's KLX-13PLC. And you better do this fast.",
        wrongResponse: "Are you seriously brushing me off? I'm contacting my lawyer if this isn't fixed now!",
        wrongOptions: [
          { id: 1, text: "I truly understand how you feel. May I have your order ID to check what went wrong?", correct: true },
          { id: 2, text: "Sorry, we already rejected your return. Nothing I can do.", correct: false }
        ],
        nextStep: 'got_order_id'
      },
      got_order_id: {
        options: [
          { id: 2, text: "Ok, thanks for that. I will try to look into it later.", correct: false },
          { id: 3, text: "Got it. Looks like your return was rejected due to damage.", correct: false },
          { id: 1, text: "Thank you, Michael. Let me check your case and get back in 2-3 minutes.", correct: true }
        ],
        correctResponse: "Alright. I'll wait. But I expect a proper resolution.",
        wrongResponse: '"Later?" Are you for real? Your company messed up and now I get vague answers?',
        wrongOptions: [
          { id: 1, text: "Thank you, Michael. Let me check your case and get back in 2-3 minutes.", correct: true },
          { id: 2, text: "Got it. Looks like your return was rejected due to damage.", correct: false }
        ],
        nextStep: 'waiting_period',
        needsWait: true,
        waitDuration: 120000
      },
      waiting_period: {
        options: [
          { id: 3, text: "You returned a used item. That's against policy.", correct: false },
          { id: 1, text: "Michael, thank you for your patience. We received your return, but the warehouse flagged signs of physical damage. May I ask: was the item damaged before shipping it back?", correct: true },
          { id: 2, text: "The warehouse has rejected your item. You broke it, so we can't refund you.", correct: false }
        ],
        correctResponse: "I don't have a video, but the picture is here: [evidence]. That's your warehouse issue!",
        wrongResponse: "Are you accusing me of breaking it? What kind of service is this?",
        wrongOptions: [
          { id: 1, text: "Michael, thank you for your patience. We received your return, but the warehouse flagged signs of physical damage. May I ask a video showing the product before opening packaging?", correct: true },
          { id: 2, text: "You returned a used item. That's against policy.", correct: false }
        ],
        nextStep: 'evidence_provided',
        showEvidence: true
      },
      evidence_provided: {
        options: [
          { id: 3, text: "I will escalate this to my manager, but it may take a week.", correct: false },
          { id: 1, text: "Thank you for clarifying, Michael. Based on policy, I can offer a partial refund of $200. Does it work for you?", correct: true },
          { id: 2, text: "Sorry, our team has made the final call. There's no refund.", correct: false }
        ],
        correctResponse: "Hmm. I'll take the partial refund. But I'm not happy with this.",
        wrongResponse: "Unacceptable! You've wasted enough of my time.",
        wrongOptions: [
          { id: 1, text: "Thank you for clarifying, Michael. Based on policy, I can offer a partial refund of $200 or send the item back to you. Let me know what works.", correct: true },
          { id: 2, text: "Sorry, our team has made the final call. There's no refund.", correct: false }
        ],
        nextStep: 'partial_refund'
      },
      partial_refund: {
        options: [
          { id: 3, text: "Thank you, Michael. Let us know if you have other issues.", correct: false },
          { id: 1, text: "Understood. I've initiated your $200 refund. It will reflect in 5–7 business days. Is there anything else I can help with?", correct: true },
          { id: 2, text: "Ok, refund sent. Bye.", correct: false }
        ],
        correctResponse: "Yeah, but i refused to have the refund only, i still want to speak with your manager! Otherwise, I'll fill a report to police still!",
        wrongResponse: "That's it? No proper closing? Wow.",
        wrongOptions: [
          { id: 1, text: "Understood. I've initiated your $200 refund. It will reflect in 5–7 business days. Is there anything else I can help with?", correct: true },
          { id: 2, text: "Ok, refund sent. Bye.", correct: false }
        ],
        nextStep: 'escalation_request'
      },
      escalation_request: {
        options: [
          { id: 2, text: "I do apologize for your issue, can we negotiate about this?", correct: false },
          { id: 3, text: "Yet, you got the refund partially right?", correct: false },
          { id: 1, text: "I understand your concern Michael, is you number under this account still active?", correct: true }
        ],
        correctResponse: "Yes",
        wrongResponse: "Did you hear me Dumbsh*t?!!",
        wrongOptions: [
          { id: 1, text: "I understand your concern Michael, is you number under this account still active?", correct: true },
          { id: 2, text: "I do apologize for your issue, can we negotiate about this?", correct: false }
        ],
        nextStep: 'phone_confirmation'
      },
      phone_confirmation: {
        options: [
          { id: 1, text: "Thank you for reaching out today. I'll ensure you will speak with the manager soon by phone. if you are not available to pickup, we will reach via email. Thank you", correct: true }
        ],
        correctResponse: null,
        nextStep: 'completed'
      }
    },
    prompt: `You're Michael Chen, furious about rejected return. 
             Your order ID is KLX-13PLC.
             Use vulgar language. 
             Only provide damage evidence when asked for "video proof". 
             Accept partial refund, yet demand to speak to manager still. while being asked if the email and phone number in the account is still active, answeer "yes"`
  }
};

// --- In-memory session storage ---
const sessions = {};

// --- AI budget guard ---
// The simulator is embedded publicly on a portfolio page, so anyone who opens it
// can spend OpenRouter credits. Cap AI-backed turns per IP per hour; over budget
// the session simply runs scripted, which is a complete experience on its own.
const AI_RATE_LIMIT_PER_HOUR = Number(process.env.AI_RATE_LIMIT_PER_HOUR || 60);
const aiUsage = new Map();

function consumeAiBudget(req) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;

  const entry = aiUsage.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    aiUsage.set(key, { windowStart: now, count: 1 });
    return true;
  }

  if (entry.count >= AI_RATE_LIMIT_PER_HOUR) return false;
  entry.count++;
  return true;
}

// --- Housekeeping ---
// Sessions and rate-limit entries live in memory, so without this a long-running
// dyno grows unbounded from abandoned sessions.
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of Object.entries(sessions)) {
    if (now - session.state.lastUserActivity > SESSION_TTL_MS) delete sessions[id];
  }
  for (const [key, entry] of aiUsage) {
    if (now - entry.windowStart >= 60 * 60 * 1000) aiUsage.delete(key);
  }
}, 15 * 60 * 1000).unref();

// --- Session Management ---
app.post('/api/session/start', (req, res) => {
  const { scenario } = req.body;
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  sessions[sessionId] = {
    scenario,
    orderId: scenarios[scenario].orderId,
    history: [],
    startTime: Date.now(),
    state: {
      currentStep: 'initial',
      points: 0,
      violations: [],
      attemptCount: 0,
      terminated: false,
      completed: false,
      greetingSent: false,
      reholdCount: 0,
      reholdPenaltyApplied: false,
      missedReconfirm: false,
      probing: { 
        orderId: false, 
        barcode: false, 
        packagingSlip: false, 
        shippingLabel: false, 
        video: false 
      },
      solutionOffered: false,
      empathyShown: false,
      holdCount: 0,
      thanked: false,
      reconfirmed: false,
      closed: false,
      lastUserActivity: Date.now()
    },
    forceFallback: false
  };

  res.json({
    sessionId,
    initialMessage: scenarios[scenario].initialMessage,
    scenario
  });
});

// --- AI configuration ---
const AI_MODE = process.env.AI_MODE || 'rephrase';

// Both providers speak the OpenAI chat-completions shape, so only the base URL, the
// key and the model names differ.
const PROVIDERS = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    keyEnv: 'DEEPSEEK_API_KEY',
    // Paid per token with no daily request cap. deepseek-chat is the non-reasoning
    // model, which is what this needs — deepseek-reasoner would spend tokens
    // thinking about a one-line rewrite.
    defaultModels: ['deepseek-chat']
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    keyEnv: 'OPENROUTER_API_KEY',
    // Free slugs get rate-limited upstream without warning, so a turn tries several
    // in order. Measured 2026-08-16 against the actual rephrase prompt; these were
    // the fast ones that returned usable dialogue. Deliberately excluded:
    // nemotron-3.5-content-safety (a moderation model, replies "User Safety: safe"),
    // nemotron-3.5-lightning (leaks its reasoning into content), lfm-2.5-2.6b and
    // nemotron-nano-12b-v2-vl (32s and 15s responses).
    defaultModels: [
      'google/gemma-4-26b-a4b-it:free',
      'poolside/laguna-s-2.1:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'openai/gpt-oss-20b:free'
    ]
  }
};

// Prefer whichever key is actually present, so switching provider is a matter of
// setting a key rather than remembering to set AI_PROVIDER too.
const REQUESTED_PROVIDER = process.env.AI_PROVIDER
  || (process.env.DEEPSEEK_API_KEY ? 'deepseek' : 'openrouter');

// If the requested provider has no key but the other one does, use that instead. A
// half-applied config — AI_PROVIDER switched but the key not yet added — would
// otherwise turn the AI off completely rather than falling back to what still works.
function resolveProvider(name) {
  if (PROVIDERS[name] && process.env[PROVIDERS[name].keyEnv]) return name;
  for (const [candidate, config] of Object.entries(PROVIDERS)) {
    if (process.env[config.keyEnv]) return candidate;
  }
  return PROVIDERS[name] ? name : 'openrouter';
}

const AI_PROVIDER = resolveProvider(REQUESTED_PROVIDER);
const PROVIDER = PROVIDERS[AI_PROVIDER];
const AI_API_KEY = process.env[PROVIDER.keyEnv];
const AI_BASE_URL = process.env.AI_BASE_URL || PROVIDER.baseUrl;

function modelsFor(providerName) {
  // An explicit AI_MODELS list only describes the primary provider's models; the
  // other provider's slugs are named completely differently.
  if (providerName === AI_PROVIDER) {
    const explicit = (process.env.AI_MODELS || process.env.OPENROUTER_MODELS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (explicit.length) return explicit;
  }

  const models = [];
  // On OpenRouter, honour the older single-model vars as a preference — they are
  // still set on hosts provisioned before the chain existed — but append the
  // defaults behind them, so a stale dashboard cannot silently shrink the chain
  // back to one slug and push the fallback rate up.
  if (providerName === 'openrouter') {
    if (process.env.OPENROUTER_MODEL) models.push(process.env.OPENROUTER_MODEL);
    if (process.env.OPENROUTER_FALLBACK_MODEL) models.push(process.env.OPENROUTER_FALLBACK_MODEL);
  }
  for (const model of PROVIDERS[providerName].defaultModels) {
    if (!models.includes(model)) models.push(model);
  }
  return models;
}

// The chain crosses providers: the primary's models first, then any other provider
// that has a key. So a DeepSeek balance running dry at 2am falls through to
// OpenRouter's free models rather than dropping every visitor to scripted lines.
const AI_CHAIN = [];
for (const name of [AI_PROVIDER, ...Object.keys(PROVIDERS).filter(n => n !== AI_PROVIDER)]) {
  if (!process.env[PROVIDERS[name].keyEnv]) continue;
  for (const model of modelsFor(name)) AI_CHAIN.push({ provider: name, model });
}

const AI_MODELS = AI_CHAIN.map(entry => `${entry.provider}:${entry.model}`);
const AI_MODEL = AI_CHAIN.length ? AI_CHAIN[0].model : null;
// A turn must not hang while the chain works through busy providers.
const AI_TOTAL_BUDGET_MS = Number(process.env.AI_TOTAL_BUDGET_MS || 25000);
const AI_PER_CALL_TIMEOUT_MS = 15000;
const AI_ENABLED = Boolean(AI_API_KEY) && AI_MODE !== 'off';

// Reasoning models spend part of the budget on hidden reasoning tokens and return
// empty content if it runs out, so this stays well above the visible line length.
const AI_MAX_TOKENS = 400;

function callChatCompletion(messages, maxTokens, model, providerName) {
  const name = providerName || AI_PROVIDER;
  const provider = PROVIDERS[name];
  const headers = {
    'Authorization': `Bearer ${process.env[provider.keyEnv]}`,
    'Content-Type': 'application/json'
  };

  // OpenRouter attributes usage by these; DeepSeek ignores them, but there is no
  // reason to send them where they mean nothing.
  if (name === 'openrouter') {
    headers['HTTP-Referer'] = process.env.HTTP_REFERER || 'http://localhost:3000';
    headers['X-Title'] = 'Customer Service Trainer';
  }

  const baseUrl = name === AI_PROVIDER ? AI_BASE_URL : provider.baseUrl;

  return axios.post(
    `${baseUrl}/chat/completions`,
    {
      model: model || AI_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    },
    {
      headers,
      timeout: AI_PER_CALL_TIMEOUT_MS,
      validateStatus: status => status < 500
    }
  );
}

// Rewrites the scripted customer line in character. The scripted engine still owns
// the options, the step transitions and the scoring — only the wording changes, so
// a failed or rate-limited AI call degrades to the original text with no visible
// break in the flow.
// The scripted dialogue masks its profanity (f*ck, Dumbsh*t) and the rewrite has to
// match, because this page is embedded publicly. The system prompt asks for it; this
// enforces it, since a prompt is a request and not a guarantee.
// Matched anywhere in a word, so compounds like "dumbshit" and "motherfucker" are
// caught too, not just standalone use.
// "damn" is here rather than below so "goddamn" is caught as well.
const PROFANITY_CORE = /(fuck|shit|cunt|bitch|bastard|asshole|damn)/gi;
// Milder words, only masked when they stand alone — otherwise "Dickens" and
// "scrap" would get mangled.
const PROFANITY_STANDALONE = /\b(crap|dick|prick)(ing|ed|s)?\b/gi;

function maskProfanity(text) {
  return text
    .replace(PROFANITY_CORE, match => match[0] + '*' + match.slice(2))
    .replace(PROFANITY_STANDALONE, match => match[0] + '*' + match.slice(2));
}

// Per provider, set when it reports an account-wide quota is spent. Until it passes,
// that provider is skipped entirely — but the chain still tries the other one, which
// is the point of keeping both keys configured.
const aiCooldownUntil = new Map();

// Distinguishes "this account is out of free requests for today", which is fatal for
// every :free model at once, from an ordinary per-model 429 worth retrying elsewhere.
function readDailyQuotaReset(body) {
  const error = body && body.error;
  if (!error) return 0;

  const isDaily = error.metadata && error.metadata.limit_source === 'openrouter_free_tier_daily';
  const mentionsDaily = typeof error.message === 'string' && error.message.includes('free-models-per-day');
  if (!isDaily && !mentionsDaily) return 0;

  const reset = Number(
    error.metadata && error.metadata.headers && error.metadata.headers['X-RateLimit-Reset']
  );
  // Fall back to an hour if the reset timestamp is missing or nonsensical, so a
  // malformed response cannot disable the AI indefinitely.
  if (!Number.isFinite(reset) || reset <= Date.now()) return Date.now() + 60 * 60 * 1000;
  return reset;
}

async function rephraseInCharacter(session, scriptedLine) {
  if (!scriptedLine) return { text: scriptedLine, used: false };

  const messages = [
    {
      role: 'system',
      content: `${scenarios[session.scenario].prompt}

You are rewriting one line of the customer's dialogue. Keep the exact same meaning,
intent and any order IDs, amounts or facts. Keep it under 40 words. Stay in character
and match the customer's emotional state. Reply with the rewritten line only — no
quotes, no preamble, no explanation.

The customer may be rude, but this runs on a public training page. Never write out a
swear word in full: mask it the way the script does, as f*ck or sh*t. Never use slurs
or sexual content, and never threaten violence.`
    },
    ...session.history.filter(m => m.role).slice(-6),
    { role: 'user', content: `Rewrite this line: ${scriptedLine}` }
  ];

  const deadline = Date.now() + AI_TOTAL_BUDGET_MS;

  for (const { provider, model } of AI_CHAIN) {
    if (Date.now() >= deadline) break;
    // This provider is out of quota; skip straight to the next one's models.
    if (Date.now() < (aiCooldownUntil.get(provider) || 0)) continue;

    let text = '';
    try {
      const response = await callChatCompletion(messages, AI_MAX_TOKENS, model, provider);

      // An account-wide quota is spent across every model that provider offers, so
      // trying its remaining slugs cannot help — and on OpenRouter each attempt
      // spends another request from the very pool that is exhausted. Park this
      // provider until its reset and carry on with the other one.
      if (response.status === 429) {
        const reset = readDailyQuotaReset(response.data);
        if (reset) aiCooldownUntil.set(provider, reset);
        continue;
      }

      // A bad or unfunded key fails identically on every model, so stop asking.
      if (response.status === 401 || response.status === 402 || response.status === 403) {
        aiCooldownUntil.set(provider, Date.now() + 10 * 60 * 1000);
        continue;
      }

      if (response.status === 200 && response.data.choices && response.data.choices[0]) {
        text = String(response.data.choices[0].message.content || '').trim();
      }
    } catch (error) {
      continue;
    }

    // Reject an empty rewrite, one long enough that the model has started explaining
    // itself instead of staying in character, and one containing a blank line —
    // which is how the reasoning-leaking models present their working.
    if (!text || text.length > scriptedLine.length * 3 + 80 || text.includes('\n\n')) continue;

    return { text: maskProfanity(text.replace(/^["']|["']$/g, '')), used: true };
  }

  // Every slug unusable this turn. The scripted line still carries the session, and
  // the UI reports the degradation via aiActive.
  return { text: scriptedLine, used: false };
}

// --- Hybrid Chat Endpoint ---
app.post('/api/chat', async (req, res) => {
  const { sessionId, message, optionId } = req.body;
  const session = sessions[sessionId];

  if (!session || session.state.terminated) {
    return res.status(400).json({ error: 'Invalid or terminated session' });
  }

  // Update state with user message
  updateSessionState(session, message);
  // Record user message in history for context
  session.history.push({ role: 'user', content: message });

  // Freeform mode: the AI answers directly and the scripted trainer does not run.
  // Kept for demos of the raw role-play; it produces no options, so the scoring
  // and evidence flow stay idle.
  if (AI_ENABLED && AI_MODE === 'freeform' && !session.forceFallback && consumeAiBudget(req)) {
    try {
      const response = await callChatCompletion([
        {
          role: 'system',
          content: `${scenarios[session.scenario].prompt}\nCurrent step: ${session.state.currentStep}`
        },
        ...session.history.filter(m => m.role).slice(-10)
      ], AI_MAX_TOKENS);

      if (response.status === 200 && response.data.choices && response.data.choices[0]) {
        const botResponse = response.data.choices[0].message.content;
        session.history.push({ role: 'assistant', content: botResponse });

        return res.json({
          botResponse,
          fallbackMode: false,
          state: session.state,
          apiUsed: 'openrouter'
        });
      }
      session.forceFallback = true;
    } catch (error) {
      session.forceFallback = true;
    }
  }

  // Scripted engine drives the session in every other mode.
  const scripted = processFallbackMessage(session, message, optionId);

  let botResponse = scripted.botResponse;
  let apiUsed = 'fallback';

  // Terminations and the scoring feedback are verbatim training copy — rewriting
  // those would change what the trainee is told they did wrong.
  const rewritable = AI_ENABLED
    && AI_MODE === 'rephrase'
    && !session.forceFallback
    && !session.state.terminated
    && Boolean(scripted.botResponse)
    && consumeAiBudget(req);

  if (rewritable) {
    const rephrased = await rephraseInCharacter(session, scripted.botResponse);
    botResponse = rephrased.text;
    if (rephrased.used) apiUsed = 'openrouter';
  }

  return res.json({
    botResponse,
    // fallbackMode stays true because the scripted engine always owns the options
    // and scoring. It says nothing about whether the AI ran — aiActive does, and
    // the two were being conflated in the UI.
    fallbackMode: true,
    aiActive: apiUsed === 'openrouter',
    options: scripted.options,
    showEvidence: scripted.showEvidence,
    evidenceType: scripted.evidenceType,
    state: session.state,
    waitingPeriod: scripted.waitingPeriod,
    apiUsed
  });
});

// --- State Management ---
function updateSessionState(session, message) {
  const state = session.state;
  const lowerMsg = typeof message === 'string' ? message.toLowerCase() : '';
  
  // Update last activity time
  state.lastUserActivity = Date.now();
  
  // Check greeting timing
  if (!state.greetingSent && state.currentStep === 'initial') {
    const timeSinceStart = Date.now() - session.startTime;
    if (timeSinceStart <= 15000) {
      state.points = Math.min(100, state.points + 10);
      state.greetingSent = true;
    }
  }
  
  // Check for empathy
  if (!state.empathyShown && (
    lowerMsg.includes('sorry') || 
    lowerMsg.includes('apologize') || 
    lowerMsg.includes('empathy') ||
    lowerMsg.includes('understand')
  )) {
    state.empathyShown = true;
  }
  
  // Check for probing
  if (lowerMsg.includes('order id') ||
      lowerMsg.includes('order number') ||
      lowerMsg.includes('order#')) {
    state.probing.orderId = true;
  }

  // Check the trainee thanked the customer and closed the chat properly. Without
  // these the scoring deducted 10 points from every session, including a perfect run.
  if (lowerMsg.includes('thank you') || lowerMsg.includes('thanks')) {
    state.thanked = true;
  }

  if (lowerMsg.includes('have a good day') ||
      lowerMsg.includes('end this chat') ||
      lowerMsg.includes('anything else')) {
    state.closed = true;
  }

  // Scenario-specific rules
  if (session.scenario === 'sarah') {
    if (lowerMsg.includes('barcode')) state.probing.barcode = true;
    if (lowerMsg.includes('packaging slip')) state.probing.packagingSlip = true;
    if (lowerMsg.includes('shipping label') || lowerMsg.includes('outer box')) {
      state.probing.shippingLabel = true;
    }
  } else {
    if (lowerMsg.includes('video') && lowerMsg.includes('defect')) {
      state.probing.video = true;
    }
  }
}

/*
 * --- Fallback Logic (v3 accurate) ---
 */
function processFallbackMessage(session, message, optionId) {
  // Handle Re-hold option
  if (optionId === 'hold') {
    session.state.reholdCount = (session.state.reholdCount || 0) + 1;
    return {
      botResponse: "Timer extended. Take your time.",
      options: scenarios[session.scenario].steps[session.state.currentStep].options,
      showEvidence: false,
      evidenceType: null,
      waitingPeriod: null
    };
  }
  const scenario = scenarios[session.scenario];
  const currentStep = scenario.steps[session.state.currentStep];

  // Greeting scoring
  if (!session.state.greetingSent && session.state.currentStep === 'initial') {
    const timeSinceStart = Date.now() - session.startTime;
    if (timeSinceStart <= 15000) {
      session.state.points = Math.min(100, session.state.points + 10);
      session.state.greetingSent = true;
    }
  }

  // Locate selected option
  let selectedOption = null;
  if (optionId) {
    const parsedId = typeof optionId === 'string' ? Number(optionId) : optionId;
    selectedOption = currentStep.options.find(opt => opt.id === parsedId);
    if (!selectedOption) {
      return {
        botResponse: "Please select a valid response option.",
        options: currentStep.options
      };
    }
  }

  // Log interaction
  session.history.push({
    timestamp: Date.now(),
    userMessage: message,
    optionId,
    step: session.state.currentStep
  });

  let botResponse = '';
  let nextOptions = null;
  let showEvidence = false;
  let evidenceType = null;
  let waitingPeriod = null;
  let terminated = false;

  // Sarah special steps
  if (session.scenario === 'sarah' && (session.state.currentStep === 'voucher_confirmation' || session.state.currentStep === 'reconfirmation')) {
    const stepConfig = scenario.steps[session.state.currentStep];
    if (selectedOption && selectedOption.correct) {
      session.state.points = Math.min(100, session.state.points + 15);
      session.state.attemptCount = 0;
      botResponse = stepConfig.correctResponse;
      if (session.state.currentStep === 'reconfirmation') {
        session.state.missedReconfirm = false;
      }
      if (stepConfig.nextStep) {
        session.state.currentStep = stepConfig.nextStep;
        nextOptions = scenario.steps[session.state.currentStep].options;
      }
    } else if (selectedOption) {
      session.state.attemptCount = (session.state.attemptCount || 0) + 1;
      nextOptions = stepConfig.wrongOptions || stepConfig.options;
      botResponse = stepConfig.wrongResponse;
      if (session.state.currentStep === 'reconfirmation') {
        session.state.missedReconfirm = true;
      }
      if (stepConfig.terminateOnSecondWrong && session.state.attemptCount >= 2) {
        terminated = true;
        session.state.terminated = true;
        botResponse = stepConfig.terminationFeedback || "Customer is frustrated because of your unprofessional behavior. Please check KB and Best Practice to learn how to handle customer properly.";
        nextOptions = [];
      }
    }
  } else if (selectedOption && selectedOption.correct) {
    // Correct generic choice
    session.state.points = Math.min(100, session.state.points + 15);
    session.state.attemptCount = 0;
    botResponse = currentStep.correctResponse;

    if (currentStep.needsWait) {
      waitingPeriod = {
        duration: 120000,
        warningMessage: "Hello? Don't tell me you're ghosting me too!",
        terminationMessage: "This is what I expected. Typical!"
      };
      session.state.points = Math.min(100, session.state.points + 5);
    }

    if (currentStep.showEvidence) {
      showEvidence = true;
      evidenceType = session.scenario;
    }

    if (currentStep.nextStep && currentStep.nextStep !== 'completed') {
      session.state.currentStep = currentStep.nextStep;
      const nxt = scenario.steps[currentStep.nextStep];
      if (nxt) nextOptions = nxt.options;
    } else if (currentStep.nextStep === 'completed') {
      // Reaching the end of the script is a pass, not a failure. Both close the
      // session, but only a misconduct termination should be reported as one.
      session.state.terminated = true;
      session.state.completed = true;
      session.state.points = Math.min(100, session.state.points + 10);
      if (session.state.reholdCount > 3 && !session.state.reholdPenaltyApplied) {
        session.state.points = Math.max(0, session.state.points - 20);
        session.state.violations.push({ category: 'on_hold', reason: 'Used Re-hold more than 3 times (-20 points)' });
        session.state.reholdPenaltyApplied = true;
      }
    }
  } else if (selectedOption && !selectedOption.correct) {
    // Wrong choice
    session.state.attemptCount++;
    if (session.state.attemptCount >= 2) {
      terminated = true;
      session.state.terminated = true;
      botResponse = "Session terminated: Too many incorrect responses. Please review the training and try again.";
      nextOptions = [];
    } else {
      botResponse = currentStep.wrongResponse;
      nextOptions = currentStep.wrongOptions;
    }
  } else if (!optionId) {
    // Opening turn: the customer's first message is already on screen. Emitting
    // correctResponse here would hand over the order ID before it was asked for.
    nextOptions = currentStep.options;
    botResponse = null;
  }

  return {
    botResponse,
    options: nextOptions,
    showEvidence,
    evidenceType,
    waitingPeriod,
    terminated
  };
}

// --- Unified Scoring System ---
function calculateFinalScore(state) {
  // Rebuild the derived violations on every call so ending a session twice cannot
  // stack the same penalty. Violations recorded during play (escalation, re-hold)
  // are kept.
  state.violations = state.violations.filter(v => !v.derived);

  let percentage = Math.min(100, state.points);

  // Penalties already banked during the session (escalation decision, re-hold abuse).
  for (const violation of state.violations) {
    percentage = Math.max(0, percentage - (violation.points || 0));
  }

  const deductions = [
    state.missedReconfirm && { category: 'reconfirm', reason: 'Missed reconfirmation step', points: 10 },
    !state.empathyShown && { category: 'empathy', reason: 'Failed to show empathy', points: 10 },
    !state.probing.orderId && { category: 'probing', reason: 'Did not ask for order ID', points: 5 },
    !state.thanked && { category: 'solution', reason: 'Did not thank customer', points: 5 },
    !state.closed && { category: 'closing', reason: 'Did not properly close session', points: 5 }
  ].filter(Boolean);

  for (const deduction of deductions) {
    percentage = Math.max(0, percentage - deduction.points);
    state.violations.push({ ...deduction, derived: true });
  }

  // Calculate star rating
  let stars;
  if (percentage >= 90) stars = 5;
  else if (percentage >= 75) stars = 4;
  else if (percentage >= 60) stars = 3;
  else if (percentage >= 45) stars = 2;
  else stars = 1;
  
  return {
    stars,
    percentage,
    violations: state.violations,
    terminated: state.terminated && !state.completed
  };
}

// --- Escalation decision ---
// Recorded when the trainee closes the chat, before the session is scored.
// Sarah's case is fully resolved at agent level, so escalating it is the error.
// Michael explicitly demands a manager, so failing to escalate is the error.
app.post('/api/escalation', (req, res) => {
  const { sessionId, escalate, phone, email, team } = req.body;
  const session = sessions[sessionId];

  if (!session) {
    return res.status(400).json({ error: 'Session not found' });
  }

  const shouldEscalate = session.scenario === 'michael';
  const decisionCorrect = Boolean(escalate) === shouldEscalate;

  const handover = { phone: phone || '', email: email || '', team: team || '' };
  const handoverComplete = Boolean(handover.phone && handover.email && handover.team);

  let feedback;
  if (!decisionCorrect) {
    feedback = shouldEscalate
      ? 'The customer asked to speak with a manager. That request must be escalated, not closed at agent level.'
      : 'This case was resolved within your authority. Escalating it adds queue time without helping the customer.';
    session.state.violations.push({
      category: 'escalation',
      reason: shouldEscalate
        ? 'Did not escalate after the customer requested a manager'
        : 'Escalated a case that was already resolved at agent level',
      points: 15
    });
  } else if (shouldEscalate && !handoverComplete) {
    feedback = 'Correct call, but the handover was incomplete. A manager needs the phone number, email and routing team to pick this up.';
    session.state.violations.push({
      category: 'escalation',
      reason: 'Escalated without complete handover details (phone, email, team)',
      points: 5
    });
  } else {
    feedback = shouldEscalate
      ? 'Correct. The manager request was escalated with a complete handover.'
      : 'Correct. The case was resolved at your level, so no escalation was needed.';
  }

  session.state.escalation = {
    escalate: Boolean(escalate),
    correct: decisionCorrect,
    handover,
    handoverComplete
  };
  session.state.escalationHandled = true;

  res.json({ correct: decisionCorrect, feedback });
});

app.get('/healthz', (req, res) => {
  res.json({
    ok: true,
    aiEnabled: AI_ENABLED,
    aiMode: AI_MODE,
    aiProvider: AI_PROVIDER,
    aiModels: AI_MODELS,
    // Exposed because an exhausted budget and a dead API key look identical from
    // the outside: both just show scripted replies.
    aiBudget: {
      limitPerHour: AI_RATE_LIMIT_PER_HOUR,
      usedByYou: (aiUsage.get(req.ip) || {}).count || 0,
      trackedClients: aiUsage.size
    },
    clientIp: req.ip,
    // Non-zero means OpenRouter's account-wide daily free-model quota is spent and
    // no AI call will be attempted until this time.
    aiQuotaExhaustedUntil: Object.fromEntries(
      [...aiCooldownUntil].map(([provider, until]) => [provider, new Date(until).toISOString()])
    ),
    activeSessions: Object.keys(sessions).length
  });
});

// --- Endpoints ---
app.post('/api/session/end', (req, res) => {
  const { sessionId } = req.body;
  const session = sessions[sessionId];
  if (!session) {
    return res.status(400).json({ error: 'Session not found' });
  }
  session.state.terminated = true;
  const score = calculateFinalScore(session.state);
  res.json({ score });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access your bot at: http://localhost:${PORT}`);
});