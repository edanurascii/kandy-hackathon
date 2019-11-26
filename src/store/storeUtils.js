import _                                 from 'lodash';
import { createAction, handleActions }   from 'redux-actions';
import reduceReducers                    from 'reduce-reducers';
import { isFSA }                         from 'flux-standard-action';

export const INIT = '@@store/INIT';
export const INIT_ACTION = () => ({ type: INIT });


/**
 * Given a mount point and a list of action types returns a mapping
 * of those types to their derived namespaced type based on the mount point.
 *
 * ex:
 *
 *    const actionTypes = createActionTypes("foo.bar", [
 *      "XYZZY",
 *      "QUUX",
 *    ]);
 *
 *    expect(actionTypes).toEqual({
 *      XYZZY: "@@foo/bar/XYZZY",
 *      QUUX:  "@@foo/bar/QUUX",
 *    });
 */
export function createActionTypes (mount, typeList) {
    if (!mount) {
        throw new Error('The mount argument cannot be empty.');
    }

    return _.reduce(typeList, (actionTypeMap, type) => {
        const namespace = mount.replace(/\./g, '/');
        const namespacedType = `@@${namespace}/${type}`;

        actionTypeMap[type] = namespacedType; // eslint-disable-line no-param-reassign

        return actionTypeMap;
    }, {});
}


/**
 * Accepts a mapping of action types to payload creator and returns an
 * action creator map.
 *
 * The value can also be an array where the first element is the payload
 * creator, and the second element is the meta creator.
 *
 * ex:
 *
 *    const actions = createActions({
 *
 *      "@@foo/bar/LOGIN": (usr, pwd) => ({usr, pwd}).
 *
 *      "@@foo/bar/DO_SOMETHING": [
 *        (data) => ({data}),
 *        (data) => ({ length: data.length })
 *      ]
 *
 *    });
 *
 *    expect(actions.login("joe", "hunter2")).toEqual({
 *      type: "@@foo/bar/LOGIN",
 *      payload: { usr: "joe", pwd: "hunter2" },
 *    });
 *
 *    expect(actions.doSomething("quux")).toEqual({
 *      type: "@@foo/bar/DO_SOMETHING",
 *      payload: { data: "quux" },
 *      meta: { length: 4 },
 *    })
 */
export function createActions (actionMap) {
    return _.reduce(actionMap, (actions, payloadCreator, type) => {
        const typeBasename = _.last(type.split('/'));
        const methodName = _.camelCase(typeBasename);

        let metaCreator = null;

        if (_.isArray(payloadCreator)) {
            [payloadCreator, metaCreator] = payloadCreator; // eslint-disable-line no-param-reassign
        }

        actions[methodName] = createAction(type, payloadCreator, metaCreator); // eslint-disable-line no-param-reassign

        return actions;
    }, {});
}


/**
 * Returns the selector methods but with the state arguments scoped to
 * the given mount point.
 *
 * ex:
 *
 *    const selectors = createSelectors("foo.bar", {
 *      getQuux(state) {
 *        return state.quux;
 *      }
 *    });
 *
 *    expect(selectors).toEqual({
 *      getQuux(state) {
 *        // not exactly what the resulting method will be, but has the same effect
 *        return state.foo.bar.quux;
 *      }
 *    })
 */
export function createSelectors (mount, selectorMap) {
    if (!mount) {
        return selectorMap;
    }

    return _.mapValues(selectorMap, selector => (state, ...args) => selector(_.get(state, mount), ...args));
}


/**
 * Returns a reducer based on redux-actions' handleActions() but
 * with the state scoped to the given mount point.
 *
 * ex:
 *
 *    const reducer = createReducer("foo.bar", { quux: null }, {
 *      "@@foo/bar/XYZZY": (state, action) => ({
 *        ...state,
 *        quux: action.payload
 *      })
 *    });
 *
 *    expect(reducer).toEqual((state, action) => {
 *      if (action.type === "@@foo/bar/XYZZY") {
 *        return {
 *          ...state,
 *          foo: {
 *            ...state.foo,
 *            bar: {
 *              ...state.foo.bar,
 *              quux: {
 *                quux: action.payload
 *              }
 *            }
 *          }
 *        }
 *      }
 *    });
 *
 * TODO performance could be improved since objects closer to the root could be
 * cloned multiple times unnecessarily when multiple of these reducers are combined
 */
export function createReducer (mount, initialState, reducers) {
    if (!mount) {
        throw new Error('Mount point cannot be empty.');
    }

    const handler = handleActions(reducers, initialState);
    const mountPath = mount.split('.');

    const immutableSet = (state, path, value) => {
        if (!Array.isArray(path)) {
            throw new Error('immutableSet expects path to be an array');
        }

        if (path.length === 0) {
            return value;
        }

        const head = path[0];
        const tail = _.tail(path);
        const clone = _.clone(state);
        const subState = state[head] || {};

        clone[head] = immutableSet(subState, tail, value);

        return clone;
    };

    return (state, action) => {
        const currentSubState = _.get(state, mount);
        const nextSubState = handler(currentSubState, action);

        if (nextSubState === currentSubState) {
            return state;
        }

        return immutableSet(state, mountPath, nextSubState);
    };
}

export function joinReducers (reducerList) {
    return reduceReducers(...reducerList);
}

/**
 * Returns the same action type to interceptor mapping but with
 * the state returned by getState() scoped to the given mount point.
 */
export function createInterceptors (mount, interceptorMap) {
    if (!mount) {
        return interceptorMap;
    }

    const extractPaths = [
        mount,
        'silk'
    ];

    return _.mapValues(interceptorMap, interceptor => (dispatch, action, getState) => {
        const scopedGetState = () => {
            const scopedState = {};
            const state = getState();

            // TODO performance?
            extractPaths.forEach(path => {
                _.set(scopedState, path, _.get(state, path));
            });

            return scopedState;
        };
        return interceptor(dispatch, action, scopedGetState);
    });
}

export function joinInterceptors (interceptorsList) {
    return _.assignWith({}, ...interceptorsList, (destValue, srcValue) => [
        ...(destValue ? _.castArray(destValue) : []),
        ...(srcValue ? _.castArray(srcValue) : [])
    ]);
}

/**
 * Accepts interceptors mapped by action types and returns
 * a middleware function suitable for applyMiddleware()
 */
export function applyInterceptors (interceptorsList) {
    const interceptorMap = joinInterceptors(interceptorsList);

    return store => next => action => {
        const { dispatch, getState } = store;

        if (isFSA(action) && interceptorMap[action.type]) {
            _.forEach(interceptorMap[action.type],
                interceptor => interceptor(dispatch, action, getState));
        }

        return next(action);
    };
}
