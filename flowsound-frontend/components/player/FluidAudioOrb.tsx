"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "framer-motion";

interface FluidAudioOrbProps {
  readonly isAudioPlaying: boolean;
  readonly audioAnalyserNode: AnalyserNode | null;
  readonly primaryColorHex: string;
  readonly secondaryColorHex: string;
  /** False while the owning pane is hidden (parked): the rAF loop never runs,
   *  just a single paint when the pane comes back so the last state persists. */
  readonly isPaneActive: boolean;
  readonly className?: string;
}

const PRESENCE_LERP = 0.08;
const SPHERE_SEGMENTS = 64;

/**
 * Fluid Audio Orb (orb.md): a Three.js liquid-glass sphere, zero-presence when
 * paused, springing in when music plays. The vertex shader displaces the surface
 * with Simplex noise driven by the low-frequency audio energy; the fragment
 * shader renders a Fresnel rim, an internal vertical fluid gradient of the
 * genre colorway, and a Blinn-Phong glint. Station switches lerp the colorway.
 */
export function FluidAudioOrb({
  isAudioPlaying,
  audioAnalyserNode,
  primaryColorHex,
  secondaryColorHex,
  isPaneActive,
  className,
}: FluidAudioOrbProps) {
  const mountContainerReference = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Live prop snapshot read by the rAF loop. The orb keeps ONE renderer/context
  // for its whole lifetime (never torn down on play/pause), and the loop reads
  // the latest props here every frame, so both the fade-IN and fade-OUT ramps
  // survive the state flip instead of being discarded by an effect re-run.
  const livePropsRef = useRef({ isAudioPlaying, audioAnalyserNode, primaryColorHex, secondaryColorHex, isPaneActive, prefersReducedMotion });
  const paintFrameRef = useRef<(() => void) | null>(null);

  // Refresh the snapshot the rAF loop reads, after every commit (declared before
  // the wake effect so the loop always sees the newest props).
  useEffect(() => {
    livePropsRef.current = { isAudioPlaying, audioAnalyserNode, primaryColorHex, secondaryColorHex, isPaneActive, prefersReducedMotion };
  });

  useEffect(() => {
    const containerElement = mountContainerReference.current;
    if (!containerElement) {
      return;
    }

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
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    containerElement.appendChild(renderer.domElement);

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
          vec3 normalVectorsS = normalizationScale * constantD.wyz - constantD.xzx;
          vec4 reducedJ = permutationHash - 49.0 * floor(permutationHash * normalVectorsS.z * normalVectorsS.z);
          vec4 hashX = floor(reducedJ * normalVectorsS.z);
          vec4 hashY = floor(reducedJ - 7.0 * hashX);
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

          float fresnelRim = pow(1.0 - max(dot(normalizedViewDirection, variableNormal), 0.0), 2.2);

          float internalVerticalMix = clamp((variablePosition.y + 1.0) * 0.5, 0.0, 1.0);
          vec3 internalFluidColor = mix(uniformSecondaryColor, uniformPrimaryColor, internalVerticalMix);

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

    const sphereGeometry = new THREE.SphereGeometry(1.0, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
    const orbMeshInstance = new THREE.Mesh(sphereGeometry, customShaderMaterial);
    orbMeshInstance.scale.setScalar(0.001);
    scene.add(orbMeshInstance);

    const frequencyDataBuffer = new Uint8Array(
      audioAnalyserNode ? audioAnalyserNode.frequencyBinCount : 32
    );

    let animationFrameIdentifier: number | null = null;
    let currentScaleInterpolation = 0.001;
    let currentOpacityInterpolation = 0.0;
    const targetPrimaryColorObject = new THREE.Color(primaryColorHex);
    const targetSecondaryColorObject = new THREE.Color(secondaryColorHex);

    const paintFrame = () => {
      const {
        isAudioPlaying: livePlaying,
        audioAnalyserNode: liveAnalyser,
        primaryColorHex: livePrimary,
        secondaryColorHex: liveSecondary,
        isPaneActive: livePaneActive,
        prefersReducedMotion: liveReducedMotion,
      } = livePropsRef.current;

      const visibilityTargetScale = livePlaying ? 1.0 : 0.001;
      const visibilityTargetOpacity = livePlaying ? 0.95 : 0.0;

      const presenceLerp =
        liveReducedMotion ? 1.0 : PRESENCE_LERP;

      currentScaleInterpolation +=
        (visibilityTargetScale - currentScaleInterpolation) * presenceLerp;
      currentOpacityInterpolation +=
        (visibilityTargetOpacity - currentOpacityInterpolation) * presenceLerp;

      if (!liveReducedMotion) {
        customShaderMaterial.uniforms.uniformTime.value += 0.015;
      }

      if (liveAnalyser && livePlaying && !liveReducedMotion) {
        liveAnalyser.getByteFrequencyData(frequencyDataBuffer);
        let lowFrequencySum = 0;
        const lowFrequencyBinLimit = 12;
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

      targetPrimaryColorObject.set(livePrimary);
      targetSecondaryColorObject.set(liveSecondary);
      customShaderMaterial.uniforms.uniformPrimaryColor.value.lerp(
        targetPrimaryColorObject,
        liveReducedMotion ? 1.0 : 0.05
      );
      customShaderMaterial.uniforms.uniformSecondaryColor.value.lerp(
        targetSecondaryColorObject,
        liveReducedMotion ? 1.0 : 0.05
      );

      if (!liveReducedMotion) {
        orbMeshInstance.rotation.y += 0.004;
        orbMeshInstance.rotation.z += 0.002;
      }

      orbMeshInstance.scale.setScalar(currentScaleInterpolation);
      customShaderMaterial.uniforms.uniformOpacity.value = currentOpacityInterpolation;

      renderer.render(scene, camera);

      containerElement.setAttribute(
        "data-presence",
        currentScaleInterpolation.toFixed(3)
      );

      const resting =
        Math.abs(currentScaleInterpolation - visibilityTargetScale) < 0.004 &&
        Math.abs(currentOpacityInterpolation - visibilityTargetOpacity) < 0.004;

      if (!livePaneActive) return;
      if (livePlaying || !resting) {
        animationFrameIdentifier = requestAnimationFrame(paintFrame);
      }
    };

    paintFrameRef.current = paintFrame;
    paintFrame();

    const resizeObserver = new ResizeObserver(() => {
      if (!containerElement.isConnected) return;
      const nextWidth = containerElement.clientWidth || 320;
      const nextHeight = containerElement.clientHeight || 320;
      renderer.setSize(nextWidth, nextHeight);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      containerElement.setAttribute("data-presence", currentScaleInterpolation.toFixed(3));
    });
    resizeObserver.observe(containerElement);

    return () => {
      paintFrameRef.current = null;
      if (animationFrameIdentifier !== null) {
        cancelAnimationFrame(animationFrameIdentifier);
      }
      resizeObserver.disconnect();
      sphereGeometry.dispose();
      customShaderMaterial.dispose();
      renderer.dispose();
      if (containerElement.contains(renderer.domElement)) {
        containerElement.removeChild(renderer.domElement);
      }
    };
    // The orb owns ONE renderer for its whole lifetime; play/pause/pane changes
    // are read live from livePropsRef each frame (the ramps must not be reset by
    // an effect re-run). Only mounting state is a real dependency here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wake the frame loop whenever a ramping-relevant prop changes — e.g. a
  // play while rested (the loop had parked), or the pane coming back into view
  // mid-fade. paintFrame itself continues scheduling; this is just the kick.
  useEffect(() => {
    paintFrameRef.current?.();
  }, [isAudioPlaying, isPaneActive]);

  return (
    <div
      ref={mountContainerReference}
      data-orb
      aria-hidden="true"
      className={`pointer-events-none relative flex aspect-square select-none items-center justify-center overflow-hidden rounded-full ${className ?? ""}`}
    />
  );
}