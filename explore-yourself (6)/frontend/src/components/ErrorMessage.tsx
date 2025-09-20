import React from "react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  showDetails?: boolean;
}

export function ErrorMessage({
  message,
  onRetry,
  showDetails,
}: ErrorMessageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 border border-red-200">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg
              className="h-8 w-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              An error occurred
            </h3>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">{message}</p>
        </div>

        {onRetry && (
          <div className="flex space-x-3">
            <button
              onClick={onRetry}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
