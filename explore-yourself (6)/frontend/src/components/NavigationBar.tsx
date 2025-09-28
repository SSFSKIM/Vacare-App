import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LogOut, User, Settings } from 'lucide-react'
import { useCurrentUser, firebaseAuth } from 'app'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { supportedLanguages, useLanguageStore, type SupportedLanguage } from '@/utils/language-store'

export function NavigationBar() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const language = useLanguageStore((state) => state.language)
  const setLanguage = useLanguageStore((state) => state.setLanguage)

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="text-xl font-semibold cursor-pointer"
          onClick={() => navigate('/')}
        >
          {t('navigation.title')}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
            <Button variant="ghost" onClick={() => navigate('/')} className="justify-start sm:justify-center">
              {t('navigation.home')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/results')} className="justify-start sm:justify-center">
              {t('navigation.viewResults')}
            </Button>
          </div>
          <div className="flex items-center gap-2 sm:ml-4">
            <Select
              value={language}
              onValueChange={(value) => setLanguage(value as SupportedLanguage)}
            >
              <SelectTrigger className="w-[140px]" aria-label={t('navigation.languageSelectLabel')}>
                <SelectValue placeholder={t('navigation.languageSelectPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {supportedLanguages.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <User className="h-4 w-4" />
            <span className="text-sm font-medium truncate max-w-[160px] sm:max-w-none">
              {user ? (user.displayName || user.email || t('navigation.fallbackUser')) : t('navigation.guest')}
            </span>

            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                title={t('navigation.profile')}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (user) {
                  firebaseAuth
                    .signOut()
                    .then(() => {
                      toast.success(t('navigation.toast.signedOut'))
                      navigate('/')
                    })
                    .catch((error) => {
                      console.error('Error signing out:', error)
                      toast.error(t('navigation.toast.signOutError'))
                    });
                } else {
                  navigate('/login');
                }
              }}
              title={user ? t('navigation.signOut') : t('navigation.logIn')}
              aria-label={user ? t('navigation.signOut') : t('navigation.logIn')}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
