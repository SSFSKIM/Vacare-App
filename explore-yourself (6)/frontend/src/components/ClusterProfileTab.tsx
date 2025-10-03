import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from './LoadingSpinner'
import type { CareerRecommendations } from '@/types'
import {
  buildClusterProfile,
  type ClusterProfileSegment,
  type SegmentOccupationDetail,
} from '@/utils/cluster-profile'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from 'react-i18next'

interface ClusterProfileTabProps {
  recommendations: CareerRecommendations | null
  isLoading: boolean
  onAnalyze: () => Promise<void>
}

const CHART_COLORS = [
  '#6366f1',
  '#22c55e',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#8b5cf6',
  '#0ea5e9',
  '#facc15',
  '#ef4444',
  '#84cc16',
  '#3b82f6',
  '#f59e0b',
]

const RADIAN = Math.PI / 180
const MIN_SEGMENT_PERCENT = 5
const LABEL_VISIBILITY_PERCENT = 7

type SegmentWithColor = ClusterProfileSegment & {
  color: string
}

function renderPercentLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
}) {
  const percentage = percent * 100

  if (percentage < LABEL_VISIBILITY_PERCENT) {
    return null
  }

  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="#111827"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-semibold"
    >
      {`${Math.round(percentage)}%`}
    </text>
  )
}

function groupSegments(
  segments: ClusterProfileSegment[],
  othersLabel: string
): ClusterProfileSegment[] {
  const grouped: ClusterProfileSegment[] = []
  let othersTotal = 0
  let othersPercentage = 0
  let othersMatches = 0
  const othersOccupations = new Set<string>()
  const othersDetails: SegmentOccupationDetail[] = []

  for (const segment of segments) {
    if (segment.isUnknown || segment.percentage >= MIN_SEGMENT_PERCENT) {
      grouped.push(segment)
      continue
    }

    othersTotal += segment.total
    othersPercentage += segment.percentage
    othersMatches += segment.matches
    for (const occupation of segment.occupations) {
      othersOccupations.add(occupation)
    }
    othersDetails.push(...segment.details)
  }

  if (othersTotal > 0 || othersMatches > 0) {
    grouped.push({
      id: 'others',
      label: othersLabel,
      total: othersTotal,
      percentage: othersPercentage,
      matches: othersMatches,
      occupations: Array.from(othersOccupations),
      details: othersDetails.sort((a, b) => b.score - a.score),
    })
  }

  return grouped.sort((a, b) => b.total - a.total)
}

function applyColors(segments: ClusterProfileSegment[]): SegmentWithColor[] {
  return segments.map((segment, index) => ({
    ...segment,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }))
}

interface DistributionSectionProps {
  title: string
  note?: string
  items: SegmentWithColor[]
  emptyMessage: string
  formatMatches: (count: number) => string
  formatDetailsTitle: (segment: SegmentWithColor) => string
  detailsCaption: string
  detailsPrompt: string
  detailsEmpty: string
  formatScore: (score: number) => string
}

function DistributionSection({
  title,
  note,
  items,
  emptyMessage,
  formatMatches,
  formatDetailsTitle,
  detailsCaption,
  detailsPrompt,
  detailsEmpty,
  formatScore,
}: DistributionSectionProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (items.length === 0) {
      setActiveId(null)
      return
    }

    if (activeId && items.some((item) => item.id === activeId)) {
      return
    }

    setActiveId(null)
  }, [items, activeId])

  const activeSegment = activeId
    ? items.find((item) => item.id === activeId) ?? null
    : null

  if (items.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {note ? (
            <p className="text-xs text-muted-foreground">{note}</p>
          ) : null}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {note ? (
          <p className="text-xs text-muted-foreground">{note}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="mx-auto h-80 w-full max-w-xl">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  dataKey="total"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={130}
                  paddingAngle={1}
                  labelLine={false}
                  label={renderPercentLabel}
                >
                  {items.map((item, index) => (
                    <Cell key={`cell-${title}-${index}`} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(_, name, entry) => {
                    const segment = entry?.payload as SegmentWithColor | undefined
                    if (!segment) {
                      return ['', name]
                    }
                    const percentText = `${segment.percentage.toFixed(1)}%`
                    const matchesText = formatMatches(segment.matches)
                    return [`${percentText} • ${matchesText}`, name]
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-md border border-border/60 bg-muted/30 p-4">
            {activeSegment ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {formatDetailsTitle(activeSegment)}
                  </p>
                  <span className="text-sm font-semibold tabular-nums text-foreground/80">
                    {activeSegment.percentage.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {detailsCaption}
                </p>
                {activeSegment.details.length > 0 ? (
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    <ul className="space-y-2 text-sm">
                      {activeSegment.details.map((detail) => (
                        <li
                          key={`${activeSegment.id}-${detail.occupation}`}
                          className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-background px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">
                              {detail.title}
                            </p>
                            {detail.title !== detail.occupation && (
                              <p className="truncate text-xs text-muted-foreground">
                                {detail.occupation}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-semibold tabular-nums">
                            {formatScore(detail.score)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{detailsEmpty}</p>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center">
                <p className="text-xs text-muted-foreground">{detailsPrompt}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const isActive = item.id === activeId
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setActiveId(item.id)}
                onFocus={() => setActiveId(item.id)}
                onClick={() =>
                  setActiveId((current) => (current === item.id ? null : item.id))
                }
                className={`rounded-md border bg-background/80 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${
                  isActive ? 'border-primary/70 shadow-sm' : 'border-border/60'
                }`}
                aria-pressed={isActive}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <p className="text-sm font-semibold leading-tight">
                      {item.label}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMatches(item.matches)}
                </p>
              </button>
            )
          })}
        </div>

        
      </CardContent>
    </Card>
  )
}

export function ClusterProfileTab({
  recommendations,
  isLoading,
  onAnalyze,
}: ClusterProfileTabProps) {
  const { t } = useTranslation()
  const matches = recommendations?.matches ?? []

  const profile = useMemo(
    () => buildClusterProfile(matches),
    [matches]
  )

  const othersLabel = t('results.clusterProfile.labels.others')
  const unknownLabel = t('results.clusterProfile.labels.unknown')
  const detailsCaption = t('results.clusterProfile.details.caption')
  const detailsPrompt = t('results.clusterProfile.details.prompt')
  const detailsEmpty = t('results.clusterProfile.details.empty')
  const formatDetailsTitle = (segment: SegmentWithColor) =>
    t('results.clusterProfile.details.title', { name: segment.label })
  const formatScore = (score: number) =>
    t('results.clusterProfile.details.score', {
      value: (score * 100).toFixed(1),
    })
  const subClusterNote = t('results.clusterProfile.charts.subCluster.note')

  const clusters = useMemo(() => {
    const localized = profile.clusters.map((segment) =>
      segment.isUnknown
        ? { ...segment, label: unknownLabel }
        : segment
    )

    return applyColors(groupSegments(localized, othersLabel))
  }, [profile.clusters, unknownLabel, othersLabel])

  const subClusters = useMemo(() => {
    const localized = profile.subClusters
      .map((segment) =>
        segment.isUnknown ? { ...segment, label: unknownLabel } : segment
      )
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    // Renormalize percentages among the top 8 only
    const topTotal = localized.reduce((sum, s) => sum + s.total, 0)
    const normalized = localized.map((s) => ({
      ...s,
      percentage: topTotal > 0 ? (s.total / topTotal) * 100 : 0,
    }))

    return applyColors(normalized)
  }, [profile.subClusters, unknownLabel])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner message={t('careerRecommendations.loading.message')} />
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <Card className="border-dashed border-primary/30 bg-muted/20">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <h3 className="text-lg font-semibold">
            {t('results.clusterProfile.empty.title')}
          </h3>
          <p className="max-w-xl text-sm text-muted-foreground">
            {t('results.clusterProfile.empty.description')}
          </p>
          <Button onClick={onAnalyze} variant="outline">
            {t('careerRecommendations.actions.analyzeAgain')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const hasClusterData = clusters.length > 0
  const hasSubClusterData = subClusters.length > 0
  const unmatched = profile.unmatched

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          {t('results.clusterProfile.title')}
        </p>
        <p className="mt-1">
          {t('results.clusterProfile.description')}
        </p>
        <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
          {t('results.clusterProfile.meta.sample', { count: profile.sampleSize })}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionSection
          title={t('results.clusterProfile.charts.cluster.title')}
          items={clusters}
          emptyMessage={t('results.clusterProfile.charts.cluster.empty')}
          formatMatches={(count) =>
            t('results.clusterProfile.legend.matches', { count })
          }
          formatDetailsTitle={formatDetailsTitle}
          detailsCaption={detailsCaption}
          detailsPrompt={detailsPrompt}
          detailsEmpty={detailsEmpty}
          formatScore={formatScore}
        />
        <DistributionSection
          title={t('results.clusterProfile.charts.subCluster.title')}
          note={subClusterNote}
          items={subClusters}
          emptyMessage={t('results.clusterProfile.charts.subCluster.empty')}
          formatMatches={(count) =>
            t('results.clusterProfile.legend.matches', { count })
          }
          formatDetailsTitle={formatDetailsTitle}
          detailsCaption={detailsCaption}
          detailsPrompt={detailsPrompt}
          detailsEmpty={detailsEmpty}
          formatScore={formatScore}
        />
      </div>

      {unmatched.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {t('results.clusterProfile.unmatched.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              {t('results.clusterProfile.unmatched.description')}
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {unmatched.map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
                >
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            {t('results.clusterProfile.unmatched.none')}
          </CardContent>
        </Card>
      )}

      {!hasClusterData && !hasSubClusterData && (
        <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
          {t('results.clusterProfile.charts.emptyFallback')}
        </div>
      )}
    </div>
  )
}
