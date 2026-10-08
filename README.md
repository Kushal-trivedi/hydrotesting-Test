# HydroSafe — Industrial Hydrotest & CNG Asset Compliance Management System

A mission-critical Hydrotest Management & Vehicle Inspection Compliance System designed following an end-to-end industrial lifecycle:

$$\text{REGISTER} \longrightarrow \text{IDENTIFY} \longrightarrow \text{TEST} \longrightarrow \text{VERIFY} \longrightarrow \text{CALCULATE STATUS} \longrightarrow \text{MONITOR} \longrightarrow \text{FOLLOW UP} \longrightarrow \text{AUDIT}$$

---

## 🌟 Key Highlights

- **Option B Equipment & Vehicle Model**: Seamlessly tracks stationary equipment (Cascade Banks, Dispenser Buffers, Manifold Headers) and vehicle-mounted cylinders without forcing non-vehicle assets into a vehicle model.
- **Four-Dimensional Status Architecture**:
  1. `Asset.status`: `ACTIVE`, `INACTIVE`, `RETIRED`
  2. `Hydrotest.result`: `PASS`, `FAIL`, `PENDING`
  3. `ComplianceState` (Computed dynamically by Compliance Engine): `VALID`, `DUE_SOON` ($\le 30$ days), `OVERDUE` ($< \text{today}$), `FAILED`, `PENDING`
  4. `ExternalVerificationStatus`: `NOT_VERIFIED`, `VERIFIED`, `MISMATCH`, `UNAVAILABLE`
- **VAHAN Vehicle Verification**: Real-time lookup for Indian vehicle plates (e.g., `GJ01AB1234`), automatic fuel type inspection (confirming CNG bi-fuel/mono-fuel), and non-blocking failure recovery.
- **PESO Certificate Verification**: Compares hydrostatic test records against accredited inspection hubs, flagging discrepancies or mismatching serial markings without blocking local records.
- **Priority Action Desks**: Real-time queues highlighting **Overdue** equipment with elapsed days and **Due Soon** items with countdown timers.
- **Audit History Retention**: Every hydrotest record is preserved chronologically (newest to oldest) and never overwritten.

---

## 🏗️ Architecture

```text
                             Browser (React 19 + Tailwind v4 + Lucide)
                                                │
                                                ▼  HTTP / REST
                                     FastAPI Backend (Python)
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
     Compliance & Rules Engine           SQLAlchemy ORM 2.0             External Adapters Layer
                 │                              │                              │
                 ▼                              ▼                              ▼
      VALID / DUE_SOON / OVERDUE         SQLite (WAL Mode)               ┌───────────────┬───────────────┐
          FAILED / PENDING                                               │ VAHAN Service │ PESO Registry │
                                                                         └───────────────┴───────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ and npm

---

### Step 1: Backend Setup & Seed Data

1. Open PowerShell / Terminal in the project root:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```

3. Initialize the database and seed demo data covering all 5 compliance states:
   ```bash
   python seed_data.py
   ```
   *This seeds 4 stations and 9 assets covering VALID, DUE_SOON, OVERDUE, FAILED, and PENDING states with sample PDF certificates.*

4. Run automated tests to verify business logic and API contracts:
   ```bash
   python -m pytest tests/ -v
   ```

5. Start the FastAPI backend server:
   ```bash
   python run.py
   ```
   - Server runs on: `http://localhost:8000`
   - Interactive Swagger API docs: `http://localhost:8000/docs`
   - Health check: `http://localhost:8000/health`

---

### Step 2: Frontend Setup

The compiled React frontend is already built and served directly from the FastAPI root (`http://localhost:8000/`)!

If you wish to run the React development server with Hot Module Replacement (HMR):
1. In a separate terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Open your browser at `http://localhost:5173`. Requests to `/api` are automatically proxied to the FastAPI server at `http://localhost:8000`.

---

## 📋 Comprehensive User Flows

### Flow A — Register a New Asset
- Navigate to **Assets** $\to$ **`+ Register New Asset`**.
- Specify Asset ID, Station, Asset Type, and Serial Number.
- Optional specifications: Manufacturer, Model, Capacity (Liters), Installation Date, Cylinder Number.
- Duplicate validation prevents reusing existing Asset IDs or Serial Numbers.

### Flow B — Identify Real Vehicle (VAHAN Integration)
- On the registration form or Asset Dossier, enter an Indian registration plate (e.g. `GJ01AB1234`, `GJ05EF9012`, `DL01XY9876`).
- Click **`[Verify Vehicle]`**.
- Retrieves Make, Model, Fuel Type, and validates CNG compliance.
- Resilient design: If external service times out, an alert is shown without crashing or blocking form submission.

### Flow C — Record Hydrotest
- On the Asset Dossier page, click **`[+ Record New Hydrotest]`**.
- Pre-fills cylinder markings and calculates next due date (+3 years for vehicle cylinders, +5 years for cascades).
- Enter test date, testing agency, test pressure (bar), working pressure (bar), and visual notes.
- Optionally upload certificate PDF or image.

### Flow D — External Certificate Verification
- On the hydrotest chronology timeline, click **`[Verify Certificate]`**.
- Compares internal certificate details against accredited PESO registry.
- Outcome yields `VERIFIED`, `MISMATCH`, or `UNAVAILABLE`.

### Flow E — Dynamic Compliance Engine
- **FAILED**: Latest test result is `FAIL`.
- **OVERDUE**: Next due date $< \text{today}$.
- **DUE SOON**: Next due date is within 30 days.
- **VALID**: Next due date is $> 30$ days in the future with `PASS`.
- **PENDING**: Newly commissioned asset with no tests yet or test in progress.

### Flow F — Executive Dashboard
- Top KPI banners: Total Assets, Valid, Due Soon, Overdue, Failed, Pending, Compliance Rate.
- **Priority Action Desks**:
  - Critical Overdue Queue (ranked by days overdue).
  - Upcoming Expiries Queue (ranked by days remaining).
- Station Compliance distribution breakdown with progress bars.

### Flow G & H — Asset Dossier & History Retention
- Comprehensive timeline of all historical tests from newest to oldest.
- Historical records are never overwritten.
- Download / view certificate reports directly in browser.

### Flow I — Search, Filter & Sort
- Full-text search across Asset ID, Serial No, Vehicle Plate, Cylinder Number, Manufacturer.
- Filter by Station, Asset Type, Compliance Status, Due Date Range.
- Sort by Next Due Date (Asc/Desc), Asset ID, or Registration Date.

---

## 🧪 Automated Test Suite

Run the full pytest suite from `backend/`:
```bash
python -m pytest tests/ -v
```
Tests cover:
- Compliance engine rules & urgency classifications.
- Duplicate asset ID and serial number rejection (409 Conflict).
- Multi-faceted asset search, filtering, and sorting.
- Hydrotest history preservation across multiple tests.
- PESO certificate verification adapter outcomes.
- VAHAN vehicle lookup & CNG identification.

---

## 📜 Seeded Demo Profiles for Testing

| Asset ID | Station | Type | Vehicle Plate | Compliance Status | Next Due Date |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `CNG-CAS-AHD-001` | Ahmedabad Central | Cascade Bank | — | **VALID** | Due in ~3 years |
| `CNG-VEH-AHD-002` | Ahmedabad Central | Vehicle Cylinder | `GJ01AB1234` | **VALID** | Due in ~2.7 years |
| `CNG-VEH-SRT-003` | Surat Hazira | Vehicle Cylinder | `GJ05EF9012` | **DUE_SOON** | Due in 12 days |
| `CNG-BUF-VAD-004` | Vadodara Express | Dispenser Buffer | — | **DUE_SOON** | Due in 24 days |
| `CNG-VEH-RJK-005` | Rajkot Ring Road | Vehicle Cylinder | `GJ06GH3456` | **OVERDUE** | Expired 15 days ago |
| `CNG-CAS-SRT-006` | Surat Hazira | Cascade Bank | — | **OVERDUE** | Expired 45 days ago |
| `CNG-VEH-AHD-007` | Ahmedabad Central | Vehicle Cylinder | `GJ27JK7890` | **FAILED** | Permanent stretch failed |
| `CNG-PIP-VAD-008` | Vadodara Express | Pipeline Header | — | **PENDING** | No tests yet |
| `CNG-VEH-RJK-009` | Rajkot Ring Road | Vehicle Cylinder | `DL01XY9876` | **PENDING** | Test in progress |
