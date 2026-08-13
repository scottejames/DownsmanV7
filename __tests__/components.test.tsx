import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginDialog from '@/components/LoginDialog';
import RegisterDialog from '@/components/RegisterDialog';
import ScoutDialog from '@/components/ScoutDialog';

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

  it('shows a fallback error instead of crashing on a bare 500 (no JSON body)', async () => {
    // Regression test: a real prod incident where a 500 with an empty body
    // (e.g. an unhandled server exception) crashed res.json() uncaught,
    // leaving the form silently stuck with no feedback at all.
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')) });
    render(<RegisterDialog onClose={mockClose} />);
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pass1' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'pass1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });
});

describe('ScoutDialog', () => {
  it('guards a double-click so onSave only fires once (CODE_REVIEW_2026-08-13.md H2)', async () => {
    // Both clicks are dispatched inside one `act()` so React hasn't committed the
    // loading-state re-render (and the button's `disabled` attribute) between them -
    // this reproduces the actual race the ref guard exists for, not just "the button
    // was already disabled by the time the second click happened."
    let resolveSave: () => void = () => {};
    const onSave = jest.fn(() => new Promise<void>(resolve => { resolveSave = resolve; }));
    const onClose = jest.fn();

    render(<ScoutDialog scout={null} onSave={onSave} onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'Test Scout' } });
    const saveButton = screen.getByRole('button', { name: 'Save' });

    await act(async () => {
      fireEvent.click(saveButton);
      fireEvent.click(saveButton);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    await act(async () => { resolveSave(); });
  });
});
