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
| Liking | User can “Like” a photo using physical button on device. Likes are stored locally on the device as a list of “liked” photo IDs. | P0 |
| Photo Variation | Photos are displayed randomly. Order always changes. Liked photos are displayed more frequently. | P0 |
| Photo Fill | Photos fill available space and are centered | P0 |
| Metadata | Viewer can toggle on meta-data view over the photo to view time, date, and location of the photo. Location is mapped to name using API service and Lat/Lon coordinates. Location names are cached to avoid subsequent look-ups. | P0 |
| Message Receipt | When a message is sent, a physical indicator light illuminates on the device. The Viewer presses a physical button to see the message. Upon viewing the message, the indicator light is extinguished. Photo in message is not part of slideshow until message is read. | P0 |
| Past Messages | The Viewer can access a list of past messages on the device by ingress-ing through an on-screen UI element. | P1 |

## Photo Filtering

| Title | Description | Priority |
| --- | --- | --- |
| Map View | Viewer can toggle Map View with switch. Displays map of world with markers for location of every photo. | P0 |
| Map Navigation | Viewer can pinch, zoom, and pan around the map for greater detail. | P0 |
| Location Filter | Viewer can set a map view as a filter to display photos from region on screen. Filter stays active until user changes/resets it, or for 12 hours. | P0 |
| Filter Reset | Viewer can reset/remove the photo filter to default back to world-wide photos. | P0 |
| Non-geo-tagged Photos | Photos without location meta-data are not shown on map. | P0 |
| Route View | Viewer can toggle on route between photo pins. Created automatically between pins in close physical proximity taken within 24 hours of each other. | P1 |

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
| Message Indicator | A physical light embedded in the frame indicates that a message has been received. When there are no un-read messages, the light extinguishes. | P0 |
| Message Access | A physical button (perhaps physically integrated with the indicator light) that can be pressed to view an un-read message. If pressed without a new message available, the most recent message is shown. | P0 |
| Map Toggle Switch | A physical switch toggles the device between Slideshow and Map View. | P0 |
| Metadata Switch | A physical switch toggles on a meta-data overlay. In Slideshow mode the meta-data is time/date/location of photo. On Map View it is metadata related to the current view of the map (lat/long bounding box, # of photos in frame, etc) | P0 |
| “Like”/”Select” Button | A physical button can be pressed to like or unlike a photo in Slideshow mode. In MapView the select button is used to set the geo-filter. | P0 |
| On/Off Switch | A physical switch on the back of the device powers the entire device on/off. | P0 |
| Zoom Potentiometer | A physical potentiometer (rotary knob) controls map zoom level in Map View. Routed through ADS1115 16-bit ADC via I2C. Disabled in Slideshow mode. | P0 |
| Virtual Hardware Overlay | When the device UI has focus and the user presses the <code>v</code> key on a connected keyboard, an on-screen overlay appears with virtual controls that mirror the physical interface (message indicator, like button, map toggle, metadata toggle, message button, and zoom slider). Interacting with these virtual controls sends the same events into the app as the corresponding GPIO inputs. | P0 |

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
│  ┌─────────────────┐     │  processUpload  - resize, extract EXIF, │    │
│  │     Mapbox      │     │                   geocode, thumbnail    │    │
│  │                 │     │  deletePhoto    - remove files + update │    │
│  │ GL JS (maps)    │     │  sendMessage    - append to messages    │    │
│  │ Geocoding API   │     │  rebuildIndex   - regenerate photos.json│    │
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

| Subdomain | Service | Purpose |
| --- | --- | --- |
| `device.photoportal.alexhadik.com` | Firebase Hosting | Device React application |
| `admin.photoportal.alexhadik.com` | Firebase Hosting | Admin React application |

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
| ADC | ADS1115 16-Bit ADC (I2C interface) |
| Potentiometer | 10kΩ rotary potentiometer |

### Hardware Wiring

**GPIO Pin Assignments:**

| GPIO Pin | Direction | Component | Description |
| --- | --- | --- | --- |
| 17 | Output | LED | Message indicator light |
| 18 | Input | Button | Like button (momentary, pull-up) |
| 27 | Input | Switch | Map view toggle (SPDT, pull-up) |
| 22 | Input | Switch | Metadata overlay toggle (SPDT, pull-up) |
| 23 | Input | Button | Message view button (momentary, pull-up) |
| 2 | I2C | ADS1115 | SDA (I2C data) |
| 3 | I2C | ADS1115 | SCL (I2C clock) |

**I2C Device Addresses:**

| Device | I2C Address | Channel | Purpose |
| --- | --- | --- | --- |
| ADS1115 | 0x48 (default) | A0 | Potentiometer wiper (zoom control) |

**Circuit Diagrams:**

LED Circuit:

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
2. systemd starts the GPIO Python service
3. systemd starts Chromium in kiosk mode, loading the device application URL
4. Device application initializes, connects to GPIO service via WebSocket
5. If no WiFi connection, device displays WiFi configuration UI
6. Once connected, device syncs photos and begins slideshow

---

## Cloud Storage Structure

### **photoportal-media bucket**

```
photoportal-media/
├── uploads/                    # Temporary upload location
│   └── {uuid}.jpg             # Raw uploads from admin
├── photos/                     # Processed display images
│   └── {photo-id}.jpg         # Resized to max 2048px
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
      "width": 2048,
      "height": 1536,
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

All functions run on Cloud Functions for Firebase (2nd generation).

### **processUpload**

| Property | Value |
| --- | --- |
| Trigger | Cloud Storage finalize on `photoportal-media/uploads/` |
| Runtime | Node.js 20 or Python 3.11 |
| Memory | 1GB (for image processing) |
| Timeout | 120 seconds |

**Processing Steps:**

1. Download uploaded image from `/uploads/`
2. Extract EXIF metadata (capture timestamp, GPS coordinates, orientation)
3. Correct image orientation based on EXIF orientation tag
4. Resize image to fit within 2048×2048 pixels, preserving aspect ratio
5. Generate 400px-wide thumbnail
6. If GPS coordinates present, call Mapbox Geocoding API for place name
7. Upload processed image to `/photos/{photo-id}.jpg`
8. Upload thumbnail to `/thumbs/{photo-id}.jpg`
9. Read current `photos.json`, append new photo entry, write back
10. Delete original from `/uploads/`

### deletePhoto

| Property | Value |
| --- | --- |
| Trigger | HTTP POST (authenticated) |
| Input | `{ "photoId": "a1b2c3d4" }` |

**Processing Steps:**

1. Verify Firebase Auth token
2. Delete `/photos/{photoId}.jpg` and `/thumbs/{photoId}.jpg`
3. Read `photos.json`, remove entry with matching ID, write back
4. Read `messages.json`, remove any messages with matching `photoId`, write back

### sendMessage

| Property | Value |
| --- | --- |
| Trigger | HTTP POST (authenticated) |
| Input | `{ "photoId": "a1b2c3d4", "text": "Message content" }` |

**Processing Steps:**

1. Verify Firebase Auth token
2. Verify `photoId` exists in `photos.json`
3. Generate unique message ID
4. Append message to `messages.json`

### rebuildIndex

| Property | Value |
| --- | --- |
| Trigger | HTTP POST (authenticated, manual invocation) |

**Purpose:** Utility function to regenerate `photos.json` by scanning the `/photos/` directory. Used for recovery if JSON becomes corrupted or out of sync.

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
│   │   ├── Slideshow.tsx           # Main slideshow view
│   │   ├── PhotoDisplay.tsx        # Single/dual photo renderer
│   │   ├── MetadataOverlay.tsx     # Time/date/location overlay
│   │   ├── MapView.tsx             # Mapbox map with photo markers
│   │   ├── RegionFilter.tsx        # Map region selection UI
│   │   ├── MessageViewer.tsx       # Full-screen message display
│   │   ├── MessageHistory.tsx      # Past messages list
│   │   ├── WifiConfig.tsx          # WiFi setup screen
│   │   └── OfflineIndicator.tsx    # No-internet icon
│   ├── hooks/
│   │   ├── usePhotoSync.ts         # Polling and caching logic
│   │   ├── useMessages.ts          # Message state and unread tracking
│   │   ├── useGPIO.ts              # WebSocket to GPIO service
│   │   ├── useLikes.ts             # Like state persistence
│   │   └── useSlideshow.ts         # Photo selection and timing
│   ├── services/
│   │   ├── api.ts                  # Fetch photos.json, messages.json
│   │   ├── cache.ts                # IndexedDB operations
│   │   └── photoSelection.ts       # Weighted random selection
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts

```

### View States

The device application has three primary view states controlled by physical switches and on-screen UI:

```
                    ┌─────────────────┐
                    │                 │
        ┌───────────│   SLIDESHOW    │◄──────────┐
        │           │                 │           │
        │           └────────┬────────┘           │
        │                    │                    │
        │ Map Toggle         │ Message Button     │ On-screen UI
        │ Switch ON          │ (unread exists)    │ "Past Messages"
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│               │   │               │   │               │
│   MAP VIEW    │   │   MESSAGE     │   │   MESSAGE     │
│               │   │   VIEWER      │   │   HISTORY     │
│               │   │               │   │               │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        │ Map Toggle        │ Dismiss           │ Back button
        │ Switch OFF        │ (tap/timeout)     │
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                            ▼
                      SLIDESHOW

```

### Caching Strategy

Photos are cached locally in IndexedDB for offline viewing and fast rendering.

**Initial Sync:**

1. Fetch `photos.json`
2. Compare with locally cached photo IDs
3. Download all thumbnails (fast, ~50KB each)
4. Download full-resolution photos in background

**Ongoing Sync:**

1. Every 60 seconds, check `photos.json` for updates (HEAD request, compare ETag)
2. If changed, download new JSON and queue new photos for download
3. Every 30 seconds, check `messages.json` for updates
4. If unread messages exist, signal GPIO service to illuminate LED

**Cache Limits:** When local storage exceeds 80% capacity, evict least-recently-displayed photos (keeping liked photos longer).

**Offline Mode:** When network is unavailable, display cached content. Show small offline indicator icon in corner of screen.

### GPIO Integration

The device application must also support a **virtual hardware overlay** for local debugging and testing. When the device UI has focus and the user presses the `v` key on a connected keyboard, an on-screen overlay appears with virtual controls that mirror the physical interface (message indicator, like button, map toggle, metadata toggle, and message button). Interacting with these virtual controls sends the same events into the app as the corresponding GPIO inputs.

The device application communicates with physical hardware through a WebSocket connection to a local Python service.

**Inbound Events (GPIO → Browser):**

| Event | Trigger | App Response |
| --- | --- | --- |
| `LIKE_BUTTON` | Like button pressed | Toggle like state on current photo |
| `MAP_TOGGLE` | Map switch changed | Switch between Slideshow and Map View |
| `METADATA_TOGGLE` | Metadata switch changed | Show/hide metadata overlay |
| `MESSAGE_BUTTON` | Message button pressed | Display oldest unread message |
| `ZOOM_CHANGE` | Potentiometer rotated | Update map zoom level (Map View only) |

**Outbound Commands (Browser → GPIO):**

| Command | Trigger | Hardware Response |
| --- | --- | --- |
| `LED_ON` | Unread message exists | Illuminate message indicator LED |
| `LED_OFF` | All messages read | Extinguish LED |

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

1. Admin selects one or more photos via file picker or drag-and-drop
2. For each photo, generate a UUID and upload to `photoportal-media/uploads/{uuid}.jpg`
3. Cloud Function `processUpload` triggers automatically
4. Admin UI polls `photos.json` to confirm processing complete
5. New photos appear in gallery

### Message Flow

1. Admin selects a photo from the gallery or uploads a new photo as part of composing a message
2. Admin enters message text (character limit: 280)
3. Admin submits; app calls `sendMessage` Cloud Function
4. Message appears in message history
5. Device detects new message on next poll and illuminates LED

---

## GPIO Service

A Python application running as a systemd service on the Raspberry Pi. Bridges physical hardware and the browser application.

### Dependencies

- `gpiozero` — GPIO control
- `adafruit-circuitpython-ads1x15` — ADS1115 ADC control
- `websockets` — WebSocket server
- Standard library for NetworkManager integration (subprocess calls to `nmcli`)

### Service Responsibilities

1. Monitor physical button and switch states
2. Read potentiometer value from ADS1115 ADC via I2C
3. Broadcast state changes and analog values to connected WebSocket clients
4. Accept commands from WebSocket clients to control LED
5. Expose WiFi scanning and connection functionality for setup UI

### ADC Reading

The GPIO service continuously reads the potentiometer value from ADS1115 channel A0 at 10Hz. When the value changes by more than 2% of full range, a `ZOOM_CHANGE` event is broadcast with normalized zoom value (0.0 to 1.0). The device application maps this to Mapbox zoom levels (e.g., 2 to 18).

### Process Management

The GPIO service runs as a systemd unit that starts on boot before the browser launches.

```
# /etc/systemd/system/photoportal-gpio.service
[Unit]
Description=Photo Portal GPIO Service
After=network.target

[Service]
ExecStart=/usr/bin/python3 /home/pi/photoportal/gpio_service.py
Restart=always
User=pi

[Install]
WantedBy=multi-user.target

```

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
| Geocoding API | Reverse geocode photo locations | One request per unique photo location |

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
- Requires additional metadata processing in `processUpload` function