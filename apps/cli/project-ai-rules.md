# Project AI Rules

## Creating files

- When creating a new file, ALWAYS use the `kebab-case` format for the file name.

<example>
    file-name.ts
    file-name.tsx
    file-name.css
    file-name.md
</example>

## React Components

- When creating a new React component, ALWAYS follow the following rules:

<rules>
    - Use named exports for the component.
    - Use PascalCase for the component name.
    - Prefer using existing components and/or hooks when possible, instead of `useState`, `useEffect`, etc.
</rules>

<example>
    file-name.tsx
    export const FileName = () => {
        return <div>File Name</div>;
    };
</example>

## Typescript

- When creating a new Typescript file, ALWAYS follow the following rules:

<rules>
    - Use `type` over `interface` for everything.
</rules>
