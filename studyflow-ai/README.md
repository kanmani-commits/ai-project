# StudyFlow AI — AI Study Overload & Smart Schedule Assistant
> *“Turn Academic Overload Into Action”*  
> An intelligent student productivity web application that detects academic overload and automatically creates a realistic, priority-based study schedule.

---

## 1. Project Overview
**StudyFlow AI** is a client-side, zero-dependency academic planning assistant engineered specifically for college and university students. Unlike static to-do lists and rigid calendars that treat all assignments equally, StudyFlow AI understands cognitive difficulty, effort requirements, nearest deadlines, and realistic daily study capacity.

The application automatically identifies when a student has more pending work than available study hours, categorizes their workload state, calculates dynamic multi-factor priority scores, and generates realistic 50-minute study blocks with mandatory recovery breaks.

---

## 2. Problem Statement
College students frequently face:
- Overlapping assignments, lab records, and exams with disparate deadlines.
- **The Planning Fallacy**: Creating ambitious 8–10 hour study schedules that fail on the first day due to cognitive burnout.
- **Decision Paralysis**: Inability to identify which task to tackle first when multiple high-stakes deadlines collide.
- Lack of visibility into whether their total academic workload is mathematically manageable within their available free hours.

---

## 3. Solution
StudyFlow AI resolves academic scheduling paralysis through a clean four-step workflow:
1. **Intelligent Ingestion**: Collects academic tasks, subjects, estimated hours, and difficulty.
2. **Workload Analysis & Overload Detection**: Compares pending hours against daily study limits and flags capacity deficits.
3. **Multi-Factor Priority Scoring**: Automatically calculates a 0–100 priority score with transparent, explainable reasoning.
4. **Realistic Scheduling**: Partitions tasks into 50-minute study sessions separated by 10-minute restoration breaks, strictly capping daily study time to the student's chosen limit.

---

## 4. Key Features
- **Academic Workload Meter**: Real-time visual progress meter classifying workload into `LOW (0–70%)`, `MEDIUM (70–100%)`, `HIGH (100–140%)`, and `CRITICAL (>140%)`.
- **Transparent Multi-Factor Priority Engine**: Dynamic 0–100 priority scoring with human-readable explanations on every card.
- **Smart Schedule Generator**: Realistic multi-day study schedule generator that prevents marathon study sessions (>2h without a break).
- **↻ Reschedule My Day**: One-click re-optimization that shifts missed or incomplete blocks forward while preserving urgent deadlines.
- **Today's Study Plan**: Focused daily study timeline with live capacity metrics.
- **Integrated Focus Mode (Pomodoro Timer)**: 25-minute focus sprints, 5-minute short breaks, and 15-minute long breaks with synthesized Web Audio chimes.
- **Academic Subject Management**: Track individual course difficulty, faculty details, weekly study goals, and completion percentages.
- **Real-Time Analytics**: Visual Chart.js charts (with native HTML5 Canvas offline fallback) for weekly hours, subject distributions, task statuses, and workload trends.
- **Local AI Assistant**: Interactive study coach that answers questions based on live application state.
- **Dark Mode Support**: Seamless Light, Dark, and System theme switching.
- **Onboarding Setup Wizard**: 6-step guided setup for first-time students with demo data skip option.
- **Zero-Dependency Persistence**: Pure browser `localStorage` architecture with JSON backup export and import.

---

## 5. Smart Workload Algorithm

$$\text{Available Capacity} = \text{Daily Available Hours} \times \text{Planning Days}$$

$$\text{Workload Ratio } \% = \left(\frac{\text{Total Pending Workload Hours}}{\text{Available Capacity}}\right) \times 100$$

$$\text{Overload } \% = \left(\frac{\text{Total Pending Hours} - \text{Available Capacity}}{\text{Available Capacity}}\right) \times 100$$

### Classification Tiers:
| Ratio % | Classification | Guidance |
| :---: | :---: | :--- |
| **0 – 70%** | 🟢 **LOW** | *“Your workload is manageable.”* |
| **70 – 100%** | 🟡 **MEDIUM** | *“Your workload is getting busy. Start high-priority tasks early.”* |
| **100 – 140%** | 🟠 **HIGH** | *“Your workload is heavy. Focus on critical deadlines and reduce low-priority tasks.”* |
| **&gt; 140%** | 🔴 **CRITICAL** | *“Your workload exceeds your available study capacity. Consider rescheduling or reducing non-essential tasks.”* |

---

## 6. Smart Scheduling Algorithm

### Allocation Rules:
1. **Priority Ordering**: Tasks are sorted by computed Priority Score descending, breaking ties by earliest deadline.
2. **Daily Limit Cap**: A day never receives more study minutes than `dailyAvailableHours * 60`.
3. **Session Slicing**: Tasks exceeding 50 minutes are sliced into manageable chunks (e.g., "Part 1/2", "Part 2/2").
4. **Mandatory Breaks**: A 10-minute restoration break is inserted between consecutive study blocks. Marathon study (>2 hours without break) is prohibited.
5. **Multi-Day Distribution**: If today's available capacity is filled, subsequent tasks roll over into Tomorrow and Day 3 plans rather than overloading a single day.

### Demonstration Scenario (Test Case):
- **Student Capacity**: 4 hours/day
- **Tasks**:
  1. *Mathematics Assignment* (Due tomorrow, Hard, 3h, High Priority)
  2. *DBMS Revision* (Due in 3 days, Medium, 2h, Medium Priority)
  3. *Web Project* (Due in 5 days, Hard, 4h, High Priority)
- **Algorithm Outcome**: Rather than forcing all 9 hours into Today, the scheduler allocates 3h of Mathematics + 1h of DBMS to Today (4h total), rolls the remaining 1h of DBMS + 3h of Web Project into Tomorrow (4h total), and places the final 1h of Web Project into Day 3.

---

## 7. Technology Stack
- **Structure**: Semantic HTML5 with accessible ARIA landmarks.
- **Styling**: Modern CSS3 (CSS Variables for themes, Flexbox, CSS Grid, smooth transitions).
- **Application Core**: Vanilla JavaScript (ES6+ Modules, modular service design).
- **Data Persistence**: Browser `localStorage` API with defensive parsing.
- **Data Visualization**: Chart.js (via CDN) with pure HTML5 Canvas fallback for offline reliability.
- **Audio Engine**: Native Web Audio API for synthetic focus chimes (no external MP3 dependencies).
- **Backend**: **None required**. Fully functional locally in any modern browser.

---

## 8. Folder Structure
```
studyflow-ai/
│
├── index.html                  # Core Single Page Application & Modals
├── README.md                   # Comprehensive Project Documentation
├── .gitignore                  # Git ignore rules for secrets and temp files
│
├── assets/
│   └── icons/                  # Scalable SVG icons
│
├── css/
│   ├── style.css               # Core theme variables, typography, layout, cards
│   ├── components.css          # Onboarding wizard, AI chat, Pomodoro, subject cards
│   └── responsive.css          # Breakpoints for mobile drawers and stacked layouts
│
└── js/
    ├── app.js                  # Application bootstrapper and lifecycle
    ├── state.js                # Reactive centralized state store
    ├── storage.js              # LocalStorage manager with demo seeding
    ├── tasks.js                # Task CRUD, filters, and PriorityEngine
    ├── subjects.js             # Subject management and progress analytics
    ├── scheduler.js            # Multi-day scheduling and rescheduling engine
    ├── workload.js             # Workload vs capacity overload calculation
    ├── analytics.js            # Chart.js integration and canvas fallbacks
    ├── pomodoro.js             # Focus timer with Web Audio chime
    ├── insights.js             # Rule-based study insights and local AI assistant
    ├── ui.js                   # DOM controller, view routing, and modal manager
    ├── validation.js           # Input validation for tasks, subjects, and settings
    └── utils.js                # Time/date math and helper utilities
```

---

## 9. How to Run Locally

### Direct Browser Opening:
1. Clone or download the repository.
2. Open `index.html` directly in any modern browser (Google Chrome, Microsoft Edge, Firefox, or Safari).

### Local HTTP Server (Recommended for ES Modules):
Because modern browsers enforce strict CORS on ES modules over the `file://` protocol in certain configurations, running a lightweight local server is recommended:

**Using Python:**
```bash
cd studyflow-ai
python -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

**Using Node.js (npx):**
```bash
cd studyflow-ai
npx serve .
```

---

## 10. How to Use
1. **Onboarding**: On initial launch, complete the quick 6-step wizard or click **"Skip & Load Demo Data"**.
2. **Dashboard**: View your **Academic Workload Meter** to check whether your schedule is `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
3. **Adding Tasks**: Click **"+ Add Task"** to specify title, subject, due date, estimated effort, difficulty, and importance.
4. **Generating Schedule**: Click **"✨ Generate Smart Schedule"** to construct 50-minute study blocks with breaks.
5. **Focus Mode**: Click the **"⏱️ Focus Mode"** button on any task to initiate a 25-minute Pomodoro sprint.
6. **Rescheduling**: If your plans change, click **"↻ Reschedule My Day"** to rebalance remaining slots.
7. **AI Assistant**: Click **"🧠 Ask AI Assistant"** in the sidebar to ask questions like *"What should I study first?"* or *"Am I overloaded?"*.

---

## 11. Sample Data
StudyFlow AI comes with pre-configured college demo subjects (*Data Structures, DBMS, Operating Systems, Computer Networks, Web Technology*) and realistic deliverables to explore the dashboard immediately without manual data entry.

---

## 12. Screenshots Placeholder
```
+-------------------------------------------------------------------------------+
| [⚡ StudyFlow AI]  Hello, Aarav Sharma 👋          [📅 Sep 15] [🌙 Dark] [+ Task] |
|-------------------------------------------------------------------------------|
|  [ Workload Meter: HIGH (115%) ]       [ Turn Academic Overload Into Action ] |
|  ████████████████░░░░░░░░░░░░          [✨ Generate Smart Schedule]           |
|                                        [↻ Reschedule My Day]                  |
|-------------------------------------------------------------------------------|
|  [ Due Today: 1 ] [ This Week: 4 ] [ Capacity: 4h/d ] [ Completed: 1 ]        |
|-------------------------------------------------------------------------------|
|  [ Today's Study Plan (50m blocks) ]   |   [ Smart Study Insights ]           |
|  09:00 - 09:50  Mathematics (High)     |   💡 DBMS consumes highest workload  |
|  09:50 - 10:00  ☕ Break               |   ⏳ 2 urgent tasks due in 48h       |
|  10:00 - 10:50  DBMS Revision          |   🎯 1-day study streak active       |
+-------------------------------------------------------------------------------+
```

---

## 13. Future Improvements
- **LMS Integration**: Direct synchronization with Google Classroom, Canvas, and Moodle.
- **Web Push Notifications**: Browser desktop notifications prior to upcoming study blocks.
- **Collaborative Study Rooms**: Synchronized Pomodoro sessions with study partners.
- **Multi-Device Cloud Sync**: Optional end-to-end encrypted backend synchronization.

---

## 14. Security
- **No Hardcoded Keys or Secrets**: Contains zero API keys, tokens, or credentials.
- **Client-Side Privacy**: All student data is stored locally in the user's browser `localStorage`.
- **Extensible AI Proxy Architecture**: If external Large Language Model APIs (e.g. Gemini, OpenAI) are connected in future versions, calls must route through a secure backend proxy rather than exposing client keys.

---

## 15. Limitations
- Operates entirely within the browser's local sandbox; clearing browser history/cache deletes local data unless a JSON backup was exported.
- Offline push notifications depend on active browser tabs or service worker support.

---

## 16. GitHub Repository
- **Repository URL**: [https://github.com/kanmaniganesan87-sudo/studyflow-ai](https://github.com/kanmaniganesan87-sudo/studyflow-ai)
- **Author**: Kanmani Ganesan ([@kanmaniganesan87-sudo](https://github.com/kanmaniganesan87-sudo))

---

## 17. License
This project is open-source under the **MIT License**.
