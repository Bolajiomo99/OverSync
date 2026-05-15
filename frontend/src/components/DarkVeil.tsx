import { useEffect, useRef } from 'react';
import { Mesh, Program, Renderer, Triangle, Vec2 } from 'ogl';

const vertex = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `
#ifdef GL_ES
precision lowp float;
#endif

uniform vec2 uResolution;
uniform float uTime;
uniform float uHueShift;
uniform float uNoise;
uniform float uScan;
uniform float uScanFreq;
uniform float uWarp;

vec4 buf[8];

float rand(vec2 c) {
  return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453);
}

mat3 rgb2yiq = mat3(0.299, 0.587, 0.114, 0.596, -0.274, -0.322, 0.211, -0.523, 0.312);
mat3 yiq2rgb = mat3(1.0, 0.956, 0.621, 1.0, -0.272, -0.647, 1.0, -1.106, 1.703);

vec3 hueShiftRGB(vec3 col, float deg) {
  vec3 yiq = rgb2yiq * col;
  float rad = radians(deg);
  float cosh = cos(rad);
  float sinh = sin(rad);
  vec3 yiqShift = vec3(yiq.x, yiq.y * cosh - yiq.z * sinh, yiq.y * sinh + yiq.z * cosh);
  return clamp(yiq2rgb * yiqShift, 0.0, 1.0);
}

vec4 sigmoid(vec4 x) {
  return 1.0 / (1.0 + exp(-x));
}

vec4 cppn_fn(vec2 coordinate, float in0, float in1, float in2) {
  buf[6] = vec4(coordinate.x, coordinate.y, 0.3948333106474662 + in0, 0.36 + in1);
  buf[7] = vec4(0.14, 0.18, 0.28, 1.0);
  buf[0] = sigmoid(buf[6]);
  return vec4(buf[0].x, buf[0].y, buf[0].z, 1.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / uResolution.xy * 2.0 - 1.0;
  uv.y *= -1.0;
  uv += uWarp * vec2(sin(uv.y * 6.283 + uTime * 0.5), cos(uv.x * 6.283 + uTime * 0.5)) * 0.05;
  fragColor = cppn_fn(uv, 0.1 * sin(0.3 * uTime), 0.1 * sin(0.69 * uTime), 0.1 * sin(0.44 * uTime));
}

void main() {
  vec4 col;
  mainImage(col, gl_FragCoord.xy);
  col.rgb = hueShiftRGB(col.rgb, uHueShift);

  float scanlineVal = sin(gl_FragCoord.y * uScanFreq) * 0.5 + 0.5;
  col.rgb *= 1.0 - (scanlineVal * scanlineVal) * uScan;
  col.rgb += (rand(gl_FragCoord.xy + uTime) - 0.5) * uNoise;

  gl_FragColor = vec4(clamp(col.rgb, 0.0, 1.0), 1.0);
}
`;

type DarkVeilProps = {
  hueShift?: number;
  noiseIntensity?: number;
  scanlineIntensity?: number;
  speed?: number;
  scanlineFrequency?: number;
  warpAmount?: number;
  resolutionScale?: number;
};

export default function DarkVeil({
  hueShift = 0,
  noiseIntensity = 0,
  scanlineIntensity = 0,
  speed = 0.5,
  scanlineFrequency = 0,
  warpAmount = 0,
  resolutionScale = 1,
}: DarkVeilProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;

    if (!canvas || !parent) {
      return;
    }

    let renderer: Renderer | null = null;
    let frame = 0;

    try {
      renderer = new Renderer({
        canvas,
        dpr: Math.min(window.devicePixelRatio, 1.5),
        alpha: true,
      });
    } catch {
      return;
    }

    const gl = renderer.gl;
    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Vec2() },
        uHueShift: { value: hueShift },
        uNoise: { value: noiseIntensity },
        uScan: { value: scanlineIntensity },
        uScanFreq: { value: scanlineFrequency },
        uWarp: { value: warpAmount },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;

      renderer?.setSize(width * resolutionScale, height * resolutionScale);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      program.uniforms.uResolution.value.set(width, height);
    };

    const render = (elapsed = 0) => {
      program.uniforms.uTime.value = elapsed * speed;
      program.uniforms.uHueShift.value = hueShift;
      program.uniforms.uNoise.value = noiseIntensity;
      program.uniforms.uScan.value = scanlineIntensity;
      program.uniforms.uScanFreq.value = scanlineFrequency;
      program.uniforms.uWarp.value = warpAmount;
      renderer?.render({ scene: mesh });
    };

    window.addEventListener('resize', resize);
    resize();

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();

    if (prefersReducedMotion) {
      render();
    } else {
      const loop = () => {
        render((performance.now() - start) / 1000);
        frame = requestAnimationFrame(loop);
      };

      loop();
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      renderer = null;
    };
  }, [hueShift, noiseIntensity, resolutionScale, scanlineFrequency, scanlineIntensity, speed, warpAmount]);

  return <canvas ref={ref} className="block h-full w-full" />;
}
