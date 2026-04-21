@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Montserrat", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Cormorant Garamond", serif;
  --color-boutique-rose: #fdf2f2;
  --color-boutique-gold: #c5a059;
  --color-boutique-dark: #1a1a1a;
  --color-boutique-beige: #f5f2ed;

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.5);
  --radius-2xl: calc(var(--radius) * 2);
  --radius-3xl: calc(var(--radius) * 3);
}

@layer base {
  body {
    @apply bg-background text-foreground font-sans transition-colors duration-300;
  }
  
  h1, h2, h3, h4, h5, h6 {
    @apply font-serif;
  }
}

.boutique-card {
  @apply bg-card border border-border/50 shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md;
}

.boutique-glass {
  @apply bg-background/60 backdrop-blur-md border border-border/50;
}

.boutique-button-primary {
  @apply bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-sans uppercase tracking-widest text-xs font-bold rounded-xl active:scale-95;
}

.boutique-button-secondary {
  @apply bg-background border border-border hover:bg-accent hover:text-accent-foreground transition-all font-sans uppercase tracking-widest text-xs font-bold rounded-xl active:scale-95;
}

@layer components {
  .page-transition-enter {
    @apply animate-in fade-in slide-in-from-bottom-4 duration-500;
  }
}

@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@fontsource-variable/geist";

@custom-variant dark (&:is(.dark *));

:root {
    --background: #f8f6f2; /* Ligeiramente mais claro que o bege anterior */
    --foreground: #1a1a1a;
    --card: #ffffff;
    --card-foreground: #1a1a1a;
    --popover: #ffffff;
    --popover-foreground: #1a1a1a;
    --primary: #1a1a1a;
    --primary-foreground: #ffffff;
    --secondary: #f3ede2;
    --secondary-foreground: #1a1a1a;
    --muted: #f3ede2;
    --muted-foreground: #6b7280;
    --accent: #c5a059;
    --accent-foreground: #ffffff;
    --destructive: #ef4444;
    --border: #e5e7eb;
    --input: #e5e7eb;
    --ring: #c5a059;
    --radius: 1rem;
    
    --sidebar: #ffffff;
    --sidebar-foreground: #1a1a1a;
    --sidebar-primary: #1a1a1a;
    --sidebar-primary-foreground: #ffffff;
    --sidebar-accent: #f5f2ed;
    --sidebar-accent-foreground: #c5a059;
    --sidebar-border: #e5e7eb;
    --sidebar-ring: #c5a059;
}

.dark {
    --background: #0f1115;
    --foreground: #f8fafc;
    --card: #1e2128;
    --card-foreground: #f8fafc;
    --popover: #1e2128;
    --popover-foreground: #f8fafc;
    --primary: #f8fafc;
    --primary-foreground: #0f1115;
    --secondary: #272c35;
    --secondary-foreground: #f8fafc;
    --muted: #272c35;
    --muted-foreground: #94a3b8;
    --accent: #c5a059;
    --accent-foreground: #ffffff;
    --destructive: #7f1d1d;
    --border: #334155;
    --input: #334155;
    --ring: #c5a059;
    
    --sidebar: #1e2128;
    --sidebar-foreground: #f8fafc;
    --sidebar-primary: #c5a059;
    --sidebar-primary-foreground: #1e2128;
    --sidebar-accent: #272c35;
    --sidebar-accent-foreground: #c5a059;
    --sidebar-border: #334155;
    --sidebar-ring: #c5a059;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
    }
  body {
    @apply bg-background text-foreground;
    }
  html {
    @apply font-sans;
    }
}