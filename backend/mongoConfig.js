const LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/library_db';

function getMongoUri() {
    return (process.env.MONGODB_URI || LOCAL_MONGO_URI).trim();
}

function hasCustomMongoUri() {
    return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim());
}

function allowInMemoryFallback() {
    return String(process.env.ALLOW_IN_MEMORY_FALLBACK || '').toLowerCase() === 'true';
}

function maskMongoUri(uri) {
    return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.*)/, '$1********$3');
}

function printMongoConnectionHelp(error, uri) {
    console.error('\nMongoDB connection failed.');
    console.error(`URI: ${maskMongoUri(uri)}`);
    console.error(`Reason: ${error.message}\n`);

    if (error.message.includes('querySrv')) {
        console.error('This is a DNS SRV lookup problem, not a MongoDB auth problem.');
        console.error('Use the standard Atlas connection string if your network blocks SRV lookups.');
    }

    console.error('Checklist:');
    console.error('1. In Atlas Database Access, confirm the username and password are correct.');
    console.error('2. In Atlas Network Access, allow your current IP address or use 0.0.0.0/0 for testing.');
    console.error('3. If mongodb+srv fails with querySrv, switch to the standard Atlas connection string.');
    console.error('4. URL-encode the password if it contains special characters like @ : / ? # [ ].');
    console.error('5. Restart the backend after editing .env.\n');
}

module.exports = {
    LOCAL_MONGO_URI,
    getMongoUri,
    hasCustomMongoUri,
    allowInMemoryFallback,
    printMongoConnectionHelp,
};
