import clusterData from '@/data/career-clusters.json'
import type { CareerRecommendationMatch } from '@/types'

type ClusterMapEntry = {
  occupation: string
  cluster: string
  subCluster: string | null
  code: string | null
}

type ClusterData = Record<string, ClusterMapEntry>

const rawClusterMap = clusterData as ClusterData

export interface ClusterProfileSegment {
  id: string
  label: string
  total: number
  percentage: number
  matches: number
  occupations: string[]
  isUnknown?: boolean
}

export interface ClusterProfileResult {
  clusters: ClusterProfileSegment[]
  subClusters: ClusterProfileSegment[]
  unmatched: string[]
  sampleSize: number
  totalWeight: number
}

type SegmentAccumulator = {
  id: string
  label: string
  total: number
  count: number
  occupations: Set<string>
  isUnknown?: boolean
}

const exactClusterMap = new Map<string, ClusterMapEntry>(
  Object.entries(rawClusterMap)
)

const normalizeCache = new Map<string, string>()

const normalizedClusterMap = new Map<string, ClusterMapEntry>()

for (const entry of Object.values(rawClusterMap)) {
  const normalized = normalizeTitle(entry.occupation)
  if (!normalizedClusterMap.has(normalized)) {
    normalizedClusterMap.set(normalized, entry)
  }
}

function normalizeTitle(title: string): string {
  const cacheKey = title
  const cached = normalizeCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const normalized = title
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  normalizeCache.set(cacheKey, normalized)
  return normalized
}

function findClusterEntry(title: string): ClusterMapEntry | undefined {
  const lowerKey = title.trim().toLowerCase()
  const direct = exactClusterMap.get(lowerKey)
  if (direct) {
    return direct
  }

  const normalized = normalizeTitle(title)
  const normalizedDirect = normalizedClusterMap.get(normalized)
  if (normalizedDirect) {
    return normalizedDirect
  }

  if (normalized.endsWith('s')) {
    const singular = normalized.slice(0, -1)
    const singularMatch = normalizedClusterMap.get(singular)
    if (singularMatch) {
      return singularMatch
    }
  }

  if (normalized.endsWith('ies')) {
    const singularY = `${normalized.slice(0, -3)}y`
    const singularMatch = normalizedClusterMap.get(singularY)
    if (singularMatch) {
      return singularMatch
    }
  }

  return undefined
}

function mapToSegments(map: Map<string, SegmentAccumulator>): ClusterProfileSegment[] {
  const segments = Array.from(map.values())
  const total = segments.reduce((sum, item) => sum + item.total, 0)

  return segments
    .map((item) => ({
      id: item.id,
      label: item.label,
      total: item.total,
      percentage: total > 0 ? (item.total / total) * 100 : 0,
      matches: item.count,
      occupations: Array.from(item.occupations),
      isUnknown: item.isUnknown,
    }))
    .sort((a, b) => b.total - a.total)
}

export function buildClusterProfile(
  matches: CareerRecommendationMatch[] | null | undefined
): ClusterProfileResult {
  if (!matches || matches.length === 0) {
    return {
      clusters: [],
      subClusters: [],
      unmatched: [],
      sampleSize: 0,
      totalWeight: 0,
    }
  }

  const sorted = [...matches].sort((a, b) => {
    const aScore = typeof a.correlation === 'number' ? a.correlation : 0
    const bScore = typeof b.correlation === 'number' ? b.correlation : 0
    return bScore - aScore
  })

  const topMatches = sorted.slice(0, 40)

  const weighted = topMatches.map((match) => {
    const rawScore = typeof match.correlation === 'number' ? match.correlation : 0
    const weight = Number.isFinite(rawScore) && rawScore > 0 ? rawScore : 0
    return {
      match,
      weight,
    }
  })

  let totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)

  if (totalWeight <= 0) {
    for (const item of weighted) {
      item.weight = 1
    }
    totalWeight = weighted.length
  }

  const clusterAccumulator = new Map<string, SegmentAccumulator>()
  const subClusterAccumulator = new Map<string, SegmentAccumulator>()
  const unmatched = new Set<string>()

  for (const item of weighted) {
    const title = item.match.title?.trim()
    if (!title) {
      continue
    }

    const entry = findClusterEntry(title)

    if (!entry) {
      unmatched.add(title)
      continue
    }

    const clusterId = entry.cluster || 'unknown-cluster'
    const clusterLabel = entry.cluster || 'Unknown'
    const clusterExisting = clusterAccumulator.get(clusterId)

    if (clusterExisting) {
      clusterExisting.total += item.weight
      clusterExisting.count += 1
      clusterExisting.occupations.add(entry.occupation)
    } else {
      clusterAccumulator.set(clusterId, {
        id: clusterId,
        label: clusterLabel,
        total: item.weight,
        count: 1,
        occupations: new Set([entry.occupation]),
        isUnknown: clusterId === 'unknown-cluster',
      })
    }

    const subClusterId = entry.subCluster && entry.subCluster.length > 0
      ? entry.subCluster
      : 'unknown-sub-cluster'
    const subClusterLabel = entry.subCluster && entry.subCluster.length > 0
      ? entry.subCluster
      : 'Unknown'
    const subClusterExisting = subClusterAccumulator.get(subClusterId)

    if (subClusterExisting) {
      subClusterExisting.total += item.weight
      subClusterExisting.count += 1
      subClusterExisting.occupations.add(entry.occupation)
    } else {
      subClusterAccumulator.set(subClusterId, {
        id: subClusterId,
        label: subClusterLabel,
        total: item.weight,
        count: 1,
        occupations: new Set([entry.occupation]),
        isUnknown: subClusterId === 'unknown-sub-cluster',
      })
    }
  }

  return {
    clusters: mapToSegments(clusterAccumulator),
    subClusters: mapToSegments(subClusterAccumulator),
    unmatched: Array.from(unmatched),
    sampleSize: weighted.length,
    totalWeight,
  }
}
