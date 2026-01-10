# LeadClients Services & Integration Guide

## Services Overview

### 1. **leadsService.ts**
Handles all Lead database operations:
- **getLeads(userId)** - Fetch all leads for a user
- **createLead(lead)** - Create a new lead and save to Firebase
- **updateLead(id, updates)** - Update an existing lead
- **deleteLead(id)** - Delete a lead

**Lead Schema:**
```typescript
{
  id: string;
  user_id: string;
  brand_id?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: string;         // 'new', 'contacted', 'qualified', etc.
  source?: string;        // Track where lead came from (e.g., "Contact Information Form")
  notes?: string;         // Custom notes or form responses
  created_at: string;
  updated_at: string;
}
```

### 2. **brandsService.ts**
Handles Brand management:
- **getBrands(userId)** - Fetch all brands
- **createBrand(brand)** - Create a new brand
- **updateBrand(id, updates)** - Update brand info
- **deleteBrand(id)** - Delete a brand

### 3. **calendarService.ts**
Handles calendar/event management

### 4. **settingsService.ts**
Handles user settings and preferences

---

## New Feature: Auto-Import Form Responses as Leads

### What It Does
The Leads page now has a button to import Google Form responses directly as leads into your database.

### How It Works

1. **Form responses are fetched** via FormsContext (cached globally)
2. **Row-based format** shows all responses with question titles as keys
3. **"I'm here to..." field** is stored in the `notes` field of the lead
4. **Import button** appears when form responses are available
5. **Leads are saved to Firebase** with source tracking

### Implementation

The `handleImportFormResponses()` function:
```typescript
- Loops through selectedFormResponsesArray
- Extracts: Name, Email, Phone, Company, Notes (from "I'm here to..." field)
- Creates new lead entries
- Saves to Firebase using createLead()
- Sets source as "Contact Information Form" (tracks form origin)
- Displays import count confirmation
```

### Form Field Mapping

You can customize field names in `handleImportFormResponses()`:

```typescript
const name = responseRow['Name'] || 'Unknown';
const email = responseRow['Email'] || responseRow['email'];
const phone = responseRow['Phone'] || responseRow['phone'];
const company = responseRow['Company'] || responseRow['company'];
const notes = responseRow['I'm here to…'] || responseRow['Notes']; // Your custom field
```

**Adjust these to match your actual Google Form field names!**

---

## UI Components Added

### Status Indicators
- ✅ Green - Google token available
- ❌ Red - Google token missing
- Shows number of cached forms

### Form Import Section
- Only shows when form responses are available
- Displays count of responses found
- Blue "Import as Leads" button with download icon
- Disabled state while importing

---

## Data Flow

```
Google Forms (API)
    ↓
FormsContext (Cache)
    ↓
selectedFormResponsesArray (Row-based format)
    ↓
handleImportFormResponses()
    ↓
createLead() → Firebase
    ↓
setLeads() → UI Updated
```

---

## Next Steps

1. **Customize field mapping** - Update form field names in `handleImportFormResponses()`
2. **Test import** - Click "Import as Leads" button to save responses
3. **Monitor source** - Filter leads by `source: "Contact Information Form"`
4. **Add to other pages** - Use `useForms()` hook in Dashboard or Brands pages

---

## Troubleshooting

**"No form responses available to import"**
- Ensure Google Form has responses
- Check "I'm here to..." field exists in your form
- Verify form is selected correctly

**Import shows 0 leads**
- Check field names match your Google Form exactly
- Look at browser console for error details
- Verify Firebase has write permissions

**"I'm here to..." not appearing in notes**
- Update the field name in `handleImportFormResponses()`
- Match the exact question title from your form
