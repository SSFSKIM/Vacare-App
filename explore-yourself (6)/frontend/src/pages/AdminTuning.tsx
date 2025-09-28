import React, { useCallback, useMemo, useState } from 'react'
import { NavigationBar } from '../components/NavigationBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUserGuardContext } from 'app'
import { useTranslation } from 'react-i18next'

type Json = Record<string, any>

const pretty = (v: any) => {
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}

export default function AdminTuning() {
  const { t } = useTranslation()
  const { user } = useUserGuardContext()
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<string>('')
  const [datasetName, setDatasetName] = useState('career-validation-csv')

  const appendLog = useCallback((title: string, data?: any) => {
    setLog(l => `${l}\n\n# ${title}\n${data ? pretty(data) : ''}`)
  }, [])

  const postJson = useCallback(async (path: string, body: Json) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`${path} -> ${res.status}`)
    return res.json()
  }, [])

  const getJson = useCallback(async (path: string) => {
    const res = await fetch(path)
    if (!res.ok) throw new Error(`${path} -> ${res.status}`)
    return res.json()
  }, [])

  const doBootstrap = useCallback(async () => {
    setBusy(true)
    try {
      const body = {
        dataset_name: datasetName,
        sample_occupations: 200,
        positives_per_occupation: 1,
        negatives_per_positive: 3,
        topn_abilities: 6,
        topn_skills: 6,
        topn_knowledge: 6,
        include_interests: true,
        noise_std: 5
      }
      const data = await postJson('/routes/career-recommendation/bootstrap-validation', body)
      appendLog('Bootstrap Validation Generated', data)
    } catch (e) {
      appendLog('Bootstrap Failed', String(e))
    } finally {
      setBusy(false)
    }
  }, [datasetName, postJson, appendLog])

  const doCalibratePercentile = useCallback(async () => {
    setBusy(true)
    try {
      const body = { importance_percentile: 75, level_percentile: 65, top_k: 20 }
      const data = await postJson('/routes/career-recommendation/calibrate', body)
      appendLog('Calibrate (Percentile) OK', data)
    } catch (e) {
      appendLog('Calibrate (Percentile) Failed', String(e))
    } finally {
      setBusy(false)
    }
  }, [postJson, appendLog])

  const doCalibrateOptim = useCallback(async () => {
    setBusy(true)
    try {
      const body = {
        dataset_name: datasetName,
        importance_candidates: [60, 70, 80, 85, 90],
        ratio_candidates: [0.6, 0.7, 0.8, 0.85, 0.9],
        top_k: 20
      }
      const data = await postJson('/routes/career-recommendation/calibrate', body)
      appendLog('Calibrate (Optimized) OK', data)
    } catch (e) {
      appendLog('Calibrate (Optimized) Failed', String(e))
    } finally {
      setBusy(false)
    }
  }, [datasetName, postJson, appendLog])

  const doOptimizeWeights = useCallback(async () => {
    setBusy(true)
    try {
      const body = { dataset_name: datasetName }
      const data = await postJson('/routes/career-recommendation/optimize-weights', body)
      appendLog('Optimize Weights OK', data)
    } catch (e) {
      appendLog('Optimize Weights Failed', String(e))
    } finally {
      setBusy(false)
    }
  }, [datasetName, postJson, appendLog])

  const doCalibrateScores = useCallback(async () => {
    setBusy(true)
    try {
      const body = { dataset_name: datasetName, learning_rate: 0.01, max_iter: 500 }
      const data = await postJson('/routes/career-recommendation/calibrate-scores', body)
      appendLog('Calibrate Scores OK', data)
    } catch (e) {
      appendLog('Calibrate Scores Failed', String(e))
    } finally {
      setBusy(false)
    }
  }, [datasetName, postJson, appendLog])

  const doFetchState = useCallback(async () => {
    setBusy(true)
    try {
      const data = await getJson('/routes/career-recommendation/calibration')
      appendLog('Current Calibration', data)
    } catch (e) {
      appendLog('Fetch Calibration Failed', String(e))
    } finally {
      setBusy(false)
    }
  }, [getJson, appendLog])

  const doFullPipeline = useCallback(async () => {
    setBusy(true)
    setLog('')
    try {
      // 1) Bootstrap synthetic dataset
      const bootstrapBody = {
        dataset_name: datasetName,
        sample_occupations: 200,
        positives_per_occupation: 1,
        negatives_per_positive: 3,
        topn_abilities: 6,
        topn_skills: 6,
        topn_knowledge: 6,
        include_interests: true,
        noise_std: 5
      }
      const boot = await postJson('/routes/career-recommendation/bootstrap-validation', bootstrapBody)
      appendLog('1) Bootstrap Validation', boot)

      // 2) Optimize weights on dataset
      const weights = await postJson('/routes/career-recommendation/optimize-weights', { dataset_name: datasetName })
      appendLog('2) Optimize Weights', weights)

      // 3) Calibrate thresholds (importance / min requirement ratio)
      const calibBody = {
        dataset_name: datasetName,
        importance_candidates: [60, 70, 80, 85, 90],
        ratio_candidates: [0.5, 0.6, 0.7, 0.8, 0.85],
        top_k: 20
      }
      const calib = await postJson('/routes/career-recommendation/calibrate', calibBody)
      appendLog('3) Calibrate Thresholds', calib)

      // 4) Calibrate score scaling (Platt)
      const scoreCal = await postJson('/routes/career-recommendation/calibrate-scores', { dataset_name: datasetName, learning_rate: 0.01, max_iter: 500 })
      appendLog('4) Calibrate Scores', scoreCal)

      // 5) Fetch final state
      const state = await getJson('/routes/career-recommendation/calibration')
      appendLog('5) Final Calibration State', state)
    } catch (e) {
      appendLog('Full Pipeline Failed', String(e))
    } finally {
      setBusy(false)
    }
  }, [datasetName, postJson, getJson, appendLog])

  return (
    <div className='min-h-screen bg-background'>
      <NavigationBar />
      <div className='container mx-auto px-4 py-6 space-y-6'>
        <h1 className='text-2xl font-bold'>{t('adminTuning.title')}</h1>
        {!user && (
          <div className='text-sm text-muted-foreground'>{t('adminTuning.loginPrompt')}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('adminTuning.datasetCard.title')}</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 items-end'>
              <div>
                <Label htmlFor='ds'>{t('adminTuning.datasetCard.datasetLabel')}</Label>
                <Input id='ds' value={datasetName} onChange={e => setDatasetName(e.target.value)} />
              </div>
              <div className='flex gap-2'>
                <Button disabled={busy} onClick={doBootstrap} variant='outline'>{t('adminTuning.datasetCard.bootstrap')}</Button>
                <Button disabled={busy} onClick={doFetchState} variant='secondary'>{t('adminTuning.datasetCard.fetchState')}</Button>
              </div>
            </div>

            <div className='flex flex-wrap gap-2'>
              <Button disabled={busy} onClick={doFullPipeline} variant='secondary'>{t('adminTuning.datasetCard.fullPipeline')}</Button>
              <Button disabled={busy} onClick={doCalibratePercentile}>{t('adminTuning.datasetCard.calibratePercentile')}</Button>
              <Button disabled={busy} onClick={doCalibrateOptim} variant='outline'>{t('adminTuning.datasetCard.calibrateOptimized')}</Button>
              <Button disabled={busy} onClick={doOptimizeWeights} variant='outline'>{t('adminTuning.datasetCard.optimizeWeights')}</Button>
              <Button disabled={busy} onClick={doCalibrateScores} variant='outline'>{t('adminTuning.datasetCard.calibrateScores')}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('adminTuning.logs.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea readOnly value={log} className='h-80 font-mono text-xs' />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
