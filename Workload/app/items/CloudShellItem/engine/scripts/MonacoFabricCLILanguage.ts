/**
 * Fabric CLI language definition for Monaco Editor
 * Provides syntax highlighting and auto-completion for .fab files
 */

// All Fabric CLI commands (without 'fab' prefix)
const FABRIC_CLI_COMMANDS = [
  // File System Operations
  'assign', 'cd', 'cp', 'copy', 'export', 'exists', 'get', 'import',
  'ln', 'mklink', 'ls', 'dir', 'mkdir', 'create', 'mv', 'move',
  'open', 'pwd', 'rm', 'del', 'set', 'start', 'stop', 'unassign',
  
  // Command Groups
  'acls', 'api', 'auth', 'config', 'table', 'job', 'jobs', 'label', 'desc'
];

// Resource types (with dot prefix)
const RESOURCE_TYPES = [
  'Workspace', 'Notebook', 'Lakehouse', 'Warehouse', 'Report', 'Dashboard',
  'SemanticModel', 'KQLDatabase', 'KQLQueryset', 'Dataflow', 'DataPipeline',
  'MLModel', 'MLExperiment', 'SparkJobDefinition', 'Environment', 'Eventstream',
  'Files', 'Tables'
];

/**
 * Register the Fabric CLI language with Monaco Editor
 * @param monaco - The Monaco editor instance from beforeMount
 * @param scriptParameters - Optional array of script parameter names for autocomplete
 */
export function registerFabricCLILanguage(monaco: any, scriptParameters?: string[]) {
  // Register the language
  monaco.languages.register({ id: 'fabriccli' });

  // Set language configuration
  monaco.languages.setLanguageConfiguration('fabriccli', {
    comments: {
      lineComment: '#'
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    // Include special characters in word pattern for variables
    wordPattern: /[%$]?[a-zA-Z_][a-zA-Z0-9_]*%?|--?[a-z_][a-z0-9_-]*/
  });

  // Build regex patterns
  const commandsPattern = FABRIC_CLI_COMMANDS.join('|');
  const resourceTypesPattern = RESOURCE_TYPES.join('|');

  // Set monarch tokenizer for syntax highlighting
  monaco.languages.setMonarchTokensProvider('fabriccli', {
    tokenizer: {
      root: [
        // Comments (lines starting with #)
        [/^\s*#.*$/, 'comment'],
        
        // Commands at the beginning of a line (or after whitespace)
        [new RegExp('^\\s*(' + commandsPattern + ')\\b'), 'keyword'],
        
        // Resource types (with dot prefix)
        [new RegExp('\\.(' + resourceTypesPattern + ')\\b'), 'type'],
        
        // Variables (starting with % or $) - user-defined script parameters
        [/[%$][a-zA-Z_][a-zA-Z0-9_]*%?/, 'constant'],
        
        // CLI parameters (starting with - or --) - command line flags
        [/--?[a-z_][a-z0-9_-]*/, 'variable'],
        
        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-terminated string
        [/'([^'\\]|\\.)*$/, 'string.invalid'],  // non-terminated string
        [/"/, { token: 'string.quote', bracket: '@open', next: '@string_double' }],
        [/'/, { token: 'string.quote', bracket: '@open', next: '@string_single' }],
        
        // Numbers
        [/\d+/, 'number'],
        
        // Operators
        [/[|&><]/, 'operator'],
        
        // Delimiters
        [/[;,.]/, 'delimiter'],
        [/[{}()\[\]]/, 'delimiter.bracket'],
      ],
      
      string_double: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
      ],
      
      string_single: [
        [/[^\\']+/, 'string'],
        [/\\./, 'string.escape'],
        [/'/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
      ]
    }
  });

  // Register auto-completion provider
  monaco.languages.registerCompletionItemProvider('fabriccli', {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const lineContent = model.getLineContent(position.lineNumber).trim();
      const isStartOfLine = position.column <= lineContent.search(/\S/) + 1;

      const suggestions: any[] = [];

      // Suggest commands at the start of a line
      if (isStartOfLine || lineContent.length === 0) {
        FABRIC_CLI_COMMANDS.forEach(cmd => {
          suggestions.push({
            label: cmd,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: cmd + ' ',
            range: range,
            documentation: `Fabric CLI command: ${cmd}`
          });
        });
      }

      // Suggest resource types (with dot prefix)
      if (word.word.startsWith('.') || lineContent.includes('.')) {
        RESOURCE_TYPES.forEach(type => {
          suggestions.push({
            label: '.' + type,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: '.' + type,
            range: range,
            documentation: `Resource type: ${type}`
          });
        });
      }

      // Suggest variables (starting with % or $) from script parameters
      // Match pattern: /[%$][a-zA-Z_][a-zA-Z0-9_]*%?/
      const currentChar = position.column > 1 ? model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: position.column - 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      }) : '';
      
      if (word.word.startsWith('%') || word.word.startsWith('$') || currentChar === '%' || currentChar === '$') {
        // Determine the prefix (% or $)
        let prefix = '';
        if (word.word.startsWith('%') || word.word.startsWith('$')) {
          prefix = word.word[0];
        } else if (currentChar === '%' || currentChar === '$') {
          prefix = currentChar;
        }
        
        if (scriptParameters && scriptParameters.length > 0) {
          scriptParameters.forEach(param => {
            // Support both %param and %param% patterns
            suggestions.push({
              label: prefix + param,
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: prefix + param,
              range: range,
              documentation: `Script parameter: ${param}`
            });
            suggestions.push({
              label: prefix + param + '%',
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: prefix + param + '%',
              range: range,
              documentation: `Script parameter: ${param} (Windows-style)`
            });
          });
        }
      }

      return { suggestions };
    }
  });
}
