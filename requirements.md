# SafeSpace Requirements

## 1. Project Overview
**SafeSpace** is a web-based chat application designed as a Proof of Concept (POC) to demonstrate a bullying detection system. The primary goal is to educate 8th-grade students on how technology can monitor and prevent online bullying.

## Objective
To create a simple, client-side web page that allows users to chat while automatically filtering and blocking messages that contain bullying language, profanity, or threats.

## Functional Requirements

### 1. User Authentication (Simulation)
-   **FR 1.1**: The system shall provide a simple login screen requesting a username.
-   **FR 1.2**: access to the chat interface shall be restricted until a valid username is provided.
-   **FR 1.3**: The system shall store the "current user" in memory (browser session) without requiring a backend database.
-   **FR 1.4**: Users shall be able to "Logout", returning them to the login screen and clearing the current session.

### 2. Chat Interface
-   **FR 2.1**: The system shall display a chat history window showing messages from the current session.
-   **FR 2.2**: Each message shall display the sender's username.
-   **FR 2.3**: Users shall be able to type text messages into an input field.
-   **FR 2.4**: Users shall be able to send messages via a "Send" button or by pressing the "Enter" key.
-   **FR 2.5**: The interface shall be visually appealing and friendly, appropriate for an 8th-grade audience (e.g., using cheerful colors and fonts).

### 3. Bullying Detection Engine (Validation Logic)
-   **FR 3.1**: The system shall intercept every message *before* it is added to the chat history.
-   **FR 3.2**: The system shall validate the message content against a predefined list of "forbidden" keywords (e.g., "stupid", "hate", "ugly").
-   **FR 3.3**: If a forbidden word is detected:
    -   The message shall **blocked** and NOT added to the chat history.
    -   The system shall display an immediate **visual warning** to the user explaining why the message was blocked.
    -   The input field shall provide visual feedback (e.g., shaking or red border) to indicate an error.
-   **FR 3.4**: If no forbidden words are found, the message shall be added to the chat history immediately.

## Non-Functional Requirements
-   **NFR 1**: The application must run entirely in the browser (Client-Side Only).
-   **NFR 2**: No server-side rendering or database connectivity is required for this POC.
-   **NFR 3**: Code structure must be simple and commented to serve as an educational tool for students.
-   **NFR 4**: The application should be responsive and work on standard desktop screen sizes.