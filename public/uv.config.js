self.__uv$config = {
    prefix: '/english/service/',
    bare: '/history/',

    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: '/english/uv.handler.js',
    bundle: '/english/uv.bundle.js',
    config: '/uv.config.js',
    sw: '/english/uv.worker.js',
};