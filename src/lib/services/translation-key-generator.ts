import type { DetectionType } from './types/localization'

export interface KeyGeneratorConfig {
  separator?: string
  caseStyle?: 'camelCase' | 'snake_case' | 'kebab-case'
  typeSuffixes?: Partial<Record<DetectionType, string>>
  maxKeyLength?: number
  preventDuplicates?: boolean
}

export interface StringInput {
  filePath: string
  text: string
  type: DetectionType
}

/**
 * Advanced translation key generator with configurable naming conventions
 */
export class TranslationKeyGenerator {
  private config: Required<KeyGeneratorConfig>
  private generatedKeys: Set<string> = new Set()

  constructor(config: Partial<KeyGeneratorConfig> = {}) {
    this.config = {
      separator: '.',
      caseStyle: 'camelCase',
      typeSuffixes: this.getDefaultTypeSuffixes(),
      maxKeyLength: 100,
      preventDuplicates: true,
      ...config
    }
  }

  /**
   * Extract component name from file path
   */
  extractComponentName(filePath: string): string {
    const fileName = filePath.split('/').pop() || ''
    const nameWithoutExtension = fileName.replace(/\.(tsx?|jsx?)$/, '')
    
    if (this.config.caseStyle === 'snake_case') {
      return this.toSnakeCase(nameWithoutExtension)
    } else if (this.config.caseStyle === 'kebab-case') {
      return this.toKebabCase(nameWithoutExtension)
    }
    
    return nameWithoutExtension
  }

  /**
   * Convert text to appropriate key format
   */
  textToKey(text: string): string {
    if (!text || !text.trim()) {
      return 'text'
    }

    // Clean the text
    const cleaned = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()

    if (!cleaned) {
      return 'text'
    }

    const words = cleaned.split(' ').filter(word => word.length > 0)
    
    if (words.length === 0) {
      return 'text'
    }

    switch (this.config.caseStyle) {
      case 'snake_case':
        return words.join('_')
      case 'kebab-case':
        return words.join('-')
      case 'camelCase':
      default:
        return words
          .map((word, index) => 
            index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
          )
          .join('')
    }
  }

  /**
   * Get type suffix for detection type
   */
  getTypeSuffix(type: DetectionType): string {
    return this.config.typeSuffixes[type] || 'text'
  }

  /**
   * Generate complete translation key
   */
  generateKey(filePath: string, text: string, type: DetectionType): string {
    const componentName = this.extractComponentName(filePath)
    const elementKey = this.textToKey(text)
    const typeSuffix = this.getTypeSuffix(type)

    let baseKey = [componentName, elementKey, typeSuffix].join(this.config.separator)

    // Handle duplicates if prevention is enabled
    if (this.config.preventDuplicates) {
      let finalKey = baseKey
      let counter = 1

      while (this.generatedKeys.has(finalKey)) {
        finalKey = `${baseKey}${this.config.separator}${counter}`
        counter++
      }

      this.generatedKeys.add(finalKey)
      baseKey = finalKey
    }

    // Truncate if too long
    if (baseKey.length > this.config.maxKeyLength) {
      const hash = this.generateHash(text)
      const maxBaseLength = this.config.maxKeyLength - hash.length - 1
      baseKey = baseKey.substring(0, maxBaseLength) + this.config.separator + hash
    }

    return baseKey
  }

  /**
   * Generate keys for multiple strings
   */
  generateBatchKeys(strings: StringInput[]): string[] {
    return strings.map(({ filePath, text, type }) => 
      this.generateKey(filePath, text, type)
    )
  }

  /**
   * Validate key format
   */
  isValidKey(key: string): boolean {
    const parts = key.split(this.config.separator)
    
    // Must have at least 3 parts: component.element.type
    if (parts.length < 3) return false
    
    // No empty parts
    if (parts.some(part => !part.trim())) return false
    
    // Valid characters only
    const validPattern = this.config.caseStyle === 'snake_case' 
      ? /^[a-zA-Z0-9_]+$/
      : this.config.caseStyle === 'kebab-case'
      ? /^[a-zA-Z0-9-]+$/
      : /^[a-zA-Z0-9]+$/

    return parts.every(part => validPattern.test(part))
  }

  /**
   * Find duplicate keys in a list
   */
  findKeyConflicts(keys: string[]): string[] {
    const seen = new Set<string>()
    const duplicates = new Set<string>()

    for (const key of keys) {
      if (seen.has(key)) {
        duplicates.add(key)
      } else {
        seen.add(key)
      }
    }

    return Array.from(duplicates)
  }

  /**
   * Reset generated keys cache
   */
  reset(): void {
    this.generatedKeys.clear()
  }

  /**
   * Get statistics about generated keys
   */
  getStats(): {
    totalGenerated: number
    byComponent: Record<string, number>
    byType: Record<string, number>
  } {
    const stats = {
      totalGenerated: this.generatedKeys.size,
      byComponent: {} as Record<string, number>,
      byType: {} as Record<string, number>
    }

    for (const key of this.generatedKeys) {
      const parts = key.split(this.config.separator)
      if (parts.length >= 3) {
        const component = parts[0]
        const type = parts[parts.length - 1]

        stats.byComponent[component] = (stats.byComponent[component] || 0) + 1
        stats.byType[type] = (stats.byType[type] || 0) + 1
      }
    }

    return stats
  }

  private getDefaultTypeSuffixes(): Record<DetectionType, string> {
    return {
      jsx_text: 'text',
      button_label: 'button',
      tooltip: 'tooltip',
      placeholder: 'placeholder',
      error_message: 'error',
      validation_message: 'validation',
      chart_label: 'label',
      alert_message: 'alert',
      modal_content: 'modal',
      form_label: 'label'
    }
  }

  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
  }

  private toKebabCase(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
  }

  private generateHash(text: string): string {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substr(0, 4)
  }
}
