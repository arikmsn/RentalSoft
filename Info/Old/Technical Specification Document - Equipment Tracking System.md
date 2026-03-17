# Technical Specification Document - Equipment Tracking System

## 1. Introduction and System Vision
This system is designed for managing and tracking equipment temporarily installed at customer sites. The system will serve as the "brain" of the equipment in the field, preventing equipment loss, streamlining technician work, and providing managers with a real-time overview.

### Key Requirements:
*   **WebApp Mobile-First:** Seamless operation on mobile and desktop browsers.
*   **Offline Support:** Ability to work in the field without internet connectivity (PWA).
*   **QR Scanning:** Rapid identification of equipment in the field.
*   **Map View:** Visualization of equipment deployment and alerts.
*   **Security:** Protection of information and user authentication.

---

## 2. Technological Architecture
The architecture is designed to be modular (scalable) to allow for future expansions.

### 2.1 Recommended Technology Stack:
*   **Frontend:** React.js with Vite (for fast performance) and Tailwind CSS (for responsive design).
*   **PWA Capabilities:** Utilization of Service Workers for offline management and caching.
*   **Backend:** Node.js (NestJS) or Python (FastAPI) - REST API architecture.
*   **Database:** 
    *   **Server:** PostgreSQL (relational data).
    *   **Client (Offline):** IndexedDB (via Dexie.js) for local data synchronization.
*   **Maps:** Leaflet.js (open-source, flexible) or Google Maps API.
*   **QR Scanning:** `html5-qrcode` or `react-qr-reader`.

### 2.2 Offline & Sync Mechanism:
1.  **Local First:** Every technician action is first saved to the local IndexedDB.
2.  **Background Sync:** Once an internet connection is available, the Service Worker synchronizes the actions (queue) with the server.
3.  **Conflict Resolution:** "Last Write Wins" principle or versioning (Timestamp) to prevent data overwrites.

---

## 3. Data Model (Database Schema)

### Main Tables:

| Table | Key Fields | Description |
| :--- | :--- | :--- |
| **Equipment** | ID, QR_Tag (Unique), Type, Status (Warehouse/Customer/Repair), Last_Scan_Date, Current_Site_ID | Equipment items in the system |
| **Sites (Customers)** | ID, Name, Address, Lat/Long, Contact_Info, Rating, Is_Active | Customer locations |
| **Work_Orders** | ID, Type (Install/Inspect/Remove), Site_ID, Technician_ID, Status (Open/In_Progress/Done), Planned_Date, Actual_Date | Work orders |
| **Checklists** | ID, Work_Order_ID, Item_Name, Is_Checked, Value (Text/Num) | Checklist for each work order |
| **Activity_Log** | ID, Equipment_ID, Site_ID, User_ID, Action_Type, Timestamp, Notes (Done/To-Do) | Immutable history of actions |
| **Users** | ID, Name, Email, Password_Hash, Role (Admin/Tech), Last_Login | System users |

---

## 4. Screen Specification (UI/UX)

### 4.1 Manager Dashboard (Desktop Primary)
*   **View:** Heatmap or colored markers (green: OK, yellow: close to removal, red: overdue).
*   **Widgets:** Summary of equipment in the field, urgent alerts, open work orders for today.
*   **Quick Actions:** Create a new work order by clicking on a site on the map.

### 4.2 Equipment List & Item Details
*   **Search and Filter:** By QR Tag, equipment type, status, or site.
*   **Removal Wheel:** Visual indicator showing time remaining until planned removal (percentage of time elapsed).
*   **Timeline:** Full history of actions for each device.

### 4.3 Technician Application (Mobile Primary)
*   **"My Tasks" Screen:** List organized by distance/priority with a "Navigate with Waze" button.
*   **Work Order Execution Screen:**
    *   Prominent QR scan button (opens camera).
    *   Dynamic checklist completion.
    *   Free text fields: "What was done" (Done) and "To be done on next visit" (To-Do).
    *   Planned removal date selection (quick: 1 week / 2 weeks / custom).
*   **Offline Indicator:** Cloud icon (green/red) showing if data is synced to the server.

---

## 5. Interfaces & Integrations
1.  **Scanning Interface:** Integration with device camera via Browser API (WebRTC).
2.  **Maps Interface:** Connection to OpenStreetMap/Google Maps for displaying sites and scan locations (GPS).
3.  **Waze Integration:** Deep Link from site address to the Waze application.
4.  **Internal API:** Swagger/OpenAPI documentation for Frontend-Backend communication.

---

## 6. Information Security (Security)
*   **Authentication:** JWT (JSON Web Tokens) with short validity and Refresh Tokens.
*   **Encryption:** Use HTTPS (TLS 1.3) for all communication. Encrypt sensitive data in DB (At Rest).
*   **Permissions:** API-level separation between manager actions (user management/deletions) and technician actions.
*   **Input Validation:** Prevention of SQL Injection and XSS in all system forms.
*   **QR Security:** The QR will contain a unique identifier (UUID) rather than the sequential DB ID, to prevent address guessing.

---

## 7. Scalability Plan
*   **Microservices:** In the future, the alerts engine can be separated into a distinct service.
*   **Cloud Native:** Deployment on Docker/Kubernetes in AWS/Azure/GCP.
*   **External APIs:** Preparation for integration with external ERP/CRM systems in the future.
