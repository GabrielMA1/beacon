/**
 * Restrained syntax theme for code samples on dark sections:
 * warm greys with a single warm tone for strings.
 */
export const codeTheme = {
  name: 'gabnode-night',
  type: 'dark' as const,
  colors: {
    'editor.background': '#1f1f1d',
    'editor.foreground': '#d9d6cd',
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#8c897f', fontStyle: 'italic' } },
    { scope: ['string', 'string.quoted', 'string.template'], settings: { foreground: '#ecd9b8' } },
    { scope: ['constant.numeric', 'constant.language'], settings: { foreground: '#ecd9b8' } },
    {
      scope: ['keyword', 'storage', 'storage.type', 'keyword.control', 'keyword.operator.new', 'keyword.control.import'],
      settings: { foreground: '#a3a097' },
    },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: '#f4f2ec' } },
    { scope: ['variable.parameter', 'variable.other.property', 'meta.object-literal.key', 'support.type.property-name'], settings: { foreground: '#c9c5ba' } },
    { scope: ['punctuation', 'meta.brace', 'keyword.operator'], settings: { foreground: '#8c897f' } },
    { scope: ['variable.other.normal.shell', 'variable.other.readwrite', 'punctuation.definition.variable.shell'], settings: { foreground: '#f4f2ec' } },
  ],
};
