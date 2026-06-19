# Demo Video Script — SupportPilot AI

**Duration:** 3-5 minutes  
**Format:** Screen recording with voiceover  
**Goal:** Show the product's value in under 5 minutes

---

## Scene 1: Introduction (0:00 - 0:30)

**Screen:** GitHub repo page or live dashboard

**Script:**
> "This is SupportPilot AI — a multi-tenant AI customer support platform I built from scratch. It lets businesses train an AI support agent on their own documentation and deploy it to their website in minutes. Let me show you how it works."

---

## Scene 2: Login + Dashboard (0:30 - 1:00)

**Screen:** Sign in → Dashboard

**Script:**
> "After signing in with Google or email, you land on the dashboard. Here you can see your workspaces, recent chats, and key metrics. Let's open the Acme Corp workspace."

---

## Scene 3: Upload Document (1:00 - 1:45)

**Screen:** Knowledge → Upload → Select PDF → Upload progress

**Script:**
> "Let's add to the knowledge base. I'll upload an employee handbook PDF. The system automatically extracts the text, chunks it, generates embeddings, and stores them in the vector database. Within seconds, this document is ready for AI-powered questions."

---

## Scene 4: Ask Question + RAG Response (1:45 - 2:30)

**Screen:** Chat → New Chat → Type question → AI response with citations

**Script:**
> "Now I'll ask a question: 'What is the refund policy for damaged items?' The AI searches the knowledge base, finds the relevant section from the handbook, and generates a response with source citations. The user can click to see exactly where the answer came from — this is how we reduce hallucinations and build trust."

---

## Scene 5: Configure Widget (2:30 - 3:15)

**Screen:** Widget Builder → Customize colors, greeting → Copy embed code

**Script:**
> "To deploy this AI agent on a business's website, we use the Widget Builder. They can customize the brand color, greeting message, position, and whether to show branding. Then they just copy a single script tag and paste it into their website. That's it — the AI chatbot is live."

---

## Scene 6: Show Widget in Action (3:15 - 3:45)

**Screen:** External website with chat bubble → Open chat → Ask question

**Script:**
> "Here's the widget running on a test website. A visitor clicks the chat bubble, asks a question, and gets an instant AI response powered by the business's own knowledge base. No 'please wait for an agent' — instant, 24/7 support."

---

## Scene 7: Analytics + Billing (3:45 - 4:30)

**Screen:** Analytics dashboard → Billing page

**Script:**
> "The analytics dashboard shows usage metrics — messages sent, documents indexed, search queries. And the billing page shows the subscription tiers: Free, Starter at $29/month, Pro at $99/month, and Enterprise. Stripe handles all payments and webhook events."

---

## Scene 8: Architecture + Tech Stack (4:30 - 5:00)

**Screen:** Architecture diagram (from README)

**Script:**
> "Under the hood: FastAPI backend with async processing, PostgreSQL with pgvector for vector search, Redis for caching and rate limiting, Next.js frontend, and support for 7 LLM providers switchable via environment variable. 79 API endpoints, 97 tests, full CI/CD pipeline. Thanks for watching — link in the description."

---

## Recording Tips

1. **Use a clean browser** — no extensions, no personal data visible
2. **Pre-load the demo data** — run `python -m scripts.demo_data` first
3. **Use a fast LLM provider** — OpenAI or Anthropic for quick responses
4. **Keep responses short** — trim long AI responses in editing
5. **Add captions** — many LinkedIn users watch without sound
6. **Export as MP4** — under 50MB for LinkedIn upload

---

## Upload Checklist

- [ ] YouTube (public, titled "SupportPilot AI — Demo")
- [ ] LinkedIn (attach to post)
- [ ] GitHub README (embed video)
- [ ] Portfolio website
