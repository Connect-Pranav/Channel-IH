# NSD Executive Dashboard

> Dark-theme executive intelligence platform — deployable to GitHub Pages in 60 seconds.

![NSD Dashboard](https://img.shields.io/badge/Status-Live-4ade80?style=flat-square&logo=github)
![Version](https://img.shields.io/badge/Version-2.0-7c6ff7?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-e879f9?style=flat-square)

## 🚀 Quick Deploy

1. Create a new GitHub repo (e.g. `nsd-dashboard`)
2. Upload all files from this folder
3. Go to **Settings → Pages → Source: Deploy from branch → main → / (root)**
4. Your live URL: `https://<your-username>.github.io/nsd-dashboard/`

## 📊 Dashboard Tabs

| Tab | Description |
|-----|-------------|
| Executive Summary | 8 KPI cards, daily trend, location split |
| Sales Performance | Daily/weekly/monthly trends, run rate |
| Manager Dashboard | L3 ranking table + charts |
| Team Leader | TL-wise HC, sales, activation |
| Executive Rankings | 30+ agent leaderboard with search |
| Location Dashboard | Branch comparison + achievement |
| Vintage Analysis | 5 tenure buckets with distribution |
| KPI Formula Guide | All formulas + DAX measures |

## 📁 File Upload

- Drag & drop **multiple .xlsb / .xlsx / .csv files** simultaneously
- All sheets auto-detected (Sale Dump, HC, Activation, TL, Mapping, etc.)
- Columns auto-detected by name matching
- Falls back to Demo Data if no file uploaded

## 🔄 Update Dashboard

1. Get new NSD Daily Tracker file
2. Open dashboard → click **Load Files**
3. Upload new file → **Build Dashboard**

## 📐 Formulas Covered

- Achievement % = (MTD Sales / MTD Target) × 100
- Productivity = Total Sales / Active HC
- Required Run Rate = (Target - MTD) / Remaining Days
- Conversion % = (Activations / Total HC) × 100
- All DAX measures for Power BI included in KPI Guide tab

## 🛠️ Tech Stack

- Vanilla JS (ES6) — zero build step
- [SheetJS](https://sheetjs.com/) — Excel parsing
- [Chart.js](https://chartjs.org/) — visualizations
- GitHub Pages — hosting

---
Built for **Pranav Kumar**, IndiaMART Branch Manager, Bengaluru
