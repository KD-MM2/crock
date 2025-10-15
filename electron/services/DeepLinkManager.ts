import { BrowserWindow } from 'electron';
import type { SettingsStore } from './SettingsStore';
import type { ParsedDeepLink, DeepLinkData } from '../types/deep-link';

/**
 * DeepLinkManager handles croc:// protocol URLs
 * Supports receiving files via deep links like: croc://receive?code=xxxx-yyyy-zzzz
 */
export class DeepLinkManager {
  private readonly PROTOCOL = 'croc';
  private pendingUrl: string | null = null;
  private window: BrowserWindow | null = null;

  constructor(private readonly settingsStore: SettingsStore) {}

  /**
   * Set the main window reference
   */
  setWindow(window: BrowserWindow): void {
    this.window = window;

    // If there's a pending URL, process it now
    if (this.pendingUrl) {
      const url = this.pendingUrl;
      this.pendingUrl = null;
      this.handleUrl(url);
    }
  }

  /**
   * Handle incoming deep link URL
   */
  handleUrl(url: string): void {
    const settings = this.settingsStore.get();

    // Check if deep links are enabled
    if (!settings.advanced?.deepLink) {
      console.log('[DeepLinkManager] Deep links are disabled in settings');
      return;
    }

    // If window is not ready yet, store the URL for later
    if (!this.window || !this.window.webContents) {
      console.log('[DeepLinkManager] Window not ready, storing URL for later:', url);
      this.pendingUrl = url;
      return;
    }

    const parsed = this.parseUrl(url);

    if (!parsed.valid || !parsed.data) {
      console.error('[DeepLinkManager] Invalid deep link:', parsed.error);
      return;
    }

    console.log('[DeepLinkManager] Parsed deep link:', parsed.data);

    // Send the deep link data to the renderer process
    this.window.webContents.send('deep-link:receive', parsed.data);

    // Focus the window
    if (this.window.isMinimized()) {
      this.window.restore();
    }
    this.window.focus();
  }

  /**
   * Parse a croc:// URL into structured data
   * Supports formats:
   * - croc://receive?code=xxxx-yyyy-zzzz
   * - croc://receive?code=xxxx-yyyy-zzzz&relay=example.com:9009
   * - croc://receive?code=xxxx-yyyy-zzzz&relay=example.com:9009&password=mypass
   */
  parseUrl(url: string): ParsedDeepLink {
    try {
      // Check if it's a croc:// URL
      if (!url.startsWith(`${this.PROTOCOL}://`)) {
        return {
          valid: false,
          error: `URL must start with ${this.PROTOCOL}://`
        };
      }

      // Parse the URL
      const parsedUrl = new URL(url);
      const action = parsedUrl.hostname as 'receive' | 'send';

      // Currently only support 'receive' action
      if (action !== 'receive') {
        return {
          valid: false,
          error: `Unsupported action: ${action}. Only 'receive' is currently supported.`
        };
      }

      // Extract query parameters
      const searchParams = parsedUrl.searchParams;
      const code = searchParams.get('code');

      if (!code) {
        return {
          valid: false,
          error: 'Missing required parameter: code'
        };
      }

      // Validate code format (basic validation: should contain hyphens)
      if (!/^[\w-]+$/.test(code)) {
        return {
          valid: false,
          error: 'Invalid code format'
        };
      }

      const data: DeepLinkData = {
        action,
        code
      };

      // Optional parameters
      const relay = searchParams.get('relay');
      if (relay) {
        data.relay = relay;
      }

      const password = searchParams.get('password');
      if (password) {
        data.password = password;
      }

      return {
        valid: true,
        data
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to parse URL'
      };
    }
  }

  /**
   * Get the protocol name
   */
  getProtocol(): string {
    return this.PROTOCOL;
  }
}
