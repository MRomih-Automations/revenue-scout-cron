/**
 * 24/7 Cloud Scout & Telegram Alert Engine
 * Self-contained runner for GitHub Actions.
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

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.log('Search returned ' + res.status);
      return;
    }
    const data = await res.json();
    console.log('Candidate issues inspected: ' + (data.items ? data.items.length : 0));

    for (const item of (data.items || []).slice(0, 5)) {
      const match = item.html_url.match(/github\.com\/([^\/]+\/[^\/]+)\/issues\/(\d+)/);
      if (!match) continue;
      const repo = match[1];
      const issueNum = match[2];

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
}

run();
