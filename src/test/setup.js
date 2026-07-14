import { vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useMemo } from 'react';
global.React = React;

// ----------------------------------------------------
// A. Global Web Audio API Mock
// ----------------------------------------------------
class MockAudioParam {
  value = 0;
  setTargetAtTime = vi.fn();
}

class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockOscillatorNode extends MockAudioNode {
  type = 'sawtooth';
  frequency = new MockAudioParam();
  start = vi.fn();
  stop = vi.fn();
}

class MockBiquadFilterNode extends MockAudioNode {
  type = 'lowpass';
  frequency = new MockAudioParam();
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam();
}

global.AudioContext = class {
  state = 'suspended';
  currentTime = 0;
  createOscillator() { return new MockOscillatorNode(); }
  createBiquadFilter() { return new MockBiquadFilterNode(); }
  createGain() { return new MockGainNode(); }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  destination = {};
};
global.webkitAudioContext = global.AudioContext;

// ----------------------------------------------------
// B. Mock R3F Frame Scheduler & Canvas
// ----------------------------------------------------
export const frameCallbacks = new Set();
export const beforePhysicsStepCallbacks = new Set();

export function triggerFrames(delta = 1 / 60, iterations = 1) {
  const mockState = {
    camera: {
      position: { lerp: vi.fn() },
      lookAt: vi.fn(),
    },
    clock: { getElapsedTime: () => Date.now() / 1000 },
  };

  for (let i = 0; i < iterations; i++) {
    frameCallbacks.forEach(cb => cb(mockState, delta));

    // Component tests intentionally use one synthetic physics callback per
    // render sample. Production Rapier invokes the same callback for every
    // fixed substep; pure dynamics tests cover repeated-step equivalence.
    const physicsDelta = Number.isFinite(delta) && delta > 0
      ? Math.min(delta, 1 / 20)
      : 0;
    if (physicsDelta > 0) {
      beforePhysicsStepCallbacks.forEach(cb => cb({ timestep: physicsDelta }));
    }
    
    // Simulate simple Euler integration for all active RigidBodies
    activeBodies.forEach(body => body.integrate(delta));
  }
}

export function triggerFixedPhysicsSteps(elapsed, timeStep = 1 / 60) {
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
  if (!Number.isFinite(timeStep) || timeStep <= 0) return 0;

  // Mirrors the fixed-step loop used by @react-three/rapier. This is explicit
  // rather than baked into triggerFrames so legacy render-callback tests retain
  // their existing timing contract.
  const clampedElapsed = Math.min(elapsed, 0.5);
  const stepCount = Math.floor((clampedElapsed + Number.EPSILON) / timeStep);
  for (let step = 0; step < stepCount; step += 1) {
    beforePhysicsStepCallbacks.forEach(cb => cb({ timestep: timeStep }));
    activeBodies.forEach(body => body.integrate(timeStep));
  }
  return stepCount;
}

vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual('@react-three/fiber');
  return {
    ...actual,
    Canvas: ({ children, shadows, dpr }) => React.createElement('div', {
      'data-testid': 'r3f-canvas',
      'data-shadows': String(Boolean(shadows)),
      'data-dpr': JSON.stringify(dpr)
    }, children),
    useFrame: (callback) => {
      useEffect(() => {
        frameCallbacks.add(callback);
        return () => frameCallbacks.delete(callback);
      }, [callback]);
    },
  };
});

// ----------------------------------------------------
// C. Mock React Three Rapier Physics
// ----------------------------------------------------
export const activeBodies = new Set();

vi.mock('@react-three/rapier', () => {
  return {
    vec3: (v) => v || { x: 0, y: 0, z: 0 },
    quat: (q) => q || { x: 0, y: 0, z: 0, w: 1 },
    Physics: ({ children, paused }) => React.createElement('div', { 'data-testid': 'rapier-physics', 'data-paused': !!paused }, children),
    CuboidCollider: ({ args, position, mass, friction, frictionCombineRule, restitution }) => React.createElement('div', {
      'data-testid': 'cuboid-collider',
      'data-args': JSON.stringify(args),
      'data-position': JSON.stringify(position),
      'data-mass': String(mass),
      'data-friction': String(friction),
      'data-friction-combine-rule': String(frictionCombineRule),
      'data-restitution': String(restitution),
    }),
    TrimeshCollider: ({ args, friction, restitution }) => React.createElement('div', {
      'data-testid': 'trimesh-collider',
      'data-vertex-count': String(args?.[0]?.length || 0),
      'data-index-count': String(args?.[1]?.length || 0),
      'data-flags': String(args?.[2] ?? 0),
      'data-friction': String(friction),
      'data-restitution': String(restitution),
    }),
    useBeforePhysicsStep: (callback) => {
      useEffect(() => {
        beforePhysicsStepCallbacks.add(callback);
        return () => beforePhysicsStepCallbacks.delete(callback);
      }, [callback]);
    },
    RigidBody: forwardRef(({
      children,
      position = [0, 0, 0],
      mass = 1200,
      name,
      colliders,
      linearDamping,
      angularDamping,
      enabledRotations,
      ccd,
      onCollisionEnter,
      onCollisionExit,
    }, ref) => {
      const translationRef = useRef({ x: position[0], y: position[1], z: position[2] });
      const linvelRef = useRef({ x: 0, y: 0, z: 0 });
      const rotationRef = useRef({ x: 0, y: 0, z: 0, w: 1 });
      const collisionEnterRef = useRef(onCollisionEnter);
      const collisionExitRef = useRef(onCollisionExit);
      collisionEnterRef.current = onCollisionEnter;
      collisionExitRef.current = onCollisionExit;

      const bodyInstance = useMemo(() => ({
        translation: () => translationRef.current,
        linvel: () => linvelRef.current,
        rotation: () => rotationRef.current,
        mass: () => mass,
        name,
        initialX: position[0],
        initialY: position[1],
        initialZ: position[2],
        setTranslation: (vec) => {
          translationRef.current.x = vec.x;
          translationRef.current.y = vec.y;
          translationRef.current.z = vec.z;
        },
        setLinvel: (vec) => {
          linvelRef.current.x = vec.x;
          linvelRef.current.y = vec.y;
          linvelRef.current.z = vec.z;
        },
        setAngvel: vi.fn(),
        setRotation: (quatVal) => {
          rotationRef.current.x = quatVal.x;
          rotationRef.current.y = quatVal.y;
          rotationRef.current.z = quatVal.z;
          rotationRef.current.w = quatVal.w;
        },
        applyImpulse: (impulse) => {
          linvelRef.current.x += impulse.x / mass;
          linvelRef.current.y += impulse.y / mass;
          linvelRef.current.z += impulse.z / mass;
        },
        applyTorqueImpulse: vi.fn(),
        triggerCollisionEnter: ({ name: otherName = 'track-barriers', handle = 1 } = {}) => {
          collisionEnterRef.current?.({
            other: { rigidBodyObject: { name: otherName }, collider: { handle } },
          });
        },
        triggerCollisionExit: ({ name: otherName = 'track-barriers', handle = 1 } = {}) => {
          collisionExitRef.current?.({
            other: { rigidBodyObject: { name: otherName }, collider: { handle } },
          });
        },
        
        // Custom internal integration helper
        integrate: (dt) => {
          translationRef.current.x += linvelRef.current.x * dt;
          translationRef.current.y += linvelRef.current.y * dt;
          translationRef.current.z += linvelRef.current.z * dt;
        }
      }), [mass, position]);

      useImperativeHandle(ref, () => bodyInstance);

      useEffect(() => {
        activeBodies.add(bodyInstance);
        return () => {
          activeBodies.delete(bodyInstance);
        };
      }, [bodyInstance]);

      return React.createElement('div', {
        'data-testid': 'rigid-body',
        'data-name': name,
        'data-colliders': String(colliders),
        'data-linear-damping': String(linearDamping),
        'data-angular-damping': String(angularDamping),
        'data-enabled-rotations': JSON.stringify(enabledRotations),
        'data-ccd': String(Boolean(ccd)),
      }, children);
    }),
  };
});

// ----------------------------------------------------
// D. Mock Drei Helpers & Controls
// ----------------------------------------------------
window.mockKeys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  brake: false,
  reset: false,
  pause: false,
};

vi.mock('@react-three/drei', () => {
  return {
    KeyboardControls: ({ children }) => React.createElement('div', { 'data-testid': 'keyboard-controls' }, children),
    useKeyboardControls: () => {
      const getKeys = () => window.mockKeys;
      const subscribe = vi.fn();
      return [subscribe, getKeys];
    },
    Trail: ({ children }) => React.createElement('div', { 'data-testid': 'trail' }, children),
    Sky: () => null,
    Environment: () => null,
  };
});

// ----------------------------------------------------
// E. Reset state between runs
// ----------------------------------------------------
beforeEach(() => {
  frameCallbacks.clear();
  beforePhysicsStepCallbacks.clear();
  activeBodies.clear();
  window.racerPositions = {};
  window.racerProgress = {};
  window.mockKeys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    reset: false,
    pause: false,
  };
});
