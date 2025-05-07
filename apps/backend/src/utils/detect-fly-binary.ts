import fs from 'fs';

// Detects the fly binary in the system (could be just `fly`, could be `/root/.fly/bin/fly` or `/home/runner/.fly/bin/fly`) by checking for the presence of these binaries.
export function detectFlyBinary() {
  if (fs.existsSync('/root/.fly/bin/fly')) {
    return '/root/.fly/bin/fly';
  } else if (fs.existsSync('/home/runner/.fly/bin/fly')) {
    return '/home/runner/.fly/bin/fly';
  } else {
    return 'fly';
  }
}
