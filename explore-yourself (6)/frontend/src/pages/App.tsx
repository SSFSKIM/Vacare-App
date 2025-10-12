import React from 'react'
import { AuthProvider } from '../components/AuthProvider'
import { NavigationBar } from '../components/NavigationBar'
import { TestCard } from '../components/TestCard'
import { Brain, Lightbulb, GraduationCap, Wrench } from 'lucide-react'
import { PageErrorBoundary } from 'components/ErrorBoundary'
import { useTranslation } from 'react-i18next'

function Home() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 px-2">
            <h1 className="text-4xl font-bold mb-6">
              {t('home.title')}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {t('home.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            <TestCard
              title={t('home.cards.interest.title')}
              description={t('home.cards.interest.description')}
              icon={<Lightbulb />}
              testType="interest"
              available={true}
            />
            <TestCard
              title={t('home.cards.ability.title')}
              description={t('home.cards.ability.description')}
              icon={<Brain />}
              testType="ability"
              available={true}
              totalSections={4} // Total number of ability assessment sections
            />
            <TestCard
              title={t('home.cards.knowledge.title')}
              description={t('home.cards.knowledge.description')}
              icon={<GraduationCap />}
              testType="knowledge"
              available={true}
              totalSections={10} // Total number of knowledge assessment sections
            />
            <TestCard
              title={t('home.cards.skills.title')}
              description={t('home.cards.skills.description')}
              icon={<Wrench />}
              testType="skills"
              available={true}
              totalSections={7}  // Total number of skill assessment sections
            />
          </div>

          <section className="mt-12 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            <p>
              This platform includes assessment content adapted from the{' '}
              <a
                href="https://www.onetcenter.org/license_tools.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                O*NET&reg; Career Exploration Tools
              </a>{' '}
              and occupational insights from the{' '}
              <a
                href="https://www.onetcenter.org/license_db.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                O*NET&reg; 30.0 Database
              </a>{' '}by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA).
            </p>
            <p className="mt-2">
              VA Care has modified this information to support personalized recommendations. USDOL/ETA has not approved, endorsed, or tested these modifications. O*NET&reg; is a trademark of USDOL/ETA. Content is used under the{' '}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                CC BY 4.0
              </a>{' '}license and the O*NET Tools Developer License.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <PageErrorBoundary>
        <Home />
      </PageErrorBoundary>
    </AuthProvider>
  )
}
