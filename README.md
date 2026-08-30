# 🌱 AgroVision — AI-Powered Crop Health & Precision Agronomy Platform

AgroVision is an advanced, production-ready web application designed for farmers, field officers, and agronomists. It combines cutting-edge AI vision models (**Google Gemini**), real-time weather analytics (**Open-Meteo**), pathological rule engines, and interactive digital assistants to deliver instant crop disease diagnosis, localized field weather advice, and custom treatment planning.

---

## 🎯 Key Features & Capabilities

### 1. 🍃 Instant AI Leaf Disease Pathology
* **Multi-Format Image Scanner**: Upload or capture photos of crop leaves in JPEG, PNG, or WebP formats (up to 15MB).
* **Gemini AI Vision & ML Fallback**: Analyzes leaf lesions, chlorosis, and vigor with multi-model automatic failover (`gemini-3.5-flash` → `gemini-3.6-flash` → `gemini-3.5-flash-lite`).
* **Validated Diagnostic Output**: Provides disease identification, normalized confidence scores (0–100%), severity ratings (*Healthy, Low, Moderate, High*), cause breakdowns, and organic/chemical remedies.
* **Canvas Image Compression**: Automatically resizes uploaded photos to 1024px JPEG in-memory to conserve network bandwidth.
* **LRU Local Storage Eviction**: Safely stores recent scan history on device without risk of `QuotaExceededError` crashes.

### 2. 🌦️ Weather-Aware Field Advisory Engine
* **Live Weather Integration**: Pulls live temperature, humidity, wind speed, dew point, and 24h/72h rainfall data via Open-Meteo.
* **Smart Irrigation Advisor**: Generates clear watering recommendations (`Irrigate`, `Delay`, `Monitor`) to prevent water stress or waterlogging.
* **5-Day Plant Disease Risk Forecast**: Calculates disease outbreak risks for 9 major crops (*Apple, Apricot, Cherry, Grape, Peach, Pear, Tomato, Potato, Corn*).
* **Field Scouting Checklist**: Provides daily scouting task lists based on canopy wetness, temperature thresholds, and wind speeds.

### 3. 📋 Smart "Today's Plan" Field Briefing
* **Unified Advisory Synthesis**: Fuses the user's latest leaf diagnosis scan with real-time GPS weather conditions.
* **Prioritized Daily Action List**: Displays 3 immediate, high-impact tasks for field workers each morning.
* **Export & Sharing Suite**: Instant 1-click Copy, `.txt` Download, and direct sharing to WhatsApp, Telegram, Email, and SMS.

### 4. 🧪 Agronomy Treatment Engine
* **Chemical Treatment Guidance**: Recommends active ingredients, dosage per liter, spray frequency, and Pre-Harvest Interval (PHI) safety windows.
* **Organic & Bio-Control**: Provides non-chemical alternatives including Neem oil (1500–3000 ppm) and *Trichoderma harzianum* bio-fungicides.
* **Acreage Volume Calculator**: Automatically computes required spray tank volume and chemical concentrate required based on farm size.
* **Cultural Practices**: Guidance on canopy pruning, spacing, tool sanitation, and crop rotation cycles.

### 5. 🤖 AgroAssist AI Agronomist & Guided Diagnosis
* **Multi-Provider AI Chat**: Talk with an AI digital agronomist configured for Google Gemini, OpenAI, or local Ollama instances.
* **Guided Diagnosis Flow**: Step-by-step interactive questionnaire for diagnosing crop issues when photos are unavailable.
* **Multilingual Support**: Fully localized interface and AI responses in **English, Hindi (हिंदी), Kannada (ಕನ್ನಡ), and Telugu (తెలుగు)**.

### 6. 🛡️ Production Hardening & Crash Resilience
* **Global Error Boundary**: Intercepts unhandled React exceptions and presents a clean recovery screen ("Reload Page" / "Return Home") rather than a blank screen.
* **Route Code Splitting**: Utilizes `React.lazy` + `Suspense` to shrink the initial JavaScript bundle to `<140 kB`.
* **Network Timeout Protection**: 15s–25s `AbortController` timeouts on all external APIs to prevent frozen UI states on weak field connections.
* **Offline High Availability**: Client-side rule engines provide seamless fallback when cloud edge functions or serverless backends are offline.

### 7. 👑 Admin Dashboard & Subscriber Management
* **Role-Based Access Control (RBAC)**: Secure admin portal guarded by Supabase `user_roles` verification.
* **Subscriber Management**: Manage newsletter subscriptions with CSV export and offline local storage fallback.

---

## 🛠️ Technology Stack

| Layer | Technology Used |
|---|---|
| **Core Framework** | React 18, TypeScript, Vite 5 |
| **Styling & UI** | Tailwind CSS, Shadcn UI, Radix UI Primitives, Lucide Icons |
| **State & Data Fetching** | TanStack Query (React Query v5), React Router v6 |
| **AI Pathology & Vision** | Google Gemini API (`gemini-3.5-flash`, `gemini-3.6-flash`) |
| **Weather Intelligence** | Open-Meteo API (Free, zero-key, geolocation enabled) |
| **Backend / Database** | Supabase (PostgreSQL, Row Level Security, Auth, Edge Functions) |
| **Internationalization** | i18next (English, Hindi, Kannada, Telugu) |

---

## 💻 Local Setup & Installation

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm** or **bun**

### Quickstart

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/DSAvinash/your-design-sanctuary.git
   cd your-design-sanctuary
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:8080/`.

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🔒 Security & Privacy Features

* **Client-Side Image Processing**: Leaf images are compressed in-memory via HTML5 Canvas before sending.
* **No Image Storage Tracking**: Photos are processed statelessly for disease inference and are never logged to public databases.
* **API Key Protection**: Supports user-provided runtime keys stored securely in local browser memory.
