1. Authentication (/login)
Feature	Status	Notes
Sign up with email/password	🔴	Supabase Auth
Sign in with email/password	🔴	
Forgot password / reset	🔴	
Redirect to dashboard after login	🔴	
Protect routes (middleware)	🔴	Redirect to /login if not authenticated
Logout button (navbar)	🔴	
2. Dashboard (/)
Feature	Status	Notes
KPI Cards		
- Total income (current month / selected range)	🔴	Sum of income transactions
- Total expense	🔴	Sum of expense transactions
- Net balance	🔴	Income - expense
- Unpaid bills count	🔴	From bills table where paid = false
Charts		
- Bar chart (monthly income vs expense)	🔴	Use recharts, filter by selected range
- Pie chart (expenses by category)	🔴	For current month / range
Date Range Filter	🔴	Affects all dashboard data, default to current month
Quick Transaction Form	🔴	Add transaction without leaving dashboard
Recent Transactions List (last 5-10)	🔴	Link to /transactions
Budget Progress Bars (optional)	🔴	Requires budgets table
3. Transactions (/transactions)
Feature	Status	Notes
Table View		
- Show all transactions (paginated)	🔴	
- Columns: date, description, category, caixa, amount (color-coded), actions	🔴	
- Sort by any column	🔴	Default sort by date desc
CRUD Operations		
- Add transaction (form or modal)	🔴	Fields: type, amount, description, category, caixa, date
- Edit transaction	🔴	Pre-populate form
- Delete transaction	🔴	Confirm dialog
Filters & Search		
- Date range filter	🔴	
- Category filter (multi-select)	🔴	
- Caixa filter	🔴	
- Search by description	🔴	
- Active filters indicator + clear all	🔴	
Export		
- Export filtered data to CSV	🔴	
Bulk Actions (optional)	🔴	Delete multiple, change category
4. Bills (/bills)
Feature	Status	Notes
List View		
- Show all bills (unpaid first, sorted by due date)	🔴	
- Columns: description, amount, due date, category, caixa, paid (checkbox), actions	🔴	
- Highlight overdue (due date < today and not paid)	🔴	Red background or border
- Highlight due soon (within 3 days)	🔴	Yellow/orange
Summary		
- Total unpaid amount	🔴	
- Overdue amount	🔴	
CRUD		
- Add bill (form)	🔴	Fields: description, amount, due date, category (optional), caixa (optional)
- Edit bill	🔴	
- Delete bill	🔴	
- Toggle paid (checkbox)	🔴	When paid, optionally auto-create a transaction
Recurring Bills		
- Mark a bill as recurring (monthly, weekly, etc.)	🔴	Requires recurring column in bills table
- Auto-generate next occurrence when paying	🔴	Edge function or client-side logic
Email Notifications (future)	🔴	Supabase Edge Function + cron
5. Settings (/settings)
5.1 Caixas (Accounts)
Feature	Status	Notes
List all caixas	🔴	Show name, initial balance, current balance (calculated)
Add new caixa	🔴	Fields: name, initial balance
Edit caixa (name only? or rename)	🔴	
Delete caixa	🔴	Only if no transactions linked (RESTRICT)
Show current balance per caixa	🔴	Sum of all transactions for that caixa
5.2 Categories
Feature	Status	Notes
List all categories	🔴	Show name, type (income/expense), color
Add new category	🔴	Fields: name, type, color (optional)
Edit category	🔴	
Delete category	🔴	Set category_id = NULL in transactions (ON DELETE SET NULL)
Color picker for UI	🔴	Use HTML color input
5.3 Transfers (between caixas) – optional page or modal
Feature	Status	Notes
Transfer form: from caixa, to caixa, amount, date, description	🔴	
Creates two transactions: expense from source, income to destination	🔴	Link them with a transfer_id column
Show transfer history (optional)	🔴	
6. Profile (/profile)
Feature	Status	Notes
View current profile info	🔴	Full name, email (read-only), phone, avatar
Edit profile (update full name, phone)	🔴	
Upload avatar image	🔴	Use Supabase Storage
Change password	🔴	Via Supabase auth
Delete account	🔴	Confirmation, cascade delete all user data
Link to /login? No, logout button in navbar	🔴	
7. Global / Infrastructure
Feature	Status	Notes
Supabase Setup		
- Tables created (profiles, categories, caixas, transactions, bills)	🔴	
- RLS policies enabled	🔴	
- Storage bucket for avatars	🔴	
Next.js Setup		
- Environment variables (.env.local)	🔴	
- Supabase client (lib/supabaseClient.ts)	🔴	
- Custom hook useFinanceData	🔴	Centralized data fetching & mutations
- Middleware for route protection	🔴	
UI & Navigation		
- Layout with navbar (links to all pages)	🔴	Hide on /login
- Tailwind CSS responsive design	🔴	Mobile-friendly
- Dark mode toggle (optional)	🔴	Use next-themes
Deployment		
- GitHub repository	🔴	
- Deployed to Vercel	🔴	
Future Enhancements (Backlog)
Feature	Page / Area	Priority
Budget per category (monthly)	Dashboard + /budgets	Medium
CSV import (bank statements)	Transactions	Low
Email reminders for bills	Bills	Medium
Mobile app (React Native)	All	Low
Shareable reports (PDF)	Reports	Low
Multi-currency support	Global	Low