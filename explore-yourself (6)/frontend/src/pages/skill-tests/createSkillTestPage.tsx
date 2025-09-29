import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavigationBar } from '../../components/NavigationBar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Check } from 'lucide-react'
import brain from 'brain'
import { toast } from 'sonner'
import { useInitializeFirebaseStore, useSkillTestStore } from '../../utils/test-migration-helper'
import { useTranslation } from 'react-i18next'
import type { SkillQuestion, SkillTestResult } from '@/types'

interface SkillTestConfig {
  filterNames: string[]
  storeKey: string
  subsetKey: string
  translationKey: string
  storageKey?: string
  showProgress?: boolean
}

interface SkillApiResult {
  results?: Array<{
    name: string
    score: number
    description?: string
    category?: string
  }>
}

export function createSkillTestPage({
  filterNames,
  storeKey,
  subsetKey,
  translationKey,
  storageKey,
  showProgress = true
}: SkillTestConfig) {
  const SkillTestPage: React.FC = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { setSkillResults, storeLoading, storeError } = useSkillTestStore(subsetKey)

    const [answers, setAnswers] = useState<Record<number, number>>(() => {
      if (!storageKey) return {}
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : {}
    })
    const [questions, setQuestions] = useState<SkillQuestion[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useInitializeFirebaseStore()

    useEffect(() => {
      const fetchQuestions = async () => {
        try {
          const response = await brain.get_skill_questions()
          const data = await response.json()
          const filtered = (Array.isArray(data) ? data : []).filter((q: SkillQuestion) =>
            filterNames.includes(q.name)
          )
          setQuestions(filtered as SkillQuestion[])
        } catch (err) {
          console.error('Failed to load skill questions', err)
          setError(t('skillTests.common.loadError'))
        } finally {
          setLoading(false)
        }
      }

      fetchQuestions()
    }, [filterNames, t])

    useEffect(() => {
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(answers))
      }
    }, [answers, storageKey])

    const handleAnswerChange = (questionId: number, value: number) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: value
      }))
      toast.success(t('skillTests.common.toastRated', { value }))
    }

    const handleClearProgress = () => {
      if (!storageKey) return
      if (window.confirm(t('skillTests.common.clearConfirm'))) {
        setAnswers({})
        localStorage.removeItem(storageKey)
      }
    }

    const handleSubmit = async () => {
      if (Object.keys(answers).length < questions.length) {
        toast.error(t('skillTests.common.submitIncomplete'))
        return
      }

      try {
        const response = await brain.calculate_skill_results({
          answers: Object.entries(answers).map(([questionId, rating]) => ({
            questionId: parseInt(questionId, 10),
            rating
          }))
        })
        const responseData = await response.json() as SkillApiResult

        const resultsWithSubset: SkillTestResult = {
          subset: subsetKey,
          results: (responseData.results ?? []).map((r) => ({
            name: r.name,
            score: r.score,
            description: r.description,
            category: r.category,
            subset: subsetKey
          }))
        }

        await setSkillResults(resultsWithSubset)
        if (storageKey) {
          localStorage.removeItem(storageKey)
        }
        navigate('/skill-selection')
      } catch (err) {
        console.error('Skill submit error', err)
        setError(t('skillTests.common.submitError'))
      }
    }

    const displayError = error || storeError?.message
    const progress = questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0

    const ratingLabels = useMemo(
      () => ({
        10: t('abilityTests.common.ratingLabels.10'),
        30: t('abilityTests.common.ratingLabels.30'),
        50: t('abilityTests.common.ratingLabels.50'),
        70: t('abilityTests.common.ratingLabels.70'),
        100: t('abilityTests.common.ratingLabels.100')
      }),
      [t]
    )

    if (loading || storeLoading) {
      return (
        <div className="min-h-screen bg-background">
          <NavigationBar />
          <main className="container mx-auto px-4 py-16">
            <div className="text-center">{t('skillTests.common.loading')}</div>
          </main>
        </div>
      )
    }

    if (displayError) {
      return (
        <div className="min-h-screen bg-background">
          <NavigationBar />
          <main className="container mx-auto px-4 py-16">
            <div className="text-center text-red-500">
              {displayError || t('skillTests.common.unexpectedError')}
            </div>
          </main>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8 text-center">{t(`${translationKey}.title`)}</h1>
            {showProgress && (
              <div className="mb-8">
                <div className="flex justify-between text-sm mb-2">
                  <span>{t('skillTests.common.progress', { percent: Math.round(progress) })}</span>
                  <span>{t('skillTests.common.answered', { answered: Object.keys(answers).length, total: questions.length })}</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}
            <p className="text-lg text-muted-foreground mb-8 text-center">
              {t(`${translationKey}.instructions.line1`)}
              <br />
              {t(`${translationKey}.instructions.line2`)}
            </p>

            <div className="space-y-8">
              {questions.map((question, index) => (
                <Card
                  key={question.id}
                  className={`p-6 relative ${answers[question.id] !== undefined ? 'border-primary' : ''}`}
                >
                  {answers[question.id] !== undefined && (
                    <div className="absolute top-4 right-4">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold mb-2">
                      {index + 1}. {question.name}
                    </h3>
                    <p className="text-muted-foreground mb-4">{question.description}</p>
                    <div className="pl-4 space-y-2 mb-6">
                      <p>
                        <strong>{t('skillTests.common.levelLabel', { level: question.levels[0] })}</strong>{' '}
                        {question.examples[0]}
                      </p>
                      <p>
                        <strong>{t('skillTests.common.levelLabel', { level: question.levels[1] })}</strong>{' '}
                        {question.examples[1]}
                      </p>
                      <p>
                        <strong>{t('skillTests.common.levelLabel', { level: question.levels[2] })}</strong>{' '}
                        {question.examples[2]}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {[10, 20, 30, 40, 50].map((value) => (
                        <Button
                          key={value}
                          variant={answers[question.id] === value ? 'default' : 'outline'}
                          onClick={() => handleAnswerChange(question.id, value)}
                          className="p-2 h-auto flex flex-col gap-1"
                          size="sm"
                        >
                          <span>{value}</span>
                          {(value === 10 || value === 30 || value === 50) && (
                            <span className="text-xs">{ratingLabels[value as 10 | 30 | 50]}</span>
                          )}
                        </Button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {[60, 70, 80, 90, 100].map((value) => (
                        <Button
                          key={value}
                          variant={answers[question.id] === value ? 'default' : 'outline'}
                          onClick={() => handleAnswerChange(question.id, value)}
                          className="p-2 h-auto flex flex-col gap-1"
                          size="sm"
                        >
                          <span>{value}</span>
                          {(value === 70 || value === 100) && (
                            <span className="text-xs">{ratingLabels[value as 70 | 100]}</span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-8 flex justify-center gap-4">
              {storageKey && progress > 0 && progress < 100 && (
                <Button variant="outline" onClick={handleClearProgress} disabled={storeLoading}>
                  {t('skillTests.common.clearProgress')}
                </Button>
              )}
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={storeLoading || Object.keys(answers).length < questions.length}
              >
                {storeLoading ? t('skillTests.common.saving') : t('skillTests.common.submit')}
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return SkillTestPage
}
