# Nadify 🎵
> **Find it. Play it. Feel it.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-nadify.netlify.app-2AABED?style=for-the-badge&logo=netlify)](https://nadify.netlify.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**Nadify** is a fast, clean, and highly aesthetic music streaming web application. It combines Spotify's daily top charts in India with high-quality audio streams retrieved dynamically using the JioSaavn API. The app is fully responsive, supporting both light and dark modes with a premium glassmorphic interface and smooth micro-animations.

---

## 🔗 Live Website
Live website URL :- https://nadify.netlify.app/

---

## ✨ Features

- **Trending Charts**: Dynamic Spotify India Daily Top Chart integration, scraped and resolved automatically.
- **Universal Search**: Search for any track, artist, or album with instant, high-quality audio stream results.
- **Glassmorphic UI**: Beautiful responsive user interface with neon accents, dark mode toggle, and rich aesthetics.
- **Advanced Player**: Complete audio control with queue management, duration tracking, mute, shuffle, and repeat modes.
- **Smooth Animations**: Infinite loop marquee scrolling with professional fading edge gradients for active song titles.

---

## 🛠️ Architecture

Nadify consists of two primary components:

1. **Frontend**:
   - Single-page application (`index.html`) using Vanilla HTML, CSS, and modern JavaScript.
   - Features custom CSS custom properties, responsive layout design, and full media control.

2. **Express Backend** (`server.js`):
   - Scrapes Spotify charts from Spotify Daily India charts using `axios` and `cheerio`.
   - Spawns the JioSaavn API server locally.
   - Maps chart song details to streaming URLs.

3. **JioSaavn API** (`jiosaavn-api/`):
   - A Hono-based API adapter running on port `3002` that processes requests to retrieve search results, lyrics, and streaming links.

---

## 🚀 Getting Started

Follow these steps to run Nadify locally:

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- npm (Node Package Manager)

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Samyak2501/nadify-backend.git
   cd nadify-backend
   ```

2. **Install Dependencies**:
   This project contains a post-installation script (`postinstall.js`) that automatically installs dependencies in the core server and the sub-directory `jiosaavn-api`.
   ```bash
   npm install
   ```

### Running the App

Start the backend server:
```bash
npm start
```

The Express server will automatically start the JioSaavn API on port `3002`, and the frontend will be served at:
**[http://localhost:3001](http://localhost:3001)**

---

## 🌐 Deployment

The frontend of Nadify is live on Netlify:
👉 **[https://nadify.netlify.app/](https://nadify.netlify.app/)**

The server can be deployed on any Node.js hosting platform (such as Render, Heroku, or railway.app), with the frontend API calls updated to point to the hosted server instance.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.

---

Crafted with ❤️ by Samyak Jain
