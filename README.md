# psu-macro-planner-
🥗 Healthier@PSU
A personalized nutrition and fitness companion built specifically for Penn State students.

📌 Inspiration
As Penn State students passionate about fitness, we constantly ran into one simple problem:
“What should I eat at the dining hall today?”
While nutritional data exists on the Penn State dining website, translating that into meaningful decisions for goals like bulking, cutting, or maintaining weight is time-consuming and unintuitive.
At a university where thousands of students actively train, play sports, and prioritize health, we saw a clear gap:
👉 Students want to eat better — they just don’t have the tools to do it easily.
That’s why we built Healthier@PSU — to help students build a smarter, more intentional relationship with the food already available on campus.

🚀 What It Does
Healthier@PSU is a full-stack web app that helps students:
🧠 Personalized Nutrition
Input height, weight, age, and fitness goal
Automatically calculate TDEE (Total Daily Energy Expenditure)
Get a daily calorie target
🍽️ Smart Dining Hall Integration
Scrapes live PSU dining hall menus daily
Displays full nutritional breakdown for each item
Filters meals based on user goals (cut, bulk, maintain)
📊 Tracking & Insights
Track daily calories and macronutrients
View weekly nutrition history
Explore detailed nutritional info for each food item
🏋️ Fitness Support
Built-in exercise database
Goal-specific workout suggestions:
Bulking → Push/Pull/Legs splits
Cutting → Circuit-style workouts
Exercise visuals via GIFs

🛠️ Tech Stack
Frontend
Next.js 14
TypeScript
Tailwind CSS
Framer Motion
Deployed on Netlify
Backend
FastAPI (Python)
BeautifulSoup for web scraping
Deployed on Render
APIs & Data
Penn State Dining (absecom.psu.edu) → menu scraping
ExerciseDB API → workout data (proxied + cached)
Storage
localStorage
Stores user profile (goal, calories, preferences)
No authentication required → fast and lightweight

⚙️ How It Works
Backend scrapes PSU dining menus in real time
Separates meals into:
Breakfast
Lunch
Dinner
Calculates user-specific calorie & macro targets
Filters food options based on those targets
Frontend displays:
Meals
Progress tracking
Workout suggestions

⚠️ Challenges We Faced
🧩 Inconsistent HTML structures across dining halls
🍽️ Mapping nutritional data correctly to each item
🔄 Handling unreliable third-party API responses
🕒 Building everything under tight hackathon time constraints

🏆 Accomplishments
✅ Real-time meal planner aligned with PSU dining schedules
📱 Fully responsive UI (mobile + desktop)
🎯 Personalized macro tracking with animated visuals
🏋️ Integrated workout system with goal-based plans
⚡ No auth system — fast, simple, and deployable for free

📚 What We Learned
Building a full-stack system under pressure
Handling real-world messy data (web scraping)
Designing UI that actually improves usability
Applying nutrition science concepts:
TDEE calculations
Macro distributions
Caloric balance

🔮 What’s Next
🌍 Expand to other universities (modular scraping system)
🤖 Add LLM-powered meal recommendations
📈 Smarter personalization based on user behavior
📱 Turn into a fully deployable student-facing app

🧑‍💻 Contributors
Tarun Kumar
Yajat Singh

