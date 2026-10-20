# STUDIA — სასწავლო პლატფორმა

პრემიუმ შავი/ოქროსფერი სასწავლო ვებსაიტი. მოიცავს რეგისტრაციას, ავტორიზაციას, ადმინისტრატორის პანელს, სასწავლო მასალების ატვირთვასა და პირადი ჩანაწერების შექმნას.

## არქიტექტურა

GitHub Pages მასპინძლობს ვებსაიტის ფაილებს, ხოლო უსაფრთხო შესვლა, მონაცემთა ბაზა და ფაილების საცავი მუშაობს Supabase-ზე.

## 1. შექმენი Supabase პროექტი

1. გახსენი https://supabase.com და შექმენი ახალი პროექტი.
2. პროექტის Dashboard-ში გახსენი **SQL Editor → New query**.
3. ჩასვი და გაუშვი `supabase/schema.sql` ფაილის მთელი შიგთავსი.
4. შედი **Project Settings → API**-ში და დააკოპირე Project URL და `anon`/publishable key.
5. გახსენი `app.js` და ჩაანაცვლე:
   - `https://YOUR_PROJECT_ID.supabase.co` შენი Project URL-ით;
   - `YOUR_SUPABASE_ANON_KEY` შენი public anon/publishable key-ით.
6. Supabase-ის **Authentication → URL Configuration**-ში დაამატე შენი GitHub Pages URL როგორც Site URL და Redirect URL. მაგალითად: `https://YOUR-USERNAME.github.io/studia-learning-platform/`.
7. ტესტირებისას შეგიძლია დატოვო email confirmation ჩართული — მომხმარებლებმა ელფოსტა უნდა დაადასტურონ. თუ გამორთავ, უსაფრთხოების/სპამის რისკები გაითვალისწინე.

## 2. გახდი საკუთარი ანგარიშის ადმინისტრატორი

1. გაუშვი საიტი ერთხელ და შექმენი ანგარიში შენი სახელით, გვარითა და ელფოსტით.
2. თუ ელფოსტის დადასტურება ჩართულია, დაადასტურე წერილიდან.
3. Supabase → SQL Editor-ში გაუშვი ეს მოთხოვნა და ელფოსტა ჩაანაცვლე შენი ანგარიშის ელფოსტით:

```sql
update public.profiles
set role = 'admin'
where email = 'YOUR-EMAIL@example.com';
```

4. საიტიდან გამოდი და თავიდან შედი. ახლა გამოჩნდება „ადმინის პანელი“.
5. არასოდეს მიანიჭო admin როლი მომხმარებელს, თუ არ ენდობი. როლის өөрчлөлება კეთდება მხოლოდ Supabase-ის dashboard-იდან.

## 3. Run locally

For a quick frontend preview, use a local web server rather than opening `index.html` directly:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`. Supabase URL configuration must include this local URL during development if required by your auth setup.

## 4. Publish on GitHub Pages

1. Create a **public** repository, e.g. `studia-learning-platform`.
2. Upload `index.html`, `style.css`, `app.js`, `README.md`, and the `supabase` folder. Upload extracted files/folders, not the ZIP archive.
3. Commit changes.
4. Repository → **Settings → Pages**.
5. Select **Deploy from a branch**, branch `main`, folder `/(root)`, and Save.
6. Wait for the Pages URL to become available.
7. Add the exact deployed URL to Supabase Auth URL Configuration.

## Included features

- Georgian registration form with first name, surname, email and password
- Supabase Auth session handling
- Role-based admin UI
- Private Supabase Storage bucket for course materials
- Admin-only upload/delete for PDF, TXT and Markdown files (20 MB limit)
- Search and material categories
- მომხმარებლის პირადი ჩანაწერების შექმნა, ნახვა, კოპირება და წაშლა
- Admin user list with names, emails, roles and signup dates
- Responsive layout for mobile and desktop

## Important limitations and next steps

- File formats supported by the current upload flow are PDF, TXT and Markdown. Scanned PDFs may not contain selectable text; OCR should be added if scanned notes are important.
- The admin user table shows accounts registered through this platform. It is not a visitor-tracking system and does not track anonymous visitors.
- GitHub Pages is public static hosting. Never upload secrets, private API keys, or private course files to the repository.
- A production release should add rate limiting/usage limits, stronger monitoring, file scanning, privacy notice/consent, and backups before accepting many users.


## English Academy

A separate `english.html` page with A1/A2/B1 lesson paths, vocabulary flashcards, an interactive quiz and remembered-word progress saved in this browser. Upload `english.html`, `english.css`, and `english.js` with the rest of the site.
