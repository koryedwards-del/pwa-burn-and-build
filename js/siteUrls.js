/** Canonical site URLs — burnandbuilddiet.com */

export const MARKETING_ORIGIN = 'https://burnandbuilddiet.com';
export const CREATOR_HOST_ORIGIN = MARKETING_ORIGIN;

/** Landing + intake entry — welcome intro, then questionnaire steps */
export const QUESTIONNAIRE_ENTRY_URL = `${CREATOR_HOST_ORIGIN}/questionnaire/`;

/** @deprecated Use QUESTIONNAIRE_ENTRY_URL */
export const INTAKE_ENTRY_URL = QUESTIONNAIRE_ENTRY_URL;

/** Paywall + checkout return (after questionnaire builds the program) */
export const CREATOR_CHECKOUT_URL = `${CREATOR_HOST_ORIGIN}/createyourfoodplan/?browse=1`;

/** @deprecated Use CREATOR_CHECKOUT_URL */
export const CREATOR_ENTRY_URL = CREATOR_CHECKOUT_URL;

/** Purchased program deliverable — welcome, food plan, servings */
export const PROGRAM_REPORT_URL = `${CREATOR_HOST_ORIGIN}/program-report/`;
export const MEALPLANNER_URL = `${CREATOR_HOST_ORIGIN}/mealplanner/`;
export const MYPLAN_URL = `${CREATOR_HOST_ORIGIN}/myplan/`;
