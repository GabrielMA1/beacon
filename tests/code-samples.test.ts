import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { codeSamples } from '../src/data/code-samples';

const samples = codeSamples('claude-sonnet-5-5');
const has = (cmd: string) => {
  try {
    execFileSync(cmd, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

describe('code samples', () => {
  it('use the documented base URL, a bearer key and an obvious placeholder', () => {
    for (const s of samples) {
      expect(s.code).toContain('https://api.gabnode.com/v1');
      expect(s.code).toContain('YOUR_API_KEY');
      expect(s.code).toContain('claude-sonnet-5-5');
      expect(s.code).not.toMatch(/sk-[A-Za-z0-9]{8,}/);
    }
    expect(samples.find((s) => s.id === 'curl')!.code).toContain('Authorization: Bearer $GABNODE_API_KEY');
  });

  it('the TypeScript sample compiles without syntax errors', () => {
    const ts_ = samples.find((s) => s.lang === 'ts')!;
    const out = ts.transpileModule(ts_.code, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
    expect(out.diagnostics ?? []).toEqual([]);
  });

  it.runIf(has('python3'))('the Python sample parses', () => {
    const py = samples.find((s) => s.lang === 'python')!;
    execFileSync('python3', ['-c', 'import ast,sys; ast.parse(sys.stdin.read())'], { input: py.code });
  });

  it.runIf(has('bash'))('the cURL sample is valid shell', () => {
    const sh = samples.find((s) => s.lang === 'bash')!;
    execFileSync('bash', ['-n'], { input: sh.code });
  });

  it('the JSON body inside the cURL sample is valid', () => {
    const sh = samples.find((s) => s.lang === 'bash')!.code;
    const body = sh.slice(sh.indexOf("-d '") + 4, sh.lastIndexOf("'"));
    expect(() => JSON.parse(body)).not.toThrow();
  });
});
