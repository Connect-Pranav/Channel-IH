# NSD Executive Dashboard — AMJ 2025-26

Dark-theme executive intelligence platform for Bommasandra branch.

## 📁 Files (ALL at root — no subfolders)

| File | Description |
|------|-------------|
| `index.html` | Complete dashboard (all JS + real data embedded) |
| `theme.css` | Dark theme stylesheet |
| `deploy.yml` | GitHub Actions auto-deploy |

## 🚀 Deploy in 60 seconds

1. Create new GitHub repo (e.g. `nsd-dashboard`)
2. Upload ONLY these 3 files — all at root, no folders
3. Go to **Settings → Pages → Source: main → / (root)**
4. Done: `https://connect-pranav.github.io/nsd-dashboard/`

## ⚠️ IMPORTANT — File Structure

Upload files like this:
```
nsd-dashboard/
├── index.html      ← at root
├── theme.css       ← at root
└── deploy.yml      ← at root (optional, for auto-deploy)
```

NO css/ folder, NO js/ folder — everything at root.

## 💾 Features
- Real AMJ 2025-26 data embedded (1,242 sales · ₹2.53Cr)
- Upload new .xlsb/.xlsx/.csv files to refresh data
- Auto-saves to browser localStorage
- 10 dashboard tabs: Summary, Sales, Manager, Executive, Team, Location, HL, Meetings, Vintage, KPI Guide
