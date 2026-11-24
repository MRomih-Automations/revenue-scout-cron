/**
 * 24/7 Cloud Scout Automation
 * Runs periodically in GitHub Actions to monitor high-value escrow bounties & freelance leads.
 * Dispatches instant push notifications to Telegram when new opportunities qualify.
 */

const { sendTelegramMessage } = require('../notifications/telegram_bridge.js');

async function runCloudScout() {
    console.log('[CloudScout] Scanning for qualified opportunities...');
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const q = `is:issue is:open commenter:algora-pbc updated:>=${dateFilter = sixtyDaysAgo} sort:updated-desc`;
    const searchUrl = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=10`;

    const ghHeaders = {
        'User-Agent': 'MRomih-Automations-CloudScout/1.0',
        'Accept': 'application/vnd.github.v3+json'
    };
    if (process.env.GH_PAT) {
        ghHeaders['Authorization'] = `token ${process.env.GH_PAT}`;
    }

    try {
        const res = await fetch(searchUrl, { headers: ghHeaders });
        if (!res.ok) {
            console.log(`[CloudScout] GitHub Search API status: ${res.status}`);
            return;
        }

        const data = await res.json();
        console.log(`[CloudScout] Inspected ${data.items ? data.items.length : 0} open issues.`);

        for (const item of (data.items || []).slice(0, 5)) {
            const repoMatch = item.html_url.match(/github\.com\/([^\/]+\/[^\/]+)\/issues\/(\d+)/);
            if (!repoMatch) continue;
            const repo = repoMatch[1];
            const issueNum = repoMatch[2];

            // Verify comments
            const comRes = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNum}/comments`, { headers: ghHeaders });
            if (!comRes.ok) continue;
            const comments = await comRes.json();
            const algoraComments = comments.filter(c => c.user && (c.user.login === 'algora-pbc' || c.user.login === 'algora-pbc[bot]'));
            if (algoraComments.length === 0) continue;

            let bountyAmount = 0;
            let isClaimed = false;
            for (const ac of algoraComments) {
                const body = ac.body || '';
                if (/awarded to|bounty was cancelled|bounty was refunded/i.test(body)) isClaimed = true;
                const m = body.match(/\$([0-9]{2,4})/);
                if (m) bountyAmount = parseInt(m[1], 10);
            }

            if (isClaimed || bountyAmount < 100) continue;

            // Check for competing PRs
            const pullsRes = await fetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=10`, { headers: ghHeaders });
            if (pullsRes.ok) {
                const openPulls = await pullsRes.json();
                const competing = openPulls.some(pr => new RegExp(`#${issueNum}\\b|fixes.*#${issueNum}`, 'i').test(`${pr.title} ${pr.body}`));
                if (competing) continue;
            }

            // High-value vetted opportunity found!
            console.log(`[CloudScout] High-value bounty detected: ${repo} #${issueNum} ($${bountyAmount})`);
            const alertMsg = `🎯 <b>HIGH-VALUE BOUNTY FOUND ($${bountyAmount} USD)</b>\n\n` +
                `<b>Repo:</b> ${repo}\n` +
                `<b>Issue:</b> #${issueNum} - ${item.title}\n` +
                `<b>Escrow:</b> Verified Algora ($${bountyAmount})\n` +
                `<b>Competing PRs:</b> 0\n\n` +
                `🔗 <a href="${item.html_url}">View Issue on GitHub</a>`;

            try {
                await sendTelegramMessage(alertMsg);
                console.log('[CloudScout] Telegram alert sent!');
            } catch (tgErr) {
                console.warn('[CloudScout] Telegram alert not delivered:', tgErr.message);
            }
        }
    } catch (e) {
        console.error('[CloudScout] Error:', e.message);
    }
}

if (require.main === module) {
    runCloudScout();
}

module.exports = runCloudScout;
