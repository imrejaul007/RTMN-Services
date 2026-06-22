# ReZ Admin Training Panel

An admin dashboard for training the AI with books, articles, and FAQs. This panel provides a comprehensive interface for managing training data, FAQs, knowledge base entries, and analyzing conversation logs.

## Features

### Pages

- **Dashboard** - Overview statistics and recent activity
- **Knowledge Base** - Manage merchant information and training content
- **Training Data** - Upload books, articles, menu CSV/JSON files
- **FAQs** - Add, edit, delete, and bulk import FAQs
- **Conversations** - View and analyze chat logs from the support copilot
- **Analytics** - Usage statistics and performance metrics

### Features

- File upload for:
  - PDF books
  - Articles (URL or text)
  - Training documents
  - Menu CSV/JSON
- FAQ management:
  - Add/Edit/Delete FAQs
  - Categorize FAQs
  - Bulk import from CSV
- Merchant knowledge editor
- Conversation logs viewer
- Analytics dashboard:
  - Total conversations
  - Resolution rate
  - Popular intents
  - Failed queries

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Recharts** - Charts and visualizations
- **Lucide React** - Icons
- **Axios** - HTTP client

## Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPPORT_COPILOT_URL=http://localhost:3001
VITE_KNOWLEDGE_BASE_URL=http://localhost:3002
VITE_TRAINING_API_URL=http://localhost:3003
```

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── Sidebar.tsx
│   ├── FileUpload.tsx
│   └── DataTable.tsx
├── pages/             # Page components
│   ├── Dashboard.tsx
│   ├── KnowledgeBase.tsx
│   ├── TrainingData.tsx
│   ├── FAQs.tsx
│   ├── Conversations.tsx
│   └── Analytics.tsx
├── services/          # API services
│   └── api.ts
├── types/             # TypeScript types
│   └── index.ts
├── App.tsx            # Main app component
├── main.tsx           # Entry point
└── index.css          # Global styles
```

## API Integration

The panel connects to the following services:

- **REZ-support-copilot** - For conversation logs
- **rez-knowledge-base-service** - For knowledge management

Configure the service URLs in your environment variables.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## License

Private - All rights reserved
