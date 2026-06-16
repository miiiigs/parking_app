> Update the existing mobile UI design for a smart parking reservation and management application. Maintain the current light-mode enterprise SaaS design system using Poppins font, with colors: Primary Teal #0F766E, Mint #34D399, Background #FAFAF9, Card White #FFFFFF, Text #1E293B, and secondary text #64748B. Keep rounded corners (16px), soft shadows, and a clean, professional layout suitable for mall and building parking management systems.
>
> Apply the following structural and UX revisions across the entire app:

---

## 1. ADD SPLASH / STARTUP SCREEN (NEW FIRST SCREEN)

Add a startup splash screen before onboarding.

Include:

* Centered app logo
* Minimal animated loading indicator or subtle motion
* Clean background (white or very light gray)
* No buttons

Then proceed to existing 3 onboarding swipe screens.

---

## 2. PHONE NUMBER VERIFICATION (REPLACE EMAIL AUTH LOGIC)

Replace email-based login and registration with phone-based authentication.

### Login and Registration Flow Updates:

* Use PHONE NUMBER as primary identifier
* Add SMS verification step
* After entering phone number, user receives a 6-digit OTP via SMS
* Include OTP verification screen:

  * 6 input boxes
  * Resend code option
  * Timer countdown (e.g., 60 seconds)
* Only after OTP verification can user proceed to app

Remove email requirement entirely from authentication flow.

---

## 3. CREATE ACCOUNT MODIFICATION

In Register Page:
Remove:

* Vehicle Model
* Vehicle Color
* Plate Number

Replace Register form with only:

* Full Name
* Phone Number
* Password (optional if OTP-based login is primary system)

Vehicle details should be moved to:

* Profile page (Edit Profile section)
  OR
* Added during first reservation flow (contextual input)

---

## 4. MENU UPDATE — ADD “REPORT AN ISSUE”

In the Menu page, add a new option:

### Report an Issue

Include categories:

* Parking slot incorrectly marked available but occupied
* Damaged vehicle / incident report
* Payment issue
* Entry/exit QR scan issue
* Other concerns (text input)

Include:

* Issue description text field
* Upload photo option (optional)
* Submit button

---

## 5. ADD “WALK-IN MODE” OPTION

Add a new feature allowing users who are already physically present at the parking facility.

### Walk-In Parking Flow

On the Home/Search page, add a secondary action button:

**Walk-In Parking**

Purpose:
Allows users already at the location to use the app for parking management and cashless payment without creating an advance reservation.

### Walk-In Process

Step 1:

* User selects the parking facility they are currently at.

Step 2:

* User selects:

  * Available parking slot (if applicable)
  * Or parking area/zone assigned by the facility.

Step 3:

* App generates an **Entrance QR Code**.

Display:

* Parking Facility Name
* Date and Time
* Temporary Entry Pass QR
* Instruction:
  "Present this QR code at the entrance gate to begin your parking session."

Step 4:

* User scans Entrance QR at the parking entrance.

Step 5:

* Parking session immediately becomes active.
* User is redirected to the Active Session page.

### Active Session

Display:

* Session Start Time
* Parking Facility
* Slot Number or Parking Zone
* Running Parking Duration Timer

### End Session

User selects:
**End Session & Pay**

Then proceeds to:

* Payment Page
* Payment Confirmation Page

After successful payment:

### Exit Pass

Generate an **Exit QR Code**.

Display:

* Parking Facility
* Parking Duration
* Amount Paid
* Exit QR Code

Instruction:
"Present this QR code at the exit gate to complete your parking session."

### Benefits

Walk-In Parking allows:

* Cashless payment
* Digital parking tickets
* Session tracking
* Receipt generation
* Faster entry and exit processing

without requiring advance reservation.

---

## 6. RESERVATION WINDOW UPDATE

On Parking Slot Reservation Page:

Remove:

* 10-minute reservation option

Keep only:

* 30 minutes
* 1 hour
* 2 hours

Each option still shows dynamic pricing differences.

---

## 7. GENERAL DESIGN CONSISTENCY

Ensure:

* All authentication flows are phone-based (OTP-first system)
* Guest users still exist but must verify phone before any payment action
* Walk-in mode is clearly separated from reservation mode
* Menu remains persistent and includes:

  * Profile
  * Payment Wallet
  * Settings
  * Report an Issue
  * About App
  * Log Out

---

## 8. UI STYLE MAINTAIN

Keep all existing:

* Typography (Poppins)
* Color system
* Card layout style
* Bottom navigation system
* Parking slot color logic (green available, red occupied, yellow reserved)

Ensure the system still feels like:

> a professional enterprise parking management platform for malls, offices, and commercial buildings

---

9. GLOBAL UI CHANGE — STATIC LOGO HEADER

Apply this change across ALL screens:

Replace any dynamic or text-based header branding with a STATIC APP LOGO ONLY
The logo must be:
Left-aligned in the header
Fixed (non-changing across screens)
Monochrome or single-color version using #0F766E or #1E293B depending on background
No animated logo in header
No repeated app name text beside logo (logo alone is sufficient)
Hamburger menu remains on the right side where applicable


