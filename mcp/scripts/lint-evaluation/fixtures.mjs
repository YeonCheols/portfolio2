export const probes = [
  {
    name: "debugger",
    file: "apps/backend/src/probes/debugger.ts",
    rule: "no-debugger",
    code: "export function inspect() { debugger; return 1; }",
  },
  {
    name: "async-executor",
    file: "apps/backend/src/probes/promise.ts",
    rule: "no-async-promise-executor",
    code: "export const result = new Promise(async (resolve) => resolve(1));",
  },
  {
    name: "unreachable",
    file: "apps/backend/src/probes/unreachable.ts",
    rule: "no-unreachable",
    code: "export function early() { return 1; console.log('never'); }",
  },
  {
    name: "optional-chain",
    file: "apps/backend/src/probes/optional.ts",
    rule: "no-unsafe-optional-chaining",
    code: "export const call = (value?: { run: () => void }) => (value?.run)();",
  },
  {
    name: "type-only-contract",
    file: "packages/admin-contracts/src/probes/types.ts",
    rule: null,
    code: "export interface Shape { value: string } export const identity = (value: Shape): Shape => value;",
  },
  {
    name: "jsx-key",
    file: "apps/console/src/probes/key.tsx",
    rule: "react/jsx-key",
    code: "export const Probe = () => [1, 2].map(item => <li>{item}</li>);",
  },
  {
    name: "conditional-hook",
    file: "apps/console/src/probes/hook.tsx",
    rule: "react-hooks/rules-of-hooks",
    code: "import {useEffect} from 'react'; export function Probe({on}: {on: boolean}) { if (on) useEffect(() => {}, []); return null; }",
  },
  {
    name: "effect-dependency",
    file: "apps/console/src/probes/dependency.tsx",
    rule: "react-hooks/exhaustive-deps",
    code: "import {useEffect} from 'react'; export function Probe({value}: {value: string}) { useEffect(() => {console.log(value)}, []); return null; }",
  },
  {
    name: "aria",
    file: "apps/console/src/probes/aria.tsx",
    rule: "jsx-a11y/role-supports-aria-props",
    code: 'export const Probe = () => <button aria-checked="true">fixture</button>;',
  },
  {
    name: "deprecated-lifecycle",
    file: "apps/console/src/probes/deprecated.tsx",
    rule: "react/no-deprecated",
    code: "import React from 'react'; export class Probe extends React.Component { componentWillMount() {} render() { return null; } }",
  },
  {
    name: "render-return",
    file: "apps/console/src/probes/render.tsx",
    rule: "react/require-render-return",
    code: "import React from 'react'; export class Probe extends React.Component { render() {} }",
  },
  {
    name: "valid-console",
    file: "apps/console/src/probes/valid.tsx",
    rule: null,
    code: 'export const Probe = () => <button type="button">fixture</button>;',
  },
];
