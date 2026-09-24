# AI Rules & Technical Guidelines for StudyDay Application

This document outlines the tech stack, library usage guidelines, and architectural rules for developing and maintaining the StudyDay application.

## Tech Stack Overview

* **React 19:** Core JavaScript library for constructing fast, reactive, component-based user interfaces.
* **TypeScript:** Strictly typed programming language extending JavaScript for reliable, self-documenting code and compile-time error prevention.
* **Tailwind CSS:** Utility-first CSS framework used exclusively for styling layout, typography, responsiveness, and dark mode design.
* **Supabase (`@supabase/supabase-js`):** Open-source backend platform handling PostgreSQL database interactions, user authentication, and persistent data storage.
* **Google GenAI (`@google/genai`):** Google Gemini API integration for automated study plan generation, syllabus parsing, and exam board weight analysis.
* **Recharts:** High-performance SVG charting library for interactive data visualizations (weekly study hours, subject time distribution, performance charts).
* **React Hot Toast (`react-hot-toast`):** Toast notification library for surfacing real-time user feedback, loading states, and error alerts.
* **Lucide React & Custom Icons (`constants.tsx`):** Icon libraries providing consistent vector icons across the interface.
* **Vite:** Frontend build tool and development server with environment variable management.

## Library Usage Guidelines

### 1. Styling & Theme Design
* **Tailwind CSS:** Use Tailwind utility classes directly on JSX elements. Avoid writing custom raw CSS files unless necessary for specialized keyframe animations or rich text editor styles.
* **Color System:** Stick to dark theme palette using Slate/Gray Tailwind classes (`bg-gray-900`, `bg-gray-800`, `text-emerald-400`, `text-gray-300`, `border-gray-700`).

### 2. Backend & State Management
* **Supabase Client (`src/lib/supabase.ts`):** All database operations (CRUD) and authentication calls must pass through the configured Supabase client.
* **Context Provider (`src/components/SupabaseProvider.tsx`):** Use `useSupabase()` hook to access the active user session and auth state globally.
* **Toast Notifications (`src/utils/toast.ts`):** Always trigger `showSuccess`, `showError`, or `showLoading` from `react-hot-toast` during async operations, mutations, or API calls to provide clear feedback to the user.

### 3. AI Integrations
* **Google GenAI (`@google/genai`):** Use Google GenAI SDK for AI operations. Always specify JSON schemas (`Type.OBJECT`, `Type.ARRAY`) when requesting structured output (such as weights or syllabus breakdowns).

### 4. Data Visualization
* **Recharts:** Use Recharts (`BarChart`, `PieChart`, `LineChart`, `ResponsiveContainer`) for all statistics and dashboard charts. Ensure custom tooltips and responsive wrappers are provided so charts scale well across screen sizes.

### 5. Component & Code Architecture
* **Functional Components & Hooks:** Use functional React components with standard React Hooks (`useState`, `useMemo`, `useCallback`, `useEffect`).
* **Type Definitions (`types.ts`):** Maintain centralized TypeScript interfaces/types for all data models (e.g., `StudyPlan`, `Discipline`, `StudyBlock`, `Revision`, `Flashcard`, `Simulado`, `Note`).
* **Modular Structure:** Keep pages in `components/` or `src/pages/`, modals and reusable widgets in `components/`, and standalone utilities in `src/utils/`.