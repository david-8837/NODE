// electron/updater.cjs - GitHub Releases Auto-Updater for NODE studio
const fs = require('node:fs');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');
const { app } = require('electron');

const REPO_OWNER = 'david-8837';
const REPO_NAME = 'NODE';
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

function isTrustedUpdateUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'github.com' ||
      host.endsWith('.github.com') ||
      host.endsWith('.githubusercontent.com')
    );
  } catch {
    return false;
  }
}

function sanitizeInstallerFilename(fileName) {
  const base = path.basename(typeof fileName === 'string' ? fileName : '').replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!base || !base.toLowerCase().endsWith('.exe')) {
    return 'NODE-studio-update.exe';
  }
  return base;
}

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
    const version = typeof app?.getVersion === 'function' ? app.getVersion() : '1.1.15';
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
          if (redirectUrl && isTrustedUpdateUrl(redirectUrl)) {
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
    currentVersion || (typeof app?.getVersion === 'function' ? app.getVersion() : '1.1.15');

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

function downloadUpdateInstaller({
  url,
  fileName,
  destDir,
  onProgress,
  httpsModule = https,
  fsModule = fs,
  maxRedirects = 5,
} = {}) {
  if (!isTrustedUpdateUrl(url)) {
    return Promise.resolve({ ok: false, error: 'Untrusted update download URL' });
  }

  const targetDir = destDir || os.tmpdir();
  const safeName = sanitizeInstallerFilename(fileName || path.basename(new URL(url).pathname));
  const finalPath = path.join(targetDir, safeName);
  const partPath = `${finalPath}.part`;
  const version = typeof app?.getVersion === 'function' ? app.getVersion() : '1.1.15';

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const cleanupPart = () => {
      try {
        if (fsModule.existsSync(partPath)) fsModule.unlinkSync(partPath);
      } catch {
        // ignore cleanup errors
      }
    };

    const requestUrl = (currentUrl, redirectsLeft) => {
      if (!isTrustedUpdateUrl(currentUrl)) {
        cleanupPart();
        return finish({ ok: false, error: 'Untrusted redirect URL' });
      }

      const req = httpsModule.get(
        currentUrl,
        { headers: { 'User-Agent': `NODE-studio/${version}` } },
        (res) => {
          const code = res.statusCode || 0;
          if ([301, 302, 303, 307, 308].includes(code)) {
            const nextUrl = res.headers?.location;
            res.resume();
            if (!nextUrl || redirectsLeft <= 0) {
              cleanupPart();
              return finish({ ok: false, error: 'Too many redirects while downloading update' });
            }
            const resolvedNext = new URL(nextUrl, currentUrl).toString();
            return requestUrl(resolvedNext, redirectsLeft - 1);
          }

          if (code !== 200) {
            res.resume();
            cleanupPart();
            return finish({ ok: false, error: `Download failed with HTTP ${code}` });
          }

          const totalBytes = parseInt(res.headers?.['content-length'] || '0', 10) || 0;
          let receivedBytes = 0;
          let lastReportedPercent = -1;
          let lastReportTime = 0;

          let writeStream;
          try {
            fsModule.mkdirSync(targetDir, { recursive: true });
            writeStream = fsModule.createWriteStream(partPath);
          } catch (err) {
            res.resume();
            cleanupPart();
            return finish({
              ok: false,
              error: err instanceof Error ? err.message : 'Failed to create temporary installer file',
            });
          }

          res.on('data', (chunk) => {
            receivedBytes += chunk.length;
            const percent =
              totalBytes > 0 ? Math.min(99, Math.floor((receivedBytes / totalBytes) * 100)) : 0;
            const now = Date.now();
            if (percent !== lastReportedPercent || now - lastReportTime >= 150) {
              lastReportedPercent = percent;
              lastReportTime = now;
              onProgress?.({ percent, receivedBytes, totalBytes });
            }
          });

          res.on('error', (err) => {
            writeStream.destroy();
            cleanupPart();
            finish({ ok: false, error: err.message });
          });

          writeStream.on('error', (err) => {
            res.destroy();
            cleanupPart();
            finish({ ok: false, error: err.message });
          });

          writeStream.on('finish', () => {
            if (receivedBytes <= 0) {
              cleanupPart();
              return finish({ ok: false, error: 'Downloaded installer file was empty' });
            }
            try {
              if (fsModule.existsSync(finalPath)) {
                fsModule.unlinkSync(finalPath);
              }
              fsModule.renameSync(partPath, finalPath);
              onProgress?.({
                percent: 100,
                receivedBytes,
                totalBytes: totalBytes || receivedBytes,
              });
              finish({ ok: true, filePath: finalPath });
            } catch (err) {
              cleanupPart();
              finish({
                ok: false,
                error: err instanceof Error ? err.message : 'Failed to finalize installer file',
              });
            }
          });

          res.pipe(writeStream);
        }
      );

      req.on('error', (err) => {
        cleanupPart();
        finish({ ok: false, error: err.message });
      });
    };

    requestUrl(url, maxRedirects);
  });
}

module.exports = {
  compareVersions,
  fetchLatestRelease,
  checkForAppUpdates,
  downloadUpdateInstaller,
  isTrustedUpdateUrl,
  sanitizeInstallerFilename,
  GITHUB_API_URL,
};
