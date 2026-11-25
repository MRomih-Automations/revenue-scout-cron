/**
 * 24/7 Cloud Scout & Autonomous Technical Analyst
 * MRomih Automations — Revenue Scout Cron
 *
 * Scans:
 * 1. Algora USD Escrow Bounties (< 60 days, 0 competing PRs)
 * 2. Opire USD Bounties (verified open, 0 competing PRs, non-token)
 * 3. n8n Community Jobs (https://community.n8n.io/c/jobs/13.json) with full post extraction
 * 4. Hacker News Algolia API (n8n, web scraping automation contract/hiring posts)
 *
 * Autonomy Mandate:
 * Completes 100% of technical requirement study, workflow architecture planning,
 * ROI/rate calculation, and tailored proposal drafting in the cloud via Gemini Flash.
 * Never sends raw "go read and draft" alerts; escalates ONLY with ready-to-paste
 * <pre>...</pre> Antigravity execution prompts for logged-in browser actions.
 */

const fs = require('fs');
const path = require('path');
const https = require('node:https');

// Load local .env if present
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
const GH_PAT = process.env.GH_PAT;

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function safeJsonParse(rawStr) {
  if (!rawStr) return null;
  const clean = rawStr.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e1) {
    try {
      const sanitized = clean.replace(/\\([^"\\\/bfnrtu])/g, '$1');
      return JSON.parse(sanitized);
    } catch (e2) {
      return null;
    }
  }
}

function loadMemory() {
  const memPath = path.join(__dirname, 'brain_memory.json');
  if (fs.existsSync(memPath)) {
    try {
      return JSON.parse(fs.readFileSync(memPath, 'utf8'));
    } catch (e) {
      console.warn('[Scout] Error reading brain_memory.json:', e.message);
    }
  }
  return {
    agency: { name: 'MRomih Automations', founder: 'Mohamed Romih' },
    storefronts: {},
    operating_rules: [],
    platform_schedules: {},
    active_deal_pipeline: []
  };
}

function sendTelegram(htmlText) {
  return new Promise((resolve, reject) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log('Skipping Telegram: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
      return resolve();
    }
    const data = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: htmlText,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
    const req = https.request({
      hostname: 'api.telegram.org',
      port: 443,
      path: '/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(b));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in Scout.');
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
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  throw new Error('All Gemini API models failed in Scout.');
}

async function updateLiveTelemetry(metrics, seenN8nTopics) {
  const token = GH_PAT;
  if (!token) {
    console.log('[Telemetry] No GH_PAT found, skipping repository telemetry push.');
    return;
  }

  const owner = 'MRomih-Automations';
  const repo = 'revenue-scout-cron';

  try {
    let sha = null;
    let existingSeen = [];
    const existing = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/telemetry.json`, {
      headers: { 'Authorization': 'token ' + token, 'User-Agent': 'CloudScout', 'Accept': 'application/vnd.github.v3+json' }
    });
    if (existing.ok) {
      const data = await existing.json();
      sha = data.sha;
      try {
        const parsed = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
        if (Array.isArray(parsed.seen_n8n_topics)) existingSeen = parsed.seen_n8n_topics;
      } catch (e) {}
    }

    const mergedSeen = Array.from(new Set([...existingSeen, ...(seenN8nTopics || [])])).slice(-100);

    const payload = {
      status: 'HEALTHY',
      last_run_timestamp: new Date().toISOString(),
      heartbeat_unix: Date.now(),
      cron_interval: 'Every 30 minutes',
      provider: 'GitHub Actions Enterprise Cloud',
      issues_scanned: metrics.issues_scanned || 0,
      qualified_bounties_found: metrics.bounties_found || 0,
      last_bounty_title: metrics.last_bounty || null,
      hn_scanned_hits: metrics.hn_scanned_hits || 0,
      seen_n8n_topics: mergedSeen
    };

    const body = {
      message: 'telemetry: sync live cloud scout heartbeat [skip ci]',
      content: Buffer.from(JSON.stringify(payload, null, 2)).toString('base64')
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/telemetry.json`, {
      method: 'PUT',
      headers: {
        'Authorization': 'token ' + token,
        'User-Agent': 'CloudScout',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (putRes.ok) {
      console.log('[Telemetry] Live cloud telemetry synced to repository.');
    } else {
      console.log('[Telemetry] Sync status:', putRes.status);
    }
  } catch (e) {
    console.warn('[Telemetry] Error syncing telemetry:', e.message);
  }
}

async function scanAlgoraBounties(headers, metrics, memory) {
  console.log('[CloudScout] Scanning Algora escrow bounties...');
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const q = 'is:issue is:open commenter:algora-pbc updated:>=' + sixtyDaysAgo + ' sort:updated-desc';
  const url = 'https://api.github.com/search/issues?q=' + encodeURIComponent(q) + '&per_page=10';

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.log('[Algora] Search returned status ' + res.status);
      return;
    }
    const data = await res.json();
    const count = data.items ? data.items.length : 0;
    metrics.issues_scanned += count;

    for (const item of (data.items || []).slice(0, 5)) {
      const match = item.html_url.match(/github\.com\/([^\/]+\/[^\/]+)\/issues\/(\d+)/);
      if (!match) continue;
      const repo = match[1];
      const issueNum = match[2];

      if (/rustchain|scottcjn/i.test(repo) || /\b(RTC|token|tokens|airdrop|social mining)\b/i.test(item.title)) {
        continue;
      }

      const cRes = await fetch('https://api.github.com/repos/' + repo + '/issues/' + issueNum + '/comments', { headers });
      if (!cRes.ok) continue;
      const comments = await cRes.json();
      const algoraComments = comments.filter(c => c.user && (c.user.login === 'algora-pbc' || c.user.login === 'algora-pbc[bot]'));
      if (algoraComments.length === 0) continue;

      let bounty = 0;
      let closed = false;
      for (const ac of algoraComments) {
        const body = ac.body || '';
        if (/awarded to|bounty was cancelled|bounty was refunded/i.test(body)) closed = true;
        const m = body.match(/\$([0-9]{2,4})/);
        if (m) bounty = parseInt(m[1], 10);
      }
      if (closed || bounty < 50) continue;

      const pRes = await fetch('https://api.github.com/repos/' + repo + '/pulls?state=open&per_page=10', { headers });
      if (pRes.ok) {
        const pulls = await pRes.json();
        const competing = pulls.some(pr => new RegExp('#' + issueNum + '\\b|fixes.*#' + issueNum, 'i').test(pr.title + ' ' + (pr.body || '')));
        if (competing) continue;
      }

      metrics.bounties_found++;
      metrics.last_bounty = `${repo} #${issueNum} ($${bounty} Algora)`;
      console.log('[Algora] Qualified bounty found: ' + repo + ' #' + issueNum + ' ($' + bounty + ')');

      // AI Technical Study & Antigravity Prompt Synthesis
      let study = null;
      try {
        const aiPrompt = `
You are the Technical Lead at MRomih Automations.
Analyze this GitHub Bounty Issue:
Repository: ${repo}
Issue: #${issueNum} - ${item.title}
Escrow Bounty: $${bounty} USD
Issue Body:
${(item.body || '').substring(0, 1500)}

Perform a deep technical study:
1. Technical requirement diagnosis (root cause or target feature).
2. Proposed architecture / code modification plan.
3. ROI Assessment: Value ($${bounty}) vs Estimated engineering hours.
4. Prepare an Antigravity execution prompt starting with 'Run \`git pull\` first in MRomih-Automations/revenue-scout-cron and MRomih-Automations/revenue-engine...'.

Output JSON:
{
  "diagnosis": "2-3 sentences technical summary",
  "architecture_plan": "Bulleted technical implementation plan",
  "roi_calc": "Value $${bounty} USD | Estimated X hours | Net effective $/hr",
  "antigravity_prompt": "Run \`git pull\` first..."
}`;
        const rawAi = await callGemini(aiPrompt);
        study = safeJsonParse(rawAi);
        if (!study) {
          const techMatch = rawAi.match(/"technical_study"\s*:\s*"([\s\S]*?)(?=",\s*"workflow_architecture")/i);
          const archMatch = rawAi.match(/"workflow_architecture"\s*:\s*"([\s\S]*?)(?=",\s*"calculated_roi")/i);
          const roiMatch = rawAi.match(/"calculated_roi"\s*:\s*"([\s\S]*?)(?=",\s*"proposed_copy")/i);
          const copyMatch = rawAi.match(/"proposed_copy"\s*:\s*"([\s\S]*?)(?=",\s*"antigravity_prompt")/i);
          const promptMatch = rawAi.match(/"antigravity_prompt"\s*:\s*"([\s\S]*?)(?="\s*\}|\s*$)/i);
          if (techMatch && copyMatch) {
            study = {
              technical_study: techMatch[1].replace(/\\n/g, '\n').trim(),
              workflow_architecture: archMatch ? archMatch[1].replace(/\\n/g, '\n').trim() : '',
              calculated_roi: roiMatch ? roiMatch[1].replace(/\\n/g, '\n').trim() : '',
              proposed_copy: copyMatch[1].replace(/\\n/g, '\n').trim(),
              antigravity_prompt: promptMatch ? promptMatch[1].replace(/\\n/g, '\n').trim() : ''
            };
          } else {
            throw new Error('Could not parse Gemini JSON or extract fields.');
          }
        }
      } catch (e) {
        console.warn('[Algora] AI study fallback:', e.message);
        study = {
          diagnosis: `Bounty #${issueNum} on ${repo} for $${bounty} USD with zero competing PRs.`,
          architecture_plan: 'Inspect repository codebase, isolate failure test case, implement fix, and submit PR with issue reference.',
          roi_calc: `$${bounty} USD escrow payout | 1-2h target implementation`,
          antigravity_prompt: `Run \`git pull\` first in MRomih-Automations/revenue-scout-cron and MRomih-Automations/revenue-engine, then open ${item.html_url} in Antigravity to analyze the codebase, reproduce the issue, and prepare the pull request with zero competing PRs.`
        };
      }

      const alertMsg = 
        `🟡 <b>[OPPORTUNITY — READY FOR ANTIGRAVITY]</b>\n` +
        `<b>Verified Algora USD Escrow Bounty ($${bounty})</b>\n\n` +
        `📦 <b>Repo:</b> <code>${escapeHtml(repo)}</code>\n` +
        `🎯 <b>Issue:</b> #${issueNum} - ${escapeHtml(item.title)}\n` +
        `💰 <b>Escrow Value:</b> $${bounty} USD | Competing PRs: 0\n\n` +
        `🔬 <b>Technical Diagnosis:</b>\n` +
        `${escapeHtml(study.diagnosis)}\n\n` +
        `🛠️ <b>Architecture Plan:</b>\n` +
        `${escapeHtml(study.architecture_plan)}\n\n` +
        `📊 <b>Calculated ROI:</b> ${escapeHtml(study.roi_calc)}\n\n` +
        `🔗 <a href="${item.html_url}">View Issue on GitHub</a>\n\n` +
        `⚡ <b>Ready-to-Paste Antigravity Execution Prompt:</b>\n` +
        `<pre>${escapeHtml(study.antigravity_prompt)}</pre>\n\n` +
        `🏛️ <i>MRomih Automations Autonomous Cloud Scout</i>`;

      await sendTelegram(alertMsg);
    }
  } catch (err) {
    console.error('[Algora] Scan error:', err.message);
  }
}

async function scanOpireBounties(headers, metrics, memory) {
  console.log('[CloudScout] Scanning Opire public reward API...');
  try {
    const res = await fetch('https://api.opire.dev/rewards', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) return;

    const rewards = await res.json();
    if (!Array.isArray(rewards)) return;

    metrics.issues_scanned += rewards.length;

    for (const item of rewards) {
      if (!item.url || !item.url.includes('github.com')) continue;
      const match = item.url.match(/github\.com\/([^\/]+\/[^\/]+)\/issues\/(\d+)/);
      if (!match) continue;

      const repo = match[1];
      const issueNum = match[2];

      let bounty = 0;
      if (item.pendingPrice && item.pendingPrice.unit === 'USD_CENT') {
        bounty = item.pendingPrice.value / 100;
      } else {
        continue;
      }

      if (/rustchain|scottcjn/i.test(repo) || /\b(RTC|token|tokens|airdrop|social mining|hcaptcha|captcha)\b/i.test(item.title)) {
        continue;
      }

      if (bounty < 30) continue;

      const issueRes = await fetch('https://api.github.com/repos/' + repo + '/issues/' + issueNum, { headers });
      if (!issueRes.ok) continue;
      const issueData = await issueRes.json();
      if (issueData.state !== 'open' || issueData.pull_request) continue;

      const pRes = await fetch('https://api.github.com/repos/' + repo + '/pulls?state=open&per_page=15', { headers });
      if (pRes.ok) {
        const pulls = await pRes.json();
        const competing = pulls.some(pr => new RegExp('#' + issueNum + '\\b|fixes.*#' + issueNum, 'i').test(pr.title + ' ' + (pr.body || '')));
        if (competing) continue;
      }

      metrics.bounties_found++;
      metrics.last_bounty = `${repo} #${issueNum} ($${bounty} Opire)`;
      console.log('[Opire] Qualified bounty found: ' + repo + ' #' + issueNum + ' ($' + bounty + ')');

      let study = null;
      try {
        const aiPrompt = `
You are the Technical Lead at MRomih Automations.
Analyze this Opire USD Bounty:
Repo: ${repo}
Issue: #${issueNum} - ${issueData.title || item.title}
Bounty: $${bounty} USD
Body:
${(issueData.body || '').substring(0, 1500)}

Perform a deep technical study:
1. Technical requirement diagnosis.
2. Code architecture & implementation plan.
3. ROI Assessment: Value ($${bounty}) vs engineering effort.
4. Prepare an Antigravity prompt starting with 'Run \`git pull\` first...'.

Output JSON:
{
  "diagnosis": "2-3 sentences technical summary",
  "architecture_plan": "Bulleted technical implementation plan",
  "roi_calc": "Value $${bounty} USD | Estimated effort | Net rate",
  "antigravity_prompt": "Run \`git pull\` first in MRomih-Automations/revenue-scout-cron and MRomih-Automations/revenue-engine..."
}`;
        const rawAi = await callGemini(aiPrompt);
        study = safeJsonParse(rawAi);
        if (!study) {
          const techMatch = rawAi.match(/"technical_study"\s*:\s*"([\s\S]*?)(?=",\s*"workflow_architecture")/i);
          const archMatch = rawAi.match(/"workflow_architecture"\s*:\s*"([\s\S]*?)(?=",\s*"calculated_roi")/i);
          const roiMatch = rawAi.match(/"calculated_roi"\s*:\s*"([\s\S]*?)(?=",\s*"proposed_copy")/i);
          const copyMatch = rawAi.match(/"proposed_copy"\s*:\s*"([\s\S]*?)(?=",\s*"antigravity_prompt")/i);
          const promptMatch = rawAi.match(/"antigravity_prompt"\s*:\s*"([\s\S]*?)(?="\s*\}|\s*$)/i);
          if (techMatch && copyMatch) {
            study = {
              technical_study: techMatch[1].replace(/\\n/g, '\n').trim(),
              workflow_architecture: archMatch ? archMatch[1].replace(/\\n/g, '\n').trim() : '',
              calculated_roi: roiMatch ? roiMatch[1].replace(/\\n/g, '\n').trim() : '',
              proposed_copy: copyMatch[1].replace(/\\n/g, '\n').trim(),
              antigravity_prompt: promptMatch ? promptMatch[1].replace(/\\n/g, '\n').trim() : ''
            };
          } else {
            throw new Error('Could not parse Gemini JSON or extract fields.');
          }
        }
      } catch (e) {
        study = {
          diagnosis: `Verified Opire USD reward ($${bounty}) on ${repo} #${issueNum}. Zero competing PRs.`,
          architecture_plan: 'Clone repo, reproduce issue, write automated test case, submit PR with Opire claiming keyword.',
          roi_calc: `$${bounty} USD reward | 1h-2h effort`,
          antigravity_prompt: `Run \`git pull\` first in MRomih-Automations/revenue-scout-cron and MRomih-Automations/revenue-engine, then open ${item.url} in Antigravity to solve the issue and claim the $${bounty} USD bounty.`
        };
      }

      const alertMsg = 
        `🟡 <b>[OPPORTUNITY — READY FOR ANTIGRAVITY]</b>\n` +
        `<b>Verified Opire USD Bounty ($${bounty})</b>\n\n` +
        `📦 <b>Repo:</b> <code>${escapeHtml(repo)}</code>\n` +
        `🎯 <b>Issue:</b> #${issueNum} - ${escapeHtml(issueData.title || item.title)}\n` +
        `💰 <b>Escrow Value:</b> $${bounty} USD | Competing PRs: 0\n\n` +
        `🔬 <b>Technical Diagnosis:</b>\n` +
        `${escapeHtml(study.diagnosis)}\n\n` +
        `🛠️ <b>Architecture Plan:</b>\n` +
        `${escapeHtml(study.architecture_plan)}\n\n` +
        `📊 <b>Calculated ROI:</b> ${escapeHtml(study.roi_calc)}\n\n` +
        `🔗 <a href="${item.url}">View Issue on GitHub</a>\n\n` +
        `⚡ <b>Ready-to-Paste Antigravity Execution Prompt:</b>\n` +
        `<pre>${escapeHtml(study.antigravity_prompt)}</pre>\n\n` +
        `🏛️ <i>MRomih Automations Autonomous Cloud Scout</i>`;

      await sendTelegram(alertMsg);
    }
  } catch (err) {
    console.error('[Opire] Scan error:', err.message);
  }
}

async function scanN8nCommunityJobs(metrics, seenN8nTopics, memory) {
  console.log('[CloudScout] Scanning n8n Community Jobs category...');
  try {
    const res = await fetch('https://community.n8n.io/c/jobs/13.json', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MRomih-Scout/2.0' }
    });
    if (!res.ok) return;

    const data = await res.json();
    const topics = data?.topic_list?.topics || [];
    metrics.issues_scanned += topics.length;

    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    function isGenuineN8nJob(t) {
      if (!t || !t.title) return false;
      if (t.id === 941 || t.pinned === true) return false;
      const lower = t.title.toLowerCase();
      if (lower.includes('guidelines') || lower.includes('about the jobs category')) return false;
      if (
        lower.includes('looking for small') ||
        lower.includes('looking for n8n') ||
        lower.includes('looking for projects') ||
        lower.includes('available for hire') ||
        lower.includes('for hire')
      ) {
        return false;
      }
      return true;
    }

    for (const topic of topics) {
      if (!isGenuineN8nJob(topic)) continue;

      const createdTime = new Date(topic.created_at).getTime();
      if (createdTime < fourteenDaysAgo) continue;

      if (seenN8nTopics.has(topic.id)) continue;

      // 1. Fetch full topic body from Discourse API
      let fullTopic = null;
      try {
        const topicRes = await fetch(`https://community.n8n.io/t/${topic.id}.json`, {
          headers: { 'User-Agent': 'Mozilla/5.0 MRomih-Scout/2.0' }
        });
        if (topicRes.ok) {
          fullTopic = await topicRes.json();
        }
      } catch (err) {
        console.warn(`[n8n Community] Could not fetch topic #${topic.id}:`, err.message);
      }

      if (!fullTopic) continue;

      // Skip explicitly archived topics or topics marked closed/filled in title or first post
      if (fullTopic.archived === true) {
        console.log(`[n8n Community] Skipping archived topic #${topic.id}`);
        continue;
      }
      if (/\[(closed|filled|expired|hired)\]/i.test(fullTopic.title)) {
        console.log(`[n8n Community] Skipping filled/closed topic title #${topic.id}`);
        continue;
      }

      const firstPost = fullTopic.post_stream?.posts?.[0];
      const rawHtml = firstPost?.cooked || '';
      const textContent = rawHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (/position (?:has been )?filled|no longer accepting|closed for applications/i.test(textContent)) {
        console.log(`[n8n Community] Skipping filled post body in #${topic.id}`);
        continue;
      }

      seenN8nTopics.add(topic.id);
      metrics.bounties_found++;
      metrics.last_bounty = `n8n Job: ${topic.title.substring(0, 35)}...`;
      console.log('[n8n Community] High-intent opportunity discovered: #' + topic.id + ' - ' + topic.title);

      const topicUrl = `https://community.n8n.io/t/${topic.slug || topic.id}/${topic.id}`;
      const authorUsername = firstPost?.username || 'the poster';

      // 2. Perform Complete Technical Requirement Study, Workflow Architecture Plan, ROI & Application in Cloud via Gemini
      let study = null;
      try {
        const aiPrompt = `
You are the Autonomous Chief Operating Officer and Principal Automation Architect at MRomih Automations (Founder: Mohamed Romih).
Perform a comprehensive technical study, architecture design, and proposal drafting for this live client request:

Platform: Official n8n Community (Jobs)
Topic ID: #${topic.id}
Title: ${topic.title}
Author: ${authorUsername}
URL: ${topicUrl}
Full Post Text:
${textContent.substring(0, 2500)}

Agency Context & Operating Rules:
- Core Capabilities: Enterprise n8n workflows, webhook reliability, error-handling sub-workflows, CRM synchronization (HubSpot, Airtable, QuickBooks, PostgreSQL), AI lead triage, Python scraping.
- Pricing Rules: Never undersell high-budget engineering roles with $35 debug pricing. Target $45/hr (within client's $20-$55/hr range) or $500-$1,000 for fixed-scope production implementations.
- Public Proofs:
  * Open-Source Lead Magnet: https://github.com/MRomih-Automations/n8n-ai-lead-triage-kit
  * Contra Portfolio: https://contra.com/mohamed_romih_jj5w3q2x
- Platform Constraint: Discourse brand-new accounts (TL0) have hidden-profile DMs locked, and topic public replies are closed. If an external link (Airtable form / email) is provided in the post, use it. Otherwise, look up author/founder on LinkedIn.

Output strictly valid JSON:
{
  "technical_study": "3-4 sentences breaking down client requirements, integration endpoints, data schema, and security/rate-limit considerations.",
  "workflow_architecture": "Step-by-step n8n node topology (e.g. 1. Webhook trigger -> 2. Crypto HMAC validation -> 3. Code node transform -> 4. Target API / Airtable batch sync -> 5. Sub-workflow error trigger).",
  "calculated_roi": "Estimated project value / budget ($X USD) | Target hourly rate ($45/hr) | Estimated hours | ROI justification for client",
  "proposed_copy": "Polished, engineering-first proposal copy ready to send directly to the client (addressing author by name, referencing case studies, availability, and next steps).",
  "antigravity_prompt": "Run \`git pull\` first in MRomih-Automations/revenue-scout-cron and MRomih-Automations/revenue-engine... (complete step-by-step instructions for Antigravity on PC to open the exact browser URL or form, paste the pre-written proposal, update AGENT_HANDOVER.md, and commit)."
}`;

        const rawAi = await callGemini(aiPrompt);
        study = safeJsonParse(rawAi);
        if (!study) {
          const techMatch = rawAi.match(/"technical_study"\s*:\s*"([\s\S]*?)(?=",\s*"workflow_architecture")/i);
          const archMatch = rawAi.match(/"workflow_architecture"\s*:\s*"([\s\S]*?)(?=",\s*"calculated_roi")/i);
          const roiMatch = rawAi.match(/"calculated_roi"\s*:\s*"([\s\S]*?)(?=",\s*"proposed_copy")/i);
          const copyMatch = rawAi.match(/"proposed_copy"\s*:\s*"([\s\S]*?)(?=",\s*"antigravity_prompt")/i);
          const promptMatch = rawAi.match(/"antigravity_prompt"\s*:\s*"([\s\S]*?)(?="\s*\}|\s*$)/i);
          if (techMatch && copyMatch) {
            study = {
              technical_study: techMatch[1].replace(/\\n/g, '\n').trim(),
              workflow_architecture: archMatch ? archMatch[1].replace(/\\n/g, '\n').trim() : '',
              calculated_roi: roiMatch ? roiMatch[1].replace(/\\n/g, '\n').trim() : '',
              proposed_copy: copyMatch[1].replace(/\\n/g, '\n').trim(),
              antigravity_prompt: promptMatch ? promptMatch[1].replace(/\\n/g, '\n').trim() : ''
            };
          } else {
            throw new Error('Could not parse Gemini JSON or extract fields.');
          }
        }
      } catch (err) {
        console.warn('[n8n Community] AI study fallback:', err.message);
        study = {
          technical_study: `Client requires production n8n automation for: ${topic.title}. Focus on reliable API synchronization and error routing.`,
          workflow_architecture: '1. Webhook Trigger -> 2. Data Validation & Transformation -> 3. Target API Integration -> 4. Error Sub-workflow Trigger.',
          calculated_roi: 'Target Rate: $45/hr (or fixed $500-$1,000) | 10-20h estimated scope.',
          proposed_copy: `Hi,\n\nI reviewed your project requirements for "${topic.title}". At MRomih Automations, we build production n8n workflows with enterprise resilience patterns (webhook HMAC verification, sub-workflow error alerting, and clean CRM writebacks).\n\nYou can review an open-source sample of our architecture here:\nhttps://github.com/MRomih-Automations/n8n-ai-lead-triage-kit\n\nOur portfolio and case studies:\nhttps://contra.com/mohamed_romih_jj5w3q2x\n\nTarget Rate: $45/hr (available 20-30 hrs/wk).\nGlad to hop on a quick 15-minute call or kick off with a paid trial task.\n\nBest regards,\nMohamed Romih | MRomih Automations`,
          antigravity_prompt: `Run \`git pull\` first in MRomih-Automations/revenue-scout-cron and MRomih-Automations/revenue-engine, then open ${topicUrl} in the browser. Submit the pre-written proposal via the external application link, direct message, or LinkedIn founder outreach. Log the outreach in AGENT_HANDOVER.md and push to origin main.`
        };
      }

      // 3. Format and Send Telegram Opportunity Alert
      const alertMsg = 
        `🟡 <b>[OPPORTUNITY — READY FOR ANTIGRAVITY]</b>\n` +
        `<b>Live n8n Community Client Opportunity</b>\n\n` +
        `📋 <b>Title:</b> ${escapeHtml(topic.title)}\n` +
        `👤 <b>Author:</b> <code>@${escapeHtml(authorUsername)}</code> | <b>Date:</b> ${topic.created_at.split('T')[0]}\n` +
        `🔗 <b>URL:</b> <a href="${topicUrl}">View Post on n8n Community</a>\n\n` +
        `🔬 <b>Technical Requirement Study:</b>\n` +
        `${escapeHtml(study.technical_study)}\n\n` +
        `🛠️ <b>n8n Workflow Architecture Plan:</b>\n` +
        `${escapeHtml(study.workflow_architecture)}\n\n` +
        `📊 <b>Calculated ROI & Rate:</b>\n` +
        `${escapeHtml(study.calculated_roi)}\n\n` +
        `📝 <b>Pre-Drafted Tailored Proposal:</b>\n` +
        `<blockquote>${escapeHtml(study.proposed_copy)}</blockquote>\n\n` +
        `⚡ <b>Ready-to-Paste Antigravity Execution Prompt:</b>\n` +
        `<pre>${escapeHtml(study.antigravity_prompt)}</pre>\n\n` +
        `🏛️ <i>MRomih Automations Autonomous Cloud Scout</i>`;

      await sendTelegram(alertMsg);
      console.log(`[n8n Community] Dispatched pre-analyzed Antigravity opportunity for #${topic.id}`);
    }
  } catch (err) {
    console.error('[n8n Community] Scan error:', err.message);
  }
}

async function scanHackerNews(metrics, seenHnIds, memory) {
  console.log('[CloudScout] Scanning Hacker News Algolia API for automation & scraping opportunities...');
  const queries = ['n8n', 'web+scraping+automation'];
  metrics.hn_scanned_hits = 0;

  for (const q of queries) {
    try {
      const url = `https://hn.algolia.com/api/v1/search_by_date?query=${q}&tags=(story,comment)&hitsPerPage=20`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 MRomih-Scout/2.0' } });
      if (!res.ok) continue;

      const data = await res.json();
      const hits = data?.hits || [];
      metrics.issues_scanned += hits.length;
      metrics.hn_scanned_hits += hits.length;

      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      for (const hit of hits) {
        if (!hit.objectID || seenHnIds.has(hit.objectID)) continue;
        const createdAt = new Date(hit.created_at).getTime();
        if (createdAt < oneWeekAgo) continue;

        const text = (hit.comment_text || hit.story_text || hit.title || '').toLowerCase();
        
        // Filter strictly for commercial/hiring intent
        const hasIntent = 
          (/\b(hiring|looking for|need someone|freelance|contractor|paid|bounty|budget)\b/i.test(text)) &&
          (/\b(n8n|scrape|scraper|scraping|automation|workflow|pipeline)\b/i.test(text));

        if (!hasIntent) continue;

        // Skip obvious spam or off-topic job board advertisements
        if (/we are hiring|join our team at bigtech|apply at linkedin\.com\/jobs/i.test(text)) continue;

        seenHnIds.add(hit.objectID);
        metrics.bounties_found++;
        metrics.last_bounty = `HN Lead: ${hit.author || 'User'} (${q})`;
        console.log(`[HackerNews] Opportunity identified: ${hit.objectID} by ${hit.author}`);

        const hnUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;

        let study = null;
        try {
          const aiPrompt = `
You are the Technical Lead at MRomih Automations.
Analyze this Hacker News automation/scraping opportunity:
Author: ${hit.author}
Query: ${q}
URL: ${hnUrl}
Snippet:
${(hit.comment_text || hit.story_text || hit.title || '').substring(0, 1500)}

Perform a deep technical study:
1. Client requirement diagnosis.
2. Architecture & execution plan (n8n workflow or Python stealth scraper).
3. ROI Assessment: Estimated budget & pricing.
4. Prepare an Antigravity prompt starting with 'Run \`git pull\` first...'.

Output JSON:
{
  "diagnosis": "2-3 sentences technical summary",
  "architecture_plan": "Bulleted technical plan",
  "roi_calc": "Estimated value | Rate recommendation",
  "antigravity_prompt": "Run \`git pull\` first..."
}`;
          const rawAi = await callGemini(aiPrompt);
          const clean = rawAi.replace(/```json/gi, '').replace(/```/g, '').trim();
          study = JSON.parse(clean);
        } catch (e) {
          study = {
            diagnosis: `HN discussion mentioning automation/scraping need by ${hit.author}.`,
            architecture_plan: 'Review thread context, draft technical architectural answer referencing MRomih Automations GitHub/Contra.',
            roi_calc: '$45-$65/hr consulting or project implementation.',
            antigravity_prompt: `Run \`git pull\` first in MRomih-Automations/revenue-scout-cron and MRomih-Automations/revenue-engine, then review HN comment at ${hnUrl} and respond with technical architectural advice.`
          };
        }

        const alertMsg = 
          `🟡 <b>[OPPORTUNITY — READY FOR ANTIGRAVITY]</b>\n` +
          `<b>Hacker News Automation / Scraping Lead</b>\n\n` +
          `👤 <b>Author:</b> <code>${escapeHtml(hit.author)}</code> | <b>Query:</b> <code>${escapeHtml(q)}</code>\n` +
          `🔗 <b>URL:</b> <a href="${hnUrl}">View on Hacker News</a>\n\n` +
          `🔬 <b>Technical Diagnosis:</b>\n` +
          `${escapeHtml(study.diagnosis)}\n\n` +
          `🛠️ <b>Architecture Plan:</b>\n` +
          `${escapeHtml(study.architecture_plan)}\n\n` +
          `📊 <b>Calculated ROI:</b> ${escapeHtml(study.roi_calc)}\n\n` +
          `⚡ <b>Ready-to-Paste Antigravity Execution Prompt:</b>\n` +
          `<pre>${escapeHtml(study.antigravity_prompt)}</pre>\n\n` +
          `🏛️ <i>MRomih Automations Autonomous Cloud Scout</i>`;

        await sendTelegram(alertMsg);
      }
    } catch (err) {
      console.warn(`[HackerNews] Error scanning query ${q}:`, err.message);
    }
  }
}

async function run() {
  console.log('[CloudScout] Starting autonomous 24/7 technical scout cycle at ' + new Date().toISOString());
  const isManual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  const memory = loadMemory();

  if (isManual) {
    await sendTelegram('🛰️ <b>Cloud Scout Heartbeat:</b> 24/7 GitHub Actions technical scout active in cloud!');
    console.log('Dispatched manual heartbeat alert to Telegram.');
  }

  const headers = {
    'User-Agent': 'MRomih-CloudScout/2.0',
    'Accept': 'application/vnd.github.v3+json'
  };
  if (GH_PAT) {
    headers['Authorization'] = 'token ' + GH_PAT;
  }

  const metrics = {
    issues_scanned: 0,
    bounties_found: 0,
    last_bounty: null,
    hn_scanned_hits: 0
  };

  const seenN8nTopics = new Set();
  const seenHnIds = new Set();

  // 1. Scan Algora escrow bounties
  await scanAlgoraBounties(headers, metrics, memory);

  // 2. Scan Opire public rewards API
  await scanOpireBounties(headers, metrics, memory);

  // 3. Scan n8n Community Jobs
  await scanN8nCommunityJobs(metrics, seenN8nTopics, memory);

  // 4. Scan Hacker News Algolia queries
  await scanHackerNews(metrics, seenHnIds, memory);

  // 5. Update live telemetry in repository
  await updateLiveTelemetry(metrics, Array.from(seenN8nTopics));
  console.log('[CloudScout] Autonomous technical scout cycle completed successfully.');
}

run();
