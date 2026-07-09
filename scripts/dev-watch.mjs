import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const FILES_TO_WATCH = [
  'app/globals.css',
  'data/github-contributions.json',
  'data/leetcode-stats.json'
];

console.log('🚀 [Dev Watcher] Starting Next.js Dev Server and Auto-Sync Daemon...');

// Spawn Next.js dev server
const nextDev = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: rootDir
});

nextDev.on('close', (code) => {
  process.exit(code || 0);
});

// Helper to run git commands
function syncFileToGit(file) {
  try {
    const relativePath = path.relative(rootDir, file).replace(/\\/g, '/');
    
    // Check if file is actually modified
    const status = execSync(`git status --porcelain "${relativePath}"`, { cwd: rootDir }).toString().trim();
    if (!status) return; // No changes to commit

    console.log(`\n📦 [Auto-Sync] Detected changes in: ${relativePath}`);
    console.log(`Staging and committing...`);
    execSync(`git add "${relativePath}"`, { cwd: rootDir });
    execSync(`git commit -m "auto: sync ${relativePath}"`, { cwd: rootDir });
    
    console.log(`📤 Pushing updates to origin main...`);
    execSync(`git push origin main`, { cwd: rootDir });
    console.log(`✓ [Auto-Sync] Sync complete for ${relativePath}\n`);
  } catch (error) {
    console.error(`✗ [Auto-Sync] Sync failed for ${relativePath}:`, error.message);
  }
}

// Debounce map to prevent redundant commits during rapid consecutive file saves
const debounceTimers = {};

FILES_TO_WATCH.forEach(relPath => {
  const fullPath = path.join(rootDir, relPath);
  
  // Ensure watched files exist so watchFile doesn't fail
  if (!fs.existsSync(fullPath)) {
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, relPath.endsWith('.json') ? '{}' : '');
  }

  // watchFile polls for changes reliably on all platforms, including Windows
  fs.watchFile(fullPath, { interval: 1000 }, (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs) {
      if (debounceTimers[relPath]) {
        clearTimeout(debounceTimers[relPath]);
      }
      debounceTimers[relPath] = setTimeout(() => {
        syncFileToGit(fullPath);
      }, 2000); // 2-second debounce to let file writes fully write to disk
    }
  });
  console.log(`👀 [Watcher] Tracking for auto-sync: ${relPath}`);

  // Sync immediately on startup if already modified
  syncFileToGit(fullPath);
});
