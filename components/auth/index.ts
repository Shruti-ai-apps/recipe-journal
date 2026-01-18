/**
 * Auth components exports
 * Using passwordless Email OTP authentication
 */

export { default as LoginForm } from './LoginForm';
export { default as OtpInput } from './OtpInput';
export { default as UserMenu } from './UserMenu';

// Legacy exports removed (not needed with passwordless):
// - SignupForm (OTP handles both signup and login)
// - ForgotPasswordForm (no password to forget)
// - SocialLoginButtons (integrated into LoginForm)
