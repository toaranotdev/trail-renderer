const fragmentSrc = /*glsl*/`
precision mediump float;

varying vec2 textureCoord;
uniform sampler2D texture;

void main() {
    gl_FragColor = texture2D(texture, textureCoord);
}
`;