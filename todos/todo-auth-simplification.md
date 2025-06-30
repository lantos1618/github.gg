# TODO: Simplify Authentication System

## Goal
Refactor the authentication system to be simple, robust, and maintainable. Eliminate parallel session logic, unify the source of truth for user identity, and streamline sign-in/sign-out and GitHub App installation flows.

---

## Steps

1. **Eliminate Parallel Session**
   - Remove custom `GitHubAppSessionManager` and its cookie.
   - Use only the `better-auth` session as the single source of truth.

2. **Simplify Auth Hook**
   - Refactor `useAuth` to be a thin wrapper around `better-auth`.
   - Remove all complex state-merging logic.

3. **Fix Sign-Out Process**
   - Create a robust sign-out flow that clears the session and all related DB data.
   - Add a dedicated endpoint for app-specific cleanup.

4. **Streamline Octokit Creation**
   - Clarify logic for creating GitHub API clients.
   - Use the correct token (installation vs. OAuth) based on user's linked status.

5. **Clean Up**
   - Delete redundant files and documentation from the old system.
   - Update `README.md` and `todos.md` to reflect the new system.

---

## Acceptance Criteria
- Only one session/cookie is used for authentication.
- Sign-in and sign-out are reliable and clear all relevant state.
- GitHub App installation and linking is seamless for users.
- No redundant or legacy auth code remains.
- Documentation and todos are up to date.

---

## Notes
- See user prompt for detailed code and endpoint examples.
- Coordinate with any ongoing feature work to avoid merge conflicts. 