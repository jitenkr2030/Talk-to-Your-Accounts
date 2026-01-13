# Talk to Your Accounts - AI-Powered Desktop Accounting Software

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-black.svg" alt="Platform">
  <img src="https://img.shields.io/badge/Electron-34.0.0-yellow.svg" alt="Electron">
  <img src="https://img.shields.io/badge/React-18.3.0-61dafb.svg" alt="React">
</p>

<p align="center">
  <strong>AI-Powered Desktop Accounting Software</strong><br>
  "You talk. Accounts respond." - Experience the future of financial management
</p>

---

## 🚀 Features

### 🤖 AI-Powered Capabilities

- **Voice Interaction**: Interact with your accounts using natural voice commands in English, Hindi, or Hinglish
- **AI Assistant**: Natural language processing for transactions, queries, and report generation
- **Smart Insights**: AI-powered business health analysis and recommendations
- **Voice-Enabled Reports**: Auto-read financial reports for accessibility
- **Intelligent Suggestions**: Context-aware quick actions based on your business data

### 📊 Core Accounting Features

- **Transaction Management**: Record sales, purchases, and expenses with voice or text
- **Party Management**: Manage customers and vendors with complete contact details
- **Inventory Tracking**: Products, stock levels, and pricing management
- **Comprehensive Reports**: Sales, GST, Profit & Loss, Balance Sheet, Cash Flow, and Outstanding Aging
- **Auto-Reconciliation**: Automated matching and error detection
- **GST Compliance**: GSTR-1 and GSTR-3B ready reports

### 🔒 Security & Data Protection

- **Role-Based Access Control**: Admin, Editor, and Viewer roles
- **Encrypted Exports**: AES-256 encrypted data backups for secure sharing
- **Local Data Storage**: SQLite database with all data stored locally
- **Audit Trails**: Complete activity logging for compliance and tracking
- **Secure Authentication**: Session-based login system

### 💡 Smart Features

- **Business Health Score**: AI-calculated overall business health with detailed breakdowns
- **Alert System**: Real-time notifications for GST filing, payments, and stock levels
- **Quick Actions**: One-click access to common tasks
- **Multi-Language Support**: English, Hindi, and Hinglish interfaces

---

## 📦 Tech Stack

- **Frontend**: React 18 with Vite, TailwindCSS
- **Desktop Runtime**: Electron 34
- **Backend**: Node.js with IPC bridge
- **Database**: SQLite
- **State Management**: Zustand
- **Voice Recognition**: Web Speech API
- **Text-to-Speech**: Native browser TTS

---

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- Operating System: Windows 10/11, macOS 11+, or Linux

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/jitenkr2030/Talk-to-Your-Accounts.git
   cd Talk-to-Your-Accounts/talk-to-your-accounts
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Run in Electron**
   ```bash
   npm run electron
   ```

### Production Build

```bash
# Build for production
npm run build

# Package for current platform
npm run package
```

---

## 📁 Project Structure

```
talk-to-your-accounts/
├── electron/
│   ├── database.js          # SQLite database setup and queries
│   ├── main.js              # Electron main process and IPC handlers
│   └── preload.js           # Preload script for secure IPC
├── public/
│   ├── favicon.svg
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   └── LoginScreen.jsx
│   │   └── features/
│   │       └── AlertNotificationCenter.jsx
│   ├── core/
│   │   └── nlpEngine.js     # Natural language processing engine
│   ├── pages/
│   │   ├── LandingPage.jsx  # Main dashboard with AI command center
│   │   └── DataManagementPage.jsx  # Backup, restore, export
│   ├── services/
│   │   ├── encryptedExport.js    # AES-256 encryption for exports
│   │   ├── errorDetection.js     # Transaction validation
│   │   ├── reconciliation.js     # Auto-matching logic
│   │   ├── voiceCommand.js       # Voice input handling
│   │   ├── voiceManager.js       # Text-to-speech
│   │   └── auditTrail.js         # Activity logging
│   ├── stores/
│   │   └── appStore.js      # Zustand state management
│   ├── styles/
│   │   └── index.css        # Global styles
│   ├── App.jsx              # Main application component
│   └── main.jsx             # Entry point
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## 🎯 Key Components

### LandingPage.jsx
The modern dashboard featuring:
- AI command center with search and voice input
- Real-time financial metrics (sales, receivables, expenses, cash flow)
- Quick actions for common tasks
- Recent transactions list
- Business health score card
- Alerts and insights panel

### NLP Engine
Natural language processing for:
- Transaction recording ("Sold goods worth ₹5000 to John")
- Report generation ("Show GST report for January")
- Business queries ("How much did I sell today?")
- Insights requests ("Business health check")

### Security Features

#### Encrypted Exports
```javascript
// AES-256-CBC encryption for secure data sharing
const encryptedData = await exportService.createEncryptedBackup(password);
```

#### Role-Based Access
- **Admin**: Full access to all features and settings
- **Editor**: Can create, edit, and delete records
- **Viewer**: Read-only access to reports and data

---

## 📱 User Interface

### Dashboard View
- Welcome message with personalized greeting
- Four key metric cards with trend indicators
- Six quick action buttons
- Recent transactions with type indicators
- Alerts panel with severity levels
- Business health score visualization
- Party and product summary
- Expense breakdown by category

### AI Assistant
- Chat interface for natural language interaction
- Voice input with visual feedback
- Auto-read reports option
- Transaction confirmation flow
- Report generation and display

### Reports
- Sales Report
- GST Report (GSTR-1/GSTR-3B ready)
- Profit & Loss Statement
- Balance Sheet
- Cash Flow Statement
- Outstanding Aging Report
- Expense Summary

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_APP_NAME=Talk to Your Accounts
VITE_APP_VERSION=1.0.0
```

### Database Configuration

The application uses SQLite with the following tables:
- `users` - User accounts and roles
- `business_info` - Business details
- `parties` - Customers and vendors
- `products` - Product catalog
- `transactions` - Financial transactions
- `expenses` - Expense records
- `audit_logs` - Activity tracking
- `alerts` - System notifications

---

## 📊 Analytics & Performance

### Current Performance Metrics
- **Startup Time**: < 3 seconds
- **Memory Usage**: ~150 MB typical
- **Database Size**: Compact single-file SQLite
- **UI Responsiveness**: 60fps smooth animations

### Optimization Features
- Lazy loading of components
- Efficient state management with Zustand
- Debounced voice input processing
- Optimistic UI updates

---

## 🔐 Security Measures

1. **Local Data Storage**: All data stored in SQLite on local machine
2. **Encrypted Backups**: AES-256 encryption for export files
3. **Session Management**: Secure authentication with session tokens
4. **Audit Logging**: Complete trail of all actions
5. **Input Validation**: Server-side validation for all inputs

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

### Getting Help
- **Documentation**: See this README and code comments
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions

### Common Questions

**Q: How do I backup my data?**
A: Go to Data Management page and use "Export Encrypted" feature with a secure password.

**Q: Can I use this offline?**
A: Yes! All data is stored locally and no internet connection is required for core features.

**Q: What languages does the voice input support?**
A: English, Hindi, and Hinglish are fully supported.

**Q: How secure is my data?**
A: Data is stored locally in SQLite with optional AES-256 encryption for exports.

---

## 🔗 Quick Links

- **Repository**: https://github.com/jitenkr2030/Talk-to-Your-Accounts
- **Issues**: https://github.com/jitenkr2030/Talk-to-Your-Accounts/issues
- **Discussions**: https://github.com/jitenkr2030/Talk-to-Your-Accounts/discussions

---

<p align="center">
  Made with ❤️ by Jiten Kumar
</p>

<p align="center">
  <sub>Last updated: January 2026 | Version 1.0.0</sub>
</p>
