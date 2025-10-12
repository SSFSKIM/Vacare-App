import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavigationBar } from '../components/NavigationBar'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Briefcase,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Book,
  Wrench,
  Brain,
  Cpu,
  UserCircle2,
  Compass,
  GraduationCap,
  BarChart3,
  Map,
  Building2
} from 'lucide-react'
import brain from 'brain'

interface CareerTags {
  bright_outlook?: boolean
  green?: boolean
  apprenticeship?: boolean
}

interface AlsoCalled {
  title: string[]
}

interface OnTheJob {
  task: string[]
}

interface ResourceLink {
  href: string
  title: string
}

interface ResourceList {
  resource: ResourceLink[]
}

interface CareerOverview {
  code: string
  title: string
  tags?: CareerTags
  also_called?: AlsoCalled
  what_they_do?: string
  on_the_job?: OnTheJob
  career_video?: boolean
  resources?: ResourceList
}

type ResourceKey =
  | 'knowledge'
  | 'skills'
  | 'abilities'
  | 'personality'
  | 'technology'
  | 'education'
  | 'job_outlook'
  | 'check_out_my_state'
  | 'explore_more'
  | 'where_do_they_work'

interface OnetResourceData {
  code: string
  group?: Array<{
    title?: {
      id?: string
      name?: string
    }
    element?: Array<{
      id?: string
      name?: string
      description?: string
    }>
  }>
  top_interest?: {
    id?: string
    title?: string
    description?: string
  }
  work_styles?: {
    element?: Array<{
      id?: string
      name?: string
    }>
  }
  category?: Array<{
    unspsc?: number
    title?: {
      name?: string
    }
    example?: Array<{
      name?: string
      hot_technology?: string | boolean
    }>
  }>
  job_zone?: number
  education_usually_needed?: {
    category?: string[]
  }
  outlook?: {
    description?: string
    category?: string
  }
  bright_outlook?: {
    description?: string
    category?: string | string[]
  }
  salary?: {
    soc_code?: string
    annual_10th_percentile?: number
    annual_median?: number
    annual_90th_percentile?: number
    hourly_10th_percentile?: number
    hourly_median?: number
    hourly_90th_percentile?: number
  }
  map?: {
    href?: string
    width?: number
    height?: number
  }
  legend?: {
    href?: string
    width?: number
    height?: number
  }
  above_average?: {
    state?: Array<{
      postal_code?: string
      location_quotient?: number
      name?: string
    }>
  }
  careers?: {
    career?: Array<{
      href?: string
      code?: string
      title?: string
      tags?: {
        bright_outlook?: boolean
        green?: boolean
        apprenticeship?: boolean
      }
    }>
  }
  industries?: {
    soc_code?: string
    industry?: Array<{
      href?: string
      percent_employed?: number
      code?: number | string
      title?: string
    }>
  }
  industry?: Array<{
    href?: string
    percent_employed?: number
    code?: number | string
    title?: string
  }>
  [key: string]: unknown
}

const RESOURCE_DESCRIPTIONS: Partial<Record<ResourceKey, string>> = {
  knowledge: 'Key knowledge domains frequently used in this career.',
  skills: 'Core skills that successful professionals rely on day-to-day.',
  abilities: 'Foundational abilities that support performance.',
  personality: 'Interests and work styles that align with this role.',
  technology: 'Tools and technologies commonly used on the job.',
  education: 'Typical education pathways and job zone guidance.',
  job_outlook: 'Growth expectations and compensation benchmarks.',
  check_out_my_state: 'Regional demand and location insights across the U.S.',
  explore_more: 'Adjacent career paths and industries worth exploring.',
  where_do_they_work: 'Industries that employ this occupation the most.'
}

const SUPPORTED_RESOURCE_KEYS: readonly ResourceKey[] = [
  'knowledge',
  'skills',
  'abilities',
  'personality',
  'technology',
  'education',
  'job_outlook',
  'check_out_my_state',
  'explore_more',
  'where_do_they_work'
] as const

const isResourceKey = (value: string | null | undefined): value is ResourceKey =>
  !!value && SUPPORTED_RESOURCE_KEYS.includes(value as ResourceKey)

const formatCurrency = (value?: number) =>
  typeof value === 'number' && !Number.isNaN(value)
    ? `$${Math.round(value).toLocaleString()}`
    : '—'

const formatHourly = (value?: number) =>
  typeof value === 'number' && !Number.isNaN(value)
    ? `$${value.toFixed(2)}/hr`
    : '—'

export default function CareerDetail() {
  const { onetCode } = useParams<{ onetCode: string }>()
  const navigate = useNavigate()
  const [career, setCareer] = useState<CareerOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isResourceDialogOpen, setIsResourceDialogOpen] = useState(false)
  const [selectedResource, setSelectedResource] = useState<ResourceLink | null>(null)
  const [selectedResourceKey, setSelectedResourceKey] = useState<ResourceKey | null>(null)
  const [resourceData, setResourceData] = useState<OnetResourceData | null>(null)
  const [resourceLoading, setResourceLoading] = useState(false)
  const [resourceError, setResourceError] = useState<string | null>(null)
  const resourceCache = useRef<Record<string, OnetResourceData>>({})

  const getResourceKeyFromUrl = useCallback((url: string): ResourceKey | null => {
    try {
      const parsed = new URL(url)
      const segments = parsed.pathname.split('/').filter(Boolean)
      if (!segments.length) return null
      const key = segments[segments.length - 1]
      if (isResourceKey(key)) {
        return key
      }
      return null
    } catch (err) {
      console.warn('Failed to parse O*NET resource URL', err)
      return null
    }
  }, [])

  const handleResourceDialogChange = useCallback((open: boolean) => {
    setIsResourceDialogOpen(open)
    if (!open) {
      setSelectedResource(null)
      setSelectedResourceKey(null)
      setResourceError(null)
      setResourceLoading(false)
    }
  }, [])

  const fetchResourceData = useCallback(async (resource: ResourceLink) => {
    const cacheKey = resource.href
    const cached = resourceCache.current[cacheKey]

    if (cached) {
      setResourceData(cached)
      setResourceLoading(false)
      return
    }

    setResourceLoading(true)
    setResourceError(null)
    setResourceData(null)

    try {
      const response = await fetch(`/routes/onet-career/resource-data?url=${encodeURIComponent(resource.href)}`)
      if (!response.ok) {
        throw new Error(`Failed to load resource details (status ${response.status})`)
      }

      const data: OnetResourceData = await response.json()
      resourceCache.current[cacheKey] = data
      setResourceData(data)
    } catch (err) {
      console.error('Failed to load O*NET resource data:', err)
      setResourceError(err instanceof Error ? err.message : 'Failed to load resource details')
    } finally {
      setResourceLoading(false)
    }
  }, [])

  const handleResourceClick = useCallback(
    (resource: ResourceLink) => {
      setSelectedResource(resource)
      const resourceKey = getResourceKeyFromUrl(resource.href)
      setSelectedResourceKey(resourceKey)
      setIsResourceDialogOpen(true)
      setResourceError(null)

      if (!resourceKey) {
        setResourceData(null)
        setResourceLoading(false)
        setResourceError('This resource is not yet supported.')
        return
      }

      const cached = resourceCache.current[resource.href]
      if (cached) {
        setResourceData(cached)
        return
      }

      fetchResourceData(resource)
    },
    [fetchResourceData, getResourceKeyFromUrl]
  )

  const handleRelatedCareerNavigate = useCallback(
    (code?: string) => {
      if (!code) return
      setIsResourceDialogOpen(false)
      navigate(`/career/${code}`)
    },
    [navigate]
  )

  const renderResourceContent = useCallback(
    (key: ResourceKey | null, data: OnetResourceData | null) => {
      if (!key) {
        return <p className="text-sm text-muted-foreground">Select a resource to view rich details from O*NET.</p>
      }

      if (!data) {
        return <p className="text-sm text-muted-foreground">No additional details are available for this resource.</p>
      }

      if (['knowledge', 'skills', 'abilities'].includes(key)) {
        const groups = data.group ?? []
        if (!groups.length) {
          return <p className="text-sm text-muted-foreground">No curated information is available for this section yet.</p>
        }

        return (
          <div className="space-y-4">
            {groups.map((group, index) => (
              <div key={group.title?.id ?? index} className="rounded-lg border border-border bg-muted/30 p-4">
                {group.title?.name && (
                  <h3 className="text-base font-semibold text-foreground">{group.title.name}</h3>
                )}
                {group.element?.length ? (
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {group.element.map((element) => (
                      <li key={element.id ?? element.name} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                        <span>{element.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No specific items listed.</p>
                )}
              </div>
            ))}
          </div>
        )
      }

      if (key === 'personality') {
        return (
          <div className="space-y-5">
            {data.top_interest && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {data.top_interest.title ?? 'Top Interest'}
                </h3>
                {data.top_interest.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{data.top_interest.description}</p>
                )}
              </div>
            )}

            {data.work_styles?.element?.length ? (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">Work Styles That Matter</h4>
                <div className="flex flex-wrap gap-2">
                  {data.work_styles.element.map((style) => (
                    <Badge key={style.id ?? style.name} variant="secondary">
                      {style.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )
      }

      if (key === 'technology') {
        const categories = data.category ?? []
        if (!categories.length) {
          return <p className="text-sm text-muted-foreground">No technology stack information is available.</p>
        }

        return (
          <div className="space-y-4">
            {categories.map((category, index) => (
              <div key={category.unspsc ?? category.title?.name ?? index} className="rounded-lg border border-border p-4">
                <h3 className="text-base font-semibold text-foreground">{category.title?.name}</h3>
                {category.example?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {category.example.map((example, idx) => (
                      <Badge
                        key={example.name ?? idx}
                        className={example.hot_technology ? 'bg-primary text-primary-foreground' : undefined}
                        variant={example.hot_technology ? 'default' : 'secondary'}
                      >
                        {example.name}
                        {example.hot_technology && <Sparkles className="ml-1 inline h-3 w-3" />}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No example tools listed.</p>
                )}
              </div>
            ))}
          </div>
        )
      }

      if (key === 'education') {
        return (
          <div className="space-y-5 text-sm">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job Zone</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{data.job_zone ?? '—'}</p>
            </div>
            {data.education_usually_needed?.category?.length ? (
              <div>
                <h3 className="text-base font-semibold text-foreground">Typical Education</h3>
                <ul className="mt-2 space-y-2 text-muted-foreground">
                  {data.education_usually_needed.category.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )
      }

      if (key === 'job_outlook') {
        return (
          <div className="space-y-5 text-sm">
            {data.outlook?.description && (
              <div className="rounded-lg border-l-4 border-primary/70 bg-primary/5 p-4">
                <h3 className="text-base font-semibold text-foreground">Outlook</h3>
                <p className="mt-2 text-muted-foreground">{data.outlook.description}</p>
              </div>
            )}
            {data.bright_outlook?.description && (
              <div className="rounded-lg border border-border bg-emerald-50 p-4 text-emerald-900">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="h-4 w-4" /> Bright Outlook
                </h3>
                <p className="mt-2">{data.bright_outlook.description}</p>
              </div>
            )}
            {data.salary && (
              <div>
                <h3 className="text-base font-semibold text-foreground">Salary Benchmarks</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs uppercase text-muted-foreground">10th Percentile</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(data.salary.annual_10th_percentile)}</p>
                    <p className="text-xs text-muted-foreground">{formatHourly(data.salary.hourly_10th_percentile)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs uppercase text-muted-foreground">Median</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(data.salary.annual_median)}</p>
                    <p className="text-xs text-muted-foreground">{formatHourly(data.salary.hourly_median)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs uppercase text-muted-foreground">90th Percentile</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(data.salary.annual_90th_percentile)}</p>
                    <p className="text-xs text-muted-foreground">{formatHourly(data.salary.hourly_90th_percentile)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      }

      if (key === 'check_out_my_state') {
        return (
          <div className="space-y-5 text-sm">
            {data.map?.href && (
              <div>
                <img
                  src={data.map.href}
                  alt="Employment demand by state"
                  className="w-full rounded-lg border object-contain"
                />
              </div>
            )}
            {data.above_average?.state?.length ? (
              <div>
                <h3 className="text-base font-semibold text-foreground">States with Above-average Opportunity</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {data.above_average.state.map((state) => (
                    <li
                      key={state.postal_code ?? state.name}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
                    >
                      <span className="font-medium text-foreground">
                        {state.name} {state.postal_code ? `(${state.postal_code})` : ''}
                      </span>
                      {typeof state.location_quotient === 'number' && (
                        <span className="text-xs text-muted-foreground">LQ {state.location_quotient.toFixed(2)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {data.legend?.href && (
              <div className="text-center">
                <img
                  src={data.legend.href}
                  alt="Map legend"
                  className="mx-auto max-w-xs rounded border object-contain"
                />
              </div>
            )}
          </div>
        )
      }

      if (key === 'explore_more') {
        return (
          <div className="space-y-6 text-sm">
            {data.careers?.career?.length ? (
              <div>
                <h3 className="text-base font-semibold text-foreground">Related Careers</h3>
                <div className="mt-3 space-y-3">
                  {data.careers.career.map((careerOption, index) => (
                    <div
                      key={careerOption.code ?? careerOption.title ?? index}
                      className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{careerOption.title}</p>
                        <p className="text-xs text-muted-foreground">O*NET Code: {careerOption.code ?? '—'}</p>
                        {careerOption.tags && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {careerOption.tags.bright_outlook && <Badge variant="secondary">Bright Outlook</Badge>}
                            {careerOption.tags.green && <Badge variant="secondary">Green Economy</Badge>}
                            {careerOption.tags.apprenticeship && <Badge variant="secondary">Apprenticeship</Badge>}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRelatedCareerNavigate(careerOption.code)}
                      >
                        View Career
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {data.industries?.industry?.length ? (
              <div>
                <h3 className="text-base font-semibold text-foreground">Industries Employing This Career</h3>
                <div className="mt-3 space-y-2">
                  {data.industries.industry.map((industry) => (
                    <div
                      key={industry.code ?? industry.title}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <span className="font-medium text-foreground">{industry.title}</span>
                      {typeof industry.percent_employed === 'number' && (
                        <span className="text-xs text-muted-foreground">{industry.percent_employed}% employed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )
      }

      if (key === 'where_do_they_work') {
        return (
          <div className="space-y-3 text-sm">
            {data.industry?.length ? (
              data.industry.map((industry, index) => (
                <div
                  key={industry.code ?? industry.title ?? index}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <span className="font-medium text-foreground">{industry.title}</span>
                  {typeof industry.percent_employed === 'number' && (
                    <span className="text-xs text-muted-foreground">{industry.percent_employed}% employed</span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Industry distribution data is not available.</p>
            )}
          </div>
        )
      }

      return (
        <pre className="rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground">
          {JSON.stringify(data, null, 2)}
        </pre>
      )
    },
    [handleRelatedCareerNavigate]
  )

  useEffect(() => {
    const fetchCareerDetails = async () => {
      if (!onetCode) {
        setError('No O*NET code provided')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const response = await brain.get_career_overview(onetCode)
        const data = await response.json()
        setCareer(data)
      } catch (err) {
        console.error('Failed to fetch career details:', err)
        setError(err instanceof Error ? err.message : 'Failed to load career information')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCareerDetails()
  }, [onetCode])

  const handleBack = () => {
    navigate(-1)
  }

  const getResourceIcon = (title: string) => {
    const lower = title.toLowerCase()
    if (lower.includes('knowledge')) return <Book className="h-4 w-4" />
    if (lower.includes('skill')) return <Wrench className="h-4 w-4" />
    if (lower.includes('abilit')) return <Brain className="h-4 w-4" />
    if (lower.includes('personality')) return <UserCircle2 className="h-4 w-4" />
    if (lower.includes('technology')) return <Cpu className="h-4 w-4" />
    if (lower.includes('education')) return <GraduationCap className="h-4 w-4" />
    if (lower.includes('job')) return <BarChart3 className="h-4 w-4" />
    if (lower.includes('state')) return <Map className="h-4 w-4" />
    if (lower.includes('explore')) return <Compass className="h-4 w-4" />
    if (lower.includes('work')) return <Building2 className="h-4 w-4" />
    return <ExternalLink className="h-4 w-4" />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Loading career details..." />
        </div>
      </div>
    )
  }

  if (error || !career) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="container mx-auto px-4 py-8">
          <ErrorMessage
            message={error || 'Career information not found'}
            onRetry={() => window.location.reload()}
          />
          <div className="mt-4 text-center">
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Button */}
        <Button onClick={handleBack} variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Results
        </Button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Briefcase className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">{career.title}</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                O*NET Code: {career.code}
              </p>
            </div>
            {career.tags?.bright_outlook && (
              <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Bright Outlook
              </Badge>
            )}
          </div>
        </div>

        {/* Alternative Titles */}
        {career.also_called && career.also_called.title.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Also Known As
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {career.also_called.title.map((title, index) => (
                  <Badge key={index} variant="secondary">
                    {title}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* What They Do */}
        {career.what_they_do && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">What They Do</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {career.what_they_do}
              </p>
            </CardContent>
          </Card>
        )}

        {/* On the Job Tasks */}
        {career.on_the_job && career.on_the_job.task.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">On the Job</CardTitle>
              <p className="text-sm text-muted-foreground">
                Typical tasks and responsibilities
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {career.on_the_job.task.map((task, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{task}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Resources */}
        {career.resources && career.resources.resource.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Learn More</CardTitle>
              <p className="text-sm text-muted-foreground">
                Detailed information about skills, knowledge, and abilities
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {career.resources.resource.map((resource, index) => {
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleResourceClick(resource)}
                      className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-2">
                        {getResourceIcon(resource.title)}
                        <span className="font-medium text-foreground">{resource.title}</span>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Next Move Link */}
        <div className="text-center py-4">
          <Button
            variant="outline"
            onClick={() => window.open(`https://www.mynextmove.org/profile/summary/${career.code}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Full Profile on My Next Move
          </Button>
        </div>
      </div>

      <Dialog open={isResourceDialogOpen} onOpenChange={handleResourceDialogChange}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{selectedResource?.title ?? 'Learn More'}</DialogTitle>
            <DialogDescription>
              {selectedResourceKey && RESOURCE_DESCRIPTIONS[selectedResourceKey]
                ? RESOURCE_DESCRIPTIONS[selectedResourceKey]
                : 'Detailed information provided directly by O*NET Web Services.'}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            {resourceLoading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner
                  message={`Loading ${selectedResource?.title ?? 'details'}...`}
                  size="sm"
                />
              </div>
            ) : resourceError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {resourceError}
              </div>
            ) : (
              <ScrollArea className="h-[55vh] max-h-[65vh] pr-4">
                <div className="space-y-4 pb-2 text-sm">
                  {renderResourceContent(selectedResourceKey, resourceData)}
                </div>
              </ScrollArea>
            )}

            {selectedResource?.href && (
              <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Data provided courtesy of O*NET Web Services.</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 self-start sm:self-auto"
                  onClick={() => window.open(selectedResource.href, '_blank', 'noopener,noreferrer')}
                >
                  View on O*NET
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            )}

            <div className="mt-6 space-y-1 text-xs text-muted-foreground">
              <p>
                This experience includes information from the{' '}
                <a
                  href="https://www.onetcenter.org/license_db.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  O*NET&reg; 30.0 Database
                </a>{' '}
                by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the{' '}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  CC BY 4.0
                </a>{' '}
                license.
              </p>
              <p>
                VA Care has modified this information to support personalized recommendations. USDOL/ETA has not approved, endorsed, or tested these modifications. O*NET&reg; is a trademark of USDOL/ETA.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
