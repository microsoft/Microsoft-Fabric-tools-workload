# Markdown Formatting Guidelines

## Purpose

Guidelines for creating and maintaining markdown documentation files across the repository to ensure consistent formatting and linter compliance.

## Code Block Formatting (MD031)

**Rule**: All fenced code blocks MUST be surrounded by blank lines.

### ❌ Incorrect

````markdown
Some text:
```powershell
command here
```
Next section...
````

### ✅ Correct

````markdown
Some text:

```powershell
command here
```

Next section...
````

### Application

- Add blank line **before** opening code fence (\`\`\`)
- Add blank line **after** closing code fence (\`\`\`)
- Applies to ALL code fence types (bash, powershell, json, xml, typescript, etc.)

## Code Language Specification (MD040)

**Rule**: All fenced code blocks MUST have a language specified.

### Examples

```markdown
✅ Correct: ```powershell
✅ Correct: ```bash
✅ Correct: ```json
✅ Correct: ```xml
✅ Correct: ```typescript
❌ Incorrect: ```
```

### Code Language Application

- Always specify the language after opening code fence
- Use appropriate language identifiers: `powershell`, `bash`, `json`, `xml`, `typescript`, `markdown`, `text`
- Even for simple examples, use `text` if no specific language applies

## Blank Lines Around Headings (MD022)

**Rule**: Headings should be surrounded by blank lines.

### ❌ Incorrect: Missing Blank Lines Around Headings

```markdown
Some text here
## Heading
- List item
```

### ✅ Correct: Proper Blank Lines Around Headings

```markdown
Some text here

## Heading

- List item
```

### Headings Application

- Add blank line **before** every heading
- Add blank line **after** every heading
- Exception: First heading in file doesn't need blank line before

## Blank Lines Around Lists (MD032)

**Rule**: Lists should be surrounded by blank lines.

### ❌ Incorrect: Missing Blank Lines Around Lists

```markdown
Some text here
- List item 1
- List item 2
Next paragraph
```

### ✅ Correct: Proper Blank Lines Around Lists

```markdown
Some text here

- List item 1
- List item 2

Next paragraph
```

### Lists Application

- Add blank line **before** list starts
- Add blank line **after** list ends
- Applies to both unordered (`-`) and ordered (`1.`) lists

## Ordered List Numbering (MD029)

**Rule**: Ordered lists should use sequential numbering starting at 1.

### ❌ Incorrect: Non-Sequential Numbering

```markdown
1. First item
2. Second item
5. Third item (should be 3)
6. Fourth item (should be 4)
```

### ✅ Correct: Sequential Numbering

```markdown
1. First item
2. Second item
3. Third item
4. Fourth item
```

### Ordered Lists Application

- Always start at 1
- Increment by 1 for each item
- Don't skip numbers or use custom numbering

## Heading Hierarchy (MD001)

**Rule**: Heading levels should only increment by one level at a time.

### ❌ Incorrect: Skipped Heading Levels

```markdown
## Level 2 heading
##### Level 5 heading (skips 3 and 4)
```

### ✅ Correct: Incremental Heading Levels

```markdown
## Level 2 heading
### Level 3 heading
#### Level 4 heading
```

### Heading Hierarchy Application

- Don't skip heading levels
- Follow logical hierarchy: h1 → h2 → h3 → h4 → h5 → h6
- Can go back to any previous level (e.g., h4 → h2)

## Duplicate Headings (MD024)

**Rule**: Avoid multiple headings with the same exact text.

### Solutions

1. **Add context to heading**: `#### WorkloadManifest.xml` → `#### WorkloadManifest.xml Template`
2. **Change heading level**: If same heading needed at different level, ensure they're in different contexts
3. **Restructure content**: Consider if duplicate headings indicate content that should be reorganized

## Table Formatting (MD060)

**Rule**: Table columns must have proper spacing around pipes.

### ❌ Incorrect: Missing Spaces in Table Separator

```markdown
| Column1 | Column2 | Column3 |
|---------|---------|---------|
```

### ✅ Correct: Proper Table Spacing

```markdown
| Column1 | Column2 | Column3 |
| ------- | ------- | ------- |
```

### Table Formatting Application

- Add space before and after each pipe `|` in separator row
- Ensure consistent spacing in all table rows

## When Creating New Markdown Files

Always follow these formatting rules:

1. Blank lines around all code blocks
2. Consistent heading hierarchy (don't skip levels)
3. Use proper list formatting (blank lines between complex list items)
4. Consistent use of bold/italic/code formatting

## When Editing Existing Markdown Files

If you encounter MD031 violations:

- Add blank lines around code blocks as part of your edits
- Don't make formatting-only commits unless specifically requested
- Batch multiple formatting fixes together when touching a file

## Linter Warnings

Common markdown linter rules to follow:

- **MD001**: Heading levels should only increment by one level at a time
- **MD022**: Headings should be surrounded by blank lines
- **MD024**: Multiple headings with the same content (avoid duplicates)
- **MD029**: Ordered list item prefix (use sequential 1, 2, 3...)
- **MD031**: Fenced code blocks surrounded by blank lines
- **MD032**: Lists should be surrounded by blank lines
- **MD033**: No inline HTML (use markdown syntax instead)
- **MD040**: Fenced code blocks should have a language specified
- **MD041**: First line should be top-level heading
- **MD047**: Files should end with single newline
- **MD060**: Table column style (proper spacing around pipes)

## AI Assistant Guidelines

When creating markdown documentation:

1. Always add blank lines before and after code blocks
2. Always specify language for code blocks (even if just `text`)
3. Add blank lines before and after headings
4. Add blank lines before and after lists
5. Start ordered lists at 1 and increment sequentially
6. Don't skip heading levels (h2 → h3 → h4, not h2 → h5)
7. Avoid duplicate heading text (add context or change level)
8. Use proper table formatting with spaces around pipes
9. Preview formatted output mentally to ensure proper spacing
10. Use consistent code fence language identifiers (powershell, bash, json, etc.)

When using tools to create markdown files, double-check that code blocks have proper spacing in the content parameter.
