import { Injectable } from '@angular/core';

export interface DeviceSnapshot {
  // timing
  timestamp: string;
  url: string;
  referrer: string;

  // browser
  userAgent: string;
  language: string;
  languages: string;
  cookiesEnabled: boolean;
  doNotTrack: string | null;

  // screen / display
  screenW: number;
  screenH: number;
  viewportW: number;
  viewportH: number;
  colorDepth: number;
  pixelRatio: number;
  orientation: string;

  // device hints
  platform: string;
  cpuCores: number;
  ramGB: number | string;
  touchPoints: number;
  isMobile: boolean;
  isTablet: boolean;

  // network (Chrome / Edge only — gracefully absent elsewhere)
  connectionType: string;
  effectiveType: string;
  downlink: string;

  // locale
  timezone: string;
  locale: string;
}

// ── Configure your webhook here ─────────────────────────────────────────────
// Leave empty to disable sending (data will only be console-logged in dev).
// Examples:
//   Discord webhook : 'https://discord.com/api/webhooks/xxx/yyy'
//   Google Apps Script web-app URL
//   Your own API endpoint
const WEBHOOK_URL: string = 'https://discord.com/api/webhooks/1481317626126008361/pfgrPV6IGkhBVHXE62EBODfLsi0YLy8bQ0gaP0mSWDhaU5dVUt9M466a_Nzu6dIl6tuH';

@Injectable({ providedIn: 'root' })
export class DeviceInfoService {

  collect(): void {
    try {
      const snap = this.buildSnapshot();
      this.send(snap);
    } catch {
      // fail silently — never show errors to the user
    }
  }

  private buildSnapshot(): DeviceSnapshot {
    const nav  = navigator as any;           // typed loosely for non-standard fields
    const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? {};

    const ua = navigator.userAgent;
    const isMobile = /Mobi|Android|iPhone|iPod/i.test(ua);
    const isTablet  = /iPad|Tablet/i.test(ua) || (isMobile && Math.min(screen.width, screen.height) >= 600);

    return {
      timestamp:     new Date().toISOString(),
      url:           location.href,
      referrer:      document.referrer || '(direct)',

      userAgent:     ua,
      language:      navigator.language,
      languages:     (navigator.languages ?? []).join(', '),
      cookiesEnabled:navigator.cookieEnabled,
      doNotTrack:    navigator.doNotTrack,

      screenW:       screen.width,
      screenH:       screen.height,
      viewportW:     window.innerWidth,
      viewportH:     window.innerHeight,
      colorDepth:    screen.colorDepth,
      pixelRatio:    window.devicePixelRatio ?? 1,
      orientation:   screen.orientation?.type ?? (screen.width > screen.height ? 'landscape' : 'portrait'),

      platform:      navigator.platform,
      cpuCores:      navigator.hardwareConcurrency ?? 0,
      ramGB:         nav.deviceMemory ?? 'unknown',
      touchPoints:   navigator.maxTouchPoints ?? 0,
      isMobile,
      isTablet,

      connectionType: conn.type          ?? 'unknown',
      effectiveType:  conn.effectiveType ?? 'unknown',
      downlink:       conn.downlink != null ? `${conn.downlink} Mbps` : 'unknown',

      timezone:      Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale:        Intl.DateTimeFormat().resolvedOptions().locale,
    };
  }

  private send(snap: DeviceSnapshot): void {
    // Always log to console in non-production for debugging
    if (!this.isProd()) {
      console.groupCollapsed('[DeviceInfo] Visitor snapshot');
      console.table(snap);
      console.groupEnd();
    }

    if (!WEBHOOK_URL) return;   // no endpoint configured → stop here

    // Build a readable Discord-style message if the URL looks like a Discord webhook,
    // otherwise just POST raw JSON.
    const isDiscord = WEBHOOK_URL.includes('discord.com/api/webhooks');

    const body = isDiscord
      ? JSON.stringify({ content: this.toDiscordMessage(snap) })
      : JSON.stringify(snap);

    const contentType = 'application/json';

    // Use sendBeacon when available (fires even on tab close, doesn't block)
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: contentType });
      navigator.sendBeacon(WEBHOOK_URL, blob);
    } else {
      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body,
        keepalive: true,
      }).catch(() => { /* silent */ });
    }
  }

  private toDiscordMessage(s: DeviceSnapshot): string {
    return [
      `📡 **New WishCraft Visitor** — \`${s.timestamp}\``,
      `🌐 **URL:** ${s.url}`,
      `↩️ **Referrer:** ${s.referrer}`,
      ``,
      `📱 **Device**`,
      `> Platform: \`${s.platform}\` | Mobile: \`${s.isMobile}\` | Tablet: \`${s.isTablet}\``,
      `> Screen: \`${s.screenW}×${s.screenH}\` @ \`${s.pixelRatio}x\` | Viewport: \`${s.viewportW}×${s.viewportH}\``,
      `> CPU: \`${s.cpuCores} cores\` | RAM: \`${s.ramGB} GB\` | Touch: \`${s.touchPoints} pts\``,
      ``,
      `🌍 **Location / Locale**`,
      `> Timezone: \`${s.timezone}\` | Locale: \`${s.locale}\` | Language: \`${s.language}\``,
      ``,
      `🔌 **Network**`,
      `> Type: \`${s.connectionType}\` | Effective: \`${s.effectiveType}\` | Downlink: \`${s.downlink}\``,
      ``,
      `🖥️ **Browser**`,
      `> \`${s.userAgent}\``,
    ].join('\n');
  }

  private isProd(): boolean {
    // Angular sets this via environment files; fall back to hostname check
    try {
      return location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
    } catch {
      return false;
    }
  }
}
