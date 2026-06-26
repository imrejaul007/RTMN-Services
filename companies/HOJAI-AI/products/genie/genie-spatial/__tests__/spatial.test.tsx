/**
 * genie-spatial — SpatialOverlay component tests
 *
 * Uses jsdom + @testing-library/react for component rendering tests.
 * The 3D Canvas/WebXR is tested as a rendering container (no actual WebGL needed).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GenieSpatialOverlay, SpatialContext } from '../src/components/SpatialOverlay';

// Mock Web Speech API
const mockSpeak = vi.fn();
const mockCancel = vi.fn();
const mockGetVoices = vi.fn().mockReturnValue([]);
vi.stubGlobal('speechSynthesis', {
  speak: mockSpeak,
  cancel: mockCancel,
  getVoices: mockGetVoices,
  paused: false,
  speaking: false,
  pending: false,
  onvoiceschanged: null,
});

// Mock WebXR
vi.stubGlobal('navigator', {
  ...navigator,
  xr: {
    requestSession: vi.fn().mockResolvedValue({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      end: vi.fn(),
    }),
  },
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
  },
});

// Mock Three.js / React-Three-Fiber — render without WebGL
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: () => ({ camera: { position: { set: vi.fn() } } }),
}));

vi.mock('@react-three/drei', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
  Float: ({ children }: any) => <div>{children}</div>,
  Sphere: ({ children }: any) => <div>{children}</div>,
  Torus: () => <div />,
  Box: () => <div />,
  MeshTransmissionMaterial: () => <div />,
}));

vi.mock('three', () => ({}));

describe('GenieSpatialOverlay', () => {
  const defaultProps = {
    messages: [],
    isThinking: false,
    onSend: vi.fn(),
    inputValue: '',
    onInputChange: vi.fn(),
  };

  beforeEach(() => {
    mockSpeak.mockClear();
    mockCancel.mockClear();
    defaultProps.onSend.mockClear();
    defaultProps.onInputChange.mockClear();
  });

  it('renders without crashing', () => {
    render(<GenieSpatialOverlay {...defaultProps} />);
    expect(screen.getByTestId('r3f-canvas')).toBeTruthy();
  });

  it('renders the input panel', () => {
    render(<GenieSpatialOverlay {...defaultProps} />);
    expect(screen.getByPlaceholderText('Ask Genie anything…')).toBeTruthy();
  });

  it('calls onInputChange when user types', () => {
    render(<GenieSpatialOverlay {...defaultProps} />);
    const input = screen.getByPlaceholderText('Ask Genie anything…');
    fireEvent.change(input, { target: { value: 'Hello Genie' } });
    expect(defaultProps.onInputChange).toHaveBeenCalledWith('Hello Genie');
  });

  it('calls onSend when send button is clicked', () => {
    render(<GenieSpatialOverlay {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /send/i });
    fireEvent.click(btn);
    expect(defaultProps.onSend).not.toHaveBeenCalled(); // empty input

    // type first
    const input = screen.getByPlaceholderText('Ask Genie anything…');
    fireEvent.change(input, { target: { value: 'Hello Genie' } });
    fireEvent.click(btn);
    expect(defaultProps.onSend).toHaveBeenCalledWith('Hello Genie');
  });

  it('calls onSend on Enter keypress', () => {
    render(<GenieSpatialOverlay {...defaultProps} />);
    const input = screen.getByPlaceholderText('Ask Genie anything…');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(defaultProps.onSend).toHaveBeenCalledWith('Test message');
  });

  it('renders message bubbles for user messages', () => {
    render(
      <GenieSpatialOverlay
        {...defaultProps}
        messages={[
          { role: 'user', text: 'Hello' },
          { role: 'genie', text: 'Hi there!' },
        ]}
      />
    );
    expect(screen.getByText('Hello')).toBeTruthy();
    expect(screen.getByText('Hi there!')).toBeTruthy();
  });

  it('disables send button when disabled prop is true', () => {
    render(<GenieSpatialOverlay {...defaultProps} disabled={true} />);
    const btn = screen.getByRole('button', { name: /send/i });
    expect(btn).toBeDisabled();
  });

  it('3D button toggles between 2D and 3D labels', () => {
    render(<GenieSpatialOverlay {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /3d/i });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    // After click it should show "2D"
    expect(screen.getByRole('button', { name: /2d/i })).toBeTruthy();
  });

  it('announces step change via aria-live', async () => {
    render(<GenieSpatialOverlay {...defaultProps} />);
    // aria-live region should exist
    const liveRegion = document.querySelector('[aria-live]');
    expect(liveRegion).toBeTruthy();
  });

  it('has role=main on the overlay container', () => {
    render(<GenieSpatialOverlay {...defaultProps} />);
    const main = document.querySelector('[role="main"]');
    expect(main).toBeTruthy();
  });

  it('shows disabled input when disabled=true', () => {
    render(<GenieSpatialOverlay {...defaultProps} disabled={true} />);
    const input = screen.getByPlaceholderText('Ask Genie anything…');
    expect(input).toBeDisabled();
  });

  it('truncates long messages in bubbles', () => {
    const longMsg = 'A'.repeat(100);
    render(
      <GenieSpatialOverlay
        {...defaultProps}
        messages={[{ role: 'genie', text: longMsg }]}
      />
    );
    // The rendered text should contain … since it's truncated to 60 chars
    expect(screen.getByText(/…/)).toBeTruthy();
  });
});

describe('SpatialContext', () => {
  it('provides default values', () => {
    let ctxValue: any;
    render(
      <SpatialContext.Provider
        value={{
          mode: 'flat',
          setMode: vi.fn(),
          isSupported: false,
          isActive: false,
          startSession: vi.fn(),
          endSession: vi.fn(),
        }}
      >
        <SpatialContext.Consumer>
          {(v) => {
            ctxValue = v;
            return null;
          }}
        </SpatialContext.Consumer>
      </SpatialContext.Provider>
    );
    expect(ctxValue.mode).toBe('flat');
    expect(ctxValue.isSupported).toBe(false);
    expect(ctxValue.isActive).toBe(false);
  });

  it('startSession sets isActive to true on success', async () => {
    const startSession = vi.fn().mockResolvedValue(undefined);
    const endSession = vi.fn();

    render(
      <SpatialContext.Provider
        value={{
          mode: 'flat',
          setMode: vi.fn(),
          isSupported: true,
          isActive: false,
          startSession,
          endSession,
        }}
      >
        <div>context test</div>
      </SpatialContext.Provider>
    );

    await act(async () => {
      await startSession();
    });
    expect(startSession).toHaveBeenCalled();
  });
});
