import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavigationBar } from '../components/NavigationBar'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorMessage } from '../components/ErrorMessage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Briefcase,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Book,
  Wrench,
  Brain
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

export default function CareerDetail() {
  const { onetCode } = useParams<{ onetCode: string }>()
  const navigate = useNavigate()
  const [career, setCareer] = useState<CareerOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
                  // Use proxy endpoint for O*NET resources to handle authentication
                  const proxyUrl = `/routes/onet-career/proxy?url=${encodeURIComponent(resource.href)}`

                  return (
                    <a
                      key={index}
                      href={proxyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {getResourceIcon(resource.title)}
                        <span className="font-medium">{resource.title}</span>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
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
    </div>
  )
}
