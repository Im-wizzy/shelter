# Shelter - Full Website (Admin + Public Site)

Shelter is a website for selling and renting houses. It has two sides:

- **Public site** (`/`) - anyone can browse houses for sale, for rent, or
  for short stays, filter by category and location, and view full details
  including the owner's contact information. **No login required.**
- **Admin dashboard** (`/admin`, login required) - upload, edit, hide, or
  delete house listings and their photos.

Listing data is stored permanently in **MongoDB Atlas** (a free cloud
database), and house photos are stored permanently in **Cloudinary** (a
free image hosting service). This means your data survives server
restarts, even on free hosting platforms like Render whose local disk is
temporary.

---

## 1. Prerequisites

- [Node.js](https://nodejs.org/) version 18 or later (includes npm).
  Check with:
  ```
  node -v
  npm -v
  ```
- A free **MongoDB Atlas** account (database) - sign up at
  [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
- A free **Cloudinary** account (photo storage) - sign up at
  [cloudinary.com](https://cloudinary.com)

If you haven't set these up yet, see **Section 3** below for step-by-step
instructions before continuing.

---

## 2. Install dependencies

From the project folder, run:

```bash
npm install
```

This installs:
- `express` - the web server
- `express-session` - keeps the admin logged in
- `bcryptjs` - securely hashes the admin password
- `multer` - handles photo uploads (in memory, then forwarded to Cloudinary)
- `mongoose` - connects to and queries MongoDB
- `cloudinary` - uploads/deletes photos on Cloudinary
- `dotenv` - loads settings from a `.env` file

---

## 3. Create your `.env` file

Copy the example file:

```bash
cp .env.example .env
```

Open `.env` in a text editor. You need to fill in:

```
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=
SESSION_SECRET=please_change_this_to_a_long_random_string
MONGODB_URI=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 3a. Choose your admin username
Set `ADMIN_USERNAME` to whatever you'd like (e.g. `shelteradmin`).

### 3b. Generate your admin password hash
For security, your password is never stored as plain text. Generate a
hash by running:

```bash
npm run hash -- "YourStrongPasswordHere"
```

This prints something like:

```
ADMIN_PASSWORD_HASH=$2a$10$abc123...........................
```

Copy that whole line into your `.env` file (replacing the empty
`ADMIN_PASSWORD_HASH=` line).

### 3c. Set a session secret
This is just a long random string used to keep login sessions secure.
You can generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the result as the value of `SESSION_SECRET`.

### 3d. Set up MongoDB Atlas (stores your listings permanently)

1. Sign up free at [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. Create a new project (any name, e.g. "Shelter")
3. Create a cluster: choose the **M0 Free** tier, pick any region, click
   **Create**
4. **Create a database user:** you'll be prompted to set a username and
   password - save these somewhere safe (this is separate from your
   Shelter admin login)
5. **Allow network access:** go to **Network Access** in the sidebar →
   **+ Add IP Address** → **Allow Access From Anywhere** → **Confirm**
   (needed because hosting platforms like Render don't have a fixed IP)
6. **Get your connection string:** go to **Database** → click **Connect**
   on your cluster → **Drivers** → copy the connection string shown. It
   looks like:
   ```
   mongodb+srv://yourusername:<db_password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0
   ```
7. Replace `<db_password>` (including the `<` and `>`) with your actual
   database user password, and add `shelter` as the database name right
   after `.net/`:
   ```
   mongodb+srv://yourusername:YourActualPassword@cluster0.xxxxx.mongodb.net/shelter?appName=Cluster0
   ```
8. Paste this as the value of `MONGODB_URI` in your `.env` file.

   **Note:** if your database password contains special characters like
   `@ # % / :`, the connection may fail. If that happens, go to
   **Database Access** in Atlas, edit your user, and set a new password
   using only letters and numbers.

### 3e. Set up Cloudinary (stores your photos permanently)

1. Sign up free at [cloudinary.com](https://cloudinary.com)
2. On your **Dashboard**, find the **"Product Environment Credentials"**
   section. You'll see:
   - **Cloud Name**
   - **API Key**
   - **API Secret** (click the eye icon to reveal it)
3. Copy each value into the matching line in your `.env` file:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

---

## 4. Start the server

```bash
npm start
```

You should see:

```
Connected to MongoDB Atlas.
Shelter server running at http://localhost:3000
Admin login: http://localhost:3000/login.html
```

If you instead see a connection error, double-check your `MONGODB_URI`
in `.env` - see the Troubleshooting section below.

---

## 5. Using the public site

Open **http://localhost:3000/** in your browser. Visitors can:

- Switch between **All / For Sale / For Rent / Short Stay** using the
  tabs at the top.
- Filter by **Location** using the dropdown (built automatically from
  whatever locations exist in your listings).
- Click **"Clear filters"** to reset both filters.
- Click any house card to open a detail view with the full photo
  gallery, description, bedrooms/bathrooms/size, and buttons to
  **Call**, **WhatsApp**, or **Email** the owner directly.

Only listings you have NOT hidden in the admin dashboard appear here.

---

## 6. Log in to the admin dashboard

1. Open **http://localhost:3000/login.html** in your browser.
2. Enter the username and password you set up in step 3.
3. You'll be taken to the dashboard at **http://localhost:3000/admin**.

If you ever close the tab, just go back to `/login.html` to sign in again.
Sessions last 8 hours, after which you'll need to log in again.

---

## 7. Using the admin dashboard

### Add a new listing
1. Click **"+ Add new listing"**.
2. Fill in the house title, category (For Sale / For Rent / Short Stay),
   price, location, bedrooms/bathrooms/size, and a description.
3. Fill in the owner's contact information (name, phone, email, WhatsApp).
   This is what site visitors will use to get in touch about the house.
4. Upload one or more photos by clicking the upload box or dragging
   photos onto it. **The first photo becomes the cover photo** shown on
   listing cards.
5. Click **"Save listing"**.

### Edit a listing
- From the dashboard, click **"Edit"** on any listing card.
- You can change any field, upload more photos, delete individual
  photos, or click **"Make cover"** on a photo to make it the new cover.

### Hide / Show a listing
- Click **"Hide"** on a listing card to remove it from the public site
  without deleting it. Click **"Show"** to bring it back.
- Hidden listings appear faded on the dashboard with a "Hidden" badge,
  and can be filtered using the **Hidden** tab.

### Delete a listing
- Click **"Delete"** and confirm. This permanently removes the listing
  and all of its photos.

---

## 8. Project structure

```
shelter/
├── server.js                 # Main server file - start here
├── .env                       # Your secret settings (you create this)
├── .env.example               # Template for .env
├── package.json
│
├── config/
│   ├── database.js            # Connects to MongoDB Atlas
│   └── cloudinary.js          # Connects to Cloudinary + handles photo uploads
│
├── models/
│   └── House.js               # MongoDB schema for a house listing
│
├── middleware/
│   └── auth.js                # Protects admin pages & API routes
│
├── routes/
│   ├── auth.js                # Login / logout / session check
│   ├── admin-houses.js        # Admin CRUD API (protected)
│   └── houses.js              # Public read-only API (for visitors)
│
├── scripts/
│   └── generate-hash.js       # Helper to create your password hash
│
├── admin-views/                # Admin HTML pages (NOT public - protected
│   │                             by middleware/auth.js)
│   ├── dashboard.html         # Listings overview
│   ├── listing-form.html      # Add / edit listing form
│   └── assets/
│       ├── admin.css
│       ├── dashboard.js
│       └── listing-form.js
│
└── public/                      # Everything here is publicly accessible
    ├── index.html              # Public homepage (browse & filter houses)
    ├── login.html              # Admin login page
    ├── css/
    │   ├── style.css           # Shared design tokens (colors, fonts, buttons)
    │   └── site.css            # Public site layout (header, cards, modal)
    └── js/
        ├── login.js
        └── site.js             # Public site behaviour (filters, modal)
```

Note: house photos are no longer stored as files in this project at
all - they live entirely on Cloudinary and are linked to by URL.

---

## 9. How data is stored

- **Listings** (title, price, location, owner info, etc.) are stored as
  documents in your **MongoDB Atlas** database, in a collection called
  `houses`.
- **Photos** are uploaded directly to **Cloudinary** when you add/edit a
  listing. Each house's photos live in their own folder on Cloudinary
  (`shelter/houses/<house-id>/`), and only the photo's URL and Cloudinary
  ID are saved in MongoDB.

Both services have generous free tiers and keep your data permanently -
nothing is lost when your hosting platform restarts the server.

---

## 10. Deploying to Render (free hosting)

1. Push your project to a GitHub repository (don't worry - `.env` is
   excluded automatically via `.gitignore`, so your secrets stay private).
2. Sign up free at [render.com](https://render.com)
3. **New +** → **Web Service** → connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Under **Environment**, add each variable from your local `.env`
   (except `PORT`, which Render sets automatically):
   ```
   ADMIN_USERNAME
   ADMIN_PASSWORD_HASH
   SESSION_SECRET
   MONGODB_URI
   CLOUDINARY_CLOUD_NAME
   CLOUDINARY_API_KEY
   CLOUDINARY_API_SECRET
   ```
6. Click **Create Web Service**. After a few minutes you'll get a live
   URL like `https://shelter-xxxx.onrender.com`.

Because listings and photos are now stored in MongoDB Atlas and
Cloudinary (not on Render's disk), **your data will persist** even when
the free-tier service restarts after periods of inactivity. The only
free-tier quirk to expect is that the site may take 30-60 seconds to
"wake up" on the first visit after a period of no traffic.

- Public site: `https://your-app.onrender.com`
- Admin login: `https://your-app.onrender.com/login.html`

---

## 11. Customizing the site

- **Currency symbol**: Both `public/js/site.js` and
  `admin-views/assets/dashboard.js` have a line near the top:
  ```js
  const CURRENCY_SYMBOL = 'GH\u20B5'; // Ghanaian Cedi (GH₵)
  ```
  Change this in **both files** if you want a different currency symbol
  (e.g. `'$'`, `'\u20A6'` for Naira, etc.).

- **Company name / branding**: The "Shelter" name and logo mark appear in
  `public/index.html`, `public/login.html`, and the admin pages. The logo
  is a simple inline SVG (a roof outline) styled with the
  `--color-primary` variable in `public/css/style.css` - update colors,
  fonts, or the SVG itself there.

- **Colors and fonts**: All colors and fonts are defined as CSS variables
  at the top of `public/css/style.css` (e.g. `--color-primary`,
  `--font-display`). Changing them there updates the whole site
  consistently.

---

## 12. Troubleshooting

- **"Admin account is not configured" when logging in**: Make sure
  `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` are both set in your `.env`
  file, and that you restarted the server after editing `.env`.

- **Server won't start / "Could not connect to any servers in your
  MongoDB Atlas cluster"**: 
  - Double check `MONGODB_URI` in `.env` has your real password in place
    of `<db_password>`, with no `< >` characters left in.
  - In MongoDB Atlas, go to **Network Access** and confirm there's an
    entry for `0.0.0.0/0` ("Allow access from anywhere") with status
    **Active**.
  - If your database password has special characters (`@ # % / :`),
    reset it in **Database Access** to something using only letters and
    numbers.

- **Photo uploads fail / "Could not create listing"**: Double-check
  `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
  `CLOUDINARY_API_SECRET` in `.env` match exactly what's shown on your
  Cloudinary Dashboard.

- **Photos don't show up on the public site**: Make sure the listing is
  not marked "Hidden" in the admin dashboard, and that you uploaded at
  least one photo when creating it.

- **Port already in use**: Change `PORT=3000` in `.env` to another port
  (e.g. `3001`), then restart with `npm start`.
