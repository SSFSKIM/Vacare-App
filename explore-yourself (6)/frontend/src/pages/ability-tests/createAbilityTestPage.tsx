import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavigationBar } from '../../components/NavigationBar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Check } from 'lucide-react'
import brain from 'brain'
import { toast } from 'sonner'
import { useInitializeFirebaseStore, useAbilityTestStore } from '../../utils/test-migration-helper'
import { useTranslation } from 'react-i18next'

interface AbilityTestConfig {
  storageKey: string
  storeKey: string
  apiSubset: string
  filterCategory: string
  translationKey: string
}

interface AbilityQuestion {
  id: number
  name: string
  description: string
  levels: Array<string | number>
  examples: Array<string | number>
}

export function createAbilityTestPage({
  storageKey,
  storeKey,
  apiSubset,
  filterCategory,
  translationKey
}: AbilityTestConfig) {
  const AbilityTestPage: React.FC = () => {
    useInitializeFirebaseStore()
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { setAbilityResults, storeLoading, storeError } = useAbilityTestStore(storeKey)

    const [answers, setAnswers] = useState<Record<number, number>>(() => {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : {}
    })
    const [questions, setQuestions] = useState<AbilityQuestion[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const progress = questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0

    useEffect(() => {
      const fetchQuestions = async () => {
        try {
          const response = await brain.get_ability_questions()
          const data = await response.json()
          const filtered = (Array.isArray(data) ? data : []).filter(
            (q: AbilityQuestion & { category?: string }) => q.category === filterCategory
          )
          setQuestions(filtered as AbilityQuestion[])
        } catch (err) {
          console.error('Failed to load ability questions', err)
          setError(t('abilityTests.common.loadError'))
        } finally {
          setLoading(false)
        }
      }

      fetchQuestions()
    }, [filterCategory, t])

    useEffect(() => {
      localStorage.setItem(storageKey, JSON.stringify(answers))
    }, [answers, storageKey])

    const handleAnswerChange = (questionId: number, value: number) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: value
      }))
      toast.success(t('abilityTests.common.toastRated', { value }))
    }

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

    const handleSubmit = async () => {
      if (Object.keys(answers).length < questions.length) {
        toast.error(t('abilityTests.common.submitIncomplete'))
        return
      }

      try {
        const answersToSubmit = Object.entries(answers).map(([questionId, rating]) => ({
          questionId: parseInt(questionId, 10),
          rating
        }))

        const response = await brain.calculate_ability_results({
          answers: answersToSubmit,
          subset: apiSubset
        })
        const responseData = await response.json()

        const success = await setAbilityResults(responseData as AbilityTestResult)
        if (success) {
          toast.success(t(`${translationKey}.success`))
          localStorage.removeItem(storageKey)
          navigate('/ability-selection')
        } else {
          setError(t('abilityTests.common.saveError'))
        }
      } catch (err) {
        console.error('Ability submit error', err)
        setError(t('abilityTests.common.submitError'))
      }
    }

    const displayError = error || storeError?.message

    if (loading) {
      return (
        <div className="min-h-screen bg-background">
          <NavigationBar />
          <main className="container mx-auto px-4 py-16">
            <div className="text-center">{t('abilityTests.common.loading')}</div>
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
              {displayError || t('abilityTests.common.unexpectedError')}
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
            <div className="mb-8">
              <div className="flex justify-between text-sm mb-2">
                <span>{t('abilityTests.common.progress', { percent: Math.round(progress) })}</span>
                <span>
                  {t('abilityTests.common.answered', {
                    answered: Object.keys(answers).length,
                    total: questions.length
                  })}
                </span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
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
                        <strong>{t('abilityTests.common.levelLabel', { level: question.levels[0] })}</strong>{' '}
                        {question.examples[0]}
                      </p>
                      <p>
                        <strong>{t('abilityTests.common.levelLabel', { level: question.levels[1] })}</strong>{' '}
                        {question.examples[1]}
                      </p>
                      <p>
                        <strong>{t('abilityTests.common.levelLabel', { level: question.levels[2] })}</strong>{' '}
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
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={storeLoading || Object.keys(answers).length < questions.length}
              >
                {t('abilityTests.common.submit')}
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return AbilityTestPage
}
