/** Public social state is untrusted display data; it never carries rewards. */
export interface AscensionProfile {
  callsign?: string;
  faction?: string;
  role?: string;
  color?: string;
}

/** x/y are normalized screen coordinates in [0, 1], scoped to a zone. */
export interface AscensionPosition {
  x: number;
  y: number;
  z?: number;
  zone: string;
  facing?: number;
  moving?: boolean;
}

export interface AscensionOperative extends Required<AscensionProfile>, AscensionPosition {
  sessionId: string;
  id: string;
  device: string;
  guest: true;
  level: 1;
}

export interface AscensionPeer extends AscensionOperative {
  transport: 'cloud' | 'browser';
  receivedAt: number;
}

export interface AscensionNetworkStatus {
  mode: 'cloud' | 'browser' | 'solo';
  label: 'LIVE GRID' | 'THIS BROWSER' | 'SOLO MODE';
  online: boolean;
  connecting: boolean;
  peers: number;
  sessionId: string;
  reason: string;
}

export interface AscensionNetworkSnapshot extends AscensionNetworkStatus {
  roster: AscensionOperative[];
  players: AscensionPeer[];
}

export interface AscensionNetwork {
  start(profile?: AscensionProfile): AscensionNetworkStatus;
  stop(): void;
  status(): AscensionNetworkStatus;
  peers(): AscensionPeer[];
  me(): AscensionOperative;
  publishPosition(snapshot: AscensionPosition): void;
  onChange(callback: (snapshot: AscensionNetworkSnapshot) => void): () => void;
}

declare global {
  interface Window {
    __cwAscensionNet?: AscensionNetwork;
    CW_ASCENSION?: boolean;
  }
}
