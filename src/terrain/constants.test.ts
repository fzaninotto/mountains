import { describe, expect, it } from 'vitest';
import { glslConstants } from './constants';

describe('constantes injectées dans le shader', () => {
  it('produisent des déclarations GLSL valides', () => {
    const glsl = glslConstants();
    expect(glsl).toContain('const int MAX_OCTAVES = 20;');
    expect(glsl).toMatch(/const float BIOME_STOPS\[6\] = float\[6\]\(0\.0, 0\.2, 0\.3, 0\.45, 0\.68, 1\.0\);/);
    expect(glsl).not.toMatch(/NaN|undefined/);
  });
});
