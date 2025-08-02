/**
 * Redux-style Thunk Middleware
 * Allows action creators to return functions (thunks) instead of plain actions
 */

export const thunkMiddleware = (store) => (next) => (action) => {
    // If action is a function, call it with dispatch and getState
    if (typeof action === 'function') {
        return action(store.dispatch, store.getState);
    }
    
    // Otherwise, pass action to next middleware
    return next(action);
};
