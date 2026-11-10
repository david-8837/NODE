const owner = 'david-8837';
const repository = 'NODE';
const releasesUrl = `https://github.com/${owner}/${repository}/releases`;
const latestReleaseApi = `https://api.github.com/repos/${owner}/${repository}/releases/latest`;

const installerLink = document.querySelector('#download-installer');
const zipLink = document.querySelector('#download-zip');
const releaseVersion = document.querySelector('#release-version');
const installerDetail = document.querySelector('#installer-detail');
const zipDetail = document.querySelector('#zip-detail');
const releaseStatus = document.querySelector('#release-status');
const releaseMessage = document.querySelector('#release-message');

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(megabytes < 10 ? 1 : 0)} MB`;
}

function setStatus(message, state) {
  releaseStatus.dataset.state = state;
  releaseMessage.textContent = message;
}

function setFallbackLinks() {
  installerLink.href = releasesUrl;
  zipLink.href = releasesUrl;
}

function setDownload(link, asset, detail, label) {
  if (!asset?.browser_download_url) return false;
  link.href = asset.browser_download_url;
  link.setAttribute('aria-label', `${label}: ${asset.name}`);
  detail.textContent = [label, formatFileSize(asset.size)].filter(Boolean).join(' · ');
  return true;
}

async function loadLatestRelease() {
  setFallbackLinks();
  try {
    const response = await fetch(latestReleaseApi, {
      headers: { Accept: 'application/vnd.github+json' },
    });

    if (response.status === 404) {
      releaseVersion.textContent = 'FIRST RELEASE SOON';
      installerDetail.textContent = 'NSIS setup · not published yet';
      zipDetail.textContent = 'Portable package · not published yet';
      setStatus('The first public Windows release is not available yet.', 'pending');
      return;
    }
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);

    const release = await response.json();
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const installer = assets.find((asset) => asset.name.toLowerCase().includes('x64') && asset.name.toLowerCase().endsWith('.exe'))
      || assets.find((asset) => asset.name.toLowerCase().endsWith('.exe'));
    const portableZip = assets.find((asset) => asset.name.toLowerCase().includes('x64') && asset.name.toLowerCase().endsWith('.zip'))
      || assets.find((asset) => asset.name.toLowerCase().endsWith('.zip'));

    if (!installer) throw new Error('The latest release has no Windows installer asset');

    const releaseName = release.tag_name || release.name || 'Latest release';
    releaseVersion.textContent = releaseName.toUpperCase();
    setDownload(installerLink, installer, installerDetail, 'NSIS installer');
    if (portableZip) {
      setDownload(zipLink, portableZip, zipDetail, 'Portable ZIP');
    } else {
      zipLink.href = release.html_url || releasesUrl;
      zipDetail.textContent = 'No ZIP attached to this release';
    }

    const published = release.published_at
      ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
          .format(new Date(release.published_at))
      : '';
    const dateNote = published ? ` · published ${published}` : '';
    setStatus(`Latest release ${releaseName}${dateNote}.`, 'ready');
  } catch (error) {
    releaseVersion.textContent = 'GITHUB RELEASES';
    installerDetail.textContent = 'NSIS setup · open release page';
    zipDetail.textContent = 'Portable package · open release page';
    setStatus('Could not load direct links. Browse GitHub releases instead.', 'pending');
    console.warn('Unable to resolve the latest NØDE Studio download:', error);
  }
}

const year = document.querySelector('#copyright-year');
if (year) year.textContent = String(new Date().getFullYear());
loadLatestRelease();
