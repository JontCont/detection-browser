import { inject, Injectable, InjectionToken, ModuleWithProviders, NgModule } from '@angular/core';
import { environment } from '../../environments/environment';

const BROWSER_COMPATIBILITY_CONFIG = new InjectionToken('browserCompatibilityConfig');

export enum SupportedBrowser {
  CHROME = 'chrome',
  FIREFOX = 'firefox',
  SAFARI = 'safari',
  EDGE = 'edge',
  SAMSUNG = 'samsung',
  LINE = 'line',
  UNKNOWN = 'unknown', // 所有不支援的瀏覽器統一為 unknown
}

export enum Platform {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  UNKNOWN = 'unknown',
}

export type BrowserType = SupportedBrowser;

export interface BrowserCompatibilityConfig {
  enabled: boolean;
  supportedVersions: {
    chrome: string;
    firefox: string;
    safari: string;
    edge: string;
    samsung: string;
  };
}

export interface BrowserInfo {
  name: BrowserType;
  version: string;
  platform: Platform;
  isSupported: boolean;
  minimumVersion: string | null;
  userAgent: string;
}

@Injectable()
export class WindowRef {
  get nativeWindow(): Window {
    return window;
  }
}

@Injectable()
export class BrowserCompatibilityService {
  private config: BrowserCompatibilityConfig =
    (inject(BROWSER_COMPATIBILITY_CONFIG) as BrowserCompatibilityConfig) || environment.browserCompatibility;

  constructor(
    private windowRef: WindowRef,
  ) {
    this.checkBrowserCompatibility();
  }

  private checkBrowserCompatibility(): void {
    // 若已經有 openExternalBrowser 參數，直接 return，避免重複執行
    if (new URL(this.windowRef.nativeWindow.location.href).searchParams.has('openExternalBrowser')) {
      return;
    }
    if (!this.config.enabled) {
      return;
    }

    const browserInfo = this.getBrowserCompatibilityInfo();
    // 僅於 LINE 且手機平台嘗試跳轉外部瀏覽器 (檢查當前網址有沒有 openExternalBrowser 參數)
    if (
      browserInfo.name === SupportedBrowser.LINE &&
      window.location.href.search('openExternalBrowser') < 0
    ) {
      const url = this.windowRef.nativeWindow.location.href;
      const targetUrl = new URL(url, window.location.origin);
      targetUrl.searchParams.set('openExternalBrowser', '1');
      this.windowRef.nativeWindow.location.replace(targetUrl.toString());
      return;
    }

    if (!browserInfo.isSupported) {
      // 區分不同的錯誤情況
      if (browserInfo.minimumVersion === null) {
        // 瀏覽器本身不被支援 (如 Brave, Vivaldi, Opera 等)
        this.showIncompatibleBrowserError(browserInfo);
      } else {
        // 瀏覽器被支援，但版本太舊
        this.showIncompatibleBrowserVersionError(browserInfo);
      }
    }
  }

  private getBrowserCompatibilityInfo(): BrowserInfo {
    const userAgent = this.windowRef.nativeWindow.navigator.userAgent;
    const browserInfo = this.parseUserAgent(userAgent);

    // 取得對應的最低版本要求
    const minimumVersion = this.getMinimumVersion(browserInfo.name);

    // 檢查版本相容性
    const isSupported = minimumVersion != null ? this.isVersionSupported(browserInfo.version, minimumVersion) : false;

    return {
      name: browserInfo.name,
      version: browserInfo.version,
      platform: browserInfo.platform,
      isSupported,
      minimumVersion,
      userAgent,
    };
  }

  private parseUserAgent(userAgent: string): { name: BrowserType; version: string; platform: Platform } {
    // 優先使用 Client Hints (sec-ch-ua) 進行檢測
    const clientHintsBrowser = this.detectBrowserFromClientHints();
    if (clientHintsBrowser) {
      const platform = this.detectPlatformFromClientHints() || this.detectPlatform(userAgent);
      return {
        name: clientHintsBrowser.name,
        version: clientHintsBrowser.version,
        platform,
      };
    }

    // 使用 User-Agent 檢測
    const platform = this.detectPlatform(userAgent);
    const browser = this.detectBrowser(userAgent);

    return {
      name: browser.name,
      version: browser.version,
      platform,
    };
  }

  private detectPlatform(userAgent: string): Platform {
    if (
      userAgent.includes('Windows') ||
      userAgent.includes('Linux') ||
      userAgent.includes('Macintosh') ||
      userAgent.includes('Mac OS') ||
      userAgent.includes('Linux')
    ) {
      return Platform.DESKTOP;
    }

    if (
      userAgent.includes('Mobile') ||
      userAgent.includes('Tablet') ||
      userAgent.includes('Android') ||
      userAgent.includes('iPhone') ||
      userAgent.includes('iPad')
    ) {
      return Platform.MOBILE;
    }

    return Platform.UNKNOWN;
  }

  /**
   * 使用 Client Hints 檢測平台
   */
  private detectPlatformFromClientHints(): Platform | null {
    try {
      const navigator = this.windowRef.nativeWindow.navigator as any;

      if (navigator.userAgentData && navigator.userAgentData.platform) {
        const platform = navigator.userAgentData.platform.toLowerCase();
        // 檢查桌面平台
        if (platform.includes('windows')) return Platform.DESKTOP;
        if (platform.includes('macos') || platform.includes('mac')) return Platform.DESKTOP;
        if (platform.includes('linux')) return Platform.DESKTOP;

        // 檢查行動平台
        if (platform.includes('android')) return Platform.MOBILE;
        if (platform.includes('ios')) return Platform.MOBILE;
      }

      // 檢查 mobile 標誌
      if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
        return navigator.userAgentData.mobile ? Platform.MOBILE : Platform.DESKTOP;
      }

      return null;
    } catch (error) {
      console.warn('Client Hints platform detection failed:', error);
      return null;
    }
  }

  /**
   * 使用 Client Hints (sec-ch-ua) 檢測瀏覽器
   * 這是更精確和隱私友好的方法，可以正確識別 Brave 等瀏覽器
   */
  private detectBrowserFromClientHints(): { name: BrowserType; version: string } | null {
    try {
      // 檢查瀏覽器是否支援 Client Hints
      const navigator = this.windowRef.nativeWindow.navigator as any;

      if (navigator.userAgentData && navigator.userAgentData.brands) {
        const brands = navigator.userAgentData.brands;

        // 遍歷 brands 陣列，優先檢測特定瀏覽器
        for (const brand of brands) {
          const brandName = brand.brand.toLowerCase();
          const version = brand.version;
          if (brandName.includes('microsoft edge') || brandName.includes('edge')) {
            return { name: SupportedBrowser.EDGE, version };
          } else if (brandName.includes('samsung')) {
            return { name: SupportedBrowser.SAMSUNG, version };
          } else if (brandName.includes('chrome') && !brandName.includes('chromium')) {
            return { name: SupportedBrowser.CHROME, version };
          } else if (brandName.includes('firefox')) {
            return { name: SupportedBrowser.FIREFOX, version };
          }
        }

        // 如果找到 Chromium，檢查是否為 Chrome
        const chromiumBrand = brands.find((b: any) => b.brand.toLowerCase().includes('chromium'));
        if (chromiumBrand) {
          // 可能是基於 Chromium 的瀏覽器，但不在支援清單中
          return { name: SupportedBrowser.UNKNOWN, version: chromiumBrand.version };
        }
      }
      return null;
    } catch (error) {
      console.warn('Client Hints detection failed:', error);
      return null;
    }
  }

  private detectBrowser(userAgent: string): { name: BrowserType; version: string } {
    // 只檢測支援的瀏覽器 - 其他一律視為不支援
    const supportedBrowserDetectors = [
      {
        condition: () =>
          (userAgent.includes('Chrome') || userAgent.includes('Safari')) &&
          !userAgent.includes('Edg') && // 不是 Edge
          !userAgent.includes('OPR') && // 不是 Opera
          !userAgent.includes('SamsungBrowser') && // 不是 Samsung
          !userAgent.includes('Brave') && // 不是 Brave
          userAgent.includes('Line'),
        browser: SupportedBrowser.LINE,
        versionRegex: /Line\/(\d+\.\d+\.\d+)/,
      },

      // Safari 檢測 (必須排除 Chrome，因為 Chrome 也包含 Safari)
      {
        condition: () => userAgent.includes('Safari') && !userAgent.includes('Chrome'),
        browser: SupportedBrowser.SAFARI,
        versionRegex: /Version\/(\d+\.\d+)/,
        customVersionProcessor: (match: RegExpMatchArray | null) => (match ? match[1] + '.0' : '0.0.0'),
      },

      // 2. Chrome 檢測 (放在最後，因為很多瀏覽器都包含 Chrome)
      // 簡化條件：只要包含 Chrome 且不是其他已知瀏覽器就認為是 Chrome
      {
        condition: () =>
          userAgent.includes('Chrome') &&
          !userAgent.includes('Edg') && // 不是 Edge
          !userAgent.includes('OPR') && // 不是 Opera
          !userAgent.includes('SamsungBrowser') && // 不是 Samsung
          !userAgent.includes('Brave'), // 不是 Brave
        browser: SupportedBrowser.CHROME,
        versionRegex: /Chrome\/(\d+\.\d+\.\d+)/,
      },

      // Edge 檢測 (新版 Chromium-based)
      {
        condition: () => userAgent.includes('Edg/'),
        browser: SupportedBrowser.EDGE,
        versionRegex: /Edg\/(\d+\.\d+\.\d+)/,
      },

      // Firefox 檢測
      {
        condition: () => userAgent.includes('Firefox'),
        browser: SupportedBrowser.FIREFOX,
        versionRegex: /Firefox\/(\d+\.\d+)/,
        customVersionProcessor: (match: RegExpMatchArray | null) => (match ? match[1] + '.0' : '0.0.0'),
      },

      // Samsung Internet
      {
        condition: () => userAgent.includes('SamsungBrowser'),
        browser: SupportedBrowser.SAMSUNG,
        versionRegex: /SamsungBrowser\/(\d+\.\d+)/,
        customVersionProcessor: (match: RegExpMatchArray | null) => (match ? match[1] + '.0' : '0.0.0'),
      },
    ];

    // 檢測支援的瀏覽器
    for (const detector of supportedBrowserDetectors) {
      if (detector.condition()) {
        const match = userAgent.match(detector.versionRegex);
        const version = detector.customVersionProcessor
          ? detector.customVersionProcessor(match)
          : match
          ? match[1]
          : '0.0.0';

        return { name: detector.browser, version };
      }
    }

    // 所有其他瀏覽器都視為不支援
    return { name: SupportedBrowser.UNKNOWN, version: '0.0.0' };
  }

  private getMinimumVersion(browserName: BrowserType): string | null {
    switch (browserName) {
      case SupportedBrowser.CHROME:
        return this.config.supportedVersions.chrome;
      case SupportedBrowser.FIREFOX:
        return this.config.supportedVersions.firefox;
      case SupportedBrowser.SAFARI:
        return this.config.supportedVersions.safari;
      case SupportedBrowser.EDGE:
        return this.config.supportedVersions.edge;
      case SupportedBrowser.SAMSUNG:
        return this.config.supportedVersions.samsung;
      default:
        return null;
    }
  }

  private isVersionSupported(currentVersion: string, minimumVersion: string): boolean {
    if (!minimumVersion) {
      return true;
    }

    try {
      const cleanCurrentVersion = this.cleanVersion(currentVersion);
      let cleanMinimumVersion = minimumVersion.trim();

      // 移除版本範圍符號並解析
      let operator = '>=';

      if (cleanMinimumVersion.startsWith('>=')) {
        operator = '>=';
        cleanMinimumVersion = cleanMinimumVersion.substring(2).trim();
      } else if (cleanMinimumVersion.startsWith('^')) {
        operator = '^';
        cleanMinimumVersion = cleanMinimumVersion.substring(1).trim();
      } else if (cleanMinimumVersion.startsWith('~')) {
        operator = '~';
        cleanMinimumVersion = cleanMinimumVersion.substring(1).trim();
      } else if (cleanMinimumVersion.endsWith('~')) {
        operator = '~';
        cleanMinimumVersion = cleanMinimumVersion.slice(0, -1).trim();
      }

      const currentParts = this.parseVersion(cleanCurrentVersion);
      const minimumParts = this.parseVersion(cleanMinimumVersion);

      return this.compareVersions(currentParts, minimumParts, operator);
    } catch (error) {
      console.warn('Browser version comparison failed:', error);
      return true; // 預設為支援
    }
  }

  private parseVersion(version: string): number[] {
    return version.split('.').map((v) => {
      const num = parseInt(v.replace(/[^\d]/g, ''), 10);
      return isNaN(num) ? 0 : num;
    });
  }

  private compareVersions(current: number[], minimum: number[], operator: string): boolean {
    // 確保版本號陣列長度一致
    while (current.length < 3) current.push(0);
    while (minimum.length < 3) minimum.push(0);

    const [curMajor, curMinor, curPatch] = current;
    const [minMajor, minMinor, minPatch] = minimum;

    switch (operator) {
      case '>=':
        if (curMajor > minMajor) return true;
        if (curMajor < minMajor) return false;
        if (curMinor > minMinor) return true;
        if (curMinor < minMinor) return false;
        return curPatch >= minPatch;

      case '^':
        if (curMajor !== minMajor) return curMajor > minMajor;
        if (curMinor > minMinor) return true;
        if (curMinor < minMinor) return false;
        return curPatch >= minPatch;

      case '~':
        if (curMajor !== minMajor || curMinor !== minMinor) {
          return curMajor > minMajor || (curMajor === minMajor && curMinor > minMinor);
        }
        return curPatch >= minPatch;

      default:
        return this.compareVersions(current, minimum, '>=');
    }
  }

  private cleanVersion(version: string): string {
    if (!version) return '0.0.0';

    let cleaned = version.replace(/^v/, '');
    const parts = cleaned.split('.');
    while (parts.length < 3) {
      parts.push('0');
    }

    return parts.slice(0, 3).join('.');
  }

  private showIncompatibleBrowserError(browserInfo: BrowserInfo): void {
    const currentUrl = new URL(this.windowRef.nativeWindow.location.href);
    const errorUrl = new URL('/browser-error', window.location.origin);
    errorUrl.search = currentUrl.search; // 保留所有 searchParams
    this.windowRef.nativeWindow.location.href = errorUrl.toString();
  }

  private showIncompatibleBrowserVersionError(browserInfo: BrowserInfo): void {
    const currentUrl = new URL(this.windowRef.nativeWindow.location.href);
    const errorUrl = new URL('/browser-error', window.location.origin);
    errorUrl.search = currentUrl.search; // 保留所有 searchParams
    this.windowRef.nativeWindow.location.href = errorUrl.toString();
  }

  /**
   * 取得瀏覽器詳細資訊
   */
  public getBrowserInfo(): any {
    const userAgent = this.windowRef.nativeWindow.navigator.userAgent;
    const browserInfo = this.parseUserAgent(userAgent);

    return {
      name: browserInfo.name,
      version: browserInfo.version,
      platform: browserInfo.platform,
      userAgent: userAgent,
      cookieEnabled: this.windowRef.nativeWindow.navigator.cookieEnabled,
    };
  }
}

@NgModule({
  providers: [WindowRef, BrowserCompatibilityService],
})
export class MaibBrowserCompatibilityModule {
  constructor(private browserCompatibilityService: BrowserCompatibilityService) {
    // 服務會在模組初始化時自動檢查瀏覽器相容性
  }

  static forRoot(config?: BrowserCompatibilityConfig): ModuleWithProviders<MaibBrowserCompatibilityModule> {
    return {
      ngModule: MaibBrowserCompatibilityModule,
      providers: [
        {
          provide: BROWSER_COMPATIBILITY_CONFIG,
          useValue: config || environment.browserCompatibility,
        },
      ],
    };
  }
}
