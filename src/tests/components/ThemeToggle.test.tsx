import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'

// Mock next-themes before importing the component
const mockSetTheme = vi.fn()
const mockUseTheme = vi.fn()

vi.mock('next-themes', () => ({
  useTheme: () => mockUseTheme(),
}))

// Mock lucide-react icons so we can identify them by test id
vi.mock('lucide-react', () => ({
  Sun: (props: Record<string, unknown>) => <svg data-testid="sun-icon" {...props} />,
  Moon: (props: Record<string, unknown>) => <svg data-testid="moon-icon" {...props} />,
}))

import { ThemeToggle } from '@/components/ui/theme-toggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('before mount (pre-hydration)', () => {
    it('renders a disabled placeholder Sun button before mounting', () => {
      mockUseTheme.mockReturnValue({ theme: 'light', setTheme: mockSetTheme })

      // renderToStaticMarkup is a server-side render that does NOT run useEffect,
      // so `mounted` stays false — this accurately tests the pre-hydration placeholder.
      const html = renderToStaticMarkup(<ThemeToggle />)

      // The placeholder renders a disabled button with a Sun icon
      expect(html).toContain('disabled')
      expect(html).toContain('data-testid="sun-icon"')
      // No aria-label on the placeholder (it's just a visual spacer)
      expect(html).not.toContain('Switch to')
    })
  })

  describe('light mode (mounted)', () => {
    it('renders a Moon icon in light mode', async () => {
      mockUseTheme.mockReturnValue({ theme: 'light', setTheme: mockSetTheme })
      render(<ThemeToggle />)

      // Flush useEffect so mounted becomes true
      await act(async () => {
        vi.runAllTimers()
      })

      expect(screen.getByTestId('moon-icon')).toBeInTheDocument()
      expect(screen.queryByTestId('sun-icon')).not.toBeInTheDocument()
    })

    it('has aria-label "Switch to dark mode" in light mode', async () => {
      mockUseTheme.mockReturnValue({ theme: 'light', setTheme: mockSetTheme })
      render(<ThemeToggle />)

      await act(async () => {
        vi.runAllTimers()
      })

      expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument()
    })

    it('button is not disabled after mounting in light mode', async () => {
      mockUseTheme.mockReturnValue({ theme: 'light', setTheme: mockSetTheme })
      render(<ThemeToggle />)

      await act(async () => {
        vi.runAllTimers()
      })

      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    it("calls setTheme('dark') when clicked in light mode", async () => {
      mockUseTheme.mockReturnValue({ theme: 'light', setTheme: mockSetTheme })
      render(<ThemeToggle />)

      await act(async () => {
        vi.runAllTimers()
      })

      fireEvent.click(screen.getByRole('button'))
      expect(mockSetTheme).toHaveBeenCalledOnce()
      expect(mockSetTheme).toHaveBeenCalledWith('dark')
    })
  })

  describe('dark mode (mounted)', () => {
    it('renders a Sun icon in dark mode', async () => {
      mockUseTheme.mockReturnValue({ theme: 'dark', setTheme: mockSetTheme })
      render(<ThemeToggle />)

      await act(async () => {
        vi.runAllTimers()
      })

      expect(screen.getByTestId('sun-icon')).toBeInTheDocument()
      expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument()
    })

    it('has aria-label "Switch to light mode" in dark mode', async () => {
      mockUseTheme.mockReturnValue({ theme: 'dark', setTheme: mockSetTheme })
      render(<ThemeToggle />)

      await act(async () => {
        vi.runAllTimers()
      })

      expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument()
    })

    it('button is not disabled after mounting in dark mode', async () => {
      mockUseTheme.mockReturnValue({ theme: 'dark', setTheme: mockSetTheme })
      render(<ThemeToggle />)

      await act(async () => {
        vi.runAllTimers()
      })

      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    it("calls setTheme('light') when clicked in dark mode", async () => {
      mockUseTheme.mockReturnValue({ theme: 'dark', setTheme: mockSetTheme })
      render(<ThemeToggle />)

      await act(async () => {
        vi.runAllTimers()
      })

      fireEvent.click(screen.getByRole('button'))
      expect(mockSetTheme).toHaveBeenCalledOnce()
      expect(mockSetTheme).toHaveBeenCalledWith('light')
    })
  })

  describe('accessibility', () => {
    it('button is accessible with correct aria-label for light mode', async () => {
      mockUseTheme.mockReturnValue({ theme: 'light', setTheme: mockSetTheme })
      render(<ThemeToggle />)

      await act(async () => {
        vi.runAllTimers()
      })

      const button = screen.getByRole('button', { name: 'Switch to dark mode' })
      expect(button).toBeInTheDocument()
      expect(button.tagName).toBe('BUTTON')
    })

    it('button is accessible with correct aria-label for dark mode', async () => {
      mockUseTheme.mockReturnValue({ theme: 'dark', setTheme: mockSetTheme })
      render(<ThemeToggle />)

      await act(async () => {
        vi.runAllTimers()
      })

      const button = screen.getByRole('button', { name: 'Switch to light mode' })
      expect(button).toBeInTheDocument()
      expect(button.tagName).toBe('BUTTON')
    })
  })
})
