The Photo Portal is a wall-mounted touch-screen device that displays photographs. It offers some interactivity but is optimized for passive enjoyment. The user can interact through touch for basic navigation (swiping through photos) and device management (wifi settings, screen brightness), but primary controls are via physical hardware buttons. The user can view metadata about the photograph (time, date, location), and filter the photos by location. New photos can be added by trusted users. Rudimentary bi-directional communication and sharing features are included.

# Product Positioning

Photo Portal is designed for use at home to enjoy digital photographs provided directly by members of the household, or remotely by loved ones. The product can be used to recall important moments or experiences of your own, or live vicariously through the experiences of others. Users treat this much like they do any other photo-frame in their household: as a way to passively view cherished photos, and as a way to customize and decorate their space. The interactive capabilities of Photo Portal allow users to customize the content shown to their liking. Remote users can send and spotlight images turning the Photo Portal into an emotional exchange.

# User Scenarios

1. The user mounts the Photo Portal on their wall to enjoy photos passively. From their phone, they select photos for the Portal to display. Other members of their family do the same. The Photo Portal displays all selected photos in a slide-show format.
2. The user receives the Photo Portal as a gift from a family member. The family member adds themselves as a trusted user and adds photos to be displayed over time. The recipient enjoys seeing the photos that are added, and “Likes” ones they particularly enjoy. Liked photos are shown more often. When they see a photo they want to share with friends, they use the touch-screen interface to “Share” the photo to their phone.
3. A Photo Portal user has a family member configured as a photo provider. The family member selects a photo to send as a Photo Note. They provide a short text message to accompany the photo. Once sent, the Photo Portal owner sees an indicator light that they have a new message waiting. They open the message to see the photo, and the note. Once read, the note gets added to a list of past notes, and the photo enters the collection of photos to display.
4. A Photo Portal user brings up the Map View to see where in the world the photos added to the device were taken. They use controls to select a specific region of the world. Then, photos displayed on the device are for that region of the world. The region resets when the user requests, or after 12 hours.

# User Requirements

## User Types

**Admin:** Access to backend to upload photos, manage photos, and send messages remotely.

**Viewer:** Device user who sees photos on the device and can interact with the device directly.

## Device Setup and Configuration

| Title | Description | Priority |
| --- | --- | --- |
| Power Control | The device uses a single power cable and an on/off switch on the back of the frame turns it on.  | P0 |
| Boot Up | Following boot, the device launches the Photo Frame application automatically in full screen. | P0 |
| Admin Control | A local admin using the device can exit the default application by plugging in a mouse and keyboard to make admin changes to the device. | P0 |
| WiFi Configuration | If device is not connected to WiFi network, default application shows WiFi selection and password entry UI. | P1 |

## Photo Submission and Management

| Title | Description | Priority |
| --- | --- | --- |
| Access | Admin visits URL to upload images from phone or desktop. | P0 |
| Bulk Upload | Admin can bulk-upload images using in-browser file selector on desktop, or photo selector on mobile. | P0 |
| Create/Send Message | Admin can send a photo message to the device by uploading a single image and providing a text message. | P0 |
| Message Review | Admin can view all messages sent. | P1 |
| Photo Review | Admin can see all images on device. | P1 |
| Photo Removal | Admin can select one or more photos for removal from the device. Removing photo attached to message will delete message as well. | P1 |
| Account Creation | Interface for creating and managing accounts. | P2 |
| Multi-Device Management | Single cloud infrastructure can support multiple devices, multiple admins assigned to different devices, etc | P2 |

## Content Viewing

| Title | Description | Priority |
| --- | --- | --- |
| Photo Storage and Access | Photos are stored remotely. Collection of photos can be indexed and accessed by the device using credentials stored on device. Photo metadata includes capture time and date, and Lat/Lon coordinates. | P0 |
| Local Caching | Photos are cached locally for instant rendering however access to remote storage is necessary for functionality. Cache is sized to device storage space. Front-end experience operates using cached content when internet is not available. | P0 |
| Slideshow | By default, device displays a slideshow of all photos on device. Pause between photos is fixed. Device is only turned off using physical on/off switch. | P0 |
| Navigation | Viewer can swipe to advance to next photo in slideshow. | P0 |
| Photo Display | Single landscape or dual portrait photos are displayed at a time. | P0 |
| Liking | User can "Like" a photo using physical button on device (future feature). Likes are stored locally on the device as a list of "liked" photo IDs in IndexedDB. | P1 |
| Photo Variation | Photos are displayed in a slideshow with automatic advancement. The slideshow creates compositions based on screen orientation (single landscape or dual portrait photos). Photos are selected and arranged to fill available space optimally. | P0 |
| Photo Fill | Photos fill available space and are centered | P0 |
| Metadata | Viewer can toggle on meta-data view over the photo to view time, date, and location of the photo. Location is mapped to name using API service and Lat/Lon coordinates. Location names are cached to avoid subsequent look-ups. | P0 |
| Message Receipt | When a message is sent, a physical indicator LED (part of the LED push button) begins fading in and out continuously on the device. The Viewer presses the Select/Message Button (button contacts of the same LED push button) to see the message. Upon viewing the message, the LED fade stops and the indicator light is extinguished. Photo in message is not part of slideshow until message is read. The LED uses PWM for smooth fading effects. | P0 |
| Past Messages | The Viewer can access a list of past messages on the device by ingress-ing through an on-screen UI element. | P1 |

## Photo Filtering

| Title | Description | Priority |
| --- | --- | --- |
| Map View | Viewer can toggle Map View with switch. Displays map of world with markers for location of every photo. | P0 |
| Map Navigation | Viewer can pan around the map for greater detail. Zoom is controlled by hardware potentiometer (or virtual slider when GPIO service not connected). Touch zoom/rotate is disabled. | P0 |
| Location Filter | Viewer can set a map view as a filter to display photos from region on screen. In Map View, pressing the Select/Message Button sets the current viewport as a boundary filter for the slideshow. At zoom level 2 or below, pressing the button clears the filter. Filter stays active until user changes/resets it, or for 12 hours (auto-expires). Filter is stored locally and persists across sessions. | P0 |
| Filter Reset | Viewer can reset/remove the photo filter to default back to world-wide photos. | P0 |
| Non-geo-tagged Photos | Photos without location meta-data are not shown on map. The map uses Supercluster for efficient marker clustering at different zoom levels. Markers show thumbnails at zoom level 6 and above, and simple pins below zoom 6. | P0 |
| Route View | Viewer can toggle on route between photo pins. Created automatically between pins in close physical proximity taken within 24 hours of each other. (Future enhancement) | P2 |

## Authentication & Error States

| Title | Description | Priority |
| --- | --- | --- |
| Admin Unauthenticated | When a user visits the Admin portal to upload content and they are not authenticated, they are shown a login UI and a message indicating they are not logged in. | P0 |
| Failed Admin Authentication | When a user fails to authenticate, the failed authentication is reported to the user as an error message. | P0 |
| Device Authentication | During initial setup, the Device UI presents an authentication screen. The user provides the necessary keys to authenticate and access the static media store. | P0 |
| Authentication | Admin enters username and password to access upload page. | P0 |
| Account Management | Accounts are manually created within auth service/database (e.g. Firebase). All accounts are Admin accounts. | P0 |
| No Internet | When no internet is available, a small icon indicates that the device is drawing from cached content. | P0 |

## Hardware Interface

| Title | Description | Priority |
| --- | --- | --- |
| Message Indicator | A physical LED (GPIO 17) embedded in the LED push button indicates that a message has been received. The LED fades in and out continuously when there's a new unread message. When all messages are read, the LED extinguishes. Uses PWM for smooth fading effects. The LED has a built-in 200Ω resistor (no external resistor needed). | P0 |
| Select/Message Button | A physical button (GPIO 18) that is the button switch contacts of the LED push button. This single button serves dual purposes with context-dependent functionality. In Slideshow Mode: shows the most recent message when pressed. In Map View: sets the current map viewport as a boundary filter for the slideshow when pressed. If pressed at zoom level 2 or below in Map View, clears the geo-filter. | P0 |
| Map Toggle Switch | A physical SPDT switch (GPIO 27) toggles the device between Slideshow and Map View. Switch state is tracked and sent to the webapp. | P0 |
| Metadata Switch | A physical SPDT switch (GPIO 22) toggles on a meta-data overlay. In Slideshow mode the meta-data displays time/date and location of the current photo in a two-slot layout (left: date/time, right: location). On Map View, when enabled, displays a crosshair at the map center (200px × 200px) and a metadata overlay with reverse geocoded location name and photo count in viewport (left: location, right: photo count). The location is reverse geocoded from the map center after 500ms of no movement/zooming, using zoom-based feature types (country at zoom < 5, region at 5-7, district at 7-8, place at 8-10, locality at 10+). Location names are displayed hierarchically (neighborhood/city with country, or state for US locations, excluding counties). The metadata overlay uses the same component and two-slot layout in both views. | P0 |
| On/Off Switch | A physical switch on the back of the device powers the entire device on/off. | P0 |
| Zoom Potentiometer | A physical potentiometer (rotary knob) controls map zoom level in Map View. Routed through ADS1115 16-bit ADC via I2C (GPIO 2/3). Reads at 10Hz and broadcasts changes when value changes by more than 2% of full range. Disabled in Slideshow mode. Normalized value (0.0-1.0) is converted to zoom levels 1-11. | P0 |
| Virtual Hardware Overlay | When the device UI has focus and the user presses the <code>v</code> key on a connected keyboard, an on-screen overlay appears with virtual controls that mirror the physical interface (Select/Message button with glow indicator, map toggle, metadata toggle, and zoom slider). The zoom slider is only visible when map view is enabled and the GPIO service is not connected. Interacting with these virtual controls sends the same events into the app as the corresponding GPIO inputs. | P0 |
| Debug Panel | When the device UI has focus and the user presses the <code>d</code> key on a connected keyboard, a side panel appears showing an event log of all GPIO events, WebSocket messages (incoming and outgoing), virtual button events, and remote events (e.g., new messages). The panel shows connection status, timestamps, event types, and data. Useful for debugging and development. | P0 |

## Software Architecture

| Title | Description | Priority |
| --- | --- | --- |
| Static File Serving | The product runs off of static file hosting. There is no backend interaction needed other than serving static files. All data and features beyond photos are supplied by static structured data files (JSON format) which can be read by the front-end client. | P0 |
| Single Device Management | Cloud infrastructure supports single device. | P0 |
| Browser-based UI | The user interface of the device is a web-based experience which can be updated by pushing new static code to the file hosting service. | P0 |
| Upload Interface and Authentication | An authentication service (e.g. Firebase) provides authentication before giving access to an upload interface that writes to the static file hosting service. The upload interface uses an authenticated API (or serverless function) to write media and JSON metadata to storage. The device and admin UI read from static JSON files and media URLs. | P0 |
| Code and Media Hosting | Media and code are hosted in a separate file stores. | P0 |
| Device-level integration | The front-end code integrates sufficiently at the device level to allow for WiFi configuration and triggering the New Message indicator light. Inputs from switches and buttons are emitted as events within the front-end to trigger UI state changes. | P0 |
| Display Authentication | Media files are served from a file store that can only be accessed with credentials that are stored on the device. | P0 |
| New Content Discovery | New photo content and messages are discovered using occasional polling. | P0 |
| Remote Update | UI changes and improvements can be pushed to the device without having to manually trigger an update on the device. | P0 |

# Proposed Architecture Design

## Overview

Photo Portal is built as a cloud-connected web application running on a Raspberry Pi with attached touchscreen. The system consists of three components: a **Device Application** (React) displayed in a kiosk browser, an **Admin Portal** (React) for remote photo management, and a **Cloud Backend** (Google Cloud) for storage, authentication, and media processing. Physical hardware inputs (buttons, switches) and outputs (LED) are managed by a local Python service that communicates with the browser via WebSocket.

All user interfaces are web-based and hosted remotely, enabling over-the-air updates without physical access to the device. Photos are stored in the cloud at full resolution, processed automatically into optimized display versions and thumbnails, and cached locally on the device for offline viewing.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Google Cloud                                 │
│                                                                         │
│  ┌─────────────────┐     ┌─────────────────────────────────────────┐    │
│  │    Firebase     │     │          Cloud Storage                  │    │
│  │ Authentication  │     │                                         │    │
│  │                 │     │  photoportal-media/                     │    │
│  │ Email/password  │     │    ├── uploads/    (incoming photos)    │    │
│  │ for admin login │     │    ├── photos/     (processed photos)   │    │
│  └─────────────────┘     │    └── thumbs/     (400px thumbnails)   │    │
│                          │                                         │    │
│  ┌─────────────────┐     │  photoportal-data/                      │    │
│  │    Firebase     │     │    ├── photos.json  (photo index)       │    │
│  │    Hosting      │     │    └── messages.json (message list)     │    │
│  │                 │     └─────────────────────────────────────────┘    │
│  │ Device UI       │                                                    │
│  │ Admin Portal    │     ┌─────────────────────────────────────────┐    │
│  └─────────────────┘     │       Cloud Functions (2nd gen)         │    │
│                          │                                         │    │
│  ┌─────────────────┐     │  processBatches  - batch photo processing,│    │
│  │     Mapbox      │     │                   resize, extract EXIF, │    │
│  │                 │     │                   geocode, thumbnail    │    │
│  │ GL JS (maps)    │     │  cleanupFailedBatches - cleanup failed │    │
│  │ Geocoding API   │     │  sendMessage    - append to messages    │    │
│  └─────────────────┘     └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
        ┌─────────────────┐                      ┌─────────────────────┐
        │  Admin Portal   │                      │    Photo Portal     │
        │    (Browser)    │                      │      (Device)       │
        │                 │                      │                     │
        │ • Login         │                      │ Raspberry Pi 4/5    │
        │ • Upload photos │                      │ + HD Touchscreen    │
        │ • Send messages │                      │                     │
        │ • Manage photos │                      │ ┌─────────────────┐ │
        └─────────────────┘                      │ │ Chromium Kiosk  │ │
                                                 │ │ (Device App)    │ │
                                                 │ └───────┬─────────┘ │
                                                 │         │WebSocket  │
                                                 │ ┌───────┴─────────┐ │
                                                 │ │  Python GPIO    │ │
                                                 │ │    Service      │ │
                                                 │ └───────┬─────────┘ │
                                                 │         │           │
                                                 │ ┌───────┴─────────┐ │
                                                 │ │ Physical I/O    │ │
                                                 │ │ • LED (GPIO 17) │ │
                                                 │ │ • Buttons/Switch│ │
                                                 │ └─────────────────┘ │
                                                 └─────────────────────┘

```

---

## Hosting & Domains

| Path | Service | Purpose |
| --- | --- | --- |
| `photoportal.alexhadik.com/device` | Firebase Hosting | Device React application |
| `photoportal.alexhadik.com/admin` | Firebase Hosting | Admin React application |

Media files are served directly from Cloud Storage using authenticated requests. The device stores a long-lived API key for Cloud Storage access.

---

## Device Hardware

### Components

| Component | Specification |
| --- | --- |
| Computer | Raspberry Pi 4 (2GB+) or Raspberry Pi 5 |
| Display | HD touchscreen (USB or DSI interface) |
| Storage | 32GB+ microSD card |
| OS | Raspberry Pi OS (64-bit) with desktop environment |
| Browser | Chromium in kiosk mode |
| ADC | ADS1115 16-Bit ADC (I2C interface, optional) |
| Potentiometer | 10kΩ rotary potentiometer (optional, for zoom control) |
| LED Push Button | Arcade-style push button with built-in LED and 200Ω resistor (e.g., Adafruit Arcade Button with LED - 30mm) |
| Buttons | Momentary push buttons (normally open) |
| Switches | SPDT toggle switches |

### Hardware Wiring

**GPIO Pin Assignments:**

| GPIO Pin | Direction | Component | Description |
| --- | --- | --- | --- |
| 17 | Output | LED | Message indicator light (PWM, built-in 200Ω resistor in LED push button) |
| 18 | Input | Button | Select/Message button (momentary, pull-up) - button contacts of LED push button. Shows message in Slideshow Mode, sets boundary filter in Map View |
| 27 | Input | Switch | Map view toggle (SPDT, pull-up) |
| 22 | Input | Switch | Metadata overlay toggle (SPDT, pull-up) |
| 2 | I2C | ADS1115 | SDA (I2C data) |
| 3 | I2C | ADS1115 | SCL (I2C clock) |

**I2C Device Addresses:**

| Device | I2C Address | Channel | Purpose |
| --- | --- | --- | --- |
| ADS1115 | 0x48 (default) | A0 | Potentiometer wiper (zoom control) |

**Circuit Diagrams:**

LED Circuit (LED Push Button with built-in resistor):

```
GPIO 17 ──→ [LED Push Button LED+] ──→ [Built-in 200Ω Resistor] ──→ [LED Push Button LED-] ──→ GND
```

Alternative (Separate LED with external resistor):

```
GPIO 17 ──→ 330Ω resistor ──→ LED (+) ──→ LED (-) ──→ GND
```

Potentiometer + ADC Circuit:

```
3.3V ──→ Potentiometer (one end)
GND ──→ Potentiometer (other end)
Wiper ──→ ADS1115 A0 input
ADS1115 SDA ──→ GPIO 2 (SDA)
ADS1115 SCL ──→ GPIO 3 (SCL)
ADS1115 VDD ──→ 3.3V
ADS1115 GND ──→ GND
```

### Boot Sequence

1. Raspberry Pi powers on and boots Raspberry Pi OS
2. systemd starts the GPIO Python service (`photoportal-gpio.service`)
3. GPIO service initializes hardware (LED, buttons, switches, ADC) and starts WebSocket server on `localhost:8765`
4. systemd starts Chromium in kiosk mode, loading the device application URL
5. Device application initializes, attempts to connect to GPIO service via WebSocket
6. If WebSocket connection fails (after 3 retry attempts), device falls back to "virtual mode"
7. If no WiFi connection, device displays WiFi configuration UI
8. Once connected, device authenticates with Firebase and syncs photos
9. Device begins slideshow or shows login screen if not authenticated

---

## Cloud Storage Structure

### **photoportal-media bucket**

```
photoportal-media/
├── uploads/                    # Temporary upload location
│   └── {batchId}/             # Batch directories
│       └── {photo-id}.jpg     # Raw uploads from admin
├── photos/                     # Processed display images
│   └── {photo-id}.jpg         # Resized to max 4096px (preserving aspect ratio)
└── thumbs/                     # Thumbnails for fast loading
    └── {photo-id}.jpg         # Resized to 400px width

```

### **photoportal-data bucket**

```
photoportal-data/
├── photos.json                 # Photo index and metadata
└── messages.json               # Message list

```

---

## Data Schemas

### **photos.json**

Generated and maintained by Cloud Functions. The device treats this as read-only.

```json
{
  "version": 1,
  "lastUpdated": "2024-12-15T10:30:00Z",
  "photos": [
    {
      "id": "a1b2c3d4",
      "photoUrl": "https://storage.googleapis.com/photoportal-media/photos/a1b2c3d4.jpg",
      "thumbUrl": "https://storage.googleapis.com/photoportal-media/thumbs/a1b2c3d4.jpg",
      "width": 4096,
      "height": 3072,
      "aspectRatio": 1.333,
      "orientation": "landscape",
      "capturedAt": "2024-07-15T14:30:00Z",
      "uploadedAt": "2024-12-15T10:30:00Z",
      "location": {
        "lat": 37.7749,
        "lon": -122.4194,
        "name": "San Francisco, California"
      }
    },
    {
      "id": "e5f6g7h8",
      "photoUrl": "https://storage.googleapis.com/photoportal-media/photos/e5f6g7h8.jpg",
      "thumbUrl": "https://storage.googleapis.com/photoportal-media/thumbs/e5f6g7h8.jpg",
      "width": 1536,
      "height": 2048,
      "aspectRatio": 0.75,
      "orientation": "portrait",
      "capturedAt": "2024-07-15T15:00:00Z",
      "uploadedAt": "2024-12-15T10:30:00Z",
      "location": null
    }
  ]
}

```

The `orientation` field is derived from aspect ratio: "landscape" when aspectRatio ≥ 1, "portrait" when aspectRatio < 1. Photos without EXIF GPS data have `location: null` and do not appear on the map view.

### **messages.json**

```json
{
  "version": 1,
  "lastUpdated": "2024-12-15T11:00:00Z",
  "messages": [
    {
      "id": "msg-001",
      "photoId": "a1b2c3d4",
      "text": "Thinking of you!",
      "sentAt": "2024-12-15T11:00:00Z"
    }
  ]
}

```

### **Device Local State**

Stored in browser localStorage or IndexedDB. Never synced to cloud.

```json
{
  "likedPhotoIds": ["a1b2c3d4", "e5f6g7h8"],
  "readMessageIds": ["msg-001"],
  "lastSyncedPhotosAt": "2024-12-15T10:30:00Z",
  "lastSyncedMessagesAt": "2024-12-15T11:00:00Z",
  "activeLocationFilter": {
    "bounds": {
      "north": 38.0,
      "south": 37.0,
      "east": -122.0,
      "west": -123.0
    },
    "setAt": "2024-12-15T12:00:00Z"
  }
}

```

---

## Cloud Functions

All functions run on Cloud Functions for Firebase (2nd generation, callable functions).

### **processBatches**

| Property | Value |
| --- | --- |
| Type | Callable HTTP function (onCall) |
| Runtime | Node.js 24 |
| Memory | 1GB (for image processing) |
| Timeout | 540 seconds (9 minutes) |
| Region | us-east1 |
| Input | `{ "batchIds": ["batch-id-1", "batch-id-2", ...] }` |

**Processing Steps:**

1. Accept array of batch IDs from admin portal
2. For each batch, list all image files in `uploads/{batchId}/` directory
3. For each photo in each batch (processed sequentially):
   - Check if photo ID already exists in `photos.json` (skip if duplicate)
   - Download uploaded image from `uploads/{batchId}/{photoId}.jpg`
   - Extract EXIF metadata (capture timestamp, GPS coordinates, orientation)
   - Process image with Sharp: auto-rotate based on EXIF orientation
   - Resize image to fit within 4096×4096 pixels, preserving aspect ratio
   - Generate 400px-wide thumbnail
   - Upload processed image to `photos/{photoId}.jpg`
   - Upload thumbnail to `thumbs/{photoId}.jpg`
   - If GPS coordinates present, call Mapbox Geocoding API for place name
   - Append photo entry to `photos.json` and update `lastUpdated` timestamp
   - Delete original from `uploads/{batchId}/`
   - Log progress to `logs/{processId}.log` (JSONL format)
4. After all batches processed, delete log file
5. Return `{ processId, status: "complete" }`

**Error Handling:**
- Individual photo errors are logged but don't stop batch processing
- Failed photos are logged with error details
- Log file is kept if overall processing fails (for debugging)

**Batch Cleanup:**
- After processing all photos in a batch, checks if batch directory is empty
- Logs batch completion status

### **cleanupFailedBatches**

| Property | Value |
| --- | --- |
| Type | Callable HTTP function (onCall) |
| Runtime | Node.js 24 |
| Region | us-east1 |
| Input | `{ "batchIds": ["batch-id-1", "batch-id-2", ...] }` |

**Purpose:** Utility function to clean up failed upload batches by deleting all files in specified batch directories.

**Processing Steps:**

1. Accept array of batch IDs
2. For each batch, delete all files in `uploads/{batchId}/` directory
3. Return cleanup status

### **sendMessage**

| Property | Value |
| --- | --- |
| Type | Callable HTTP function (onCall) |
| Runtime | Node.js 24 |
| Region | us-east1 |
| Input | `{ "photoId": "a1b2c3d4", "text": "Message content" }` |

**Processing Steps:**

1. Verify Firebase Auth token (requires authentication)
2. Validate input: `photoId` required, `text` must be 1-280 characters
3. Verify `photoId` exists in `photos.json`
4. Generate unique message ID (UUID without dashes)
5. Append message to `messages.json` and update `lastUpdated` timestamp
6. Return created message object

**Response Format:**
```typescript
{
  id: string;       // Unique message ID
  photoId: string; // Photo ID
  text: string;    // Message text
  sentAt: string;  // ISO timestamp
}
```

---

## Device Application

### Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | React 18 |
| Build Tool | Vite |
| State Management | React Context + hooks |
| Maps | Mapbox GL JS |
| Local Storage | IndexedDB (via idb library) |
| HTTP Client | fetch API |

### Application Structure

```
device-app/
├── src/
│   ├── components/
│   │   ├── device/
│   │   │   ├── Slideshow/
│   │   │   │   └── Slideshow.tsx           # Main slideshow view with auto-advance
│   │   │   ├── PhotoDisplay/
│   │   │   │   └── PhotoDisplay.tsx        # Single/dual photo renderer with orientation support
│   │   │   ├── MetadataOverlay/
│   │   │   │   └── MetadataOverlay.tsx     # Shared metadata overlay component (two-slot layout for Photo and Map View)
│   │   │   ├── MapView/
│   │   │   │   ├── MapView.tsx             # Mapbox map with photo markers and clustering
│   │   │   │   └── MapViewCrosshair.tsx    # Crosshair indicator at map center (shown when metadata enabled)
│   │   │   ├── MessageOverlay/
│   │   │   │   └── MessageOverlay.tsx      # Full-screen message display overlay
│   │   │   ├── VirtualOverlay/
│   │   │   │   └── VirtualOverlay.tsx      # Virtual hardware controls for testing
│   │   │   └── DebugPanel/
│   │   │       └── DebugPanel.tsx           # Event log side panel for debugging
│   │   └── admin/
│   │       ├── Login/
│   │       ├── PhotoUploader/
│   │       ├── MessageComposer/
│   │       └── Dashboard/
│   ├── hooks/
│   │   └── useGPIO.ts              # WebSocket to GPIO service with fallback to virtual mode
│   ├── services/
│   │   ├── api.ts                  # Fetch photos.json, messages.json
│   │   ├── cache.ts                # IndexedDB operations for likes, read messages, location filters
│   │   ├── photoUrlStore.ts       # Photo URL caching and management
│   │   └── firebase.ts             # Firebase authentication
│   ├── contexts/
│   │   └── PhotoUrlContext.tsx     # React context for photo URL management
│   ├── utils/
│   │   ├── orientation.ts          # Screen orientation detection
│   │   └── compositions.ts         # Photo composition logic (single/dual display)
│   ├── routes/
│   │   └── DeviceApp/
│   │       └── DeviceApp.tsx       # Main device application component
│   ├── config.ts                   # Configuration constants
│   ├── types.ts                    # TypeScript type definitions
│   └── main.tsx
├── public/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts

```

### View States

The device application has two primary view states controlled by the Map Toggle switch:

```
                    ┌─────────────────┐
                    │                 │
        ┌───────────│   SLIDESHOW    │
        │           │                 │
        │           └────────┬────────┘
        │                    │
        │ Map Toggle         │ Select/Message Button
        │ Switch ON          │ (shows message or sets boundary filter)
        │                    │
        ▼                    ▼
┌───────────────┐   ┌───────────────┐
│               │   │               │
│   MAP VIEW    │   │   MESSAGE     │
│               │   │   OVERLAY     │
│               │   │   (temporary) │
└───────┬───────┘   └───────┬───────┘
        │                   │
        │ Map Toggle        │ Auto-dismiss
        │ Switch OFF        │ (after timeout)
        │                   │
        └───────────────────┘
                │
                ▼
          SLIDESHOW

```

**Additional UI Elements:**
- **Virtual Overlay**: Toggle with 'v' key - shows virtual hardware controls
- **Debug Panel**: Toggle with 'd' key - shows event log side panel
- **Metadata Overlay**: Toggle with Metadata switch - shows photo/map metadata in two-slot layout
  - **Photo View**: Left slot shows formatted date/time, right slot shows location name
  - **Map View**: Shows crosshair at map center, left slot shows reverse geocoded location name, right slot shows photo count in viewport

### Caching Strategy

Photos are cached locally using a combination of IndexedDB and browser cache for offline viewing and fast rendering.

**Photo URL Management:**

1. Photo URLs are stored in a dedicated `PhotoUrlContext` that manages signed URLs from Cloud Storage
2. URLs are fetched on-demand and cached to avoid unnecessary API calls
3. Initial load fetches URLs for all photos (blocking)
4. Incremental updates only fetch URLs for new photos

**Initial Sync:**

1. Fetch `photos.json`
2. Compare with locally cached photo IDs
3. Fetch signed URLs for all photos (blocking on initial load)
4. Photos are loaded from Cloud Storage using cached URLs

**Ongoing Sync:**

1. Every 60 seconds (configurable), check `photos.json` for updates
2. If changed, download new JSON and fetch URLs for new photos only
3. Every 30 seconds (configurable), check `messages.json` for updates
4. If new unread messages exist, signal GPIO service to start LED fade animation
5. When message is read, signal GPIO service to stop LED fade

**Local State Persistence (IndexedDB):**

- Liked photo IDs (for future "like" functionality)
- Read message IDs (to track which messages have been viewed)
- Active location filter with expiration timestamp (12-hour auto-expiry)

**Cache Limits:** When local storage exceeds 80% capacity, evict least-recently-displayed photos (keeping liked photos longer).

**Offline Mode:** When network is unavailable, display cached content. Show small offline indicator icon in corner of screen.

### GPIO Integration

The device application communicates with physical hardware through a WebSocket connection to a local Python service running on `ws://localhost:8765`. The service automatically falls back to "virtual mode" if the WebSocket connection cannot be established (e.g., during development on non-Raspberry Pi systems).

The device application also supports a **virtual hardware overlay** for local debugging and testing. When the device UI has focus and the user presses the `v` key on a connected keyboard, an on-screen overlay appears with virtual controls that mirror the physical interface (message button with glow indicator, map toggle, metadata toggle, and zoom slider). The zoom slider is only visible when map view is enabled and the GPIO service is not connected (hardware controls zoom when connected). Interacting with these virtual controls sends the same events into the app as the corresponding GPIO inputs.

A **debug panel** can be opened by pressing the `d` key, which displays an event log showing all GPIO events, WebSocket messages (incoming and outgoing), virtual button events, and remote events (e.g., new messages). The panel shows connection status, timestamps, event types, and data.

**Inbound Events (GPIO → Browser):**

| Event | Trigger | App Response |
| --- | --- | --- |
| `MAP_TOGGLE` | Map switch changed (value: 'ON' or 'OFF') | Switch between Slideshow and Map View |
| `METADATA_TOGGLE` | Metadata switch changed | Toggle metadata overlay on/off |
| `SELECT_BUTTON` | Select/Message button pressed | In Slideshow: show most recent message. In Map View: set boundary filter to current viewport (or clear if zoom ≤ 2) |
| `ZOOM_DIAL` | Potentiometer rotated (value: 0.0-1.0 normalized) | Update map zoom level (Map View only). Converts normalized value to zoom levels 1-11. |

**Outbound Commands (Browser → GPIO):**

| Command | Trigger | Hardware Response |
| --- | --- | --- |
| `LED` | Unread message exists (value: 'ON') | Start LED fade animation (continuous fade in/out) |
| `LED` | All messages read (value: 'OFF') | Stop fade and extinguish LED |
| `MESSAGE_WAITING` | New message detected (value: true) | Start LED fade animation |
| `MESSAGE_READ` | Message viewed by user | Stop LED fade animation |

**Initial State Synchronization:**

When a WebSocket client connects, the GPIO service sends initial states:
- `MAP_TOGGLE` with current switch state
- `ZOOM_DIAL` with current potentiometer value (if ADC available)

---

## Admin Portal

### Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | React 18 |
| Build Tool | Vite |
| Authentication | Firebase Auth SDK |
| File Upload | Firebase Storage SDK |
| Styling | Tailwind CSS (optional) |

### Application Structure

```
admin-app/
├── src/
│   ├── components/
│   │   ├── Login.tsx               # Firebase Auth login form
│   │   ├── PhotoUploader.tsx       # Drag-drop upload interface
│   │   ├── PhotoGallery.tsx        # Grid view of all photos
│   │   ├── PhotoDetail.tsx         # Single photo view with delete
│   │   ├── MessageComposer.tsx     # Select photo + write message
│   │   └── MessageHistory.tsx      # List of sent messages
│   ├── services/
│   │   ├── auth.ts                 # Firebase Auth wrapper
│   │   └── storage.ts              # Upload and delete operations
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── package.json
└── vite.config.ts

```

### Upload Flow

The photo upload process is a multi-stage workflow that separates file upload from image processing, allowing for better error handling, progress tracking, and batch management.

#### Stage 1: File Selection and Validation

1. **File Selection**: Admin selects one or more photos via:
   - File picker (browser file input)
   - Drag-and-drop interface
   - Both methods accept multiple files

2. **File Validation**: 
   - Only JPEG files are accepted (`image/jpeg` or `image/jpg` MIME types)
   - Invalid files are rejected with an error message
   - Valid files proceed to upload

3. **Batch Creation**:
   - All files selected in a single action are grouped into one batch
   - A unique batch ID is generated using UUID format: `{timestamp}-{random}-{random}`
   - Each file within the batch gets a unique upload ID: `{timestamp}-{random}`

#### Stage 2: File Upload to Storage

1. **Upload Path Structure**:
   - Files are uploaded to: `photoportal-media/uploads/{batchId}/{uploadId}.jpg`
   - All files are normalized to `.jpg` extension regardless of original extension
   - Files remain in the `uploads/` directory until processing completes

2. **Concurrent Upload Management**:
   - Uploads are processed with a concurrency limit of 3 simultaneous uploads
   - This prevents overwhelming browser connections and improves reliability
   - Uploads are batched into groups of 3 and processed sequentially

3. **Upload Progress Tracking**:
   - Each file upload shows real-time progress (0-100%)
   - Progress is tracked using Firebase Storage's `uploadBytesResumable` API
   - Upload state is monitored: `uploading` → `complete` or `error`
   - UI displays progress bars and status for each file

4. **Upload Completion**:
   - When all files in a batch finish uploading, the batch is marked as "unprocessed"
   - Admin UI automatically detects unprocessed batches
   - Upload interface is disabled while uploads are in progress

#### Stage 3: Batch Processing Initiation

1. **Unprocessed Batch Detection**:
   - Admin UI periodically checks for unprocessed batches (every 60 seconds)
   - Scans `photoportal-media/uploads/` directory for batch subdirectories
   - Displays list of unprocessed batches to admin

2. **Batch Selection**:
   - If only one batch exists, it's automatically selected
   - If multiple batches exist, admin can select which batches to process
   - Selected batches are tracked in UI state

3. **Processing Trigger**:
   - Admin clicks "Process Batch" or "Process Selected Batches" button
   - Admin UI calls `processBatches` Cloud Function with array of selected batch IDs
   - Cloud Function returns a `processId` for tracking progress
   - Processing status is immediately set to "in progress"

#### Stage 4: Cloud Function Processing

1. **Processing Execution** (see `processBatches` function details above):
   - Cloud Function processes each batch sequentially
   - Within each batch, photos are processed sequentially
   - Each photo goes through: EXIF extraction, rotation, resizing, thumbnail generation, geocoding
   - Progress is logged to `photoportal-data/logs/{processId}.log` (JSONL format)

2. **Processing Log Format**:
   - Log entries include: `start`, `count`, `processing`, `complete`, `skip`, `error`, `finish`
   - Log file is deleted when processing completes successfully
   - Log file is kept if processing fails (for debugging)

#### Stage 5: Processing Status Monitoring

1. **Status Polling**:
   - Admin UI polls processing status every 30 seconds when processing is active
   - Checks for log file existence in `photoportal-data/logs/{processId}.log`
   - Parses log file to extract progress information

2. **Progress Calculation**:
   - Reads `count` entry to get total photo count
   - Counts `complete` and `skip` entries to get completed count
   - Displays progress bar: `{completed} / {total} photos`
   - Updates in real-time as processing continues

3. **Completion Detection**:
   - Processing is complete when:
     - Log file no longer exists (deleted by Cloud Function)
     - All batch directories are removed from `uploads/`
   - Processing status is reset to idle
   - Unprocessed batch list is refreshed

#### Stage 6: Error Handling and Cleanup

1. **Error Detection**:
   - Individual photo errors are logged but don't stop batch processing
   - Overall processing errors are detected when log file contains error entries
   - Error messages are displayed to admin

2. **Failed Batch Cleanup**:
   - Admin can manually trigger cleanup of failed batches
   - Calls `cleanupFailedBatches` Cloud Function
   - Deletes all files in failed batch directories
   - Removes batch directories from `uploads/`

3. **Retry Mechanism**:
   - Admin can re-process failed batches by selecting them again
   - Duplicate photo detection prevents re-processing already-processed photos

#### Stage 7: Gallery Update

1. **Photo Index Update**:
   - After processing completes, `photos.json` is updated with new photo entries
   - Admin UI can poll `photos.json` to detect new photos
   - New photos appear in gallery automatically

2. **Photo Display**:
   - Processed photos are available at: `photoportal-media/photos/{photoId}.jpg`
   - Thumbnails are available at: `photoportal-media/thumbs/{photoId}.jpg`
   - Photos include metadata: dimensions, aspect ratio, capture date, location

#### Upload Flow Summary

```
Admin selects files
    ↓
Files validated (JPEG only)
    ↓
Batch ID generated
    ↓
Files uploaded to uploads/{batchId}/{uploadId}.jpg (3 concurrent max)
    ↓
Upload progress tracked in UI
    ↓
Batch marked as "unprocessed"
    ↓
Admin selects batches to process
    ↓
processBatches Cloud Function called
    ↓
Processing status polled every 30 seconds
    ↓
Progress displayed: {completed} / {total} photos
    ↓
Processing completes → photos.json updated
    ↓
New photos appear in gallery
```

#### Key Features

- **Batch Processing**: Multiple photos processed together for efficiency
- **Progress Tracking**: Real-time upload and processing progress
- **Error Resilience**: Individual photo errors don't stop batch processing
- **Manual Control**: Admin controls when processing starts
- **Cleanup Tools**: Failed batches can be cleaned up manually
- **Duplicate Prevention**: Already-processed photos are skipped

### Message Flow

1. Admin selects a photo from the gallery or uploads a new photo as part of composing a message
2. Admin enters message text (character limit: 280)
3. Admin submits; app calls `sendMessage` Cloud Function
4. Message appears in message history
5. Device detects new message on next poll and illuminates LED

---

## GPIO Service

A Python application running as a systemd service on the Raspberry Pi. Bridges physical hardware and the browser application via WebSocket.

### Dependencies

- `gpiozero` — GPIO control (uses lgpio pin factory when available)
- `adafruit-circuitpython-ads1x15` — ADS1115 ADC control (optional)
- `websockets` — WebSocket server
- Standard library modules (asyncio, threading, json, logging)

### Service Responsibilities

1. Monitor physical button and switch states (GPIO 18, 22, 27)
2. Read potentiometer value from ADS1115 ADC via I2C (GPIO 2/3, optional)
3. Control LED with PWM for fading effects (GPIO 17)
4. Broadcast state changes and analog values to connected WebSocket clients
5. Accept commands from WebSocket clients to control LED state and fade
6. Send initial states to newly connected clients
7. Handle multiple concurrent WebSocket connections

### GPIO Pin Configuration

- **LED (GPIO 17)**: PWM output for message indicator (LED contacts of LED push button). Supports fade in/out animation when message is waiting. Built-in 200Ω resistor, no external resistor needed.
- **Select/Message Button (GPIO 18)**: Momentary button with pull-up resistor (active LOW). Button switch contacts of LED push button. Context-dependent: shows message in Slideshow Mode, sets boundary filter in Map View.
- **Metadata Toggle (GPIO 22)**: SPDT switch with pull-up resistor (active LOW)
- **Map Toggle (GPIO 27)**: SPDT switch with pull-up resistor (active LOW). Tracks state and sends ON/OFF values.
- **ADS1115 ADC (I2C)**: Optional. Reads potentiometer on channel A0 at address 0x48.

### ADC Reading

The GPIO service continuously reads the potentiometer value from ADS1115 channel A0 at 10Hz (100ms intervals) in a background thread. When the value changes by more than 2% of full range, a `ZOOM_DIAL` event is broadcast with normalized zoom value (0.0 to 1.0). The device application maps this to Mapbox zoom levels (1 to 11).

### LED Fade Control

The LED supports two modes:
- **Static**: ON (full brightness) or OFF (extinguished)
- **Fade**: Continuous fade in/out animation (2-second cycle) when `MESSAGE_WAITING` event is received

The fade runs in a separate background thread and can be stopped by sending `MESSAGE_READ` event or `LED` command with value 'OFF'.

### WebSocket Protocol

**Server**: `ws://localhost:8765`

**Inbound Messages (Browser → GPIO Service):**
- `{"type": "LED", "value": "ON" | "OFF"}` - Control LED state
- `{"type": "MESSAGE_WAITING", "value": true}` - Start LED fade
- `{"type": "MESSAGE_READ"}` - Stop LED fade

**Outbound Messages (GPIO Service → Browser):**
- `{"type": "MAP_TOGGLE", "value": "ON" | "OFF"}` - Map switch state change
- `{"type": "METADATA_TOGGLE"}` - Metadata switch toggled
- `{"type": "SELECT_BUTTON"}` - Select/Message button pressed
- `{"type": "ZOOM_DIAL", "value": 0.0-1.0}` - Potentiometer value changed

**Connection Handling:**
- Supports multiple concurrent clients
- Sends initial states (MAP_TOGGLE, ZOOM_DIAL) to newly connected clients
- Gracefully handles client disconnections

### Process Management

The GPIO service runs as a systemd unit that starts on boot before the browser launches. The setup script (`setup.sh`) can automatically generate and install the service file.

**Service File Location:** `/etc/systemd/system/photoportal-gpio.service`

**Service Management:**
- Start: `sudo systemctl start photoportal-gpio.service`
- Stop: `sudo systemctl stop photoportal-gpio.service`
- Restart: `sudo systemctl restart photoportal-gpio.service`
- Status: `sudo systemctl status photoportal-gpio.service`
- Logs: `sudo journalctl -u photoportal-gpio.service -f`

The service automatically restarts on failure (Restart=always) with a 10-second delay.

---

## External Services

### Firebase (Google Cloud)

| Service | Purpose | Configuration Required |
| --- | --- | --- |
| Authentication | Admin login | Enable Email/Password provider |
| Hosting | Device and Admin UIs | Configure custom domains |
| Cloud Functions | Image processing, API endpoints | Deploy functions |

### Cloud Storage (Google Cloud)

| Bucket | Purpose | Access |
| --- | --- | --- |
| `photoportal-media` | Photo storage | Private; device uses stored credentials |
| `photoportal-data` | JSON metadata | Private; device uses stored credentials |

CORS must be configured on both buckets to allow browser access from the Firebase Hosting domains.

### Mapbox

| API | Purpose | Expected Usage |
| --- | --- | --- |
| Mapbox GL JS | Map rendering in Map View | Page loads (well within 50K/month free tier) |
| Google Maps Geocoding API | Reverse geocode map center location in Map View metadata mode | One request per map center change (debounced 500ms after movement stops) |

---

## Security Model

### Admin Authentication

The Admin Portal uses Firebase Authentication with email/password. Only authenticated users can upload photos, delete photos, or send messages. Cloud Functions verify Firebase ID tokens before processing requests.

### Device Authentication

The device stores credentials locally (on the microSD card) that grant read access to Cloud Storage buckets. Options:

1. **Service Account Key:** A JSON key file for a service account with Storage Object Viewer role on both buckets.
2. **API Key with Restrictions:** A Google Cloud API key restricted to Cloud Storage APIs and specific bucket access.

The service account key approach is recommended for simplicity. The key is stored at `/home/pi/photoportal/credentials.json` and loaded by the device application on startup.

### Network Security

All communication uses HTTPS. The local WebSocket connection between browser and GPIO service runs on localhost only and is not exposed to the network.

---

## Deployment

### Initial Setup

1. Create Firebase project
2. Enable Authentication, Hosting, and Functions
3. Create Cloud Storage buckets with appropriate IAM permissions
4. Configure custom domains in Firebase Hosting
5. Deploy Cloud Functions
6. Build and deploy Admin Portal
7. Build and deploy Device Application
8. Create Mapbox account and obtain access token
9. Set up Raspberry Pi with OS, configure GPIO service
10. Store Cloud Storage credentials and Mapbox token on device
11. Configure Chromium to launch in kiosk mode on boot

### Ongoing Updates

**Application Updates:** Run `firebase deploy --only hosting` to push new versions of Device or Admin applications. Device picks up changes on next browser refresh (or automatic reload triggered by service worker update).

**Function Updates:** Run `firebase deploy --only functions` to update Cloud Functions.

**No device-side deployment is required** for UI changes. The GPIO service rarely needs updates; when it does, SSH access to the Pi is required.

---

## Future Enhancements (P1/P2)

### P1: Share to Phone

Allow viewer to share current photo to their phone. Implementation options:

- **QR Code:** Display QR code on screen linking to a temporary signed URL for the photo
- **Local Network:** Device hosts a simple web server; phone connects to same WiFi and downloads

### P2: Multi-Device / Multi-Admin

- Add device registration flow
- Modify Cloud Functions to scope photos and messages by device ID
- Add admin-to-device assignment in Firebase

### P2: Route View

- Cluster photos by capture time and location proximity
- Draw polylines between clusters on map
- Requires additional metadata processing in `processBatches` function