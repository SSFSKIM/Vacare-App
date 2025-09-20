import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { User, onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from 'app';
import { useFirebaseAssessmentStore, initializeFirebaseAssessment } from '../utils/firebase-assessment-store';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Initialize Firebase assessment store
  useEffect(() => {
    initializeFirebaseAssessment();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  if (user && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
