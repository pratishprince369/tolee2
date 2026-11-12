/**
 * Tolee Age Verification & Legal Consent Utility
 * 
 * Minimum registration age is 13+ years old.
 * Users below 13 years are strictly rejected.
 * Users aged 13-17 require verifiable parental / guardian consent acknowledgment.
 */

export const MINIMUM_REGISTRATION_AGE = 13;
export const ADULT_AGE = 18;
export const CURRENT_CONSENT_POLICY_VERSION = 'v1.0';

export const UNDERAGE_ERROR_MESSAGE = 'Sorry! You must be at least 13 years old to join Tolee.';

/**
 * Calculates exact age in full completed years from a given Date of Birth.
 */
export function calculateAge(dobInput: Date | string): number {
  const dob = typeof dobInput === 'string' ? new Date(dobInput) : dobInput;
  if (isNaN(dob.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

export interface AgeValidationInput {
  dateOfBirth?: string | Date | null;
  termsAccepted?: boolean;
  privacyPolicyAccepted?: boolean;
  communityGuidelinesAccepted?: boolean;
  parentalConsentGranted?: boolean;
}

export interface AgeValidationResult {
  valid: boolean;
  error?: string;
  age: number;
  parsedDob: Date | null;
  isMinor: boolean; // age >= 13 && age < 18
}

/**
 * Validates Date of Birth and Legal Consent both on frontend and backend.
 */
export function validateAgeAndConsent(input: AgeValidationInput): AgeValidationResult {
  if (!input.dateOfBirth) {
    return {
      valid: false,
      error: 'Date of Birth is required to verify your age eligibility.',
      age: 0,
      parsedDob: null,
      isMinor: false,
    };
  }

  const dob = typeof input.dateOfBirth === 'string' ? new Date(input.dateOfBirth) : input.dateOfBirth;
  if (isNaN(dob.getTime())) {
    return {
      valid: false,
      error: 'Please enter a valid Date of Birth.',
      age: 0,
      parsedDob: null,
      isMinor: false,
    };
  }

  const today = new Date();
  if (dob > today) {
    return {
      valid: false,
      error: 'Date of Birth cannot be in the future.',
      age: 0,
      parsedDob: dob,
      isMinor: false,
    };
  }

  // Reject unrealistic dates (e.g. over 120 years ago)
  if (today.getFullYear() - dob.getFullYear() > 120) {
    return {
      valid: false,
      error: 'Please enter a valid Date of Birth.',
      age: 0,
      parsedDob: dob,
      isMinor: false,
    };
  }

  const age = calculateAge(dob);

  // Strict 13+ requirement
  if (age < MINIMUM_REGISTRATION_AGE) {
    return {
      valid: false,
      error: UNDERAGE_ERROR_MESSAGE,
      age,
      parsedDob: dob,
      isMinor: false,
    };
  }

  // Mandatory legal policies consent check
  const termsOk = input.termsAccepted === true;
  const privacyOk = input.privacyPolicyAccepted === true;
  const guidelinesOk = input.communityGuidelinesAccepted === true;

  if (!termsOk || !privacyOk || !guidelinesOk) {
    return {
      valid: false,
      error: 'You must confirm that you are at least 13 years old and agree to Tolee’s Terms & Conditions, Privacy Policy, and Community Guidelines.',
      age,
      parsedDob: dob,
      isMinor: age < ADULT_AGE,
    };
  }

  const isMinor = age >= MINIMUM_REGISTRATION_AGE && age < ADULT_AGE;

  // Additional verifiable parental / guardian consent for users aged 13-17
  if (isMinor && input.parentalConsentGranted !== true) {
    return {
      valid: false,
      error: 'Parental or legal guardian permission is required for users under 18 years old.',
      age,
      parsedDob: dob,
      isMinor: true,
    };
  }

  return {
    valid: true,
    age,
    parsedDob: dob,
    isMinor,
  };
}
