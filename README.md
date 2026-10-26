# E-Cell RIT - Orientation 2026: Discover The Undiscovered

An interactive, gamified 16-bit retro arcade orientation experience built for **Entrepreneurship Development Cell (E-Cell), Ramaiah Institute of Technology**.

---

## Highlights

- **16-Bit Pixel Art Theme**: High-contrast blue & white retro arcade aesthetics powered by Google Fonts (`Press Start 2P` and `Pixelify Sans`).
- **Interactive Mystery [ ? ] Block**: Scratch/rub the mystery block with mouse or finger to uncover exclusive VIP founder perks.
- **3-Stage Expedition Manifest**: Interactive multi-step registration flow with retro trail arrows and live validation.
- **Dynamic Boarding Pass Generator**: Renders a personalized 16-bit pixel boarding pass with unique serial numbers (`#EXP-2026-XXXX`) on HTML5 Canvas, downloadable as high-res PNG.
- **8-Bit Sound Synthesizer**: Custom square-wave Web Audio API sound effects (coin clinks, level jumps, victory fanfare).
- **Mobile-First Layout**: Pinned viewport layer eliminating mobile Safari stretching, featuring a dedicated overworld stage window.
- **Zero-Dependency Backend**: Supports both Node.js (`server.js`) and Python 3 (`server.py`) with automatic logging to CSV and JSON.
- **1-Click Spreadsheet Export**: Download all registered attendees anytime as CSV directly from `/api/registrations.csv`.

---

## Quick Start

### Option A: Node.js
```bash
npm start
```
Runs `server.js` on `http://localhost:3000`.

### Option B: Python 3
```bash
python3 server.py
# or: npm run server:py
```
Runs `server.py` on `http://localhost:3000`.

---

## Project Structure

```text
├── index.html            # Main retro arcade orientation web app
├── server.js             # Node.js backend server with CSV/JSON storage
├── server.py             # Python 3 backend server with CSV/JSON storage
├── pixel_bg.png          # 16-bit retro world backdrop
├── logo.png              # E-Cell RIT official emblem
├── data/
│   ├── registrations.csv # Live registrations spreadsheet (Excel compatible)
│   └── registrations.json# Complete structured JSON records
├── package.json          # Project metadata and run scripts
└── README.md
```

---

## License
MIT
