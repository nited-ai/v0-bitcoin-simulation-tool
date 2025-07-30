# Landing Page Migration - Corporate to Personal

## Overview
Migrated from comprehensive corporate-style marketing landing page to simple, personal, indie-style landing page.

## Changes Made

### 1. Backup Created
- Moved all existing landing components to `components/landing-v1/` for future reference
- Preserved: Navigation, HeroSection, ProblemSolution, FeatureShowcase, HowItWorks, FAQ, FinalCTA

### 2. New Personal Landing Page
- **SimpleNavigation.tsx**: Minimal navigation with just essential links
- **PersonalLanding.tsx**: Single component with all content sections

### 3. Content Structure
1. **Hero Section**: Personal introduction explaining why the tool was created
2. **Honest Problem Statement**: Transparent about risks and limitations
3. **Current Capabilities**: What the tool can do right now
4. **Future Roadmap**: Planned features and improvements
5. **Personal Mission**: Developer story and community focus
6. **Donation Request**: Bitcoin donation address with QR code
7. **Bitcoin Ethos**: Commitment to free, privacy-focused development
8. **Call to Action**: Simple buttons to try the tool

### 4. Design Philosophy
- Indie/personal aesthetic instead of corporate polish
- First-person narrative throughout
- Simple text and bullet lists instead of complex components
- Authentic, conversational tone
- Focus on content over flashy design

### 5. Technical Implementation
- Reduced from 7 components to 2 main components
- Maintained routing structure: `/` for landing, `/simulation` for tool
- Preserved all existing functionality
- Added image placeholders for hero image and Bitcoin QR code

## Bitcoin Donation
Address: `bc1qkx00f29cck28qfz9m4y69y502fkqv2tw0cr2rw`

## Images Needed
1. `public/hero-bitcoin-beach.png` - Hero image (cute Bitcoin character on beach)
2. `public/bitcoin-qr-code.png` - QR code for donation address

## Next Steps
1. Replace image placeholders with actual images
2. Test the new landing page
3. Gather user feedback
4. Iterate based on community input

## Rollback Plan
If needed, the original landing page can be restored by:
1. Moving components from `components/landing-v1/` back to `components/landing/`
2. Reverting `app/page.tsx` to use the original components
