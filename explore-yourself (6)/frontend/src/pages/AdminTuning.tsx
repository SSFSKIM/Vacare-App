import React, { useCallback, useMemo, useState } from 'react'
import { NavigationBar } from '../components/NavigationBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUserGuardContext } from 'app'

type Json = Record<string, any>

const pretty = (v: any) => {
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}

export default function AdminTuning() {
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

  return (
    <div className='min-h-screen bg-background'>
      <NavigationBar />
      <div className='container mx-auto px-4 py-6 space-y-6'>
        <h1 className='text-2xl font-bold'>Admin: Recommendation Tuning</h1>
        {!user && (
          <div className='text-sm text-muted-foreground'>로그인 후 사용하세요.</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Dataset & Actions</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 items-end'>
              <div>
                <Label htmlFor='ds'>Validation Dataset Name</Label>
                <Input id='ds' value={datasetName} onChange={e => setDatasetName(e.target.value)} />
              </div>
              <div className='flex gap-2'>
                <Button disabled={busy} onClick={doBootstrap} variant='outline'>Bootstrap Validation</Button>
                <Button disabled={busy} onClick={doFetchState} variant='secondary'>Fetch State</Button>
              </div>
            </div>

            <div className='flex flex-wrap gap-2'>
              <Button disabled={busy} onClick={doCalibratePercentile}>Calibrate (Percentile)</Button>
              <Button disabled={busy} onClick={doCalibrateOptim} variant='outline'>Calibrate (Optimized)</Button>
              <Button disabled={busy} onClick={doOptimizeWeights} variant='outline'>Optimize Weights</Button>
              <Button disabled={busy} onClick={doCalibrateScores} variant='outline'>Calibrate Scores</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea readOnly value={log} className='h-80 font-mono text-xs' />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

