/** Canonical site URLs — burnandbuilddiet.com */

export const MARKETING_ORIGIN = 'https://burnandbuilddiet.com';
export const CREATOR_HOST_ORIGIN = MARKETING_ORIGIN;

/** Desktop intake — questionnaire → paywall → program report */
export const INTAKE_ENTRY_URL = `${CREATOR_HOST_ORIGIN}/questionnaire/?browse=1`;

/** Paywall + checkout return (after questionnaire builds the program) */
export const CREATOR_CHECKOUT_URL = `${CREATOR_HOST_ORIGIN}/createyourfoodplan/?browse=1`;

/** @deprecated Use INTAKE_ENTRY_URL for marketing CTAs; checkout still uses CREATOR_CHECKOUT_URL */
export const CREATOR_ENTRY_URL = CREATOR_CHECKOUT_URL;

export const PROGRAM_REPORT_URL = `${CREATOR_HOST_ORIGIN}/program-report/`;
export const MEALPLANNER_URL = `${CREATOR_HOST_ORIGIN}/mealplanner/`;
export const MYPLAN_URL = `${CREATOR_HOST_ORIGIN}/myplan/`;
