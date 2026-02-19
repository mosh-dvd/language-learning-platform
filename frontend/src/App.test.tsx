import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }
})

describe('App', () => {
  it('renders the app', () => {
    render(<App />)
    // App should render without crashing
    expect(document.body).toBeInTheDocument()
  })

  it('renders authentication form when not logged in', () => {
    localStorage.clear()
    render(<App />)
    // Should show either login or register form
    expect(screen.getByText(/Sign In|Create Account/i)).toBeInTheDocument()
  })
})
