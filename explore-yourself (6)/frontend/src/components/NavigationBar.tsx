import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useFirebaseAssessmentStore } from '../utils/firebase-assessment-store';
import { LogOut, User, Settings } from 'lucide-react';
import { useCurrentUser, firebaseAuth } from 'app';
import { toast } from 'sonner';

export function NavigationBar() {
  const navigate = useNavigate();
  const { user, loading } = useCurrentUser();
  const { user: storeUser } = useFirebaseAssessmentStore();

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="text-xl font-semibold cursor-pointer"
          onClick={() => navigate('/')}
        >
          Explore Yourself
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
            <Button variant="ghost" onClick={() => navigate('/')} className="justify-start sm:justify-center">
              Home
            </Button>
            <Button variant="ghost" onClick={() => navigate('/results')} className="justify-start sm:justify-center">
              View Results
            </Button>
          </div>
          <div className="flex items-center gap-2 sm:ml-4">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium truncate max-w-[160px] sm:max-w-none">
              {user ? (user.displayName || user.email || 'User') : 'Guest'}
            </span>

            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                title="Profile"
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
                      toast.success('Signed out successfully');
                      navigate('/');
                    })
                    .catch((error) => {
                      console.error('Error signing out:', error);
                      toast.error('Error signing out');
                    });
                } else {
                  navigate('/login');
                }
              }}
              title={user ? 'Sign Out' : 'Log Out'}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
