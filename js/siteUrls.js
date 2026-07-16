/**
 * Site URLs — marketing vs creator host.
 *
 * burnandbuilddiet.com may serve landing-only until DNS points at this repo’s
 * GitHub Pages build. Creator, checkout return, and program paths live on
 * gettheburnandbuildapp.com until then (planned redirect: gettheburn → burnandbuild).
 */

export const MARKETING_ORIGIN = 'https://burnandbuilddiet.com';
export const CREATOR_HOST_ORIGIN = 'https://gettheburnandbuildapp.com';

export const CREATOR_ENTRY_URL = `${CREATOR_HOST_ORIGIN}/createyourfoodplan/?browse=1`;
export const PROGRAM_REPORT_URL = `${CREATOR_HOST_ORIGIN}/program-report/`;
export const MEALPLANNER_URL = `${CREATOR_HOST_ORIGIN}/mealplanner/`;
export const MYPLAN_URL = `${CREATOR_HOST_ORIGIN}/myplan/`;
