import { API_URL, auth } from 'app'

export interface StrengthItem {
  title: string
  category?: string | null
  score?: number | null
  insight: string
}

export interface CareerRecommendationItem {
  title: string
  rationale: string
  matchScore?: number | null
  developmentActions: string[]
}

export interface InterestExplorationItem {
  area: string
  insight: string
  suggestedActivities: string[]
}

export interface NextStepsPlan {
  immediate: string[]
  shortTerm: string[]
  longTerm: string[]
}

export interface ReportSections {
  executiveSummary: string
  strengthsAnalysis: StrengthItem[]
  careerPathRecommendations: CareerRecommendationItem[]
  interestExplorationGuide: InterestExplorationItem[]
  nextSteps: NextStepsPlan
  additionalResources: string[]
}

export interface ComprehensiveReport {
  reportId: string
  userId: string
  generatedAt: string
  lastUpdated: string
  model: string
  promptVersion: string
  dataQuality: string
  completedAssessments: string[]
  sections: ReportSections
  rawAssessmentSnapshot: Record<string, unknown>
  parentReportId?: string | null
}

export interface ReportSummary {
  reportId: string
  generatedAt: string
  dataQuality: string
  completedAssessments: string[]
  model: string
  promptVersion: string
}

interface GenerateReportResponse {
  success: boolean
  report: ComprehensiveReport
}

const BASE_URL = `${API_URL}/reports` as const

type FetchOptions = RequestInit & { expectBinary?: boolean }

const handleResponse = async <T>(response: Response, expectBinary = false): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Request failed with status ${response.status}`)
  }

  if (expectBinary) {
    // @ts-expect-error - caller handles blob casting
    return response.blob()
  }

  return (await response.json()) as T
}

const authenticatedFetch = async <T>(path: string, options: FetchOptions = {}): Promise<T> => {
  const token = await auth.getAuthHeaderValue()
  const headers: Record<string, string> = {
    Authorization: token,
    ...(options.headers as Record<string, string> | undefined),
  }

  const method = options.method ?? 'GET'
  const hasJsonBody = options.body !== undefined && options.body !== null
  if (!options.expectBinary && hasJsonBody) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'
  }

  const response = await fetch(path, {
    method,
    headers,
    credentials: 'include',
    body: options.body,
  })

  return handleResponse<T>(response, options.expectBinary)
}

export const generateReport = async (
  userId: string,
  options: { forceRegenerate?: boolean; sourceReportId?: string } = {}
): Promise<ComprehensiveReport> => {
  const body = JSON.stringify({
    userId,
    forceRegenerate: options.forceRegenerate ?? false,
    sourceReportId: options.sourceReportId ?? null,
  })

  const data = await authenticatedFetch<GenerateReportResponse>(`${BASE_URL}/generate`, {
    method: 'POST',
    body,
  })

  return data.report
}

export const regenerateReport = async (reportId: string): Promise<ComprehensiveReport> => {
  const data = await authenticatedFetch<GenerateReportResponse>(`${BASE_URL}/${reportId}/regenerate`, {
    method: 'POST',
  })

  return data.report
}

export const listReports = async (): Promise<ReportSummary[]> => {
  const data = await authenticatedFetch<{ reports: ReportSummary[] }>(BASE_URL)
  return data.reports
}

export const getReport = async (reportId: string): Promise<ComprehensiveReport> => {
  return authenticatedFetch<ComprehensiveReport>(`${BASE_URL}/${reportId}`)
}

export const exportReport = async (
  reportId: string,
  format: 'pdf' | 'text'
): Promise<Blob> => {
  return authenticatedFetch<Blob>(`${BASE_URL}/${reportId}/export?format=${format}`, {
    expectBinary: true,
  })
}
