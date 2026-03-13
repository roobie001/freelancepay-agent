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

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- Next.js 16
- React 19
- Ethers.js for blockchain interaction
- Thirdweb for Web3 integration
- Tailwind CSS for styling

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
