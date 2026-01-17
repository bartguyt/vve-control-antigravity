# Project Rules

## Frontend Verification and Error Resolution
After fully completing a coding task (excluding manual database changes performed by the user via SQL files), you MUST:
1.  **Open the Frontend**: Launch the application in the browser (or use the browser tool).
2.  **Inspect for Errors**: specificially check for:
    *   Visual error messages on the screen.
    *   Errors and warnings in the browser console.
3.  **Resolve Errors**: You must fix any identified errors.
4.  **Completion Criteria**: The task is NOT considered complete until these errors are resolved and the frontend is functioning without visible issues.

## Modularity
*   **Architecture**: The application must be structurally divided into modules.
*   **Resilience**: Modules must be designed to be toggled off or restricted (e.g., via feature flags or permissions) without crashing the rest of the application. The core application must remain functional even if specific modules are disabled.

## Naming Conventions & Terminology
*   **Language**: All code (variables, functions, classes, comments) and database objects (tables, columns) must be in **English**.
*   **Consistency**: Terminology must be consistent across the entire codebase and database.
*   **Generic Terms**: Avoid Dutch-specific or domain-narrow terminology like "vve" in code structures. Use generic, applicable English terms (e.g., `Association`, `Organization`, `Community`) that accurately describe the entity. Refactor existing violations when encountered.

## Accessibility (WCAG)
*   **Standards**: All frontend UI components and pages must adhere to **WCAG** (Web Content Accessibility Guidelines) standards.
*   **Implementation**: Ensure proper semantic HTML, ARIA labels, keyboard navigability, and sufficient color contrast are maintained.

## UI/UX Consistency
*   **Design Pattern**: Verify existing UI patterns before creating new ones. New functionality must seamlessly blend with the existing design system.
*   **Propagation**: If a UI component's style or behavior is modified, that change must be propagated to **all** instances of that component throughout the application to maintain a unified user experience.

## Documentation & Comments
*   **Code Comments**: Every significant part of the application must be commented in the code to explain intent and logic.
*   **Digital Documentation**: For each functional part of the application, create digital documentation (e.g., markdown files in a `docs/` directory). This documentation should be structured effectively so it can be easily converted into an online user help environment.

## Debugging & Observability
*   **Action Tracking**: Ensure that for every significant user action or system process, diagnostic information is sent to an implemented debugging system.
*   **Implementation**: Determine and implement the necessary logging/debugging mechanisms (e.g., a centralized `DebugService` or structured console logging) to allow for effective troubleshooting of issues as they arise.

## Security
1.  **Mandatory Row Level Security (RLS)**: Every new database table must have RLS enabled with explicit policies for SELECT, INSERT, UPDATE, and DELETE. Public access is forbidden unless strictly necessary.
2.  **Strict Input Validation**: All user inputs (API and Database) must be validated using a schema library (e.g., Zod) before processing. Never trust client-side data.
3.  **No Leaked Secrets**: Client-side bundles must typically never contain sensitive keys. Use environment variables strictly separated into `PUBLIC_` (safe) and protected server-side secrets.
4.  **No `dangerouslySetInnerHTML`**: Direct injection of HTML is forbidden to prevent XSS, unless passed through a rigorous sanitization library (e.g., DOMPurify).
5.  **Principle of Least Privilege**: Database roles and Service Accounts should strictly possess only the permissions required for their specific function (e.g., a "viewer" role cannot INSERT).

## Speed & Performance
6.  **Optimized Database Indexing**: All foreign keys and columns frequently used in `WHERE`, `ORDER BY`, or `JOIN` clauses must be indexed.
7.  **Code Splitting & Lazy Loading**: All major routes and heavy components must be lazy-loaded (`React.lazy`) to keep the initial JS bundle size minimal.
8.  **Query Efficiency**: Avoid `SELECT *`. Fetch only the specific columns required by the UI to reduce payload size and memory usage. Prevent N+1 query problems by using joins or batch fetching.
9.  **Asset Optimization**: All static assets (images) must be served in modern formats (e.g., WebP) and properly restricted in size/resolution.
10. **Debounced Interactions**: High-frequency user inputs (search bars, window resizing) must be debounced or throttled to prevent performance degradation.

## Compatibility
11. **Mobile-First Responsive Design**: UI development must start with mobile layouts and scale up. The application must remain fully functional on standard viewports (Mobile, Tablet, Desktop).
12. **Cross-Browser Verification**: Features must be verified on Chromium-based browsers (Chrome/Edge), Firefox, and WebKit (Safari/iOS).
13. **Semantic HTML**: Use standard semantic elements (`<button>`, `<nav>`, `<main>`) instead of generic `<div>` wrappers to ensure compatibility with screen readers and browser accessibility tools.
14. **System Theme Adherence**: Components must automatically adapt to the user's OS preference (Light/Dark mode) without breaking visual contrast.
15. **Standardized Date/Time**: All dates must be stored in UTC and only formatted to the user's local timezone (Amsterdam/Europe) at the moment of display to ensure timezone compatibility.

## Robustness & Reliability
16. **Strict Type Safety**: TypeScript 'Strict' mode must be enabled. The use of `any` is forbidden; explicit types or generics must be used to guarantee compile-time safety.
17. **React Error Boundaries**: Major application sections (Sidebar, Main Content, Modals) must be wrapped in Error Boundaries to prevent a single component crash from breaking the entire application.
18. **Atomic Transactions**: Operations modifying multiple related database tables must be wrapped in a transaction to ensure data integrity (all or nothing).
19. **Graceful Degradation**: The UI must handle API failures gracefully, showing user-friendly error states (toasts/empty states) rather than crashing or showing blank screens.
20. **Frontend-Backend Contract**: Database schema changes must be backward-compatible or accompanied by a migration plan that does not break the active frontend client.
