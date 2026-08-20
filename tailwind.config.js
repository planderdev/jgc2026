/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './meetup/*.html',
    './assets/js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        jgcf: {
          primary: 'var(--color-primary)',
          secondary: 'var(--color-secondary)',
          ink: 'var(--color-brand-ink)',
          navy: 'var(--color-brand-navy)',
          violet: 'var(--color-brand-violet)',
          blue: 'var(--color-brand-blue)',
          coral: 'var(--color-action-reservation)',
          red: 'var(--color-action-red)',
          mint: 'var(--color-accent-mint)',
          mist: 'var(--color-bg-muted)'
        }
      },
      fontFamily: {
        sans: ['SUIT', '"Segoe UI"', '"Noto Sans KR"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
