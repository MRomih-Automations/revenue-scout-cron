/**
 * 24/7 Cloud Scout & Telegram Alert Engine
 * Self-contained runner for GitHub Actions.
 * Automatically updates live telemetry.json on each run.
 */
const https = require('node:https');

function sendTelegram(text) {
  return new Promise((resolve, reject) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      console.log('Skipping Telegram: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
      return resolve();
    }
    const data = JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: false
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

async function updateLiveTelemetry(metrics) {
  const token = process.env.GH_PAT;
  if (!token) {
    console.log('[Telemetry] No GH_PAT found, skipping repository telemetry push.');
    return;
  }

  const owner = 'MRomih-Automations';
  const repo = 'revenue-scout-cron';

  try {
    let sha = null;
    const existing = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/telemetry.json`, {
      headers: { 'Authorization': 'token ' + token, 'User-Agent': 'CloudScout', 'Accept': 'application/vnd.github.v3+json' }
    });
    if (existing.ok) {
      const data = await existing.json();
      sha = data.sha;
    }

    const payload = {
      status: 'HEALTHY',
      last_run_timestamp: new Date().toISOString(),
      heartbeat_unix: Date.now(),
      cron_interval: 'Every 30 minutes',
      provider: 'GitHub Actions Enterprise Cloud',
      issues_scanned: metrics.issues_scanned || 0,
      qualified_bounties_found: metrics.bounties_found || 0,
      last_bounty_title: metrics.last_bounty || null
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

async function run() {
  console.log('[CloudScout] Starting 24/7 scan cycle at ' + new Date().toISOString());
  const isManual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  
  if (isManual) {
    await sendTelegram('🛰️ <b>Cloud Scout Heartbeat:</b> 24/7 GitHub Actions cron successfully executed in the cloud!');
    console.log('Dispatched manual heartbeat alert to Telegram.');
  }

  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const q = 'is:issue is:open commenter:algora-pbc updated:>=' + sixtyDaysAgo + ' sort:updated-desc';
  const url = 'https://api.github.com/search/issues?q=' + encodeURIComponent(q) + '&per_page=10';

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

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.log('Search returned ' + res.status);
      await updateLiveTelemetry(metrics);
      return;
    }
    const data = await res.json();
    metrics.issues_scanned = data.items ? data.items.length : 0;
    console.log('Candidate issues inspected: ' + metrics.issues_scanned);

    for (const item of (data.items || []).slice(0, 5)) {
      const match = item.html_url.match(/github\.com\/([^\/]+\/[^\/]+)\/issues\/(\d+)/);
      if (!match) continue;
      const repo = match[1];
      const issueNum = match[2];

      // Filter out non-USD crypto tokens and explicitly blocked repos
      if (/rustchain|scottcjn/i.test(repo) || /\b(RTC|token|tokens|airdrop|social mining)\b/i.test(item.title)) {
        console.log('Skipping blocked non-USD token repo: ' + repo);
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
      if (closed || bounty < 100) continue;

      const pRes = await fetch('https://api.github.com/repos/' + repo + '/pulls?state=open&per_page=10', { headers });
      if (pRes.ok) {
        const pulls = await pRes.json();
        const competing = pulls.some(pr => new RegExp('#' + issueNum + '\\b|fixes.*#' + issueNum, 'i').test(pr.title + ' ' + (pr.body || '')));
        if (competing) continue;
      }

      metrics.bounties_found++;
      metrics.last_bounty = `${repo} #${issueNum} ($${bounty})`;
      console.log('Found qualified bounty: ' + repo + ' #' + issueNum + ' ($' + bounty + ')');

      await sendTelegram('🎯 <b>NEW VERIFIED BOUNTY FOUND ($' + bounty + ' USD)</b>\n\n' +
        '<b>Repo:</b> ' + repo + '\n' +
        '<b>Issue:</b> #' + issueNum + ' - ' + item.title + '\n' +
        '<b>Escrow:</b> Verified Algora ($' + bounty + ')\n' +
        '<b>Competing PRs:</b> 0\n\n' +
        '🔗 <a href="' + item.html_url + '">View Issue on GitHub</a>');
    }
  } catch (e) {
    console.error('Error during scout:', e.message);
  }

  // Push telemetry update
  await updateLiveTelemetry(metrics);
}

run();
