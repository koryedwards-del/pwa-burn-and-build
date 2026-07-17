/** Canonical site URLs — burnandbuilddiet.com */

export const MARKETING_ORIGIN = 'https://burnandbuilddiet.com';
export const CREATOR_HOST_ORIGIN = MARKETING_ORIGIN;

/** Landing CTAs — questionnaire welcome only */
export const QUESTIONNAIRE_WELCOME_URL = `${CREATOR_HOST_ORIGIN}/questionnaire/#welcome`;

/** Paywall + checkout return (after questionnaire builds the program) */
export const CREATOR_CHECKOUT_URL = `${CREATOR_HOST_ORIGIN}/createyourfoodplan/`;

/** Desktop checkout resume — plan-ready paywall after questionnaire */
export const DESKTOP_CHECKOUT_URL = CREATOR_CHECKOUT_URL;
