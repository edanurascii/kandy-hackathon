import {
    createStore,
    compose,
    applyMiddleware,
    combineReducers
}                                                   from 'redux';
import reduceReducers                               from 'reduce-reducers';

import { actions as authActions}                        from './kandy/authentication';
import * as kandyStore                       from './kandy/index';
import {
    INIT_ACTION,
    applyInterceptors
}                                                   from './storeUtils';

let store;

export function configureStore () {
    const devToolsExtension = window.__REDUX_DEVTOOLS_EXTENSION__ ? window.__REDUX_DEVTOOLS_EXTENSION__() : f => f;

    const reducer = reduceReducers(
        kandyStore.createReducer(),
    );

    const middleware = applyMiddleware(
        applyInterceptors([
            kandyStore.createInterceptors(),
        ])
    );

    const enhancer = compose(
        middleware,
        devToolsExtension
    );

    store = createStore(reducer, {}, enhancer);

    store.dispatch(authActions.setupKandy());

    // should come after the initial setConfig so that interceptors
    // can have access to the config in the state
    store.dispatch(INIT_ACTION());

    return store;
}
