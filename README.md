# Campus Life Events

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![Rust](https://img.shields.io/badge/Rust-black?style=for-the-badge&logo=rust)
![TypeScript](https://img.shields.io/badge/TypeScript-black?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=for-the-badge&logo=postgresql)

**A modern, full-stack event management system for campus organizations with iCal integration and admin dashboard**

[🚀 Quick Start](#-quick-start) • [📋 Features](#-features) • [📦 Technology Stack](#-technology-stack) • [🔧 API](#-api) • [🤝 Contributing](#-contributing)

</div>

---

## 🌟 Overview

Campus Life Events is a comprehensive event management platform designed specifically for clubs and organizations at THI (Technische Hochschule Ingolstadt). It provides a complete ecosystem for creating, managing, and sharing campus events with seamless integration into student life.

### 🎯 What It Does

- **📅 Event Management**: Create, edit, and manage campus events with rich details
- **👥 Organizer Accounts**: Dedicated accounts for each club and organization
- **🔐 Admin Dashboard**: Comprehensive admin interface for moderation and approval
- **📱 iCal Integration**: Export events to calendar applications
- **📧 Newsletter Generation**: Automated weekly event newsletters for students
- **🔗 Neuland App Integration**: Seamless integration with the [Neuland Next App](https://neuland.app)
- **📊 Audit Logging**: Complete audit trail for all administrative actions
- **🎨 Modern UI/UX**: Beautiful, responsive dashboard with dark/light theme support

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Bun](https://bun.sh/) or [Node.js](https://nodejs.org/) (for frontend development)
- [Rust](https://rust-lang.org/) (for backend development)
- [PostgreSQL](https://postgresql.org/) (or use Docker)

### 🐳 Docker Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/neuland-ingolstadt/campus-life-events.git
   cd campus-life-events
   ```

2. **Set up environment variables**
   ```bash
   # Backend
   cd backend
   cp .env.example .env.local
   # Edit .env.local with your configuration
   
   # Frontend
   cd ../frontend
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start the services**
   ```bash
   # Start database
   cd backend
   docker compose up -d
   
   # Start backend API
   cargo run
   
   # Start frontend (in another terminal)
   cd frontend
   bun install
   bun run dev
   ```

4. **Access the application**
   - Frontend Dashboard: http://localhost:3000
   - API Documentation: http://localhost:8080/api/swagger-ui
   - Health Check: http://localhost:8080/api/v1/health

### 🛠️ Development Setup

#### Frontend (Next.js)
```bash
cd frontend
bun install
bun run dev
```

#### Backend (Rust)
```bash
cd backend
cargo run
```

---

## 📋 Features

### 🎪 **Event Management**
- **Rich Event Details**: Title, description, location, date/time, and organizer information
- **Event Categories**: Organize events by type and topic
- **Image Support**: Upload and manage event images
- **Status Management**: Draft, published, and archived event states
- **Bulk Operations**: Manage multiple events efficiently

### 👥 **Organizer System**
- **Dedicated Accounts**: Each club gets its own organizer account
- **Profile Management**: Customize organizer profiles and contact information
- **Event Creation**: Intuitive event creation and editing interface
- **Dashboard Analytics**: Track event performance and engagement

### 🔐 **Admin Dashboard**
- **Event Moderation**: Review and moderate event submissions
- **Organizer Management**: Invite and manage club accounts
- **Audit Logging**: Complete audit trail for all actions
- **User Administration**: Manage admin accounts
- **System Analytics**: Overview of platform usage and statistics

### 📱 **Integration & Export**
- **iCal Feeds**: Export events to calendar applications
- **Newsletter Generation**: Automated weekly event newsletters
- **Neuland App**: Seamless integration with student mobile app
- **Public Event Pages**: Shareable event pages for external promotion
- **Email Notifications**: Automated email alerts and updates

### 🎨 **User Experience**
- **Responsive Design**: Mobile-first, tablet, and desktop support
- **Theme Support**: Light, dark, and system theme modes
- **Accessibility**: WCAG compliant with keyboard navigation
- **Modern UI**: Clean, intuitive interface with shadcn/ui components
- **Real-time Updates**: Live data synchronization across the platform

---

## 📦 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Next.js 15, React 19, TypeScript | Modern web application with SSR |
| **UI Framework** | Tailwind CSS, shadcn/ui, Radix UI | Responsive, accessible components |
| **State Management** | TanStack Query | Server state management |
| **Forms** | React Hook Form, Zod | Form handling and validation |
| **Backend** | Rust, Axum, SQLx | High-performance API server |
| **Database** | PostgreSQL 16 | Reliable data storage |
| **Authentication** | Argon2, Session-based | Secure user authentication |
| **Email** | Lettre, SMTP | Email notifications and newsletters |
| **API Documentation** | OpenAPI/Swagger | Interactive API documentation |

---

### **OpenAPI Documentation**
Visit `http://localhost:8080/api/swagger-ui` for interactive API documentation.

---

## 🔐 Security Features

### **Authentication & Authorization**
- **Argon2 Password Hashing**: Industry-standard password security
- **Session Management**: Secure HTTP-only cookies
- **Role-based Access**: Organizer and admin permission levels
- **Token Validation**: Secure authentication tokens

### **Data Protection**
- **HTTPS Encryption**: All communication encrypted
- **CORS Protection**: Controlled cross-origin access
- **Security Headers**: X-Frame-Options, HSTS, and more
- **Input Validation**: Comprehensive data validation

### **Audit & Compliance**
- **Audit Logging**: Complete action history
- **Data Integrity**: Database constraints and validation
- **Privacy Focus**: Minimal data collection

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](.github/CONTRIBUTING.md) for details.

---

## 📄 License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made by [Neuland Ingolstadt e.V.](https://neuland-ingolstadt.de) for THI Campus Life**

[![GitHub stars](https://img.shields.io/github/stars/neuland-ingolstadt/campus-life-events?style=social)](https://github.com/neuland-ingolstadt/campus-life-events)
[![GitHub forks](https://img.shields.io/github/forks/neuland-ingolstadt/campus-life-events?style=social)](https://github.com/neuland-ingolstadt/campus-life-events)
[![GitHub issues](https://img.shields.io/github/issues/neuland-ingolstadt/campus-life-events)](https://github.com/neuland-ingolstadt/campus-life-events/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/neuland-ingolstadt/campus-life-events)](https://github.com/neuland-ingolstadt/campus-life-events/pulls)

</div>
