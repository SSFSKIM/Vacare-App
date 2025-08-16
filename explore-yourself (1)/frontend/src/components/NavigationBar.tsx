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
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="text-xl font-semibold" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          Explore Yourself
        </div>
        <div className="flex gap-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            Home
          </Button>
          <Button variant="ghost" onClick={() => navigate('/results')}>
            View Results
          </Button>
          <div className="flex items-center gap-2 ml-4">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">
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
                  // Sign out using Firebase
                  firebaseAuth.signOut()
                    .then(() => {
                      toast.success('Signed out successfully');
                      navigate('/');
                    })
                    .catch((error) => {
                      console.error('Error signing out:', error);
                      toast.error('Error signing out');
                    });
                } else {
                  // Guest user - direct to login
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
