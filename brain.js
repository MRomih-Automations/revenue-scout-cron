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
const GH_PAT = process.env.GH_PAT;

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function loadMemory() {
  const memPath = path.join(__dirname, 'brain_memory.json');
  if (fs.existsSync(memPath)) {
    try {
      return JSON.parse(fs.readFileSync(memPath, 'utf8'));
    } catch (e) {
      console.warn('[CEO Brain] Error parsing brain_memory.json:', e.message);
    }
  }
  return {
    schema_version: '2.0.0',
    last_updated: new Date().toISOString(),
    agency: { name: 'MRomih Automations', founder: 'Mohamed Romih' },
    storefronts: {},
    operating_rules: [],
    platform_schedules: {},
    active_deal_pipeline: [],
    published_templates: [],
    analyzed_trends: [],
    past_directives: [],
    learned_rules: []
  };
}

function saveMemory(mem) {
  const memPath = path.join(__dirname, 'brain_memory.json');
  mem.last_updated = new Date().toISOString();
  fs.writeFileSync(memPath, JSON.stringify(mem, null, 2), 'utf8');
  console.log('💾 [CEO Brain] Persistent memory ledger saved.');
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

async function fetchN8nJobs() {
  try {
    const res = await fetch('https://community.n8n.io/c/jobs/13.json', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MRomih-CEO-Brain/1.0' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const topics = data?.topic_list?.topics || [];
    return topics
      .filter(isGenuineN8nJob)
      .slice(0, 15)
      .map(t => ({
        id: t.id,
        title: t.title,
        created_at: t.created_at,
        views: t.views,
        posts_count: t.posts_count,
        url: `https://community.n8n.io/t/${t.slug || t.id}/${t.id}`
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

async function fetchRepoTemplates() {
  const owner = 'MRomih-Automations';
  const repo = 'n8n-ai-lead-triage-kit';
  const headers = {
    'User-Agent': 'CEO-Brain-Auditor',
    'Accept': 'application/vnd.github.v3+json'
  };
  if (GH_PAT) headers['Authorization'] = 'token ' + GH_PAT;

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/templates`, { headers });
    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items)) {
        return items.filter(i => i.type === 'dir').map(i => i.name);
      }
    }
    const rootRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers });
    if (rootRes.ok) {
      const rootItems = await rootRes.json();
      if (Array.isArray(rootItems)) {
        return rootItems.map(i => i.name);
      }
    }
    return [];
  } catch (err) {
    console.warn('[CEO Brain] Error fetching repo templates:', err.message);
    return [];
  }
}

function evaluateGovernanceSchedules(memory, repoTemplates = []) {
  const now = new Date();
  const schedules = memory.platform_schedules || {};
  const scheduleStatus = {};
  const dueBrowserSchedules = [];

  for (const [key, sched] of Object.entries(schedules)) {
    const last = sched.last_checked ? new Date(sched.last_checked) : new Date(0);
    const intervalMs = (sched.interval_days || 7) * 24 * 60 * 60 * 1000;
    const nextDue = new Date(last.getTime() + intervalMs);
    const isDue = now >= nextDue;
    const daysSince = ((now - last) / (24 * 60 * 60 * 1000)).toFixed(1);

    scheduleStatus[key] = {
      name: sched.name,
      interval_days: sched.interval_days,
      last_checked: sched.last_checked,
      next_due: nextDue.toISOString(),
      is_due: isDue,
      days_since: daysSince
    };

    if (isDue && key !== 'github_lead_magnet_expansion') {
      dueBrowserSchedules.push({
        id: key,
        name: sched.name,
        interval_days: sched.interval_days,
        days_since: daysSince,
        description: sched.description
      });
    }
  }

  // Lead magnet condition: schedule is due OR fewer than 3 templates exist in repo
  const repoTemplateCount = repoTemplates.length;
  const leadMagnetSched = schedules.github_lead_magnet_expansion;
  const leadMagnetSchedDue = leadMagnetSched
    ? (now >= new Date(new Date(leadMagnetSched.last_checked || 0).getTime() + (leadMagnetSched.interval_days || 7) * 24 * 60 * 60 * 1000))
    : true;
  const leadMagnetDue = leadMagnetSchedDue || repoTemplateCount < 3;

  // Active deals timers
  const dueDeals = [];
  const activeDeals = memory.active_deal_pipeline || [];
  for (const deal of activeDeals) {
    if (deal.follow_up_due_at) {
      const dueAt = new Date(deal.follow_up_due_at);
      if (now >= dueAt) {
        dueDeals.push({
          id: deal.id,
          company: deal.company,
          contact_person: deal.contact_person,
          status: deal.status,
          target_profile: deal.target_profile,
          follow_up_due_at: deal.follow_up_due_at,
          follow_up_copy: deal.follow_up_copy
        });
      }
    }
  }

  return { scheduleStatus, dueBrowserSchedules, leadMagnetDue, repoTemplateCount, dueDeals };
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

async function commitLeadMagnetFile(filePath, contentStr, commitMessage) {
  if (!GH_PAT) {
    console.log('[Builder Mode] GH_PAT not configured, skipping GitHub commit.');
    return false;
  }
  const owner = 'MRomih-Automations';
  const repo = 'n8n-ai-lead-triage-kit';

  try {
    let sha = null;
    const existingRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      headers: {
        'Authorization': 'token ' + GH_PAT,
        'User-Agent': 'CEO-Brain-Builder',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (existingRes.ok) {
      const existing = await existingRes.json();
      sha = existing.sha;
    }

    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': 'token ' + GH_PAT,
        'User-Agent': 'CEO-Brain-Builder',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(contentStr).toString('base64'),
        sha: sha || undefined
      })
    });

    if (putRes.ok) {
      console.log(`✅ [Builder Mode] Committed ${filePath} to ${owner}/${repo}`);
      return true;
    } else {
      const err = await putRes.text();
      console.warn(`[Builder Mode] Failed to commit ${filePath}: ${err}`);
      return false;
    }
  } catch (err) {
    console.error(`[Builder Mode] Error committing ${filePath}:`, err.message);
    return false;
  }
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
    console.log(`✅ [CEO Brain] Telegram report delivered successfully! (Message ID: ${data.result.message_id})`);
  } else {
    console.error(`❌ [CEO Brain] Telegram error:`, data);
  }
}

async function run() {
  console.log('🧠 [CEO Brain] Initializing 24/7 Autonomous COO Strategic Execution Cycle...');

  const memory = loadMemory();
  const telemetry = await fetchTelemetry();
  const n8nJobs = await fetchN8nJobs();
  const opireBounties = await fetchOpireRewards();
  const repoTemplates = await fetchRepoTemplates();
  const governance = evaluateGovernanceSchedules(memory, repoTemplates);

  const prompt = `
You are the Autonomous Chief Operating Officer (COO) and Chief Technology Officer (CTO) for MRomih Automations (Founder: Mohamed Romih).
You run the agency 24/7 autonomously at $0 upfront budget across all platforms, client acquisition funnels, and schedules.

Agency Memory & Ledger:
- Storefronts: ${JSON.stringify(memory.storefronts, null, 2)}
- Operating Rules: ${JSON.stringify(memory.operating_rules, null, 2)}
- Active Deal Pipeline: ${JSON.stringify(memory.active_deal_pipeline, null, 2)}
- Published Templates Library: ${JSON.stringify(memory.published_templates, null, 2)}
- Recent Directives (DO NOT REPEAT): ${JSON.stringify((memory.past_directives || []).slice(-3), null, 2)}
- Learned Rules: ${JSON.stringify(memory.learned_rules || [], null, 2)}

Governance Schedules & Timers Status (Current UTC: ${new Date().toISOString()}):
- Platform Timers Status:
${Object.entries(governance.scheduleStatus).map(([k, s]) => `  * ${s.name} (${k}): Every ${s.interval_days}d | Last: ${s.last_checked} | Next Due: ${s.next_due} | Due Now: ${s.is_due ? 'YES ⚠️' : 'NO ✅'} (${s.days_since}d ago)`).join('\n')}
- Due Browser Platform Actions: ${governance.dueBrowserSchedules.length > 0 ? governance.dueBrowserSchedules.map(s => s.name).join(', ') : 'None'}
- Lead Magnet Expansion Due: ${governance.leadMagnetDue ? 'YES ⚠️ (Trigger Cloud Builder)' : 'NO ✅'} (Repo currently has ${governance.repoTemplateCount} templates: ${JSON.stringify(repoTemplates)})
- Active Deals Follow-Up Due: ${governance.dueDeals.length > 0 ? governance.dueDeals.map(d => `${d.company} (${d.contact_person})`).join(', ') : 'None (Steek Lab follow-up due on ' + (memory.active_deal_pipeline[0]?.follow_up_due_at || 'N/A') + ')'}

Live Market Intelligence:
- Scout Telemetry: ${JSON.stringify(telemetry)}
- Live Genuine n8n Jobs (${n8nJobs.length} active):
${n8nJobs.slice(0, 5).map(j => `  * [ID ${j.id}] "${j.title}" (${j.views} views, ${j.url})`).join('\n') || '  * None'}
- Verified Opire Bounties (${opireBounties.length} active):
${opireBounties.slice(0, 3).map(b => `  * ${b.amount} - ${b.issue_url}`).join('\n') || '  * None'}

Your Operating Mandates:
1. Cloud Autonomy & Open-Source Expansion:
   - If 'Lead Magnet Expansion Due' is YES (or fewer than 3 templates exist in 'n8n-ai-lead-triage-kit'), you MUST set "new_template_needed": true and generate a complete, sanitized, production-grade n8n workflow for a high-demand vertical (such as SMB appointment/VoIP reminders, QuickBooks invoice sync, or multi-channel lead routing). Include full workflow_json with real n8n nodes and complete readme_content.
2. Human + Antigravity Escalation Gate:
   - Check if any browser platform timer is due (${governance.dueBrowserSchedules.length > 0 ? 'YES' : 'NO'}), OR any active deal follow-up is due (${governance.dueDeals.length > 0 ? 'YES' : 'NO'}), OR a new genuine high-intent hiring lead appears in n8n community jobs requiring human application.
   - If YES, set "human_action_required": true, provide "governance_timers_triggered" with array of triggered schedule IDs (e.g. ["contra_jobs_sweep"]), and construct a complete, ready-to-copy Antigravity execution prompt starting with 'Run \`git pull\` first in MRomih-Automations/revenue-scout-cron and MRomih-Automations/revenue-engine...'.
   - If NO, set "human_action_required": false, "antigravity_prompt": null, and confirm "Zero human intervention required" in action_reason.
3. Active Pipeline: Steek Lab (François Hurstel). LinkedIn connection is PENDING. Follow-up is due at ${memory.active_deal_pipeline[0]?.follow_up_due_at || '48 hours post-connection'}. Do not advise reconnecting while pending.

Respond strictly in valid JSON format:
{
  "market_synthesis": "2-3 sentences diagnosing live demand clusters, platform schedules, and deal pipeline health.",
  "new_template_needed": true or false,
  "new_template": null or {
    "name": "Template Title",
    "slug": "template-slug",
    "category": "Category",
    "summary": "1-sentence summary",
    "readme_content": "# Markdown setup documentation...",
    "workflow_json": { "name": "...", "nodes": [], "connections": {} }
  },
  "human_action_required": true or false,
  "action_reason": "Explanation of why human PC action is or is not required",
  "governance_timers_triggered": ["schedule_id_if_triggered"],
  "antigravity_prompt": null or "Run \`git pull\` first...",
  "learned_insight": "A sharp, persistent operational insight or lesson to store in memory."
}
`;

  let analysis = null;
  try {
    const rawResponse = await callGemini(prompt);
    try {
      const cleanJson = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      analysis = JSON.parse(cleanJson);
    } catch (parseErr) {
      const synthMatch = rawResponse.match(/"market_synthesis"\s*:\s*"([\s\S]*?)(?=",\s*"(?:new_template_needed|human_action_required)")/i);
      const newTmplMatch = rawResponse.match(/"new_template_needed"\s*:\s*(true|false)/i);
      const actionReqMatch = rawResponse.match(/"human_action_required"\s*:\s*(true|false)/i);
      const reasonMatch = rawResponse.match(/"action_reason"\s*:\s*"([\s\S]*?)(?=",\s*"(?:governance_timers_triggered|antigravity_prompt)")/i);
      const promptMatch = rawResponse.match(/"antigravity_prompt"\s*:\s*"([\s\S]*?)(?=",\s*"learned_insight"|"\s*\})/i);
      const insightMatch = rawResponse.match(/"learned_insight"\s*:\s*"([\s\S]*?)(?="\s*\})/i);

      analysis = {
        market_synthesis: synthMatch ? synthMatch[1].replace(/\\n/g, '\n').trim() : 'Active monitoring of governance schedules, n8n Community, and Opire bounties ongoing.',
        new_template_needed: newTmplMatch ? newTmplMatch[1] === 'true' : false,
        new_template: null,
        human_action_required: actionReqMatch ? actionReqMatch[1] === 'true' : false,
        action_reason: reasonMatch ? reasonMatch[1].replace(/\\n/g, '\n').trim() : 'All governance schedules within operational window; pipeline on standby.',
        governance_timers_triggered: [],
        antigravity_prompt: promptMatch && promptMatch[1] !== 'null' ? promptMatch[1].replace(/\\n/g, '\n').trim() : null,
        learned_insight: insightMatch ? insightMatch[1].replace(/\\n/g, '\n').trim() : 'Autonomous governance schedules enforce steady operational cadence without manual polling.'
      };
    }
  } catch (err) {
    console.warn('[CEO Brain] AI generation fallback:', err.message);
    analysis = {
      market_synthesis: `Demand steady across ${n8nJobs.length} live n8n hiring topics. All ${Object.keys(governance.scheduleStatus).length} platform governance schedules monitored. Steek Lab ($20–$55/hr) connection pending on LinkedIn.`,
      new_template_needed: false,
      new_template: null,
      human_action_required: governance.dueBrowserSchedules.length > 0 || governance.dueDeals.length > 0,
      action_reason: (governance.dueBrowserSchedules.length > 0 || governance.dueDeals.length > 0)
        ? `Platform governance timers due: ${governance.dueBrowserSchedules.map(s => s.name).concat(governance.dueDeals.map(d => d.company)).join(', ')}.`
        : 'Zero human intervention required. All platform governance timers and background sentinels operating within window.',
      governance_timers_triggered: governance.dueBrowserSchedules.map(s => s.id),
      antigravity_prompt: null,
      learned_insight: 'Autonomous governance schedules preserve focus by batching platform audits into predictable cadences.'
    };
  }

  // 4. Autonomous Cloud Builder Mode: Commit new open-source template if proposed
  let builderReport = `Open-source library contains ${governance.repoTemplateCount} templates; zero new template commits required today.`;
  if (analysis.new_template_needed && analysis.new_template && analysis.new_template.slug) {
    const tmpl = analysis.new_template;
    const slug = tmpl.slug.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    console.log(`🔨 [Builder Mode] Building and committing new template: ${tmpl.name} (${slug})...`);

    const workflowContent = JSON.stringify(tmpl.workflow_json || { name: tmpl.name, nodes: [], connections: {} }, null, 2);
    const readmeContent = tmpl.readme_content || `# ${tmpl.name}\n\n${tmpl.summary}\n`;

    const workflowCommitted = await commitLeadMagnetFile(`templates/${slug}/workflow.json`, workflowContent, `feat(templates): add ${tmpl.name} sanitized n8n workflow`);
    const readmeCommitted = await commitLeadMagnetFile(`templates/${slug}/README.md`, readmeContent, `docs(templates): add setup documentation for ${tmpl.name}`);

    if (workflowCommitted || readmeCommitted) {
      builderReport = `✅ Autonomous Cloud Builder committed new template to <a href="https://github.com/MRomih-Automations/n8n-ai-lead-triage-kit">n8n-ai-lead-triage-kit</a>:\n• <b>${escapeHtml(tmpl.name)}</b> (<code>templates/${slug}</code>)`;
      memory.published_templates.push({
        name: tmpl.name,
        slug: slug,
        category: tmpl.category || 'Automation',
        added_at: new Date().toISOString(),
        summary: tmpl.summary || ''
      });
      if (memory.platform_schedules && memory.platform_schedules.github_lead_magnet_expansion) {
        memory.platform_schedules.github_lead_magnet_expansion.last_checked = new Date().toISOString();
      }
    }
  }

  // 5. Update Timers for Triggered Governance Schedules
  const triggeredTimers = Array.isArray(analysis.governance_timers_triggered) ? analysis.governance_timers_triggered : [];
  for (const timerId of triggeredTimers) {
    if (memory.platform_schedules && memory.platform_schedules[timerId]) {
      memory.platform_schedules[timerId].last_checked = new Date().toISOString();
      console.log(`⏱️ [CEO Brain] Updated timer for schedule: ${timerId}`);
    }
  }

  // 6. Update Memory Ledger
  memory.past_directives.push({
    timestamp: new Date().toISOString(),
    synthesis: (analysis.market_synthesis || '').substring(0, 150),
    action_required: analysis.human_action_required,
    reason: analysis.action_reason
  });
  if (memory.past_directives.length > 20) memory.past_directives = memory.past_directives.slice(-20);

  if (analysis.learned_insight && !memory.learned_rules.includes(analysis.learned_insight)) {
    memory.learned_rules.push(analysis.learned_insight);
    if (memory.learned_rules.length > 20) memory.learned_rules = memory.learned_rules.slice(-20);
  }

  saveMemory(memory);

  // 7. Update telemetry.json
  const updatedTelemetry = {
    ...telemetry,
    last_ceo_brain_timestamp: new Date().toISOString(),
    human_escalation_active: analysis.human_action_required,
    last_push_title: analysis.human_action_required ? (analysis.action_reason || 'Escalation').substring(0, 100) : 'Autonomous Standby',
    n8n_topics_scanned: n8nJobs.length,
    opire_rewards_scanned: opireBounties.length,
    templates_in_lead_magnet: governance.repoTemplateCount,
    active_governance_schedules: Object.keys(governance.scheduleStatus).length
  };
  fs.writeFileSync(path.join(__dirname, 'telemetry.json'), JSON.stringify(updatedTelemetry, null, 2), 'utf8');

  // 8. Format Governance Schedules Summary for Telegram
  const schedLines = Object.entries(governance.scheduleStatus).map(([k, s]) => {
    const nextDate = s.next_due ? s.next_due.split('T')[0] : 'Scheduled';
    const statusIcon = s.is_due ? '⚠️' : '✅';
    return `• ${statusIcon} <b>${escapeHtml(s.name)}:</b> ${s.is_due ? 'DUE NOW' : 'Next: ' + nextDate} (every ${s.interval_days}d)`;
  }).join('\n');

  // 9. Format and Dispatch Telegram Autonomous COO Report
  let telegramMessage = 
    `<b>🟢 [CEO BRAIN — AUTONOMOUS COO REPORT]</b>\n` +
    `<b>24/7 Operations & Cloud Governance Ledger</b>\n\n` +
    `📊 <b>Market & Deal Pipeline Synthesis:</b>\n` +
    `${escapeHtml(analysis.market_synthesis)}\n\n` +
    `⏱️ <b>Platform Governance Schedules:</b>\n` +
    `${schedLines}\n\n` +
    `🛠️ <b>Autonomous Cloud Builder Mode:</b>\n` +
    `${builderReport}\n\n` +
    `💡 <b>Learned Insight:</b>\n` +
    `<i>"${escapeHtml(analysis.learned_insight)}"</i>\n\n`;

  if (analysis.human_action_required && analysis.antigravity_prompt) {
    telegramMessage += 
      `🚨 <b>HUMAN + ANTIGRAVITY ACTION REQUIRED:</b>\n` +
      `<b>Reason:</b> ${escapeHtml(analysis.action_reason)}\n\n` +
      `⚡ <b>Ready-to-Use Antigravity Execution Prompt:</b>\n` +
      `<pre>${escapeHtml(analysis.antigravity_prompt)}</pre>\n\n`;
  } else {
    telegramMessage += 
      `🟢 <b>ALL SYSTEMS OPERATIONAL (STANDBY)</b>\n` +
      `<i>Zero human intervention required. All governance schedules and background sentinels operating autonomously in the cloud.</i>\n\n`;
  }

  telegramMessage += `🏛️ <i>MRomih Automations Autonomous Executive Board</i>`;

  await sendTelegramAlert(telegramMessage);
  console.log('✅ [CEO Brain] Autonomous COO cycle completed.');
}

run().catch(err => {
  console.error('Fatal error in CEO Brain:', err);
  process.exit(1);
});
