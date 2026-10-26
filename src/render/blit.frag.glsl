#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uTexture;
// Portion utilisée de la texture source (l'aperçu n'en occupe qu'un coin)
uniform vec2 uSourceScale;
out vec4 outColor;

void main() {
  // Bornée au centre du dernier texel utilisé, pour ne pas filtrer avec le reste de la texture
  vec2 halfTexel = 0.5 / vec2(textureSize(uTexture, 0));
  outColor = texture(uTexture, min(vUv * uSourceScale, uSourceScale - halfTexel));
}
