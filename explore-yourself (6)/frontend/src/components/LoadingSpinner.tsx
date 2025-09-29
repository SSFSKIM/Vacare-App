import React from "react";

interface LoadingSpinnerProps {
  message?: string
  size?: "sm" | "md" | "lg"
  className?: string
  messageClassName?: string
}

export function LoadingSpinner({
  message,
  size = "md",
  className = "",
  messageClassName = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      <div
        className={`animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 ${sizeClasses[size]}`}
      />
      {message && <p className={`text-gray-600 text-center ${messageClassName}`}>{message}</p>}
    </div>
  );
}
