import {
    joinReducers,
    joinInterceptors
}                           from '../storeUtils';

import * as authentication  from './authentication';
// import * as calls           from './calls';
// import * as hardware        from './hardware';

export const createReducer = function() {
    return joinReducers([
        authentication.reducer,
    ]);
};

export const createInterceptors = function() {
    return joinInterceptors([
        authentication.interceptors,
    ]);
};
