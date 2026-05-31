import { useState } from 'react';
import { signUp, signIn, forgotPassword, resetPassword, verifyOtp } from './api.js';

function Login({ onLogin, mode = 'signin', onBack, onForgot, onAuthModeChange }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [forgotStep, setForgotStep] = useState('request');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpDestination, setOtpDestination] = useState('');

  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';
  const title = isSignup
    ? 'Create a new account'
    : isForgot
    ? 'Recover account'
    : 'Sign in to your digital store';
  const subtitle = isSignup
    ? 'Sign up to start shopping premium digital downloads and access instant delivery.'
    : isForgot
    ? 'Enter the email or phone number you used to register and verify with OTP.'
    : 'Access product downloads, manage your cart, and complete purchases securely.';
  const buttonLabel = isSignup ? 'Create account' : isForgot ? 'Send OTP' : 'Sign in';

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (isSignup) {
      // Signup validation
      if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.address.trim() || !formData.password.trim()) {
        setError('Please fill in all required fields.');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password needs to be at least 6 characters.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!/^\d{10,}$/.test(formData.phone.replace(/\D/g, ''))) {
        setError('Please enter a valid phone number (at least 10 digits).');
        return;
      }

      try {
        const response = await signUp({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          password: formData.password,
        });
        setError('');
        onLogin({
          ...response.user,
          token: response.token,
        });
        return;
      } catch (error) {
        setError(error.message);
        return;
      }
    }

    if (isForgot && forgotStep === 'request') {
      const emailValue = formData.email.trim();
      const phoneValue = formData.phone.trim();
      if (!emailValue || !phoneValue) {
        setError('Both email and phone number are required.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!/^\d{10,}$/.test(phoneValue.replace(/\D/g, ''))) {
        setError('Please enter a valid phone number (at least 10 digits).');
        return;
      }

      try {
        await forgotPassword(emailValue, phoneValue);
        setOtpDestination(emailValue);
        setForgotStep('verify');
        setError('');
      } catch (error) {
        setError(error.message || 'Verification failed. Please check your credentials.');
      }
      return;
    }

    if (isForgot && forgotStep === 'verify') {
      if (!enteredOtp.trim()) {
        setError('Enter the OTP sent to your email.');
        return;
      }
      try {
        await verifyOtp(otpDestination, enteredOtp.trim());
        setError('');
        setForgotStep('reset');
      } catch (error) {
        setError(error.message || 'OTP verification failed. Please try again.');
      }
      return;
    }

    if (isForgot && forgotStep === 'reset') {
      if (!formData.password.trim() || !formData.confirmPassword.trim()) {
        setError('Enter and confirm your new password.');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password needs to be at least 6 characters.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      try {
        await resetPassword(otpDestination, formData.password, enteredOtp.trim());
        setError('');
        setForgotStep('done');
      } catch (error) {
        setError(error.message || 'Failed to reset password. Please try again.');
      }
      return;
    }

    // Signin validation
    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password needs to be at least 6 characters.');
      return;
    }

    try {
      const response = await signIn({
        email: formData.email,
        password: formData.password,
      });
      setError('');
      onLogin({
        ...response.user,
        token: response.token,
      });
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div>
          <p className="eyebrow">{isSignup ? 'Get started' : 'Welcome back'}</p>
          <h1>{title}</h1>
          <p className="login-copy">{subtitle}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(event) => handleInputChange('name', event.target.value)}
                placeholder="Enter your full name"
              />

              <label htmlFor="phone">Phone number</label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(event) => handleInputChange('phone', event.target.value)}
                placeholder="Enter your phone number"
              />

              <label htmlFor="address">House address</label>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={(event) => handleInputChange('address', event.target.value)}
                placeholder="Enter your complete address"
              />
            </>
          )}

          {isForgot ? (
            forgotStep === 'request' ? (
              <>
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(event) => handleInputChange('email', event.target.value)}
                  placeholder="you@example.com"
                />

                <label htmlFor="phone">Phone number</label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => handleInputChange('phone', event.target.value)}
                  placeholder="Enter your phone number"
                />

                {error && <p className="form-error">{error}</p>}
                <button type="submit" className="login-submit">
                  Send OTP
                </button>
              </>
            ) : forgotStep === 'verify' ? (
              <>
                <p className="info-text">OTP sent to {otpDestination}. Please enter the code below to verify your account.</p>

                <label htmlFor="otp">Enter OTP</label>
                <input
                  id="otp"
                  type="text"
                  value={enteredOtp}
                  onChange={(event) => setEnteredOtp(event.target.value)}
                  placeholder="Enter verification code"
                />

                {error && <p className="form-error">{error}</p>}
                <button type="submit" className="login-submit">
                  Verify OTP
                </button>
              </>
            ) : forgotStep === 'reset' ? (
              <>
                <p className="info-text">Set your new password for {otpDestination}.</p>

                <label htmlFor="password">New password</label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(event) => handleInputChange('password', event.target.value)}
                  placeholder="Enter your new password"
                />

                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(event) => handleInputChange('confirmPassword', event.target.value)}
                  placeholder="Re-enter your new password"
                />

                {error && <p className="form-error">{error}</p>}
                <button type="submit" className="login-submit">
                  Reset password
                </button>
              </>
            ) : (
              <>
                <p className="success-text">Password changed successfully. Please sign in with your new password.</p>
                <button
                  type="button"
                  className="login-submit"
                  onClick={() => {
                    setForgotStep('request');
                    setGeneratedOtp('');
                    setEnteredOtp('');
                    setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
                    onAuthModeChange?.('signin');
                  }}
                >
                  Return to sign in
                </button>
              </>
            )
          ) : (
            <>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(event) => handleInputChange('email', event.target.value)}
                placeholder="you@example.com"
              />

              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(event) => handleInputChange('password', event.target.value)}
                placeholder="Enter at least 6 characters"
              />

              {error && <p className="form-error">{error}</p>}

              <button type="submit" className="login-submit">
                {buttonLabel}
              </button>

              {!isSignup && (
                <button type="button" className="forgot-password" onClick={onForgot}>
                  Forgot password/email?
                </button>
              )}
            </>
          )}
        </form>

        {onBack && (
          <button type="button" className="login-back" onClick={onBack}>
            Back to home
          </button>
        )}
      </div>
    </div>
  );
}

export default Login;
