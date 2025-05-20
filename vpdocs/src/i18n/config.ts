export const defaultLocale = 'en'
export const supportedLocales = ['en', 'zh'] as const
export type Locale = typeof supportedLocales[number]

// 验证语言是否支持
export const isValidLocale = (locale: string): locale is Locale => {
  return supportedLocales.includes(locale as Locale)
}

// 获取默认内容
export const getDefaultContent = <T>(content: Record<string, T>): T => {
  return content[defaultLocale]
}

// 获取当前语言内容，如果不存在则返回默认内容
export const getCurrentContent = <T>(
  content: Record<string, T>,
  locale: string
): T => {
  return content[locale] || getDefaultContent(content)
}

// 获取当前语言内容，如果不存在则返回默认内容，并确保所有必需的属性都存在
export const getCurrentContentWithFallback = <T extends Record<string, any>>(
  content: Record<string, T>,
  locale: string,
  requiredKeys: (keyof T)[]
): T => {
  const current = getCurrentContent(content, locale)
  const defaultContent = getDefaultContent(content)
  
  // 确保所有必需的属性都存在
  return requiredKeys.reduce((acc, key) => {
    acc[key] = current[key] || defaultContent[key]
    return acc
  }, { ...current })
} 