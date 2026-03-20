# FreelancePay Agent

A decentralized freelance platform where:

- **Client posts job**: Clients can create and post job listings with requirements.
- **Client deposits stablecoin escrow**: Funds are held in escrow using stablecoins for security.
- **Freelancer submits work**: Freelancers deliver completed work for review.
- **AI Agent judges disputes**: If the client refuses to pay, an AI agent reviews the requirements, submission, and decides on payment.

## AI Agent Role

The AI agent handles:

- Reviewing job requirements
- Reviewing freelancer submissions
- Deciding whether payment should be released from escrow

## Tech Stack

- Next.js 16
- React 19
- Prisma ORM with SQLite (development) / PostgreSQL (production)
- Ethers.js for blockchain interaction
- Thirdweb for Web3 integration
- Tailwind CSS for styling

## Getting Started

First, install dependencies:

```bash
npm install
```

Set up the database:

```bash
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed with sample data
npm run db:seed
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database

This project uses Prisma ORM with SQLite for development. The database schema includes:

- **Users**: Client and freelancer profiles
- **Jobs**: Job postings with blockchain integration
- **Applications**: Freelancer applications to jobs
- **Disputes**: Dispute records for AI resolution

### Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database with sample data
npm run db:seed
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

For production deployment, consider switching to PostgreSQL by updating the `DATABASE_URL` in your environment variables and changing the `datasource` in `prisma/schema.prisma`.
