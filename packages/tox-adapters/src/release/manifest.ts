/**
 * Adapter for Release Manifest to TOX format
 * 
 * TODO: This is a stub. Implement when release-manager is ready.
 */

import type { ToxJson } from '@kb-labs/tox-codec-json';

export interface ReleaseManifest {
  version: string;
  date: string;
  changes: unknown[];
  // TODO: Define full ReleaseManifest type when release-manager is ready
}

/**
 * Convert Release Manifest to TOX JSON
 * 
 * TODO: Implement when release-manager is ready
 */
export function toToxReleaseManifest(m: ReleaseManifest): ToxJson {
  // TODO: Implement actual conversion
  throw new Error(
    'toToxReleaseManifest: Not implemented yet. Release-manager integration pending.'
  );
}

/**
 * Convert TOX JSON back to Release Manifest
 * 
 * TODO: Implement when release-manager is ready
 */
export function fromToxReleaseManifest(t: ToxJson): ReleaseManifest {
  // TODO: Implement actual conversion
  throw new Error(
    'fromToxReleaseManifest: Not implemented yet. Release-manager integration pending.'
  );
}

