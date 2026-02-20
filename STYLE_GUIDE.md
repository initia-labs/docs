# Documentation Style Guide (MDX)

This guide establishes the formatting and structural standards for the documentation repository. These rules are designed to ensure consistent rendering across various MDX/Markdown parsers and maintain high readability for both users and AI assistants.

## 1. Line Length and Wrapping

- **Standard**: Limit lines of prose to **80 characters**.
- **Prose Wrapping**: Always wrap text to a new line once it exceeds the 80-character limit. This ensures the raw files are readable in standard terminal widths and split-view editors.
- **Exception**: Long URLs or specific code strings that cannot be broken may exceed this limit, but should be kept to a minimum.

## 2. Code Blocks

- **Always Multi-line**: Never place code on the same line as the opening triple backticks (```).
- **Structure**:
  - The opening line should only contain the language identifier (e.g., `bash`, `ts`, `json`) and optional metadata/titles.
  - The code itself must start on the following line.
- **Backtick Syntax**: Always use exactly three backticks (```) for code blocks. Avoid quadruple backticks.

## 3. Indentation

- **Standard**: Use **2 spaces** for all indentation levels.
- **Nested Components**: 
  - Content inside components like `<Tabs>`, `<Steps>`, or `<AccordionGroup>` must be indented by exactly 2 spaces.
  - Nested tags (e.g., `<Tab>` inside `<Tabs>`) should align with their content's indentation.
- **Closing Tags**: Closing tags (e.g., `</Tab>`, `</Steps>`) must be flush with their corresponding opening tags.

## 4. Component Spacing

- **Blank Lines**: Maintain exactly one blank line before and after Markdown content nested within JSX tags to ensure correct parsing.
- **Clarity**: Use blank lines to separate distinct logical blocks within a component (e.g., between two different code examples in a single `<Tab>`).

## 5. Visual Hierarchy

- Maintain a clear visual nesting in the raw source file. A developer should be able to understand the component hierarchy simply by looking at the indentation of the `.mdx` file.
