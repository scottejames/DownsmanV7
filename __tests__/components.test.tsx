import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginDialog from '@/components/LoginDialog';
import RegisterDialog from '@/components/RegisterDialog';

global.fetch = jest.fn();

beforeEach(() => {
  (fetch as jest.Mock).mockReset();
});

describe('LoginDialog', () => {
  const mockLogin = jest.fn();
  const mockClose = jest.fn();

  beforeEach(() => { mockLogin.mockReset(); mockClose.mockReset(); });

  it('renders login form', () => {
    render(<LoginDialog onLogin={mockLogin} onClose={mockClose} />);
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onClose when Cancel clicked', () => {
    render(<LoginDialog onLogin={mockLogin} onClose={mockClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockClose).toHaveBeenCalled();
  });

  it('shows error on failed login', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    render(<LoginDialog onLogin={mockLogin} onClose={mockClose} />);
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'user' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
  });

  it('calls onLogin with user data on success', async () => {
    const user = { id: '1', username: 'test', admin: false, breakLock: false };
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(user) });
    render(<LoginDialog onLogin={mockLogin} onClose={mockClose} />);
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'test' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    await screen.findByPlaceholderText('Username');
    expect(mockLogin).toHaveBeenCalledWith(user);
  });
});

describe('RegisterDialog', () => {
  const mockClose = jest.fn();

  beforeEach(() => mockClose.mockReset());

  it('renders registration form fields', () => {
    render(<RegisterDialog onClose={mockClose} />);
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Phone')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    render(<RegisterDialog onClose={mockClose} />);
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pass1' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'pass2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  });

  it('shows success message after registration', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    render(<RegisterDialog onClose={mockClose} />);
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pass' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(await screen.findByText('Success!')).toBeInTheDocument();
  });
});
