import vertexSource from './fullscreen.vert.glsl?raw';
import blitSource from './blit.frag.glsl?raw';
import uniformsSource from './uniforms.glsl?raw';
import noiseSource from './noise.glsl?raw';
import climateSource from './climate.glsl?raw';
import rockSource from './rock.glsl?raw';
import heightSource from './height.glsl?raw';
import raymarchSource from './raymarch.glsl?raw';
import shadingSource from './shading.glsl?raw';
import mainSource from './terrain.frag.glsl?raw';
import { params, sunDirection } from '../params';
import type { View } from '../camera';
import { glslConstants } from '../terrain/constants';
import { biomes, desertBias, maxTerrainHeight, mountainBias } from '../terrain/biomes';
import { duneScales } from '../terrain/dunes';

/** Image intermédiaire : texture et framebuffer qui la cible. */
export interface Target {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
}

// Le shader de terrain est assemblé à partir de modules, précédés des constantes partagées avec le CPU
const TERRAIN_SOURCE = [
  '#version 300 es',
  'precision highp float;',
  'precision highp int;',
  glslConstants(),
  uniformsSource,
  noiseSource,
  climateSource,
  rockSource,
  heightSource,
  raymarchSource,
  shadingSource,
  mainSource,
].join('\n');

const TERRAIN_UNIFORMS = [
  'uResolution', 'uCamY', 'uCamRot', 'uFocal',
  'uSunDir', 'uScale', 'uBiomeScale', 'uMountainBias', 'uDesertBias', 'uDetail', 'uStep', 'uWater', 'uVegetation',
  'uSnow', 'uFog', 'uExposure', 'uBiomes', 'uMaxH',
  'uOctFrac', 'uOctCell', 'uFieldFrac', 'uFieldCell', 'uRockFrac', 'uRockCell', 'uRockRot', 'uDuneScale',
] as const;

type TerrainUniforms = Record<(typeof TERRAIN_UNIFORMS)[number], WebGLUniformLocation | null>;

/**
 * Rendu WebGL2 : le terrain est calculé entièrement dans un shader plein écran (raymarching), dans des cibles
 * intermédiaires ensuite copiées à l'écran avec mise à l'échelle.
 */
export class Renderer {
  /** Taille maximale d'une cible, pour l'export. */
  readonly maxSize: number;
  private readonly gl: WebGL2RenderingContext;
  private readonly terrainProgram: WebGLProgram;
  private readonly uniforms: TerrainUniforms;
  private readonly blitProgram: WebGLProgram;
  private readonly sourceScale: WebGLUniformLocation | null;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: false, depth: false });
    if (!gl) throw new Error('WebGL2 non disponible');
    this.gl = gl;
    this.maxSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0]);
    this.terrainProgram = this.createProgram(TERRAIN_SOURCE);
    this.uniforms = Object.fromEntries(
      TERRAIN_UNIFORMS.map((name) => [name, gl.getUniformLocation(this.terrainProgram, name)]),
    ) as TerrainUniforms;
    this.blitProgram = this.createProgram(blitSource);
    this.sourceScale = gl.getUniformLocation(this.blitProgram, 'uSourceScale');
    // Le triangle plein écran est généré par gl_VertexID : aucun tampon, mais WebGL2 exige un VAO lié
    gl.bindVertexArray(gl.createVertexArray());
  }

  /** Renvoie une cible de la taille demandée, en réutilisant `target` si elle convient déjà. */
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

  /**
   * Calcule les lignes [y0, y1[ de l'image : une image nette peut ainsi être étalée sur plusieurs frames.
   * width × height : portion utilisée de la cible (coin inférieur gauche), toute la cible par défaut.
   */
  renderRows(target: Target, view: View, y0: number, y1: number, width = target.width, height = target.height) {
    const gl = this.gl;
    gl.useProgram(this.terrainProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, width, height);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, y0, width, y1 - y0);
    this.setTerrainUniforms(view, width, height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.SCISSOR_TEST);
  }

  /**
   * Copie une cible vers une autre avec mise à l'échelle, ou vers l'écran si `destination` est null.
   * sourceWidth × sourceHeight : portion utilisée de la source.
   */
  copy(source: Target, destination: Target | null, sourceWidth = source.width, sourceHeight = source.height) {
    const gl = this.gl;
    gl.useProgram(this.blitProgram);
    gl.uniform2f(this.sourceScale, sourceWidth / source.width, sourceHeight / source.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, destination?.framebuffer ?? null);
    gl.viewport(0, 0, destination?.width ?? gl.drawingBufferWidth, destination?.height ?? gl.drawingBufferHeight);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private setTerrainUniforms(view: View, width: number, height: number) {
    const gl = this.gl;
    const u = this.uniforms;

    // Caméra
    gl.uniform2f(u.uResolution, width, height);
    gl.uniform1f(u.uCamY, view.camY);
    gl.uniformMatrix3fv(u.uCamRot, false, view.rotation);
    gl.uniform1f(u.uFocal, view.focal);

    // Réglages
    gl.uniform3fv(u.uSunDir, sunDirection());
    gl.uniform1f(u.uScale, params.scale);
    gl.uniform1f(u.uBiomeScale, params.biomeScale);
    gl.uniform1f(u.uMountainBias, mountainBias());
    gl.uniform1f(u.uDesertBias, desertBias());
    gl.uniform1f(u.uDetail, params.detail);
    gl.uniform1f(u.uStep, params.step);
    gl.uniform1f(u.uWater, params.water);
    gl.uniform1f(u.uVegetation, params.vegetation);
    gl.uniform1f(u.uSnow, params.snow);
    gl.uniform1f(u.uFog, params.fog * 1e-4);
    gl.uniform1f(u.uExposure, params.exposure);
    gl.uniform3fv(u.uBiomes, biomes().flatMap((b) => [b.base, b.amplitude, b.gain]));
    gl.uniform1f(u.uMaxH, maxTerrainHeight());

    // Origines des bruits à la position de la caméra
    gl.uniform2fv(u.uOctFrac, view.octaves.frac);
    gl.uniform2uiv(u.uOctCell, view.octaves.cell);
    gl.uniform2fv(u.uFieldFrac, view.fields.frac);
    gl.uniform2uiv(u.uFieldCell, view.fields.cell);
    gl.uniform3fv(u.uRockFrac, view.rock.frac);
    gl.uniform3uiv(u.uRockCell, view.rock.cell);
    gl.uniformMatrix3fv(u.uRockRot, false, view.rock.rotation);
    gl.uniform2uiv(u.uDuneScale, duneScales());
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
