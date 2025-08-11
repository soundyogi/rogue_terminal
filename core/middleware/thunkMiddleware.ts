/**
 * Redux-style Thunk Middleware
 * Allows action creators to return functions (thunks) instead of plain actions
 * Migrated to TypeScript
 */

import type { MiddlewareAPI, Dispatch, AnyAction } from '@reduxjs/toolkit';
import type { RootState } from '../types.js';

// Thunk function type
export type ThunkAction<R = void> = (
  dispatch: Dispatch<AnyAction>,
  getState: () => RootState
) => R;

// Union type for actions that can be either regular actions or thunks
export type ActionOrThunk<R = void> = AnyAction | ThunkAction<R>;

/**
 * Thunk middleware implementation
 * Allows dispatching functions that receive dispatch and getState as arguments
 */
export const thunkMiddleware = (store: MiddlewareAPI<Dispatch<AnyAction>, RootState>) =>
  (next: Dispatch<AnyAction>) =>
  (action: any): any => {
    // If action is a function, call it with dispatch and getState
    if (typeof action === 'function') {
      return action(store.dispatch, store.getState);
    }
    
    // Otherwise, pass action to next middleware
    return next(action);
  };

/**
 * Type guard to check if an action is a thunk
 */
export const isThunk = <R>(action: ActionOrThunk<R>): action is ThunkAction<R> => {
  return typeof action === 'function';
};

/**
 * Helper type for creating typed thunk action creators
 */
export type ThunkActionCreator<Args extends any[] = [], R = void> = (
  ...args: Args
) => ThunkAction<R>;

/**
 * Utility function to create a typed thunk action creator
 */
export const createThunk = <Args extends any[] = [], R = void>(
  thunkFn: (...args: Args) => ThunkAction<R>
): ThunkActionCreator<Args, R> => {
  return thunkFn;
};

// Export default
export default thunkMiddleware;