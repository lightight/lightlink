self.__scramjet$config = {
    prefix: '/science/s/',
    files: {
        wasm: '/science/scramjet.wasm.wasm',
        all: '/science/scramjet.all.js',
        sync: '/science/scramjet.sync.js'
    },
    globals: {
        wrapfn: '$scramjet$wrap',
        wrappropertybase: '$scramjet__',
        wrappropertyfn: '$scramjet$prop',
        cleanrestfn: '$scramjet$clean',
        importfn: '$scramjet$import',
        rewritefn: '$scramjet$rewrite',
        metafn: '$scramjet$meta',
        setrealmfn: '$scramjet$setrealm',
        pushsourcemapfn: '$scramjet$pushsourcemap',
        trysetfn: '$scramjet$tryset',
        templocid: '$scramjet$temploc',
        tempunusedid: '$scramjet$tempunused'
    },
    flags: {
        serviceworkers: false,
        syncxhr: false,
        strictRewrites: true,
        rewriterLogs: false,
        captureErrors: true,
        cleanErrors: false,
        scramitize: false,
        sourcemaps: true,
        destructureRewrites: false,
        interceptDownloads: false,
        allowInvalidJs: true,
        allowFailedIntercepts: true
    },
    siteFlags: {},
    codec: {
        encode: "url => url ? encodeURIComponent(url) : url",
        decode: "url => url ? decodeURIComponent(url) : url"
    }
};
