import i18n from '~/shared/lib/i18n';

/**
 * Validation constants for forms
 */
export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
  },
  PASSWORD: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 128,
  },
  EMAIL: {
    MAX_LENGTH: 255,
  },
} as const;

/**
 * Validation error messages with i18n support
 */
export const getValidationMessages = () => ({
  REQUIRED: {
    EMAIL: i18n.t('validation.emailRequired'),
    USERNAME: i18n.t('validation.usernameRequired'), 
    PASSWORD: i18n.t('validation.passwordRequired'),
    PASSWORD_CONFIRM: i18n.t('validation.passwordConfirmRequired'),
  },
  INVALID: {
    EMAIL: i18n.t('validation.emailInvalid'),
    PASSWORD_MISMATCH: i18n.t('validation.passwordsMismatch'),
  },
  LENGTH: {
    USERNAME_MIN: i18n.t('validation.usernameMinLength', { min: VALIDATION_RULES.USERNAME.MIN_LENGTH }),
    USERNAME_MAX: i18n.t('validation.usernameMaxLength', { max: VALIDATION_RULES.USERNAME.MAX_LENGTH }),
    PASSWORD_MIN: i18n.t('validation.passwordMinLength', { min: VALIDATION_RULES.PASSWORD.MIN_LENGTH }),
    PASSWORD_MAX: i18n.t('validation.passwordMaxLength', { max: VALIDATION_RULES.PASSWORD.MAX_LENGTH }),
    EMAIL_MAX: i18n.t('validation.emailMaxLength', { max: VALIDATION_RULES.EMAIL.MAX_LENGTH }),
  },
});