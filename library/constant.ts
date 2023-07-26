// Notice: This keys are same as blockchain's.
// You must match this keys with the keys in blockchain.
// See the environment variables of running blockchain.

import { IAuthority } from "./interface";

// LED keys are the keys for genesis node.
// Other keys are the common keys for any nodes.

export const LED_PRIVATE_KEY =
    "5JKnx6ndz11Di6twsvEdnupX8wknpRokxKWNuQuZKd2uMS7rh6Q";
export const LED_PUBLIC_KEY =
    "EOS7KQEvCvWxkhzh4seTsgmSVruJwF5MPnMrK353aG69RQoKDD3dZ";
export const OTHER_PRIVATE_KEY =
    "5JsstuhDEgbhMqcUokQ98Mx2JEbu9sUpwWLHyXAA4URGXYnUfEf";
export const OTHER_PUBLIC_KEY =
    "EOS8EReqzz88PbvNa8afvTkAhAdfbwgfRwfy4AMwS3K2thvFaMD9S";
export const INIT_KEY: IAuthority = {
    threshold: 1,
    keys: [
        {
            key: OTHER_PUBLIC_KEY,
            weight: 1,
        },
    ],
    accounts: [],
    waits: [],
};
