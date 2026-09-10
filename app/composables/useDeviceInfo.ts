/**
 * Device profile attached to analytics events on sites that record it.
 *
 * Why there is no MAC address here
 * -------------------------------
 * No browser exposes the network adapter's MAC address, on any platform. It
 * was never part of the web platform and never will be, and even if a page
 * could read it, the address would be rewritten at the first router hop and
 * never reach Azure. Any "browser MAC address" technique you find described
 * online is either a native app, a browser extension with elevated
 * permissions, or a captive-portal appliance sitting on the same LAN.
 *
 * `device_id` is the working substitute. It is a random UUID minted once per
 * browser profile and kept in localStorage, which makes it stable across
 * sessions on the same machine and browser — enough to answer "what does this
 * user usually look at". Its limits are worth knowing before you build
 * analysis on it:
 *
 *   - a different browser on the same machine gets a different id
 *   - private/incognito windows get a fresh id every time
 *   - clearing site data resets it
 *   - it says nothing about identity, only about continuity
 *
 * Everything else here is a coarse device fingerprint: form factor, screen,
 * timezone, language, CPU/RAM hints. Combined with the IP recorded server-side
 * it gives you where visitors are and what they are using, which is the actual
 * question behind the request.
 *
 * All reads are defensive. These APIs vary by browser and several are absent
 * or throw under strict privacy settings, and analytics must never be the
 * reason a page breaks.
 */

const DEVICE_ID_STORAGE_KEY = "clic-recommender-device-id";

export interface DeviceInfo {
  device_id: string;
  user_agent: string;
  platform: string;
  vendor: string;
  model: string;
  screen_width: number | null;
  screen_height: number | null;
  viewport_width: number | null;
  viewport_height: number | null;
  pixel_ratio: number | null;
  color_depth: number | null;
  timezone: string;
  timezone_offset_minutes: number | null;
  languages: string[];
  hardware_concurrency: number | null;
  device_memory_gb: number | null;
  max_touch_points: number | null;
  network_type: string;
  network_downlink_mbps: number | null;
  page_url: string;
  referrer: string;
}

const newId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

/** Read a value, returning `fallback` if the API is missing or throws. */
const safe = <T>(read: () => T, fallback: T): T => {
  try {
    const value = read();
    return value === undefined || value === null ? fallback : value;
  } catch {
    return fallback;
  }
};

export const useDeviceInfo = () => {
  /**
   * Stable per-browser identifier.
   *
   * localStorage can throw outright — Safari in Lockdown Mode, third-party
   * iframe contexts, or a user who has blocked storage entirely — so a failure
   * falls back to a per-page-load id rather than breaking the event.
   */
  const ensureDeviceId = (): string => {
    if (!import.meta.client) return "";

    try {
      const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
      if (existing) return existing;

      const id = newId();
      localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
      return id;
    } catch {
      return newId();
    }
  };

  /**
   * Model name, where the browser is willing to say.
   *
   * Only Chromium on Android populates `userAgentData.model`, and only for a
   * high-entropy request. Everywhere else this is empty, which is expected —
   * iOS deliberately reports every iPhone identically.
   */
  const readModel = (): string => {
    const uaData = (navigator as any).userAgentData;
    return safe(() => String(uaData?.model ?? ""), "");
  };

  const collect = (): DeviceInfo | null => {
    if (!import.meta.client) return null;

    const uaData = (navigator as any).userAgentData;
    const connection =
      (navigator as any).connection ??
      (navigator as any).mozConnection ??
      (navigator as any).webkitConnection;

    return {
      device_id: ensureDeviceId(),
      // Sent for completeness; the backend prefers the real request header.
      user_agent: safe(() => navigator.userAgent, ""),
      platform: safe(() => String(uaData?.platform ?? navigator.platform ?? ""), ""),
      vendor: safe(() => navigator.vendor ?? "", ""),
      model: readModel(),
      screen_width: safe(() => window.screen.width, null),
      screen_height: safe(() => window.screen.height, null),
      viewport_width: safe(() => window.innerWidth, null),
      viewport_height: safe(() => window.innerHeight, null),
      pixel_ratio: safe(() => window.devicePixelRatio, null),
      color_depth: safe(() => window.screen.colorDepth, null),
      // The most useful geography signal after the IP, and the one that still
      // works when a visitor is on a VPN or a university proxy.
      timezone: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "", ""),
      // Negated so the sign matches the usual UTC+n reading: Hong Kong is +480.
      timezone_offset_minutes: safe(() => -new Date().getTimezoneOffset(), null),
      languages: safe(
        () => (navigator.languages?.length ? [...navigator.languages] : [navigator.language]),
        []
      ).filter(Boolean) as string[],
      hardware_concurrency: safe(() => navigator.hardwareConcurrency ?? null, null),
      device_memory_gb: safe(() => (navigator as any).deviceMemory ?? null, null),
      max_touch_points: safe(() => navigator.maxTouchPoints ?? null, null),
      network_type: safe(() => String(connection?.effectiveType ?? ""), ""),
      network_downlink_mbps: safe(() => connection?.downlink ?? null, null),
      page_url: safe(() => window.location.href, ""),
      referrer: safe(() => document.referrer, ""),
    };
  };

  return { collect, ensureDeviceId };
};
