# Development Instructions for Equipment Tracking System

**Dear AI Developer,**

The purpose of this document is to provide you with all the necessary information for the full development of an Equipment Tracking System WebApp. The system is designed for companies that temporarily leave equipment at customer sites and require precise tracking of its location, status, action history, and alerts.

**Important Note:** The system should be a **single Web Application** used by both managers and technicians. The distinction between roles will be made through a **Role-Based Access Control (RBAC) mechanism**, where managers will have access to additional screens and functionality (such as a management dashboard and alert screens) not available to technicians. The login screen will be shared, and after logging in, the system will display the appropriate interface for the user's role.

## 1. Overview and Key Requirements

The system will be a modern, responsive WebApp, with an emphasis on an excellent User Experience (UX), especially on mobile for technicians. Core requirements include:

*   **Offline-First (PWA):** Full functionality without an internet connection, with automatic background data synchronization when connectivity is restored.
*   **QR Scanning:** Fast and reliable identification of equipment by scanning QR codes via the device's camera.
*   **Map View:** Interactive visualization of equipment and site locations.
*   **Security:** Implementation of robust security mechanisms to protect data and access.
*   **Modular Architecture:** Design that allows for easy future expansions and modifications.

## 2. Recommended Technology Stack

Based on the specification, the recommended technology stack is:

| Component | Recommended Technology | Notes |
| :--- | :--- | :--- |
| **Frontend** | React.js (with Vite) | For fast performance and efficient development. |
| **Styling** | Tailwind CSS | For responsive and rapid UI development. |
| **PWA / Offline** | Service Workers, IndexedDB (with Dexie.js) | For managing caching, local data synchronization, and offline operation. |
| **Backend** | Node.js (NestJS) or Python (FastAPI) | Modular and scalable RESTful API architecture. |
| **Database (Server)** | PostgreSQL | A robust and reliable relational database. |
| **Maps** | Leaflet.js / OpenStreetMap | An open-source and flexible solution, or Google Maps API if more advanced capabilities are required. |
| **QR Scanning** | `html5-qrcode` or `react-qr-reader` | Proven libraries for browser-based QR scanning. |
| **User Authentication** | JWT (JSON Web Tokens) | For secure user authentication. |

## 3. Attached Files and Usage Instructions

Several essential files are attached to serve as the basis for development:

1.  **`equipment_tracking_technical_spec_en.md` (Full Technical Specification):**
    *   **Description:** This is the central document detailing all functional and non-functional requirements, data structure (DB Schema), screen specifications (UI/UX), interfaces, security, and scalability plan.
    *   **Instruction:** This document must be read thoroughly and treated as the ultimate authority for all system details. Every section within it is a mandatory requirement.

2.  **`erd_diagram.png` (ERD Diagram):**
    *   **Description:** A diagram illustrating the structure of the database tables (Entities) and their relationships.
    *   **Instruction:** Use this diagram as the basis for building the PostgreSQL Database Schema and the server-side data model (Backend).

3.  **`architecture_diagram.png` (Architecture Diagram):**
    *   **Description:** A general diagram describing the different system layers (Client, Server, Database) and the data flow between them.
    *   **Instruction:** Use this diagram to understand the overall system structure and to plan the code distribution between the Frontend and Backend, with an emphasis on the Offline Sync mechanism.

## 4. Special Development Considerations

*   **Unified System with Permissions:**
    *   The WebApp must be built to support two types of users: **Manager** and **Technician**.
    *   After login, the system will load the data and screens relevant to the user's role. For example, a technician will directly see their list of work orders for today, while a manager will see a dashboard with a map and alerts.
    *   **API-level protection** must be ensured so that users with technician permissions cannot perform administrative actions even if they try to access the API directly.

*   **Offline-First (PWA):**
    *   Full implementation of PWA capabilities, including a Service Worker for caching assets and data, and IndexedDB for local data storage.
    *   A two-way synchronization mechanism between IndexedDB and the Backend must be designed, which also handles conflict situations (e.g., using Timestamp or Last Write Wins).
    *   Visual feedback to the user on connection and synchronization status (e.g., a green/red cloud icon).

*   **QR Code:**
    *   Implementation of a user-friendly mobile QR scanner, utilizing the device's camera.
    *   The QR will contain a unique identifier (UUID) for the equipment, not a sequential ID from the DB, for security and to prevent guessing.

*   **Maps:**
    *   Display of site and equipment locations on an interactive map.
    *   Marking sites on the map with different colors according to the status of the equipment within them (e.g., red for overdue equipment removal).
    *   Integration of a "Navigate with Waze" button on site details and work order screens.

*   **Security:**
    *   All communication will be encrypted using HTTPS.
    *   User passwords will be stored encrypted (Hashing + Salting).
    *   Strict Input Validation must be performed at all input points to prevent common attacks.

## 5. Required Deliverables

The final deliverables are:

*   **Complete and well-documented source code** of the WebApp (Frontend and Backend).
*   **Clear installation and execution instructions** for the system (including development environment setup, Database, and Backend).
*   **A `README.md` file** in the main project briefly explaining the system and how to run it.

We expect a high-quality, stable, and secure solution. Good luck!


## 6. Localization and Internationalization (i18n) Requirements

To ensure the system is fully usable for its primary audience and can be expanded globally, comprehensive localization support is required:

*   **Default Language:** The entire user interface (all texts, buttons, labels, messages) must be in **Hebrew (עברית)** by default.
*   **Full English Support:** The system must also support **English** as a secondary language, with an accessible language switching mechanism.
*   **Text Externalization:** All user-facing strings must be externalized into separate language files (e.g., JSON, YAML) to facilitate easy translation and maintenance.
*   **Right-to-Left (RTL) Layout:** The UI must fully support **RTL layout for Hebrew**, including text direction, element alignment, table structures, and icon mirroring where appropriate. This is a critical requirement for the Hebrew user experience.
*   **Date and Number Formatting:** Implement locale-aware formatting for dates, times, and numbers.
*   **Recommended Libraries:** Utilize a robust i18n library for React (e.g., `react-i18next` or `formatjs`) and configure Tailwind CSS for dynamic RTL styling.

This is a non-negotiable requirement to ensure a high-quality user experience for the target audience.
