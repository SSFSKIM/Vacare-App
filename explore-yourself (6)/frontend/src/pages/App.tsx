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
