import { test, expect } from '@playwright/test';

// Use a unique email for every test run to prevent DB conflicts
const testEmail = `qa-otp-${Date.now()}@tolee.in`;
const testPassword = 'Password@1234';
const newPassword = 'NewPassword@1234';

test.describe('Forgot Password & Email OTP System E2E', () => {
  
  test('1. Registration and Verification OTP Flow', async ({ page }) => {
    // Go to sign up page
    await page.goto('/auth/signup');
    await expect(page.locator('h1')).toContainText('Sign Up for Tolee');

    // Fill registration info
    await page.locator('input[placeholder="Your Name"]').fill('E2E OTP User');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);

    // Set up request listener to capture the OTP returned in test mode
    const registerResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/auth/register') && response.status() === 200
    );

    // Submit registration
    await page.locator('button[type="submit"]').click();

    // Retrieve OTP from intercepted response
    const registerResponse = await registerResponsePromise;
    const registerData = await registerResponse.json();
    const otp = registerData.otp;
    
    expect(otp).toBeDefined();
    expect(otp.length).toBe(6);

    // Verify redirect to OTP page
    await page.waitForURL('**/auth/verify-email*');
    await expect(page.locator('h1')).toContainText('Verify Your Email');

    // Test invalid OTP
    await page.locator('input[placeholder="123456"]').fill('999999');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.text-red-500')).toContainText('Invalid verification code');

    // Test successful verification with captured OTP
    await page.locator('input[placeholder="123456"]').clear();
    await page.locator('input[placeholder="123456"]').fill(otp);
    await page.locator('button[type="submit"]').click();

    // Verify redirected to feed/login on successful verification
    await page.waitForURL(url => !url.pathname.includes('verify-email'), { timeout: 15000 });
    expect(page.url()).not.toContain('verify-email');
  });

  test('2. Unverified Account Login Block & Redirect', async ({ page }) => {
    const unverifiedEmail = `qa-block-${Date.now()}@tolee.in`;
    
    // Register but do NOT verify (leave page immediately)
    await page.goto('/auth/signup');
    await page.locator('input[placeholder="Your Name"]').fill('Blocked User');
    await page.locator('input[type="email"]').fill(unverifiedEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/auth/verify-email*');

    // Attempt to log in via signin page
    await page.goto('/auth/signin');
    await page.locator('input[type="email"]').fill(unverifiedEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();

    // Check that we are automatically redirected back to verify-email
    await page.waitForURL('**/auth/verify-email*');
    await expect(page.locator('h1')).toContainText('Verify Your Email');
  });

  test('3. Forgot Password Request, Verification and Reset', async ({ page }) => {
    const forgotEmail = `qa-forgot-${Date.now()}@tolee.in`;

    // Step A: Register the user first
    await page.goto('/auth/signup');
    await page.locator('input[placeholder="Your Name"]').fill('Forgot Password User');
    await page.locator('input[type="email"]').fill(forgotEmail);
    await page.locator('input[type="password"]').fill(testPassword);

    const registerResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/auth/register') && response.status() === 200
    );
    await page.locator('button[type="submit"]').click();

    const registerResponse = await registerResponsePromise;
    const registerData = await registerResponse.json();
    const registerOtp = registerData.otp;

    await page.waitForURL('**/auth/verify-email*');

    // Verify OTP to register and activate the user account
    await page.locator('input[placeholder="123456"]').fill(registerOtp);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(url => !url.pathname.includes('verify-email'), { timeout: 15000 });

    // Step B: Clear cookies/session to sign out so we can reset password
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Go to login page
    await page.goto('/auth/signin');
    
    // Click Forgot Password link
    const forgotLink = page.locator('#forgot-password-link');
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();

    // Verify redirect to forgot password page
    await page.waitForURL('**/auth/forgot-password*');
    await expect(page.locator('h1')).toContainText('Reset Password');

    // Submit email
    await page.locator('input[type="email"]').fill(forgotEmail);
    
    // Listen for forgot password OTP
    const otpResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/auth/forgot-password/request') && response.status() === 200
    );

    await page.locator('button[type="submit"]').click();

    const otpResponse = await otpResponsePromise;
    const otpData = await otpResponse.json();
    const resetOtp = otpData.otp;

    expect(resetOtp).toBeDefined();
    expect(resetOtp.length).toBe(6);

    // Verify OTP field appeared (Step 2)
    await expect(page.locator('label:has-text("Enter 6-Digit OTP")')).toBeVisible();

    // Test invalid OTP code
    await page.locator('input[placeholder="123456"]').fill('000000');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('.text-red-500')).toContainText('Invalid OTP');

    // Test valid OTP
    await page.locator('input[placeholder="123456"]').clear();
    await page.locator('input[placeholder="123456"]').fill(resetOtp);
    await page.locator('button[type="submit"]').click();

    // Verify password reset fields appeared (Step 3)
    await expect(page.locator('label:has-text("New Password")').first()).toBeVisible();

    // Reset password
    await page.locator('input[placeholder="••••••••"]').first().fill(newPassword);
    await page.locator('input[placeholder="••••••••"]').last().fill(newPassword);
    await page.locator('button[type="submit"]').click();

    // Verify redirect or success block
    await page.waitForURL('**/auth/signin*');

    // Attempt login with new password
    await page.locator('input[type="email"]').fill(forgotEmail);
    await page.locator('input[type="password"]').fill(newPassword);
    await page.locator('button[type="submit"]').click();

    // Verify logged in
    await page.waitForURL('**/feed*');
  });

});
