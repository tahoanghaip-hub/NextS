import { spawn } from 'child_process';

const KEY_MAPS = {
  ARROWS: { NEXT: '{RIGHT}', PREV: '{LEFT}', BLACKOUT: 'b' },
  PAGEDOWN: { NEXT: '{PGDN}', PREV: '{PGUP}', BLACKOUT: 'b' },
  SPACE: { NEXT: ' ', PREV: '{LEFT}', BLACKOUT: 'b' }
};

class KeyController {
  constructor() {
    this.isWin = process.platform === 'win32';
    this.psProcess = null;
    this.jumpQueue = Promise.resolve();
    this.isJumping = false;

    if (this.isWin) {
      this.initPowerShellBridge();
    } else {
      console.log('[KeyController] Running on non-Windows OS (' + process.platform + '). Keyboard emulation is in simulation mode.');
    }
  }

  initPowerShellBridge() {
    try {
      this.psProcess = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-NoLogo',
        '-Command',
        '-'
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Initialize System.Windows.Forms assembly for SendKeys
      this.psProcess.stdin.write('Add-Type -AssemblyName System.Windows.Forms;\n');

      this.psProcess.stdout.on('data', (data) => {
        const text = data.toString().trim();
        if (text) {
          console.log(`[KeyController:PS stdout] ${text}`);
        }
      });

      this.psProcess.stderr.on('data', (data) => {
        const text = data.toString().trim();
        if (text) {
          console.error(`[KeyController:PS stderr] ${text}`);
        }
      });

      this.psProcess.on('error', (err) => {
        console.error('[KeyController] PowerShell process encountered error:', err.message);
      });

      this.psProcess.on('exit', (code, signal) => {
        console.warn(`[KeyController] PowerShell process exited (code: ${code}, signal: ${signal}). Re-spawning in 500ms...`);
        this.psProcess = null;
        setTimeout(() => {
          if (this.isWin) {
            this.initPowerShellBridge();
          }
        }, 500);
      });

      console.log('[KeyController] Persistent PowerShell SendKeys bridge established.');
    } catch (err) {
      console.error('[KeyController] Failed to spawn PowerShell process:', err);
    }
  }

  sendSingleKey(actionType, keyMappingMode = 'ARROWS') {
    const keyMap = KEY_MAPS[keyMappingMode] || KEY_MAPS.ARROWS;
    const symbol = keyMap[actionType];

    if (!symbol) {
      console.warn(`[KeyController] Unknown action "${actionType}" for mapping "${keyMappingMode}".`);
      return { success: false, error: 'Unknown action' };
    }

    if (this.isWin) {
      if (!this.psProcess || !this.psProcess.stdin.writable) {
        console.warn('[KeyController] PowerShell process is not ready. Attempting re-init...');
        this.initPowerShellBridge();
      }

      try {
        const psCommand = `[System.Windows.Forms.SendKeys]::SendWait('${symbol}');\n`;
        this.psProcess.stdin.write(psCommand);
        console.log(`[KeyController] Sent ${actionType} (${symbol}) via PowerShell`);
        return { success: true, symbol };
      } catch (err) {
        console.error(`[KeyController] Error sending key ${actionType}:`, err);
        return { success: false, error: err.message };
      }
    } else {
      console.log(`[KeyController SIMULATION] Sent ${actionType} (${symbol})`);
      return { success: true, symbol, simulated: true };
    }
  }

  jumpToSlide(currentSlide, targetSlide, keyMappingMode = 'ARROWS') {
    // Sequential mutex queue to prevent overlapping scroll/jump requests
    this.jumpQueue = this.jumpQueue.then(async () => {
      this.isJumping = true;
      try {
        const delta = targetSlide - currentSlide;
        if (delta === 0) {
          return { currentSlide: targetSlide, stepsSent: 0 };
        }

        const direction = delta > 0 ? 'NEXT' : 'PREV';
        const steps = Math.abs(delta);

        console.log(`[KeyController] Executing jump: slide ${currentSlide} -> ${targetSlide} (${steps} x ${direction})`);

        for (let i = 0; i < steps; i++) {
          this.sendSingleKey(direction, keyMappingMode);
          // 50ms universal step delay for reliable presentation app key-event registration
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        return { currentSlide: targetSlide, stepsSent: steps };
      } finally {
        this.isJumping = false;
      }
    });

    return this.jumpQueue;
  }

  restorePresentationFocus() {
    if (this.isWin && this.psProcess && this.psProcess.stdin.writable) {
      try {
        // Send Alt+Esc to cycle window focus to previous window (PowerPoint / PDF viewer / Google Slides)
        this.psProcess.stdin.write("[System.Windows.Forms.SendKeys]::SendWait('%{ESC}');\n");
        console.log('[KeyController] Restored presentation window focus via %{ESC}');
        return { success: true };
      } catch (err) {
        console.error('[KeyController] Failed to restore presentation focus:', err);
        return { success: false, error: err.message };
      }
    } else {
      console.log('[KeyController SIMULATION] Restored presentation window focus');
      return { success: true, simulated: true };
    }
  }

  destroy() {
    if (this.psProcess) {
      try {
        this.psProcess.stdin.end();
        this.psProcess.kill();
      } catch (e) {
        // Ignore termination errors
      }
      this.psProcess = null;
    }
  }
}

export const keyController = new KeyController();
export default keyController;
