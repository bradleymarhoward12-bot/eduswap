# Deployment

## Required environment variables

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

## Firebase setup

- Enable Authentication with email/password.
- Enable Firestore.
- Deploy `firestore.rules` and `firestore.indexes.json`.
- Build the app with `npm run build`.
- Deploy Hosting with Firebase Hosting or any static host pointed at `dist/`.

## Seed data

- Set `FIREBASE_SERVICE_ACCOUNT_JSON` to a Firebase service account JSON string, or authenticate ADC locally.
- Run `npm run seed:firestore`.

## Notes

- Listings and tutors are publicly readable.
- Chat, notifications, interests, and user profiles are user-scoped.
- Cloudinary uses unsigned uploads through `ListingForm` and `TutorProfileForm`.
