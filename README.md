# Carto 🛒

> **Smart Shopping List with AI-Powered Voucher Optimization**

A modern, full-stack web application that revolutionizes household shopping management through intelligent voucher optimization, collaborative lists, and AI-powered categorization.

## 🎯 Overview

Carto helps families and individuals streamline their shopping experience by:
- Automatically categorizing items using AI
- Optimizing voucher usage to maximize savings
- Enabling real-time collaboration across household members
- Tracking shopping history and spending patterns

## ✨ Key Features

### 🛒 **Smart Shopping Lists**
- Auto-categorization with OpenAI integration
- Image upload for items
- Quantity management with partial purchase tracking
- Real-time synchronization across devices

### 🎫 **Intelligent Voucher Management**
- Track both one-time and accumulated vouchers
- Expiration date notifications
- Optimal voucher combination algorithm
- Visual progress tracking

### 👥 **Household Collaboration**
- Multi-user household support
- Real-time updates across family members
- Shared shopping history
- User role management

### 📊 **Analytics & Insights**
- Spending statistics by category
- Shopping pattern analysis
- Savings tracking
- Visual charts and reports

### 🤖 **AI-Powered Features**
- Automatic item categorization
- Smart voucher recommendations
- Purchase history learning

## 🛠️ Tech Stack

### Frontend
- **React 18** with **TypeScript** - Type-safe UI development
- **Tailwind CSS** - Modern, utility-first styling
- **React Router** - Client-side routing
- **Lucide React** - Beautiful icon system
- **Chart.js** - Data visualization

### Backend & Services
- **Firebase Authentication** - Secure user management (Email/Password, Google OAuth)
- **Cloud Firestore** - Real-time NoSQL database with offline support
- **Firebase Storage** - Image storage and optimization
- **OpenAI API** - AI-powered item categorization

### State Management & Hooks
- React Context API for global state
- Custom hooks for form persistence and page visibility
- React Hook Form for efficient form handling

### Development Tools
- TypeScript for type safety
- ESLint for code quality
- React Scripts (Create React App)

## 📦 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- OpenAI API key (optional, for AI features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/shopping-vouchers.git
cd shopping-vouchers
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in your Firebase and OpenAI credentials
```bash
cp .env.example .env.local
```

4. Configure Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password and Google)
   - Create a Firestore database
   - Enable Firebase Storage
   - Copy your Firebase config to `.env.local`

### Available Scripts

In the project directory, you can run:

#### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

#### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

#### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── shopping/       # Shopping list components
│   ├── vouchers/       # Voucher management components
│   ├── household/      # Household management
│   └── shared/         # Reusable UI components
├── contexts/           # React Context providers
├── hooks/              # Custom React hooks
├── services/           # API and Firebase services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── config/             # Configuration files
```

## 🔐 Security

- All sensitive credentials are stored in environment variables
- Firebase Security Rules implemented for database access control
- Authentication required for data access
- Service account keys excluded from version control

## 🚀 Deployment

The application can be deployed to:
- **Firebase Hosting** (recommended)
- **Netlify** (netlify.toml included)
- Any static hosting service

Build for production:
```bash
npm run build
```

## 📈 Performance Optimizations

- Page visibility detection to pause listeners when inactive
- Image compression and optimization
- Real-time listener management
- Optimistic UI updates

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

---

**Built with ❤️ for smarter shopping**

*Empowering households to shop efficiently and save money through intelligent automation.*
