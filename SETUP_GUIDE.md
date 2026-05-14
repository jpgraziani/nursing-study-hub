# Nursing Study Hub — GitHub Setup Guide

## One-Time Setup (Do This Once)

### Step 1 — Create the Repository

1. Go to **github.com** and log in
2. Click the **+** button in the top right → **New repository**
3. Name it: `nursing-study-hub`
4. Make sure it is set to **Public**
5. Do NOT check any of the "Initialize" options — leave them all unchecked
6. Click **Create repository**

---

### Step 2 — Upload the Files

1. On the new empty repository page, click **uploading an existing file**
2. Drag and drop ALL of these files and folders from the zip:
   - `index.html`
   - `site.css`
   - `site.js`
   - The entire `data/` folder (with all the `.json` files inside it)
3. Scroll down and click **Commit changes**

---

### Step 3 — Turn On GitHub Pages

1. In your repository, click **Settings** (top menu bar)
2. In the left sidebar, click **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Under **Branch**, select **main** and **/ (root)**
5. Click **Save**
6. Wait about 60 seconds, then refresh the page
7. You will see a green banner with your site URL:
   `https://YOUR-USERNAME.github.io/nursing-study-hub`

**Your site is live.** Bookmark that URL on your phone.

---

## Adding New Content (Do This Every Time Claude Gives You a New Quiz)

### Step 1 — Upload the new quiz JSON file

1. Go to your repository on github.com
2. Click into the **data** folder
3. Click **Add file** → **Upload files**
4. Drag in the new `.json` file Claude gave you (e.g., `psych2_mod1_quiz.json`)
5. Click **Commit changes**

---

### Step 2 — Update manifest.json

1. Still in the **data** folder, click on **manifest.json**
2. Click the **pencil icon** (Edit) in the top right
3. Find the `"content": [` section
4. Add a new entry at the end of the list, before the closing `]`

Claude will give you the exact entry to paste in. It looks like this:

```json
    ,{
      "id": "psych-mod1-full",
      "file": "psych2_mod1_quiz.json",
      "class": "psych",
      "module": 1,
      "type": "quiz",
      "title": "Module 1 — Full Coverage Quiz",
      "description": "50-question quiz covering all Module 1 content",
      "topics": ["mental status", "anxiety", "therapeutic communication"],
      "questionCount": 50,
      "tags": ["NCLEX", "Module 1", "full coverage"]
    }
```

5. Click **Commit changes**

**Your site updates automatically within 60 seconds.**

---

## Adding a New Class

If you are starting a new class, Claude will update the manifest for you.
You just need to add one entry to the `"classes": [` section in manifest.json:

```json
    ,{
      "id": "psych",
      "name": "Psychology 2",
      "code": "PSY 202",
      "color": "#4A1570",
      "accent": "#A855F7",
      "icon": "🧠",
      "term": "Summer 2026"
    }
```

After that, any quiz file you upload that has `"class": "psych"` will automatically appear under that class in the navigation. No other steps needed.

---

## Troubleshooting

**Site not updating after I upload a file?**
Wait 60–90 seconds and hard refresh the page (on iPhone: hold the reload button and tap "Reload Without Content Blockers").

**I see a 404 page when visiting my URL?**
Go to Settings → Pages and make sure the source branch is set to `main` and the folder is `/ (root)`.

**Search is not finding anything?**
Make sure the JSON file is in the `data/` folder (not a subfolder inside data) and that you added the entry to `manifest.json`.

**Quiz won't load on my phone?**
Make sure you are visiting the `github.io` URL, not opening the file directly from your phone's files app. The site must be served from GitHub Pages.

---

## Your Site URL

```
https://YOUR-GITHUB-USERNAME.github.io/nursing-study-hub
```

Replace `YOUR-GITHUB-USERNAME` with your actual GitHub username.
