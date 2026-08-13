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

  it('prompts for a new password on a NEW_PASSWORD_REQUIRED challenge, then logs in', async () => {
    const user = { id: '1', username: 'test', admin: false, breakLock: false };
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ challenge: 'NEW_PASSWORD_REQUIRED', session: 'sess-1', username: 'test' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(user) });

    render(<LoginDialog onLogin={mockLogin} onClose={mockClose} />);
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'test' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'temp-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('heading', { name: 'Set a new password' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'newpass1' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'newpass1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));

    await screen.findByPlaceholderText('New password');
    expect(mockLogin).toHaveBeenCalledWith(user);
    const secondCallBody = JSON.parse((fetch as jest.Mock).mock.calls[1][1].body);
    expect(secondCallBody).toMatchObject({ action: 'completeNewPassword', username: 'test', newPassword: 'newpass1', session: 'sess-1' });
  });

  it('shows an error when the new passwords do not match', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ challenge: 'NEW_PASSWORD_REQUIRED', session: 'sess-1', username: 'test' }),
    });
    render(<LoginDialog onLogin={mockLogin} onClose={mockClose} />);
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'test' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'temp-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await screen.findByRole('heading', { name: 'Set a new password' });
    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'one' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'two' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
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
