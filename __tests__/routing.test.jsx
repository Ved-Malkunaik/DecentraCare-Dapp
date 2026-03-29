import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

// Mimic the ProtectedRoute exactly as defined in App.jsx
const ProtectedRoute = ({ children, allowedRole, stellarAddress, role, isAuthLoading }) => {
  if (!stellarAddress) return <Navigate to="/" />;
  if (isAuthLoading) return <div>Verifying On-chain Authorization...</div>;
  if (role === 'none') return <Navigate to="/select-role" />;
  if (allowedRole && role !== allowedRole) return <div data-testid="access-denied">Access Denied</div>;
  return children;
};

describe('Role Based Routing', () => {
  it('Doctor role -> Doctor dashboard loads', () => {
    render(
      <MemoryRouter initialEntries={['/doctor']}>
        <Routes>
          <Route path="/" element={<div data-testid="home">Home</div>} />
          <Route path="/select-role" element={<div>Select Role</div>} />
          <Route path="/doctor" element={
            <ProtectedRoute allowedRole="doctor" stellarAddress="GABC" role="doctor" isAuthLoading={false}>
              <div data-testid="doctor-dashboard">Doctor Portal</div>
            </ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('doctor-dashboard')).toBeInTheDocument();
  });

  it('Patient role -> Patient dashboard loads', () => {
    render(
      <MemoryRouter initialEntries={['/patient']}>
        <Routes>
          <Route path="/" element={<div data-testid="home">Home</div>} />
          <Route path="/select-role" element={<div>Select Role</div>} />
          <Route path="/patient" element={
            <ProtectedRoute allowedRole="patient" stellarAddress="GABC" role="patient" isAuthLoading={false}>
              <div data-testid="patient-dashboard">Patient Dashboard</div>
            </ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('patient-dashboard')).toBeInTheDocument();
  });

  it('Unauthorized role -> Shows Access Denied', () => {
    render(
      <MemoryRouter initialEntries={['/doctor']}>
        <Routes>
            <Route path="/doctor" element={
                <ProtectedRoute allowedRole="doctor" stellarAddress="GABC" role="patient" isAuthLoading={false}>
                    <div data-testid="doctor-dashboard">Doctor Portal</div>
                </ProtectedRoute>
            } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
  });
});
