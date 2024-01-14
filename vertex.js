const vertexSrc = /*glsl*/`
precision highp float;

attribute vec2 vertexPosition;
attribute vec2 inputTextureCoord;

varying vec2 textureCoord;

uniform mat3 projectionMatrix;

void main() {
    vec2 clipspacePosition = (projectionMatrix * vec3(vertexPosition.xy, 1.0)).xy;
    textureCoord = inputTextureCoord;

    gl_Position = vec4(clipspacePosition, 1.0, 1.0);
}`;