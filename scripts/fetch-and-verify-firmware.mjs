import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

let token = '';
try {
  const creds = execSync('git credential fill', {
    input: 'protocol=https\nhost=github.com\n',
    encoding: 'utf-8',
    cwd: 'C:/Users/thdav/AppData/Local/Temp/qmk_worktree'
  });
  const m = creds.match(/password=(.*)/);
  if (m) token = m[1].trim();
} catch (e) {
  console.error('Failed to get git credentials:', e);
}

const headers = {
  'User-Agent': 'NodeStudio-Agent',
  'Accept': 'application/vnd.github+json'
};
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

async function main() {
  const runId = process.argv[2] || '43160240812';
  console.log(`Fetching artifacts for run ${runId}...`);
  const artifactsRes = await fetch(`https://api.github.com/repos/david-8837/NODE/actions/runs/${runId}/artifacts`, { headers });
  const artifactsData = await artifactsRes.json();
  console.log(`Found ${artifactsData.total_count} artifacts:`);
  for (const a of artifactsData.artifacts) {
    console.log(`  - Artifact ID ${a.id}: ${a.name} (${a.size_in_bytes} bytes)`);
  }

  const targetArtifact = artifactsData.artifacts.find(a => a.name === 'grid-macro-1-via-firmware');
  if (!targetArtifact) {
    throw new Error('Target artifact grid-macro-1-via-firmware not found');
  }

  console.log(`Downloading artifact ${targetArtifact.id} from ${targetArtifact.archive_download_url}...`);
  const downloadRes = await fetch(targetArtifact.archive_download_url, {
    headers,
    redirect: 'follow'
  });
  if (!downloadRes.ok) {
    throw new Error(`Failed to download artifact: ${downloadRes.status} ${downloadRes.statusText}`);
  }

  const zipBuffer = Buffer.from(await downloadRes.arrayBuffer());
  const tempZipPath = path.resolve('temp_firmware_artifact.zip');
  fs.writeFileSync(tempZipPath, zipBuffer);
  console.log(`Saved artifact zip to ${tempZipPath} (${zipBuffer.length} bytes)`);

  // Unzip using PowerShell
  const extractDir = path.resolve('temp_firmware_extracted');
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
  fs.mkdirSync(extractDir, { recursive: true });

  execSync(`powershell -Command "Expand-Archive -Path '${tempZipPath}' -DestinationPath '${extractDir}' -Force"`);
  console.log(`Extracted artifact to ${extractDir}`);

  const files = fs.readdirSync(extractDir);
  console.log('Extracted files:', files);

  const uf2File = files.find(f => f.endsWith('.uf2'));
  if (!uf2File) throw new Error('UF2 file not found in artifact');

  const uf2Path = path.join(extractDir, uf2File);
  const uf2Bytes = fs.readFileSync(uf2Path);
  const sha256 = crypto.createHash('sha256').update(uf2Bytes).digest('hex');
  console.log(`Compiled UF2 SHA-256: ${sha256} (${uf2Bytes.length} bytes)`);

  const destPath = path.resolve('firmware/grid_macro_1_via.uf2');
  fs.writeFileSync(destPath, uf2Bytes);
  console.log(`Updated firmware saved to ${destPath}`);

  // Copy to Documents paths
  const docPaths = [
    'C:/Users/thdav/Documents/NØDE Grid Macro 1 v1.0.6',
    'C:/Users/thdav/OneDrive/ドキュメント/NØDE Grid Macro 1 v1.0.6'
  ];

  for (const docDir of docPaths) {
    if (fs.existsSync(docDir)) {
      fs.copyFileSync(destPath, path.join(docDir, 'grid_macro_1_via_latest_v1.0.6.uf2'));
      fs.copyFileSync(destPath, path.join(docDir, 'grid_macro_1_via_rawhid.uf2'));
      console.log(`Copied firmware to ${docDir}`);
    }
  }

  // Cleanup temp
  fs.rmSync(tempZipPath, { force: true });
  fs.rmSync(extractDir, { recursive: true, force: true });
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

