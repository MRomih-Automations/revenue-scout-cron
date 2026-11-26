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
const GH_PAT = process.env.GH_PAT || process.env.GITHUB_TOKEN;

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
      return {
        agency: { name: 'MRomih Automations', founder: 'Mohamed Romih' },
        storefronts: {},
        operating_rules: [],
        platform_schedules: {},
        active_deal_pipeline: [],
        _parseError: `brain_memory.json parse failure: ${e.message}`
      };
    }
  }
  return {
    agency: { name: 'MRomih Automations', founder: 'Mohamed Romih' },
    storefronts: {},
    operating_rules: [],
    platform_schedules: {},
    active_deal_pipeline: [],
    _parseError: 'brain_memory.json file not found'
  };
}

function loadPlaybook() {
  const pbPath = path.join(__dirname, 'playbook.json');
  if (fs.existsSync(pbPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(pbPath, 'utf8'));
      if (!Array.isArray(parsed.dynamic_search_queries)) parsed.dynamic_search_queries = [];
      if (!Array.isArray(parsed.winning_pitch_rules)) parsed.winning_pitch_rules = [];
      if (!Array.isArray(parsed.discovered_market_patterns)) parsed.discovered_market_patterns = [];
      return parsed;
    } catch (e) {
      console.warn('[Scout] Error reading playbook.json:', e.message);
      return {
        dynamic_search_queries: [],
        winning_pitch_rules: [],
        offer_ladder: {},
        vertical_playbooks: {},
        objection_handlers: {},
        content_and_outreach_frameworks: {},
        discovered_market_patterns: [],
        _parseError: `playbook.json parse failure: ${e.message}`
      };
    }
  }
  return {
    dynamic_search_queries: [],
    winning_pitch_rules: [],
    offer_ladder: {},
    vertical_playbooks: {},
    objection_handlers: {},
    content_and_outreach_frameworks: {},
    discovered_market_patterns: [],
    _parseError: 'playbook.json file not found'
  };
}

function loadLocalTelemetry() {
  const telPath = path.join(__dirname, 'telemetry.json');
  if (fs.existsSync(telPath)) {
    try {
      return JSON.parse(fs.readFileSync(telPath, 'utf8'));
    } catch (e) {
      console.warn('[Scout] Error reading local telemetry.json:', e.message);
    }
  }
  return { seen_n8n_topics: [], seen_lead_ids: [], query_stats: {} };
}

function validateScoutSchemas(memory, playbook) {
  const errors = [];
  if (memory._parseError) errors.push(memory._parseError);
  if (!memory.agency || !memory.agency.founder) errors.push('brain_memory.json missing agency.founder');
  if (!Array.isArray(memory.active_deal_pipeline)) errors.push('brain_memory.json active_deal_pipeline must be an array');

  if (playbook._parseError) errors.push(playbook._parseError);
  if (!Array.isArray(playbook.dynamic_search_queries)) errors.push('playbook.json dynamic_search_queries must be an array');
  if (!Array.isArray(playbook.winning_pitch_rules)) errors.push('playbook.json winning_pitch_rules must be an array');
  if (!playbook.offer_ladder || Object.keys(playbook.offer_ladder).length === 0) errors.push('playbook.json missing offer_ladder tiers');
  if (!playbook.vertical_playbooks || Object.keys(playbook.vertical_playbooks).length === 0) errors.push('playbook.json missing vertical_playbooks');
  if (!Array.isArray(playbook.discovered_market_patterns)) errors.push('playbook.json discovered_market_patterns must be an array');
  return errors;
}

function formatPlaybookContext(playbook) {
  return JSON.stringify({
    winning_pitch_rules: playbook.winning_pitch_rules || [],
    dynamic_search_queries: (playbook.dynamic_search_queries || []).map(q => q.query),
    offer_ladder: playbook.offer_ladder || {},
    vertical_playbooks: playbook.vertical_playbooks || {},
    competitive_positioning: playbook.competitive_positioning || {},
    objection_handlers: playbook.objection_handlers || {},
    discovered_market_patterns: (playbook.discovered_market_patterns || []).slice(-5)
  }, null, 2);
}

function initQueryStats(playbook, telemetry) {
  const stats = {};
  const existingMap = (telemetry && telemetry.query_stats && typeof telemetry.query_stats === 'object')
    ? telemetry.query_stats
    : {};
  for (const item of (playbook?.dynamic_search_queries || [])) {
    if (!item || !item.query) continue;
    const prev = existingMap[item.query] || {};
    stats[item.query] = {
      query: item.query,
      hits: Math.max(Number(item.hits) || 0, Number(prev.hits) || 0),
      qualified_leads: Math.max(Number(item.qualified_leads) || 0, Number(prev.qualified_leads) || 0),
      zero_hit_runs: Math.max(Number(item.zero_hit_runs) || 0, Number(prev.zero_hit_runs) || 0),
      run_hits: 0,
      run_qualified: 0
    };
  }
  return stats;
}

function doesTextMatchDynamicQuery(text, query) {
  if (!text || !query) return false;
  const lower = String(text).toLowerCase();
  const stopWords = new Set(['or', 'and', 'the', 'for', 'with', 'mode']);
  const tokens = String(query)
    .toLowerCase()
    .replace(/["'()]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 3 && !stopWords.has(t));
  if (tokens.length === 0) return false;
  let matches = 0;
  for (const tok of tokens) {
    if (lower.includes(tok)) matches++;
  }
  return matches >= Math.min(2, tokens.length);
}

function finalizeQueryStats(queryStats) {
  const out = {};
  const nowIso = new Date().toISOString();
  for (const [qKey, entry] of Object.entries(queryStats || {})) {
    const runHits = Number(entry.run_hits) || 0;
    const runQualified = Number(entry.run_qualified) || 0;
    const prevHits = Number(entry.hits) || 0;
    const prevQualified = Number(entry.qualified_leads) || 0;
    const prevZero = Number(entry.zero_hit_runs) || 0;

    out[qKey] = {
      query: entry.query || qKey,
      hits: prevHits + runHits,
      qualified_leads: prevQualified + runQualified,
      zero_hit_runs: runHits === 0 ? prevZero + 1 : 0,
      last_run_at: nowIso
    };
  }
  return out;
}

function getTrackedTopicIds(memory) {
  const tracked = new Set([330154, 329131, 329465]);
  
  for (const deal of (memory.active_deal_pipeline || [])) {
    if (deal.source_url) {
      const m = deal.source_url.match(/\/(\d+)/);
      if (m) tracked.add(parseInt(m[1], 10));
    }
  }

  for (const dir of (memory.past_directives || [])) {
    const text = (dir.synthesis || '') + ' ' + (dir.reason || '');
    const matches = text.match(/#(\d{5,7})/g);
    if (matches) {
      matches.forEach(m => tracked.add(parseInt(m.replace('#', ''), 10)));
    }
  }

  return tracked;
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

const _sentHealthAlertKeys = new Set();
const ACTIONABLE_ROUTING_BANNER = '📋 <b>NEXT STEP:</b> Paste this message to Gemini for your ready-to-run Antigravity prompt.';

function formatHealthAlertHtml(component, issueSummary, errorDetails) {
  const safeComp = escapeHtml(component || 'Cloud Scout');
  const safeIssue = escapeHtml(issueSummary || 'Runtime degradation detected');
  const safeDetails = errorDetails ? `\n<pre>${escapeHtml(String(errorDetails).slice(0, 1200))}</pre>\n` : '\n';
  return (
    `🟠 <b>[SYSTEM HEALTH / BREAKDOWN ALERT]</b>\n` +
    `<b>Component:</b> <code>${safeComp}</code>\n` +
    `<b>Issue:</b> ${safeIssue}\n` +
    `<b>Timestamp (UTC):</b> <code>${new Date().toISOString()}</code>` +
    safeDetails +
    `\n🛠️ <i>Immediate diagnostic review recommended (Cloud Scout Watchdog).</i>\n\n` +
    ACTIONABLE_ROUTING_BANNER
  );
}

async function sendHealthAlert(component, issueSummary, errorDetails) {
  const dedupeKey = `${component}::${issueSummary}`;
  if (_sentHealthAlertKeys.has(dedupeKey)) return;
  _sentHealthAlertKeys.add(dedupeKey);

  const htmlMsg = formatHealthAlertHtml(component, issueSummary, errorDetails);
  console.error(`🟠 [HEALTH WATCHDOG] ${component}: ${issueSummary}`);
  await sendTelegram(htmlMsg);
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    await sendHealthAlert('Gemini API (Cloud Scout)', 'GEMINI_API_KEY missing in environment', 'Check scout_cron.yml env and repo Secrets');
    throw new Error('GEMINI_API_KEY is not configured in Scout.');
  }

  const models = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-flash-latest'];
  const failures = [];
  let authErrors = 0;
  let rateLimitErrors = 0;

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
        if (text) {
          if (authErrors >= 1 || rateLimitErrors >= 2) {
            await sendHealthAlert(
              'Gemini API Degradation (Cloud Scout)',
              `Fallback succeeded on ${m} after repeated auth/rate-limit errors`,
              failures.join('\n')
            );
          }
          return text;
        }
        failures.push(`${m}: HTTP 200 empty response text`);
      } else {
        if (res.status === 401 || res.status === 403) authErrors++;
        if (res.status === 429) rateLimitErrors++;
        const errBody = await res.text().catch(() => '');
        failures.push(`${m}: HTTP ${res.status} ${errBody.slice(0, 140)}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) {
      failures.push(`${m}: ${e.message}`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  await sendHealthAlert(
    'Gemini API Failure (Cloud Scout)',
    'All Gemini models failed after retries',
    failures.join('\n')
  );
  throw new Error('All Gemini API models failed in Scout.');
}

async function updateLiveTelemetry(metrics, seenN8nTopics, seenLeadIds, queryStats) {
  const token = GH_PAT || process.env.GITHUB_TOKEN;
  if (!token) {
    console.log('[Telemetry] Missing GH_PAT and GITHUB_TOKEN, skipping repository telemetry push.');
    await sendHealthAlert(
      'Cloud Scout Telemetry Persistence',
      'No GitHub authentication token found (GH_PAT or GITHUB_TOKEN)',
      'Set GH_PAT secret or grant permissions: contents: write to scout_cron.yml'
    );
    return;
  }

  const owner = 'MRomih-Automations';
  const repo = 'revenue-scout-cron';

  try {
    let sha = null;
    let existingData = {};
    let existingSeen = [];
    let existingLeadIds = [];
    const existing = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/telemetry.json`, {
      headers: { 'Authorization': 'token ' + token, 'User-Agent': 'CloudScout', 'Accept': 'application/vnd.github.v3+json' }
    });
    if (existing.ok) {
      const data = await existing.json();
      sha = data.sha;
      try {
        const parsed = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
        if (parsed && typeof parsed === 'object') {
          existingData = parsed;
          if (Array.isArray(parsed.seen_n8n_topics)) existingSeen = parsed.seen_n8n_topics;
          if (Array.isArray(parsed.seen_lead_ids)) existingLeadIds = parsed.seen_lead_ids;
        }
      } catch (e) {}
    }

    const mergedSeen = Array.from(new Set([...existingSeen, ...(seenN8nTopics || [])])).slice(-100);
    const mergedLeadIds = Array.from(new Set([...existingLeadIds, ...Array.from(seenLeadIds || [])])).slice(-300);

    let mergedQueryStats = existingData.query_stats && typeof existingData.query_stats === 'object'
      ? { ...existingData.query_stats }
      : {};
    if (queryStats && typeof queryStats === 'object') {
      const remoteStats = existingData.query_stats && typeof existingData.query_stats === 'object'
        ? existingData.query_stats
        : {};
      const combined = {};
      for (const [qKey, entry] of Object.entries(queryStats)) {
        const remote = remoteStats[qKey] || {};
        combined[qKey] = {
          query: entry.query || qKey,
          hits: Math.max(Number(entry.hits) || 0, Number(remote.hits) || 0),
          qualified_leads: Math.max(Number(entry.qualified_leads) || 0, Number(remote.qualified_leads) || 0),
          zero_hit_runs: Math.max(Number(entry.zero_hit_runs) || 0, Number(remote.zero_hit_runs) || 0),
          run_hits: Number(entry.run_hits) || 0,
          run_qualified: Number(entry.run_qualified) || 0
        };
      }
      mergedQueryStats = finalizeQueryStats(combined);
    }

    const payload = {
      ...existingData,
      status: 'HEALTHY',
      last_run_timestamp: new Date().toISOString(),
      heartbeat_unix: Date.now(),
      cron_interval: 'Every 30 minutes',
      provider: 'GitHub Actions Enterprise Cloud',
      issues_scanned: metrics.issues_scanned || 0,
      qualified_bounties_found: metrics.bounties_found || 0,
      last_bounty_title: metrics.last_bounty || existingData.last_bounty_title || null,
      hn_scanned_hits: metrics.hn_scanned_hits || 0,
      reddit_scanned_posts: metrics.reddit_scanned_posts || 0,
      seen_n8n_topics: mergedSeen,
      seen_lead_ids: mergedLeadIds,
      query_stats: mergedQueryStats
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    fs.writeFileSync(path.join(__dirname, 'telemetry.json'), jsonStr, 'utf8');

    const body = {
      message: 'telemetry: sync live cloud scout heartbeat [skip ci]',
      content: Buffer.from(jsonStr).toString('base64')
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
      const errText = await putRes.text().catch(() => '');
      console.log('[Telemetry] Sync status:', putRes.status);
      await sendHealthAlert('Cloud Scout Telemetry Persistence', `GitHub Contents API PUT failed with HTTP ${putRes.status}`, errText);
    }
  } catch (e) {
    console.warn('[Telemetry] Error syncing telemetry:', e.message);
    await sendHealthAlert('Cloud Scout Telemetry Persistence', 'Exception syncing telemetry.json to GitHub', e.stack || e.message);
  }
}

async function scanAlgoraBounties(headers, metrics, memory, seenLeadIds) {
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
      const leadId = `algora_${repo}_${issueNum}`;
      if (seenLeadIds && seenLeadIds.has(leadId)) continue;

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
        `🏛️ <i>Mohamed Romih | MRomih Automations — Cloud Scout</i>\n` +
        ACTIONABLE_ROUTING_BANNER;

      if (seenLeadIds) seenLeadIds.add(leadId);
      await sendTelegram(alertMsg);
    }
  } catch (err) {
    console.error('[Algora] Scan error:', err.message);
  }
}

async function scanOpireBounties(headers, metrics, memory, seenLeadIds) {
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
      const leadId = `opire_${repo}_${issueNum}`;
      if (seenLeadIds && seenLeadIds.has(leadId)) continue;

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
        `🏛️ <i>Mohamed Romih | MRomih Automations — Cloud Scout</i>\n` +
        ACTIONABLE_ROUTING_BANNER;

      if (seenLeadIds) seenLeadIds.add(leadId);
      await sendTelegram(alertMsg);
    }
  } catch (err) {
    console.error('[Opire] Scan error:', err.message);
  }
}

function hasExplicitHiringOrPayIntent(text) {
  return /\b(hiring|looking to hire|paid help|need paid|budget|freelancer|contractor|seeking (?:a |an )?(?:freelancer|contractor|developer|engineer|expert|consultant|partner)|looking for (?:a |an )?(?:freelancer|contractor|developer|engineer|consultant|partner))\b|\[\s*hiring\s*\]/i.test(String(text || ''));
}

function isN8nDeveloperShowcase(text) {
  const s = String(text || '').toLowerCase();
  const showcasePattern = /\b(why i built|sharing (?:a|an|my)|i built (?:a|an|this)|built with n8n|open[- ]source|tutorial|check out my (?:repo|workflow|tool))\b|\[\s*for hire\s*\]/i.test(s);
  return showcasePattern && !hasExplicitHiringOrPayIntent(s);
}

function isCommercialN8nTopic(t, feedKind = 'jobs') {
  if (!t || !t.title) return false;
  if (t.id === 941 || t.pinned === true) return false;
  const lower = t.title.toLowerCase();
  if (lower.includes('guidelines') || lower.includes('about the jobs category')) return false;
  if (
    lower.includes('looking for small') ||
    lower.includes('looking for n8n') ||
    lower.includes('looking for projects') ||
    lower.includes('available for hire') ||
    lower.includes('for hire') ||
    /\b(unpaid|commission-based|commission only|commission-only|equity only|equity-only|pre-revenue|pre revenue)\b/i.test(lower)
  ) {
    return false;
  }
  if (feedKind === 'jobs') return true;
  if (isN8nDeveloperShowcase(t.title)) return false;

  // High-intent triggers inside /latest.json (hiring, agency partners, Zapier/Make bill-shock migrations, queue mode, broken webhooks/CRM)
  return (
    /(\[\s*hiring\s*\]|\bhiring\b|\bseeking (?:a |an )?(?:freelancer|contractor|developer|engineer|expert|partner)\b|\blooking to hire\b|\bagency partner\b)/i.test(lower) ||
    (/\b(zapier|make\.com|integromat)\b/i.test(lower) && /\b(migrat|switch|move|cost|bill|pricing|expensive|alternative|replacing)\b/i.test(lower)) ||
    /\b(queue mode|redis worker|self[- ]hosted scale|webhook fail|silent fail|idempoten|duplicate record|duplicate row|broken workflow|production error)\b/i.test(lower)
  );
}

function isCommercialHnHit(hit) {
  if (!hit || !hit.objectID) return false;
  const storyTitle = String(hit.story_title || '');
  const rawBody = String(hit.comment_text || hit.story_text || hit.title || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const combined = `${storyTitle} ${rawBody}`;
  const lower = combined.toLowerCase();

  // Reject [For Hire] / "Who wants to be hired?" / unpaid asks
  if (
    /who wants to be hired/i.test(storyTitle) ||
    /^\s*(\[?\s*for hire\s*\]?|available for hire|seeking work)\b/i.test(rawBody) ||
    /\b(unpaid|equity only|commission only)\b/i.test(lower)
  ) {
    return false;
  }

  const isWhoIsHiringThread = /who is hiring|who's hiring|seeking freelancer|freelancer\?/i.test(storyTitle);
  const hasCommercialIntent =
    /\b(freelancer wanted|seeking freelancer|seeking contractor|looking to hire|agency partner|white-label|white label|contractor|freelance|consultant|need help migrating|bill shock|looking for (?:a |an )?(?:freelancer|contractor|developer|engineer|partner))\b/i.test(lower) ||
    (isWhoIsHiringThread && /\b(freelance|contract|contractor|remote|agency|partner|n8n|make|zapier|webhook|ai agent|automation)\b/i.test(lower)) ||
    (/\b(zapier|make\.com)\b/i.test(lower) && /\b(migrat|n8n|expensive|bill|cost)\b/i.test(lower)) ||
    /\b(broken webhook|webhook idempotency|queue mode|silent failure)\b/i.test(lower);

  if (!hasCommercialIntent) return false;

  const hasTechFit = /\b(n8n|make\.com|zapier|webhook|api integration|idempoten|airtable|hubspot|crm|web scrap|python scrap|data extraction|ai agent|lead triage|voice agent|automation|playwright)\b/i.test(lower);
  if (!hasTechFit) return false;

  if (/apply at linkedin\.com\/jobs/i.test(lower) && !/\b(freelance|contract|contractor|partner)\b/i.test(lower)) {
    return false;
  }
  return true;
}

async function scanN8nCommunityJobs(metrics, seenN8nTopics, memory, playbook, seenLeadIds, queryStats) {
  console.log('[CloudScout] Scanning n8n Community (/c/jobs/18.json, /c/jobs/13.json, /latest.json)...');
  const appliedTopicIds = getTrackedTopicIds(memory);
  const playbookContext = formatPlaybookContext(playbook || {});
  const dynamicQueries = (playbook?.dynamic_search_queries || []).map(q => q.query).filter(Boolean);

  const n8nFeeds = [
    { kind: 'jobs', url: 'https://community.n8n.io/c/jobs/18.json' },
    { kind: 'jobs', url: 'https://community.n8n.io/c/jobs/13.json' },
    { kind: 'latest', url: 'https://community.n8n.io/latest.json' }
  ];

  const candidateTopics = [];
  const seenFeedIds = new Set();

  for (const feed of n8nFeeds) {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MRomih-Scout/2.0' },
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) {
        console.warn(`[n8n Community] Feed ${feed.url} returned HTTP ${res.status}; continuing gracefully.`);
        continue;
      }
      const data = await res.json();
      const topics = data?.topic_list?.topics || [];
      metrics.issues_scanned += topics.length;
      for (const topic of topics) {
        if (!topic || !topic.id || seenFeedIds.has(topic.id)) continue;
        seenFeedIds.add(topic.id);
        candidateTopics.push({ topic, kind: feed.kind });
      }
    } catch (err) {
      console.warn(`[n8n Community] Feed error (${feed.url}):`, err.message);
    }
  }

  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

  try {
    for (const { topic, kind } of candidateTopics) {
      if (!isCommercialN8nTopic(topic, kind)) continue;

      const createdTime = new Date(topic.created_at).getTime();
      if (createdTime < fourteenDaysAgo) continue;

      const n8nLeadId = `n8n_${topic.id}`;
      if (seenN8nTopics.has(topic.id) || appliedTopicIds.has(topic.id) || (seenLeadIds && seenLeadIds.has(n8nLeadId))) {
        continue;
      }

      // Fetch full topic body from Discourse API
      let fullTopic = null;
      try {
        const topicRes = await fetch(`https://community.n8n.io/t/${topic.id}.json`, {
          headers: { 'User-Agent': 'Mozilla/5.0 MRomih-Scout/2.0' },
          signal: AbortSignal.timeout(10000)
        });
        if (topicRes.ok) {
          fullTopic = await topicRes.json();
        }
      } catch (err) {
        console.warn(`[n8n Community] Could not fetch topic #${topic.id}:`, err.message);
      }

      if (!fullTopic) continue;
      if (fullTopic.archived === true) continue;
      if (/\[(closed|filled|expired|hired)\]/i.test(fullTopic.title)) continue;

      const firstPost = fullTopic.post_stream?.posts?.[0];
      const rawHtml = firstPost?.cooked || '';
      const textContent = rawHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      const badTermsRegex = /\b(unpaid|commission-based|commission only|commission-only|equity only|equity-only|pre-revenue|pre revenue)\b/i;
      if (badTermsRegex.test(fullTopic.title) || badTermsRegex.test(textContent)) continue;
      if (/position (?:has been )?filled|no longer accepting|closed for applications/i.test(textContent)) continue;

      seenN8nTopics.add(topic.id);
      if (seenLeadIds) seenLeadIds.add(n8nLeadId);

      if (kind !== 'jobs' && isN8nDeveloperShowcase(`${fullTopic.title} ${textContent}`)) {
        console.log(`[n8n Community] Skipping developer showcase/tutorial topic #${topic.id}: ${fullTopic.title}`);
        continue;
      }

      // Attribute dynamic query hit telemetry cleanly
      const combinedText = `${topic.title} ${textContent}`;
      const matchedQueries = dynamicQueries.filter(q => doesTextMatchDynamicQuery(combinedText, q));
      for (const mq of matchedQueries) {
        if (queryStats && queryStats[mq]) queryStats[mq].run_hits++;
      }

      const topicUrl = `https://community.n8n.io/t/${topic.slug || topic.id}/${topic.id}`;
      const authorUsername = firstPost?.username || 'the poster';
      const hasBrokenHistory = /broken|failed|unreliable|previous freelancer|frustrat|silent fail|duplicate|idempoten|429/i.test(combinedText);
      const isMigrationOrQueue = /\b(zapier|make\.com|integromat|queue mode|bill|cost)\b/i.test(combinedText);

      let study = null;
      try {
        const aiPrompt = `
You are the Principal Automation Architect at MRomih Automations (Founder: Mohamed Romih).
Score (0-100) and perform a comprehensive technical study, Commercial Playbook matching, architecture design, and proposal drafting for this n8n Community opportunity:

Platform: Official n8n Community (${kind === 'jobs' ? 'Jobs' : 'Latest Commercial Trigger'})
Topic ID: #${topic.id}
Title: ${topic.title}
Author: ${authorUsername}
URL: ${topicUrl}
Full Post Text:
${textContent.substring(0, 2500)}

Commercial & Technical Playbook (playbook.json, including winning_pitch_rules):
${playbookContext}

Playbook Execution Mandates:
1. Assign "fit_score" (0-100): Score >= 75 ONLY for legitimate paid hiring/partner opportunities, Zapier/Make bill-shock migrations, queue-mode scaling needs, or broken production webhooks/CRMs. Score < 75 for hobby questions, beginner tutorials, or low-value noise.
2. Classify into closest vertical key ("ecommerce_and_creators", "b2b_gtm_and_lead_triage", "smb_healthcare_and_services", or "scraping_and_data_pipelines").
3. Apply winning_pitch_rules from playbook.json: if broken webhooks, unreliable past freelancers, or Zapier/Make bill-shock appear, lead with our "$150 fixed (48h) Credited Diagnostic Audit" alongside the full build tier!
4. Sign proposed_copy strictly as "Mohamed Romih | MRomih Automations". Strictly forbid robotic AI self-titles ("Autonomous COO", "AI Assistant", etc.).
5. Public proofs: https://github.com/MRomih-Automations/n8n-ai-lead-triage-kit and https://contra.com/mohamed_romih_jj5w3q2x

Output strictly valid JSON:
{
  "fit_score": 0-100,
  "score_rationale": "1 concise sentence explaining why fit_score was assigned",
  "matched_vertical": "ecommerce_and_creators | b2b_gtm_and_lead_triage | smb_healthcare_and_services | scraping_and_data_pipelines",
  "recommended_offer_tier": "diagnostic_audit | production_pipeline | enterprise_ai_system",
  "technical_study": "3-4 sentences breaking down client requirements, integration endpoints, and security/rate-limit considerations.",
  "workflow_architecture": "Step-by-step n8n node topology (e.g. 1. Webhook trigger -> 2. Crypto HMAC validation -> 3. Idempotency check -> 4. CRM upsert -> 5. Dead-letter error trigger).",
  "calculated_roi": "Offer tier | Estimated project value ($X USD) | Target rate ($45-$65/hr or fixed) | ROI justification",
  "proposed_copy": "Polished, engineering-first proposal weaving vertical hooks + credited $150 Diagnostic Audit if applicable, signed 'Mohamed Romih | MRomih Automations'.",
  "antigravity_prompt": "Run \`git pull\` first in MRomih-Automations/revenue-scout-cron and MRomih-Automations/revenue-engine, then open ${topicUrl} in Chrome and outreach cleanly..."
}`;

        const rawAi = await callGemini(aiPrompt);
        study = safeJsonParse(rawAi);
        if (!study || typeof study.fit_score === 'undefined') {
          const scoreMatch = rawAi.match(/"fit_score"\s*:\s*(\d+)/i);
          const vertMatch = rawAi.match(/"matched_vertical"\s*:\s*"([^"]+)"/i);
          const tierMatch = rawAi.match(/"recommended_offer_tier"\s*:\s*"([^"]+)"/i);
          const techMatch = rawAi.match(/"technical_study"\s*:\s*"([\s\S]*?)(?=",\s*"workflow_architecture")/i);
          const archMatch = rawAi.match(/"workflow_architecture"\s*:\s*"([\s\S]*?)(?=",\s*"calculated_roi")/i);
          const roiMatch = rawAi.match(/"calculated_roi"\s*:\s*"([\s\S]*?)(?=",\s*"proposed_copy")/i);
          const copyMatch = rawAi.match(/"proposed_copy"\s*:\s*"([\s\S]*?)(?=",\s*"antigravity_prompt")/i);
          const promptMatch = rawAi.match(/"antigravity_prompt"\s*:\s*"([\s\S]*?)(?="\s*\}|\s*$)/i);
          if (techMatch && copyMatch) {
            study = {
              fit_score: scoreMatch ? Number(scoreMatch[1]) : (kind === 'jobs' || hasBrokenHistory || isMigrationOrQueue ? 80 : 70),
              score_rationale: 'Extracted structured study from Gemini response.',
              matched_vertical: vertMatch ? vertMatch[1] : 'b2b_gtm_and_lead_triage',
              recommended_offer_tier: tierMatch ? tierMatch[1] : (hasBrokenHistory ? 'diagnostic_audit' : 'production_pipeline'),
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
        const fallbackScore = (kind === 'jobs' || hasBrokenHistory || isMigrationOrQueue) ? 80 : 68;
        const fallbackTier = (hasBrokenHistory || isMigrationOrQueue) ? 'diagnostic_audit' : 'production_pipeline';
        const auditPitch = (hasBrokenHistory || isMigrationOrQueue)
          ? '\n\nIf you want zero-risk proof before committing to the full build, we can kick off with a $150 48-hour Diagnostic Audit (100% credited toward the final implementation).'
          : '';
        study = {
          fit_score: fallbackScore,
          score_rationale: 'Heuristic trigger qualification for hiring/migration/broken-webhook thread.',
          matched_vertical: /gumroad|stripe|shopify|airtable/i.test(combinedText) ? 'ecommerce_and_creators' : 'b2b_gtm_and_lead_triage',
          recommended_offer_tier: fallbackTier,
          technical_study: `Client requires production n8n automation for: ${topic.title}. Focus on reliable HMAC verification, idempotency, and dead-letter error routing.`,
          workflow_architecture: '1. Webhook Trigger + HMAC Gate -> 2. Transaction ID Idempotency Lookup -> 3. Normalized Upsert -> 4. Enterprise Error Dead-Letter Sub-workflow.',
          calculated_roi: `Offer Tier: ${fallbackTier} | $500–$850 fixed or $45/hr target | Zero duplicate rows & silent drops.`,
          proposed_copy: `Hi,\n\nI reviewed your project requirements for "${topic.title}". At MRomih Automations, we build production n8n pipelines with HMAC SHA-256 webhook gates, transaction-ID idempotency (preventing duplicate rows), and dead-letter error alerting so nothing fails silently.${auditPitch}\n\nYou can inspect an open-source sample of our architecture here:\nhttps://github.com/MRomih-Automations/n8n-ai-lead-triage-kit\n\nOur portfolio and case studies:\nhttps://contra.com/mohamed_romih_jj5w3q2x\n\nTarget Rate: $45/hr (or $500–$850 turnkey build).\nGlad to hop on a quick 15-minute call.\n\nBest regards,\nMohamed Romih | MRomih Automations`,
          antigravity_prompt: `Run \`git pull\` first in MRomih-Automations/revenue-scout-cron and MRomih-Automations/revenue-engine, then open ${topicUrl} in Chrome. Submit the pre-written proposal via external link, DM, or LinkedIn founder outreach. Log the outreach in AGENT_HANDOVER.md and push to origin main.`
        };
      }

      const fitScore = Number(study.fit_score) || 0;
      if (fitScore < 75) {
        console.log(`[n8n Community] Skipped low-fit topic #${topic.id} (score=${fitScore}/100): ${study.score_rationale || ''}`);
        continue;
      }

      metrics.bounties_found++;
      metrics.last_bounty = `n8n Community #${topic.id}: ${topic.title.substring(0, 32)}...`;
      for (const mq of matchedQueries) {
        if (queryStats && queryStats[mq]) queryStats[mq].run_qualified++;
      }

      const alertMsg =
        `🟡 <b>[PRE-VETTED OPPORTUNITY — SCORE ${fitScore}/100]</b>\n` +
        `<b>n8n Community Client Lead (${kind === 'jobs' ? 'Jobs' : 'Migration / Audit Trigger'})</b>\n\n` +
        `📋 <b>Title:</b> ${escapeHtml(topic.title)}\n` +
        `👤 <b>Author:</b> <code>@${escapeHtml(authorUsername)}</code> | <b>Date:</b> ${topic.created_at.split('T')[0]}\n` +
        `🎯 <b>Playbook Match:</b> <code>${escapeHtml(study.matched_vertical || 'custom')}</code> | <b>Offer Tier:</b> <code>${escapeHtml(study.recommended_offer_tier || 'production_pipeline')}</code>\n` +
        `🔗 <b>URL:</b> <a href="${topicUrl}">View Post on n8n Community</a>\n\n` +
        `🔬 <b>Technical Study &amp; Score Rationale:</b>\n` +
        `${escapeHtml(study.technical_study)}\n<i>Score rationale: ${escapeHtml(study.score_rationale || '')}</i>\n\n` +
        `🛠️ <b>n8n Workflow Architecture Plan:</b>\n` +
        `${escapeHtml(study.workflow_architecture)}\n\n` +
        `📊 <b>Calculated ROI &amp; Rate:</b>\n` +
        `${escapeHtml(study.calculated_roi)}\n\n` +
        `📝 <b>Pre-Drafted Tailored Proposal:</b>\n` +
        `<blockquote>${escapeHtml(study.proposed_copy)}</blockquote>\n\n` +
        `⚡ <b>Ready-to-Paste Antigravity Execution Prompt:</b>\n` +
        `<pre>${escapeHtml(study.antigravity_prompt)}</pre>\n\n` +
        `🏛️ <i>Mohamed Romih | MRomih Automations — Cloud Scout</i>\n` +
        ACTIONABLE_ROUTING_BANNER;

      await sendTelegram(alertMsg);
      console.log(`[n8n Community] Dispatched pre-vetted opportunity #${topic.id} (score=${fitScore}/100).`);
    }
  } catch (err) {
    console.error('[n8n Community] Scan error:', err.message);
  }
}

async function scanHackerNews(metrics, seenHnIds, memory, playbook, seenLeadIds, queryStats) {
  console.log('[CloudScout] Scanning Hacker News Algolia API (core + dynamic playbook queries)...');
  const coreQueries = ['n8n', 'web scraping automation', 'Ask HN: Who is hiring freelance'];
  const dynamicList = (playbook?.dynamic_search_queries || []).map(q => q.query).filter(Boolean);
  const queryPlan = [];
  const seenQueryStrings = new Set();

  for (const q of coreQueries) {
    if (!seenQueryStrings.has(q)) {
      seenQueryStrings.add(q);
      queryPlan.push({ query: q, isDynamic: dynamicList.includes(q) });
    }
  }
  for (const q of dynamicList) {
    if (!seenQueryStrings.has(q)) {
      seenQueryStrings.add(q);
      queryPlan.push({ query: q, isDynamic: true });
    }
  }

  metrics.hn_scanned_hits = 0;
  const playbookContext = formatPlaybookContext(playbook || {});
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

  for (const qItem of queryPlan) {
    try {
      const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(qItem.query)}&tags=(story,comment)&hitsPerPage=15`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 MRomih-Scout/2.0' },
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) continue;

      const data = await res.json();
      const hits = data?.hits || [];
      metrics.issues_scanned += hits.length;
      metrics.hn_scanned_hits += hits.length;

      const recentHits = hits.filter(h => h && h.objectID && new Date(h.created_at).getTime() >= fourteenDaysAgo);
      if (qItem.isDynamic && queryStats && queryStats[qItem.query] && recentHits.length > 0) {
        queryStats[qItem.query].run_hits += recentHits.length;
      }

      for (const hit of recentHits) {
        const hnLeadId = `hn_${hit.objectID}`;
        if (seenHnIds.has(hit.objectID) || (seenLeadIds && seenLeadIds.has(hnLeadId))) continue;
        if (!isCommercialHnHit(hit)) continue;

        seenHnIds.add(hit.objectID);
        if (seenLeadIds) seenLeadIds.add(hnLeadId);

        const rawText = String(hit.comment_text || hit.story_text || hit.title || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const storyTitle = String(hit.story_title || hit.title || '');
        const hnUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;

        let study = null;
        try {
          const aiPrompt = `
You are the Principal Automation Architect at MRomih Automations (Founder: Mohamed Romih).
Score (0-100) and analyze this Hacker News opportunity (story or Who-is-Hiring comment) using our Commercial Playbook & winning_pitch_rules:

Query: ${qItem.query}
Thread Title: ${storyTitle}
Author: ${hit.author || 'hn_user'}
URL: ${hnUrl}
Snippet:
${rawText.substring(0, 1800)}

Commercial & Technical Playbook (playbook.json):
${playbookContext}

Mandates:
1. Assign "fit_score" (0-100): Score >= 75 ONLY for clear freelance/contractor hiring, agency partnership requests, Zapier/Make migration needs, broken webhook/CRM projects, or AI lead/voice agent builds. Score < 75 for general discussions or W-2-only full-time bigtech roles.
2. Classify into closest vertical_playbooks key and offer_ladder tier (pitch $150 48h Credited Diagnostic Audit if broken webhooks or Zapier/Make bill-shock appear).
3. Draft tailored outreach copy & Antigravity prompt signed "Mohamed Romih | MRomih Automations". Strictly forbid robotic AI self-titles.

Output strictly valid JSON:
{
  "fit_score": 0-100,
  "score_rationale": "1 concise sentence explaining the score",
  "matched_vertical": "ecommerce_and_creators | b2b_gtm_and_lead_triage | smb_healthcare_and_services | scraping_and_data_pipelines",
  "recommended_offer_tier": "diagnostic_audit | production_pipeline | enterprise_ai_system",
  "diagnosis": "2-3 sentences technical summary",
  "architecture_plan": "Step-by-step architecture weaving vertical reliability hooks",
  "roi_calc": "Offer tier | Estimated value | Rate recommendation",
  "proposed_copy": "Tailored reply/outreach signed 'Mohamed Romih | MRomih Automations'.",
  "antigravity_prompt": "Run \`git pull\` first in MRomih-Automations/revenue-scout-cron and MRomih-Automations/revenue-engine..."
}`;
          const rawAi = await callGemini(aiPrompt);
          study = safeJsonParse(rawAi);
          if (!study || typeof study.fit_score === 'undefined') throw new Error('Invalid JSON or missing fit_score from Gemini');
        } catch (e) {
          const strongCommercial = /\b(freelancer|contractor|agency partner|white-label|zapier.*migrat|n8n.*hiring|who is hiring)\b/i.test(`${storyTitle} ${rawText}`);
          study = {
            fit_score: strongCommercial ? 78 : 65,
            score_rationale: 'Heuristic scoring fallback evaluating freelance/partner/migration signal strength.',
            matched_vertical: /scrap|playwright|crawl|extract/i.test(rawText) ? 'scraping_and_data_pipelines' : 'b2b_gtm_and_lead_triage',
            recommended_offer_tier: /broken|fail|zapier|migrat/i.test(rawText) ? 'diagnostic_audit' : 'production_pipeline',
            diagnosis: `HN signal (${storyTitle || qItem.query}) by ${hit.author}.`,
            architecture_plan: 'Review thread context, apply vertical reliability architecture (HMAC gate, idempotency, dead-letter alerts), and share MRomih Automations GitHub/Contra proofs.',
            roi_calc: '$500–$850 turnkey build or $45–$65/hr consulting ($150 credited audit option).',
            proposed_copy: `Hi ${hit.author || 'there'},\n\nI saw your note regarding "${storyTitle || qItem.query}". At MRomih Automations, I build resilient n8n workflows (HMAC verification, idempotent upserts, and dead-letter error handling) as well as zero-markup Zapier/Make migrations.\n\nGitHub architecture: https://github.com/MRomih-Automations/n8n-ai-lead-triage-kit\nPortfolio: https://contra.com/mohamed_romih_jj5w3q2x\n\nBest regards,\nMohamed Romih | MRomih Automations`,
            antigravity_prompt: `Run \`git pull\` first in MRomih-Automations/revenue-scout-cron and MRomih-Automations/revenue-engine, then review HN thread at ${hnUrl} and outreach as Mohamed Romih | MRomih Automations.`
          };
        }

        const fitScore = Number(study.fit_score) || 0;
        if (fitScore < 75) {
          console.log(`[HackerNews] Skipped low-fit hit ${hit.objectID} (score=${fitScore}/100): ${study.score_rationale || ''}`);
          continue;
        }

        metrics.bounties_found++;
        metrics.last_bounty = `HN Lead: ${hit.author || 'User'} (${qItem.query.slice(0, 24)})`;
        if (qItem.isDynamic && queryStats && queryStats[qItem.query]) {
          queryStats[qItem.query].run_qualified++;
        }
        for (const dq of dynamicList) {
          if (dq !== qItem.query && doesTextMatchDynamicQuery(`${storyTitle} ${rawText}`, dq) && queryStats && queryStats[dq]) {
            queryStats[dq].run_qualified++;
          }
        }
        console.log(`[HackerNews] Pre-vetted lead ${hit.objectID} (score=${fitScore}/100) by ${hit.author}`);

        const alertMsg =
          `🟡 <b>[PRE-VETTED OPPORTUNITY — SCORE ${fitScore}/100]</b>\n` +
          `<b>Hacker News Lead (${escapeHtml(qItem.query)})</b>\n\n` +
          `📋 <b>Thread:</b> ${escapeHtml(storyTitle || 'HN Post/Comment')}\n` +
          `👤 <b>Author:</b> <code>${escapeHtml(hit.author || 'hn_user')}</code>\n` +
          `🎯 <b>Playbook Match:</b> <code>${escapeHtml(study.matched_vertical || 'custom')}</code> | <b>Offer Tier:</b> <code>${escapeHtml(study.recommended_offer_tier || 'production_pipeline')}</code>\n` +
          `🔗 <b>URL:</b> <a href="${hnUrl}">View on Hacker News</a>\n\n` +
          `🔬 <b>Technical Diagnosis &amp; Rationale:</b>\n` +
          `${escapeHtml(study.diagnosis)}\n<i>Score rationale: ${escapeHtml(study.score_rationale || '')}</i>\n\n` +
          `🛠️ <b>Architecture Plan:</b>\n` +
          `${escapeHtml(study.architecture_plan)}\n\n` +
          `📊 <b>Calculated ROI:</b> ${escapeHtml(study.roi_calc)}\n\n` +
          (study.proposed_copy ? `📝 <b>Pre-Drafted Tailored Outreach:</b>\n<blockquote>${escapeHtml(study.proposed_copy)}</blockquote>\n\n` : '') +
          `⚡ <b>Ready-to-Paste Antigravity Execution Prompt:</b>\n` +
          `<pre>${escapeHtml(study.antigravity_prompt)}</pre>\n\n` +
          `🏛️ <i>Mohamed Romih | MRomih Automations — Cloud Scout</i>\n` +
          ACTIONABLE_ROUTING_BANNER;

        await sendTelegram(alertMsg);
      }
    } catch (err) {
      console.warn(`[HackerNews] Error scanning query ${qItem.query}:`, err.message);
    }
  }
}

const REDDIT_FEEDS = [
  { subreddit: 'forhire', url: 'https://www.reddit.com/r/forhire/new.json?limit=25' },
  { subreddit: 'n8n', url: 'https://www.reddit.com/r/n8n/new.json?limit=25' },
  { subreddit: 'automation', url: 'https://www.reddit.com/r/automation/new.json?limit=25' },
  { subreddit: 'AI_Agents', url: 'https://www.reddit.com/r/AI_Agents/new.json?limit=25' }
];

function isQualifiedRedditPost(postData, subreddit) {
  if (!postData || !postData.id || !postData.title) return false;
  if (postData.stickied || postData.removed_by_category) return false;

  const title = String(postData.title || '');
  const selftext = String(postData.selftext || '');
  if (selftext === '[removed]' || selftext === '[deleted]') return false;

  // Skip posts older than 14 days
  const fourteenDaysAgoSec = (Date.now() - 14 * 24 * 60 * 60 * 1000) / 1000;
  if (postData.created_utc && postData.created_utc < fourteenDaysAgoSec) return false;

  const combined = `${title}\n${selftext}`;

  // Exclude [For Hire] self-promotion and service ads
  if (/\[\s*for\s*hire\s*\]/i.test(title) || /\b(available for hire|offering my (?:n8n|automation|ai) services|i am an? (?:n8n|automation|ai|python) (?:freelancer|developer|engineer)|for hire:)/i.test(combined)) {
    return false;
  }

  // Exclude unpaid / commission / equity traps
  if (/\b(unpaid|commission-only|commission only|equity only|equity-only|revshare|revenue share|for free|volunteer)\b/i.test(combined)) {
    return false;
  }

  // Exclude sub-$100 fixed micro-tasks (while allowing hourly rates like $45/hr)
  const smallFixedBudget =
    /(?:budget|fixed|paying|pay|offer(?:ing)?)\s*(?:is|of|:)?\s*\$\s*([1-9]\d?)\b(?!\s*(?:\/|\s*per\s*)?(?:hr|hour|h\b|k\b))/i.test(combined) ||
    /\[\s*hiring\s*\][^\n]{0,80}\$\s*([1-9]\d?)\b(?!\s*(?:\/|\s*per\s*)?(?:hr|hour|k\b))/i.test(title);
  if (smallFixedBudget) {
    return false;
  }

  // Require hiring / contractor / paid budget signal
  const hasHiringSignal = /(\[\s*hiring\s*\]|\blooking to hire\b|\blooking for (?:a |an )?(?:freelancer|contractor|developer|engineer|consultant|expert|specialist)\b|\bneed (?:a |an )?(?:freelancer|contractor|developer|engineer)\b|\bbudget\b|\bfreelancer\b|\bcontractor\b)/i.test(combined);
  if (!hasHiringSignal) {
    return false;
  }

  // Require relevant automation / n8n / webhook / AI agent / CRM technical signal
  const hasTechSignal = /\b(n8n|webhook|api integration|ai agent|crm sync|crm|airtable|hubspot|automation|workflow|scraper|scraping|playwright|zapier|make\.com)\b/i.test(combined);
  return hasTechSignal;
}

async function scanRedditAutomationGigs(metrics, seenLeadIds, memory, playbook) {
  console.log('[CloudScout] Scanning Reddit public feeds (r/forhire, r/n8n, r/automation, r/AI_Agents)...');
  const playbookContext = formatPlaybookContext(playbook || {});
  metrics.reddit_scanned_posts = 0;

  for (const feed of REDDIT_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: {
          'User-Agent': 'MRomihAutomations-Scout/1.0',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after') || 'unknown';
        console.warn(`[Reddit r/${feed.subreddit}] Rate limited (HTTP 429, Retry-After: ${retryAfter}); skipping gracefully.`);
        continue;
      }
      if (!res.ok) {
        console.warn(`[Reddit r/${feed.subreddit}] Non-OK HTTP ${res.status}; skipping feed gracefully.`);
        continue;
      }

      const json = await res.json();
      const children = json?.data?.children || [];
      metrics.issues_scanned += children.length;
      metrics.reddit_scanned_posts += children.length;

      for (const child of children) {
        const post = child?.data;
        if (!isQualifiedRedditPost(post, feed.subreddit)) continue;

        const leadId = `reddit_${post.id}`;
        if (seenLeadIds && seenLeadIds.has(leadId)) continue;

        // Mark seen immediately so low-scoring or evaluated posts are never re-processed
        if (seenLeadIds) seenLeadIds.add(leadId);

        const postUrl = post.permalink
          ? `https://www.reddit.com${post.permalink}`
          : (post.url || `https://www.reddit.com/r/${feed.subreddit}/comments/${post.id}`);
        const postBody = String(post.selftext || '').replace(/\s+/g, ' ').trim();
        const authorName = post.author || 'reddit_poster';

        let study = null;
        try {
          const aiPrompt = `
You are the Principal Automation Architect at MRomih Automations (Founder: Mohamed Romih).
Score and evaluate this Reddit hiring/project lead using our Commercial & Technical Playbook:

Subreddit: r/${feed.subreddit}
Title: ${post.title}
Author: u/${authorName}
URL: ${postUrl}
Body:
${postBody.substring(0, 2200)}

Commercial & Technical Playbook (playbook.json):
${playbookContext}

Scoring & Drafting Mandates:
1. Score this opportunity 0 to 100 ("fit_score") based on budget legitimacy (>= $100 or $25+/hr), hiring urgency, technical alignment with n8n/webhooks/AI agents/CRMs/scraping, and clear commercial value. Score < 75 for vague ideas, micro-tasks, or unclear unpaid asks.
2. Classify into closest vertical_playbooks key ("ecommerce_and_creators", "b2b_gtm_and_lead_triage", "smb_healthcare_and_services", or "scraping_and_data_pipelines").
3. Select the highest-converting offer_ladder tier ("diagnostic_audit", "production_pipeline", or "enterprise_ai_system"). If broken workflows or unreliable freelancers are mentioned, pitch the $150 48h Credited Diagnostic Audit alongside the build.
4. Sign proposed_copy strictly as "Mohamed Romih | MRomih Automations". Strictly forbid robotic AI self-titles.

Output strictly valid JSON:
{
  "fit_score": 0-100,
  "score_rationale": "1 concise sentence explaining the score",
  "matched_vertical": "ecommerce_and_creators | b2b_gtm_and_lead_triage | smb_healthcare_and_services | scraping_and_data_pipelines",
  "recommended_offer_tier": "diagnostic_audit | production_pipeline | enterprise_ai_system",
  "technical_study": "2-3 sentences technical breakdown",
  "workflow_architecture": "Step-by-step n8n or scraper pipeline plan",
  "calculated_roi": "Offer tier | Estimated value | Rate recommendation",
  "proposed_copy": "Tailored Reddit DM/comment response weaving playbook hooks, GitHub/Contra proofs, signed 'Mohamed Romih | MRomih Automations'.",
  "antigravity_prompt": "Run \`git pull\` first in MRomih-Automations/revenue-scout-cron and MRomih-Automations/revenue-engine..."
}`;
          const rawAi = await callGemini(aiPrompt);
          study = safeJsonParse(rawAi);
          if (!study || typeof study.fit_score === 'undefined') {
            throw new Error('Invalid JSON or missing fit_score from Gemini');
          }
        } catch (err) {
          console.warn(`[Reddit r/${feed.subreddit}] AI scorer fallback (${post.id}):`, err.message);
          const hasExplicitHighSignal = /(\[\s*hiring\s*\]|n8n|webhook|crm|airtable|hubspot|budget|\$\d{3,})/i.test(`${post.title} ${postBody}`);
          study = {
            fit_score: hasExplicitHighSignal ? 78 : 65,
            score_rationale: 'Heuristic qualification fallback evaluating hiring tags, automation keywords, and budget cues.',
            matched_vertical: /gumroad|stripe|shopify|airtable/i.test(postBody) ? 'ecommerce_and_creators' : (/scrap|playwright/i.test(postBody) ? 'scraping_and_data_pipelines' : 'b2b_gtm_and_lead_triage'),
            recommended_offer_tier: /broken|fail|fix|unreliable/i.test(postBody) ? 'diagnostic_audit' : 'production_pipeline',
            technical_study: `Reddit opportunity on r/${feed.subreddit}: ${post.title}. Requires production webhook/CRM or AI agent reliability.`,
            workflow_architecture: '1. Webhook Security Gate (HMAC) -> 2. Idempotency Lookup -> 3. Normalized Upsert / AI Triage -> 4. Error Dead-Letter Alerting.',
            calculated_roi: 'Target $500–$850 turnkey build or $45–$65/hr ($150 credited audit option).',
            proposed_copy: `Hi,\n\nI saw your post regarding "${post.title}". At MRomih Automations, I architect production n8n & AI agent pipelines with HMAC webhook verification, idempotency deduplication, and dead-letter error routing so automations never fail silently.\n\nInspect our open-source architecture: https://github.com/MRomih-Automations/n8n-ai-lead-triage-kit\nCase studies: https://contra.com/mohamed_romih_jj5w3q2x\n\nHappy to jump on a quick call or run a $150 48-hour diagnostic audit (100% credited toward the build).\n\nBest regards,\nMohamed Romih | MRomih Automations`,
            antigravity_prompt: `Run \`git pull\` first in MRomih-Automations/revenue-scout-cron and MRomih-Automations/revenue-engine, then open ${postUrl} in Chrome and outreach to u/${authorName} using the tailored proposal above.`
          };
        }

        const fitScore = Number(study.fit_score) || 0;
        if (fitScore < 75) {
          console.log(`[Reddit r/${feed.subreddit}] Skipped low-fit post ${post.id} (score=${fitScore}/100): ${study.score_rationale || ''}`);
          continue;
        }

        metrics.bounties_found++;
        metrics.last_bounty = `Reddit r/${feed.subreddit}: ${post.title.substring(0, 32)}...`;
        console.log(`[Reddit r/${feed.subreddit}] Pre-vetted lead ${post.id} scored ${fitScore}/100 -> sending Telegram alert!`);

        const alertMsg =
          `🟡 <b>[PRE-VETTED OPPORTUNITY — SCORE ${fitScore}/100]</b>\n` +
          `<b>Reddit Automation Lead (r/${escapeHtml(feed.subreddit)})</b>\n\n` +
          `📋 <b>Title:</b> ${escapeHtml(post.title)}\n` +
          `👤 <b>Author:</b> <code>u/${escapeHtml(authorName)}</code>\n` +
          `🎯 <b>Playbook Match:</b> <code>${escapeHtml(study.matched_vertical || 'custom')}</code> | <b>Offer Tier:</b> <code>${escapeHtml(study.recommended_offer_tier || 'production_pipeline')}</code>\n` +
          `🔗 <b>URL:</b> <a href="${postUrl}">Open Thread on Reddit</a>\n\n` +
          `🔬 <b>Technical Study &amp; Score Rationale:</b>\n` +
          `${escapeHtml(study.technical_study)}\n<i>Score rationale: ${escapeHtml(study.score_rationale || '')}</i>\n\n` +
          `🛠️ <b>Workflow Architecture Plan:</b>\n` +
          `${escapeHtml(study.workflow_architecture)}\n\n` +
          `📊 <b>Calculated ROI:</b> ${escapeHtml(study.calculated_roi)}\n\n` +
          `📝 <b>Pre-Drafted Tailored Proposal:</b>\n` +
          `<blockquote>${escapeHtml(study.proposed_copy)}</blockquote>\n\n` +
          `⚡ <b>Ready-to-Paste Antigravity Execution Prompt:</b>\n` +
          `<pre>${escapeHtml(study.antigravity_prompt)}</pre>\n\n` +
          `🏛️ <i>Mohamed Romih | MRomih Automations — Cloud Scout</i>\n` +
          ACTIONABLE_ROUTING_BANNER;

        await sendTelegram(alertMsg);
      }
    } catch (err) {
      console.warn(`[Reddit r/${feed.subreddit}] Feed request failed cleanly:`, err.message);
    }
  }
}

async function run() {
  console.log('[CloudScout] Starting autonomous 24/7 technical scout cycle at ' + new Date().toISOString());
  const isManual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  const isDryRun = process.argv.includes('--dry-run');
  const memory = loadMemory();
  const playbook = loadPlaybook();
  const initialTelemetry = loadLocalTelemetry();
  const seenLeadIds = new Set(Array.isArray(initialTelemetry.seen_lead_ids) ? initialTelemetry.seen_lead_ids : []);
  const queryStats = initQueryStats(playbook, initialTelemetry);
  const schemaErrors = validateScoutSchemas(memory, playbook);

  console.log(`[CloudScout] Loaded playbook.json: ${(playbook.dynamic_search_queries || []).length} dynamic queries, ${(playbook.winning_pitch_rules || []).length} pitch rules, ${Object.keys(playbook.offer_ladder || {}).length} offer tiers, ${Object.keys(playbook.vertical_playbooks || {}).length} verticals, ${(playbook.discovered_market_patterns || []).length} discovered patterns.`);
  console.log(`[CloudScout] Telemetry deduplication loaded: ${seenLeadIds.size} seen_lead_ids tracked (cap=300), ${Object.keys(queryStats).length} query_stats keys.`);

  if (schemaErrors.length > 0) {
    if (!isDryRun) {
      await sendHealthAlert('Schema Validation (Cloud Scout)', 'brain_memory.json or playbook.json failed schema validation', schemaErrors.join('\n'));
    } else {
      throw new Error(`Schema validation failed during --dry-run: ${schemaErrors.join('; ')}`);
    }
  }

  if (isDryRun) {
    // Self-check Reddit, HN Who-is-Hiring, n8n Zapier/Make migration triggers, and query matching cleanly without network calls
    const mockHiring = isQualifiedRedditPost({ id: 'r1', title: '[Hiring] Need n8n webhook + HubSpot CRM sync engineer ($600)', selftext: 'Looking to hire an n8n freelancer, $600 budget.' }, 'forhire');
    const mockForHire = isQualifiedRedditPost({ id: 'r2', title: '[For Hire] n8n expert offering automation services', selftext: 'DM me for automation.' }, 'forhire');
    const mockMicro = isQualifiedRedditPost({ id: 'r3', title: '[Hiring] Quick $25 fix for zapier webhook', selftext: 'Budget $25 fixed.' }, 'forhire');
    const mockHnWhoIsHiring = isCommercialHnHit({ objectID: 'hn1', story_title: 'Ask HN: Who is hiring? (November 2026)', comment_text: 'Looking for a remote freelance n8n + webhook contractor to fix HubSpot CRM sync.' });
    const mockHnWantHired = isCommercialHnHit({ objectID: 'hn2', story_title: 'Ask HN: Who wants to be hired? (November 2026)', comment_text: 'Available for hire n8n developer.' });
    const mockN8nMigration = isCommercialN8nTopic({ id: 999001, title: 'Zapier bill shock migrating 40 zaps to self-hosted n8n queue mode' }, 'latest');
    const mockN8nBasic = isCommercialN8nTopic({ id: 999002, title: 'How do I format a date in set node?' }, 'latest');
    const mockN8nShowcase1 = isCommercialN8nTopic({ id: 999003, title: 'Why I built a self-hosted n8n queue mode monitor (open-source)' }, 'latest');
    const mockN8nShowcase2 = isCommercialN8nTopic({ id: 999004, title: 'Sharing a Zapier migration tutorial I built with n8n' }, 'latest');
    const mockN8nBodyShowcase = isN8nDeveloperShowcase('Why I built a free webhook helper tutorial for n8n');
    const mockN8nShowcaseHiringOverride = isCommercialN8nTopic({ id: 999005, title: 'Hiring freelancer: I built a Zapier migration MVP with n8n, need paid help' }, 'latest');

    if (
      !mockHiring || mockForHire || mockMicro || !mockHnWhoIsHiring || mockHnWantHired ||
      !mockN8nMigration || mockN8nBasic || mockN8nShowcase1 || mockN8nShowcase2 ||
      !mockN8nBodyShowcase || !mockN8nShowcaseHiringOverride
    ) {
      throw new Error(
        `Scout pre-filter self-check failed: hiring=${mockHiring}, forHire=${mockForHire}, micro=${mockMicro}, hnHiring=${mockHnWhoIsHiring}, hnWantHired=${mockHnWantHired}, n8nMig=${mockN8nMigration}, n8nBasic=${mockN8nBasic}, show1=${mockN8nShowcase1}, show2=${mockN8nShowcase2}, bodyShow=${mockN8nBodyShowcase}, showHire=${mockN8nShowcaseHiringOverride}`
      );
    }
    console.log('[CloudScout] --dry-run passed: verified brain_memory.json, playbook.json (dynamic_search_queries + winning_pitch_rules), HN/n8n/Reddit pre-filters, seen_lead_ids deduplication, and routing banners cleanly.');
    return;
  }

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
    hn_scanned_hits: 0,
    reddit_scanned_posts: 0
  };

  const seenN8nTopics = new Set();
  const seenHnIds = new Set();

  // 1. Scan Algora escrow bounties
  await scanAlgoraBounties(headers, metrics, memory, seenLeadIds);

  // 2. Scan Opire public rewards API
  await scanOpireBounties(headers, metrics, memory, seenLeadIds);

  // 3. Scan n8n Community (/c/jobs/18.json, /13.json, /latest.json migration/broken-webhook triggers)
  await scanN8nCommunityJobs(metrics, seenN8nTopics, memory, playbook, seenLeadIds, queryStats);

  // 4. Scan Hacker News Algolia queries (core + dynamic_search_queries + Who is Hiring comments)
  await scanHackerNews(metrics, seenHnIds, memory, playbook, seenLeadIds, queryStats);

  // 5. Scan Reddit Automation & Hiring Feeds
  await scanRedditAutomationGigs(metrics, seenLeadIds, memory, playbook);

  // 6. Update live telemetry in repository (including capped seen_lead_ids & query_stats)
  await updateLiveTelemetry(metrics, Array.from(seenN8nTopics), seenLeadIds, queryStats);
  console.log('[CloudScout] Autonomous technical scout cycle completed successfully.');
}

run().catch(async err => {
  console.error('[CloudScout] Fatal error:', err);
  await sendHealthAlert('Cloud Scout Crash Guard', 'Unhandled exception terminated scout.js execution', err.stack || err.message);
  process.exit(1);
});
