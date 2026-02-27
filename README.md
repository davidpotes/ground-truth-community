# Ground Truth — Camp Management App

A web app for managing Burning Man theme camps (or any large group camp). Originally built by [Star Sailor Art](https://starsailorart.com), released as open source for the community.

## What It Does

Ground Truth handles the logistics that make or break a camp — the stuff that usually lives in a mess of spreadsheets, group chats, and someone's head.

### Member Management
- Google OAuth sign-in with invite code registration
- Member profiles with playa names, emergency contacts, dietary needs, transport info
- Admin roster with promote/demote controls (with last-admin protection)

### Recruit Pipeline
- Public intake form (`/apply`) for prospective members
- Kanban-style pipeline: prospect → contacted → confirmed → declined
- Assignee tracking, confidence scores, inline editing
- Campaign tracking with reference codes and click analytics

### Asset Tracker
- Full camp inventory with categories, quantities, conditions, custodians
- Photo upload for each item
- Storage location and transport vehicle tracking
- Last-inventoried timestamps

### Camp Layout Planner
- Drag-and-drop HTML5 canvas layout tool
- All structure types: shade structures, tents, RVs, kitchens, bars, bikes, art
- Golden Spikes algorithm for optimal lot survey points
- Server-side save/load with official layout locking
- Roster integration — assign campers to tent spots
- JPEG export for sharing, JSON export for backup
- [Standalone version](public/tools/camp-planner.html) also available (no account needed)

### Tickets & Vehicle Passes
- Self-reporting for ticket and vehicle pass status
- Admin coverage dashboard
- Batch ticket management with shipping workflow

### Dues Tracking
- Ledger-based dues tracking (no payment integration — admin records manually)
- Per-member balance, payment history, custom amounts

### Announcements
- 140-char announcements with color themes and emoji
- Auto-expiring (1-30 days)
- Any member can post

### Activity Logging
- Automatic login tracking
- Member engagement analytics for admins

## Tech Stack

- **Framework:** Next.js 16 + TypeScript
- **Database:** SQLite via Prisma 5
- **Auth:** NextAuth v4 with Google OAuth + invite code credentials
- **Styling:** Tailwind CSS
- **Hosting:** Any Node.js server (e.g. Hetzner CX23 + PM2 + Nginx)
- **Cost:** ~$3.50/month

## Quick Start

```bash
# Clone
git clone https://github.com/davidpotes/ground-truth-community.git
cd ground-truth-community

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your Google OAuth credentials and a random NEXTAUTH_SECRET

# Set up database
npx prisma db push
# Optional: seed with example data
# node scripts/seed.js

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### First Admin Setup

1. Add your email to the database before first login:
```bash
npx prisma studio
# In the User table, create a row with your email and set isAdmin: true
```
2. Sign in with Google using that email
3. Generate invite codes from the admin panel for other members

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── admin/        # Admin-only endpoints (recruits, tickets, dues, etc.)
│   │   ├── apply/        # Public intake form (rate-limited)
│   │   ├── auth/         # NextAuth configuration
│   │   ├── members/      # Member endpoints (profile, assets, meals)
│   │   ├── planner/      # Camp layout planner API
│   │   └── track/        # Campaign click tracking
│   ├── apply/            # Public application form
│   ├── members/          # Member dashboard and admin pages
│   └── page.tsx          # Landing page
├── components/           # Shared React components
└── lib/                  # Auth config, database client
prisma/
├── schema.prisma         # Database schema
public/
├── camp-planner.html     # Example camp planner (integrated)
├── tools/                # Community camp planner (standalone)
scripts/
├── check-categories.js   # Utility: audit asset categories
├── list-members.js       # Utility: dump member list
```

## Customizing for Your Camp

1. **Branding:** Update `src/app/page.tsx` (landing page) with your camp name
2. **Application form:** Edit `src/app/apply/page.tsx` with your camp's questions
3. **Invite code prefixes:** Edit the prefix list in `src/app/api/admin/invites/route.ts`
4. **Colors/theme:** Tailwind config in `tailwind.config.ts`
5. **Canon page:** `src/app/members/canon/page.tsx` contains example camp lore — replace with your own

The core functionality (members, recruits, assets, planner, tickets, dues) is camp-agnostic.

## Security Notes

- All admin endpoints require admin role verification
- Asset modifications require admin privileges with field whitelisting
- File uploads validate type, size, and use database IDs for filenames (no user-supplied paths)
- Photo deletion includes path traversal protection
- Public endpoints (`/api/apply`, `/api/track`) are rate-limited by IP
- Invite codes use 8-character alphanumeric suffixes (~1 trillion combinations)
- `allowDangerousEmailAccountLinking` is enabled for smoother Google OAuth — acceptable tradeoff for a small private camp app. See [NextAuth docs](https://next-auth.js.org/configuration/providers/oauth#allowdangerousemailaccountlinking) if you want to disable it.

## License

MIT — use it, fork it, build your camp with it.

---

Built with ✨ by [Star Sailor Art](https://starsailorart.com)
