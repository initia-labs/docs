# MDX Authoring Style Guide

## Markdown Inside JSX Components

When writing markdown inside `<Step>`, `<Tab>`, or `<Accordion>`, always place
an empty line before and after block markdown content.

This keeps nested content parsed as block markdown in MDX; without these blank
lines, Prettier can flatten lists, tables, and code blocks into a single line.

Block markdown content includes:

- fenced code blocks
- lists
- tables
- blockquotes
- headings

### Bad

```mdx
<Step title="Example">- item one - item two</Step>
```

````mdx
<Tab title="Example">

```bash
echo hello
```

</Tab>
````

### Good

```mdx
<Step title="Example">

- item one
- item two

</Step>
```

````mdx
<Tab title="Example">

```bash
echo hello
```

</Tab>
````
