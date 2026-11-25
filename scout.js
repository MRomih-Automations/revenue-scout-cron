/**
 * 24/7 Cloud Scout & Telegram Advisor Alert Engine
 * Self-contained runner for GitHub Actions (MRomih-Automations/revenue-scout-cron).
 * Automatically scans:
 * 1. Algora USD Escrow Bounties (< 60 days, 0 competing PRs)
 * 2. Opire USD Bounties (verified open, 0 competing PRs, non-token)
 * 3. n8n Community Jobs (https://community.n8n.io/c/jobs/13.json)
 *
 * All alerts are sent via JSON POST with parse_mode: 'HTML' to prevent $ stripping,
 * and conclude with actionable ⚡ Action Required guidance for the user.
 */
const https = require('node:https');

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sendTelegram(htmlText) {
  return new Promise((resolve, reject) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      console.log('Skipping Telegram: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
      return resolve();
    }
    const data = JSON.stringify({
      chat_id: chatId,
      text: htmlText,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
    const req = https.request({
      hostname: 'api.telegram.org',
      port: 443,
      path: '/bot' + token + '/sendMessage',
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

async function updateLiveTelemetry(metrics, seenN8nTopics) {
  const token = process.env.GH_PAT;
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

async function scanAlgoraBounties(headers, metrics) {
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
    console.log('[Algora] Candidate issues inspected: ' + count);

    for (const item of (data.items || []).slice(0, 5)) {
      const match = item.html_url.match(/github\.com\/([^\/]+\/[^\/]+)\/issues\/(\d+)/);
      if (!match) continue;
      const repo = match[1];
      const issueNum = match[2];

      if (/rustchain|scottcjn/i.test(repo) || /\b(RTC|token|tokens|airdrop|social mining)\b/i.test(item.title)) {
        console.log('[Algora] Skipping blocked non-USD token repo: ' + repo);
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

      const alertMsg = 
        `🎯 <b>NEW VERIFIED ALGORA BOUNTY ($${bounty} USD)</b>\n\n` +
        `<b>Repo:</b> <code>${escapeHtml(repo)}</code>\n` +
        `<b>Issue:</b> #${issueNum} - ${escapeHtml(item.title)}\n` +
        `<b>Escrow:</b> Algora USD ($${bounty})\n` +
        `<b>Competing PRs:</b> 0 (Clean Escrow Opportunity)\n\n` +
        `🔗 <a href="${item.html_url}">View Issue on GitHub</a>\n\n` +
        `⚡ <b>Action Required:</b>\n` +
        `1. Inspect the issue link on GitHub.\n` +
        `2. Open <b>Antigravity</b> on your PC with the repository and issue URL to analyze the codebase, reproduce the bug, and prepare the pull request with zero competing PRs.`;

      await sendTelegram(alertMsg);
    }
  } catch (err) {
    console.error('[Algora] Scan error:', err.message);
  }
}

async function scanOpireBounties(headers, metrics) {
  console.log('[CloudScout] Scanning Opire public reward API...');
  try {
    const res = await fetch('https://api.opire.dev/rewards', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) {
      console.log('[Opire] API returned status ' + res.status);
      return;
    }

    const rewards = await res.json();
    if (!Array.isArray(rewards)) {
      console.log('[Opire] Unexpected response format');
      return;
    }

    metrics.issues_scanned += rewards.length;
    console.log('[Opire] Active rewards inspected: ' + rewards.length);

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
      if (issueData.state !== 'open' || issueData.pull_request) {
        continue;
      }

      const pRes = await fetch('https://api.github.com/repos/' + repo + '/pulls?state=open&per_page=15', { headers });
      if (pRes.ok) {
        const pulls = await pRes.json();
        const competing = pulls.some(pr => new RegExp('#' + issueNum + '\\b|fixes.*#' + issueNum, 'i').test(pr.title + ' ' + (pr.body || '')));
        if (competing) continue;
      }

      metrics.bounties_found++;
      metrics.last_bounty = `${repo} #${issueNum} ($${bounty} Opire)`;
      console.log('[Opire] Qualified bounty found: ' + repo + ' #' + issueNum + ' ($' + bounty + ')');

      const alertMsg = 
        `🎯 <b>NEW VERIFIED OPIRE BOUNTY ($${bounty} USD)</b>\n\n` +
        `<b>Repo:</b> <code>${escapeHtml(repo)}</code>\n` +
        `<b>Issue:</b> #${issueNum} - ${escapeHtml(issueData.title || item.title)}\n` +
        `<b>Escrow:</b> Opire USD ($${bounty})\n` +
        `<b>Competing PRs:</b> 0 (Clean Escrow Opportunity)\n\n` +
        `🔗 <a href="${item.url}">View Issue on GitHub</a>\n\n` +
        `⚡ <b>Action Required:</b>\n` +
        `1. Inspect the issue link on GitHub.\n` +
        `2. Open <b>Antigravity</b> on your PC with the repository and issue URL to claim the bounty and construct the solution before competing PRs are submitted.`;

      await sendTelegram(alertMsg);
    }
  } catch (err) {
    console.error('[Opire] Scan error:', err.message);
  }
}

async function scanN8nCommunityJobs(metrics, seenN8nTopics) {
  console.log('[CloudScout] Scanning n8n Community Jobs category...');
  try {
    const res = await fetch('https://community.n8n.io/c/jobs/13.json', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!res.ok) {
      console.log('[n8n Community] API returned status ' + res.status);
      return;
    }

    const data = await res.json();
    if (!data || !data.topic_list || !Array.isArray(data.topic_list.topics)) {
      console.log('[n8n Community] Unexpected response format');
      return;
    }

    const topics = data.topic_list.topics;
    metrics.issues_scanned += topics.length;
    console.log('[n8n Community] Active topics inspected: ' + topics.length);

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
      // Skip forum guidelines, meta announcements, and freelancer self-promotion threads
      if (!isGenuineN8nJob(topic)) continue;

      const createdTime = new Date(topic.created_at).getTime();
      if (createdTime < fourteenDaysAgo) continue;

      // Deduplication check
      if (seenN8nTopics.has(topic.id)) {
        continue;
      }

      seenN8nTopics.add(topic.id);
      metrics.bounties_found++;
      metrics.last_bounty = `n8n Job: ${topic.title.substring(0, 35)}...`;
      console.log('[n8n Community] Qualified job found: [ID ' + topic.id + '] ' + topic.title);

      const topicUrl = `https://community.n8n.io/t/${topic.slug || topic.id}/${topic.id}`;
      const repliesCount = Math.max(0, (topic.posts_count || 1) - 1);

      const alertMsg = 
        `⚡ <b>NEW N8N COMMUNITY AUTOMATION OPPORTUNITY</b>\n\n` +
        `<b>Title:</b> ${escapeHtml(topic.title)}\n` +
        `<b>Platform:</b> Official n8n Community (Jobs)\n` +
        `<b>Date:</b> ${topic.created_at.split('T')[0]}\n` +
        `<b>Engagement:</b> ${repliesCount} replies | ${topic.views || 0} views\n\n` +
        `🔗 <a href="${topicUrl}">View Job Posting on n8n Community</a>\n\n` +
        `⚡ <b>Action Required:</b>\n` +
        `1. Open the thread link above to review the client's automation requirements.\n` +
        `2. Open <b>Antigravity</b> on your PC with the topic URL to review the technical requirements, design the n8n workflow architecture, and prepare your application reply.`;

      await sendTelegram(alertMsg);
    }
  } catch (err) {
    console.error('[n8n Community] Scan error:', err.message);
  }
}

async function run() {
  console.log('[CloudScout] Starting 24/7 scan cycle at ' + new Date().toISOString());
  const isManual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';

  if (isManual) {
    await sendTelegram('🛰️ <b>Cloud Scout Heartbeat:</b> 24/7 GitHub Actions cron executed in cloud!');
    console.log('Dispatched manual heartbeat alert to Telegram.');
  }

  const headers = {
    'User-Agent': 'MRomih-CloudScout/1.0',
    'Accept': 'application/vnd.github.v3+json'
  };
  if (process.env.GH_PAT) {
    headers['Authorization'] = 'token ' + process.env.GH_PAT;
  }

  const metrics = {
    issues_scanned: 0,
    bounties_found: 0,
    last_bounty: null
  };

  const seenN8nTopics = new Set();

  // 1. Scan Algora escrow bounties
  await scanAlgoraBounties(headers, metrics);

  // 2. Scan Opire public rewards API
  await scanOpireBounties(headers, metrics);

  // 3. Scan n8n Community Jobs
  await scanN8nCommunityJobs(metrics, seenN8nTopics);

  // 4. Update live telemetry in repository
  await updateLiveTelemetry(metrics, Array.from(seenN8nTopics));
  console.log('[CloudScout] Scan cycle completed successfully.');
}

run();
