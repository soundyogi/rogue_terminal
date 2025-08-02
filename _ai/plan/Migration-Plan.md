# Migration Plan: Custom Store to Redux Toolkit

This document outlines the steps to migrate the roguelike engine from a custom Redux implementation to the official Redux Toolkit.

## 1. Installation
- Add `@reduxjs/toolkit` as a project dependency.

## 2. Store Refactor (`core/store.js`)
- Replace the custom `Store` class with `configureStore` from Redux Toolkit.
- The `reducer` property of `configureStore` will be an object containing all the slice reducers.
- The `middleware` property will be configured to include the existing `eventMiddleware` and the default middleware from Redux Toolkit (which includes thunk).

## 3. Slice Refactor (e.g., `core/slices/gameSlice.js`)
- For each of the 6 slices:
    - Use `createSlice` to generate the slice.
    - The `name` and `initialState` properties will remain the same.
    - The `reducers` object will be passed directly to `createSlice`. Redux Toolkit's Immer integration will handle immutable updates automatically.
    - The `actions` object will be removed, as `createSlice` automatically generates action creators.
    - The `effects` object will be removed. This logic will be converted into thunk action creators.
    - The `selectors` will be updated to work with the new state structure if needed (though it should be largely the same).

## 4. Effects to Thunks Conversion
- For each `effect` in the old slices, create a new thunk action creator.
- A thunk is a function that receives `dispatch` and `getState` as arguments.
- The logic from the `effect` will be moved into the thunk. Instead of `store.events?.emit`, the thunk will dispatch regular Redux actions.

## 5. Browser Adapter Refactor (`adapters/redux-browser.js`)
- Update the adapter to import the new `store` from `core/store.js`.
- Ensure that the `dispatch` calls in the adapter are still working correctly with the new store.

## 6. Testing
- Run the existing end-to-end tests (`bun run test:e2e`).
- Update the tests as needed to work with the new store and action creators. The core test logic should remain the same, as the application's behavior is not changing.

## 7. Cleanup
- Once the migration is complete and all tests are passing, remove the legacy files:
    - `core/game.js`
    - `core/events.js` (if it exists and is no longer needed)
    - `core/actions.js` (if it exists)
    - `core/state.js` (if it exists)

## 8. Documentation
- Update `CLAUDE.md` to accurately reflect the new architecture, removing references to the custom store and "pure Redux" and replacing them with "Redux Toolkit".
- Update any other relevant documentation.