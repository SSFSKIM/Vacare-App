import React, { useCallback, useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { AbilitySubsetResult } from '@/types'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useTranslation } from 'react-i18next'

const DEFAULT_VISIBLE_RESULTS = 10

interface Props {
  results: AbilitySubsetResult[];
}

interface SubsetPanelProps {
  subsetKey: string;
  displayName: string;
  results: AbilitySubsetResult[];
}

const AbilitySubsetPanel = React.memo(({ subsetKey, displayName, results }: SubsetPanelProps) => {
  const { t } = useTranslation()
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_RESULTS)

  const handleLoadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(current + DEFAULT_VISIBLE_RESULTS, results.length))
  }, [results.length])

  const visibleResults = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount]
  )

  const hasMore = visibleCount < results.length
  const averageScore = Math.round(
    results.reduce((sum, r) => sum + r.score, 0) /
      Math.max(results.length, 1)
  )

  return (
    <AccordionItem value={subsetKey} className="overflow-hidden rounded-lg border">
      <AccordionTrigger className="px-4 text-left">
        <div className="flex flex-col items-start">
          <span className="text-base font-semibold">{displayName}</span>
          <span className="text-xs text-muted-foreground">
            {t('abilityResults.groupSummary', { count: results.length, average: averageScore })}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 px-4 pb-4">
          {visibleResults.map((result) => (
            <div key={result.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{result.name}</span>
                <span>{result.score}%</span>
              </div>
              <Progress value={result.score} className="h-1.5" />
            </div>
          ))}
        </div>
        {hasMore && (
          <div className="px-4 pb-4">
            <Button onClick={handleLoadMore} variant="ghost" size="sm">
              {t('abilityResults.showMore')}
            </Button>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
})

AbilitySubsetPanel.displayName = 'AbilitySubsetPanel'

function AbilityResultsComponent({ results }: Props) {
  const { t } = useTranslation()

  if (!results || results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{t('abilityResults.emptyTitle')}</CardTitle>
            <span className="text-sm font-medium text-muted-foreground">
              {t('abilityResults.averageLabel', { value: 0 })}
            </span>
          </div>
          <Progress value={0} className="h-2 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-sm font-medium">{t('abilityResults.emptyTitle')}</h4>
              <span className="text-sm font-semibold">0%</span>
            </div>
            <Progress value={0} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const groupedResults = useMemo(() => {
    return results.reduce((acc, result) => {
      const key = result.subset || 'general'
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(result)
      return acc
    }, {} as Record<string, AbilitySubsetResult[]>)
  }, [results])

  const sortedResults = useMemo(
    () => [...results].sort((a, b) => b.score - a.score),
    [results]
  )

  const topResults = sortedResults.slice(0, 3)
  const overallAverage = Math.round(
    sortedResults.reduce((sum, item) => sum + item.score, 0) /
      Math.max(sortedResults.length, 1)
  )

  const formatSubsetName = useCallback(
    (subset: string) =>
      (subset || 'General')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    []
  );

  const buildDisplayName = useCallback(
    (subset: string) => {
      const key = (subset || 'general').toLowerCase()
      const fallback = key === 'general'
        ? t('abilityResults.subsets.general')
        : t('abilityResults.subsets.default', { name: formatSubsetName(subset) })

      return t(`abilityResults.subsets.${key}`, {
        defaultValue: fallback
      })
    },
    [formatSubsetName, t]
  )

  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-lg">{t('abilityResults.overviewTitle')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('abilityResults.averageDescription', {
                  average: overallAverage,
                  total: results.length
                })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/abilityselection')}
            >
              {t('common.actions.retakeAssessment')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('abilityResults.topStrengths')}
            </h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {topResults.map((result) => (
                <div key={result.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{result.name}</span>
                    <span>{result.score}%</span>
                  </div>
                  <Progress value={result.score} className="h-1.5" />
                </div>
              ))}
              {topResults.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('abilityResults.emptyTopStrengths')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="space-y-4">
        {Object.entries(groupedResults).map(([subset, subsetResults]) => {
          if (!subsetResults || subsetResults.length === 0) {
            return null
          }

          const displayName = buildDisplayName(subset)

          return (
            <AbilitySubsetPanel
              key={subset}
              subsetKey={subset}
              displayName={displayName}
              results={subsetResults}
            />
          )
        })}
      </Accordion>
    </div>
  )
}

export const AbilityResults = React.memo(AbilityResultsComponent)
AbilityResults.displayName = 'AbilityResults'
