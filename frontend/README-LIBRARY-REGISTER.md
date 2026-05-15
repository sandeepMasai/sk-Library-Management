# Library registration (frontend)

Full documentation: **[`../README-LIBRARY-REGISTER.md`](../README-LIBRARY-REGISTER.md)** — email OTP flow, all API endpoints, env vars, and `curl` examples.

## Quick reference

| Item | Location |
|------|----------|
| Screen | `screens/auth/RegisterLibraryScreen.tsx` |
| Web page | `pages/RegisterLibraryPage.tsx` |
| Deep link | `/register-library` |

**User flow on the screen:** enter email → **Send code** → enter OTP → **Verify** → complete form → **Register** (sends `emailVerificationToken` from verify step).
