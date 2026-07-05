/** Client results and representative transformation stories. */

import { renderTestimonyBlock } from './testimonyBlock.js';

export const TRANSFORMATIONS = [
  {
    id: 'eight-week-example',
    type: 'before-after',
    name: 'Personalized 8-Week Program',
    subtitle: 'Representative Burn Engine results',
    before: { weight: 180, bodyFat: 25, label: 'Start' },
    after: { weight: 167, bodyFat: 21, label: 'Week 8' },
    stats: ['13 lbs fat lost', '4% body fat reduction', 'Lean mass preserved'],
    quote: 'When the Burn Engine dials everything in for your body, the scale and the mirror start agreeing.',
    attribution: '— Typical 8-week personalized program',
    note: 'Results vary by starting composition, job demands, and exercise commitment.',
  },
  {
    id: 'dave-mcaftery',
    type: 'story',
    name: 'Dave McAftery',
    subtitle: 'Client since 1990 — 35+ years on the plan',
    quote: "If you want to see real results like you never thought possible, this is the plan to be on because it dials everything in for each person. It's not a cookie-cutter diet.",
    attribution: '— Dave McAftery',
    highlight: 'Still on the program decades later',
  },
  {
    id: 'linda-kay',
    type: 'story',
    name: 'Linda Kay',
    subtitle: 'Client since 1992 — age 67',
    quote: "I learned this program in 1992 and it has been invaluable. I almost bought into the chatter that you just have to eat less as you get older — and then I remembered what I learned all those years ago. At 67, I am confident I can maintain and even build muscle and lose fat.",
    attribution: '— Linda Kay',
    highlight: 'Build muscle and lose fat at 67',
  },
  {
    id: 'trudy',
    type: 'story',
    name: 'Trudy',
    subtitle: 'Client since 1998',
    quote: 'The exception to the "too good to be true" cliché.',
    attribution: '— Trudy',
    highlight: 'Part of 30,000+ clients since 1982',
  },
  {
    id: 'scott-horan',
    type: 'story',
    name: 'Scott Horan',
    subtitle: 'First impressions matter',
    quote: 'First Impressions of Apps is everything, and my First Impression is a 10 out of 10.',
    attribution: '— Scott Horan',
    highlight: 'App experience rated 10/10',
  },
];

function silhouetteSvg(variant) {
  const fill = variant === 'after' ? 'rgba(232,114,42,0.25)' : 'rgba(136,136,136,0.2)';
  const stroke = variant === 'after' ? '#e8722a' : '#666';
  const scale = variant === 'after' ? 'scale(0.92)' : 'scale(1)';
  return `
    <svg class="result-silhouette" viewBox="0 0 80 160" aria-hidden="true">
      <g transform="translate(40,80) ${scale} translate(-40,-80)">
        <circle cx="40" cy="22" r="14" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
        <path d="M22 38 Q40 32 58 38 L54 88 Q40 92 26 88 Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
        <path d="M26 88 L18 130 M54 88 L62 130 M32 88 L28 155 M48 88 L52 155" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>
      </g>
    </svg>`;
}

export function renderBeforeAfterCard(t) {
  return `
    <div class="result-transform">
      <div class="result-ba-grid">
        <div class="result-ba-panel result-ba-before">
          <div class="result-ba-label">${t.before.label}</div>
          ${silhouetteSvg('before')}
          <div class="result-ba-stat"><span>${t.before.weight}</span> lbs</div>
          <div class="result-ba-stat sub">${t.before.bodyFat}% body fat</div>
        </div>
        <div class="result-ba-divider">→</div>
        <div class="result-ba-panel result-ba-after">
          <div class="result-ba-label">${t.after.label}</div>
          ${silhouetteSvg('after')}
          <div class="result-ba-stat"><span>${t.after.weight}</span> lbs</div>
          <div class="result-ba-stat sub">${t.after.bodyFat}% body fat</div>
        </div>
      </div>
      ${t.stats ? `<ul class="result-stats">${t.stats.map((s) => `<li>${s}</li>`).join('')}</ul>` : ''}
      ${t.quote ? renderTestimonyBlock({
        quote: t.quote,
        meta: (t.attribution || '').replace(/^—\s*/, ''),
      }) : ''}
      ${t.note ? `<p class="result-note">${t.note}</p>` : ''}
    </div>`;
}

export function renderStoryCard(t) {
  return `
    <div class="result-story">
      <div class="result-story-highlight">${t.highlight}</div>
      ${renderTestimonyBlock({
        quote: t.quote,
        name: t.name,
        meta: t.subtitle,
        className: 'result-story-quote',
      })}
    </div>`;
}
