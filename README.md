# Expense Tracker

A comprehensive, AI-powered expense tracking application built with modern web technologies to help users manage their finances effectively.

## 📸 Screenshots

![Expense Analytics](https://private-user-images.githubusercontent.com/176319950/414283015-0aafa7c7-0cc8-45f5-93d4-d3dbfa196e54.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Mzk4ODY0NzEsIm5iZiI6MTczOTg4NjE3MSwicGF0aCI6Ii8xNzYzMTk5NTAvNDE0MjgzMDE1LTBhYWZhN2M3LTBjYzgtNDVmNS05M2Q0LWQzZGJmYTE5NmU1NC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjUwMjE4JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI1MDIxOFQxMzQyNTFaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1kYjVmZDMxMjgzYzU1NjAyMDg5MzM2YzNmOWY4NTBkY2VlZmJkMTZmYTk5ZTE4ZGRiODBiYTYyZjhkYjU0YzdlJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.zWlqgma3hUKpjDDztAaqyJ3YppP8y_J6_3W650laOfQ)
![Expense Tracker Dashboard](https://private-user-images.githubusercontent.com/176319950/414284562-ac24b1d2-7ebe-435e-86fa-86331a92952b.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3Mzk4ODY0MTgsIm5iZiI6MTczOTg4NjExOCwicGF0aCI6Ii8xNzYzMTk5NTAvNDE0Mjg0NTYyLWFjMjRiMWQyLTdlYmUtNDM1ZS04NmZhLTg2MzMxYTkyOTUyYi5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjUwMjE4JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI1MDIxOFQxMzQxNThaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1iYWEwNmU3NWM0MTc5ODEwM2M0NzEyNDk5NWViMTcwM2Q3MzFmZTczOTBlZmJmZWE4NDMyMGM5ZjkwMThmN2VmJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.lkfdwbVmnFA9UxC5G_KdIm3ybSCfoNcVOBOFAWRLFwk)

## 🚀 Features

- **Expense Management**: Add, edit, and delete expenses with ease
- **Receipt Management**: Upload receipts via Cloudinary integration
- **Expense Visualization**: View expenses by month, week, and year
- **Data Visualization**: Interactive graphs and pie charts showing spending distribution
- **AI-Powered Analysis**: Get personalized financial insights based on your spending patterns
- **Financial Forecasting**: Receive spending projections based on current patterns
- **Goal Setting**: Set financial goals and get AI-generated savings plans
- **Income Management**: Update and track your income

## 🛠️ Tech Stack

- **Frontend**:
  - [Next.js 15](https://nextjs.org/) - React framework with server components
  - [React 19](https://react.dev/) - UI library
  - [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
  - [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
  - [shadcn/ui](https://ui.shadcn.com/) - High-quality React components
  - [Recharts](https://recharts.org/) - Composable charting library

- **Backend**:
  - [Prisma](https://www.prisma.io/) - Type-safe ORM
  - [Neon PostgreSQL](https://neon.tech/) - Serverless Postgres database
  - [Next Auth](https://next-auth.js.org/) - Authentication for Next.js
  - [Zod](https://zod.dev/) - TypeScript-first schema validation

- **AI Integration**:
  - [Google Generative AI](https://ai.google.dev/) - Powers financial insights and advice

- **Cloud Services**:
  - [Cloudinary](https://cloudinary.com/) - Receipt storage and image management

## 📋 Prerequisites

- Node.js 20.x or later
- Yarn or npm
- Neon PostgreSQL database
- Cloudinary account for receipt storage
- Google AI Studio API key

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/asap007/ExpenseTracker.git
cd ExpenseTracker
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgres://your-neon-connection-string"

# Authentication
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:4000"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Google AI
GOOGLE_AI_API_KEY="your-google-ai-api-key"
```

### 4. Set up the database

```bash
npx prisma generate
npx prisma db push
# Optional: Seed the database
npx prisma db seed
```

### 5. Run the development server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:4000](http://localhost:4000) in your browser to see the application.

## 🏗️ Project Structure

```
expense-tracker/
├── components/         # Reusable UI components
├── app/                # Next.js app router
│   ├── api/            # API routes
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Main dashboard
│   ├── expenses/       # Expense management
│   ├── analytics/      # AI-powered insights
│   └── goals/          # Financial goals
├── lib/                # Utility functions and helpers
├── prisma/             # Database schema and migrations
├── public/             # Static assets
└── styles/             # Global styles
```

## 🔒 Authentication

The application uses NextAuth.js with the Prisma adapter for secure user authentication. Features include:

- Email/password authentication
- OAuth providers support
- Secure session management
- Role-based access control

## 📊 Dashboard

The dashboard provides an overview of your financial health with:

- Monthly expense summary
- Recent transactions
- Spending by category (pie chart)
- Income vs. expenses comparison
- Quick access to add new expenses

## 💰 Expense Management

- **Categories**: Categorize expenses (e.g., food, transportation, utilities)
- **Receipt Upload**: Attach receipts to expenses using Cloudinary
- **Filtering**: Filter expenses by date, category, or amount
- **Export**: Export expense data to CSV or PDF

## 🤖 AI-Powered Analytics

The app leverages Google's Generative AI to provide:

- Personalized financial insights
- Spending pattern analysis
- Actionable recommendations for saving money
- Custom savings plans based on your financial goals

## 🎯 Goal Setting

- Set short-term and long-term financial goals
- Track progress towards goals
- Receive AI-generated advice on reaching goals faster
- Visualize goal progress with interactive charts

## 📱 Responsive Design

Fully responsive UI that works seamlessly on:
- Desktop
- Tablet
- Mobile devices

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/) - The React Framework
- [Tailwind CSS](https://tailwindcss.com/) - For styling
- [shadcn/ui](https://ui.shadcn.com/) - For beautiful UI components
- [Prisma](https://www.prisma.io/) - For database access
- [Neon PostgreSQL](https://neon.tech/) - For database hosting
- [Cloudinary](https://cloudinary.com/) - For image management
- [Google Generative AI](https://ai.google.dev/) - For AI-powered insights

---

Created with ❤️ by [asap007](https://github.com/asap007)
