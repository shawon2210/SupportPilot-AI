# SupportPilot AI — Demo Script

## 3–5 Minute Product Demo

This script walks through the key features of SupportPilot AI. Follow it step by step for a compelling demo.

---

## Setup (Before Recording)

1. Have a test PDF ready (a FAQ document or product docs work well)
2. Open the deployed app in your browser
3. Sign up with a test account
4. Have the architecture diagram open in another tab (for the technical segment)

---

## Script

### 0:00–0:30 — Introduction

> "This is SupportPilot AI — a multi-tenant AI customer support platform. Businesses can upload their documentation, knowledge base, and website content, and get an AI support agent trained on their data. Let me show you how it works."

**Action:** Show the landing page / dashboard.

---

### 0:30–1:00 — Create a Workspace

> "First, I'll create a workspace. A workspace is an isolated environment for a business — it has its own documents, team members, chat history, and billing."

**Action:**
1. Click "Create Workspace"
2. Name: "Acme Corp Support"
3. Slug: "acme-corp"
4. Click Create

> "The workspace is created instantly. Notice the URL is scoped to this workspace — all data here is isolated from other workspaces."

---

### 1:00–1:45 — Upload Documents

> "Now I'll upload some documents. SupportPilot supports PDF, DOCX, TXT, and Markdown files."

**Action:**
1. Go to Documents tab
2. Upload 2-3 PDF files (FAQ, product docs, policies)
3. Show the upload progress

> "The system extracts text from each document, breaks it into chunks, generates embeddings, and stores them in a vector database. This is the 'R' in RAG — Retrieval."

**Action:** Click on an uploaded document to show chunk details.

---

### 1:45–2:30 — Chat with Your Data

> "Now the fun part. I'll start a chat and ask questions about the uploaded documents."

**Action:**
1. Go to Chat tab
2. Create a new chat: "Customer Support Inquiry"
3. Type: "What is the return policy?"
4. Show the streaming response with source citations

> "The AI answers based on the uploaded documents — not generic knowledge. Notice the source citations at the bottom — it tells you exactly which document and section the answer came from. This is the 'Augmented' in RAG."

**Action:** Ask 2-3 more questions to show variety:
- "How do I reset my password?"
- "What are your business hours?"

---

### 2:30–3:00 — Embeddable Widget

> "Now let's deploy this as a chat widget on a website. This is the killer feature."

**Action:**
1. Go to Widget tab
2. Customize: change brand color, greeting message
3. Copy the embed code
4. Show the embed code: `<script src="https://..."></script>`

> "That's it. One line of code. Business users can paste this on any website — React, WordPress, Shopify, static HTML. The widget inherits the theme and connects to the same knowledge base."

**Action:** If possible, open a test HTML page with the widget embedded.

---

### 3:00–3:30 — Team Management

> "Let's add team members. There are four roles: Owner, Admin, Agent, and Member."

**Action:**
1. Go to Members tab
2. Invite a member with "Agent" role
3. Show the member list

> "Each role has different permissions. Agents can manage chats but can't modify billing. Admins can manage everything except delete the workspace. Only the Owner can delete."

---

### 3:30–4:00 — Analytics Dashboard

> "Finally, let's look at analytics."

**Action:**
1. Go to Analytics tab
2. Show: total messages, active users, documents, response times

> "The dashboard shows usage metrics, response times, and knowledge gaps — questions the AI couldn't answer. This helps businesses identify missing documentation."

---

### 4:00–4:30 — Technical Architecture (Optional, for technical audience)

> "Under the hood, this is a FastAPI backend with a multi-tenant architecture. Every query is scoped to a workspace — enforced at the repository layer, not just the API layer."

**Action:** Show the architecture diagram (docs/architecture.html).

> "The AI layer supports 7 providers — OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, Kimi, and a custom FreeKey provider. Swapping providers requires changing one environment variable. The event bus uses Redis Streams for background processing, and the Outbox Pattern guarantees reliable webhook delivery."

---

### 4:30–5:00 — Close

> "That's SupportPilot AI. 100 Python modules, 79 API endpoints, 97 automated tests, and a complete CI/CD pipeline. The code is on GitHub — link in the description."

**Action:** Show the GitHub repo.

---

## Demo Tips

1. **Keep it under 5 minutes** — cut the technical section if needed
2. **Use real documents** — generic PDFs make the demo feel authentic
3. **Show the streaming** — the real-time response is the most impressive visual
4. **Highlight citations** — source citations are the key differentiator from generic chatbots
5. **Show the widget embed** — the single script tag is a powerful moment

## Recording Checklist

- [ ] Screen recording at 1080p or higher
- [ ] Audio narration (use a decent microphone)
- [ ] Cursor highlights (use a cursor highlight tool)
- [ ] Zoom in on key areas (embed code, citations, architecture diagram)
- [ ] Export as MP4, upload to YouTube/Loom
- [ ] Add timestamps in the description for each section
