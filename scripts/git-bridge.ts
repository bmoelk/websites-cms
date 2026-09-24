import http from 'http';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8788;
const HOST = '127.0.0.1';
const cmsRootDir = path.resolve(__dirname, '..');
const defaultNeutralRepo = '/Users/bmo/code/websites-deployed/brainendeavor.com';

function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // Set CORS headers so Studio UI and Worker can call the bridge
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || '/';

  // 1. Health check
  if (url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', bridge: 'slottd-git-bridge', port: PORT }));
    return;
  }

  // 2. Execute release (Export from D1, commit, tag, push via host SSH)
  if (url === '/exec/release' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const siteId = body.siteId?.trim();
    if (!siteId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: "siteId is required for Git release operations; the 'default' site concept has been abolished." }));
      return;
    }
    const repoPath = body.repoPath?.trim();
    if (!repoPath) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: "repoPath is required for Git release operations." }));
      return;
    }

    const tag = body.tag || `release-${Date.now()}`;
    const message = body.message || `chore(content): release snapshot ${tag}`;
    const push = body.push !== false;
    const remoteUrl = body.url?.trim();
    const branch = body.branch?.trim() || 'main';

    let outputLog = '';

    try {
      const hasLocalGit = fs.existsSync(path.join(repoPath, '.git'));
      let workingDir = repoPath;
      let tempDir: string | null = null;

      if (!hasLocalGit) {
        if (!remoteUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `Declared repository '${repoPath}' has no .git directory and no remote URL was provided for an ephemeral clone.`,
          }));
          return;
        }
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slottd-bridge-release-'));
        workingDir = tempDir;
        outputLog += `⚡ [Bridge] No local clone declared at ${repoPath}. Using ephemeral scratch clone at ${tempDir}.\n`;
        execSync(`git clone --depth 1 --branch "${branch}" "${remoteUrl}" "${tempDir}"`, { encoding: 'utf8' });
      } else {
        outputLog += `📂 [Bridge] Releasing directly in local repository: ${repoPath}\n`;
      }

      // Step A: Trigger fresh export from D1 to content files
      outputLog += `[Bridge] Exporting active D1 database to ${workingDir} (site: ${siteId})...\n`;
      try {
        const exportOutput = execSync(`npx tsx scripts/sync-git.ts --export --site=${siteId}`, {
          cwd: cmsRootDir,
          encoding: 'utf8',
        });
        outputLog += exportOutput.trim() + '\n';
      } catch (exportErr: any) {
        outputLog += `[Notice] Export warning: ${exportErr.message}\n`;
      }

      // Step B: Git add, commit, tag
      outputLog += `[Bridge] Staging changes in ${workingDir}...\n`;
      execSync(`git -C "${workingDir}" add -A`, { encoding: 'utf8' });

      outputLog += `[Bridge] Creating commit...\n`;
      const commitRes = execSync(
        `git -C "${workingDir}" commit -m "${message.replace(/"/g, '\\"')}" || true`,
        { encoding: 'utf8' }
      );
      if (commitRes.trim()) outputLog += commitRes.trim() + '\n';

      outputLog += `[Bridge] Creating annotated tag '${tag}'...\n`;
      const tagRes = execSync(
        `git -C "${workingDir}" tag -a "${tag.replace(/"/g, '\\"')}" -m "${message.replace(/"/g, '\\"')}" || true`,
        { encoding: 'utf8' }
      );
      if (tagRes.trim()) outputLog += tagRes.trim() + '\n';

      // Step C: Push via host SSH key
      if (push) {
        outputLog += `[Bridge] Pushing commit and tag to Git remote...\n`;
        const pushRes = execSync(
          `git -C "${workingDir}" push origin HEAD && git -C "${workingDir}" push origin "${tag.replace(/"/g, '\\"')}"`,
          { encoding: 'utf8' }
        );
        if (pushRes.trim()) outputLog += pushRes.trim() + '\n';
        outputLog += `✅ Release '${tag}' successfully pushed to remote!\n`;
      } else {
        outputLog += `✓ Tagged locally (push skipped per options).\n`;
      }

      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      const successMsg = hasLocalGit
        ? `Successfully created and pushed release '${tag}' directly in local repository (${repoPath})!`
        : `Successfully created and pushed release '${tag}' via ephemeral scratch clone!`;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          isLocal: hasLocalGit,
          message: successMsg,
          output: outputLog.trim(),
        })
      );
    } catch (err: any) {
      const errDetail = err.stdout || err.stderr || err.message;
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          error: `Git operation failed: ${err.message}`,
          output: outputLog + '\n' + errDetail,
        })
      );
    }
    return;
  }

  // 3. Fetch remote tags
  if (url === '/exec/fetch' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const repoPath = body.repoPath?.trim();
    if (!repoPath) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "repoPath is required" }));
      return;
    }
    try {
      const fetchOutput = execSync(`git -C "${repoPath}" fetch --tags origin`, { encoding: 'utf8' });
      const tagsRaw = execSync(`git -C "${repoPath}" tag -l --sort=-creatordate`, { encoding: 'utf8' });
      const tags = tagsRaw.split('\n').map((t) => t.trim()).filter(Boolean);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, tags, output: fetchOutput || 'Tags fetched successfully.' }));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, output: err.stdout || err.stderr || err.message }));
    }
    return;
  }

  // 4. Git diff preview
  if (url === '/exec/diff' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const repoPath = body.repoPath?.trim();
    if (!repoPath) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "repoPath is required" }));
      return;
    }
    const tag = body.tag || '';
    try {
      const diffOutput = execSync(`git -C "${repoPath}" diff --stat "${tag}"`, { encoding: 'utf8' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, output: diffOutput || 'Working directory matches tag (0 changes).' }));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, output: err.stdout || err.stderr || err.message }));
    }
    return;
  }

  // 5. Setup / Adopt Local Repository (/exec/setup-repo)
  if (url === '/exec/setup-repo' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const remoteUrl = body.remoteUrl?.trim();
    const repoPath = body.repoPath?.trim();
    const branch = body.branch?.trim() || 'main';

    if (!remoteUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'remoteUrl is required' }));
      return;
    }
    if (!repoPath) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'repoPath is required' }));
      return;
    }

    try {
      if (fs.existsSync(path.join(repoPath, '.git'))) {
        // Adopt existing local repo
        try {
          const curRemote = execSync(`git -C "${repoPath}" remote get-url origin`, { encoding: 'utf8' }).trim();
          if (curRemote !== remoteUrl) {
            execSync(`git -C "${repoPath}" remote set-url origin "${remoteUrl}"`);
          }
        } catch {
          execSync(`git -C "${repoPath}" remote add origin "${remoteUrl}"`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          isExisting: true,
          repoPath,
          message: `Existing local repository adopted at ${repoPath}`,
        }));
        return;
      }

      // Clone new repo
      fs.mkdirSync(repoPath, { recursive: true });
      execSync(`git clone --branch "${branch}" "${remoteUrl}" "${repoPath}"`, { encoding: 'utf8' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        isExisting: false,
        repoPath,
        message: `Successfully cloned remote repository into ${repoPath}`,
      }));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: `Failed to set up repository at ${repoPath}: ${err.message}`,
      }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found on Git bridge' }));
});

server.listen(PORT, HOST, () => {
  console.log(`🔌 SlottD Universal Git Bridge active on http://${HOST}:${PORT}`);
  console.log(`   Target Content Repository: ${defaultNeutralRepo}`);
});

process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});
