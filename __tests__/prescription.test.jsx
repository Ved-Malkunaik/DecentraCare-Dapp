import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import DoctorDashboard from '../src/pages/DoctorDashboard';

// Mock context directly
const mockUseWallet = vi.fn();
vi.mock('../src/context/WalletContext', async () => {
  const original = await vi.importActual('../src/context/WalletContext');
  return {
    ...original,
    useWallet: () => mockUseWallet()
  };
});

// Mock sorobanService
vi.mock('../src/services/sorobanService', () => {
    return {
        sorobanService: {
            checkRegistry: vi.fn().mockResolvedValue(true),
            createPrescription: vi.fn().mockResolvedValue({ hash: 'mock_tx_hash' }),
            storeConsultationProof: vi.fn().mockResolvedValue({}),
            completeAppointment: vi.fn().mockResolvedValue({}),
            getPendingAppointments: vi.fn().mockResolvedValue([]),
            getAuthorizedPatients: vi.fn().mockResolvedValue([]),
            getConsultationsByDoctor: vi.fn().mockResolvedValue([]),
            getExplorerUrl: vi.fn().mockReturnValue('mock_url')
        }
    };
});

// Mock crypto module for generateHash
Object.defineProperty(global, 'crypto', {
    value: {
        subtle: {
            digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
        }
    }
});
// Need TextEncoder mock if purely inside JS DOM without it mapped
if (typeof TextEncoder === 'undefined') {
    global.TextEncoder = class {
        encode(str) { return new Uint8Array(); }
    };
}

describe('Prescription Creation Flow UI', () => {
  it('handles the correct transaction flow for creating prescriptions', async () => {
    mockUseWallet.mockReturnValue({
      stellarAddress: 'GABCD',
      role: 'doctor',
    });

    render(
      <MemoryRouter>
        <DoctorDashboard />
      </MemoryRouter>
    );

    // Fill form
    const patientInput = screen.getByPlaceholderText(/Paste Patient's G... address/i);
    const medicineInput = screen.getByPlaceholderText(/e.g. Paracetamol/i);
    
    // Simulate user writing
    fireEvent.change(patientInput, { target: { value: 'GPATIENT123' } });
    fireEvent.change(medicineInput, { target: { value: 'Advil 200mg' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Sign & Sync to Soroban/i });
    fireEvent.click(submitBtn);

    // Verify loading state
    expect(screen.getByText(/Verifying Permission/i)).toBeInTheDocument();

    // Wait for mock resolving and success message
    await waitFor(() => {
        expect(screen.getByText(/Prescription Created/i)).toBeInTheDocument();
        expect(screen.getByText(/Record has been permanently hashed/i)).toBeInTheDocument();
    });

    // Verify that prescription ID area is shown
    expect(screen.getByText(/Prescription Hash/i)).toBeInTheDocument();
  });
});
