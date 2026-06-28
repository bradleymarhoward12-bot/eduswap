PR Title: feat(ui): UI/UX refactor — Button loading, per-item save feedback, chat/listing feedback, savedItems rules

Summary

- Standardize `Button` with a `loading` prop and accessible busy state.
- Wire `loading` across high-impact paths: listing publish, chat send, per-item save.
- Add per-item save-loading state in Marketplace to prevent duplicate saves and show visual feedback.
- Ensure `ItemCard` respects owner role (hides Save/Message) and stops event propagation from action buttons.
- Fix `ItemDetail` related `ItemGrid` to receive `currentUserId` ensuring owner logic applies.
- Add `savedItems` Firestore rules to secure saved item writes/reads to owners.

Files changed (high level)

- src/components/ui/button.tsx — add `loading` prop, `aria-busy`, disabled handling
- src/components/chat/ChatWindow.tsx — add send loading state and wire to Button
- src/components/dashboard/seller/ListingForm.tsx — wire `isUploading` to Button loading
- src/components/marketplace/ItemCard.tsx — add `isSaving` prop and use Button `loading`
- src/components/marketplace/ItemGrid.tsx — pass `isSaving` into ItemCard
- src/pages/protected/Marketplace.tsx — track `savingListingIds`, set per-item saving state; pass to ItemGrid
- src/pages/protected/ItemDetail.tsx — pass `currentUserId` to related `ItemGrid`
- src/components/marketplace/ItemCard.tsx — ensure `isOwner` prop included in destructure
- firestore.rules — add `savedItems` rules block

How to commit & push (recommended)

1. Create a working branch and commit changes locally:

```bash
# from repo root
git checkout -b ui/refactor-button-loading
git add -A
git commit -m "feat(ui): standardize Button loading; per-item save loading; chat/listing feedback; savedItems rules; owner UI fixes"
```

2. Push and open PR:

```bash
git push -u origin ui/refactor-button-loading
# Open a PR in GitHub/GitLab with the title and summary above; assign reviewers
```

Testing & QA checklist

- Listing publish flow: submit listing with images, ensure publish button shows loading and form is disabled while uploading.
- Marketplace save flow: click heart rapidly; ensure button shows loading and duplicate writes are prevented; saved state persists after refresh.
- Marketplace message: message button opens chat modal (no navigation), chat input prefills with listing context; send button shows loading while message is sent.
- ItemCard: action buttons should not trigger card navigation; owners should not see Save/Message buttons.
- Firestore rules: verify `savedItems` create/read/delete allowed only for doc owner.

Notes

- I could not run git commands in this environment (git tool error). Commit/push should be run locally or in CI where credentials/remotes are available.
- I can prepare an actual patch (`git format-patch` / diff) if you prefer — tell me if you want me to generate a unified diff file in the repo instead of the above instructions.

If you'd like, I can also:

- Add a small spinner inside `Button` when `loading` is true.
- Wire `loading` to other async UI flows (auth modal, tutor profile save, tutor request), and add unit/integration tests.
