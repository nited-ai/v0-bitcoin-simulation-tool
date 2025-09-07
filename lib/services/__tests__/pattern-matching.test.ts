import { describe, it, expect, beforeEach } from 'vitest'
import { PatternMatcher } from '../pattern-matcher'
import type { DetectionPattern, HardcodedString } from '../types/localization'

describe('PatternMatcher', () => {
  let matcher: PatternMatcher

  beforeEach(() => {
    matcher = new PatternMatcher()
  })

  describe('JSX Text Content Detection', () => {
    it('should detect simple JSX text content', () => {
      const content = `
        <div>Simple text</div>
        <span>Another text</span>
      `
      
      const matches = matcher.findMatches(content, 'jsx_text')
      
      expect(matches).toHaveLength(2)
      expect(matches[0].text).toBe('Simple text')
      expect(matches[1].text).toBe('Another text')
    })

    it('should detect nested JSX text content', () => {
      const content = `
        <div>
          <h1>Main Title</h1>
          <p>Paragraph text</p>
          <span>Nested <strong>bold text</strong> here</span>
        </div>
      `
      
      const matches = matcher.findMatches(content, 'jsx_text')
      
      expect(matches.length).toBeGreaterThan(2)
      expect(matches.some(m => m.text === 'Main Title')).toBe(true)
      expect(matches.some(m => m.text === 'Paragraph text')).toBe(true)
    })

    it('should ignore JSX expressions and variables', () => {
      const content = `<p>Actual text content</p>`

      const matches = matcher.findMatches(content, 'jsx_text')

      // Should find "Actual text content"
      expect(matches.length).toBeGreaterThan(0)
      expect(matches[0].text).toBe('Actual text content')

      // Test exclusion separately
      const contentWithExpressions = `
        <div>{variable}</div>
        <span>{t('translation.key')}</span>
      `

      const expressionMatches = matcher.findMatches(contentWithExpressions, 'jsx_text')
      expect(expressionMatches.some(m => m.text.includes('{'))).toBe(false)
    })

    it('should handle multiline JSX text', () => {
      const content = `
        <div>
          This is a long text
          that spans multiple lines
        </div>
      `
      
      const matches = matcher.findMatches(content, 'jsx_text')
      
      expect(matches).toHaveLength(1)
      expect(matches[0].text.trim()).toContain('This is a long text')
    })
  })

  describe('Button Label Detection', () => {
    it('should detect simple button labels', () => {
      const content = `
        <Button>Save</Button>
        <Button variant="outline">Cancel</Button>
      `

      const matches = matcher.findMatches(content, 'button_label')

      // Should find button labels (may also match JSX text pattern)
      expect(matches.length).toBeGreaterThanOrEqual(2)
      expect(matches.some(m => m.text === 'Save')).toBe(true)
      expect(matches.some(m => m.text === 'Cancel')).toBe(true)
    })

    it('should detect button labels with nested elements', () => {
      const content = `
        <Button>
          <Icon className="w-4 h-4" />
          Save Changes
        </Button>
      `
      
      const matches = matcher.findMatches(content, 'button_label')
      
      expect(matches).toHaveLength(1)
      expect(matches[0].text.trim()).toBe('Save Changes')
    })

    it('should handle self-closing buttons', () => {
      const content = `
        <Button onClick={handleClick}>Submit Form</Button>
        <Button disabled={loading}>Processing...</Button>
      `

      const matches = matcher.findMatches(content, 'button_label')

      // Should find button labels (may also match JSX text pattern)
      expect(matches.length).toBeGreaterThanOrEqual(2)
      expect(matches.some(m => m.text === 'Submit Form')).toBe(true)
      expect(matches.some(m => m.text === 'Processing...')).toBe(true)
    })
  })

  describe('Tooltip Content Detection', () => {
    it('should detect simple tooltip content', () => {
      const content = `
        <TooltipContent>
          <p>This is helpful information</p>
        </TooltipContent>
      `
      
      const matches = matcher.findMatches(content, 'tooltip')
      
      expect(matches).toHaveLength(1)
      expect(matches[0].text).toBe('This is helpful information')
    })

    it('should detect tooltip content without paragraph tags', () => {
      const content = `
        <TooltipContent>
          Simple tooltip text
        </TooltipContent>
      `
      
      const matches = matcher.findMatches(content, 'tooltip')
      
      expect(matches).toHaveLength(1)
      expect(matches[0].text.trim()).toBe('Simple tooltip text')
    })

    it('should detect multiple tooltip patterns', () => {
      const content = `
        <Tooltip>
          <TooltipTrigger>Help</TooltipTrigger>
          <TooltipContent>
            <p>Detailed help text</p>
          </TooltipContent>
        </Tooltip>
        <TooltipContent>Another tooltip</TooltipContent>
      `
      
      const matches = matcher.findMatches(content, 'tooltip')
      
      expect(matches.length).toBeGreaterThan(1)
      expect(matches.some(m => m.text === 'Detailed help text')).toBe(true)
    })
  })

  describe('Form Field Detection', () => {
    it('should detect placeholder text', () => {
      const content = `
        <input placeholder="Enter your name" />
        <Input placeholder="Email address" />
      `
      
      const matches = matcher.findMatches(content, 'placeholder')
      
      expect(matches).toHaveLength(2)
      expect(matches[0].text).toBe('Enter your name')
      expect(matches[1].text).toBe('Email address')
    })

    it('should detect label text', () => {
      const content = `
        <Label>First Name</Label>
        <label>Email Address</label>
      `
      
      const matches = matcher.findMatches(content, 'form_label')
      
      expect(matches).toHaveLength(2)
      expect(matches[0].text).toBe('First Name')
      expect(matches[1].text).toBe('Email Address')
    })
  })

  describe('Error Message Detection', () => {
    it('should detect throw statements', () => {
      const content = `
        throw new Error("Invalid input provided")
        throw new Error('Network connection failed')
      `
      
      const matches = matcher.findMatches(content, 'error_message')
      
      expect(matches).toHaveLength(2)
      expect(matches[0].text).toBe('Invalid input provided')
      expect(matches[1].text).toBe('Network connection failed')
    })

    it('should detect validation error messages', () => {
      const content = `
        const errors = {
          required: "This field is required",
          email: "Please enter a valid email"
        }
      `
      
      const matches = matcher.findMatches(content, 'validation_message')
      
      expect(matches).toHaveLength(2)
      expect(matches[0].text).toBe('This field is required')
      expect(matches[1].text).toBe('Please enter a valid email')
    })
  })

  describe('Chart Label Detection', () => {
    it('should detect chart titles and labels', () => {
      const content = `
        const chartConfig = {
          title: "Bitcoin Price Forecast",
          xAxisLabel: "Time",
          yAxisLabel: "Price (USD)"
        }
      `
      
      const matches = matcher.findMatches(content, 'chart_label')
      
      expect(matches).toHaveLength(3)
      expect(matches.some(m => m.text === 'Bitcoin Price Forecast')).toBe(true)
      expect(matches.some(m => m.text === 'Time')).toBe(true)
      expect(matches.some(m => m.text === 'Price (USD)')).toBe(true)
    })
  })

  describe('Pattern Exclusions', () => {
    it('should exclude technical strings', () => {
      const content = `
        console.log("Debug message")
        import { Component } from './component'
        const className = "flex items-center"
        <div>User visible text</div>
      `
      
      const matches = matcher.findMatches(content, 'jsx_text')
      
      expect(matches).toHaveLength(1)
      expect(matches[0].text).toBe('User visible text')
    })

    it('should exclude strings already using translation functions', () => {
      const content = `
        <div>{t('already.translated')}</div>
        <span>{safeT('safe.translation', 'fallback')}</span>
        <p>Not translated text</p>
      `
      
      const matches = matcher.findMatches(content, 'jsx_text')
      
      expect(matches).toHaveLength(1)
      expect(matches[0].text).toBe('Not translated text')
    })

    it('should exclude very short strings', () => {
      const content = `
        <div>A</div>
        <span>OK</span>
        <p>This is long enough</p>
      `
      
      const matches = matcher.findMatches(content, 'jsx_text')
      
      expect(matches).toHaveLength(1)
      expect(matches[0].text).toBe('This is long enough')
    })
  })

  describe('Context Extraction', () => {
    it('should provide context around matches', () => {
      const content = `
        function Component() {
          return (
            <div className="container">
              <h1>Important Title</h1>
            </div>
          )
        }
      `
      
      const matches = matcher.findMatchesWithContext(content, 'jsx_text')
      
      expect(matches).toHaveLength(1)
      expect(matches[0].context).toContain('className="container"')
      expect(matches[0].context).toContain('<h1>')
    })
  })
})
