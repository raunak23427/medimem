# MediMem — AI-Powered Family Health Memory

> Your family's health, always remembered.

MediMem keeps a whole family's medical history in one place. Upload a prescription, lab
report or discharge summary, and AI turns it into a structured record: medicines, lab
values, diagnoses, dates. From there the app tracks trends, flags what needs attention, and
produces a one-page summary to take to the doctor.

Originally built for the **EthAum Venture Partners Healthcare Deep Tech Hackathon**, then
hardened for production.

---

## Features

1. **Smart document scanning.** Upload prescriptions, lab reports and discharge summaries;
   multimodal AI extracts a structured record from every page.
2. **AI health insights.** Proactive alerts when lab values worsen, medicines run low, or a
   follow-up is due.
3. **Pre-visit doctor summary.** One tap produces a doctor-ready one-page summary.
4. **Chat over your own records.** Answers are grounded in the patient's uploaded data, and
   the assistant never diagnoses.
5. **Medicine tracker.** Every medicine across the family, with run-out indicators.
6. **Emergency health card.** A tokenised public share link with expiry and revocation,
   plus a QR code for first responders.
7. **Family health hub.** One account manages records for every family member.

Also included: child and birth health, health metrics, insurance, specialty care,
consultation history, a caregiver view, and an audit log of every sensitive action.

---

## What's in this repository

This repository contains the **web application**: the complete React frontend, the
Firestore and Storage security rules, and the build configuration.

The Cloud Functions backend (AI proxy, insight generation, emergency-link minting), the
Android build and the CI/CD pipeline live in the main project repository and are not
included here.

```
src/
  pages/        21 screens: dashboard, records, insights, medicines, emergency, family …
  components/   record upload and viewer, shared UI
  context/      AppContext — app state; switches between Firebase and local demo mode
  services/     AI calls, Firestore access, demo data, insight rule engine
  lib/          environment and Firebase setup
  types/        shared TypeScript types
firestore.rules   per-user data isolation, server-only insight writes
storage.rules     per-user upload paths
```

---

## Run it locally

No backend needed — without Firebase configuration the app runs in **local demo mode** and
opens straight into a preloaded family (the Sharmas) with records, medicines and insights.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

In demo mode, health insights will come from the built-in rule engine. Document scanning, chat
and the doctor summary need an AI backend: the production app calls Hugging Face through a
server-side proxy in Cloud Functions, so no key ever reaches the browser.

> **Do not put an API key in a `VITE_` variable for anything you deploy.** Vite copies every
> `VITE_` variable into the public JavaScript bundle. `VITE_HF_API_KEY` exists only for
> quick local experiments on your own machine.

To run against your own Firebase project, copy `.env.example` to `.env.local` and fill in
the Firebase values.

---

## Architecture

```
┌─────────────────────────┐       ┌───────────────────────────────┐
│  React 19 / Vite SPA    │ ───── │  Firebase Auth                 │
│                         │       │  Firestore (per-user docs)     │
│  AppContext switches    │ ───── │  Storage (per-user uploads)    │
│  between live and demo  │       │  Cloud Functions (TypeScript)  │
│                         │ ───── │    ├ AI proxy (HF token here)  │
└─────────────────────────┘       │    ├ Insight regeneration      │
                                  │    ├ Doctor summary · Chat     │
                                  │    └ Emergency-share mint      │
                                  └───────────────────────────────┘
```

### Firestore layout

```
users/{uid}                          UserProfile
users/{uid}/familyMembers/{memberId} FamilyMember
users/{uid}/records/{recordId}       MedicalRecord (soft-deleted via deletedAt)
users/{uid}/insights/{insightId}     Insight (server-written only)
users/{uid}/audit/{eventId}          AuditEvent (append-only)
emergencyShares/{token}              Public read-only snapshot with TTL
```

---

## Security

- **No AI keys in the client.** In production every model call goes through a server-side
  proxy.
- **Per-user isolation.** Security rules restrict every document and upload to its owner.
- **Server-only writes** for insights and audit events; the client cannot forge them.
- **Emergency links** are random tokens with an expiry, and can be revoked at any time.
- **Audit log** of sign-ins, uploads, shares and deletions.
- **AI guardrails.** The assistant never diagnoses and always defers to a doctor.

---

## Tech stack

| Layer         | Choice                                         |
| ------------- | ---------------------------------------------- |
| Build         | Vite                                           |
| Framework     | React 19 + TypeScript                          |
| Styling       | Tailwind CSS v4                                |
| Routing       | React Router v7                                |
| State         | React Context + Firestore `onSnapshot`         |
| Auth          | Firebase Auth (email/password + Google)        |
| Database      | Firestore, with persistent IndexedDB cache     |
| File storage  | Firebase Storage                               |
| AI            | Hugging Face Inference, server-side            |

---

## Credits

**Author:** Raunak Kumar Giri ([@raunak23427](https://github.com/raunak23427))

**Collaborators:** Raunak Kumar Giri ([@raunak23427](https://github.com/raunak23427))
