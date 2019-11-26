import { create }   from '@kandy-io/cpaas-sdk';
import _            from 'lodash';

import {
    createActions,
    createActionTypes,
    createInterceptors,
    createReducer,
    createSelectors
}       from '../storeUtils';
import { createFormBody } from '../../utils';

const MOUNT = 'kandy.authentication';
let Kandy = null;

const INITIAL_STATE = {
};


/* ACTION TYPES
 * ------------------------------------------------ */

const actionTypes = createActionTypes(MOUNT, [
    'SETUP_KANDY',
    'SUBSCRIBE',
    'UNSUBSCRIBE',
    'GET_TOKENS',
    'SET_TOKENS',
    'START_CALL',
]);


/* ACTIONS
 * ------------------------------------------------ */

const actions = createActions({
    [actionTypes.SETUP_KANDY]: undefined,
    [actionTypes.GET_TOKENS]: config => config,
    [actionTypes.SET_TOKENS]: (tokens) => tokens,
    [actionTypes.START_CALL]: (number) => number,
});


/* SELECTORS
 * ------------------------------------------------ */

const localSelectors = {
};

const globalSelectors = {
    ...createSelectors(MOUNT, localSelectors),
};


/* REDUCER
 * ------------------------------------------------ */

const reducer = createReducer(MOUNT, INITIAL_STATE, {
});

/* INTERCEPTORS
 * ------------------------------------------------ */

const interceptors = createInterceptors(MOUNT, {
    [actionTypes.SETUP_KANDY]: () => {
        Kandy = create({
            "authentication": {
                "server": {
                  "base": "oauth-cpaas.att.com"
                },
                "clientCorrelator": "edacahitbusra"
              },
              "logs": {
                "logLevel": "debug"
              },
              "call": {
                "iceServers": [
                  {
                    urls: ['turns:turn-ucc-1.genband.com:443?transport=tcp'],
                  },
                  {
                    urls:['turns:turn-ucc-2.genband.com:443?transport=tcp']
                  }
                ],
              },
              "connectivity": {
                "method": "pingPong",
                "pingInterval": 30000,
                "maxMissedPings": 3
              }
        });

        Kandy.on('subscription:change', function() {
            if(!Kandy.services.getSubscriptions().isPending) {
              if (Kandy.services.getSubscriptions().subscribed.length > 0) {
                console.log('Successfully subscribed to following services: ' + Kandy.services.getSubscriptions().subscribed.toString())
              } else {
                console.log('Successfully unsubscribed from service subscriptions.')
              }
            }
        });

        Kandy.on('subscription:error', function(params) {
            console.log('Received error - ' + params.error.message);
        });
    },

    [actionTypes.GET_TOKENS]: async (dispatch, action) => {
        const { client_id, username, password, grant_type, scope } = action.payload;

        const formBody = createFormBody({
          client_id,
          username,
          password,
          grant_type,
          scope
        });
      
        // POST a request to create a new authentication access token.
        const cpaasAuthUrl = 'https://oauth-cpaas.att.com/cpaas/auth/v1/token'
        const fetchResult = await fetch(cpaasAuthUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formBody
        });
      
        // Parse the result of the fetch as a JSON format.
        const data = await fetchResult.json()
      
        dispatch(actions.setTokens({ accessToken: data.access_token, idToken: data.id_token }));
    },

    [actionTypes.SET_TOKENS]: (dispatch, action) => {
        const { accessToken,  idToken } = action.payload;

        console.log(`accessToken = ${accessToken} && idToken=${idToken}`);

        Kandy.setTokens({ accessToken, idToken });

        const servicesList = ['chat', 'call'];
        Kandy.services.subscribe(servicesList, 'websocket');
    },

    [actionTypes.START_CALL]: (dispatch, action) => {
        const mediaConstraints = {
          audio: true,
          video: false
        }
        const callId = Kandy.call.make(action.payload, mediaConstraints);
    },

    [actionTypes.SUBSCRIBE]: (dispatch, action) => {
        const { accessToken,  idToken } = action.payload;
    },

    [actionTypes.UNSUBSCRIBE]: (dispatch, action) => {
        const { credentials } = action.payload;
    },
});

export {
    actions,
    actionTypes,
    globalSelectors as selectors,
    interceptors,
    reducer
};
