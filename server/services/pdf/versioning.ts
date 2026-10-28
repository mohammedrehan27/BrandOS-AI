export interface ParsedVersion {
  major: number
  minor: number
  patch: number
  raw: string
}

export function parseGuidelineVersion(versionStr: string): ParsedVersion {
  const clean = versionStr.trim().replace(/^v/i, '')
  const parts = clean.split('.').map((p) => parseInt(p, 10))

  return {
    major: !isNaN(parts[0]) ? parts[0] : 1,
    minor: !isNaN(parts[1]) ? parts[1] : 0,
    patch: !isNaN(parts[2]) ? parts[2] : 0,
    raw: versionStr,
  }
}

export function compareGuidelineVersions(v1: string, v2: string): number {
  const p1 = parseGuidelineVersion(v1)
  const p2 = parseGuidelineVersion(v2)

  if (p1.major !== p2.major) return p1.major - p2.major
  if (p1.minor !== p2.minor) return p1.minor - p2.minor
  return p1.patch - p2.patch
}

export function isVersionSuperseded(currentVersion: string, otherVersion: string): boolean {
  return compareGuidelineVersions(currentVersion, otherVersion) < 0
}
