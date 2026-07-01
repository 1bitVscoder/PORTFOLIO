# Zenith Soumya - Developer Portfolio

A next-generation developer portfolio for **Zenith Soumya**, built from physical hardware to advanced web telemetry. The application showcases projects, expertise, contributions, and real-time LeetCode statistics.

## 🚀 Technology Stack

- **Core Framework**: Next.js (App Router, Turbopack) & React 19
- **Animation System**: GSAP (GreenSock Animation Platform) & Custom WebGL Shaders
- **Smooth Scroll**: Lenis Scroll Engine
- **Styling**: Vanilla CSS Modules (custom variables & design tokens)
- **Data Integration**: GitHub Contributions API & LeetCode Alfa API

## ✨ Key Features

- **Interactive Background**: High-performance WebGL plus-grid system with cursor displacement, automatic velocity warp, and idle damping.
- **Tuning Dial Services**: An interactive tuning dial (V2) for navigating capabilities. Leverages native scroll to drive a custom GSAP scrub timeline with font variation morphing.
- **Dynamic Projects & Case Studies**: Editorial-style markdown case studies featuring scroll-triggered ledger layout and split-card animations.
- **Offline & Responsive Fallbacks**: Graceful fallback structures (static layouts/reduced motion flags) for coarse pointers, small screens, and users preferring reduced motion.
- **Production-Ready SEO**: Custom robots metadata, canonical alternates, auto-generated sitemaps, and OpenGraph image dynamic components.

## 🛠️ Local Development

### 1. Installation
Install the project dependencies:
```bash
npm install
```

### 2. Fetch Third-Party Data
The build step depends on locally-cached stats. Run the prebuild scripts to pull GitHub and LeetCode data:
```bash
npm run prebuild
```

### 3. Run Dev Server
Start the development server with hot-reloading:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the live result.

### 4. Build and Compile
To compile the production build:
```bash
npm run build
```

## 🐳 Docker Deployment

A multi-stage `Dockerfile` is provided for containerized deployments:
```bash
# Build & start container
docker-compose up -d --build
```
The server serves optimized static outputs via an Nginx reverse proxy configured in `nginx.conf`.
