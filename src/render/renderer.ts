import vertexSource from './fullscreen.vert.glsl?raw';
import blitSource from './blit.frag.glsl?raw';
import uniformsSource from './uniforms.glsl?raw';
import noiseSource from './noise.glsl?raw';
import climateSource from './climate.glsl?raw';
import rockSource from './rock.glsl?raw';
import heightSource from './height.glsl?raw';
import raymarchSource from './raymarch.glsl?raw';
import atmosphereSource from './atmosphere.glsl?raw';
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
  atmosphereSource,
  shadingSource,
  mainSource,
].join('\n');

const TERRAIN_UNIFORMS = [
  'uResolution', 'uCamY', 'uCamRot', 'uFocal', 'uJitter', 'uSunVisible', 'uSunShadow',
  'uSunDir', 'uScale', 'uBiomeScale', 'uMountainBias', 'uDesertBias', 'uDetail', 'uStep', 'uWater', 'uVegetation',
  'uSnow', 'uFog', 'uExposure', 'uPreview', 'uLodHeight', 'uBiomes', 'uMaxH',
  'uOctFrac', 'uOctCell', 'uFieldFrac', 'uFieldCell', 'uRockFrac', 'uRockCell', 'uRockRot', 'uDuneScale',
] as const;

/** Nombre de rendus moyennés pour lisser une image nette (le premier sans décalage). */
export const SMOOTHING_PASSES = 6;

/** Décalage sous-pixel (px) du rendu n° pass : aucun pour le premier, puis suite de Halton (2, 3) centrée. */
export function subpixelJitter(pass: number): [number, number] {
  return pass === 0 ? [0, 0] : [halton(pass, 2) - 0.5, halton(pass, 3) - 0.5];
}

function halton(index: number, base: number): number {
  let result = 0;
  for (let f = 1 / base, i = index; i > 0; i = Math.floor(i / base), f /= base) result += f * (i % base);
  return result;
}

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
  private fence: WebGLSync | null = null;
  private submittedAt = 0;
  /** Durée du dernier travail GPU terminé (ms), voir gpuIdle(). */
  lastGpuTime = 0;

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
   * preview : aperçu allégé pendant les déplacements (ombres et reflets réduits).
   * lodHeight : hauteur d'image (px) qui fixe le niveau de détail du relief, la hauteur rendue par défaut. Elle
   * reste fixe en mouvement et entre les niveaux d'affinage, pour que la forme du relief ne change pas avec la
   * résolution de calcul.
   * jitter : décalage sous-pixel (px) des passes de lissage.
   */
  renderRows(
    target: Target,
    view: View,
    y0: number,
    y1: number,
    width = target.width,
    height = target.height,
    preview = false,
    lodHeight = height,
    jitter: readonly [number, number] = [0, 0],
  ) {
    const gl = this.gl;
    gl.useProgram(this.terrainProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, width, height);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, y0, width, y1 - y0);
    this.setTerrainUniforms(view, width, height);
    gl.uniform1f(this.uniforms.uPreview, preview ? 1 : 0);
    gl.uniform1f(this.uniforms.uLodHeight, lodHeight);
    gl.uniform2f(this.uniforms.uJitter, jitter[0], jitter[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.SCISSOR_TEST);
  }

  /**
   * Copie une cible vers une autre avec mise à l'échelle, ou vers l'écran si `destination` est null.
   * sourceWidth × sourceHeight : portion utilisée de la source.
   * weight : part de la source mélangée à la destination (moyenne progressive des passes de lissage).
   */
  copy(
    source: Target,
    destination: Target | null,
    sourceWidth = source.width,
    sourceHeight = source.height,
    weight = 1,
  ) {
    const gl = this.gl;
    if (weight < 1) {
      gl.enable(gl.BLEND);
      gl.blendColor(0, 0, 0, weight);
      gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);
    }
    gl.useProgram(this.blitProgram);
    gl.uniform2f(this.sourceScale, sourceWidth / source.width, sourceHeight / source.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, destination?.framebuffer ?? null);
    gl.viewport(0, 0, destination?.width ?? gl.drawingBufferWidth, destination?.height ?? gl.drawingBufferHeight);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.BLEND);
  }

  /**
   * Marque la fin du travail soumis pour cette frame. gpuIdle() dira quand le GPU l'aura terminé.
   */
  markSubmitted() {
    const gl = this.gl;
    if (this.fence) gl.deleteSync(this.fence);
    this.fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    this.submittedAt = performance.now();
    gl.flush();
  }

  /**
   * true si le GPU a terminé le travail marqué par markSubmitted() ; ne bloque jamais.
   * lastGpuTime donne alors sa durée approximative (ms, à une frame près).
   */
  gpuIdle(): boolean {
    if (!this.fence) return true;
    const gl = this.gl;
    if (gl.getSyncParameter(this.fence, gl.SYNC_STATUS) !== gl.SIGNALED) return false;
    gl.deleteSync(this.fence);
    this.fence = null;
    this.lastGpuTime = performance.now() - this.submittedAt;
    return true;
  }

  /**
   * Attend la fin du rendu dans `target` (mesures de performance). gl.finish() n'attend pas réellement dans les
   * navigateurs : lire un pixel, si.
   */
  finish(target: Target) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  }

  /** Lit les pixels RGBA d'une cible (comparaison d'images). */
  readPixels(target: Target): Uint8Array {
    const gl = this.gl;
    const pixels = new Uint8Array(target.width * target.height * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.readPixels(0, 0, target.width, target.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels;
  }

  private setTerrainUniforms(view: View, width: number, height: number) {
    const gl = this.gl;
    const u = this.uniforms;

    // Caméra
    gl.uniform2f(u.uResolution, width, height);
    gl.uniform1f(u.uCamY, view.camY);
    gl.uniformMatrix3fv(u.uCamRot, false, view.rotation);
    gl.uniform1f(u.uFocal, view.focal);
    gl.uniform1f(u.uSunVisible, view.sunVisible);
    gl.uniform2fv(u.uSunShadow, view.sunShadow);

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
