import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavigationBar } from '../../components/NavigationBar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Check, Loader2 } from 'lucide-react'
import brain from 'brain'
import { KnowledgeAnswerGrid } from '../../components/KnowledgeAnswerGrid'
import { useInitializeFirebaseStore, useKnowledgeTestStore } from '../../utils/test-migration-helper'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { KnowledgeQuestion, KnowledgeTestResult } from '@/types'

interface KnowledgeTestConfig {
  storageKey: string
  answersStorageKey: string
  subsetKey: string
  storeKey: string
  filterNames: string[]
  translationKey: string
  showRatingToast?: boolean
}

interface KnowledgeApiResult {
  results?: Array<{
    name: string
    score: number
    description?: string
    category?: string
  }>
}

export function createKnowledgeTestPage(config: KnowledgeTestConfig) {
  const {
    storageKey,
    answersStorageKey,
    subsetKey,
    storeKey,
    filterNames,
    translationKey,
    showRatingToast = false,
  } = config

  const KnowledgeTestPage: React.FC = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [answers, setAnswers] = useState<Record<number, number>>(() => {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : {}
    })
  const [questions, setQuestions] = useState<KnowledgeQuestion[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useInitializeFirebaseStore()
    const { setKnowledgeResults, storeLoading, storeError } = useKnowledgeTestStore(storeKey)

    const progress = questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0

    useEffect(() => {
      const savedAnswers = localStorage.getItem(answersStorageKey)
      if (savedAnswers) {
        setAnswers(JSON.parse(savedAnswers))
      }
    }, [answersStorageKey])

    useEffect(() => {
      localStorage.setItem(answersStorageKey, JSON.stringify(answers))
      localStorage.setItem(storageKey, JSON.stringify(answers))
    }, [answers, answersStorageKey, storageKey])

    useEffect(() => {
      const fetchQuestions = async () => {
        try {
          const response = await brain.get_knowledge_questions()
          const data = await response.json()
          const filtered = (Array.isArray(data) ? data : []).filter((q: KnowledgeQuestion) =>
            filterNames.includes(q.name)
          )
          setQuestions(filtered as KnowledgeQuestion[])
        } catch (err) {
          console.error('Failed to load knowledge questions', err)
          setError(t('knowledgeTests.common.loadError'))
        } finally {
          setLoading(false)
        }
      }

      fetchQuestions()
    }, [filterNames, t])

    const handleAnswerChange = (questionId: number, value: number) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: value,
      }))

      if (showRatingToast) {
        toast.success(t('knowledgeTests.common.toastRated', { value }))
      }
    }

    const handleClearProgress = () => {
      if (window.confirm(t('knowledgeTests.common.clearConfirm'))) {
        setAnswers({})
        localStorage.removeItem(answersStorageKey)
        localStorage.removeItem(storageKey)
      }
    }

    const handleSubmit = async () => {
      if (Object.keys(answers).length < questions.length) {
        toast.error(t('knowledgeTests.common.submitIncomplete'))
        return
      }

      try {
        const response = await brain.calculate_knowledge_results({
          answers: Object.entries(answers).map(([questionId, rating]) => ({
            questionId: parseInt(questionId, 10),
            rating,
          })),
        })
        const responseData = await response.json() as KnowledgeApiResult

        const resultsWithSubset: KnowledgeTestResult = {
          subset: subsetKey,
          results: (responseData.results ?? []).map((r) => ({
            name: r.name,
            score: r.score,
            description: r.description,
            category: r.category,
            subset: subsetKey,
          })),
        }

        await setKnowledgeResults(resultsWithSubset)
        localStorage.removeItem(answersStorageKey)
        localStorage.removeItem(storageKey)
        navigate('/knowledge-selection')
      } catch (err) {
        console.error('Knowledge submit error', err)
        setError(t('knowledgeTests.common.submitError'))
        toast.error(t('knowledgeTests.common.submitError'))
      }
    }

    if (loading) {
      return (
        <div className="min-h-screen bg-background">
          <NavigationBar />
          <main className="container mx-auto px-4 py-16">
            <div className="text-center">{t('knowledgeTests.common.loading')}</div>
          </main>
        </div>
      )
    }

    if (error || storeError) {
      return (
        <div className="min-h-screen bg-background">
          <NavigationBar />
          <main className="container mx-auto px-4 py-16">
            <div className="text-center text-red-500">
              {error || storeError?.message || t('knowledgeTests.common.unexpectedError')}
            </div>
            <div className="mt-4 flex justify-center">
              <Button onClick={() => navigate('/knowledge-selection')} variant="outline">
                {t('knowledgeTests.common.returnToSelection')}
              </Button>
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
                <span>{t('knowledgeTests.common.progress', { percent: Math.round(progress) })}</span>
                <span>
                  {t('knowledgeTests.common.answered', {
                    answered: Object.keys(answers).length,
                    total: questions.length,
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
                      <p><strong>{t('knowledgeTests.common.levelLabel', { level: question.levels[0] })}</strong> {question.examples[0]}</p>
                      <p><strong>{t('knowledgeTests.common.levelLabel', { level: question.levels[1] })}</strong> {question.examples[1]}</p>
                      <p><strong>{t('knowledgeTests.common.levelLabel', { level: question.levels[2] })}</strong> {question.examples[2]}</p>
                    </div>
                  </div>

                  <KnowledgeAnswerGrid
                    questionId={question.id}
                    currentAnswer={answers[question.id]}
                    onAnswerChange={handleAnswerChange}
                  />
                </Card>
              ))}
            </div>

            <div className="mt-8 flex justify-center gap-4">
              {progress > 0 && progress < 100 && (
                <Button variant="outline" onClick={handleClearProgress} disabled={storeLoading}>
                  {t('knowledgeTests.common.clearProgress')}
                </Button>
              )}
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={storeLoading || Object.keys(answers).length < questions.length}
              >
                {storeLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('knowledgeTests.common.saving')}
                  </>
                ) : (
                  t('knowledgeTests.common.submit')
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return KnowledgeTestPage
}
