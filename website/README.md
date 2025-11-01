# RecCall Website

This directory contains the multi-page website for RecCall, structured for future migration to a dedicated website repository under the `reccaller-ai` organization.

## Structure

```
website/
├── index.html              # Main landing page (focus: "why" and "what")
├── pages/
│   ├── use-cases.html      # Real-world use cases and scenarios
│   ├── integrations.html   # Supported tools and integrations
│   ├── getting-started.html # Quick setup guide
│   └── how-it-works.html   # Technical details (second-level)
├── assets/
│   ├── css/
│   │   └── style.css      # Shared stylesheet
│   └── js/                 # JavaScript files (future)
└── README.md               # This file
```

## Design Philosophy

### Top-Level Pages (Home, Use Cases, Integrations, Getting Started)
- **Focus**: "What" and "Why"
- **Language**: Simple, jargon-free
- **Content**: Use cases, benefits, real-world impact
- **Goal**: Reduce mental overload, answer "why do I need this?"

### Second-Level Pages (How It Works)
- **Focus**: Technical "How"
- **Language**: More technical, detailed
- **Content**: Architecture, implementation, ML details
- **Goal**: Satisfy technical curiosity without overwhelming main pages

## Key Principles

1. **Problem-First**: Lead with the pain points developers face
2. **Outcome-Focused**: Emphasize benefits and impact, not features
3. **Use Case Driven**: Show real scenarios, not abstract capabilities
4. **Progressive Disclosure**: Basic info first, details when needed
5. **Industry Context**: Reference industry data and statistics where relevant

## Migration Notes

When migrating to a dedicated repository:

1. Maintain this directory structure
2. Add build/deployment configuration (e.g., GitHub Pages, Netlify, Vercel)
3. Consider adding:
   - JavaScript framework (optional, for interactivity)
   - Build tools (for CSS preprocessing, minification)
   - Analytics integration
   - SEO optimization
   - Blog section (if needed)

## Updating Content

### Homepage (index.html)
- Keep focus on problem/solution
- Update statistics and metrics as data becomes available
- Maintain clear CTAs

### Use Cases (pages/use-cases.html)
- Add new use cases as they emerge
- Include customer testimonials when available
- Keep scenarios realistic and relatable

### Technical Details (pages/how-it-works.html)
- Update as architecture evolves
- Keep technical but accessible
- Link to detailed documentation when needed

## Styling

All styles are in `assets/css/style.css`. The design uses:
- Modern, clean aesthetic
- Professional color scheme
- Responsive grid layouts
- Clear typography hierarchy

## Navigation

All pages include consistent navigation in the header. Update navigation links when adding new pages.

