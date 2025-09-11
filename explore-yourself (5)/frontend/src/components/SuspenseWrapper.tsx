import React, { Suspense, ReactNode } from 'react';

interface SuspenseWrapperProps {
  children: ReactNode;
}

export function SuspenseWrapper({ children }: SuspenseWrapperProps) {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
}
