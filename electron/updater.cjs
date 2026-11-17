// electron/updater.cjs - GitHub Releases Auto-Updater for NODE studio
const https = require('node:https');
const { app } = require('electron');

const REPO_OWNER = 'david-8837';
const REPO_NAME = 'NODE';
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

function compareVersions(current, latest) {
  const parse = (v) =>
    (v || '')
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const [cMaj = 0, cMin = 0, cPat = 0] = parse(current);
  const [lMaj = 0, lMin = 0, lPat = 0] = parse(latest);

  if (lMaj !== cMaj) return lMaj > cMaj ? 1 : -1;
  if (lMin !== cMin) return lMin > cMin ? 1 : -1;
  if (lPat !== cPat) return lPat > cPat ? 1 : -1;
  return 0;
}

function fetchLatestRelease(customFetch) {
  if (customFetch) return customFetch(GITHUB_API_URL);

  return new Promise((resolve) => {
    const version = typeof app?.getVersion === 'function' ? app.getVersion() : '1.1.11';
    const options = {
      headers: {
        'User-Agent': `NODE-studio/${version}`,
        Accept: 'application/vnd.github.v3+json',
      },
    };

    https
      .get(GITHUB_API_URL, options, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            https.get(redirectUrl, options, (redirectRes) => {
              let data = '';
              redirectRes.on('data', (chunk) => {
                data += chunk;
              });
              redirectRes.on('end', () => {
                try {
                  resolve({ ok: true, data: JSON.parse(data) });
                } catch {
                  resolve({ ok: false, error: 'Failed to parse redirect response' });
                }
              });
            }).on('error', (err) => resolve({ ok: false, error: err.message }));
            return;
          }
        }

        if (res.statusCode !== 200) {
          return resolve({
            ok: false,
            error: `GitHub API returned HTTP ${res.statusCode}`,
          });
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ ok: true, data: parsed });
          } catch {
            resolve({ ok: false, error: 'Failed to parse GitHub release payload' });
          }
        });
      })
      .on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });
  });
}

async function checkForAppUpdates({ currentVersion, fetchFn } = {}) {
  const version =
    currentVersion || (typeof app?.getVersion === 'function' ? app.getVersion() : '1.1.11');

  try {
    const result = await fetchLatestRelease(fetchFn);
    if (!result.ok) {
      return {
        ok: false,
        currentVersion: version,
        error: result.error,
      };
    }

    const release = result.data;
    const tagName = release.tag_name || release.name || '';
    const hasUpdate = compareVersions(version, tagName) > 0;

    const exeAsset = (release.assets || []).find(
      (asset) => asset.name && asset.name.endsWith('.exe')
    );

    return {
      ok: true,
      currentVersion: version,
      latestVersion: tagName,
      hasUpdate,
      releaseName: release.name || tagName,
      releaseNotes: release.body || '',
      publishedAt: release.published_at || '',
      downloadUrl:
        exeAsset?.browser_download_url ||
        release.html_url ||
        `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`,
      assetName: exeAsset?.name || null,
    };
  } catch (err) {
    return {
      ok: false,
      currentVersion: version,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

module.exports = {
  compareVersions,
  fetchLatestRelease,
  checkForAppUpdates,
  GITHUB_API_URL,
};
