// Frees the dev ports before `pnpm dev` starts.
// On Windows a stopped watcher often leaves its child process holding the port, and the
// next start then fails with EADDRINUSE. Usage: node scripts/free-ports.mjs 4000 5173
import { execSync } from 'node:child_process';

const ports = process.argv.slice(2).map(Number).filter(Boolean);

function listeningPids(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
      return [
        ...new Set(
          output
            .split(/\r?\n/)
            .map((line) => line.trim().split(/\s+/))
            .filter((cols) => cols[3] === 'LISTENING' && cols[1]?.endsWith(`:${port}`))
            .map((cols) => cols[4]),
        ),
      ];
    }
    return execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch {
    return []; // nothing is listening
  }
}

for (const port of ports) {
  for (const pid of listeningPids(port)) {
    try {
      if (process.platform === 'win32') execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
      else process.kill(Number(pid), 'SIGKILL');
      console.log(`Freed port ${port} (stopped process ${pid})`);
    } catch {
      console.warn(`Could not stop process ${pid} on port ${port}`);
    }
  }
}
