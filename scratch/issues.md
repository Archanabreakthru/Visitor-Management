"# Implementation Plan — VMS Backend surgical fixes

We will perform minimal, surgical fixes to address the 8 listed issues on the production Visitor Management System (VMS) without modifying the UI, layout, styles, or structure.

## User Review Required

Please review the proposed architectural and logical changes for the following issues:

> [!IMPORTANT]
> **Issue 1 (Auto Capture)**: Auto capture loops/intervals are wrapped inside `isAutoCapturing` check. The automatic startup on metadata load is disabled. It is now explicitly triggered when the user clicks "Capture Now" or restarts the countdown.
> 
> **Issue 2 (Confirm Checkout)**: The checkout modal's "Confirm Checkout" button was calling a non-existent function `executeCheckout()`. We will define `executeCheckout()` to correctly call the checkout API, update the local Store, refresh the hamburger panel, and advance the step indicator if applicable.
> 
> **Issue 5 (RFID Assignment & Reuse)**: We will update the database queries in `visits.js` and `rfid.js` to utilize the new `status` column (`ACTIVE`/`AVAILABLE`) inside transactions (`FOR UPDATE`) to resolve race conditions and enforce sequential auto-assignment (reusing released lower numbers like 1, 2, 4, etc.).
> 
> **Issue 6 (Flow Reset Guard)**: We block sidebar reset and hamburger "+ New Visitor" check-in if the user is in "Awaiting" (Step 5) or "Access / RFID" (Step 6) and has already sent host notification.

---

## Proposed Changes

### Frontend Component

#### [MODIFY] [vms_fixed.html](file:///c:/Users/Abcom/Documents/VMS%20backend/VMS%20backend/frontend/vms_fixed.html)
- Define `let isAutoCapturing = false;` in the global scope.
- In `startCam(videoId)`: Remove automatic calls to `startCountdown()` and `startFaceCheck(videoId)` inside `v.onloadedmetadata`.
- Modify the "Capture Now" button click handler to point to `onCaptureNowClick()` instead of `capturePhoto()`.
- Define `onCaptureNowClick()` to set `isAutoCapturing = true`, and start `startCountdown()` 
<truncated 4063 bytes>