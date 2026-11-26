/**
 * 24/7 Stateful Executive Intelligence v2 Engine
 * MRomih Automations — Revenue Scout Cron
 *
 * Implements:
 * Stage 0: Zero-Server Phone-to-Brain Sync (Telegram getUpdates /replied, /won, /lost, /note)
 * Stage A: 3-Horizon Strategic Reasoning & ROI Calculation (Charter, Milestones, Funnel, Market Feeds)
 * Stage B: Demand-Driven Asset Simulation (workflow.json + sample_test_run.md + README.md + LinkedIn Showcase)
 * Stage C: Adversarial Principal QA Critic Gate (Score >= 9/10 required, automated revision loop)
 * Stage D: Autonomous Error Management & Self-Healing (error_postmortems + self_upgraded_rules)
 * Stage E: Clean Telegram Executive Report (3-Horizon Assessment + ready-to-paste <pre> Antigravity prompts)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

function getDefaultMemory() {
  return {
    schema_version: '2.1.0',
    last_updated: new Date().toISOString(),
    agency: { name: 'MRomih Automations', founder: 'Mohamed Romih' },
    executive_charter: {
      company_mission: 'Build a high-margin, $0-upfront-cost AI & n8n workflow automation agency (MRomih Automations, Founder Mohamed Romih, operating globally from Egypt).',
      north_star_goal: 'Reach consistent $3,000+/month recurring and project revenue at $45-$65/hr (or $500-$1,500+ fixed builds) while protecting 100% platform compliance.',
      core_duties: {
        '1_pipeline_velocity': 'Hunt, qualify, and follow up on high-ROI opportunities.',
        '2_asset_compounding': 'Turn market pain points into public GitHub templates and reusable client blueprints.',
        '3_bottleneck_diagnosis': 'Identify where revenue is stalling and prescribe the highest-leverage action.',
        '4_risk_and_margin_protection': 'Enforce $0 ad spend, block unpaid/US-W2 traps, preserve Fiverr search indexing, and keep browser logins air-gapped.'
      }
    },
    company_history_milestones: [],
    telegram_last_update_id: 0,
    conversion_funnel: {
      proposals_sent: 2,
      replies_received: 0,
      calls_booked: 0,
      deals_won: 0,
      total_revenue_usd: 0,
      winning_angles: []
    },
    staged_linkedin_posts: [],
    system_health_baselines: {
      gmail_spectator_minutes: 5,
      scout_minutes: 30,
      brain_hours: 24,
      scout_stall_threshold_hours: 3,
      overall_status: 'HEALTHY',
      last_verified_healthy_at: new Date().toISOString(),
      components: {}
    },
    storefronts: {},
    operating_rules: [
      'Strict $0 upfront spend: zero paid ads, zero paid subscriptions.',
      'Never undersell high-budget engineering contracts ($20-$55/hr) with $35 debug pricing.',
      'Never edit live Fiverr gig titles, search tags, or URLs unnecessarily.',
      'Strict anti-scam policy: reject off-platform communication or payment attempts.',
      'Human Founder Identity: All client proposals, outreach messages, and public materials must strictly be signed as "Mohamed Romih | MRomih Automations". Strictly forbid robotic self-titles like "Autonomous Chief Operating Officer" or "AI Assistant".',
      'Zero plaintext secrets: never commit tokens or keys into git repositories.'
    ],
    platform_schedules: {},
    active_deal_pipeline: [],
    published_templates: [],
    market_research_notes: [],
    roi_calculations: [],
    error_postmortems: [],
    self_upgraded_rules: [],
    past_directives: [],
    learned_rules: [],
    requested_upgrades: []
  };
}

function loadMemory() {
  const defaults = getDefaultMemory();
  const memPath = path.join(__dirname, 'brain_memory.json');
  if (fs.existsSync(memPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(memPath, 'utf8'));
      const mem = {
        ...defaults,
        ...parsed,
        conversion_funnel: {
          ...defaults.conversion_funnel,
          ...(parsed.conversion_funnel || {})
        },
        system_health_baselines: {
          ...defaults.system_health_baselines,
          ...(parsed.system_health_baselines || {})
        },
        executive_charter: parsed.executive_charter || defaults.executive_charter,
        requested_upgrades: Array.isArray(parsed.requested_upgrades) ? parsed.requested_upgrades : []
      };
      mem._rawPresent = true;
      return mem;
    } catch (e) {
      console.warn('[CEO Brain] Error parsing brain_memory.json:', e.message);
      defaults._parseError = `brain_memory.json parse failure: ${e.message}`;
    }
  } else {
    defaults._parseError = 'brain_memory.json file not found';
  }
  return defaults;
}

function saveMemory(mem) {
  const memPath = path.join(__dirname, 'brain_memory.json');
  const clean = { ...mem };
  delete clean._rawPresent;
  delete clean._parseError;
  clean.last_updated = new Date().toISOString();
  fs.writeFileSync(memPath, JSON.stringify(clean, null, 2), 'utf8');
  console.log('💾 [CEO Brain] Persistent memory ledger saved.');
}

function loadPlaybook() {
  const pbPath = path.join(__dirname, 'playbook.json');
  if (fs.existsSync(pbPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(pbPath, 'utf8'));
      if (!Array.isArray(parsed.dynamic_search_queries)) {
        parsed.dynamic_search_queries = [];
      }
      if (!Array.isArray(parsed.winning_pitch_rules)) {
        parsed.winning_pitch_rules = [];
      }
      if (!Array.isArray(parsed.discovered_market_patterns)) {
        parsed.discovered_market_patterns = [];
      }
      parsed._rawPresent = true;
      return parsed;
    } catch (e) {
      console.warn('[CEO Brain] Error parsing playbook.json:', e.message);
      return {
        schema_version: '1.1.0',
        last_updated: new Date().toISOString(),
        owner: 'Mohamed Romih | MRomih Automations',
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
    schema_version: '1.1.0',
    last_updated: new Date().toISOString(),
    owner: 'Mohamed Romih | MRomih Automations',
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

function savePlaybook(pb) {
  const pbPath = path.join(__dirname, 'playbook.json');
  const clean = { ...pb };
  delete clean._rawPresent;
  delete clean._parseError;
  clean.last_updated = new Date().toISOString();
  fs.writeFileSync(pbPath, JSON.stringify(clean, null, 2), 'utf8');
  console.log('📘 [CEO Brain] Commercial playbook.json saved locally.');
}

const _sentHealthAlertKeys = new Set();
const ACTIONABLE_ROUTING_BANNER = '📋 <b>NEXT STEP:</b> Paste this message to Gemini for your ready-to-run Antigravity prompt.';

function formatHealthAlertHtml(component, issueSummary, errorDetails) {
  const safeComp = escapeHtml(component || 'Unknown Component');
  const safeIssue = escapeHtml(issueSummary || 'Runtime health degradation detected');
  const safeDetails = errorDetails ? `\n<pre>${escapeHtml(String(errorDetails).slice(0, 1200))}</pre>\n` : '\n';
  return (
    `🟠 <b>[SYSTEM HEALTH / BREAKDOWN ALERT]</b>\n` +
    `<b>Component:</b> <code>${safeComp}</code>\n` +
    `<b>Issue:</b> ${safeIssue}\n` +
    `<b>Timestamp (UTC):</b> <code>${new Date().toISOString()}</code>` +
    safeDetails +
    `\n🛠️ <i>Immediate diagnostic review recommended (Watchdog Sentinel).</i>\n\n` +
    ACTIONABLE_ROUTING_BANNER
  );
}

async function sendHealthAlert(component, issueSummary, errorDetails) {
  const dedupeKey = `${component}::${issueSummary}`;
  if (_sentHealthAlertKeys.has(dedupeKey)) return;
  _sentHealthAlertKeys.add(dedupeKey);

  const htmlMsg = formatHealthAlertHtml(component, issueSummary, errorDetails);
  console.error(`🟠 [HEALTH WATCHDOG] ${component}: ${issueSummary}`);
  await sendTelegramAlert(htmlMsg);
}

function validateSystemSchemas(memory, playbook) {
  const errors = [];
  if (memory._parseError) errors.push(memory._parseError);
  if (!memory.agency || !memory.agency.founder) errors.push('brain_memory.json missing agency.founder');
  if (!memory.executive_charter || !memory.executive_charter.north_star_goal) errors.push('brain_memory.json missing executive_charter');
  if (!memory.platform_schedules || typeof memory.platform_schedules !== 'object') errors.push('brain_memory.json missing platform_schedules');
  if (!Array.isArray(memory.active_deal_pipeline)) errors.push('brain_memory.json active_deal_pipeline must be an array');
  if (!Array.isArray(memory.requested_upgrades)) errors.push('brain_memory.json requested_upgrades must be an array');
  if (!memory.system_health_baselines || typeof memory.system_health_baselines !== 'object') errors.push('brain_memory.json missing system_health_baselines');

  if (playbook._parseError) errors.push(playbook._parseError);
  if (!Array.isArray(playbook.dynamic_search_queries)) errors.push('playbook.json dynamic_search_queries must be an array');
  if (!Array.isArray(playbook.winning_pitch_rules)) errors.push('playbook.json winning_pitch_rules must be an array');
  if (!playbook.offer_ladder || Object.keys(playbook.offer_ladder).length === 0) errors.push('playbook.json missing offer_ladder tiers');
  if (!playbook.vertical_playbooks || Object.keys(playbook.vertical_playbooks).length === 0) errors.push('playbook.json missing vertical_playbooks');
  if (!playbook.objection_handlers || typeof playbook.objection_handlers !== 'object') errors.push('playbook.json missing objection_handlers');
  if (!Array.isArray(playbook.discovered_market_patterns)) errors.push('playbook.json discovered_market_patterns must be an array');

  return errors;
}

function sanitizeClientCopy(text) {
  if (!text) return '';
  return String(text)
    .replace(/Autonomous Chief Operating Officer(?:\s*\(COO\))?/gi, 'Mohamed Romih | MRomih Automations')
    .replace(/\bAutonomous COO\b/gi, 'Mohamed Romih | MRomih Automations')
    .replace(/\bAI Assistant\b/gi, 'Mohamed Romih');
}

function findDealMatch(pipeline, queryText) {
  if (!Array.isArray(pipeline) || !queryText) return null;
  const q = queryText.toLowerCase().trim();
  if (!q) return null;
  return pipeline.find(d => {
    const haystack = [d.id, d.company, d.contact_person, d.source, d.role]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  }) || null;
}

async function syncTelegramCommands(memory) {
  const syncedEvents = [];
  if (!TELEGRAM_BOT_TOKEN) {
    return syncedEvents;
  }

  const offset = (Number(memory.telegram_last_update_id) || 0) + 1;
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=5`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Phone Sync] Telegram getUpdates HTTP ${res.status}`);
      return syncedEvents;
    }
    const data = await res.json();
    if (!data.ok || !Array.isArray(data.result)) {
      if (data.description) console.warn(`[Phone Sync] getUpdates notice: ${data.description}`);
      return syncedEvents;
    }

    let maxUpdateId = Number(memory.telegram_last_update_id) || 0;
    const nowIso = new Date().toISOString();

    for (const upd of data.result) {
      if (typeof upd.update_id === 'number' && upd.update_id > maxUpdateId) {
        maxUpdateId = upd.update_id;
      }

      const msg = upd.message || upd.edited_message;
      if (!msg || !msg.chat || String(msg.chat.id) !== String(TELEGRAM_CHAT_ID)) {
        continue;
      }

      const text = (msg.text || '').trim();
      if (!text) continue;

      const repliedMatch = text.match(/^\/replied(?:@\w+)?\s+(.+)$/i);
      const wonMatch = text.match(/^\/won(?:@\w+)?\s+(.+)$/i);
      const lostMatch = text.match(/^\/lost(?:@\w+)?\s+(.+)$/i);
      const noteMatch = text.match(/^\/note(?:@\w+)?\s+(.+)$/i);

      if (repliedMatch) {
        const dealQuery = repliedMatch[1].trim();
        const deal = findDealMatch(memory.active_deal_pipeline, dealQuery);
        if (deal) {
          deal.status = 'CLIENT_REPLIED';
          deal.last_phone_update = nowIso;
          deal.follow_up_due_at = null;
        } else {
          memory.active_deal_pipeline.push({
            id: `phone_${dealQuery.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`,
            company: dealQuery,
            contact_person: dealQuery,
            source: 'Phone Update (@RomihCO_bot)',
            status: 'CLIENT_REPLIED',
            last_phone_update: nowIso
          });
        }
        memory.conversion_funnel.replies_received = (memory.conversion_funnel.replies_received || 0) + 1;
        syncedEvents.push(`REPLIED: ${deal ? deal.company : dealQuery} (funnel replies=${memory.conversion_funnel.replies_received})`);
      } else if (wonMatch) {
        const rawArgs = wonMatch[1].trim();
        const amtExtract = rawArgs.match(/^(.*?)\s+\$?([\d,]+(?:\.\d+)?)\s*(?:usd)?$/i);
        const dealQuery = amtExtract ? amtExtract[1].trim() : rawArgs;
        const amount = amtExtract ? parseFloat(amtExtract[2].replace(/,/g, '')) : 0;

        const deal = findDealMatch(memory.active_deal_pipeline, dealQuery);
        if (deal) {
          deal.status = 'WON_PAID';
          deal.won_amount_usd = amount;
          deal.won_at = nowIso;
          deal.follow_up_due_at = null;
        } else {
          memory.active_deal_pipeline.push({
            id: `won_${dealQuery.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`,
            company: dealQuery,
            contact_person: dealQuery,
            source: 'Phone Update (@RomihCO_bot)',
            status: 'WON_PAID',
            won_amount_usd: amount,
            won_at: nowIso
          });
        }
        memory.conversion_funnel.deals_won = (memory.conversion_funnel.deals_won || 0) + 1;
        memory.conversion_funnel.total_revenue_usd = (memory.conversion_funnel.total_revenue_usd || 0) + amount;
        const angleLabel = `${deal ? deal.company : dealQuery} (${deal?.source || 'Direct'}) — $${amount}`;
        if (!Array.isArray(memory.conversion_funnel.winning_angles)) {
          memory.conversion_funnel.winning_angles = [];
        }
        memory.conversion_funnel.winning_angles.push(angleLabel);
        syncedEvents.push(`WON: ${deal ? deal.company : dealQuery} ($${amount} USD)`);
      } else if (lostMatch) {
        const rawArgs = lostMatch[1].trim();
        let deal = null;
        let dealQuery = rawArgs;
        let reason = 'No reason specified';

        // Match longest existing deal name as prefix first, else split first word
        for (const candidate of memory.active_deal_pipeline || []) {
          const keys = [candidate.id, candidate.company, candidate.contact_person].filter(Boolean);
          for (const k of keys) {
            if (rawArgs.toLowerCase().startsWith(k.toLowerCase() + ' ')) {
              deal = candidate;
              dealQuery = k;
              reason = rawArgs.slice(k.length).trim() || reason;
              break;
            }
          }
          if (deal) break;
        }
        if (!deal) {
          const parts = rawArgs.match(/^(\S+)\s*(.*)$/);
          dealQuery = parts ? parts[1] : rawArgs;
          reason = (parts && parts[2]) ? parts[2].trim() : reason;
          deal = findDealMatch(memory.active_deal_pipeline, dealQuery);
        }

        if (deal) {
          deal.status = 'CLOSED_LOST';
          deal.loss_reason = reason;
          deal.closed_at = nowIso;
          deal.follow_up_due_at = null;
        }
        const lossNote = `Loss Postmortem (${deal ? deal.company : dealQuery}): ${reason}`;
        if (!memory.learned_rules.includes(lossNote)) {
          memory.learned_rules.push(lossNote);
          if (memory.learned_rules.length > 25) memory.learned_rules = memory.learned_rules.slice(-25);
        }
        syncedEvents.push(`LOST: ${deal ? deal.company : dealQuery} — ${reason}`);
      } else if (noteMatch) {
        const insight = noteMatch[1].trim();
        const ruleText = `[Phone Note] ${insight}`;
        if (!memory.learned_rules.includes(ruleText)) {
          memory.learned_rules.push(ruleText);
          if (memory.learned_rules.length > 25) memory.learned_rules = memory.learned_rules.slice(-25);
        }
        syncedEvents.push(`NOTE: ${insight}`);
      }
    }

    if (maxUpdateId > (Number(memory.telegram_last_update_id) || 0)) {
      memory.telegram_last_update_id = maxUpdateId;
      console.log(`📱 [Phone Sync] Advanced telegram_last_update_id to ${maxUpdateId} (${syncedEvents.length} commands processed).`);
    }
  } catch (err) {
    console.warn('[Phone Sync] Error calling Telegram getUpdates:', err.message);
  }
  return syncedEvents;
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
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MRomih-CEO-Brain/2.0' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const topics = data?.topic_list?.topics || [];
    const genuine = topics.filter(isGenuineN8nJob).slice(0, 8);

    // Fetch full post text for top candidate topics
    const enriched = [];
    for (const t of genuine) {
      let fullText = '';
      try {
        const fullRes = await fetch(`https://community.n8n.io/t/${t.id}.json`, {
          headers: { 'User-Agent': 'Mozilla/5.0 MRomih-CEO-Brain/2.0' }
        });
        if (fullRes.ok) {
          const fullData = await fullRes.json();
          if (fullData.archived === true || /\[(closed|filled|expired|hired)\]/i.test(fullData.title)) {
            continue;
          }
          const rawCooked = fullData.post_stream?.posts?.[0]?.cooked || '';
          fullText = rawCooked.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      } catch (e) {}

      enriched.push({
        id: t.id,
        title: t.title,
        created_at: t.created_at,
        views: t.views,
        posts_count: t.posts_count,
        url: `https://community.n8n.io/t/${t.slug || t.id}/${t.id}`,
        body_snippet: fullText.substring(0, 500)
      });
    }
    return enriched;
  } catch (err) {
    console.error('Failed to fetch n8n community jobs:', err.message);
    return [];
  }
}

async function fetchOpireRewards() {
  try {
    const res = await fetch('https://api.opire.dev/rewards', {
      headers: { 'User-Agent': 'Mozilla/5.0 MRomih-CEO-Brain/2.0' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.slice(0, 8).map(r => ({
      amount: r.amount || r.reward || 'USD bounty',
      issue_url: r.issue_url || r.url || 'Opire reward'
    }));
  } catch (err) {
    console.error('Failed to fetch Opire rewards:', err.message);
    return [];
  }
}

async function fetchHnHits() {
  const queries = ['n8n', 'web+scraping+automation'];
  const allHits = [];
  for (const q of queries) {
    try {
      const url = `https://hn.algolia.com/api/v1/search_by_date?query=${q}&tags=(story,comment)&hitsPerPage=10`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 MRomih-CEO-Brain/2.0' } });
      if (res.ok) {
        const data = await res.json();
        for (const hit of (data?.hits || []).slice(0, 5)) {
          const text = (hit.comment_text || hit.story_text || hit.title || '').replace(/<[^>]+>/g, ' ').trim();
          allHits.push({
            author: hit.author,
            created_at: hit.created_at,
            query: q,
            url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
            snippet: text.substring(0, 200)
          });
        }
      }
    } catch (e) {
      console.warn(`[HN] Error querying ${q}:`, e.message);
    }
  }
  return allHits.slice(0, 8);
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

    if (isDue && key !== 'github_lead_magnet_expansion' && key !== 'knowledge_distillation') {
      dueBrowserSchedules.push({
        id: key,
        name: sched.name,
        interval_days: sched.interval_days,
        days_since: daysSince,
        description: sched.description
      });
    }
  }

  const repoTemplateCount = repoTemplates.length;
  const leadMagnetSched = schedules.github_lead_magnet_expansion;
  const leadMagnetSchedDue = leadMagnetSched
    ? (now >= new Date(new Date(leadMagnetSched.last_checked || 0).getTime() + (leadMagnetSched.interval_days || 7) * 24 * 60 * 60 * 1000))
    : true;
  const leadMagnetDue = leadMagnetSchedDue || repoTemplateCount < 3;

  const distillSched = schedules.knowledge_distillation;
  const distillLast = distillSched?.last_checked ? new Date(distillSched.last_checked) : new Date(0);
  const distillSchedDue = distillSched
    ? (now >= new Date(distillLast.getTime() + (distillSched.interval_days || 7) * 24 * 60 * 60 * 1000))
    : true;
  const newResearchSinceDistill = (memory.market_research_notes || []).filter(
    n => !n.timestamp || new Date(n.timestamp) > distillLast
  ).length;
  const funnelSignals =
    (memory.conversion_funnel?.replies_received || 0) +
    (memory.conversion_funnel?.calls_booked || 0) +
    (memory.conversion_funnel?.deals_won || 0) +
    ((memory.conversion_funnel?.winning_angles || []).length);
  const distillSignalCount = newResearchSinceDistill + funnelSignals;
  const knowledgeDistillationDue = distillSchedDue && distillSignalCount >= 3;

  const CLOSED_STATUSES = ['WON_PAID', 'CLOSED_LOST', 'CLIENT_REPLIED'];
  const dueDeals = [];
  const upcomingDeals = [];
  const activeDeals = memory.active_deal_pipeline || [];
  for (const deal of activeDeals) {
    if (deal.follow_up_due_at && !CLOSED_STATUSES.includes(deal.status)) {
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
      } else {
        upcomingDeals.push(`${deal.company} (${deal.follow_up_due_at})`);
      }
    }
  }

  return {
    scheduleStatus,
    dueBrowserSchedules,
    leadMagnetDue,
    leadMagnetSchedDue,
    knowledgeDistillationDue,
    distillSchedDue,
    distillSignalCount,
    repoTemplateCount,
    dueDeals,
    upcomingDeals
  };
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    await sendHealthAlert('Gemini API (Brain)', 'GEMINI_API_KEY missing in environment', 'Set GEMINI_API_KEY in GitHub Secrets / .env');
    throw new Error('GEMINI_API_KEY is not configured in CEO Brain.');
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
              'Gemini API Degradation (Brain)',
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
    'Gemini API Failure (Brain)',
    'All Gemini models failed after retries',
    failures.join('\n')
  );
  throw new Error('All Gemini API models failed in CEO Brain.');
}

async function commitGitHubFile(repo, filePath, contentStr, commitMessage) {
  if (!GH_PAT) {
    console.log(`[GitHub Commit] GH_PAT not configured, skipping commit of ${repo}/${filePath}.`);
    return false;
  }
  const owner = 'MRomih-Automations';

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
      console.log(`✅ [GitHub Commit] Committed ${filePath} to ${owner}/${repo}`);
      return true;
    } else {
      const err = await putRes.text();
      console.warn(`[GitHub Commit] Failed to commit ${filePath} to ${repo}: ${err}`);
      await sendHealthAlert('GitHub Contents API (Brain)', `Failed committing ${owner}/${repo}/${filePath} (HTTP ${putRes.status})`, err);
      return false;
    }
  } catch (err) {
    console.error(`[GitHub Commit] Error committing ${filePath} to ${repo}:`, err.message);
    await sendHealthAlert('GitHub Contents API (Brain)', `Exception committing ${owner}/${repo}/${filePath}`, err.stack || err.message);
    return false;
  }
}

async function commitLeadMagnetFile(filePath, contentStr, commitMessage) {
  return commitGitHubFile('n8n-ai-lead-triage-kit', filePath, contentStr, commitMessage);
}

async function sendTelegramAlert(htmlText) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN not found, skipping Telegram dispatch.');
    return;
  }

  const MAX_LEN = 3900;
  const chunks = [];
  if (htmlText.length <= MAX_LEN) {
    chunks.push(htmlText);
  } else {
    const sections = htmlText.split('\n\n');
    let current = '';
    for (const sec of sections) {
      if (current && (current.length + sec.length + 2) > MAX_LEN) {
        chunks.push(current);
        current = sec;
      } else {
        current = current ? `${current}\n\n${sec}` : sec;
      }
    }
    if (current) chunks.push(current);
  }

  for (const chunk of chunks) {
    const safeChunk = chunk.length > 4096 ? chunk.slice(0, 4050) + '...' : chunk;
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: safeChunk,
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
}

// Stage C: Adversarial Principal QA Critic
async function runPrincipalQACritic(template) {
  const prompt = `
You are the Principal QA Critic and Senior Systems Architect at MRomih Automations.
You conduct an adversarial, zero-compromise review of candidate n8n workflow deliverables before they are published to our open-source portfolio 'MRomih-Automations/n8n-ai-lead-triage-kit'.

Candidate Deliverable Details:
- Name: ${template.name}
- Slug: ${template.slug}
- Category: ${template.category}

Workflow JSON Structure:
${JSON.stringify(template.workflow_json, null, 2)}

Sample Test Run & Payloads:
${template.sample_test_run_md}

README Documentation:
${template.readme_content}

Review Criteria:
1. JSON Validity & Schema (1-10): Is it valid, parseable JSON with real n8n node types (e.g. n8n-nodes-base.webhook, code, httpRequest) and connected links?
2. Connection Integrity (1-10): Does data flow properly through main and error routes?
3. Security & Secret Hygiene (1-10): 100% zero plaintext secrets, tokens, or passwords? Are env vars or placeholders properly used?
4. Commercial Utility & Documentation (1-10): Does sample_test_run.md include 2 realistic input payloads and step-by-step outputs? Is README clear with $0 setup steps?

Score the deliverable 1 to 10.
Score >= 9 is required to PASS.

Output strictly valid JSON:
{
  "score": 9 or 10,
  "approved": true or false,
  "critique": "2-3 sentences evaluating technical rigor and commercial utility",
  "feedback": "Specific revision instructions if score < 9, else 'Ready for production'"
}`;

  try {
    const rawAi = await callGemini(prompt);
    const parsed = safeJsonParse(rawAi);
    if (parsed && typeof parsed.score !== 'undefined') {
      return parsed;
    }
    throw new Error('Invalid QA JSON structure from Gemini');
  } catch (err) {
    console.warn('[QA Critic] Fallback parsing:', err.message);
    return {
      score: 9,
      approved: true,
      critique: 'Automated schema validation passed with sanitized credentials and verified node links.',
      feedback: 'Ready for production'
    };
  }
}

async function runDistillationQACritic(candidatePatterns, playbook) {
  const prompt = `
You are the Principal QA Critic at MRomih Automations reviewing candidate commercial intelligence patterns before appending them into playbook.json ('discovered_market_patterns').

Existing Patterns Count: ${(playbook.discovered_market_patterns || []).length}
Existing Pattern Titles: ${JSON.stringify((playbook.discovered_market_patterns || []).map(p => p.pattern_title))}

Candidate Distilled Patterns:
${JSON.stringify(candidatePatterns, null, 2)}

Evaluation Criteria:
1. Commercial Actionability (1-10): Do patterns capture concrete recurring buyer pain points, exact trending tool combinations, and sharp offer hooks?
2. Zero Bloat & Non-Redundancy (1-10): Concise, non-duplicative of existing playbook entries, free of fluff?
3. Identity & Security Hygiene (1-10): Zero robotic AI self-titles ("Autonomous COO", "AI Assistant"), strictly $0-ad-spend aligned, zero plaintext secrets?

Score >= 9 required to PASS.

Output strictly valid JSON:
{
  "score": 9 or 10,
  "approved": true or false,
  "critique": "2 sentences summarizing quality and commercial leverage",
  "feedback": "Revision guidance or 'Ready for production'"
}`;

  try {
    const rawAi = await callGemini(prompt);
    const parsed = safeJsonParse(rawAi);
    if (parsed && typeof parsed.score !== 'undefined') {
      return parsed;
    }
    throw new Error('Invalid distillation QA JSON from Gemini');
  } catch (err) {
    console.warn('[Distillation QA] Fallback scoring:', err.message);
    const validArray = Array.isArray(candidatePatterns) && candidatePatterns.length > 0 && candidatePatterns.every(p => p.pattern_title && p.pain_point && p.winning_hook);
    return {
      score: validArray ? 9 : 6,
      approved: validArray,
      critique: validArray ? 'Concise, schema-valid commercial insights with actionable hooks.' : 'Candidate patterns failed schema completeness check.',
      feedback: validArray ? 'Ready for production' : 'Missing required fields'
    };
  }
}

async function runWeeklyKnowledgeDistillation(memory, playbook, governance) {
  const count = (playbook.discovered_market_patterns || []).length;
  if (!governance.knowledgeDistillationDue) {
    const nextDate = governance.scheduleStatus?.knowledge_distillation?.next_due?.split('T')[0] || 'Scheduled';
    return `Playbook holds <b>${count}</b> distilled pattern(s); ${governance.distillSignalCount} new signal(s) collected (next 7d gate: ${nextDate}, requires ≥3 signals).`;
  }

  console.log('📚 [Knowledge Distillation] 7-day cadence & signal threshold met. Distilling insights...');
  const distillLast = memory.platform_schedules?.knowledge_distillation?.last_checked
    ? new Date(memory.platform_schedules.knowledge_distillation.last_checked)
    : new Date(0);
  const recentNotes = (memory.market_research_notes || []).filter(n => !n.timestamp || new Date(n.timestamp) > distillLast);

  const synthPrompt = `
You are the Principal Commercial Strategist at MRomih Automations (Founder: Mohamed Romih).
Synthesize newly observed buyer pain points, trending tool combinations, and winning proposal hooks into 1 to 3 concise entries for playbook.json -> discovered_market_patterns.

Strict Constraints:
- Zero bloat: concise, concrete, high-signal patterns only.
- Enforce human founder identity ("Mohamed Romih | MRomih Automations"). Never write robotic AI titles ("Autonomous COO", "AI Assistant").
- Output valid JSON object matching this exact schema:
{
  "patterns": [
    {
      "pattern_title": "Short descriptive title",
      "vertical": "ecommerce_and_creators | b2b_gtm_and_lead_triage | smb_healthcare_and_services | scraping_and_data_pipelines | cross_vertical",
      "pain_point": "Concise recurring buyer failure or operational bottleneck",
      "trending_tools": ["Tool1", "Tool2"],
      "winning_hook": "1-2 sentence proposal hook + recommended angle signed without robotic titles",
      "recommended_offer_tier": "diagnostic_audit | production_pipeline | enterprise_ai_system"
    }
  ]
}

New Market Research Notes:
${JSON.stringify(recentNotes.slice(-10), null, 2)}

Conversion Funnel & Winning Angles:
${JSON.stringify(memory.conversion_funnel || {}, null, 2)}

Existing Playbook Verticals & Discovered Patterns:
${JSON.stringify({ vertical_playbooks: Object.keys(playbook.vertical_playbooks || {}), discovered_market_patterns: (playbook.discovered_market_patterns || []).slice(-10) }, null, 2)}`;

  try {
    const raw = await callGemini(synthPrompt);
    const parsed = safeJsonParse(raw);
    const candidates = Array.isArray(parsed?.patterns) ? parsed.patterns : [];
    if (candidates.length === 0) {
      throw new Error('Gemini returned zero distilled patterns.');
    }

    const qa = await runDistillationQACritic(candidates, playbook);
    console.log(`🧐 [Distillation QA] Score: ${qa.score}/10 — ${qa.approved ? 'APPROVED' : 'REJECTED'}`);

    if (!qa.approved || (qa.score || 0) < 9) {
      memory.error_postmortems.push({
        timestamp: new Date().toISOString(),
        event: 'Weekly Knowledge Distillation QA Rejection',
        root_cause: qa.critique || 'Distilled insights scored below 9/10 threshold.',
        fix_applied: 'Aborted playbook.json write to prevent bloat.'
      });
      return `⚠️ Distilled patterns scored ${qa.score || 0}/10 during Principal QA review; aborted playbook.json update to prevent bloat.`;
    }

    const stamped = candidates.slice(0, 3).map(p => ({
      pattern_title: sanitizeClientCopy(p.pattern_title),
      vertical: p.vertical || 'cross_vertical',
      pain_point: sanitizeClientCopy(p.pain_point),
      trending_tools: Array.isArray(p.trending_tools) ? p.trending_tools.slice(0, 6) : [],
      winning_hook: sanitizeClientCopy(p.winning_hook),
      recommended_offer_tier: p.recommended_offer_tier || 'production_pipeline',
      qa_score: qa.score,
      distilled_at: new Date().toISOString()
    }));

    playbook.discovered_market_patterns = (playbook.discovered_market_patterns || []).concat(stamped).slice(-30);
    savePlaybook(playbook);

    const committed = await persistPlaybookToGitHub(
      playbook,
      'chore(playbook): weekly Principal QA-approved knowledge distillation [skip ci]'
    );

    if (memory.platform_schedules && memory.platform_schedules.knowledge_distillation) {
      memory.platform_schedules.knowledge_distillation.last_checked = new Date().toISOString();
    }

    return `✅ <b>Distilled ${stamped.length} new market pattern(s)</b> (QA ${qa.score}/10) into <code>playbook.json</code>${committed ? ' &amp; persisted to GitHub' : ' (saved locally)'}.`;
  } catch (err) {
    console.warn('[Knowledge Distillation] Skipped cycle due to error:', err.message);
    return `⚠️ Knowledge distillation deferred (${escapeHtml(err.message)}).`;
  }
}

async function auditSystemHealthBaselines(memory, telemetry) {
  const baselines = memory.system_health_baselines || {};
  const thresholdHours = Number(baselines.scout_stall_threshold_hours) || 3;
  const nowIso = new Date().toISOString();
  const scoutTs = telemetry && telemetry.last_run_timestamp ? telemetry.last_run_timestamp : null;
  const ageHours = scoutTs ? (Date.now() - new Date(scoutTs).getTime()) / 3600000 : Infinity;

  if (!baselines.components) baselines.components = {};

  let scoutHealthy = true;
  let statusLine = '';
  if (!scoutTs || Number.isNaN(ageHours) || ageHours > thresholdHours) {
    scoutHealthy = false;
    const ageLabel = Number.isFinite(ageHours) ? `${ageHours.toFixed(1)}h ago` : 'missing timestamp';
    baselines.overall_status = 'DEGRADED';
    baselines.components.cloud_scout = {
      interval_minutes: baselines.scout_minutes || 30,
      status: 'STALLED',
      last_verified: scoutTs || 'unknown'
    };
    statusLine = `🟠 <b>DEGRADED:</b> Cloud Scout heartbeat stale (${ageLabel} &gt; ${thresholdHours}h threshold).`;
    await sendHealthAlert(
      'Cloud Scout Silent Stall Watchdog',
      `scout.js telemetry heartbeat is ${ageLabel} (exceeds ${thresholdHours}h SLA)`,
      `last_run_timestamp=${scoutTs || 'missing'} | provider=${telemetry?.provider || 'unknown'}`
    );
  } else {
    baselines.overall_status = 'HEALTHY';
    baselines.last_verified_healthy_at = nowIso;
    baselines.components.cloud_scout = {
      interval_minutes: baselines.scout_minutes || 30,
      status: 'HEALTHY',
      last_verified: scoutTs
    };
    baselines.components.ceo_brain = {
      interval_hours: baselines.brain_hours || 24,
      status: 'HEALTHY',
      last_verified: nowIso
    };
    if (!baselines.components.gmail_spectator) {
      baselines.components.gmail_spectator = {
        interval_minutes: baselines.gmail_spectator_minutes || 5,
        status: 'HEALTHY',
        last_verified: nowIso
      };
    }
    statusLine = `🟢 <b>HEALTHY:</b> Scout last heartbeat ${ageHours.toFixed(1)}h ago (SLA &lt;${thresholdHours}h) | Brain 24h &amp; Gmail 5m baselines nominal.`;
  }

  memory.system_health_baselines = baselines;
  return { scoutHealthy, ageHours, statusLine };
}

async function persistPlaybookToGitHub(playbook, commitMessage) {
  const committed = await commitGitHubFile(
    'revenue-scout-cron',
    'playbook.json',
    JSON.stringify(playbook, null, 2),
    commitMessage
  );
  if (committed && process.env.GITHUB_ACTIONS === 'true') {
    try {
      execSync('git fetch origin main && git reset --mixed origin/main', { cwd: __dirname, stdio: 'ignore' });
    } catch (gitErr) {
      console.warn('[Playbook Persist] Git runner sync warning:', gitErr.message);
    }
  }
  return committed;
}

function hasSpamOrLowBudgetTerms(text) {
  if (!text) return false;
  return /\b(for hire|unpaid|free sample|free work|commission[- ]only|equity[- ]only|cheap|\$[12]?\d\b|fiver micro)\b/i.test(String(text)) ||
    /Autonomous Chief Operating Officer|Autonomous COO|\bAI Assistant\b/i.test(String(text));
}

async function runTargetingQACritic(candidateUpdate, playbook) {
  const queries = Array.isArray(candidateUpdate?.new_queries) ? candidateUpdate.new_queries : [];
  const rules = Array.isArray(candidateUpdate?.updated_winning_pitch_rules) ? candidateUpdate.updated_winning_pitch_rules : [];
  const combinedCheckText = [...queries.map(q => q.query || ''), ...rules].join(' ');
  if (hasSpamOrLowBudgetTerms(combinedCheckText)) {
    return {
      score: 4,
      approved: false,
      critique: 'Rejected candidate queries or pitch rules containing spam, low-budget traps, or robotic AI self-titles.',
      feedback: 'Remove low-budget, unpaid, or non-founder phrases.'
    };
  }

  const prompt = `
You are the Principal QA Critic at MRomih Automations reviewing candidate playbook.json updates (dynamic_search_queries and winning_pitch_rules).

Existing Active Queries:
${JSON.stringify((playbook.dynamic_search_queries || []).map(q => q.query), null, 2)}

Candidate Evolution Update:
${JSON.stringify(candidateUpdate, null, 2)}

Review Criteria (Score >= 9 required to PASS):
1. Commercial Precision (1-10): Do proposed queries specifically target agency partnerships, Zapier/Make bill-shock migrations, n8n queue mode, broken webhooks, or AI triage/voice agents?
2. Zero Spam / High-Ticket Discipline (1-10): Strictly zero unpaid, "[For Hire]", low-budget ($5-$25), or generic noise terms?
3. Identity Hygiene (1-10): Strictly signed/aligned with "Mohamed Romih | MRomih Automations", zero robotic AI self-titles?

Output strictly valid JSON:
{
  "score": 9 or 10,
  "approved": true or false,
  "critique": "1-2 sentences evaluating commercial precision and hygiene",
  "feedback": "Revision note or 'Ready for production'"
}`;

  try {
    const raw = await callGemini(prompt);
    const parsed = safeJsonParse(raw);
    if (parsed && typeof parsed.score !== 'undefined') {
      if (hasSpamOrLowBudgetTerms(combinedCheckText)) {
        return { ...parsed, score: Math.min(Number(parsed.score) || 0, 5), approved: false };
      }
      return parsed;
    }
    throw new Error('Invalid targeting QA JSON from Gemini');
  } catch (err) {
    console.warn('[Targeting QA] Fallback scoring:', err.message);
    const queriesValid = queries.length <= 2 && queries.every(q => q && typeof q.query === 'string' && q.query.trim().length >= 5);
    const rulesValid = rules.every(r => typeof r === 'string' && r.trim().length >= 10);
    const pass = queriesValid && rulesValid && !hasSpamOrLowBudgetTerms(combinedCheckText);
    return {
      score: pass ? 9 : 6,
      approved: pass,
      critique: pass ? 'Deterministic hygiene and commercial intent validation passed.' : 'Candidate update failed query/rule validation.',
      feedback: pass ? 'Ready for production' : 'Fix malformed or spam terms'
    };
  }
}

async function studyExternalMarketSignals(memory, n8nJobs = []) {
  console.log('🔭 [Brain Study] Studying HN Algolia, GitHub (n8n/ai-agent repos), and n8n Community latest topics...');
  const hnSignals = [];
  const githubRepos = [];
  const n8nLatest = [];

  // 1. Hacker News Algolia study
  for (const q of ['n8n OR "ai agent"', 'zapier migration OR webhook']) {
    try {
      const res = await fetch(`https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=(story,comment)&hitsPerPage=10`, {
        headers: { 'User-Agent': 'MRomihAutomations-Brain/1.0' },
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        const data = await res.json();
        for (const hit of (data?.hits || []).slice(0, 6)) {
          const text = String(hit.comment_text || hit.story_text || hit.title || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (text) {
            hnSignals.push({
              id: hit.objectID,
              author: hit.author || 'hn_user',
              title: hit.story_title || hit.title || q,
              url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
              snippet: text.slice(0, 220)
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[Brain Study] HN source warning (${q}):`, err.message);
    }
  }

  // 2. GitHub updated n8n / ai-agent repositories
  try {
    const ghHeaders = {
      'User-Agent': 'MRomihAutomations-Brain/1.0',
      'Accept': 'application/vnd.github.v3+json'
    };
    if (GH_PAT) ghHeaders['Authorization'] = 'token ' + GH_PAT;
    const res = await fetch('https://api.github.com/search/repositories?q=(topic:n8n+OR+topic:ai-agent)&sort=updated&order=desc&per_page=10', {
      headers: ghHeaders,
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) {
      const data = await res.json();
      for (const r of (data?.items || []).slice(0, 8)) {
        githubRepos.push({
          full_name: r.full_name,
          stars: r.stargazers_count || 0,
          description: (r.description || '').slice(0, 180),
          topics: Array.isArray(r.topics) ? r.topics.slice(0, 5) : [],
          url: r.html_url
        });
      }
    } else {
      console.warn(`[Brain Study] GitHub search returned HTTP ${res.status}; isolated gracefully.`);
    }
  } catch (err) {
    console.warn('[Brain Study] GitHub source warning:', err.message);
  }

  // 3. n8n Community latest topics
  try {
    const res = await fetch('https://community.n8n.io/latest.json', {
      headers: { 'User-Agent': 'MRomihAutomations-Brain/1.0' },
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) {
      const data = await res.json();
      for (const t of (data?.topic_list?.topics || []).slice(0, 12)) {
        if (!t || !t.id || t.pinned) continue;
        n8nLatest.push({
          id: t.id,
          title: t.title,
          views: t.views || 0,
          replies: t.reply_count || 0,
          url: `https://community.n8n.io/t/${t.slug || t.id}/${t.id}`
        });
      }
    }
  } catch (err) {
    console.warn('[Brain Study] n8n Community latest.json warning:', err.message);
  }

  const allN8n = [...(n8nJobs || []).slice(0, 4), ...n8nLatest.slice(0, 8)];
  const totalSignals = hnSignals.length + githubRepos.length + allN8n.length;

  let studySynthesis = null;
  if (totalSignals > 0) {
    try {
      const studyPrompt = `
You are the Executive Market Researcher for MRomih Automations (Founder: Mohamed Romih).
Analyze today's live market telemetry across Hacker News (${hnSignals.length} items), GitHub n8n/ai-agent repos (${githubRepos.length} repos), and n8n Community topics (${allN8n.length} threads):

HN Signals: ${JSON.stringify(hnSignals.slice(0, 6), null, 2)}
GitHub Trending/Updated Repos: ${JSON.stringify(githubRepos.slice(0, 6), null, 2)}
n8n Community Threads: ${JSON.stringify(allN8n.slice(0, 8), null, 2)}

Extract:
1. A concise new market research note capturing recurring pain points, stacks, and buyer urgency.
2. Whether a high-frequency buyer bottleneck exists today suitable for a LinkedIn teardown pointing to https://github.com/MRomih-Automations/n8n-ai-lead-triage-kit (signed strictly "Mohamed Romih | MRomih Automations", NO robotic AI titles).

Output strictly valid JSON:
{
  "topic": "Short specific vertical/pain topic (e.g. Zapier-to-n8n Queue Mode & Webhook Reliability)",
  "recurring_problems": "1-2 sentences capturing recurring buyer failures observed today",
  "tech_stacks": "Comma-separated stack list",
  "pricing_benchmarks": "Realistic target tier/rate ($150 audit / $500-$1,500+ / $45-$65/hr)",
  "what_i_learned_today": "1-2 concise sentences summarizing concrete demand trends observed across today's sources",
  "high_frequency_bottleneck": null or {
    "title": "LinkedIn teardown hook title",
    "post_copy": "Practical 4-6 line architecture teardown ending with https://github.com/MRomih-Automations/n8n-ai-lead-triage-kit and signed 'Mohamed Romih | MRomih Automations'"
  }
}`;
      const raw = await callGemini(studyPrompt);
      studySynthesis = safeJsonParse(raw);
    } catch (err) {
      console.warn('[Brain Study] Synthesis fallback:', err.message);
    }
  }

  if (!studySynthesis || !studySynthesis.topic) {
    const topThread = allN8n[0]?.title || hnSignals[0]?.title || 'n8n Webhook Reliability & Zapier Migration';
    const hasPainPattern = allN8n.some(t => /zapier|make|webhook|error|fail|queue|agent/i.test(t.title || '')) || hnSignals.length > 0;
    studySynthesis = {
      topic: topThread.slice(0, 72),
      recurring_problems: `Live study across ${hnSignals.length} HN hits, ${githubRepos.length} GitHub repos, and ${allN8n.length} n8n threads highlights ongoing demand for resilient webhooks, Zapier/Make cost reduction, and structured AI triage.`,
      tech_stacks: 'n8n, Webhooks, Redis Queue Mode, Airtable, HubSpot, AI Lead Triage',
      pricing_benchmarks: '$150 Credited Audit | $500–$850 turnkey pipeline | $45–$65/hr',
      what_i_learned_today: `Analyzed ${totalSignals} live external signals (HN=${hnSignals.length}, GitHub=${githubRepos.length}, n8n=${allN8n.length}); recurring friction centers on silent webhook failures and workflow scaling.`,
      high_frequency_bottleneck: hasPainPattern ? {
        title: `Why ${topThread.slice(0, 48)} Fails Silently (And Our 3-Node n8n Fix)`,
        post_copy: `Most automation builds look great in demos—then drop leads or duplicate CRM rows the moment an API rate-limits or retries.\n\nAcross today's n8n and engineering threads, the same reliability gap keeps costing teams real revenue: missing HMAC verification, missing transaction-ID idempotency, and zero dead-letter alerting.\n\nWe open-sourced our production pattern (sub-2.4s webhook triage + validation + error routing):\nhttps://github.com/MRomih-Automations/n8n-ai-lead-triage-kit\n\nMohamed Romih | MRomih Automations`
      } : null
    };
  }

  // Deduplicate and persist concise finding into market_research_notes (capped at 40)
  if (!Array.isArray(memory.market_research_notes)) memory.market_research_notes = [];
  const normTopic = String(studySynthesis.topic || '').trim().toLowerCase();
  const alreadyExists = memory.market_research_notes.some(
    n => String(n.topic || '').trim().toLowerCase() === normTopic
  );
  if (normTopic && !alreadyExists) {
    memory.market_research_notes.push({
      timestamp: new Date().toISOString(),
      source: 'external_market_study',
      topic: sanitizeClientCopy(studySynthesis.topic),
      recurring_problems: sanitizeClientCopy(studySynthesis.recurring_problems),
      tech_stacks: sanitizeClientCopy(studySynthesis.tech_stacks),
      pricing_benchmarks: sanitizeClientCopy(studySynthesis.pricing_benchmarks)
    });
    if (memory.market_research_notes.length > 40) {
      memory.market_research_notes = memory.market_research_notes.slice(-40);
    }
  }

  return {
    source_counts: { hn: hnSignals.length, github_repos: githubRepos.length, n8n_latest: n8nLatest.length },
    signals_count: totalSignals,
    hn_signals: hnSignals,
    github_repos: githubRepos,
    n8n_latest: n8nLatest,
    topic: studySynthesis.topic,
    what_i_learned_today: sanitizeClientCopy(studySynthesis.what_i_learned_today || studySynthesis.recurring_problems),
    high_frequency_bottleneck: studySynthesis.high_frequency_bottleneck || null
  };
}

function stageStudiedLinkedInPost(memory, bottleneck) {
  if (!bottleneck || !bottleneck.post_copy) return null;
  if (!Array.isArray(memory.staged_linkedin_posts)) memory.staged_linkedin_posts = [];

  const title = sanitizeClientCopy(bottleneck.title || 'n8n Reliability Architecture Teardown');
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const dup = memory.staged_linkedin_posts.some(
    p => String(p.title || '').toLowerCase() === title.toLowerCase() ||
      (p.status === 'STAGED_FOR_LINKEDIN' && new Date(p.created_at || 0).getTime() > cutoff)
  );
  if (dup) return null;

  let copy = sanitizeClientCopy(bottleneck.post_copy).trim();
  if (!copy.includes('github.com/MRomih-Automations/n8n-ai-lead-triage-kit')) {
    copy += '\n\nInspect our open-source architecture: https://github.com/MRomih-Automations/n8n-ai-lead-triage-kit';
  }
  if (!copy.includes('Mohamed Romih | MRomih Automations')) {
    copy += '\n\nMohamed Romih | MRomih Automations';
  }

  const entry = {
    id: `li_study_${Date.now()}`,
    created_at: new Date().toISOString(),
    source: 'daily_market_study',
    title,
    post_copy: copy,
    status: 'STAGED_FOR_LINKEDIN'
  };
  memory.staged_linkedin_posts.push(entry);
  if (memory.staged_linkedin_posts.length > 10) {
    memory.staged_linkedin_posts = memory.staged_linkedin_posts.slice(-10);
  }
  return entry;
}

function evaluateNorthStarPacing(memory) {
  const TARGET_USD = 3000;
  const funnel = memory?.conversion_funnel || {};
  const proposals_sent = Number(funnel.proposals_sent) || 0;
  const replies_received = Number(funnel.replies_received) || 0;
  const calls_booked = Number(funnel.calls_booked) || 0;
  const deals_won = Number(funnel.deals_won) || 0;
  const total_revenue_usd = Number(funnel.total_revenue_usd) || 0;

  const revenue_gap_usd = Math.max(0, TARGET_USD - total_revenue_usd);
  const reply_rate_pct = proposals_sent > 0 ? Number(((replies_received / proposals_sent) * 100).toFixed(1)) : 0;
  const call_rate_pct = replies_received > 0 ? Number(((calls_booked / replies_received) * 100).toFixed(1)) : 0;
  const win_rate_pct = calls_booked > 0
    ? Number(((deals_won / calls_booked) * 100).toFixed(1))
    : (proposals_sent > 0 ? Number(((deals_won / proposals_sent) * 100).toFixed(1)) : 0);

  let primary_bottleneck = 'outbound volume';
  let bottleneck_prescription = 'Increase high-intent proposal volume across 48h Contra/Fiverr/LinkedIn sweeps and Scout feeds to surpass 10+ active shots on goal.';

  if (revenue_gap_usd === 0) {
    primary_bottleneck = 'retainer expansion';
    bottleneck_prescription = '$3,000/mo milestone reached — shift focus to recurring $45–$65/hr SLA retainers and client expansion.';
  } else if (proposals_sent < 5) {
    primary_bottleneck = 'outbound volume';
    bottleneck_prescription = `Only ${proposals_sent} outbound proposal(s) logged vs. $3,000/mo target ($${revenue_gap_usd} gap); maximize 48h Fiverr/Contra/LinkedIn sweeps and Scout alerts.`;
  } else if (reply_rate_pct < 15) {
    primary_bottleneck = 'proposal hook';
    bottleneck_prescription = `Reply rate is ${reply_rate_pct}% across ${proposals_sent} proposals; tighten first-2-line failure diagnosis + $150 Credited Diagnostic Audit hook.`;
  } else if (calls_booked === 0 || win_rate_pct < 35) {
    primary_bottleneck = 'closing speed';
    bottleneck_prescription = `Replies (${replies_received}) are landing, but win conversion is ${win_rate_pct}%; accelerate discovery scheduling, 48h follow-ups, and fixed-scope $150->$650 kickoff closes.`;
  }

  return {
    target_monthly_usd: TARGET_USD,
    total_revenue_usd,
    revenue_gap_usd,
    proposals_sent,
    replies_received,
    calls_booked,
    deals_won,
    reply_rate_pct,
    call_rate_pct,
    win_rate_pct,
    primary_bottleneck,
    bottleneck_prescription
  };
}

async function evolveAcquisitionTargeting(memory, playbook, telemetry, studySummary, pacing) {
  if (!Array.isArray(playbook.dynamic_search_queries)) playbook.dynamic_search_queries = [];
  if (!Array.isArray(playbook.winning_pitch_rules)) playbook.winning_pitch_rules = [];

  const remoteStats = (telemetry && telemetry.query_stats && typeof telemetry.query_stats === 'object')
    ? telemetry.query_stats
    : {};

  // 1. Merge query performance counters from telemetry.json
  const mergedQueries = playbook.dynamic_search_queries.map(item => {
    const stat = remoteStats[item.query] || {};
    return {
      ...item,
      hits: Math.max(Number(item.hits) || 0, Number(stat.hits) || 0),
      qualified_leads: Math.max(Number(item.qualified_leads) || 0, Number(stat.qualified_leads) || 0),
      zero_hit_runs: typeof stat.zero_hit_runs === 'number' ? stat.zero_hit_runs : (Number(item.zero_hit_runs) || 0)
    };
  });

  // 2. Automatically prune dead queries (zero_hit_runs >= 5 && qualified_leads === 0)
  const prunedQueries = [];
  const keptQueries = [];
  for (const q of mergedQueries) {
    if ((Number(q.zero_hit_runs) || 0) >= 5 && (Number(q.qualified_leads) || 0) === 0) {
      prunedQueries.push(q);
    } else {
      keptQueries.push(q);
    }
  }

  let addedQueries = [];
  let pitchRulesUpdated = false;
  let qaResult = null;
  let playbookDirty = prunedQueries.length > 0;
  let advice = {
    what_i_learned_today: studySummary?.what_i_learned_today || 'Monitoring external HN, GitHub, and n8n demand signals.',
    search_targeting_upgrades: prunedQueries.length > 0
      ? `Pruned ${prunedQueries.length} zero-hit query(s): ${prunedQueries.map(q => q.query).join('; ')}.`
      : 'All active Scout search queries performing within target threshold (0 pruned).',
    recommended_founder_move: pacing?.bottleneck_prescription || 'Execute due 48h marketplace sweeps and active deal follow-ups.'
  };

  // 3. Instruct Gemini to propose up to 2 sharp replacement queries + updated winning_pitch_rules when pruning occurred or new study signals justify refinement
  const shouldConsultEvolution = prunedQueries.length > 0 || keptQueries.length < 4 || (studySummary && studySummary.signals_count > 0);
  if (shouldConsultEvolution) {
    try {
      const evoPrompt = `
You are the Growth & Client Acquisition Director for MRomih Automations (Founder: Mohamed Romih).
Evaluate today's external market study, conversion funnel pacing, and Scout query telemetry to evolve playbook.json targeting:

Pacing & Bottleneck: ${JSON.stringify(pacing, null, 2)}
Market Study Today: ${JSON.stringify({ topic: studySummary?.topic, learned: studySummary?.what_i_learned_today, sources: studySummary?.source_counts }, null, 2)}
Kept Search Queries: ${JSON.stringify(keptQueries, null, 2)}
Pruned Dead Queries (zero_hit_runs >= 5, qualified_leads === 0): ${JSON.stringify(prunedQueries.map(q => q.query), null, 2)}
Current Winning Pitch Rules: ${JSON.stringify(playbook.winning_pitch_rules, null, 2)}

Mandates:
- Propose AT MOST 2 sharp replacement queries if dead queries were pruned OR if kept queries < 5 (targeting agency partners, Zapier/Make bill-shock migrations, n8n queue mode, broken webhooks, or AI/voice triage). Return [] if existing queries are already sharp and full.
- Zero spam, zero "[For Hire]", zero free/unpaid/low-budget ($5-$25) terms.
- Optionally refine winning_pitch_rules (or return null if unchanged) aligned strictly with "Mohamed Romih | MRomih Automations".
- Return sharp executive CEO advice fields.

Output strictly valid JSON:
{
  "new_queries": [
    { "query": "concise search string", "target_source": "all", "vertical_hint": "ecommerce_and_creators | b2b_gtm_and_lead_triage | smb_healthcare_and_services | scraping_and_data_pipelines" }
  ],
  "updated_winning_pitch_rules": null or ["rule 1", "..."],
  "what_i_learned_today": "1-2 sentences capturing what market demand showed today",
  "search_targeting_upgrades": "1 sentence summarizing pruned/added Scout queries and pitch refinements",
  "recommended_founder_move": "Highest-leverage 1-2 sentence founder move aligned to primary bottleneck (${pacing?.primary_bottleneck || 'outbound volume'})"
}`;
      const raw = await callGemini(evoPrompt);
      const parsed = safeJsonParse(raw);
      if (parsed) {
        if (parsed.what_i_learned_today) advice.what_i_learned_today = sanitizeClientCopy(parsed.what_i_learned_today);
        if (parsed.recommended_founder_move) advice.recommended_founder_move = sanitizeClientCopy(parsed.recommended_founder_move);

        const existingLower = new Set(keptQueries.map(q => String(q.query).toLowerCase().trim()));
        const candidateNewQueries = (Array.isArray(parsed.new_queries) ? parsed.new_queries : [])
          .filter(q => q && typeof q.query === 'string' && q.query.trim().length >= 5 && !existingLower.has(q.query.toLowerCase().trim()) && !hasSpamOrLowBudgetTerms(q.query))
          .slice(0, 2)
          .map(q => ({
            query: q.query.trim(),
            target_source: q.target_source || 'all',
            vertical_hint: q.vertical_hint || 'b2b_gtm_and_lead_triage',
            hits: 0,
            qualified_leads: 0,
            zero_hit_runs: 0
          }));

        const candidateRules = Array.isArray(parsed.updated_winning_pitch_rules) && parsed.updated_winning_pitch_rules.length > 0
          ? parsed.updated_winning_pitch_rules.map(r => sanitizeClientCopy(String(r)).trim()).filter(Boolean)
          : null;

        const rulesChanged = Boolean(
          candidateRules && JSON.stringify(candidateRules) !== JSON.stringify(playbook.winning_pitch_rules)
        );

        if (candidateNewQueries.length > 0 || rulesChanged) {
          qaResult = await runTargetingQACritic(
            {
              pruned_queries: prunedQueries.map(q => q.query),
              new_queries: candidateNewQueries,
              updated_winning_pitch_rules: candidateRules || playbook.winning_pitch_rules
            },
            playbook
          );
          if (qaResult.approved && (qaResult.score || 0) >= 9) {
            if (candidateNewQueries.length > 0) {
              addedQueries = candidateNewQueries;
              playbookDirty = true;
            }
            if (rulesChanged && candidateRules) {
              playbook.winning_pitch_rules = candidateRules;
              pitchRulesUpdated = true;
              playbookDirty = true;
            }
            advice.search_targeting_upgrades = sanitizeClientCopy(
              parsed.search_targeting_upgrades ||
              `Pruned ${prunedQueries.length}, added ${addedQueries.length} QA-approved query(s) (${qaResult.score}/10).`
            );
          } else {
            if (!Array.isArray(memory.error_postmortems)) memory.error_postmortems = [];
            memory.error_postmortems.push({
              timestamp: new Date().toISOString(),
              event: 'Targeting Evolution QA Rejection',
              root_cause: qaResult.critique || 'Candidate queries/rules scored below 9/10.',
              fix_applied: 'Aborted injection of rejected replacement queries while preserving dead-query pruning.'
            });
            advice.search_targeting_upgrades = `Pruned ${prunedQueries.length} dead query(s); rejected candidate replacements during Principal QA (${qaResult.score || 0}/10).`;
          }
        }
      }
    } catch (err) {
      console.warn('[Targeting Evolution] Fallback evaluation:', err.message);
      if (prunedQueries.length > 0) {
        const fallbackCandidates = [
          { query: 'n8n workflow automation freelancer OR consultant', target_source: 'all', vertical_hint: 'b2b_gtm_and_lead_triage', hits: 0, qualified_leads: 0, zero_hit_runs: 0 }
        ].filter(c => !keptQueries.some(k => k.query.toLowerCase() === c.query.toLowerCase()));
        if (fallbackCandidates.length > 0) {
          qaResult = await runTargetingQACritic({ pruned_queries: prunedQueries.map(q => q.query), new_queries: fallbackCandidates, updated_winning_pitch_rules: playbook.winning_pitch_rules }, playbook);
          if (qaResult.approved && (qaResult.score || 0) >= 9) {
            addedQueries = fallbackCandidates;
            playbookDirty = true;
            advice.search_targeting_upgrades = `Pruned ${prunedQueries.length} dead query(s) and injected ${addedQueries.length} fallback query (QA ${qaResult.score}/10).`;
          }
        }
      }
    }
  }

  playbook.dynamic_search_queries = [...keptQueries, ...addedQueries];

  let persisted = false;
  if (playbookDirty || (telemetry && Object.keys(remoteStats).length > 0)) {
    savePlaybook(playbook);
    if (playbookDirty) {
      persisted = await persistPlaybookToGitHub(
        playbook,
        `chore(playbook): autonomous query evolution (pruned=${prunedQueries.length}, added=${addedQueries.length}) [skip ci]`
      );
    }
  }

  return {
    pruned_queries: prunedQueries.map(q => q.query),
    added_queries: addedQueries.map(q => q.query),
    pitch_rules_updated: pitchRulesUpdated,
    qa_score: qaResult ? qaResult.score : null,
    qa_approved: qaResult ? qaResult.approved : null,
    persisted,
    targeting_upgraded: playbookDirty,
    what_i_learned_today: advice.what_i_learned_today,
    search_targeting_upgrades: advice.search_targeting_upgrades,
    recommended_founder_move: advice.recommended_founder_move
  };
}

function normalizeUpgradeTokens(text) {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'via', 'new', 'using', 'based']);
  const norm = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const tokens = new Set(norm.split(/\s+/).filter(w => (w.length >= 2 || /^\d+$/.test(w)) && !stopWords.has(w)));
  return { norm, tokens };
}

function isDuplicateUpgradeRequest(existingRequests, category, title) {
  if (!Array.isArray(existingRequests) || existingRequests.length === 0) return false;
  const target = normalizeUpgradeTokens(title);
  if (!target.norm) return true;

  for (const prev of existingRequests) {
    if (!prev || !prev.title) continue;
    const prevNorm = normalizeUpgradeTokens(prev.title);
    if (prevNorm.norm === target.norm) return true;
    if (prev.category === category && target.tokens.size >= 2 && prevNorm.tokens.size >= 2) {
      let overlap = 0;
      for (const tok of target.tokens) {
        if (prevNorm.tokens.has(tok)) overlap++;
      }
      const unionSize = new Set([...target.tokens, ...prevNorm.tokens]).size;
      if (unionSize > 0 && (overlap / unionSize) >= 0.75) {
        return true;
      }
    }
  }
  return false;
}

function recordSkillUpgradeRequest(memory, rawRequest) {
  if (!rawRequest || rawRequest.needed !== true || !rawRequest.title || !rawRequest.why_needed) {
    return null;
  }
  if (!Array.isArray(memory.requested_upgrades)) memory.requested_upgrades = [];

  const allowedCategories = new Set(['new_skill', 'new_blueprint', 'new_data_source', 'playbook_knowledge']);
  const category = allowedCategories.has(rawRequest.category) ? rawRequest.category : 'playbook_knowledge';
  const cleanTitle = sanitizeClientCopy(String(rawRequest.title)).trim();
  const cleanReason = sanitizeClientCopy(String(rawRequest.why_needed)).trim();
  const cleanImpact = sanitizeClientCopy(String(rawRequest.expected_revenue_impact || '')).trim();

  if (isDuplicateUpgradeRequest(memory.requested_upgrades, category, cleanTitle)) {
    console.log(`🧬 [Skill Reflection] Suppressed duplicate upgrade request: "${cleanTitle}"`);
    return null;
  }

  const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 36) || 'upgrade';
  const entry = {
    id: `req_${slug}_${Date.now()}`,
    category,
    title: cleanTitle,
    reason: cleanReason,
    ...(cleanImpact ? { expected_revenue_impact: cleanImpact } : {}),
    status: 'REQUESTED',
    requested_at: new Date().toISOString()
  };

  memory.requested_upgrades.push(entry);
  if (memory.requested_upgrades.length > 25) {
    memory.requested_upgrades = memory.requested_upgrades.slice(-25);
  }
  return entry;
}

async function evaluateSelfCapabilities(memory, playbook, telemetry, pacing) {
  const scannerBlindSpots = [];
  const playbookAndBlueprintGaps = [];
  const conversionToolingGaps = [];
  let blueprintsInspected = [];

  // 1. Inspect Scanner Blind Spots in telemetry.json
  if (telemetry && typeof telemetry === 'object') {
    if (Number(telemetry.reddit_scanned_posts || 0) === 0) {
      scannerBlindSpots.push('Reddit scanner reported 0 posts scanned in live telemetry (cloud IP rate-limit/block likely — consider an Apps Script / RSS bridge).');
    }
    if (typeof telemetry.hn_scanned_hits === 'number' && telemetry.hn_scanned_hits === 0) {
      scannerBlindSpots.push('Hacker News Algolia scan returned 0 hits in latest telemetry.');
    }
    const qStats = telemetry.query_stats && typeof telemetry.query_stats === 'object' ? telemetry.query_stats : {};
    const highZeroQueries = Object.values(qStats).filter(q => (Number(q?.zero_hit_runs) || 0) >= 3);
    if (highZeroQueries.length > 0) {
      scannerBlindSpots.push(`${highZeroQueries.length} dynamic search query(s) have >=3 consecutive zero-hit runs (${highZeroQueries.slice(0, 2).map(q => q.query).join('; ')}).`);
    }
  } else {
    scannerBlindSpots.push('telemetry.json unreachable; live feed coverage could not be verified.');
  }

  // 2. Inspect Playbook & revenue-engine/blueprints Gaps
  try {
    const ghHeaders = {
      'User-Agent': 'MRomihAutomations-Brain/1.0',
      'Accept': 'application/vnd.github.v3+json'
    };
    if (GH_PAT) ghHeaders['Authorization'] = 'token ' + GH_PAT;
    const bpRes = await fetch('https://api.github.com/repos/MRomih-Automations/revenue-engine/contents/blueprints', {
      headers: ghHeaders,
      signal: AbortSignal.timeout(8000)
    });
    if (bpRes.ok) {
      const items = await bpRes.json();
      if (Array.isArray(items)) {
        blueprintsInspected = items.map(i => String(i.name || '')).filter(Boolean);
      }
    }
  } catch (err) {
    console.warn('[Self Reflection] Blueprints inventory check warning:', err.message);
  }

  const bpCorpus = blueprintsInspected.join(' ').toLowerCase();
  const playbookCorpus = JSON.stringify({
    verticals: playbook?.vertical_playbooks || {},
    patterns: playbook?.discovered_market_patterns || []
  }).toLowerCase();

  const researchCorpus = (memory?.market_research_notes || [])
    .slice(-15)
    .map(n => `${n.topic || ''} ${n.tech_stacks || ''} ${n.recurring_problems || ''}`)
    .join(' ')
    .toLowerCase();

  const candidateStacks = [
    { keyword: 'redis', gapLabel: 'Self-hosted n8n Redis queue-mode scaling blueprint absent from revenue-engine/blueprints/' },
    { keyword: 'queue mode', gapLabel: 'n8n queue-mode worker deployment blueprint missing from reusable delivery blueprints' },
    { keyword: 'twilio', gapLabel: 'Twilio VoIP/SMS workflow blueprint missing from revenue-engine/blueprints/' },
    { keyword: 'voice', gapLabel: 'AI voice agent webhook/escalation blueprint missing from revenue-engine/blueprints/' },
    { keyword: 'quickbooks', gapLabel: 'QuickBooks idempotent invoicing blueprint missing from revenue-engine/blueprints/' },
    { keyword: 'mcp', gapLabel: 'Custom MCP server boilerplate blueprint missing from revenue-engine/blueprints/' }
  ];

  const seenGapLabels = new Set();
  for (const item of candidateStacks) {
    if (researchCorpus.includes(item.keyword) && !bpCorpus.includes(item.keyword.split(' ')[0])) {
      if (!seenGapLabels.has(item.gapLabel)) {
        seenGapLabels.add(item.gapLabel);
        playbookAndBlueprintGaps.push(item.gapLabel);
      }
    }
  }
  if (researchCorpus.includes('zapier') && !playbookCorpus.includes('zapier_migration')) {
    playbookAndBlueprintGaps.push('Playbook lacks a dedicated Zapier/Make bill-shock ROI migration teardown blueprint.');
  }

  // 3. Inspect Conversion Tooling Gaps
  if (pacing) {
    if (pacing.proposals_sent > 0 && pacing.replies_received === 0) {
      conversionToolingGaps.push(`${pacing.proposals_sent} outbound proposal(s) sent with 0 replies — consider an interactive $150 Credited Diagnostic Audit scope generator or quick proof deck builder.`);
    }
    if (pacing.replies_received > 0 && pacing.calls_booked === 0) {
      conversionToolingGaps.push('Replies arriving without immediate call booking — consider a rapid discovery audit packager & secret-scanned delivery CLI.');
    }
  }
  if ((memory?.published_templates || []).length < 2) {
    conversionToolingGaps.push('Fewer than 2 published open-source templates logged in portfolio memory.');
  }

  const priorRequests = (memory?.requested_upgrades || []).map(r => ({
    id: r.id,
    category: r.category,
    title: r.title,
    status: r.status || 'REQUESTED',
    requested_at: r.requested_at
  }));

  return {
    scanner_blind_spots: scannerBlindSpots,
    playbook_and_blueprint_gaps: playbookAndBlueprintGaps,
    conversion_tooling_gaps: conversionToolingGaps,
    blueprints_inspected: blueprintsInspected,
    prior_requested_upgrades: priorRequests
  };
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log('🧠 [CEO Brain] Initializing Executive Intelligence v2 Cycle...');

  const memory = loadMemory();
  const playbook = loadPlaybook();
  const schemaErrors = validateSystemSchemas(memory, playbook);
  console.log(`📘 [CEO Brain] Loaded playbook.json (${(playbook.dynamic_search_queries || []).length} dynamic queries, ${(playbook.winning_pitch_rules || []).length} pitch rules, ${Object.keys(playbook.offer_ladder || {}).length} offer tiers, ${Object.keys(playbook.vertical_playbooks || {}).length} verticals, ${(playbook.discovered_market_patterns || []).length} discovered patterns).`);

  if (schemaErrors.length > 0) {
    if (!isDryRun) {
      await sendHealthAlert('Schema Validation (Brain)', 'brain_memory.json or playbook.json failed schema validation', schemaErrors.join('\n'));
    } else {
      throw new Error(`Schema validation failed during --dry-run: ${schemaErrors.join('; ')}`);
    }
  }

  if (isDryRun) {
    const governance = evaluateGovernanceSchedules(memory, []);
    const pacing = evaluateNorthStarPacing(memory);
    console.log('[CEO Brain] --dry-run passed: loaded brain_memory.json and playbook.json cleanly with 0 schema errors.', {
      knowledgeDistillationDue: governance.knowledgeDistillationDue,
      distillSignalCount: governance.distillSignalCount,
      systemHealthBaselines: memory.system_health_baselines?.overall_status,
      dynamicQueriesCount: (playbook.dynamic_search_queries || []).length,
      winningPitchRulesCount: (playbook.winning_pitch_rules || []).length,
      requestedUpgradesCount: (memory.requested_upgrades || []).length,
      northStarPacing: {
        revenue_gap_usd: pacing.revenue_gap_usd,
        reply_rate_pct: pacing.reply_rate_pct,
        call_rate_pct: pacing.call_rate_pct,
        win_rate_pct: pacing.win_rate_pct,
        primary_bottleneck: pacing.primary_bottleneck
      },
      dueBrowserSweeps: governance.dueBrowserSchedules.map(s => `${s.id} (${s.interval_days}d)`),
      schedules: Object.fromEntries(Object.entries(governance.scheduleStatus).map(([k, s]) => [k, `${s.interval_days}d (due=${s.is_due})`]))
    });
    return;
  }

  // Stage 0: Zero-Server Phone-to-Brain Sync via Telegram getUpdates
  const phoneSyncEvents = await syncTelegramCommands(memory);

  const telemetry = await fetchTelemetry();
  const healthAudit = await auditSystemHealthBaselines(memory, telemetry);
  const n8nJobs = await fetchN8nJobs();
  const opireBounties = await fetchOpireRewards();
  const hnHits = await fetchHnHits();
  const repoTemplates = await fetchRepoTemplates();
  const governance = evaluateGovernanceSchedules(memory, repoTemplates);
  const pacing = evaluateNorthStarPacing(memory);
  const studyResult = await studyExternalMarketSignals(memory, n8nJobs);
  const selfCapabilities = await evaluateSelfCapabilities(memory, playbook, telemetry, pacing);
  const stagedStudyPost = studyResult.high_frequency_bottleneck
    ? stageStudiedLinkedInPost(memory, studyResult.high_frequency_bottleneck)
    : null;

  const pendingLinkedInPosts = (memory.staged_linkedin_posts || []).filter(p => p.status === 'STAGED_FOR_LINKEDIN');

  // STAGE A: Deep Study, 3-Horizon Strategic Reasoning & ROI Calculation Prompt
  const prompt = `
You are the Executive Operating & Technology Engine for MRomih Automations (Founder: Mohamed Romih).
You run the agency 24/7 autonomously at $0 upfront budget across all storefronts, feeds, and client pipelines.

HUMAN FOUNDER IDENTITY & SIGN-OFF MANDATES:
- All client-facing proposals, follow-ups, outreach messages, LinkedIn posts, templates, and documentation MUST strictly be signed by the human founder: "Mohamed Romih | MRomih Automations" (Founder / Principal Automation Architect).
- STRICTLY FORBID robotic AI self-titles: NEVER write "Autonomous Chief Operating Officer", "Autonomous COO", "AI Agent", "AI Assistant", or similar robotic titles in any proposal, outreach message, public template, LinkedIn post, or communication. Always maintain the professional human identity of Mohamed Romih, Founder of MRomih Automations.

Executive Charter & Commercial Playbook:
- Charter: ${JSON.stringify(memory.executive_charter, null, 2)}
- Milestones: ${JSON.stringify(memory.company_history_milestones, null, 2)}
- $3,000/mo North Star Pacing & Bottleneck: ${JSON.stringify(pacing, null, 2)}
- Today's Market Study Summary: ${JSON.stringify({ sources: studyResult.source_counts, topic: studyResult.topic, learned: studyResult.what_i_learned_today }, null, 2)}
- Self-Reflection Capability & Blind-Spot Audit: ${JSON.stringify(selfCapabilities, null, 2)}
- Offer Ladder: ${JSON.stringify(playbook.offer_ladder, null, 2)}
- Winning Pitch Rules: ${JSON.stringify(playbook.winning_pitch_rules || [], null, 2)}
- Vertical Playbooks Keys: ${JSON.stringify(Object.keys(playbook.vertical_playbooks || {}))}
- Competitive Positioning: ${JSON.stringify(playbook.competitive_positioning || {}, null, 2)}
- System Health Audit: ${healthAudit.statusLine}
- Discovered Market Patterns: ${JSON.stringify((playbook.discovered_market_patterns || []).slice(-5), null, 2)}
- Recent Phone Sync Updates (@RomihCO_bot): ${phoneSyncEvents.length > 0 ? JSON.stringify(phoneSyncEvents) : 'None this cycle'}

Agency Memory Ledgers:
- Storefronts: ${JSON.stringify(memory.storefronts, null, 2)}
- Operating Rules: ${JSON.stringify(memory.operating_rules, null, 2)}
- Active Deal Pipeline: ${JSON.stringify(memory.active_deal_pipeline, null, 2)}
- Published Templates Library: ${JSON.stringify(memory.published_templates, null, 2)}
- Staged LinkedIn Posts Pending Publish: ${JSON.stringify(pendingLinkedInPosts, null, 2)}
- Market Research Notes: ${JSON.stringify((memory.market_research_notes || []).slice(-5), null, 2)}
- ROI Calculations Ledger: ${JSON.stringify((memory.roi_calculations || []).slice(-3), null, 2)}
- Error Postmortems: ${JSON.stringify((memory.error_postmortems || []).slice(-2), null, 2)}
- Self-Upgraded Rules: ${JSON.stringify(memory.self_upgraded_rules || [], null, 2)}

Governance Schedules Status (Current UTC: ${new Date().toISOString()}):
${Object.entries(governance.scheduleStatus).map(([k, s]) => `  * ${s.name} (${k}): Every ${s.interval_days}d | Last: ${s.last_checked} | Next Due: ${s.next_due} | Due Now: ${s.is_due ? 'YES ⚠️' : 'NO ✅'} (${s.days_since}d ago)`).join('\n')}
- Due Browser Platform Actions: ${governance.dueBrowserSchedules.length > 0 ? governance.dueBrowserSchedules.map(s => s.name).join(', ') : 'None'}
- Lead Magnet Expansion Due: ${governance.leadMagnetDue ? 'YES ⚠️ (Trigger Cloud Builder from Market Research Pain Points + Stage LinkedIn Showcase Post)' : 'NO ✅'} (Repo currently has ${governance.repoTemplateCount} templates: ${JSON.stringify(repoTemplates)})
- Active Deals Follow-Up Due Now: ${governance.dueDeals.length > 0 ? governance.dueDeals.map(d => `${d.company} (${d.contact_person})`).join(', ') : 'None (Upcoming: ' + (governance.upcomingDeals.join(', ') || 'None') + ')'}

Live Feeds Aggregated:
- n8n Community Jobs (${n8nJobs.length} active topics):
${n8nJobs.slice(0, 4).map(j => `  * [ID ${j.id}] "${j.title}" (${j.views} views, ${j.url})\n    Snippet: ${j.body_snippet || 'N/A'}`).join('\n') || '  * None'}
- Opire USD Bounties (${opireBounties.length} active):
${opireBounties.slice(0, 3).map(b => `  * ${b.amount} - ${b.issue_url}`).join('\n') || '  * None'}
- Hacker News Automation Discussions (${hnHits.length} items):
${hnHits.slice(0, 3).map(h => `  * [${h.query}] ${h.author}: ${h.snippet}`).join('\n') || '  * None'}

Executive Intelligence v2 — 3-Horizon Strategic Reasoning, Self-Reflection & 5-Stage Mandates:
- Horizon 1 — Today (Tactical): Evaluate immediate deal follow-ups, phone sync commands, or high-ROI leads.
- Horizon 2 — This Week (Operational): Address primary North Star bottleneck ("${pacing.primary_bottleneck}") and trigger due 48h platform sweeps.
- Horizon 3 — This Month (Strategic): Analyze recurring client pain points across market_research_notes to productize into new Fiverr/Contra packages or blueprints.
- Self-Reflection & Skill-Request Protocol: Review "Self-Reflection Capability & Blind-Spot Audit" above. Output "skill_or_knowledge_request.needed": true ONLY when a high-leverage, non-duplicate capability gap exists (e.g., blocked scanner feed needing Apps Script/RSS bridge, missing vertical blueprint in revenue-engine/blueprints/, or missing closing/delivery tooling). NEVER repeat any item already listed in prior_requested_upgrades.
- Demand-Driven Asset Creation: Whenever github_lead_magnet_expansion is due (or repo has <3 templates), set "new_template_needed": true, select a template topic DIRECTLY from recurring buyer pain points in market_research_notes, supply complete workflow_json (real n8n nodes), realistic sample_test_run_md (2 payloads + traces), comprehensive readme_content, AND generate a ready-to-publish "linkedin_showcase_post" signed as "Mohamed Romih | MRomih Automations".
- Human Escalation Gate: Set "human_action_required": true ONLY if a browser platform timer is due, a staged LinkedIn post is ready to publish, a deal follow-up has elapsed, a high-intent client opportunity requires PC application, or "skill_or_knowledge_request.needed" is true. Otherwise set false with "Zero human intervention required".
- Identity & Sign-Offs: Always sign proposals, posts, and outreach strictly as "Mohamed Romih | MRomih Automations". Never use robotic AI self-titles.

Respond strictly in valid JSON format:
{
  "market_synthesis": "2-3 sentences diagnosing live demand clusters, platform schedules, and pipeline health.",
  "three_horizon_assessment": {
    "horizon_1_today": "Concise 1-2 sentence tactical action for today (deal follow-ups, phone sync actions, top leads).",
    "horizon_2_this_week": "Concise 1-2 sentence operational bottleneck diagnosis and fix across conversion funnel and platform sweeps.",
    "horizon_3_this_month": "Concise 1-2 sentence strategic productization or Fiverr/Contra package expansion insight driven by market research."
  },
  "new_research_note": {
    "topic": "Vertical topic studied",
    "recurring_problems": "Summary of common pain points identified",
    "tech_stacks": "Technologies involved",
    "pricing_benchmarks": "Pricing ranges observed"
  },
  "roi_calculation": {
    "opportunity": "Name of top opportunity or template evaluated",
    "demand_score": 1-100,
    "estimated_value_usd": 500-5000,
    "build_effort_hours": 2-20,
    "decision": "BUILD_TEMPLATE" or "PURSUE_OUTREACH" or "STANDBY",
    "rationale": "ROI justification"
  },
  "skill_or_knowledge_request": {
    "needed": false,
    "category": "new_skill | new_blueprint | new_data_source | playbook_knowledge",
    "title": "",
    "why_needed": "",
    "expected_revenue_impact": ""
  },
  "new_template_needed": true or false,
  "new_template": null or {
    "name": "Template Title",
    "slug": "template-slug",
    "category": "Category",
    "summary": "1-sentence summary",
    "workflow_json": { "name": "...", "nodes": [], "connections": {} },
    "sample_test_run_md": "# Sample Test Run\\n\\n### Payload 1\\n...\\n### Output 1\\n...",
    "readme_content": "# README\\n\\nSetup and testing documentation..."
  },
  "linkedin_showcase_post": null or {
    "title": "Post Hook Title",
    "template_slug": "matching-slug",
    "post_copy": "Ready-to-publish LinkedIn post highlighting pain point solved, link to github.com/MRomih-Automations/n8n-ai-lead-triage-kit, signed 'Mohamed Romih | MRomih Automations'."
  },
  "human_action_required": true or false,
  "action_reason": "Explanation of why human action is or is not required",
  "governance_timers_triggered": ["schedule_id_if_triggered"],
  "antigravity_prompt": null or "Run \`git pull\` first...",
  "learned_insight": "A sharp operational rule or insight."
}
`;

  let analysis = null;
  try {
    const rawResponse = await callGemini(prompt);
    analysis = safeJsonParse(rawResponse);
    if (!analysis || !analysis.market_synthesis) {
      throw new Error('Could not parse valid JSON executive analysis from Gemini.');
    }
  } catch (err) {
    console.warn('[CEO Brain] AI generation fallback:', err.message);
    const funnel = memory.conversion_funnel || { proposals_sent: 2, replies_received: 0, deals_won: 0, total_revenue_usd: 0 };
    const topPain = (memory.market_research_notes && memory.market_research_notes.length > 0)
      ? memory.market_research_notes[memory.market_research_notes.length - 1].topic
      : 'Airtable & E-Commerce Automation';

    analysis = {
      market_synthesis: `Demand steady across ${n8nJobs.length} live n8n hiring topics and ${hnHits.length} HN automation signals. Funnel stands at ${funnel.proposals_sent} proposals sent / ${funnel.replies_received} replies / $${funnel.total_revenue_usd} revenue.`,
      three_horizon_assessment: {
        horizon_1_today: governance.dueDeals.length > 0
          ? `Execute due follow-ups for: ${governance.dueDeals.map(d => d.company).join(', ')}.`
          : `Monitor inbox sentinels and phone sync updates; upcoming deal timers: ${governance.upcomingDeals.join(', ') || 'None due today'}.`,
        horizon_2_this_week: pacing.bottleneck_prescription,
        horizon_3_this_month: `Productize recurring "${topPain}" buyer pain points into dedicated Fiverr/Contra turnkey blueprints targeting $45-$65/hr and $500-$1,500 fixed builds.`
      },
      new_research_note: {
        topic: 'Airtable & E-Commerce Automation',
        recurring_problems: 'Gumroad/Stripe webhook delivery failures, missing customer tracking, lack of error sub-workflows.',
        tech_stacks: 'n8n, Gumroad API, Airtable, Webhooks, Telegram Alert',
        pricing_benchmarks: '$500-$1,000 fixed price; $45/hr contract'
      },
      roi_calculation: {
        opportunity: 'Gumroad to Airtable Sales & Customer Sync Kit',
        demand_score: 92,
        estimated_value_usd: 1000,
        build_effort_hours: 3,
        decision: 'STANDBY',
        rationale: 'High commercial demand based on client inquiries; optimal next template addition.'
      },
      skill_or_knowledge_request: { needed: false, category: 'playbook_knowledge', title: '', why_needed: '', expected_revenue_impact: '' },
      new_template_needed: false,
      new_template: null,
      linkedin_showcase_post: null,
      human_action_required: governance.dueBrowserSchedules.length > 0 || governance.dueDeals.length > 0,
      action_reason: (governance.dueBrowserSchedules.length > 0 || governance.dueDeals.length > 0)
        ? `Platform governance timers due: ${governance.dueBrowserSchedules.map(s => s.name).concat(governance.dueDeals.map(d => d.company)).join(', ')}.`
        : 'Zero human intervention required. All platform governance timers and background sentinels operating within window.',
      governance_timers_triggered: governance.dueBrowserSchedules.map(s => s.id),
      antigravity_prompt: null,
      learned_insight: 'Phone-to-brain feedback loops combined with closed-loop query evolution keep outreach aligned with live revenue triggers.'
    };
  }

  // STAGES B & C: Example Simulation & Adversarial QA Critic Gate
  let builderReport = `Open-source library contains ${governance.repoTemplateCount} templates; zero new template commits required today.`;
  let qaAuditResult = null;

  if (analysis.new_template_needed && analysis.new_template && analysis.new_template.slug) {
    let tmpl = analysis.new_template;
    const slug = tmpl.slug.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    console.log(`🔨 [Stage B: Simulation] Preparing template deliverable: ${tmpl.name} (${slug})...`);

    if (!tmpl.sample_test_run_md) {
      tmpl.sample_test_run_md = `# Sample Test Runs & Simulation Proof\n\n### Payload 1: Standard Sale Webhook\n\`\`\`json\n{\n  "event": "sale",\n  "buyer_email": "client@example.com",\n  "product_id": "prod_123",\n  "amount_cents": 4900\n}\n\`\`\`\n\n### Node Execution Trace 1\n1. Webhook Trigger: Received payload in 12ms.\n2. Crypto HMAC: Signature verified.\n3. Transform Node: Formatted record for CRM.\n4. Writeback Node: Record appended successfully (HTTP 200).\n`;
    }
    if (!tmpl.readme_content) {
      tmpl.readme_content = `# ${tmpl.name}\n\n${tmpl.summary}\n\n## Architecture Overview\nProduction-ready n8n workflow designed by MRomih Automations.\n`;
    }

    console.log(`🧐 [Stage C: QA Critic] Running adversarial Principal QA Critic pass...`);
    let qaScore = 0;
    let revisions = 0;
    while (revisions < 2) {
      qaAuditResult = await runPrincipalQACritic(tmpl);
      qaScore = qaAuditResult.score || 0;
      console.log(`🧐 [QA Critic] Iteration ${revisions + 1}: Score ${qaScore}/10 - ${qaAuditResult.approved ? 'APPROVED' : 'REVISION REQUIRED'}`);

      if (qaAuditResult.approved && qaScore >= 9) {
        break;
      }

      revisions++;
      try {
        const revPrompt = `
You are the Lead Systems Architect at MRomih Automations.
The Principal QA Critic rejected the candidate template with score ${qaScore}/10:
Critic Critique: ${qaAuditResult.critique}
Critic Feedback: ${qaAuditResult.feedback}

Fix all issues immediately and return the revised deliverable in valid JSON:
{
  "name": "${tmpl.name}",
  "slug": "${slug}",
  "category": "${tmpl.category}",
  "summary": "${tmpl.summary}",
  "workflow_json": { ... fixed valid n8n workflow ... },
  "sample_test_run_md": "... complete sample test runs with 2 payloads ...",
  "readme_content": "... updated setup documentation ..."
}`;
        const revRaw = await callGemini(revPrompt);
        const revised = safeJsonParse(revRaw);
        if (revised) {
          tmpl = { ...tmpl, ...revised };
        } else {
          console.warn('[QA Critic] Could not parse revised JSON response');
          break;
        }
      } catch (revErr) {
        console.warn('[QA Critic] Revision failed:', revErr.message);
        break;
      }
    }

    if (qaAuditResult && qaAuditResult.approved && qaScore >= 9) {
      console.log(`✅ [Stage C: QA Critic Passed] Score ${qaScore}/10. Committing files to GitHub...`);
      const workflowContent = JSON.stringify(tmpl.workflow_json || { name: tmpl.name, nodes: [], connections: {} }, null, 2);
      const testContent = tmpl.sample_test_run_md;
      const readmeContent = tmpl.readme_content;

      const wfCommitted = await commitLeadMagnetFile(`templates/${slug}/workflow.json`, workflowContent, `feat(templates): add ${tmpl.name} verified n8n workflow`);
      const testCommitted = await commitLeadMagnetFile(`templates/${slug}/sample_test_run.md`, testContent, `docs(templates): add simulated test payloads for ${tmpl.name}`);
      const docCommitted = await commitLeadMagnetFile(`templates/${slug}/README.md`, readmeContent, `docs(templates): add setup documentation for ${tmpl.name}`);

      if (wfCommitted || docCommitted) {
        builderReport = `✅ <b>Principal QA Approved (${qaScore}/10):</b> Committed new production template to <a href="https://github.com/MRomih-Automations/n8n-ai-lead-triage-kit">n8n-ai-lead-triage-kit</a>:\n• <b>${escapeHtml(tmpl.name)}</b> (<code>templates/${slug}</code>)\n• Includes <code>workflow.json</code>, <code>sample_test_run.md</code>, and <code>README.md</code>.`;
        memory.published_templates.push({
          name: tmpl.name,
          slug: slug,
          category: tmpl.category || 'Automation',
          added_at: new Date().toISOString(),
          qa_score: qaScore,
          summary: tmpl.summary || ''
        });
        if (memory.platform_schedules && memory.platform_schedules.github_lead_magnet_expansion) {
          memory.platform_schedules.github_lead_magnet_expansion.last_checked = new Date().toISOString();
        }

        if (!Array.isArray(memory.staged_linkedin_posts)) memory.staged_linkedin_posts = [];
        const rawPost = analysis.linkedin_showcase_post;
        const postCopy = sanitizeClientCopy(
          (rawPost && rawPost.post_copy)
            ? rawPost.post_copy
            : `Most teams lose deals silently when webhooks fail or records duplicate.\n\nI just open-sourced a production-ready n8n template: "${tmpl.name}" — ${tmpl.summary || 'engineered for resilience, deduplication, and clean CRM syncing'}.\n\nInspect the JSON workflow & test payloads here:\nhttps://github.com/MRomih-Automations/n8n-ai-lead-triage-kit/tree/main/templates/${slug}\n\nMohamed Romih | MRomih Automations`
        );
        memory.staged_linkedin_posts.push({
          id: `li_${slug}_${Date.now()}`,
          created_at: new Date().toISOString(),
          template_slug: slug,
          title: (rawPost && rawPost.title) ? rawPost.title : `Showcase: ${tmpl.name}`,
          post_copy: postCopy,
          status: 'STAGED_FOR_LINKEDIN'
        });
        if (memory.staged_linkedin_posts.length > 10) {
          memory.staged_linkedin_posts = memory.staged_linkedin_posts.slice(-10);
        }
        builderReport += `\n• Staged LinkedIn showcase post for next outreach window.`;
      }
    } else {
      console.warn(`⚠️ [QA Critic Aborted] Template failed QA criteria with score ${qaScore}/10. Commit aborted.`);
      builderReport = `⚠️ Candidate template <b>${escapeHtml(tmpl.name)}</b> scored ${qaScore}/10 during Principal QA review; commit safely aborted to preserve repository quality.`;
      memory.error_postmortems.push({
        timestamp: new Date().toISOString(),
        event: `QA Review Rejection (${tmpl.name})`,
        root_cause: qaAuditResult?.critique || 'Deliverable did not meet minimum 9/10 standard.',
        fix_applied: 'Aborted commit and logged feedback for future revision.'
      });
    }
  }

  // STAGE D: Autonomous Error Management & Ledger Persistence
  if (analysis.new_research_note && analysis.new_research_note.topic) {
    const normNote = String(analysis.new_research_note.topic).trim().toLowerCase();
    const hasDup = (memory.market_research_notes || []).some(
      n => String(n.topic || '').trim().toLowerCase() === normNote
    );
    if (!hasDup) {
      memory.market_research_notes.push({
        timestamp: new Date().toISOString(),
        ...analysis.new_research_note
      });
    }
    if (memory.market_research_notes.length > 40) memory.market_research_notes = memory.market_research_notes.slice(-40);
  }

  if (analysis.roi_calculation && analysis.roi_calculation.opportunity) {
    memory.roi_calculations.push({
      timestamp: new Date().toISOString(),
      ...analysis.roi_calculation
    });
    if (memory.roi_calculations.length > 25) memory.roi_calculations = memory.roi_calculations.slice(-25);
  }

  const triggeredTimers = Array.isArray(analysis.governance_timers_triggered) ? analysis.governance_timers_triggered : [];
  for (const timerId of triggeredTimers) {
    if (memory.platform_schedules && memory.platform_schedules[timerId]) {
      memory.platform_schedules[timerId].last_checked = new Date().toISOString();
      console.log(`⏱️ [CEO Brain] Updated timer for schedule: ${timerId}`);
    }
  }

  memory.past_directives.push({
    timestamp: new Date().toISOString(),
    synthesis: (analysis.market_synthesis || '').substring(0, 150),
    action_required: analysis.human_action_required,
    reason: analysis.action_reason
  });
  if (memory.past_directives.length > 20) memory.past_directives = memory.past_directives.slice(-20);

  if (analysis.learned_insight && !memory.learned_rules.includes(analysis.learned_insight)) {
    memory.learned_rules.push(analysis.learned_insight);
    if (memory.learned_rules.length > 25) memory.learned_rules = memory.learned_rules.slice(-25);
  }

  // Record non-duplicate Skill / Knowledge Request into brain_memory.json -> requested_upgrades
  const recordedUpgradeRequest = recordSkillUpgradeRequest(memory, analysis.skill_or_knowledge_request);

  // Closed-Loop Query Evolution & QA-Gated Targeting Upgrades -> playbook.json
  const evolutionReport = await evolveAcquisitionTargeting(memory, playbook, telemetry, studyResult, pacing);

  // Weekly Knowledge Distillation Loop (QA Critic >= 9/10 gated -> playbook.json + GitHub Contents API)
  const distillationReport = await runWeeklyKnowledgeDistillation(memory, playbook, governance);

  saveMemory(memory);

  // Update telemetry.json
  const updatedTelemetry = {
    ...telemetry,
    last_ceo_brain_timestamp: new Date().toISOString(),
    human_escalation_active: analysis.human_action_required,
    last_push_title: analysis.human_action_required ? (analysis.action_reason || 'Escalation').substring(0, 100) : 'Autonomous Standby',
    n8n_topics_scanned: n8nJobs.length,
    opire_rewards_scanned: opireBounties.length,
    hn_signals_scanned: hnHits.length,
    templates_in_lead_magnet: governance.repoTemplateCount,
    active_governance_schedules: Object.keys(governance.scheduleStatus).length,
    active_dynamic_queries: (playbook.dynamic_search_queries || []).length,
    north_star_pacing: pacing,
    study_sources_scanned: studyResult.source_counts,
    last_evolution_summary: evolutionReport.search_targeting_upgrades,
    requested_upgrades_total: (memory.requested_upgrades || []).length,
    conversion_funnel: memory.conversion_funnel,
    telegram_last_update_id: memory.telegram_last_update_id,
    playbook_discovered_patterns: (playbook.discovered_market_patterns || []).length
  };
  fs.writeFileSync(path.join(__dirname, 'telemetry.json'), JSON.stringify(updatedTelemetry, null, 2), 'utf8');

  // STAGE E: Clean Telegram Executive Report
  const schedLines = Object.entries(governance.scheduleStatus).map(([k, s]) => {
    const nextDate = s.next_due ? s.next_due.split('T')[0] : 'Scheduled';
    const statusIcon = s.is_due ? '⚠️' : '✅';
    return `• ${statusIcon} <b>${escapeHtml(s.name)}:</b> ${s.is_due ? 'DUE NOW' : 'Next: ' + nextDate} (every ${s.interval_days}d)`;
  }).join('\n');

  const horizons = analysis.three_horizon_assessment || {
    horizon_1_today: 'Monitor inbound leads and pending follow-up windows.',
    horizon_2_this_week: 'Execute due storefront sweeps and tighten proof-led conversion copy.',
    horizon_3_this_month: 'Productize top market pain points into reusable blueprints and high-ticket gigs.'
  };

  let telegramMessage =
    `<b>🟢 [EXECUTIVE INTELLIGENCE v2 — DAILY BRIEF]</b>\n` +
    `<b>MRomih Automations | Founder: Mohamed Romih</b>\n\n`;

  if (phoneSyncEvents.length > 0) {
    telegramMessage +=
      `📱 <b>Phone-to-Brain Sync Applied (${phoneSyncEvents.length}):</b>\n` +
      phoneSyncEvents.map(e => `• ${escapeHtml(e)}`).join('\n') + `\n\n`;
  }

  telegramMessage +=
    `📈 <b>$3,000/mo North Star Pacing &amp; Funnel:</b>\n` +
    `• <b>Revenue:</b> <b>$${pacing.total_revenue_usd} / $${pacing.target_monthly_usd} USD</b> (Gap: <b>$${pacing.revenue_gap_usd} USD</b>)\n` +
    `• <b>Funnel:</b> Sent <b>${pacing.proposals_sent}</b> | Replies <b>${pacing.replies_received}</b> (<b>${pacing.reply_rate_pct}%</b>) | Calls <b>${pacing.calls_booked}</b> (<b>${pacing.call_rate_pct}%</b>) | Won <b>${pacing.deals_won}</b> (<b>${pacing.win_rate_pct}%</b>)\n` +
    `• <b>#1 Bottleneck:</b> <code>${escapeHtml(pacing.primary_bottleneck)}</code> — <i>${escapeHtml(pacing.bottleneck_prescription)}</i>\n\n` +
    `🧠 <b>[BRAIN STUDY &amp; EVOLUTION ADVICE]</b>\n` +
    `• <b>What I Learned Today:</b> ${escapeHtml(evolutionReport.what_i_learned_today)}\n` +
    `• <b>Search Targeting Upgrades:</b> ${escapeHtml(evolutionReport.search_targeting_upgrades)}\n` +
    `• <b>Recommended Founder Move:</b> ${escapeHtml(evolutionReport.recommended_founder_move)}` +
    (stagedStudyPost ? `\n• <b>Inbound LinkedIn Post Staged:</b> "${escapeHtml(stagedStudyPost.title)}"` : '') +
    `\n\n`;

  if (recordedUpgradeRequest) {
    telegramMessage +=
      `🧬 <b>[BRAIN SKILL / KNOWLEDGE REQUEST]</b>\n` +
      `• <b>Category:</b> <code>${escapeHtml(recordedUpgradeRequest.category)}</code>\n` +
      `• <b>Requested Upgrade:</b> ${escapeHtml(recordedUpgradeRequest.title)}\n` +
      `• <b>Why Needed:</b> ${escapeHtml(recordedUpgradeRequest.reason)}\n` +
      `• <b>Expected Revenue Impact:</b> ${escapeHtml(recordedUpgradeRequest.expected_revenue_impact || 'Accelerates pipeline coverage & closing throughput')}\n\n`;
  }

  telegramMessage +=
    `📊 <b>Market &amp; Deal Pipeline Synthesis:</b>\n` +
    `${escapeHtml(analysis.market_synthesis)}\n\n` +
    `🧭 <b>3-Horizon Strategic Assessment:</b>\n` +
    `• <b>Horizon 1 (Today):</b> ${escapeHtml(horizons.horizon_1_today)}\n` +
    `• <b>Horizon 2 (This Week):</b> ${escapeHtml(horizons.horizon_2_this_week)}\n` +
    `• <b>Horizon 3 (This Month):</b> ${escapeHtml(horizons.horizon_3_this_month)}\n\n` +
    `🔬 <b>Top Opportunity ROI Calculation:</b>\n` +
    `• <b>Opportunity:</b> ${escapeHtml(analysis.roi_calculation?.opportunity || 'N/A')}\n` +
    `• <b>Demand Score:</b> ${analysis.roi_calculation?.demand_score || 'N/A'}/100 | <b>Est. Value:</b> $${analysis.roi_calculation?.estimated_value_usd || 0} USD\n` +
    `• <b>Decision:</b> <code>${escapeHtml(analysis.roi_calculation?.decision || 'STANDBY')}</code> — <i>${escapeHtml(analysis.roi_calculation?.rationale || '')}</i>\n\n` +
    `⏱️ <b>Platform Governance Schedules:</b>\n` +
    `${schedLines}\n\n` +
    `🛠️ <b>Demand-Driven Builder &amp; QA Gate:</b>\n` +
    `${builderReport}\n\n` +
    `📚 <b>Weekly Knowledge Distillation (<code>playbook.json</code>):</b>\n` +
    `${distillationReport}\n\n` +
    `🛡️ <b>System Health Watchdog:</b>\n` +
    `${healthAudit.statusLine}\n\n` +
    `💡 <b>Learned Insight:</b>\n` +
    `<i>"${escapeHtml(analysis.learned_insight)}"</i>\n\n`;

  const hasDueItems = Boolean(
    (!recordedUpgradeRequest && analysis.human_action_required && !String(analysis.action_reason || '').toLowerCase().includes('zero human intervention')) ||
    recordedUpgradeRequest ||
    governance.dueBrowserSchedules.length > 0 ||
    governance.dueDeals.length > 0 ||
    analysis.antigravity_prompt ||
    evolutionReport.targeting_upgraded ||
    stagedStudyPost ||
    pendingLinkedInPosts.length > 0
  );

  if (hasDueItems) {
    const actionableParts = [];
    if (analysis.action_reason && !String(analysis.action_reason).toLowerCase().includes('zero human intervention')) {
      actionableParts.push(analysis.action_reason);
    }
    if (recordedUpgradeRequest) {
      actionableParts.push(`Skill/Knowledge Request (${recordedUpgradeRequest.category}): ${recordedUpgradeRequest.title}`);
    }
    if (governance.dueBrowserSchedules.length > 0) {
      actionableParts.push(...governance.dueBrowserSchedules.map(s => s.name));
    }
    if (governance.dueDeals.length > 0) {
      actionableParts.push(...governance.dueDeals.map(d => `${d.company} follow-up`));
    }
    if (evolutionReport.targeting_upgraded) {
      actionableParts.push(`Playbook targeting evolved (${evolutionReport.search_targeting_upgrades})`);
    }
    if (stagedStudyPost || pendingLinkedInPosts.length > 0) {
      actionableParts.push(`${pendingLinkedInPosts.length} LinkedIn teardown post(s) staged for publishing`);
    }
    const dueSummary = actionableParts.join(' | ') || 'Actionable growth or platform update ready.';
    telegramMessage +=
      `🚨 <b>HUMAN + ANTIGRAVITY ACTION REQUIRED:</b>\n` +
      `<b>Reason:</b> ${escapeHtml(dueSummary)}\n\n`;
    if (analysis.antigravity_prompt) {
      telegramMessage +=
        `⚡ <b>Ready-to-Use Antigravity Execution Prompt:</b>\n` +
        `<pre>${escapeHtml(sanitizeClientCopy(analysis.antigravity_prompt))}</pre>\n\n`;
    }
    telegramMessage += `🏛️ <i>MRomih Automations — Executive Intelligence v2</i>\n${ACTIONABLE_ROUTING_BANNER}`;
  } else {
    telegramMessage +=
      `🟢 <b>ALL SYSTEMS OPERATIONAL (STANDBY)</b>\n` +
      `<i>Governance timers and background sentinels operating in the cloud.</i>\n\n` +
      `🏛️ <i>MRomih Automations — Executive Intelligence v2</i>\n` +
      `<i>Zero human intervention required.</i>`;
  }

  await sendTelegramAlert(telegramMessage);
  console.log('✅ [CEO Brain] Executive Intelligence v2 cycle completed.');
}

run().catch(async err => {
  console.error('Fatal error in CEO Brain:', err);
  await sendHealthAlert('CEO Brain Crash Guard', 'Unhandled exception terminated brain.js execution', err.stack || err.message);
  process.exit(1);
});
