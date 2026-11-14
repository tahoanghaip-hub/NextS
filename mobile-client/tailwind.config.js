/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        glass: 'var(--bg-glass)',
        'text-pri': 'var(--text-primary)',
        'text-sec': 'var(--text-secondary)',
        'text-mut': 'var(--text-muted)',
        'border-sub': 'var(--border-subtle)',
        'accent-pri': 'var(--accent-primary)',
        'accent-hov': 'var(--accent-hover)',
        'trigger-line': 'var(--trigger-line-color)',
        'trigger-zone': 'var(--trigger-zone-bg)',
        'danger-col': 'var(--danger-color)',
        'success-col': 'var(--success-color)'
      }
    },
  },
  plugins: [],
};
