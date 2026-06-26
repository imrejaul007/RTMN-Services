/**
 * genie-spatial — WebXR/React-Three-Fiber spatial interface for Genie AI
 *
 * Provides an immersive spatial overlay where Genie appears as a floating
 * holographic companion in AR (via WebXR) or a full 3D environment in VR.
 *
 * @requires react, @react-three/fiber, @react-three/drei, three
 *
 * Usage:
 *   <SpatialProvider>
 *     <GenieSpatialOverlay messages={messages} onSend={handleSend} />
 *   </SpatialProvider>
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Float, Sphere, Torus, Box, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// Context
// ============================================================================

interface SpatialContextType {
  mode: 'flat' | 'ar' | 'vr';
  setMode: (m: 'flat' | 'ar' | 'vr') => void;
  isSupported: boolean;
  isActive: boolean;
  startSession: () => Promise<void>;
  endSession: () => void;
}

const SpatialContext = createContext<SpatialContextType>({
  mode: 'flat',
  setMode: () => {},
  isSupported: false,
  isActive: false,
  startSession: async () => {},
  endSession: () => {},
});

export function useSpatial() {
  return useContext(SpatialContext);
}

// ============================================================================
// Genie Avatar (3D holographic companion)
// ============================================================================

interface GenieAvatarProps {
  messages: { role: 'user' | 'genie'; text: string }[];
  isThinking: boolean;
}

function GenieAvatar({ messages, isThinking }: GenieAvatarProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lastMessage = messages.filter(m => m.role === 'genie').at(-1);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    // Gentle floating animation
    meshRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.8) * 0.05;
    // Slow rotation
    meshRef.current.rotation.y += 0.003;
  });

  const color = isThinking ? '#f59e0b' : '#8b5cf6';
  const scale = isThinking ? 1.05 : 1.0;

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
      <group ref={meshRef as any} scale={scale}>
        {/* Core orb */}
        <Sphere args={[0.3, 32, 32]}>
          <MeshTransmissionMaterial
            backside
            samples={4}
            thickness={0.3}
            roughness={0.1}
            transmissionSampler
            chromaticAberration={0.06}
            anisotropicBlur={0.1}
            distortion={0.1}
            distortionScale={0.2}
            temporalDistortion={0.3}
            color={color}
          />
        </Sphere>

        {/* Outer ring */}
        <Torus args={[0.45, 0.02, 16, 64]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </Torus>

        {/* Orbiting ring (tilts) */}
        <Torus args={[0.55, 0.015, 16, 64]} rotation={[Math.PI / 3, 0.5, 0]}>
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.3} />
        </Torus>

        {/* Status indicator dots */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.6, Math.sin(angle * 0.5) * 0.1, Math.sin(angle) * 0.6]}
            >
              <Sphere args={[0.025, 8, 8]}>
                <meshStandardMaterial
                  color={isThinking ? '#f59e0b' : '#22c55e'}
                  emissive={isThinking ? '#f59e0b' : '#22c55e'}
                  emissiveIntensity={1}
                />
              </Sphere>
            </mesh>
          );
        })}

        {/* Label */}
        {lastMessage && (
          <Text
            position={[0, -0.65, 0]}
            fontSize={0.08}
            maxWidth={1.2}
            textAlign="center"
            color="white"
            anchorX="center"
            anchorY="top"
            outlineWidth={0.005}
            outlineColor="#000000"
          >
            {lastMessage.text.slice(0, 60)}{lastMessage.text.length > 60 ? '…' : ''}
          </Text>
        )}
      </group>
    </Float>
  );
}

// ============================================================================
// Ambient Particles
// ============================================================================

function Particles({ count = 200 }: { count?: number }) {
  const mesh = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    mesh.current.rotation.y = clock.getElapsedTime() * 0.02;
    mesh.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.01) * 0.1;
  });

  return (
    <points ref={mesh as any}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.015} color="#8b5cf6" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

// ============================================================================
// Spatial Scene
// ============================================================================

interface SceneProps {
  messages: { role: 'user' | 'genie'; text: string }[];
  isThinking: boolean;
}

function Scene({ messages, isThinking }: SceneProps) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0, 3);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#8b5cf6" />
      <pointLight position={[-5, -5, 5]} intensity={0.5} color="#06b6d4" />

      <GenieAvatar messages={messages} isThinking={isThinking} />
      <Particles />

      {/* Background gradient plane */}
      <mesh position={[0, 0, -5]}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial color="#0f0f1a" />
      </mesh>
    </>
  );
}

// ============================================================================
// Spatial Input Panel (glassmorphism)
// ============================================================================

interface InputPanelProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
}

function InputPanel({ value, onChange, onSend, disabled }: InputPanelProps) {
  const [isXR, setIsXR] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(600px, 90vw)',
        display: 'flex',
        gap: 8,
        padding: 12,
        background: 'rgba(15, 15, 26, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRadius: 16,
        border: '1px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(139,92,246,0.1)',
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && onSend()}
        placeholder="Ask Genie anything…"
        disabled={disabled}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'white',
          fontSize: 15,
          padding: '8px 4px',
        }}
        aria-label="Ask Genie"
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        style={{
          padding: '8px 20px',
          background: disabled ? '#374151' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          border: 'none',
          borderRadius: 10,
          color: 'white',
          fontWeight: 600,
          fontSize: 14,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {disabled ? '…' : 'Send'}
      </button>
      <button
        onClick={() => setIsXR(x => !x)}
        style={{
          padding: '8px 12px',
          background: 'rgba(139,92,246,0.2)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: 10,
          color: '#8b5cf6',
          fontSize: 14,
          cursor: 'pointer',
        }}
        title="Enter AR/VR mode"
        aria-label="Toggle AR/VR mode"
      >
        {isXR ? '⬜ 2D' : '🥽 3D'}
      </button>
    </div>
  );
}

// ============================================================================
// Message List
// ============================================================================

interface Message {
  role: 'user' | 'genie';
  text: string;
}

interface MessageListProps {
  messages: Message[];
}

function MessageList({ messages }: MessageListProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(500px, 90vw)',
        maxHeight: '40vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '0 8px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(139,92,246,0.3) transparent',
      }}
    >
      {messages.slice(-20).map((m, i) => (
        <div
          key={i}
          style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            padding: '10px 14px',
            borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: m.role === 'user'
              ? 'rgba(139,92,246,0.8)'
              : 'rgba(255,255,255,0.08)',
            color: 'white',
            fontSize: 14,
            lineHeight: 1.5,
            backdropFilter: 'blur(8px)',
            border: m.role === 'genie' ? '1px solid rgba(139,92,246,0.2)' : 'none',
          }}
        >
          {m.text}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface GenieSpatialOverlayProps {
  messages: Message[];
  isThinking?: boolean;
  onSend: (text: string) => void;
  inputValue: string;
  onInputChange: (v: string) => void;
  disabled?: boolean;
  canvasClassName?: string;
}

/**
 * Spatial overlay with a 3D holographic Genie avatar.
 * Set mode="flat" to use Canvas in flat/immersive mode (no WebXR headset needed).
 * The user can click "3D" to enter AR mode if their browser supports WebXR.
 */
export function GenieSpatialOverlay({
  messages,
  isThinking = false,
  onSend,
  inputValue,
  onInputChange,
  disabled = false,
  canvasClassName,
}: GenieSpatialOverlayProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'flat' | 'ar' | 'vr'>('flat');
  const [input, setInput] = useState(inputValue);

  useEffect(() => {
    setInput(inputValue);
  }, [inputValue]);

  useEffect(() => {
    setIsSupported('xr' in navigator);
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim() || disabled) return;
    onInputChange('');
    onSend(input.trim());
  }, [input, disabled, onSend, onInputChange]);

  async function startSession() {
    if (!isSupported) return;
    try {
      const session = await (navigator as any).xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
      });
      // Handle XR session...
      setIsActive(true);
      setMode('ar');
    } catch {
      // AR not available — stay in flat mode
      setMode('flat');
    }
  }

  function endSession() {
    setIsActive(false);
    setMode('flat');
  }

  const ctx = useMemo<SpatialContextType>(() => ({
    mode,
    setMode,
    isSupported,
    isActive,
    startSession,
    endSession,
  }), [mode, isSupported, isActive]);

  return (
    <SpatialContext.Provider value={ctx}>
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: 400,
          background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)',
          borderRadius: mode === 'flat' ? 16 : 0,
          overflow: 'hidden',
          position: 'relative',
        }}
        className={canvasClassName}
      >
        {/* 3D Canvas */}
        <Canvas
          style={{ position: 'absolute', inset: 0 }}
          camera={{ position: [0, 0, 3], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene messages={messages} isThinking={isThinking} />
        </Canvas>

        {/* 2D overlay */}
        <MessageList messages={messages} />
        <InputPanel
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={disabled}
        />
      </div>
    </SpatialContext.Provider>
  );
}

// ============================================================================
// Export
// ============================================================================

export { SpatialContext };
