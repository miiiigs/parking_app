# Track L UI Hardening Pass 2 Notes

Cycle: `2026-06-27-cycle-011-track-l-ui-hardening-pass-2`

## Surfaces Reviewed

- Mobile:
  - `PaymentScreen`
  - `ExitScreen`
  - `ReceiptScreen`
  - `PaymentMethodsScreen`
  - `MenuScreen`
  - `EditProfileScreen`
- Operator/Admin:
  - `Live Reservations`
  - `Audit Trail`
  - `Parking Setup`
  - `Operator Tools`
  - pricing setup panel
  - reservation/session detail sheets
  - parking action controls

## Concrete Issues Fixed

- Mobile payment fee rows and total banners now shrink, wrap, or stack more safely on compact phones instead of forcing amount and label text into one rigid row.
- Mobile exit QR presentation now uses responsive hero spacing and a smaller QR size on compact phones, and ticket labels can shrink without pushing values off-screen.
- Mobile receipt metadata and amount rows now stack or shrink more safely, reducing overflow risk for receipt numbers, timestamps, long pricing labels, and payment method names.
- Payment-method wallet rows now stack on compact phones, and expiry/CVV inputs no longer force a tight two-column layout on the smallest widths.
- Menu and profile screens now protect long profile/contact, section, navigation, and toggle labels from squeezing adjacent icons or controls.
- Reservations and audit pages now keep card-first layouts active until `xl` widths so dense tables do not appear too early on narrow laptop screens.
- Reservations and audit mobile cards now use a single-column detail layout on the narrowest widths and only split to two columns at `sm`.
- Parking Setup, pricing settings, operator tool cards, reconciliation history, and detail sheets now delay dense side-by-side layouts or use full-width actions on tighter screens.
- Reservation/session detail-sheet action controls now stack on the narrowest widths so multiple operator actions remain reachable.

## Viewport Check Notes

- Small-phone code-backed review:
  Payment, exit, and receipt rows now give long labels and amounts shrink/wrap behavior instead of relying on rigid one-line space.
  Exit QR sizing steps down for compact screens.
  Payment-method wallet rows and add-card split fields now stack when `useResponsiveMetrics().isCompact` is true.
  Menu/profile text containers now set `minWidth: 0` or shrink behavior so long account labels do not crowd icons or controls.
- Narrow-laptop code-backed review:
  Reservations and Audit now wait until `xl` before rendering their large tables, preserving card layouts for narrower laptop widths.
  Pricing Setup waits longer before multi-column tabs, forms, and summary cards become dense.
  Operator Tools action cards and detail-sheet action groups now avoid cramped horizontal controls until wider breakpoints.

## Remaining Risks In This Pass

- This pass used code-backed viewport review plus automated validation, not live screenshots, browser recordings, or real-device captures.
- Track L still needs a final live rendered proof pass across representative small phones, tall phones, narrow laptops, and common desktop widths.
- Payment provider implementation, paid-exit backend authorization, penalty handling, staging proof, SQL rollout, and role-model changes remain intentionally out of scope.
- Lower-priority screens outside pass 1 and pass 2 may still need a final polish sweep before claiming the full Track L success gate.
