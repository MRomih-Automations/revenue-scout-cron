const fs = require('fs');
const path = require('path');

// 1. Load local .env if available
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim();
    }
  }
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1048991933';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function fetchTelemetry() {
  const tPath = path.join(__dirname, 'telemetry.json');
  if (fs.existsSync(tPath)) {
    try {
      return JSON.parse(fs.readFileSync(tPath, 'utf8'));
    } catch (e) {
      return { status: 'UNKNOWN' };
    }
  }
  return { status: 'NEW' };
}

async function fetchN8nJobs() {
  try {
    const res = await fetch('https://community.n8n.io/c/jobs/13.json', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MRomih-CEO-Brain/1.0' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const topics = data?.topic_list?.topics || [];
    return topics.slice(0, 15).map(t => ({
      id: t.id,
      title: t.title,
      created_at: t.created_at,
      views: t.views,
      posts_count: t.posts_count,
      url: `https://community.n8n.io/t/${t.slug}/${t.id}`
    }));
  } catch (err) {
    console.error('Failed to fetch n8n community jobs:', err.message);
    return [];
  }
}

async function fetchOpireRewards() {
  try {
    const res = await fetch('https://api.opire.dev/rewards', {
      headers: { 'User-Agent': 'Mozilla/5.0 MRomih-CEO-Brain/1.0' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.slice(0, 10).map(r => ({
      amount: r.amount || r.reward || 'USD bounty',
      issue_url: r.issue_url || r.url || 'Opire reward'
    }));
  } catch (err) {
    console.error('Failed to fetch Opire rewards:', err.message);
    return [];
  }
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const models = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-flash-latest'];
  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (res.status === 200) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        console.warn(`Model ${m} returned ${res.status}`);
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (e) {
      console.warn(`Model ${m} call failed: ${e.message}`);
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  throw new Error('All Gemini API models failed or were unavailable.');
}

async function sendTelegramAlert(htmlText) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN not found, skipping Telegram dispatch.');
    return;
  }

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: htmlText,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });

  const data = await res.json();
  if (data.ok) {
    console.log(`✅ [CEO Brain] Telegram growth alert delivered successfully! (Message ID: ${data.result.message_id})`);
  } else {
    console.error(`❌ [CEO Brain] Telegram error:`, data);
  }
}

async function run() {
  console.log('🧠 [CEO Brain] Initializing 24/7 autonomous strategic growth cycle...');

  const telemetry = await fetchTelemetry();
  const n8nJobs = await fetchN8nJobs();
  const opireBounties = await fetchOpireRewards();

  const storefronts = {
    fiverr_gigs: [
      '1. Fix or Debug Broken n8n & Make Workflows ($35 / $75 / $140)',
      '2. Build Custom MCP Server Integration for Claude Desktop or Cursor ($45 / $95 / $180)',
      '3. Automated B2B Lead Gen & CRM Enrichment ($45 / $95 / $190)',
      '4. Custom Telegram AI Bot & Webhook Automation ($45 / $95 / $190)',
      '5. Resilient Python Web Scraping & Data Pipelines ($40 / $250 / $350)'
    ],
    contra_portfolio: [
      'Enterprise Autonomous n8n AI Lead Triage & CRM Engine',
      'Resilient Python Web Scraping & Clean Data Pipelines'
    ],
    lead_magnet_repo: 'https://github.com/MRomih-Automations/n8n-ai-lead-triage-kit'
  };

  const prompt = `
You are the Autonomous Chief Operating Officer & Chief Growth Strategist for MRomih Automations (Founder: Mohamed Romih).
Our mission: Accelerate client acquisition and cash-flow generation at $0 upfront budget.

Current Storefronts & Assets:
- Active Fiverr Gigs:
${storefronts.fiverr_gigs.map(g => '  * ' + g).join('\n')}
- Contra Portfolio:
${storefronts.contra_portfolio.map(p => '  * ' + p).join('\n')}
- Public GitHub Lead Magnet: ${storefronts.lead_magnet_repo}

Latest Market Intelligence:
- Scout Telemetry: ${JSON.stringify(telemetry)}
- Recent n8n Community Job Topics (${n8nJobs.length} active):
${n8nJobs.slice(0, 5).map(j => `  * "${j.title}" (${j.views} views, URL: ${j.url})`).join('\n') || '  * None'}
- Verified Opire Bounties (${opireBounties.length} active):
${opireBounties.slice(0, 3).map(b => `  * ${b.amount} - ${b.issue_url}`).join('\n') || '  * None'}

Task:
Synthesize this intelligence into a high-impact, razor-sharp 48-Hour Growth Directive for Mohamed.
Respond strictly in JSON format (do not include markdown other than the JSON code fence):
{
  "diagnosis": "2-3 concise sentences diagnosing the current demand signal, where immediate client dollars are clustering (e.g. n8n webhook fixes, AI triage, or scraper pipelines), and our current conversion leverage.",
  "top_push": "The single highest-leverage client acquisition initiative for the next 48 hours. Be extremely specific (e.g. target exact n8n job topic, outreach to a specific agency profile, or pitch our $35 n8n debug gig to buyers needing urgent fixes).",
  "execution_prompt": "A complete, self-contained prompt block that Mohamed can copy-paste directly into Antigravity or Gemini to execute this push immediately without thinking. Include all instructions, tone, and deliverables."
}
`;

  let parsedAnalysis = null;
  try {
    const rawResponse = await callGemini(prompt);
    try {
      const cleanJson = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedAnalysis = JSON.parse(cleanJson);
    } catch (parseErr) {
      // Regex extraction fallback for unescaped newlines in JSON strings
      const diagMatch = rawResponse.match(/"diagnosis"\s*:\s*"([\s\S]*?)(?=",\s*"top_push")/i);
      const pushMatch = rawResponse.match(/"top_push"\s*:\s*"([\s\S]*?)(?=",\s*"execution_prompt")/i);
      const promptMatch = rawResponse.match(/"execution_prompt"\s*:\s*"([\s\S]*?)(?="\s*\}|$)/i);
      if (diagMatch && pushMatch) {
        parsedAnalysis = {
          diagnosis: diagMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim(),
          top_push: pushMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim(),
          execution_prompt: (promptMatch ? promptMatch[1] : '').replace(/\\n/g, '\n').replace(/\\"/g, '"').trim()
        };
      } else {
        throw parseErr;
      }
    }
  } catch (err) {
    console.warn('[CEO Brain] AI generation fallback:', err.message);
    parsedAnalysis = {
      diagnosis: `Community demand is active across ${n8nJobs.length} live n8n workflow topics and ${opireBounties.length} bounties. Our 4 Fiverr storefronts and open-source lead magnet give us immediate $0-cost conversion channels.`,
      top_push: `Directly pitch the highest-viewed n8n community workflow request with a working workflow blueprint snippet linking to our Fiverr $35 debug gig and Contra portfolio.`,
      execution_prompt: `Review the top n8n community job: "${n8nJobs[0]?.title || 'n8n integration'}" at ${n8nJobs[0]?.url || 'https://community.n8n.io/c/jobs/13'}. Draft an authoritative, technical response demonstrating how our pre-built n8n node patterns solve their exact bottleneck within 24 hours.`
    };
  }

  // Format Telegram HTML message
  const telegramMessage = 
    `<b>🟢 [CEO BRAIN — GROWTH PUSH]</b>\n` +
    `<b>48-Hour Autonomous Executive Directive</b>\n\n` +
    `📊 <b>Situation Diagnosis:</b>\n` +
    `${escapeHtml(parsedAnalysis.diagnosis)}\n\n` +
    `🎯 <b>#1 Client-Acquisition Push:</b>\n` +
    `${escapeHtml(parsedAnalysis.top_push)}\n\n` +
    `⚡ <b>Ready-to-Use Execution Prompt:</b>\n` +
    `<pre>${escapeHtml(parsedAnalysis.execution_prompt)}</pre>\n\n` +
    `🏛️ <i>MRomih Automations Autonomous Executive Board</i>`;

  await sendTelegramAlert(telegramMessage);

  // Update telemetry.json
  const updatedTelemetry = {
    ...telemetry,
    last_ceo_brain_timestamp: new Date().toISOString(),
    last_push_title: parsedAnalysis.top_push.substring(0, 100),
    n8n_topics_scanned: n8nJobs.length,
    opire_rewards_scanned: opireBounties.length
  };
  fs.writeFileSync(path.join(__dirname, 'telemetry.json'), JSON.stringify(updatedTelemetry, null, 2), 'utf8');
  console.log('✅ [CEO Brain] Telemetry updated.');
}

run().catch(err => {
  console.error('Fatal error in CEO Brain:', err);
  process.exit(1);
});
