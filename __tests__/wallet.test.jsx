import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Navbar from '../src/components/Navbar';

// Mock context directly
const mockUseWallet = vi.fn();
vi.mock('../src/context/WalletContext', async () => {
  const original = await vi.importActual('../src/context/WalletContext');
  return {
    ...original,
    useWallet: () => mockUseWallet()
  };
});

describe('Navbar Wallet Integration', () => {
  it('shows Connect Freighter button when disconnected', () => {
    mockUseWallet.mockReturnValue({
      stellarAddress: '',
      connectStellar: vi.fn(),
      disconnectStellar: vi.fn(),
      role: 'none',
      setRole: vi.fn()
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByText(/Connect Freighter/i)).toBeInTheDocument();
  });

  it('displays shortened address and role when connected', () => {
    mockUseWallet.mockReturnValue({
      stellarAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      connectStellar: vi.fn(),
      disconnectStellar: vi.fn(),
      role: 'doctor',
      setRole: vi.fn()
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Connect Freighter/i)).not.toBeInTheDocument();
    expect(screen.getByText('doctor')).toBeInTheDocument();
    expect(screen.getByText(/GAAAA\.\.\.AWHF/i)).toBeInTheDocument();
  });
});
