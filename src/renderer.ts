import vertexSource from './fullscreen.vert.glsl?raw';
import terrainSource from './terrain.frag.glsl?raw';
import blitSource from './blit.frag.glsl?raw';
import { biomes, maxTerrainHeight, mountainBias, params, sunDirection } from './params';
import type { View } from './camera';

export interface Target {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
}

const TERRAIN_UNIFORMS = [
  'uResolution', 'uCamY', 'uCamRot', 'uFocal', 'uSunDir', 'uScale', 'uBiomes', 'uBiomeScale', 'uMountainBias',
  'uMaxH', 'uDetail', 'uStep', 'uWater', 'uVegetation', 'uSnow', 'uFog', 'uExposure', 'uOctFrac', 'uOctCell',
  'uMatFrac', 'uMatCell', 'uBiomeFrac', 'uBiomeCell',
] as const;

type TerrainUniforms = Record<(typeof TERRAIN_UNIFORMS)[number], WebGLUniformLocation | null>;

export class Renderer {
  readonly maxSize: number;
  private readonly gl: WebGL2RenderingContext;
  private readonly terrainProgram: WebGLProgram;
  private readonly blitProgram: WebGLProgram;
  private readonly uniforms: TerrainUniforms;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: false, depth: false });
    if (!gl) throw new Error('WebGL2 non disponible');
    this.gl = gl;
    this.maxSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0]);
    this.terrainProgram = this.createProgram(terrainSource);
    this.blitProgram = this.createProgram(blitSource);
    this.uniforms = Object.fromEntries(
      TERRAIN_UNIFORMS.map((name) => [name, gl.getUniformLocation(this.terrainProgram, name)]),
    ) as TerrainUniforms;
    gl.bindVertexArray(gl.createVertexArray());
  }

  ensureTarget(target: Target | null, width: number, height: number): Target {
    if (target && target.width === width && target.height === height) return target;
    const gl = this.gl;
    if (target) {
      gl.deleteTexture(target.texture);
      gl.deleteFramebuffer(target.framebuffer);
    }
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return { texture, framebuffer, width, height };
  }

  // Ne calcule que les lignes [y0, y1[ : permet d'étaler une image nette sur plusieurs frames
  renderRows(target: Target, view: View, y0: number, y1: number) {
    const gl = this.gl;
    const u = this.uniforms;
    gl.useProgram(this.terrainProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, target.width, target.height);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, y0, target.width, y1 - y0);

    gl.uniform2f(u.uResolution, target.width, target.height);
    gl.uniform1f(u.uCamY, view.camY);
    gl.uniformMatrix3fv(u.uCamRot, false, view.rotation);
    gl.uniform1f(u.uFocal, view.focal);
    gl.uniform3fv(u.uSunDir, sunDirection());
    gl.uniform1f(u.uScale, params.scale);
    gl.uniform3fv(u.uBiomes, biomes().flatMap((b) => [b.base, b.amplitude, b.gain]));
    gl.uniform1f(u.uBiomeScale, params.biomeScale);
    gl.uniform1f(u.uMountainBias, mountainBias());
    gl.uniform1f(u.uMaxH, maxTerrainHeight());
    gl.uniform1f(u.uDetail, params.detail);
    gl.uniform1f(u.uStep, params.step);
    gl.uniform1f(u.uWater, params.water);
    gl.uniform1f(u.uVegetation, params.vegetation);
    gl.uniform1f(u.uSnow, params.snow);
    gl.uniform1f(u.uFog, params.fog * 1e-4);
    gl.uniform1f(u.uExposure, params.exposure);
    gl.uniform2fv(u.uOctFrac, view.octaves.frac);
    gl.uniform2uiv(u.uOctCell, view.octaves.cell);
    gl.uniform2fv(u.uMatFrac, view.material.frac);
    gl.uniform2uiv(u.uMatCell, view.material.cell);
    gl.uniform2fv(u.uBiomeFrac, view.biome.frac);
    gl.uniform2uiv(u.uBiomeCell, view.biome.cell);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.SCISSOR_TEST);
  }

  // Copie une cible vers une autre (avec mise à l'échelle), ou vers l'écran si destination est null
  copy(source: Target, destination: Target | null) {
    const gl = this.gl;
    gl.useProgram(this.blitProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, destination?.framebuffer ?? null);
    gl.viewport(0, 0, destination?.width ?? gl.drawingBufferWidth, destination?.height ?? gl.drawingBufferHeight);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private createProgram(fragmentSource: string): WebGLProgram {
    const gl = this.gl;
    const program = gl.createProgram();
    gl.attachShader(program, this.compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, this.compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link');
    return program;
  }

  private compile(type: GLenum, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('createShader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'compile');
    return shader;
  }
}
