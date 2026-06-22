# ReZ Ride — User Flows

## Table of Contents

1. [User Flows](#user-flows)
   - [Book a Ride](#book-a-ride)
   - [During the Ride](#during-the-ride)
   - [After the Ride](#after-the-ride)
   - [View Ride History](#view-ride-history)
2. [Driver Flows](#driver-flows)
   - [Go Online](#go-online)
   - [Accept a Ride](#accept-a-ride)
   - [During the Ride (Driver)](#during-the-ride-driver)
   - [End the Ride](#end-the-ride)
   - [View Earnings](#view-earnings)
3. [Admin Flows](#admin-flows)
   - [Driver Onboarding](#driver-onboarding)
   - [Handle Disputes](#handle-disputes)
   - [Monitor Operations](#monitor-operations)

---

## User Flows

### Book a Ride

```
┌─────────────────────────────────────────────────────────────────┐
│ USER JOURNEY: BOOK A RIDE │
├─────────────────────────────────────────────────────────────────┤
│ │
│ 1. OPEN APP │
│    │
│    └── User opens ReZ app │
│    └── If not logged in → Auth screen │
│ │
│ 2. SELECT VEHICLE TYPE │
│    │
│    └── Options: Auto | Cab | SUV | Bus │
│    └── Show estimated fare for each │
│    └── Show ETA for pickup │
│ │
│ 3. ENTER PICKUP & DROP │
│    │
│    └── Pickup: Current location (auto-detect) or manual │
│    └── Drop: Enter destination │
│    └── System shows: │
│        • Estimated fare │
│        • Estimated time │
│        • Route preview │
│ │
│ 4. VIEW PROMO/CASHBACK │
│    │
│    └── "You'll earn ₹15 cashback on this ride" │
│    └── "Total cost after cashback: ₹135" │
│    └── Any applicable promos shown │
│ │
│ 5. CONFIRM BOOKING │
│    │
│    └── User taps "Book Now" │
│    └── Auth verifies user │
│    └── Wallet checked (sufficient balance) │
│ │
│ 6. RIDE ASSIGNED │
│    │
│    └── Driver matched (nearest available) │
│    └── User sees: │
│        • Driver photo + name │
│        • Vehicle number + model │
│        • Driver rating │
│        • ETA to pickup │
│    └── Driver receives ride request │
│ │
│ 7. AD DECISION (Background) │
│    │
│    └── System pulls user profile from Rez Mind │
│    └── Intent analysis runs │
│    └── Ad selected from AdsBazaar │
│    └── Ad pushed to vehicle screen │
│ │
│ 8. WAIT FOR PICKUP │
│    │
│    └── Live tracking of driver │
│    └── Contact driver button │
│    └── Cancel option (with cancellation policy) │
│ │
│ 9. RIDER BOARDED │
│    │
│    └── User enters vehicle │
│    └── Scan boarding QR (optional) │
│    └── Screen shows personalized ad │
│    └── Ride begins │
│ │
└─────────────────────────────────────────────────────────────────┘
```

**Edge Cases:**
- No drivers available → Show "No drivers nearby" + retry option
- Payment failed → Prompt to add wallet balance or use UPI
- User cancels → Apply cancellation policy if applicable
- Driver cancels → Auto-assign to next driver + notify user

---

### During the Ride

```
┌─────────────────────────────────────────────────────────────────┐
│ USER JOURNEY: DURING THE RIDE │
├─────────────────────────────────────────────────────────────────┤
│ │
│ 1. ACTIVE RIDE SCREEN │
│    │
│    └── Live map with route │
│    └── ETA to destination │
│    └── Driver name + vehicle info │
│    └── Emergency button │
│    └── Contact driver │
│ │
│ 2. AD INTERACTION (Optional) │
│    │
│    └── Screen shows targeted ad │
│    └── User can: │
│        • View ad (contributes to impressions) │
│        • Tap for more details │
│        • Ignore and continue ride │
│    └── Deep link to ReZ app if tapped │
│ │
│ 3. RIDE DETAILS │
│    │
│    └── Current fare (meter running) │
│    └── Distance covered │
│    └── Time elapsed │
│    └── Route deviations visible │
│ │
│ 4. EMERGENCY/SUPPORT │
│    │
│    └── SOS button always visible │
│    └── Share trip with contacts │
│    └── Report issue │
│    └── Call support │
│ │
│ 5. NEARING DESTINATION │
│    │
│    └── "Approaching destination" notification │
│    └── Final fare shown │
│    └── Cashback amount highlighted │
│    └── "Payment successful" │
│ │
└─────────────────────────────────────────────────────────────────┘
```

---

### After the Ride

```
┌─────────────────────────────────────────────────────────────────┐
│ USER JOURNEY: AFTER THE RIDE │
├─────────────────────────────────────────────────────────────────┤
│ │
│ 1. RIDE COMPLETION │
│    │
│    └── Driver ends ride │
│    └── Final fare calculated │
│    └── Payment processed │
│ │
│ 2. CASHBACK CREDITED │
│    │
│    └── "₹15 cashback credited to your wallet" │
│    └── Animated celebration │
│    └── Show new wallet balance │
│ │
│ 3. RATING PROMPT │
│    │
│    └── "How was your ride?" │
│    └── 1-5 star rating │
│    └── Optional feedback │
│    └── Skip option │
│ │
│ 4. RECEIPT │
│    │
│    └── Trip details: │
│        • Pickup/drop locations │
│        • Distance │
│        • Duration │
│        • Fare breakdown │
│        • Cashback earned │
│        • Payment method │
│    └── Download/share receipt │
│ │
│ 5. REFERRAL NUDGE │
│    │
│    └── "Invite friends, earn cashback" │
│    └── Share referral code │
│ │
│ 6. NEXT ACTION │
│    │
│    └── "Book another ride" │
│    └── "Explore ReZ Food" │
│    └── "Check ReZ Wallet" │
│ │
└─────────────────────────────────────────────────────────────────┘
```

---

### View Ride History

```
┌─────────────────────────────────────────────────────────────────┐
│ USER JOURNEY: RIDE HISTORY │
├─────────────────────────────────────────────────────────────────┤
│ │
│ 1. ACCESS HISTORY │
│    │
│    └── Tap "My Rides" in app │
│    └── Shows all past rides │
│ │
│ 2. FILTER & SEARCH │
│    │
│    └── Filter by: Date, Vehicle type, Status │
│    └── Search by: Location, Driver name │
│ │
│ 3. RIDE DETAIL │
│    │
│    └── Full trip details │
│    └── Receipt download │
│    └── Invoice (for business accounts) │
│ │
│ 4. HELP & SUPPORT │
│    │
│    └── Report issue │
│    └── Request invoice │
│    └── Dispute ride │
│ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Driver Flows

### Go Online

```
┌─────────────────────────────────────────────────────────────────┐
│ DRIVER JOURNEY: GO ONLINE │
├─────────────────────────────────────────────────────────────────┤
│ │
│ 1. OPEN DRIVER APP │
│    │
│    └── Login with phone + OTP │
│    └── Show dashboard │
│ │
│ 2. PRE-RIDE CHECKLIST │
│    │
│    └── Vehicle details correct? │
│    └── Screen is: │
│        • Powered on │
│        • Connected to internet │
│        • Showing "Available" │
│    └── Documents valid? │
│ │
│ 3. GO ONLINE │
│    │
│    └── Toggle "Online" │
│    └── Screen shows "Available for rides" │
│    └── Location shared with platform │
│ │
│ 4. WAITING FOR RIDE │
│    │
│    └── Shows: "Waiting for rides" │
│    └── Current location visible │
│    └── "Go Offline" button │
│ │
└─────────────────────────────────────────────────────────────────┘
```

---

### Accept a Ride

```
┌─────────────────────────────────────────────────────────────────┐
│ DRIVER JOURNEY: ACCEPT A RIDE │
├─────────────────────────────────────────────────────────────────┤
│ │
│ 1. RIDE REQUEST │
│    │
│    └── Notification + sound │
│    └── Shows: │
│        • Pickup location │
│        • Drop location │
│        • Estimated fare │
│        • Estimated distance │
│        • User rating (if previous) │
│ │
│ 2. DECIDE │
│    │
│    └── 30 seconds to accept │
│    └── "Accept" → proceed │
│    └── "Decline" → back to waiting │
│    └── Auto-decline if no response │
│ │
│ 3. NAVIGATE TO PICKUP │
│    │
│    └── GPS navigation starts │
│    └── User sees: "Driver is on the way" │
│    └── Contact user option │
│ │
│ 4. ARRIVE AT PICKUP │
│    │
│    └── "Arrived" button │
│    └── Show user "Driver arrived" │
│    └── User comes to vehicle │
│ │
│ 5. START RIDE │
│    │
│    └── Driver starts ride │
│    └── Screen switches to ad mode │
│    └── User profile pulled │
│    └── Targeted ad shown on screen │
│ │
└─────────────────────────────────────────────────────────────────┘
```

---

### During the Ride (Driver)

```
┌─────────────────────────────────────────────────────────────────┐
│ DRIVER JOURNEY: DURING THE RIDE │
├─────────────────────────────────────────────────────────────────┤
│ │
│ 1. ACTIVE RIDE │
│    │
│    └── Map with route │
│    └── ETA to destination │
│    └── Current fare (meter) │
│    └── Screen shows: User info + ad │
│ │
│ 2. SCREEN BEHAVIOR │
│    │
│    └── Ad plays during ride │
│    └── Shows user interests │
│    └── Impressions tracked │
│    └── No driver action needed │
│ │
│ 3. COMPLETE DELIVERY │
│    │
│    └── Navigate to drop │
│    └── User gets down │
│    └── Driver ends ride │
│ │
└─────────────────────────────────────────────────────────────────┘
```

---

### End the Ride

```
┌─────────────────────────────────────────────────────────────────┐
│ DRIVER JOURNEY: END THE RIDE │
├─────────────────────────────────────────────────────────────────┤
│ │
│ 1. ARRIVE AT DROP │
│    │
│    └── Reach destination │
│    └── "End Ride" button │
│ │
│ 2. RIDE COMPLETED │
│    │
│    └── Final fare shown │
│    └── Payment auto-collected │
│    └── Cashback already credited to user │
│ │
│ 3. EARNINGS UPDATED │
│    │
│    └── Ride fare added to earnings │
│    └── Ad impression bonus shown │
│    └── Running total visible │
│ │
│ 4. SCREEN STATUS │
│    │
│    └── "Ride complete. Available for next ride." │
│    └── Ready for next assignment │
│ │
└─────────────────────────────────────────────────────────────────┘
```

---

### View Earnings

```
┌─────────────────────────────────────────────────────────────────┐
│ DRIVER JOURNEY: VIEW EARNINGS │
├─────────────────────────────────────────────────────────────────┤
│ │
│ 1. EARNINGS DASHBOARD │
│    │
│    └── Today's earnings │
│    └── This week's earnings │
│    └── This month's earnings │
│ │
│ 2. EARNINGS BREAKDOWN │
│    │
│    └── Ride fares (total) │
│    └── Ad revenue │
│    └── Bonuses/incentives │
│    └── Deductions (if any) │
│ │
│ 3. RIDE BREAKDOWN │
│    │
│    └── Number of rides │
│    └── Average per ride │
│    └── Screen uptime %
│ │
│ 4. PAYOUT │
│    │
│    └── Pending payout │
│    └── Last payout │
│    └── Request payout │
│    └── Bank/UPI details │
│ │
│ 5. STATEMENT │
│    │
│    └── Download statement │
│    └── Monthly report │
│ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Admin Flows

### Driver Onboarding

```
┌─────────────────────────────────────────────────────────────────┐
│ ADMIN JOURNEY: DRIVER ONBOARDING │
├─────────────────────────────────────────────────────────────────┤
│ │
│ 1. APPLICATION RECEIVED │
│    │
│    └── Driver applies via app │
│    └── Submits documents │
│ │
│ 2. DOCUMENT VERIFICATION │
│    │
│    └── License check │
│    └── RC book check │
│    └── Insurance check │
│    └── Background verification │
│ │
│ 3. VEHICLE INSPECTION │
│    │
│    └── Schedule inspection │
│    └── Check: │
│        • Vehicle condition │
│        • Safety features │
│        • Screen installation │
│ │
│ 4. APPROVAL │
│    │
│    └── Approve → Driver notified │
│    └── Reject → Reason given │
│ │
│ 5. TRAINING │
│    │
│    └── App tutorial │
│    └── Screen usage │
│    └── Customer service basics │
│ │
│ 6. ACTIVE DRIVER │
│    │
│    └── Go live │
│    └── Monitor initial rides │
│ │
└─────────────────────────────────────────────────────────────────┘
```

---

### Handle Disputes

```
┌─────────────────────────────────────────────────────────────────┐
│ ADMIN JOURNEY: HANDLE DISPUTES │
├─────────────────────────────────────────────────────────────────┤
│ │
│ 1. DISPUTE RAISED │
│    │
│    └── User or driver raises dispute │
│    └── Reason: Fare, Cancellation, Behavior, Other │
│ │
│ 2. REVIEW DETAILS │
│    │
│    └── Ride details │
│    └── Chat logs │
│    └── Location history │
│    └── Driver/rider ratings │
│ │
│ 3. DECIDE │
│    │
│    └── Full refund │
│    └── Partial refund │
│    └── No action │
│    └── Warning issued │
│ │
│ 4. RESOLVE │
│    │
│    └── Notify both parties │
│    └── Execute resolution │
│    └── Log for analytics │
│ │
└─────────────────────────────────────────────────────────────────┘
```

---

### Monitor Operations

```
┌─────────────────────────────────────────────────────────────────┐
│ ADMIN JOURNEY: MONITOR OPERATIONS │
├─────────────────────────────────────────────────────────────────┤
│ │
│ 1. DASHBOARD │
│    │
│    └── Active drivers │
│    └── Active rides │
│    └── Rides completed today │
│    └── Revenue today │
│ │
│ 2. PERFORMANCE │
│    │
│    └── Average wait time │
│    └── Cancellation rate │
│    └── Rating trends │
│    └── Screen uptime │
│ │
│ 3. ALERTS │
│    │
│    └── Driver offline (unusual) │
│    └── High cancellation area │
│    └── Payment failures │
│ │
│ 4. REPORTS │
│    │
│    └── Daily summary │
│    └── Weekly trends │
│    └── Monthly P&L │
│ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Screen-Specific Flows

### Screen App: Ride States

```
┌─────────────────────────────────────────────────────────────────┐
│ VEHICLE SCREEN: RIDE STATES │
├─────────────────────────────────────────────────────────────────┤
│ │
│ STATE 1: AVAILABLE │
│    └── "Available for rides" │
│    └── Shows driver info │
│    └── ReZ branding │
│ │
│ STATE 2: RIDE INCOMING │
│    └── "New ride request" │
│    └── Shows pickup/drop │
│    └── Waiting for driver accept │
│ │
│ STATE 3: NAVIGATING TO PICKUP │
│    └── "Picking up passenger" │
│    └── Shows destination preview │
│    └── ETA to pickup │
│ │
│ STATE 4: PASSENGER BOARDED │
│    └── Shows passenger info │
│    └── Shows ad │
│    └── Impressions tracking active │
│ │
│ STATE 5: RIDE IN PROGRESS │
│    └── Shows targeted ad │
│    └── Shows destination │
│    └── Shows remaining time │
│ │
│ STATE 6: RIDE COMPLETE │
│    └── "Ride complete" │
│    └── Thank you message │
│    └── ReZ branding │
│ │
│ STATE 7: OFFLINE │
│    └── "Screen offline" │
│    └── Contact support │
│ │
└─────────────────────────────────────────────────────────────────┘
```
