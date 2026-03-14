# 🔍 TruthLens - AI-Powered Fact Checker & Digital Forensics

TruthLens is a modern, AI-driven web application designed to combat misinformation. It analyzes text claims, news snippets, and images to determine their authenticity, factual accuracy, and whether they appear to be AI-generated or manipulated.

## ✨ Features

*   **📝 Text Verification:** Paste any news headline, claim, or text snippet. The AI acts as an investigative journalist to fact-check the content and provide a detailed analysis.
*   **🖼️ Image Forensics:** Upload screenshots or photographs. The app extracts claims from the image and performs visual forensics to detect signs of digital manipulation or AI generation.
*   **⚡ Lightning Fast AI:** Powered by **Google Gemini API** for text and image verification with integrated Google Search grounding.
*   **🕒 Scan History:** Automatically saves your recent verifications to your browser's local storage. Access them anytime via the History sidebar.
*   **🗑️ History Management:** Easily clear your entire scan history with a custom, secure confirmation modal (bypassing restrictive browser iframes).
*   **🎨 Immersive UI/UX:** Features a dark-themed, modern interface with floating data particles, a custom lag-free glowing cursor, and smooth animations powered by Framer Motion.

## 🛠️ Tech Stack

*   **Frontend Framework:** React 18+ with TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS
*   **Animations:** `motion/react` (Framer Motion)
*   **Icons:** `lucide-react`
*   **AI Integration:** `@google/genai` (Google Gemini API)

## 🧠 How It Works (Under the Hood)

1.  **Input Handling:** The user provides text, an image, or both via the UI. Images are converted to Base64 format for processing.
2.  **Prompt Engineering:** The app constructs a highly specific system prompt instructing the AI to act as a fact-checker and return its findings in a strict JSON format.
3.  **AI Processing (Groq):** 
    *   If an image is present, the request is routed to the `llama-3.2-11b-vision-preview` model.
    *   If only text is present, it uses the lightning-fast `llama-3.3-70b-versatile` model.
4.  **Structured Output:** The AI returns a JSON object containing:
    *   `verdict`: (Real, Fake, Misleading, or Unverified)
    *   `aiProbability`: (0-100 score)
    *   `summary`: A quick 1-2 sentence overview.
    *   `detailedAnalysis`: Bullet points of the deep dive.
    *   `sources`: Relevant sources or known facts based on the model's training data.
5.  **State Management:** The result is displayed beautifully on the UI and saved to `localStorage` (`truthlens_history`) for future reference.

## 🚀 Local Setup Instructions

Follow these steps to run TruthLens on your local machine:

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your system.

### 2. Install Dependencies
Open your terminal, navigate to the project folder, and run:
```bash
npm install
```

### 3. Environment Variables
1. Create a `.env` file in the root directory of the project.
2. Get a free API key from the [Groq Console](https://console.groq.com/keys).
3. Add your Groq API key to the `.env` file like this:
```env
VITE_GEMINI_API_KEY=AIza_your_actual_api_key_here
```
*(Optional fallback aliases supported: `VITE_API_KEY`, `VITE_API_ID`, `GEMINI_API_KEY`.)**

### 4. Run the Development Server
Start the app by running:
```bash
npm run dev
```
Click the local link provided in the terminal (usually `http://localhost:5173`) to open the app in your browser!

---
*Built with ❤️ focusing on clean code, smooth animations, and reliable AI integrations.*
