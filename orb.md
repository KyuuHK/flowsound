# Fluid Audio Orb Component — Technical & Design Specification

This document defines the complete technical, visual, mathematical, and shader specifications for the **Fluid Audio Orb**, a 3D generative visualizer built with Three.js and the Web Audio API for FlowSound. It replaces static album artwork with an organic, reactive liquid glass sphere that appears when music plays and adapts chromatically to music genres.

---

## 1. Concept & Architectural Rationale

### The Problem
Streaming lofi music via GitHub-hosted repositories or free radio streams lacks high-resolution album cover artwork. Traditional placeholder icons or static colored rectangles degrade the minimal, tactile Apple-like aesthetic of FlowSound.

### The Solution
The **Fluid Audio Orb** treats audio playback as a physical, biological event:
1. **Zero-Presence Idle State:** When audio is paused or inactive, the canvas is completely vacant (`scale = 0`, `opacity = 0`).
2. **Organic Emergence:** Upon playback initiation, the sphere manifests from the canvas center via an organic spring expansion.
3. **Low-Frequency Kinetic Displacement:** A custom vertex shader utilizes 3D Simplex noise modulated in real time by the stream's bass and sub-bass frequencies (0–120 Hz).
4. **Liquid Glass & Fresnel Sheen:** A fragment shader simulates translucent refractive glass with internal chromatic absorption, an illuminated Fresnel rim, and specular surface glints.
5. **Genre Color Morphing:** Switching stations transitions shader color vectors via smooth linear interpolation (`lerp`), preventing jarring visual cuts.

---

## 2. Mathematical & Shader Foundations

### 2.1 Vertex Shader: 3D Simplex Displacement
The sphere's surface geometry is dynamically deformed along its normal vectors:

$$\vec{P}_{\text{displaced}} = \vec{P} + \vec{N} \cdot \left[ \text{noise}\left( \vec{P} \cdot f + \vec{t} \right) \cdot \left( A_{\text{base}} + A_{\text{audio}} \cdot I_{\text{bass}} \right) \right]$$

* $\vec{P}$: Original vertex position on the unit sphere.
* $\vec{N}$: Normalized vertex normal.
* $f$: Spatial noise frequency ($1.5$).
* $\vec{t}$: Temporal animation vector $(\text{time} \cdot 0.9)$.
* $A_{\text{base}}$: Baseline continuous wave amplitude ($0.18$).
* $A_{\text{audio}}$: Audio surge modulation ceiling ($0.35$).
* $I_{\text{bass}}$: Normalized low-frequency audio energy ($0.0 \to 1.0$).

### 2.2 Fragment Shader: Refraction & Specular Model
* **Fresnel Factor:** Simulates glass thickness and rim transparency:
  $$F = \left( 1.0 - \max(\vec{V} \cdot \vec{N}, 0.0) \right)^{2.2}$$
  where $\vec{V}$ is the normalized view vector pointing toward the camera.
* **Internal Fluid Core:** A vertical linear mix between primary and secondary genre colors:
  $$C_{\text{core}} = \text{mix}(C_{\text{secondary}}, C_{\text{primary}}, (P_y + 1.0) \cdot 0.5)$$
* **Specular Highlight:** Blinn-Phong specular glint representing overhead studio lighting:
  $$S = \left( \max(\vec{N} \cdot \vec{H}, 0.0) \right)^{32.0}$$
  where $\vec{H} = \text{normalize}(\vec{L} + \vec{V})$.

---

## 3. Station Colorway Registry

| Station ID | Genre / Mood | Primary Color (`#hex`) | Secondary Color (`#hex`) | Auditory Character |
| :--- | :--- | :--- | :--- | :--- |
| `focus` | Focus | `#00A3FF` (Cyan Azure) | `#002B5B` (Deep Abyssal Blue) | Cool, crisp, mentally sharpening |
| `seasons` | Seasons | `#F59E0B` (Autumn Amber) | `#451A03` (Burnt Umber) | Warm, cyclical, organic |
| `ambient-drift` | Ambient Drift | `#10B981` (Misty Emerald) | `#062E25` (Pine Shadow) | Ethereal, low-tempo soundscapes |
| `soul` | Soul | `#D97706` (Analog Brass) | `#3D1403` (Smoked Mahogany) | Dusty, vintage vinyl warmth |
| `late-night` | Late Night | `#818CF8` (Neon Indigo) | `#1E1B4B` (Midnight Navy) | Darkened desk, muted acoustics |
| `funk` | Funk | `#F43F5E` (Electric Coral) | `#4C0519` (Deep Burgundy) | High rhythmic syncopation |
| `jazz-lounge` | Jazz Lounge | `#FB923C` (Tangerine Brass) | `#431407` (Smoked Oak) | Acoustic double bass and brushes |
| `chillhop` | Chillhop | `#F97316` (Warm Tangerine) | `#441A03` (Raw Sienna) | Relaxed boom-bap rhythms |
| `asian` | Asian Lo-Fi | `#2DD4BF` (Jade Mist) | `#042F2C` (Forest Shadow) | Traditional plucks and gentle air |
| `hybrid` | Hybrid | `#06B6D4` (Electric Cyan) | `#082F49` (Deep Slate) | Cinematic, modern synthesis |

---

## 4. Production Component Implementation

### File: `components/player/FluidAudioOrb.tsx`

```tsx
"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export interface FluidAudioOrbProps {
  readonly isAudioPlaying: boolean;
  readonly audioAnalyserNode: AnalyserNode | null;
  readonly primaryColorHex: string;
  readonly secondaryColorHex: string;
}

export function FluidAudioOrb({
  isAudioPlaying,
  audioAnalyserNode,
  primaryColorHex,
  secondaryColorHex,
}: FluidAudioOrbProps) {
  const mountContainerReference = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const containerElement = mountContainerReference.current;
    if (!containerElement) {
      return;
    }

    // 1. Scene, Camera, and Renderer Initialization
    const containerWidth = containerElement.clientWidth || 320;
    const containerHeight = containerElement.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      containerWidth / containerHeight,
      0.1,
      100
    );
    camera.position.z = 3.6;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerElement.appendChild(renderer.domElement);

    // 2. Custom 3D Simplex Noise & Fresnel Shader Material
    const customShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uniformTime: { value: 0.0 },
        uniformAudioIntensity: { value: 0.0 },
        uniformPrimaryColor: { value: new THREE.Color(primaryColorHex) },
        uniformSecondaryColor: { value: new THREE.Color(secondaryColorHex) },
        uniformOpacity: { value: 0.0 },
      },
      vertexShader: `
        uniform float uniformTime;
        uniform float uniformAudioIntensity;
        varying vec3 variableNormal;
        varying vec3 variablePosition;
        varying vec3 variableWorldPosition;

        vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
        vec4 taylorInverseSquareRoot(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float simplexNoise3D(vec3 vector) {
          const vec2 constantC = vec2(1.0 / 6.0, 1.0 / 3.0);
          const vec4 constantD = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 integerCoordinate = floor(vector + dot(vector, constantC.yyy));
          vec3 originToFraction = vector - integerCoordinate + dot(integerCoordinate, constantC.xxx);
          vec3 stepGreater = step(originToFraction.yzx, originToFraction.xyz);
          vec3 stepLess = 1.0 - stepGreater;
          vec3 intermediateIndex1 = min(stepGreater.xyz, stepLess.zxy);
          vec3 intermediateIndex2 = max(stepGreater.xyz, stepLess.zxy);
          vec3 fraction1 = originToFraction - intermediateIndex1 + 1.0 * constantC.xxx;
          vec3 fraction2 = originToFraction - intermediateIndex2 + 2.0 * constantC.xxx;
          vec3 fraction3 = originToFraction - 1.0 + 3.0 * constantC.xxx;
          integerCoordinate = mod(integerCoordinate, 289.0);
          vec4 permutationHash = permute(permute(permute(
                    integerCoordinate.z + vec4(0.0, intermediateIndex1.z, intermediateIndex2.z, 1.0))
                  + integerCoordinate.y + vec4(0.0, intermediateIndex1.y, intermediateIndex2.y, 1.0))
                  + integerCoordinate.x + vec4(0.0, intermediateIndex1.x, intermediateIndex2.x, 1.0));
          float normalizationScale = 0.142857142857;
          vec3 normalVectorsS = permutationHash * constantD.wyz - constantD.xzx;
          vec4 hashX = floor(permutationHash * normalVectorsS.z);
          vec4 hashY = floor(permutationHash - 7.0 * hashX);
          vec4 gradientX = hashX * normalVectorsS.x + normalVectorsS.yyyy;
          vec4 gradientY = hashY * normalVectorsS.x + normalVectorsS.yyyy;
          vec4 gradientH = 1.0 - abs(gradientX) - abs(gradientY);
          vec4 base0 = vec4(gradientX.xy, gradientY.xy);
          vec4 base1 = vec4(gradientX.zw, gradientY.zw);
          vec4 signStep0 = floor(base0) * 2.0 + 1.0;
          vec4 signStep1 = floor(base1) * 2.0 + 1.0;
          vec4 stepH = -step(gradientH, vec4(0.0));
          vec4 correctedA0 = base0.xzyw + signStep0.xzyw * stepH.xxyy;
          vec4 correctedA1 = base1.xzyw + signStep1.xzyw * stepH.zzww;
          vec3 gradientPoint0 = vec3(correctedA0.xy, gradientH.x);
          vec3 gradientPoint1 = vec3(correctedA0.zw, gradientH.y);
          vec3 gradientPoint2 = vec3(correctedA1.xy, gradientH.z);
          vec3 gradientPoint3 = vec3(correctedA1.zw, gradientH.w);
          vec4 normalizationFactor = taylorInverseSquareRoot(vec4(
            dot(gradientPoint0, gradientPoint0),
            dot(gradientPoint1, gradientPoint1),
            dot(gradientPoint2, gradientPoint2),
            dot(gradientPoint3, gradientPoint3)
          ));
          gradientPoint0 *= normalizationFactor.x;
          gradientPoint1 *= normalizationFactor.y;
          gradientPoint2 *= normalizationFactor.z;
          gradientPoint3 *= normalizationFactor.w;
          vec4 falloffWeight = max(0.6 - vec4(
            dot(originToFraction, originToFraction),
            dot(fraction1, fraction1),
            dot(fraction2, fraction2),
            dot(fraction3, fraction3)
          ), 0.0);
          falloffWeight = falloffWeight * falloffWeight;
          return 42.0 * dot(
            falloffWeight * falloffWeight,
            vec4(
              dot(gradientPoint0, originToFraction),
              dot(gradientPoint1, fraction1),
              dot(gradientPoint2, fraction2),
              dot(gradientPoint3, fraction3)
            )
          );
        }

        void main() {
          variableNormal = normalize(normalMatrix * normal);
          variablePosition = position;

          float baselineDisplacement = 0.18 + (uniformAudioIntensity * 0.35);
          float temporalFrequency = uniformTime * 0.9;
          float calculatedNoise = simplexNoise3D(position * 1.5 + vec3(temporalFrequency));
          vec3 displacedPosition = position + normal * (calculatedNoise * baselineDisplacement);

          vec4 calculatedWorldPosition = modelMatrix * vec4(displacedPosition, 1.0);
          variableWorldPosition = calculatedWorldPosition.xyz;

          gl_Position = projectionMatrix * viewMatrix * calculatedWorldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uniformPrimaryColor;
        uniform vec3 uniformSecondaryColor;
        uniform float uniformOpacity;
        varying vec3 variableNormal;
        varying vec3 variablePosition;
        varying vec3 variableWorldPosition;

        void main() {
          vec3 normalizedViewDirection = normalize(cameraPosition - variableWorldPosition);

          // Fresnel edge refraction rim
          float fresnelRim = pow(1.0 - max(dot(normalizedViewDirection, variableNormal), 0.0), 2.2);

          // Internal fluid vertical gradient mix
          float internalVerticalMix = clamp((variablePosition.y + 1.0) * 0.5, 0.0, 1.0);
          vec3 internalFluidColor = mix(uniformSecondaryColor, uniformPrimaryColor, internalVerticalMix);

          // Blinn-Phong specular glint
          vec3 lightSourceDirection = normalize(vec3(1.0, 2.0, 3.0));
          vec3 halfVector = normalize(lightSourceDirection + normalizedViewDirection);
          float specularHighlight = pow(max(dot(variableNormal, halfVector), 0.0), 32.0);

          vec3 finalRgbColor = internalFluidColor + (fresnelRim * 0.4) + vec3(specularHighlight * 0.5);
          float finalAlphaChannel = (fresnelRim * 0.7 + 0.3) * uniformOpacity;

          gl_FragColor = vec4(finalRgbColor, finalAlphaChannel);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    const sphereGeometry = new THREE.SphereGeometry(1.0, 96, 96);
    const orbMeshInstance = new THREE.Mesh(sphereGeometry, customShaderMaterial);
    orbMeshInstance.scale.setScalar(0.001);
    scene.add(orbMeshInstance);

    // 3. Audio Frequency Buffer Extraction
    const frequencyDataBuffer = new Uint8Array(
      audioAnalyserNode ? audioAnalyserNode.frequencyBinCount : 32
    );

    let animationFrameIdentifier: number;
    let currentScaleInterpolation = 0.001;
    let currentOpacityInterpolation = 0.0;
    const targetPrimaryColorObject = new THREE.Color(primaryColorHex);
    const targetSecondaryColorObject = new THREE.Color(secondaryColorHex);

    // 4. Render and Physics Loop
    const executeRenderLoop = () => {
      customShaderMaterial.uniforms.uniformTime.value += 0.015;

      // Presence Transition: Spring-scale from 0 when paused to 1 when playing
      const targetScaleValue = isAudioPlaying ? 1.0 : 0.001;
      const targetOpacityValue = isAudioPlaying ? 0.95 : 0.0;

      currentScaleInterpolation += (targetScaleValue - currentScaleInterpolation) * 0.08;
      currentOpacityInterpolation +=
        (targetOpacityValue - currentOpacityInterpolation) * 0.08;

      orbMeshInstance.scale.setScalar(currentScaleInterpolation);
      customShaderMaterial.uniforms.uniformOpacity.value = currentOpacityInterpolation;

      // Real-time Audio Beat Extraction (Low-end Bass Bins)
      if (audioAnalyserNode && isAudioPlaying) {
        audioAnalyserNode.getByteFrequencyData(frequencyDataBuffer);
        let lowFrequencySum = 0;
        const lowFrequencyBinLimit = 6;
        for (let index = 0; index < lowFrequencyBinLimit; index += 1) {
          lowFrequencySum += frequencyDataBuffer[index];
        }
        const normalizedBassEnergy = lowFrequencySum / (lowFrequencyBinLimit * 255);
        customShaderMaterial.uniforms.uniformAudioIntensity.value +=
          (normalizedBassEnergy -
            customShaderMaterial.uniforms.uniformAudioIntensity.value) *
          0.2;
      } else {
        customShaderMaterial.uniforms.uniformAudioIntensity.value *= 0.9;
      }

      // Smooth RGB Genre Transition
      customShaderMaterial.uniforms.uniformPrimaryColor.value.lerp(
        targetPrimaryColorObject,
        0.05
      );
      customShaderMaterial.uniforms.uniformSecondaryColor.value.lerp(
        targetSecondaryColorObject,
        0.05
      );

      // Slow ambient rotational idle
      orbMeshInstance.rotation.y += 0.004;
      orbMeshInstance.rotation.z += 0.002;

      renderer.render(scene, camera);
      animationFrameIdentifier = requestAnimationFrame(executeRenderLoop);
    };

    executeRenderLoop();

    // 5. Memory Cleanup & WebGL Context Teardown
    return () => {
      if (animationFrameIdentifier !== undefined) {
        cancelAnimationFrame(animationFrameIdentifier);
      }
      sphereGeometry.dispose();
      customShaderMaterial.dispose();
      renderer.dispose();
      if (containerElement.contains(renderer.domElement)) {
        containerElement.removeChild(renderer.domElement);
      }
    };
  }, [isAudioPlaying, audioAnalyserNode, primaryColorHex, secondaryColorHex]);

  return (
    <div
      ref={mountContainerReference}
      className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center select-none pointer-events-none"
      aria-hidden="true"
    />
  );
}
```

---

## 5. Web Audio API Connection Pipeline

To connect the `audioAnalyserNode` prop cleanly in your Next.js application, configure the Web Audio pipeline on user gesture (first play):

```tsx
// lib/audioContextManager.ts
let sharedAudioContext: AudioContext | null = null;
let sharedAnalyserNode: AnalyserNode | null = null;
let audioSourceNode: MediaElementAudioSourceNode | null = null;

export function initializeWebAudioPipeline(audioElement: HTMLAudioElement) {
  if (!sharedAudioContext) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioContext = new AudioContextClass();
  }

  if (sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume();
  }

  if (!sharedAnalyserNode) {
    sharedAnalyserNode = sharedAudioContext.createAnalyser();
    sharedAnalyserNode.fftSize = 64;
    sharedAnalyserNode.smoothingTimeConstant = 0.8;
  }

  if (!audioSourceNode) {
    audioSourceNode = sharedAudioContext.createMediaElementSource(audioElement);
    audioSourceNode.connect(sharedAnalyserNode);
    sharedAnalyserNode.connect(sharedAudioContext.destination);
  }

  return {
    audioContext: sharedAudioContext,
    analyserNode: sharedAnalyserNode,
  };
}
```

---

## 6. Web Interface Guidelines & Performance Safeguards

1. **Zero Layout Shifts (CLS = 0):** The container occupies a fixed, locked aspect square (`w-64 h-64 sm:w-80 sm:h-80`) with `pointer-events: none` and `aria-hidden="true"`.
2. **GPU Optimization:** Pixel ratio is capped at `Math.min(window.devicePixelRatio, 2)` to eliminate thermal throttling on high-DPI displays.
3. **Strict Memory Management:** The `useEffect` cleanup hook disposes of geometries, compiled shader materials, and cancels the `requestAnimationFrame` loop to prevent memory leaks across route navigation.
4. **Accessible Semantics:** Screen readers receive track and station information via surrounding semantic elements, keeping the Three.js canvas decorative.
