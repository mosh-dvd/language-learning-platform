import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import ErrorBoundary from './components/ErrorBoundary'
import { NetworkStatusBanner } from './components/NetworkStatusBanner'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <NetworkStatusBanner />
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Language Learning Platform</h1>
            <p className="mt-2 sm:mt-4 text-sm sm:text-base text-gray-600">Welcome to your language learning journey!</p>
          </div>
        </div>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}

export default App
