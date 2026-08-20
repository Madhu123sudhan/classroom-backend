import arcjet, {detectBot, shield, slidingWindow} from "@arcjet/node";

// Get your site key from https://app.arcjet.com and set it as an environment
if (!process.env.ARCJET_KEY && process.env.NODE_ENV !== 'test') {
    throw new Error('ARCJET_KEY env is required');
}
// variable rather than hard coding.

const aj = arcjet({
    key: process.env.ARCJET_KEY!,
    rules: [
        // Shield protects your app from common attacks e.g. SQL injection
        shield({mode: "LIVE"}),
        // Create a bot detection rule
        detectBot({
            mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
            // Block all bots except the following
            allow: [
                "CATEGORY:SEARCH_ENGINE",
                "CATEGORY:PREVIEW",
            ],
        }),
        // Create a token bucket rate limit. Other algorithms are supported.
        slidingWindow({
            mode: 'LIVE',
            interval: '2s',
            max: 5,
        })
    ],
});

export default aj;