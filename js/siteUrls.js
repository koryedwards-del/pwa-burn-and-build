/** Canonical site URLs — burnandbuilddiet.com */

export const MARKETING_ORIGIN = 'https://burnandbuilddiet.com';
export const CREATOR_HOST_ORIGIN = MARKETING_ORIGIN;

/** Landing CTAs — questionnaire welcome only */
export const QUESTIONNAIRE_WELCOME_URL = `${CREATOR_HOST_ORIGIN}/questionnaire/#welcome`;

/** @deprecated Use QUESTIONNAIRE_WELCOME_URL */
export const QUESTIONNAIRE_ENTRY_URL = QUESTIONNAIRE_WELCOME_URL;

/** @deprecated Use QUESTIONNAIRE_ENTRY_URL */
export const INTAKE_ENTRY_URL = QUESTIONNAIRE_ENTRY_URL;

/** Paywall + checkout return (after questionnaire builds the program) */
export const CREATOR_CHECKOUT_URL = `${CREATOR_HOST_ORIGIN}/createyourfoodplan/?browse=1&funnel=1`;

/** Browse creator without forcing checkout (marketing links) */
export const CREATOR_BROWSE_URL = `${CREATOR_HOST_ORIGIN}/createyourfoodplan/?browse=1`;

/** @deprecated Use CREATOR_CHECKOUT_URL */
export const CREATOR_ENTRY_URL = CREATOR_CHECKOUT_URL;

/** Purchased program deliverable — welcome, food plan, servings */
export const PROGRAM_REPORT_URL = `${CREATOR_HOST_ORIGIN}/program-report/`;
export const MEALPLANNER_URL = `${CREATOR_HOST_ORIGIN}/mealplanner/`;
export const MYPLAN_URL = `${CREATOR_HOST_ORIGIN}/myplan/`;
