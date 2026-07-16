import require$$0$3 from 'events';
import require$$1$1 from 'https';
import require$$2$1 from 'http';
import require$$3 from 'net';
import require$$4 from 'tls';
import require$$1 from 'crypto';
import require$$0$2 from 'stream';
import require$$7 from 'url';
import require$$0 from 'zlib';
import require$$0$1 from 'buffer';
import require$$2 from 'util';
import path, { join } from 'node:path';
import { cwd } from 'node:process';
import fs, { existsSync, readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';

/**!
 * @author Elgato
 * @module elgato/streamdeck
 * @license MIT
 * @copyright Copyright (c) Corsair Memory Inc.
 */
/**
 * Stream Deck device types.
 */
var DeviceType;
(function (DeviceType) {
    /**
     * Stream Deck, comprised of 15 customizable LCD keys in a 5 x 3 layout.
     */
    DeviceType[DeviceType["StreamDeck"] = 0] = "StreamDeck";
    /**
     * Stream Deck Mini, comprised of 6 customizable LCD keys in a 3 x 2 layout.
     */
    DeviceType[DeviceType["StreamDeckMini"] = 1] = "StreamDeckMini";
    /**
     * Stream Deck XL, comprised of 32 customizable LCD keys in an 8 x 4 layout.
     */
    DeviceType[DeviceType["StreamDeckXL"] = 2] = "StreamDeckXL";
    /**
     * Stream Deck Mobile, for iOS and Android.
     */
    DeviceType[DeviceType["StreamDeckMobile"] = 3] = "StreamDeckMobile";
    /**
     * Corsair G Keys, available on select Corsair keyboards.
     */
    DeviceType[DeviceType["CorsairGKeys"] = 4] = "CorsairGKeys";
    /**
     * Stream Deck Pedal, comprised of 3 customizable pedals.
     */
    DeviceType[DeviceType["StreamDeckPedal"] = 5] = "StreamDeckPedal";
    /**
     * Corsair Voyager laptop, comprising 10 buttons in a horizontal line above the keyboard.
     */
    DeviceType[DeviceType["CorsairVoyager"] = 6] = "CorsairVoyager";
    /**
     * Stream Deck +, comprised of 8 customizable LCD keys in a 4 x 2 layout, a touch strip, and 4 dials.
     */
    DeviceType[DeviceType["StreamDeckPlus"] = 7] = "StreamDeckPlus";
    /**
     * SCUF controller G keys, available on select SCUF controllers, for example SCUF Envision.
     */
    DeviceType[DeviceType["SCUFController"] = 8] = "SCUFController";
    /**
     * Stream Deck Neo, comprised of 8 customizable LCD keys in a 4 x 2 layout, an info bar, and 2 touch points for page navigation.
     */
    DeviceType[DeviceType["StreamDeckNeo"] = 9] = "StreamDeckNeo";
    /**
     * Stream Deck Studio, comprised of 32 customizable LCD keys in a 16 x 2 layout, and 2 dials (1 on either side).
     */
    DeviceType[DeviceType["StreamDeckStudio"] = 10] = "StreamDeckStudio";
    /**
     * Virtual Stream Deck, comprised of 1 to 64 action (on-screen) on a scalable canvas, with a maximum layout of 8 x 8.
     */
    DeviceType[DeviceType["VirtualStreamDeck"] = 11] = "VirtualStreamDeck";
    /**
     * High-performance gaming keyboard, with a built-in Stream Deck comprised of 12 customizable LCD keys in a 3 x 4 layout, an LCD screen, and 2 dials.
     */
    DeviceType[DeviceType["Galleon100SD"] = 12] = "Galleon100SD";
    /**
     * Stream Deck + XL, comprised of 36 customizable LCD keys in a 9 x 4 layout, a touch strip, and 6 dials.
     */
    DeviceType[DeviceType["StreamDeckPlusXL"] = 13] = "StreamDeckPlusXL";
})(DeviceType || (DeviceType = {}));

/**
 * List of available types that can be applied to {@link Bar} and {@link GBar} to determine their style.
 */
var BarSubType;
(function (BarSubType) {
    /**
     * Rectangle bar; the bar fills from left to right, determined by the {@link Bar.value}, similar to a standard progress bar.
     */
    BarSubType[BarSubType["Rectangle"] = 0] = "Rectangle";
    /**
     * Rectangle bar; the bar fills outwards from the centre of the bar, determined by the {@link Bar.value}.
     * @example
     * // Value is 2, range is 1-10.
     * // [  ███     ]
     * @example
     * // Value is 10, range is 1-10.
     * // [     █████]
     */
    BarSubType[BarSubType["DoubleRectangle"] = 1] = "DoubleRectangle";
    /**
     * Trapezoid bar, represented as a right-angle triangle; the bar fills from left to right, determined by the {@link Bar.value}, similar to a volume meter.
     */
    BarSubType[BarSubType["Trapezoid"] = 2] = "Trapezoid";
    /**
     * Trapezoid bar, represented by two right-angle triangles; the bar fills outwards from the centre of the bar, determined by the {@link Bar.value}. See {@link BarSubType.DoubleRectangle}.
     */
    BarSubType[BarSubType["DoubleTrapezoid"] = 3] = "DoubleTrapezoid";
    /**
     * Rounded rectangle bar; the bar fills from left to right, determined by the {@link Bar.value}, similar to a standard progress bar.
     */
    BarSubType[BarSubType["Groove"] = 4] = "Groove";
})(BarSubType || (BarSubType = {}));

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var bufferUtil = {exports: {}};

var constants;
var hasRequiredConstants;

function requireConstants () {
	if (hasRequiredConstants) return constants;
	hasRequiredConstants = 1;

	const BINARY_TYPES = ['nodebuffer', 'arraybuffer', 'fragments'];
	const hasBlob = typeof Blob !== 'undefined';

	if (hasBlob) BINARY_TYPES.push('blob');

	constants = {
	  BINARY_TYPES,
	  CLOSE_TIMEOUT: 30000,
	  EMPTY_BUFFER: Buffer.alloc(0),
	  GUID: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
	  hasBlob,
	  kForOnEventAttribute: Symbol('kIsForOnEventAttribute'),
	  kListener: Symbol('kListener'),
	  kStatusCode: Symbol('status-code'),
	  kWebSocket: Symbol('websocket'),
	  NOOP: () => {}
	};
	return constants;
}

var hasRequiredBufferUtil;

function requireBufferUtil () {
	if (hasRequiredBufferUtil) return bufferUtil.exports;
	hasRequiredBufferUtil = 1;

	const { EMPTY_BUFFER } = requireConstants();

	const FastBuffer = Buffer[Symbol.species];

	/**
	 * Merges an array of buffers into a new buffer.
	 *
	 * @param {Buffer[]} list The array of buffers to concat
	 * @param {Number} totalLength The total length of buffers in the list
	 * @return {Buffer} The resulting buffer
	 * @public
	 */
	function concat(list, totalLength) {
	  if (list.length === 0) return EMPTY_BUFFER;
	  if (list.length === 1) return list[0];

	  const target = Buffer.allocUnsafe(totalLength);
	  let offset = 0;

	  for (let i = 0; i < list.length; i++) {
	    const buf = list[i];
	    target.set(buf, offset);
	    offset += buf.length;
	  }

	  if (offset < totalLength) {
	    return new FastBuffer(target.buffer, target.byteOffset, offset);
	  }

	  return target;
	}

	/**
	 * Masks a buffer using the given mask.
	 *
	 * @param {Buffer} source The buffer to mask
	 * @param {Buffer} mask The mask to use
	 * @param {Buffer} output The buffer where to store the result
	 * @param {Number} offset The offset at which to start writing
	 * @param {Number} length The number of bytes to mask.
	 * @public
	 */
	function _mask(source, mask, output, offset, length) {
	  for (let i = 0; i < length; i++) {
	    output[offset + i] = source[i] ^ mask[i & 3];
	  }
	}

	/**
	 * Unmasks a buffer using the given mask.
	 *
	 * @param {Buffer} buffer The buffer to unmask
	 * @param {Buffer} mask The mask to use
	 * @public
	 */
	function _unmask(buffer, mask) {
	  for (let i = 0; i < buffer.length; i++) {
	    buffer[i] ^= mask[i & 3];
	  }
	}

	/**
	 * Converts a buffer to an `ArrayBuffer`.
	 *
	 * @param {Buffer} buf The buffer to convert
	 * @return {ArrayBuffer} Converted buffer
	 * @public
	 */
	function toArrayBuffer(buf) {
	  if (buf.length === buf.buffer.byteLength) {
	    return buf.buffer;
	  }

	  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
	}

	/**
	 * Converts `data` to a `Buffer`.
	 *
	 * @param {*} data The data to convert
	 * @return {Buffer} The buffer
	 * @throws {TypeError}
	 * @public
	 */
	function toBuffer(data) {
	  toBuffer.readOnly = true;

	  if (Buffer.isBuffer(data)) return data;

	  let buf;

	  if (data instanceof ArrayBuffer) {
	    buf = new FastBuffer(data);
	  } else if (ArrayBuffer.isView(data)) {
	    buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
	  } else {
	    buf = Buffer.from(data);
	    toBuffer.readOnly = false;
	  }

	  return buf;
	}

	bufferUtil.exports = {
	  concat,
	  mask: _mask,
	  toArrayBuffer,
	  toBuffer,
	  unmask: _unmask
	};

	/* istanbul ignore else  */
	if (!process.env.WS_NO_BUFFER_UTIL) {
	  try {
	    const bufferUtil$1 = require('bufferutil');

	    bufferUtil.exports.mask = function (source, mask, output, offset, length) {
	      if (length < 48) _mask(source, mask, output, offset, length);
	      else bufferUtil$1.mask(source, mask, output, offset, length);
	    };

	    bufferUtil.exports.unmask = function (buffer, mask) {
	      if (buffer.length < 32) _unmask(buffer, mask);
	      else bufferUtil$1.unmask(buffer, mask);
	    };
	  } catch (e) {
	    // Continue regardless of the error.
	  }
	}
	return bufferUtil.exports;
}

var limiter;
var hasRequiredLimiter;

function requireLimiter () {
	if (hasRequiredLimiter) return limiter;
	hasRequiredLimiter = 1;

	const kDone = Symbol('kDone');
	const kRun = Symbol('kRun');

	/**
	 * A very simple job queue with adjustable concurrency. Adapted from
	 * https://github.com/STRML/async-limiter
	 */
	class Limiter {
	  /**
	   * Creates a new `Limiter`.
	   *
	   * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
	   *     to run concurrently
	   */
	  constructor(concurrency) {
	    this[kDone] = () => {
	      this.pending--;
	      this[kRun]();
	    };
	    this.concurrency = concurrency || Infinity;
	    this.jobs = [];
	    this.pending = 0;
	  }

	  /**
	   * Adds a job to the queue.
	   *
	   * @param {Function} job The job to run
	   * @public
	   */
	  add(job) {
	    this.jobs.push(job);
	    this[kRun]();
	  }

	  /**
	   * Removes a job from the queue and runs it if possible.
	   *
	   * @private
	   */
	  [kRun]() {
	    if (this.pending === this.concurrency) return;

	    if (this.jobs.length) {
	      const job = this.jobs.shift();

	      this.pending++;
	      job(this[kDone]);
	    }
	  }
	}

	limiter = Limiter;
	return limiter;
}

var permessageDeflate;
var hasRequiredPermessageDeflate;

function requirePermessageDeflate () {
	if (hasRequiredPermessageDeflate) return permessageDeflate;
	hasRequiredPermessageDeflate = 1;

	const zlib = require$$0;

	const bufferUtil = requireBufferUtil();
	const Limiter = requireLimiter();
	const { kStatusCode } = requireConstants();

	const FastBuffer = Buffer[Symbol.species];
	const TRAILER = Buffer.from([0x00, 0x00, 0xff, 0xff]);
	const kPerMessageDeflate = Symbol('permessage-deflate');
	const kTotalLength = Symbol('total-length');
	const kCallback = Symbol('callback');
	const kBuffers = Symbol('buffers');
	const kError = Symbol('error');

	//
	// We limit zlib concurrency, which prevents severe memory fragmentation
	// as documented in https://github.com/nodejs/node/issues/8871#issuecomment-250915913
	// and https://github.com/websockets/ws/issues/1202
	//
	// Intentionally global; it's the global thread pool that's an issue.
	//
	let zlibLimiter;

	/**
	 * permessage-deflate implementation.
	 */
	class PerMessageDeflate {
	  /**
	   * Creates a PerMessageDeflate instance.
	   *
	   * @param {Object} [options] Configuration options
	   * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
	   *     for, or request, a custom client window size
	   * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
	   *     acknowledge disabling of client context takeover
	   * @param {Number} [options.concurrencyLimit=10] The number of concurrent
	   *     calls to zlib
	   * @param {Boolean} [options.isServer=false] Create the instance in either
	   *     server or client mode
	   * @param {Number} [options.maxPayload=0] The maximum allowed message length
	   * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
	   *     use of a custom server window size
	   * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
	   *     disabling of server context takeover
	   * @param {Number} [options.threshold=1024] Size (in bytes) below which
	   *     messages should not be compressed if context takeover is disabled
	   * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
	   *     deflate
	   * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
	   *     inflate
	   */
	  constructor(options) {
	    this._options = options || {};
	    this._threshold =
	      this._options.threshold !== undefined ? this._options.threshold : 1024;
	    this._maxPayload = this._options.maxPayload | 0;
	    this._isServer = !!this._options.isServer;
	    this._deflate = null;
	    this._inflate = null;

	    this.params = null;

	    if (!zlibLimiter) {
	      const concurrency =
	        this._options.concurrencyLimit !== undefined
	          ? this._options.concurrencyLimit
	          : 10;
	      zlibLimiter = new Limiter(concurrency);
	    }
	  }

	  /**
	   * @type {String}
	   */
	  static get extensionName() {
	    return 'permessage-deflate';
	  }

	  /**
	   * Create an extension negotiation offer.
	   *
	   * @return {Object} Extension parameters
	   * @public
	   */
	  offer() {
	    const params = {};

	    if (this._options.serverNoContextTakeover) {
	      params.server_no_context_takeover = true;
	    }
	    if (this._options.clientNoContextTakeover) {
	      params.client_no_context_takeover = true;
	    }
	    if (this._options.serverMaxWindowBits) {
	      params.server_max_window_bits = this._options.serverMaxWindowBits;
	    }
	    if (this._options.clientMaxWindowBits) {
	      params.client_max_window_bits = this._options.clientMaxWindowBits;
	    } else if (this._options.clientMaxWindowBits == null) {
	      params.client_max_window_bits = true;
	    }

	    return params;
	  }

	  /**
	   * Accept an extension negotiation offer/response.
	   *
	   * @param {Array} configurations The extension negotiation offers/reponse
	   * @return {Object} Accepted configuration
	   * @public
	   */
	  accept(configurations) {
	    configurations = this.normalizeParams(configurations);

	    this.params = this._isServer
	      ? this.acceptAsServer(configurations)
	      : this.acceptAsClient(configurations);

	    return this.params;
	  }

	  /**
	   * Releases all resources used by the extension.
	   *
	   * @public
	   */
	  cleanup() {
	    if (this._inflate) {
	      this._inflate.close();
	      this._inflate = null;
	    }

	    if (this._deflate) {
	      const callback = this._deflate[kCallback];

	      this._deflate.close();
	      this._deflate = null;

	      if (callback) {
	        callback(
	          new Error(
	            'The deflate stream was closed while data was being processed'
	          )
	        );
	      }
	    }
	  }

	  /**
	   *  Accept an extension negotiation offer.
	   *
	   * @param {Array} offers The extension negotiation offers
	   * @return {Object} Accepted configuration
	   * @private
	   */
	  acceptAsServer(offers) {
	    const opts = this._options;
	    const accepted = offers.find((params) => {
	      if (
	        (opts.serverNoContextTakeover === false &&
	          params.server_no_context_takeover) ||
	        (params.server_max_window_bits &&
	          (opts.serverMaxWindowBits === false ||
	            (typeof opts.serverMaxWindowBits === 'number' &&
	              opts.serverMaxWindowBits > params.server_max_window_bits))) ||
	        (typeof opts.clientMaxWindowBits === 'number' &&
	          !params.client_max_window_bits)
	      ) {
	        return false;
	      }

	      return true;
	    });

	    if (!accepted) {
	      throw new Error('None of the extension offers can be accepted');
	    }

	    if (opts.serverNoContextTakeover) {
	      accepted.server_no_context_takeover = true;
	    }
	    if (opts.clientNoContextTakeover) {
	      accepted.client_no_context_takeover = true;
	    }
	    if (typeof opts.serverMaxWindowBits === 'number') {
	      accepted.server_max_window_bits = opts.serverMaxWindowBits;
	    }
	    if (typeof opts.clientMaxWindowBits === 'number') {
	      accepted.client_max_window_bits = opts.clientMaxWindowBits;
	    } else if (
	      accepted.client_max_window_bits === true ||
	      opts.clientMaxWindowBits === false
	    ) {
	      delete accepted.client_max_window_bits;
	    }

	    return accepted;
	  }

	  /**
	   * Accept the extension negotiation response.
	   *
	   * @param {Array} response The extension negotiation response
	   * @return {Object} Accepted configuration
	   * @private
	   */
	  acceptAsClient(response) {
	    const params = response[0];

	    if (
	      this._options.clientNoContextTakeover === false &&
	      params.client_no_context_takeover
	    ) {
	      throw new Error('Unexpected parameter "client_no_context_takeover"');
	    }

	    if (!params.client_max_window_bits) {
	      if (typeof this._options.clientMaxWindowBits === 'number') {
	        params.client_max_window_bits = this._options.clientMaxWindowBits;
	      }
	    } else if (
	      this._options.clientMaxWindowBits === false ||
	      (typeof this._options.clientMaxWindowBits === 'number' &&
	        params.client_max_window_bits > this._options.clientMaxWindowBits)
	    ) {
	      throw new Error(
	        'Unexpected or invalid parameter "client_max_window_bits"'
	      );
	    }

	    return params;
	  }

	  /**
	   * Normalize parameters.
	   *
	   * @param {Array} configurations The extension negotiation offers/reponse
	   * @return {Array} The offers/response with normalized parameters
	   * @private
	   */
	  normalizeParams(configurations) {
	    configurations.forEach((params) => {
	      Object.keys(params).forEach((key) => {
	        let value = params[key];

	        if (value.length > 1) {
	          throw new Error(`Parameter "${key}" must have only a single value`);
	        }

	        value = value[0];

	        if (key === 'client_max_window_bits') {
	          if (value !== true) {
	            const num = +value;
	            if (!Number.isInteger(num) || num < 8 || num > 15) {
	              throw new TypeError(
	                `Invalid value for parameter "${key}": ${value}`
	              );
	            }
	            value = num;
	          } else if (!this._isServer) {
	            throw new TypeError(
	              `Invalid value for parameter "${key}": ${value}`
	            );
	          }
	        } else if (key === 'server_max_window_bits') {
	          const num = +value;
	          if (!Number.isInteger(num) || num < 8 || num > 15) {
	            throw new TypeError(
	              `Invalid value for parameter "${key}": ${value}`
	            );
	          }
	          value = num;
	        } else if (
	          key === 'client_no_context_takeover' ||
	          key === 'server_no_context_takeover'
	        ) {
	          if (value !== true) {
	            throw new TypeError(
	              `Invalid value for parameter "${key}": ${value}`
	            );
	          }
	        } else {
	          throw new Error(`Unknown parameter "${key}"`);
	        }

	        params[key] = value;
	      });
	    });

	    return configurations;
	  }

	  /**
	   * Decompress data. Concurrency limited.
	   *
	   * @param {Buffer} data Compressed data
	   * @param {Boolean} fin Specifies whether or not this is the last fragment
	   * @param {Function} callback Callback
	   * @public
	   */
	  decompress(data, fin, callback) {
	    zlibLimiter.add((done) => {
	      this._decompress(data, fin, (err, result) => {
	        done();
	        callback(err, result);
	      });
	    });
	  }

	  /**
	   * Compress data. Concurrency limited.
	   *
	   * @param {(Buffer|String)} data Data to compress
	   * @param {Boolean} fin Specifies whether or not this is the last fragment
	   * @param {Function} callback Callback
	   * @public
	   */
	  compress(data, fin, callback) {
	    zlibLimiter.add((done) => {
	      this._compress(data, fin, (err, result) => {
	        done();
	        callback(err, result);
	      });
	    });
	  }

	  /**
	   * Decompress data.
	   *
	   * @param {Buffer} data Compressed data
	   * @param {Boolean} fin Specifies whether or not this is the last fragment
	   * @param {Function} callback Callback
	   * @private
	   */
	  _decompress(data, fin, callback) {
	    const endpoint = this._isServer ? 'client' : 'server';

	    if (!this._inflate) {
	      const key = `${endpoint}_max_window_bits`;
	      const windowBits =
	        typeof this.params[key] !== 'number'
	          ? zlib.Z_DEFAULT_WINDOWBITS
	          : this.params[key];

	      this._inflate = zlib.createInflateRaw({
	        ...this._options.zlibInflateOptions,
	        windowBits
	      });
	      this._inflate[kPerMessageDeflate] = this;
	      this._inflate[kTotalLength] = 0;
	      this._inflate[kBuffers] = [];
	      this._inflate.on('error', inflateOnError);
	      this._inflate.on('data', inflateOnData);
	    }

	    this._inflate[kCallback] = callback;

	    this._inflate.write(data);
	    if (fin) this._inflate.write(TRAILER);

	    this._inflate.flush(() => {
	      const err = this._inflate[kError];

	      if (err) {
	        this._inflate.close();
	        this._inflate = null;
	        callback(err);
	        return;
	      }

	      const data = bufferUtil.concat(
	        this._inflate[kBuffers],
	        this._inflate[kTotalLength]
	      );

	      if (this._inflate._readableState.endEmitted) {
	        this._inflate.close();
	        this._inflate = null;
	      } else {
	        this._inflate[kTotalLength] = 0;
	        this._inflate[kBuffers] = [];

	        if (fin && this.params[`${endpoint}_no_context_takeover`]) {
	          this._inflate.reset();
	        }
	      }

	      callback(null, data);
	    });
	  }

	  /**
	   * Compress data.
	   *
	   * @param {(Buffer|String)} data Data to compress
	   * @param {Boolean} fin Specifies whether or not this is the last fragment
	   * @param {Function} callback Callback
	   * @private
	   */
	  _compress(data, fin, callback) {
	    const endpoint = this._isServer ? 'server' : 'client';

	    if (!this._deflate) {
	      const key = `${endpoint}_max_window_bits`;
	      const windowBits =
	        typeof this.params[key] !== 'number'
	          ? zlib.Z_DEFAULT_WINDOWBITS
	          : this.params[key];

	      this._deflate = zlib.createDeflateRaw({
	        ...this._options.zlibDeflateOptions,
	        windowBits
	      });

	      this._deflate[kTotalLength] = 0;
	      this._deflate[kBuffers] = [];

	      this._deflate.on('data', deflateOnData);
	    }

	    this._deflate[kCallback] = callback;

	    this._deflate.write(data);
	    this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
	      if (!this._deflate) {
	        //
	        // The deflate stream was closed while data was being processed.
	        //
	        return;
	      }

	      let data = bufferUtil.concat(
	        this._deflate[kBuffers],
	        this._deflate[kTotalLength]
	      );

	      if (fin) {
	        data = new FastBuffer(data.buffer, data.byteOffset, data.length - 4);
	      }

	      //
	      // Ensure that the callback will not be called again in
	      // `PerMessageDeflate#cleanup()`.
	      //
	      this._deflate[kCallback] = null;

	      this._deflate[kTotalLength] = 0;
	      this._deflate[kBuffers] = [];

	      if (fin && this.params[`${endpoint}_no_context_takeover`]) {
	        this._deflate.reset();
	      }

	      callback(null, data);
	    });
	  }
	}

	permessageDeflate = PerMessageDeflate;

	/**
	 * The listener of the `zlib.DeflateRaw` stream `'data'` event.
	 *
	 * @param {Buffer} chunk A chunk of data
	 * @private
	 */
	function deflateOnData(chunk) {
	  this[kBuffers].push(chunk);
	  this[kTotalLength] += chunk.length;
	}

	/**
	 * The listener of the `zlib.InflateRaw` stream `'data'` event.
	 *
	 * @param {Buffer} chunk A chunk of data
	 * @private
	 */
	function inflateOnData(chunk) {
	  this[kTotalLength] += chunk.length;

	  if (
	    this[kPerMessageDeflate]._maxPayload < 1 ||
	    this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload
	  ) {
	    this[kBuffers].push(chunk);
	    return;
	  }

	  this[kError] = new RangeError('Max payload size exceeded');
	  this[kError].code = 'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH';
	  this[kError][kStatusCode] = 1009;
	  this.removeListener('data', inflateOnData);

	  //
	  // The choice to employ `zlib.reset()` over `zlib.close()` is dictated by the
	  // fact that in Node.js versions prior to 13.10.0, the callback for
	  // `zlib.flush()` is not called if `zlib.close()` is used. Utilizing
	  // `zlib.reset()` ensures that either the callback is invoked or an error is
	  // emitted.
	  //
	  this.reset();
	}

	/**
	 * The listener of the `zlib.InflateRaw` stream `'error'` event.
	 *
	 * @param {Error} err The emitted error
	 * @private
	 */
	function inflateOnError(err) {
	  //
	  // There is no need to call `Zlib#close()` as the handle is automatically
	  // closed when an error is emitted.
	  //
	  this[kPerMessageDeflate]._inflate = null;

	  if (this[kError]) {
	    this[kCallback](this[kError]);
	    return;
	  }

	  err[kStatusCode] = 1007;
	  this[kCallback](err);
	}
	return permessageDeflate;
}

var validation = {exports: {}};

var hasRequiredValidation;

function requireValidation () {
	if (hasRequiredValidation) return validation.exports;
	hasRequiredValidation = 1;

	const { isUtf8 } = require$$0$1;

	const { hasBlob } = requireConstants();

	//
	// Allowed token characters:
	//
	// '!', '#', '$', '%', '&', ''', '*', '+', '-',
	// '.', 0-9, A-Z, '^', '_', '`', a-z, '|', '~'
	//
	// tokenChars[32] === 0 // ' '
	// tokenChars[33] === 1 // '!'
	// tokenChars[34] === 0 // '"'
	// ...
	//
	// prettier-ignore
	const tokenChars = [
	  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 0 - 15
	  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 16 - 31
	  0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, // 32 - 47
	  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, // 48 - 63
	  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 64 - 79
	  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, // 80 - 95
	  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 96 - 111
	  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0 // 112 - 127
	];

	/**
	 * Checks if a status code is allowed in a close frame.
	 *
	 * @param {Number} code The status code
	 * @return {Boolean} `true` if the status code is valid, else `false`
	 * @public
	 */
	function isValidStatusCode(code) {
	  return (
	    (code >= 1000 &&
	      code <= 1014 &&
	      code !== 1004 &&
	      code !== 1005 &&
	      code !== 1006) ||
	    (code >= 3000 && code <= 4999)
	  );
	}

	/**
	 * Checks if a given buffer contains only correct UTF-8.
	 * Ported from https://www.cl.cam.ac.uk/%7Emgk25/ucs/utf8_check.c by
	 * Markus Kuhn.
	 *
	 * @param {Buffer} buf The buffer to check
	 * @return {Boolean} `true` if `buf` contains only correct UTF-8, else `false`
	 * @public
	 */
	function _isValidUTF8(buf) {
	  const len = buf.length;
	  let i = 0;

	  while (i < len) {
	    if ((buf[i] & 0x80) === 0) {
	      // 0xxxxxxx
	      i++;
	    } else if ((buf[i] & 0xe0) === 0xc0) {
	      // 110xxxxx 10xxxxxx
	      if (
	        i + 1 === len ||
	        (buf[i + 1] & 0xc0) !== 0x80 ||
	        (buf[i] & 0xfe) === 0xc0 // Overlong
	      ) {
	        return false;
	      }

	      i += 2;
	    } else if ((buf[i] & 0xf0) === 0xe0) {
	      // 1110xxxx 10xxxxxx 10xxxxxx
	      if (
	        i + 2 >= len ||
	        (buf[i + 1] & 0xc0) !== 0x80 ||
	        (buf[i + 2] & 0xc0) !== 0x80 ||
	        (buf[i] === 0xe0 && (buf[i + 1] & 0xe0) === 0x80) || // Overlong
	        (buf[i] === 0xed && (buf[i + 1] & 0xe0) === 0xa0) // Surrogate (U+D800 - U+DFFF)
	      ) {
	        return false;
	      }

	      i += 3;
	    } else if ((buf[i] & 0xf8) === 0xf0) {
	      // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
	      if (
	        i + 3 >= len ||
	        (buf[i + 1] & 0xc0) !== 0x80 ||
	        (buf[i + 2] & 0xc0) !== 0x80 ||
	        (buf[i + 3] & 0xc0) !== 0x80 ||
	        (buf[i] === 0xf0 && (buf[i + 1] & 0xf0) === 0x80) || // Overlong
	        (buf[i] === 0xf4 && buf[i + 1] > 0x8f) ||
	        buf[i] > 0xf4 // > U+10FFFF
	      ) {
	        return false;
	      }

	      i += 4;
	    } else {
	      return false;
	    }
	  }

	  return true;
	}

	/**
	 * Determines whether a value is a `Blob`.
	 *
	 * @param {*} value The value to be tested
	 * @return {Boolean} `true` if `value` is a `Blob`, else `false`
	 * @private
	 */
	function isBlob(value) {
	  return (
	    hasBlob &&
	    typeof value === 'object' &&
	    typeof value.arrayBuffer === 'function' &&
	    typeof value.type === 'string' &&
	    typeof value.stream === 'function' &&
	    (value[Symbol.toStringTag] === 'Blob' ||
	      value[Symbol.toStringTag] === 'File')
	  );
	}

	validation.exports = {
	  isBlob,
	  isValidStatusCode,
	  isValidUTF8: _isValidUTF8,
	  tokenChars
	};

	if (isUtf8) {
	  validation.exports.isValidUTF8 = function (buf) {
	    return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
	  };
	} /* istanbul ignore else  */ else if (!process.env.WS_NO_UTF_8_VALIDATE) {
	  try {
	    const isValidUTF8 = require('utf-8-validate');

	    validation.exports.isValidUTF8 = function (buf) {
	      return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
	    };
	  } catch (e) {
	    // Continue regardless of the error.
	  }
	}
	return validation.exports;
}

var receiver;
var hasRequiredReceiver;

function requireReceiver () {
	if (hasRequiredReceiver) return receiver;
	hasRequiredReceiver = 1;

	const { Writable } = require$$0$2;

	const PerMessageDeflate = requirePermessageDeflate();
	const {
	  BINARY_TYPES,
	  EMPTY_BUFFER,
	  kStatusCode,
	  kWebSocket
	} = requireConstants();
	const { concat, toArrayBuffer, unmask } = requireBufferUtil();
	const { isValidStatusCode, isValidUTF8 } = requireValidation();

	const FastBuffer = Buffer[Symbol.species];

	const GET_INFO = 0;
	const GET_PAYLOAD_LENGTH_16 = 1;
	const GET_PAYLOAD_LENGTH_64 = 2;
	const GET_MASK = 3;
	const GET_DATA = 4;
	const INFLATING = 5;
	const DEFER_EVENT = 6;

	/**
	 * HyBi Receiver implementation.
	 *
	 * @extends Writable
	 */
	class Receiver extends Writable {
	  /**
	   * Creates a Receiver instance.
	   *
	   * @param {Object} [options] Options object
	   * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
	   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
	   *     multiple times in the same tick
	   * @param {String} [options.binaryType=nodebuffer] The type for binary data
	   * @param {Object} [options.extensions] An object containing the negotiated
	   *     extensions
	   * @param {Boolean} [options.isServer=false] Specifies whether to operate in
	   *     client or server mode
	   * @param {Number} [options.maxBufferedChunks=0] The maximum number of
	   *     buffered data chunks
	   * @param {Number} [options.maxFragments=0] The maximum number of message
	   *     fragments
	   * @param {Number} [options.maxPayload=0] The maximum allowed message length
	   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
	   *     not to skip UTF-8 validation for text and close messages
	   */
	  constructor(options = {}) {
	    super();

	    this._allowSynchronousEvents =
	      options.allowSynchronousEvents !== undefined
	        ? options.allowSynchronousEvents
	        : true;
	    this._binaryType = options.binaryType || BINARY_TYPES[0];
	    this._extensions = options.extensions || {};
	    this._isServer = !!options.isServer;
	    this._maxBufferedChunks = options.maxBufferedChunks | 0;
	    this._maxFragments = options.maxFragments | 0;
	    this._maxPayload = options.maxPayload | 0;
	    this._skipUTF8Validation = !!options.skipUTF8Validation;
	    this[kWebSocket] = undefined;

	    this._bufferedBytes = 0;
	    this._buffers = [];

	    this._compressed = false;
	    this._payloadLength = 0;
	    this._mask = undefined;
	    this._fragmented = 0;
	    this._masked = false;
	    this._fin = false;
	    this._opcode = 0;

	    this._totalPayloadLength = 0;
	    this._messageLength = 0;
	    this._fragments = [];

	    this._errored = false;
	    this._loop = false;
	    this._state = GET_INFO;
	  }

	  /**
	   * Implements `Writable.prototype._write()`.
	   *
	   * @param {Buffer} chunk The chunk of data to write
	   * @param {String} encoding The character encoding of `chunk`
	   * @param {Function} cb Callback
	   * @private
	   */
	  _write(chunk, encoding, cb) {
	    if (this._opcode === 0x08 && this._state == GET_INFO) return cb();

	    if (
	      this._maxBufferedChunks > 0 &&
	      this._buffers.length >= this._maxBufferedChunks
	    ) {
	      cb(
	        this.createError(
	          RangeError,
	          'Too many buffered chunks',
	          false,
	          1008,
	          'WS_ERR_TOO_MANY_BUFFERED_PARTS'
	        )
	      );
	      return;
	    }

	    this._bufferedBytes += chunk.length;
	    this._buffers.push(chunk);
	    this.startLoop(cb);
	  }

	  /**
	   * Consumes `n` bytes from the buffered data.
	   *
	   * @param {Number} n The number of bytes to consume
	   * @return {Buffer} The consumed bytes
	   * @private
	   */
	  consume(n) {
	    this._bufferedBytes -= n;

	    if (n === this._buffers[0].length) return this._buffers.shift();

	    if (n < this._buffers[0].length) {
	      const buf = this._buffers[0];
	      this._buffers[0] = new FastBuffer(
	        buf.buffer,
	        buf.byteOffset + n,
	        buf.length - n
	      );

	      return new FastBuffer(buf.buffer, buf.byteOffset, n);
	    }

	    const dst = Buffer.allocUnsafe(n);

	    do {
	      const buf = this._buffers[0];
	      const offset = dst.length - n;

	      if (n >= buf.length) {
	        dst.set(this._buffers.shift(), offset);
	      } else {
	        dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
	        this._buffers[0] = new FastBuffer(
	          buf.buffer,
	          buf.byteOffset + n,
	          buf.length - n
	        );
	      }

	      n -= buf.length;
	    } while (n > 0);

	    return dst;
	  }

	  /**
	   * Starts the parsing loop.
	   *
	   * @param {Function} cb Callback
	   * @private
	   */
	  startLoop(cb) {
	    this._loop = true;

	    do {
	      switch (this._state) {
	        case GET_INFO:
	          this.getInfo(cb);
	          break;
	        case GET_PAYLOAD_LENGTH_16:
	          this.getPayloadLength16(cb);
	          break;
	        case GET_PAYLOAD_LENGTH_64:
	          this.getPayloadLength64(cb);
	          break;
	        case GET_MASK:
	          this.getMask();
	          break;
	        case GET_DATA:
	          this.getData(cb);
	          break;
	        case INFLATING:
	        case DEFER_EVENT:
	          this._loop = false;
	          return;
	      }
	    } while (this._loop);

	    if (!this._errored) cb();
	  }

	  /**
	   * Reads the first two bytes of a frame.
	   *
	   * @param {Function} cb Callback
	   * @private
	   */
	  getInfo(cb) {
	    if (this._bufferedBytes < 2) {
	      this._loop = false;
	      return;
	    }

	    const buf = this.consume(2);

	    if ((buf[0] & 0x30) !== 0x00) {
	      const error = this.createError(
	        RangeError,
	        'RSV2 and RSV3 must be clear',
	        true,
	        1002,
	        'WS_ERR_UNEXPECTED_RSV_2_3'
	      );

	      cb(error);
	      return;
	    }

	    const compressed = (buf[0] & 0x40) === 0x40;

	    if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
	      const error = this.createError(
	        RangeError,
	        'RSV1 must be clear',
	        true,
	        1002,
	        'WS_ERR_UNEXPECTED_RSV_1'
	      );

	      cb(error);
	      return;
	    }

	    this._fin = (buf[0] & 0x80) === 0x80;
	    this._opcode = buf[0] & 0x0f;
	    this._payloadLength = buf[1] & 0x7f;

	    if (this._opcode === 0x00) {
	      if (compressed) {
	        const error = this.createError(
	          RangeError,
	          'RSV1 must be clear',
	          true,
	          1002,
	          'WS_ERR_UNEXPECTED_RSV_1'
	        );

	        cb(error);
	        return;
	      }

	      if (!this._fragmented) {
	        const error = this.createError(
	          RangeError,
	          'invalid opcode 0',
	          true,
	          1002,
	          'WS_ERR_INVALID_OPCODE'
	        );

	        cb(error);
	        return;
	      }

	      this._opcode = this._fragmented;
	    } else if (this._opcode === 0x01 || this._opcode === 0x02) {
	      if (this._fragmented) {
	        const error = this.createError(
	          RangeError,
	          `invalid opcode ${this._opcode}`,
	          true,
	          1002,
	          'WS_ERR_INVALID_OPCODE'
	        );

	        cb(error);
	        return;
	      }

	      this._compressed = compressed;
	    } else if (this._opcode > 0x07 && this._opcode < 0x0b) {
	      if (!this._fin) {
	        const error = this.createError(
	          RangeError,
	          'FIN must be set',
	          true,
	          1002,
	          'WS_ERR_EXPECTED_FIN'
	        );

	        cb(error);
	        return;
	      }

	      if (compressed) {
	        const error = this.createError(
	          RangeError,
	          'RSV1 must be clear',
	          true,
	          1002,
	          'WS_ERR_UNEXPECTED_RSV_1'
	        );

	        cb(error);
	        return;
	      }

	      if (
	        this._payloadLength > 0x7d ||
	        (this._opcode === 0x08 && this._payloadLength === 1)
	      ) {
	        const error = this.createError(
	          RangeError,
	          `invalid payload length ${this._payloadLength}`,
	          true,
	          1002,
	          'WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH'
	        );

	        cb(error);
	        return;
	      }
	    } else {
	      const error = this.createError(
	        RangeError,
	        `invalid opcode ${this._opcode}`,
	        true,
	        1002,
	        'WS_ERR_INVALID_OPCODE'
	      );

	      cb(error);
	      return;
	    }

	    if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
	    this._masked = (buf[1] & 0x80) === 0x80;

	    if (this._isServer) {
	      if (!this._masked) {
	        const error = this.createError(
	          RangeError,
	          'MASK must be set',
	          true,
	          1002,
	          'WS_ERR_EXPECTED_MASK'
	        );

	        cb(error);
	        return;
	      }
	    } else if (this._masked) {
	      const error = this.createError(
	        RangeError,
	        'MASK must be clear',
	        true,
	        1002,
	        'WS_ERR_UNEXPECTED_MASK'
	      );

	      cb(error);
	      return;
	    }

	    if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
	    else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
	    else this.haveLength(cb);
	  }

	  /**
	   * Gets extended payload length (7+16).
	   *
	   * @param {Function} cb Callback
	   * @private
	   */
	  getPayloadLength16(cb) {
	    if (this._bufferedBytes < 2) {
	      this._loop = false;
	      return;
	    }

	    this._payloadLength = this.consume(2).readUInt16BE(0);
	    this.haveLength(cb);
	  }

	  /**
	   * Gets extended payload length (7+64).
	   *
	   * @param {Function} cb Callback
	   * @private
	   */
	  getPayloadLength64(cb) {
	    if (this._bufferedBytes < 8) {
	      this._loop = false;
	      return;
	    }

	    const buf = this.consume(8);
	    const num = buf.readUInt32BE(0);

	    //
	    // The maximum safe integer in JavaScript is 2^53 - 1. An error is returned
	    // if payload length is greater than this number.
	    //
	    if (num > Math.pow(2, 53 - 32) - 1) {
	      const error = this.createError(
	        RangeError,
	        'Unsupported WebSocket frame: payload length > 2^53 - 1',
	        false,
	        1009,
	        'WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH'
	      );

	      cb(error);
	      return;
	    }

	    this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
	    this.haveLength(cb);
	  }

	  /**
	   * Payload length has been read.
	   *
	   * @param {Function} cb Callback
	   * @private
	   */
	  haveLength(cb) {
	    if (this._payloadLength && this._opcode < 0x08) {
	      this._totalPayloadLength += this._payloadLength;
	      if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
	        const error = this.createError(
	          RangeError,
	          'Max payload size exceeded',
	          false,
	          1009,
	          'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH'
	        );

	        cb(error);
	        return;
	      }
	    }

	    if (this._masked) this._state = GET_MASK;
	    else this._state = GET_DATA;
	  }

	  /**
	   * Reads mask bytes.
	   *
	   * @private
	   */
	  getMask() {
	    if (this._bufferedBytes < 4) {
	      this._loop = false;
	      return;
	    }

	    this._mask = this.consume(4);
	    this._state = GET_DATA;
	  }

	  /**
	   * Reads data bytes.
	   *
	   * @param {Function} cb Callback
	   * @private
	   */
	  getData(cb) {
	    let data = EMPTY_BUFFER;

	    if (this._payloadLength) {
	      if (this._bufferedBytes < this._payloadLength) {
	        this._loop = false;
	        return;
	      }

	      data = this.consume(this._payloadLength);

	      if (
	        this._masked &&
	        (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0
	      ) {
	        unmask(data, this._mask);
	      }
	    }

	    if (this._opcode > 0x07) {
	      this.controlMessage(data, cb);
	      return;
	    }

	    if (this._compressed) {
	      this._state = INFLATING;
	      this.decompress(data, cb);
	      return;
	    }

	    if (data.length) {
	      if (
	        this._maxFragments > 0 &&
	        this._fragments.length >= this._maxFragments
	      ) {
	        const error = this.createError(
	          RangeError,
	          'Too many message fragments',
	          false,
	          1008,
	          'WS_ERR_TOO_MANY_BUFFERED_PARTS'
	        );

	        cb(error);
	        return;
	      }

	      //
	      // This message is not compressed so its length is the sum of the payload
	      // length of all fragments.
	      //
	      this._messageLength = this._totalPayloadLength;
	      this._fragments.push(data);
	    }

	    this.dataMessage(cb);
	  }

	  /**
	   * Decompresses data.
	   *
	   * @param {Buffer} data Compressed data
	   * @param {Function} cb Callback
	   * @private
	   */
	  decompress(data, cb) {
	    const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];

	    perMessageDeflate.decompress(data, this._fin, (err, buf) => {
	      if (err) return cb(err);

	      if (buf.length) {
	        this._messageLength += buf.length;
	        if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
	          const error = this.createError(
	            RangeError,
	            'Max payload size exceeded',
	            false,
	            1009,
	            'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH'
	          );

	          cb(error);
	          return;
	        }

	        if (
	          this._maxFragments > 0 &&
	          this._fragments.length >= this._maxFragments
	        ) {
	          const error = this.createError(
	            RangeError,
	            'Too many message fragments',
	            false,
	            1008,
	            'WS_ERR_TOO_MANY_BUFFERED_PARTS'
	          );

	          cb(error);
	          return;
	        }

	        this._fragments.push(buf);
	      }

	      this.dataMessage(cb);
	      if (this._state === GET_INFO) this.startLoop(cb);
	    });
	  }

	  /**
	   * Handles a data message.
	   *
	   * @param {Function} cb Callback
	   * @private
	   */
	  dataMessage(cb) {
	    if (!this._fin) {
	      this._state = GET_INFO;
	      return;
	    }

	    const messageLength = this._messageLength;
	    const fragments = this._fragments;

	    this._totalPayloadLength = 0;
	    this._messageLength = 0;
	    this._fragmented = 0;
	    this._fragments = [];

	    if (this._opcode === 2) {
	      let data;

	      if (this._binaryType === 'nodebuffer') {
	        data = concat(fragments, messageLength);
	      } else if (this._binaryType === 'arraybuffer') {
	        data = toArrayBuffer(concat(fragments, messageLength));
	      } else if (this._binaryType === 'blob') {
	        data = new Blob(fragments);
	      } else {
	        data = fragments;
	      }

	      if (this._allowSynchronousEvents) {
	        this.emit('message', data, true);
	        this._state = GET_INFO;
	      } else {
	        this._state = DEFER_EVENT;
	        setImmediate(() => {
	          this.emit('message', data, true);
	          this._state = GET_INFO;
	          this.startLoop(cb);
	        });
	      }
	    } else {
	      const buf = concat(fragments, messageLength);

	      if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
	        const error = this.createError(
	          Error,
	          'invalid UTF-8 sequence',
	          true,
	          1007,
	          'WS_ERR_INVALID_UTF8'
	        );

	        cb(error);
	        return;
	      }

	      if (this._state === INFLATING || this._allowSynchronousEvents) {
	        this.emit('message', buf, false);
	        this._state = GET_INFO;
	      } else {
	        this._state = DEFER_EVENT;
	        setImmediate(() => {
	          this.emit('message', buf, false);
	          this._state = GET_INFO;
	          this.startLoop(cb);
	        });
	      }
	    }
	  }

	  /**
	   * Handles a control message.
	   *
	   * @param {Buffer} data Data to handle
	   * @return {(Error|RangeError|undefined)} A possible error
	   * @private
	   */
	  controlMessage(data, cb) {
	    if (this._opcode === 0x08) {
	      if (data.length === 0) {
	        this._loop = false;
	        this.emit('conclude', 1005, EMPTY_BUFFER);
	        this.end();
	      } else {
	        const code = data.readUInt16BE(0);

	        if (!isValidStatusCode(code)) {
	          const error = this.createError(
	            RangeError,
	            `invalid status code ${code}`,
	            true,
	            1002,
	            'WS_ERR_INVALID_CLOSE_CODE'
	          );

	          cb(error);
	          return;
	        }

	        const buf = new FastBuffer(
	          data.buffer,
	          data.byteOffset + 2,
	          data.length - 2
	        );

	        if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
	          const error = this.createError(
	            Error,
	            'invalid UTF-8 sequence',
	            true,
	            1007,
	            'WS_ERR_INVALID_UTF8'
	          );

	          cb(error);
	          return;
	        }

	        this._loop = false;
	        this.emit('conclude', code, buf);
	        this.end();
	      }

	      this._state = GET_INFO;
	      return;
	    }

	    if (this._allowSynchronousEvents) {
	      this.emit(this._opcode === 0x09 ? 'ping' : 'pong', data);
	      this._state = GET_INFO;
	    } else {
	      this._state = DEFER_EVENT;
	      setImmediate(() => {
	        this.emit(this._opcode === 0x09 ? 'ping' : 'pong', data);
	        this._state = GET_INFO;
	        this.startLoop(cb);
	      });
	    }
	  }

	  /**
	   * Builds an error object.
	   *
	   * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
	   * @param {String} message The error message
	   * @param {Boolean} prefix Specifies whether or not to add a default prefix to
	   *     `message`
	   * @param {Number} statusCode The status code
	   * @param {String} errorCode The exposed error code
	   * @return {(Error|RangeError)} The error
	   * @private
	   */
	  createError(ErrorCtor, message, prefix, statusCode, errorCode) {
	    this._loop = false;
	    this._errored = true;

	    const err = new ErrorCtor(
	      prefix ? `Invalid WebSocket frame: ${message}` : message
	    );

	    Error.captureStackTrace(err, this.createError);
	    err.code = errorCode;
	    err[kStatusCode] = statusCode;
	    return err;
	  }
	}

	receiver = Receiver;
	return receiver;
}

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^Duplex" }] */

var sender;
var hasRequiredSender;

function requireSender () {
	if (hasRequiredSender) return sender;
	hasRequiredSender = 1;

	const { Duplex } = require$$0$2;
	const { randomFillSync } = require$$1;
	const {
	  types: { isUint8Array }
	} = require$$2;

	const PerMessageDeflate = requirePermessageDeflate();
	const { EMPTY_BUFFER, kWebSocket, NOOP } = requireConstants();
	const { isBlob, isValidStatusCode } = requireValidation();
	const { mask: applyMask, toBuffer } = requireBufferUtil();

	const kByteLength = Symbol('kByteLength');
	const maskBuffer = Buffer.alloc(4);
	const RANDOM_POOL_SIZE = 8 * 1024;
	let randomPool;
	let randomPoolPointer = RANDOM_POOL_SIZE;

	const DEFAULT = 0;
	const DEFLATING = 1;
	const GET_BLOB_DATA = 2;

	/**
	 * HyBi Sender implementation.
	 */
	class Sender {
	  /**
	   * Creates a Sender instance.
	   *
	   * @param {Duplex} socket The connection socket
	   * @param {Object} [extensions] An object containing the negotiated extensions
	   * @param {Function} [generateMask] The function used to generate the masking
	   *     key
	   */
	  constructor(socket, extensions, generateMask) {
	    this._extensions = extensions || {};

	    if (generateMask) {
	      this._generateMask = generateMask;
	      this._maskBuffer = Buffer.alloc(4);
	    }

	    this._socket = socket;

	    this._firstFragment = true;
	    this._compress = false;

	    this._bufferedBytes = 0;
	    this._queue = [];
	    this._state = DEFAULT;
	    this.onerror = NOOP;
	    this[kWebSocket] = undefined;
	  }

	  /**
	   * Frames a piece of data according to the HyBi WebSocket protocol.
	   *
	   * @param {(Buffer|String)} data The data to frame
	   * @param {Object} options Options object
	   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
	   *     FIN bit
	   * @param {Function} [options.generateMask] The function used to generate the
	   *     masking key
	   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
	   *     `data`
	   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
	   *     key
	   * @param {Number} options.opcode The opcode
	   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
	   *     modified
	   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
	   *     RSV1 bit
	   * @return {(Buffer|String)[]} The framed data
	   * @public
	   */
	  static frame(data, options) {
	    let mask;
	    let merge = false;
	    let offset = 2;
	    let skipMasking = false;

	    if (options.mask) {
	      mask = options.maskBuffer || maskBuffer;

	      if (options.generateMask) {
	        options.generateMask(mask);
	      } else {
	        if (randomPoolPointer === RANDOM_POOL_SIZE) {
	          /* istanbul ignore else  */
	          if (randomPool === undefined) {
	            //
	            // This is lazily initialized because server-sent frames must not
	            // be masked so it may never be used.
	            //
	            randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
	          }

	          randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
	          randomPoolPointer = 0;
	        }

	        mask[0] = randomPool[randomPoolPointer++];
	        mask[1] = randomPool[randomPoolPointer++];
	        mask[2] = randomPool[randomPoolPointer++];
	        mask[3] = randomPool[randomPoolPointer++];
	      }

	      skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
	      offset = 6;
	    }

	    let dataLength;

	    if (typeof data === 'string') {
	      if (
	        (!options.mask || skipMasking) &&
	        options[kByteLength] !== undefined
	      ) {
	        dataLength = options[kByteLength];
	      } else {
	        data = Buffer.from(data);
	        dataLength = data.length;
	      }
	    } else {
	      dataLength = data.length;
	      merge = options.mask && options.readOnly && !skipMasking;
	    }

	    let payloadLength = dataLength;

	    if (dataLength >= 65536) {
	      offset += 8;
	      payloadLength = 127;
	    } else if (dataLength > 125) {
	      offset += 2;
	      payloadLength = 126;
	    }

	    const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);

	    target[0] = options.fin ? options.opcode | 0x80 : options.opcode;
	    if (options.rsv1) target[0] |= 0x40;

	    target[1] = payloadLength;

	    if (payloadLength === 126) {
	      target.writeUInt16BE(dataLength, 2);
	    } else if (payloadLength === 127) {
	      target[2] = target[3] = 0;
	      target.writeUIntBE(dataLength, 4, 6);
	    }

	    if (!options.mask) return [target, data];

	    target[1] |= 0x80;
	    target[offset - 4] = mask[0];
	    target[offset - 3] = mask[1];
	    target[offset - 2] = mask[2];
	    target[offset - 1] = mask[3];

	    if (skipMasking) return [target, data];

	    if (merge) {
	      applyMask(data, mask, target, offset, dataLength);
	      return [target];
	    }

	    applyMask(data, mask, data, 0, dataLength);
	    return [target, data];
	  }

	  /**
	   * Sends a close message to the other peer.
	   *
	   * @param {Number} [code] The status code component of the body
	   * @param {(String|Buffer)} [data] The message component of the body
	   * @param {Boolean} [mask=false] Specifies whether or not to mask the message
	   * @param {Function} [cb] Callback
	   * @public
	   */
	  close(code, data, mask, cb) {
	    let buf;

	    if (code === undefined) {
	      buf = EMPTY_BUFFER;
	    } else if (typeof code !== 'number' || !isValidStatusCode(code)) {
	      throw new TypeError('First argument must be a valid error code number');
	    } else if (data === undefined || !data.length) {
	      buf = Buffer.allocUnsafe(2);
	      buf.writeUInt16BE(code, 0);
	    } else {
	      const length = Buffer.byteLength(data);

	      if (length > 123) {
	        throw new RangeError('The message must not be greater than 123 bytes');
	      }

	      buf = Buffer.allocUnsafe(2 + length);
	      buf.writeUInt16BE(code, 0);

	      if (typeof data === 'string') {
	        buf.write(data, 2);
	      } else if (isUint8Array(data)) {
	        buf.set(data, 2);
	      } else {
	        throw new TypeError('Second argument must be a string or a Uint8Array');
	      }
	    }

	    const options = {
	      [kByteLength]: buf.length,
	      fin: true,
	      generateMask: this._generateMask,
	      mask,
	      maskBuffer: this._maskBuffer,
	      opcode: 0x08,
	      readOnly: false,
	      rsv1: false
	    };

	    if (this._state !== DEFAULT) {
	      this.enqueue([this.dispatch, buf, false, options, cb]);
	    } else {
	      this.sendFrame(Sender.frame(buf, options), cb);
	    }
	  }

	  /**
	   * Sends a ping message to the other peer.
	   *
	   * @param {*} data The message to send
	   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
	   * @param {Function} [cb] Callback
	   * @public
	   */
	  ping(data, mask, cb) {
	    let byteLength;
	    let readOnly;

	    if (typeof data === 'string') {
	      byteLength = Buffer.byteLength(data);
	      readOnly = false;
	    } else if (isBlob(data)) {
	      byteLength = data.size;
	      readOnly = false;
	    } else {
	      data = toBuffer(data);
	      byteLength = data.length;
	      readOnly = toBuffer.readOnly;
	    }

	    if (byteLength > 125) {
	      throw new RangeError('The data size must not be greater than 125 bytes');
	    }

	    const options = {
	      [kByteLength]: byteLength,
	      fin: true,
	      generateMask: this._generateMask,
	      mask,
	      maskBuffer: this._maskBuffer,
	      opcode: 0x09,
	      readOnly,
	      rsv1: false
	    };

	    if (isBlob(data)) {
	      if (this._state !== DEFAULT) {
	        this.enqueue([this.getBlobData, data, false, options, cb]);
	      } else {
	        this.getBlobData(data, false, options, cb);
	      }
	    } else if (this._state !== DEFAULT) {
	      this.enqueue([this.dispatch, data, false, options, cb]);
	    } else {
	      this.sendFrame(Sender.frame(data, options), cb);
	    }
	  }

	  /**
	   * Sends a pong message to the other peer.
	   *
	   * @param {*} data The message to send
	   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
	   * @param {Function} [cb] Callback
	   * @public
	   */
	  pong(data, mask, cb) {
	    let byteLength;
	    let readOnly;

	    if (typeof data === 'string') {
	      byteLength = Buffer.byteLength(data);
	      readOnly = false;
	    } else if (isBlob(data)) {
	      byteLength = data.size;
	      readOnly = false;
	    } else {
	      data = toBuffer(data);
	      byteLength = data.length;
	      readOnly = toBuffer.readOnly;
	    }

	    if (byteLength > 125) {
	      throw new RangeError('The data size must not be greater than 125 bytes');
	    }

	    const options = {
	      [kByteLength]: byteLength,
	      fin: true,
	      generateMask: this._generateMask,
	      mask,
	      maskBuffer: this._maskBuffer,
	      opcode: 0x0a,
	      readOnly,
	      rsv1: false
	    };

	    if (isBlob(data)) {
	      if (this._state !== DEFAULT) {
	        this.enqueue([this.getBlobData, data, false, options, cb]);
	      } else {
	        this.getBlobData(data, false, options, cb);
	      }
	    } else if (this._state !== DEFAULT) {
	      this.enqueue([this.dispatch, data, false, options, cb]);
	    } else {
	      this.sendFrame(Sender.frame(data, options), cb);
	    }
	  }

	  /**
	   * Sends a data message to the other peer.
	   *
	   * @param {*} data The message to send
	   * @param {Object} options Options object
	   * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
	   *     or text
	   * @param {Boolean} [options.compress=false] Specifies whether or not to
	   *     compress `data`
	   * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
	   *     last one
	   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
	   *     `data`
	   * @param {Function} [cb] Callback
	   * @public
	   */
	  send(data, options, cb) {
	    const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
	    let opcode = options.binary ? 2 : 1;
	    let rsv1 = options.compress;

	    let byteLength;
	    let readOnly;

	    if (typeof data === 'string') {
	      byteLength = Buffer.byteLength(data);
	      readOnly = false;
	    } else if (isBlob(data)) {
	      byteLength = data.size;
	      readOnly = false;
	    } else {
	      data = toBuffer(data);
	      byteLength = data.length;
	      readOnly = toBuffer.readOnly;
	    }

	    if (this._firstFragment) {
	      this._firstFragment = false;
	      if (
	        rsv1 &&
	        perMessageDeflate &&
	        perMessageDeflate.params[
	          perMessageDeflate._isServer
	            ? 'server_no_context_takeover'
	            : 'client_no_context_takeover'
	        ]
	      ) {
	        rsv1 = byteLength >= perMessageDeflate._threshold;
	      }
	      this._compress = rsv1;
	    } else {
	      rsv1 = false;
	      opcode = 0;
	    }

	    if (options.fin) this._firstFragment = true;

	    const opts = {
	      [kByteLength]: byteLength,
	      fin: options.fin,
	      generateMask: this._generateMask,
	      mask: options.mask,
	      maskBuffer: this._maskBuffer,
	      opcode,
	      readOnly,
	      rsv1
	    };

	    if (isBlob(data)) {
	      if (this._state !== DEFAULT) {
	        this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
	      } else {
	        this.getBlobData(data, this._compress, opts, cb);
	      }
	    } else if (this._state !== DEFAULT) {
	      this.enqueue([this.dispatch, data, this._compress, opts, cb]);
	    } else {
	      this.dispatch(data, this._compress, opts, cb);
	    }
	  }

	  /**
	   * Gets the contents of a blob as binary data.
	   *
	   * @param {Blob} blob The blob
	   * @param {Boolean} [compress=false] Specifies whether or not to compress
	   *     the data
	   * @param {Object} options Options object
	   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
	   *     FIN bit
	   * @param {Function} [options.generateMask] The function used to generate the
	   *     masking key
	   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
	   *     `data`
	   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
	   *     key
	   * @param {Number} options.opcode The opcode
	   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
	   *     modified
	   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
	   *     RSV1 bit
	   * @param {Function} [cb] Callback
	   * @private
	   */
	  getBlobData(blob, compress, options, cb) {
	    this._bufferedBytes += options[kByteLength];
	    this._state = GET_BLOB_DATA;

	    blob
	      .arrayBuffer()
	      .then((arrayBuffer) => {
	        if (this._socket.destroyed) {
	          const err = new Error(
	            'The socket was closed while the blob was being read'
	          );

	          //
	          // `callCallbacks` is called in the next tick to ensure that errors
	          // that might be thrown in the callbacks behave like errors thrown
	          // outside the promise chain.
	          //
	          process.nextTick(callCallbacks, this, err, cb);
	          return;
	        }

	        this._bufferedBytes -= options[kByteLength];
	        const data = toBuffer(arrayBuffer);

	        if (!compress) {
	          this._state = DEFAULT;
	          this.sendFrame(Sender.frame(data, options), cb);
	          this.dequeue();
	        } else {
	          this.dispatch(data, compress, options, cb);
	        }
	      })
	      .catch((err) => {
	        //
	        // `onError` is called in the next tick for the same reason that
	        // `callCallbacks` above is.
	        //
	        process.nextTick(onError, this, err, cb);
	      });
	  }

	  /**
	   * Dispatches a message.
	   *
	   * @param {(Buffer|String)} data The message to send
	   * @param {Boolean} [compress=false] Specifies whether or not to compress
	   *     `data`
	   * @param {Object} options Options object
	   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
	   *     FIN bit
	   * @param {Function} [options.generateMask] The function used to generate the
	   *     masking key
	   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
	   *     `data`
	   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
	   *     key
	   * @param {Number} options.opcode The opcode
	   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
	   *     modified
	   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
	   *     RSV1 bit
	   * @param {Function} [cb] Callback
	   * @private
	   */
	  dispatch(data, compress, options, cb) {
	    if (!compress) {
	      this.sendFrame(Sender.frame(data, options), cb);
	      return;
	    }

	    const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];

	    this._bufferedBytes += options[kByteLength];
	    this._state = DEFLATING;
	    perMessageDeflate.compress(data, options.fin, (_, buf) => {
	      if (this._socket.destroyed) {
	        const err = new Error(
	          'The socket was closed while data was being compressed'
	        );

	        callCallbacks(this, err, cb);
	        return;
	      }

	      this._bufferedBytes -= options[kByteLength];
	      this._state = DEFAULT;
	      options.readOnly = false;
	      this.sendFrame(Sender.frame(buf, options), cb);
	      this.dequeue();
	    });
	  }

	  /**
	   * Executes queued send operations.
	   *
	   * @private
	   */
	  dequeue() {
	    while (this._state === DEFAULT && this._queue.length) {
	      const params = this._queue.shift();

	      this._bufferedBytes -= params[3][kByteLength];
	      Reflect.apply(params[0], this, params.slice(1));
	    }
	  }

	  /**
	   * Enqueues a send operation.
	   *
	   * @param {Array} params Send operation parameters.
	   * @private
	   */
	  enqueue(params) {
	    this._bufferedBytes += params[3][kByteLength];
	    this._queue.push(params);
	  }

	  /**
	   * Sends a frame.
	   *
	   * @param {(Buffer | String)[]} list The frame to send
	   * @param {Function} [cb] Callback
	   * @private
	   */
	  sendFrame(list, cb) {
	    if (list.length === 2) {
	      this._socket.cork();
	      this._socket.write(list[0]);
	      this._socket.write(list[1], cb);
	      this._socket.uncork();
	    } else {
	      this._socket.write(list[0], cb);
	    }
	  }
	}

	sender = Sender;

	/**
	 * Calls queued callbacks with an error.
	 *
	 * @param {Sender} sender The `Sender` instance
	 * @param {Error} err The error to call the callbacks with
	 * @param {Function} [cb] The first callback
	 * @private
	 */
	function callCallbacks(sender, err, cb) {
	  if (typeof cb === 'function') cb(err);

	  for (let i = 0; i < sender._queue.length; i++) {
	    const params = sender._queue[i];
	    const callback = params[params.length - 1];

	    if (typeof callback === 'function') callback(err);
	  }
	}

	/**
	 * Handles a `Sender` error.
	 *
	 * @param {Sender} sender The `Sender` instance
	 * @param {Error} err The error
	 * @param {Function} [cb] The first pending callback
	 * @private
	 */
	function onError(sender, err, cb) {
	  callCallbacks(sender, err, cb);
	  sender.onerror(err);
	}
	return sender;
}

var eventTarget;
var hasRequiredEventTarget;

function requireEventTarget () {
	if (hasRequiredEventTarget) return eventTarget;
	hasRequiredEventTarget = 1;

	const { kForOnEventAttribute, kListener } = requireConstants();

	const kCode = Symbol('kCode');
	const kData = Symbol('kData');
	const kError = Symbol('kError');
	const kMessage = Symbol('kMessage');
	const kReason = Symbol('kReason');
	const kTarget = Symbol('kTarget');
	const kType = Symbol('kType');
	const kWasClean = Symbol('kWasClean');

	/**
	 * Class representing an event.
	 */
	class Event {
	  /**
	   * Create a new `Event`.
	   *
	   * @param {String} type The name of the event
	   * @throws {TypeError} If the `type` argument is not specified
	   */
	  constructor(type) {
	    this[kTarget] = null;
	    this[kType] = type;
	  }

	  /**
	   * @type {*}
	   */
	  get target() {
	    return this[kTarget];
	  }

	  /**
	   * @type {String}
	   */
	  get type() {
	    return this[kType];
	  }
	}

	Object.defineProperty(Event.prototype, 'target', { enumerable: true });
	Object.defineProperty(Event.prototype, 'type', { enumerable: true });

	/**
	 * Class representing a close event.
	 *
	 * @extends Event
	 */
	class CloseEvent extends Event {
	  /**
	   * Create a new `CloseEvent`.
	   *
	   * @param {String} type The name of the event
	   * @param {Object} [options] A dictionary object that allows for setting
	   *     attributes via object members of the same name
	   * @param {Number} [options.code=0] The status code explaining why the
	   *     connection was closed
	   * @param {String} [options.reason=''] A human-readable string explaining why
	   *     the connection was closed
	   * @param {Boolean} [options.wasClean=false] Indicates whether or not the
	   *     connection was cleanly closed
	   */
	  constructor(type, options = {}) {
	    super(type);

	    this[kCode] = options.code === undefined ? 0 : options.code;
	    this[kReason] = options.reason === undefined ? '' : options.reason;
	    this[kWasClean] = options.wasClean === undefined ? false : options.wasClean;
	  }

	  /**
	   * @type {Number}
	   */
	  get code() {
	    return this[kCode];
	  }

	  /**
	   * @type {String}
	   */
	  get reason() {
	    return this[kReason];
	  }

	  /**
	   * @type {Boolean}
	   */
	  get wasClean() {
	    return this[kWasClean];
	  }
	}

	Object.defineProperty(CloseEvent.prototype, 'code', { enumerable: true });
	Object.defineProperty(CloseEvent.prototype, 'reason', { enumerable: true });
	Object.defineProperty(CloseEvent.prototype, 'wasClean', { enumerable: true });

	/**
	 * Class representing an error event.
	 *
	 * @extends Event
	 */
	class ErrorEvent extends Event {
	  /**
	   * Create a new `ErrorEvent`.
	   *
	   * @param {String} type The name of the event
	   * @param {Object} [options] A dictionary object that allows for setting
	   *     attributes via object members of the same name
	   * @param {*} [options.error=null] The error that generated this event
	   * @param {String} [options.message=''] The error message
	   */
	  constructor(type, options = {}) {
	    super(type);

	    this[kError] = options.error === undefined ? null : options.error;
	    this[kMessage] = options.message === undefined ? '' : options.message;
	  }

	  /**
	   * @type {*}
	   */
	  get error() {
	    return this[kError];
	  }

	  /**
	   * @type {String}
	   */
	  get message() {
	    return this[kMessage];
	  }
	}

	Object.defineProperty(ErrorEvent.prototype, 'error', { enumerable: true });
	Object.defineProperty(ErrorEvent.prototype, 'message', { enumerable: true });

	/**
	 * Class representing a message event.
	 *
	 * @extends Event
	 */
	class MessageEvent extends Event {
	  /**
	   * Create a new `MessageEvent`.
	   *
	   * @param {String} type The name of the event
	   * @param {Object} [options] A dictionary object that allows for setting
	   *     attributes via object members of the same name
	   * @param {*} [options.data=null] The message content
	   */
	  constructor(type, options = {}) {
	    super(type);

	    this[kData] = options.data === undefined ? null : options.data;
	  }

	  /**
	   * @type {*}
	   */
	  get data() {
	    return this[kData];
	  }
	}

	Object.defineProperty(MessageEvent.prototype, 'data', { enumerable: true });

	/**
	 * This provides methods for emulating the `EventTarget` interface. It's not
	 * meant to be used directly.
	 *
	 * @mixin
	 */
	const EventTarget = {
	  /**
	   * Register an event listener.
	   *
	   * @param {String} type A string representing the event type to listen for
	   * @param {(Function|Object)} handler The listener to add
	   * @param {Object} [options] An options object specifies characteristics about
	   *     the event listener
	   * @param {Boolean} [options.once=false] A `Boolean` indicating that the
	   *     listener should be invoked at most once after being added. If `true`,
	   *     the listener would be automatically removed when invoked.
	   * @public
	   */
	  addEventListener(type, handler, options = {}) {
	    for (const listener of this.listeners(type)) {
	      if (
	        !options[kForOnEventAttribute] &&
	        listener[kListener] === handler &&
	        !listener[kForOnEventAttribute]
	      ) {
	        return;
	      }
	    }

	    let wrapper;

	    if (type === 'message') {
	      wrapper = function onMessage(data, isBinary) {
	        const event = new MessageEvent('message', {
	          data: isBinary ? data : data.toString()
	        });

	        event[kTarget] = this;
	        callListener(handler, this, event);
	      };
	    } else if (type === 'close') {
	      wrapper = function onClose(code, message) {
	        const event = new CloseEvent('close', {
	          code,
	          reason: message.toString(),
	          wasClean: this._closeFrameReceived && this._closeFrameSent
	        });

	        event[kTarget] = this;
	        callListener(handler, this, event);
	      };
	    } else if (type === 'error') {
	      wrapper = function onError(error) {
	        const event = new ErrorEvent('error', {
	          error,
	          message: error.message
	        });

	        event[kTarget] = this;
	        callListener(handler, this, event);
	      };
	    } else if (type === 'open') {
	      wrapper = function onOpen() {
	        const event = new Event('open');

	        event[kTarget] = this;
	        callListener(handler, this, event);
	      };
	    } else {
	      return;
	    }

	    wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
	    wrapper[kListener] = handler;

	    if (options.once) {
	      this.once(type, wrapper);
	    } else {
	      this.on(type, wrapper);
	    }
	  },

	  /**
	   * Remove an event listener.
	   *
	   * @param {String} type A string representing the event type to remove
	   * @param {(Function|Object)} handler The listener to remove
	   * @public
	   */
	  removeEventListener(type, handler) {
	    for (const listener of this.listeners(type)) {
	      if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
	        this.removeListener(type, listener);
	        break;
	      }
	    }
	  }
	};

	eventTarget = {
	  CloseEvent,
	  ErrorEvent,
	  Event,
	  EventTarget,
	  MessageEvent
	};

	/**
	 * Call an event listener
	 *
	 * @param {(Function|Object)} listener The listener to call
	 * @param {*} thisArg The value to use as `this`` when calling the listener
	 * @param {Event} event The event to pass to the listener
	 * @private
	 */
	function callListener(listener, thisArg, event) {
	  if (typeof listener === 'object' && listener.handleEvent) {
	    listener.handleEvent.call(listener, event);
	  } else {
	    listener.call(thisArg, event);
	  }
	}
	return eventTarget;
}

var extension;
var hasRequiredExtension;

function requireExtension () {
	if (hasRequiredExtension) return extension;
	hasRequiredExtension = 1;

	const { tokenChars } = requireValidation();

	/**
	 * Adds an offer to the map of extension offers or a parameter to the map of
	 * parameters.
	 *
	 * @param {Object} dest The map of extension offers or parameters
	 * @param {String} name The extension or parameter name
	 * @param {(Object|Boolean|String)} elem The extension parameters or the
	 *     parameter value
	 * @private
	 */
	function push(dest, name, elem) {
	  if (dest[name] === undefined) dest[name] = [elem];
	  else dest[name].push(elem);
	}

	/**
	 * Parses the `Sec-WebSocket-Extensions` header into an object.
	 *
	 * @param {String} header The field value of the header
	 * @return {Object} The parsed object
	 * @public
	 */
	function parse(header) {
	  const offers = Object.create(null);
	  let params = Object.create(null);
	  let mustUnescape = false;
	  let isEscaping = false;
	  let inQuotes = false;
	  let extensionName;
	  let paramName;
	  let start = -1;
	  let code = -1;
	  let end = -1;
	  let i = 0;

	  for (; i < header.length; i++) {
	    code = header.charCodeAt(i);

	    if (extensionName === undefined) {
	      if (end === -1 && tokenChars[code] === 1) {
	        if (start === -1) start = i;
	      } else if (
	        i !== 0 &&
	        (code === 0x20 /* ' ' */ || code === 0x09) /* '\t' */
	      ) {
	        if (end === -1 && start !== -1) end = i;
	      } else if (code === 0x3b /* ';' */ || code === 0x2c /* ',' */) {
	        if (start === -1) {
	          throw new SyntaxError(`Unexpected character at index ${i}`);
	        }

	        if (end === -1) end = i;
	        const name = header.slice(start, end);
	        if (code === 0x2c) {
	          push(offers, name, params);
	          params = Object.create(null);
	        } else {
	          extensionName = name;
	        }

	        start = end = -1;
	      } else {
	        throw new SyntaxError(`Unexpected character at index ${i}`);
	      }
	    } else if (paramName === undefined) {
	      if (end === -1 && tokenChars[code] === 1) {
	        if (start === -1) start = i;
	      } else if (code === 0x20 || code === 0x09) {
	        if (end === -1 && start !== -1) end = i;
	      } else if (code === 0x3b || code === 0x2c) {
	        if (start === -1) {
	          throw new SyntaxError(`Unexpected character at index ${i}`);
	        }

	        if (end === -1) end = i;
	        push(params, header.slice(start, end), true);
	        if (code === 0x2c) {
	          push(offers, extensionName, params);
	          params = Object.create(null);
	          extensionName = undefined;
	        }

	        start = end = -1;
	      } else if (code === 0x3d /* '=' */ && start !== -1 && end === -1) {
	        paramName = header.slice(start, i);
	        start = end = -1;
	      } else {
	        throw new SyntaxError(`Unexpected character at index ${i}`);
	      }
	    } else {
	      //
	      // The value of a quoted-string after unescaping must conform to the
	      // token ABNF, so only token characters are valid.
	      // Ref: https://tools.ietf.org/html/rfc6455#section-9.1
	      //
	      if (isEscaping) {
	        if (tokenChars[code] !== 1) {
	          throw new SyntaxError(`Unexpected character at index ${i}`);
	        }
	        if (start === -1) start = i;
	        else if (!mustUnescape) mustUnescape = true;
	        isEscaping = false;
	      } else if (inQuotes) {
	        if (tokenChars[code] === 1) {
	          if (start === -1) start = i;
	        } else if (code === 0x22 /* '"' */ && start !== -1) {
	          inQuotes = false;
	          end = i;
	        } else if (code === 0x5c /* '\' */) {
	          isEscaping = true;
	        } else {
	          throw new SyntaxError(`Unexpected character at index ${i}`);
	        }
	      } else if (code === 0x22 && header.charCodeAt(i - 1) === 0x3d) {
	        inQuotes = true;
	      } else if (end === -1 && tokenChars[code] === 1) {
	        if (start === -1) start = i;
	      } else if (start !== -1 && (code === 0x20 || code === 0x09)) {
	        if (end === -1) end = i;
	      } else if (code === 0x3b || code === 0x2c) {
	        if (start === -1) {
	          throw new SyntaxError(`Unexpected character at index ${i}`);
	        }

	        if (end === -1) end = i;
	        let value = header.slice(start, end);
	        if (mustUnescape) {
	          value = value.replace(/\\/g, '');
	          mustUnescape = false;
	        }
	        push(params, paramName, value);
	        if (code === 0x2c) {
	          push(offers, extensionName, params);
	          params = Object.create(null);
	          extensionName = undefined;
	        }

	        paramName = undefined;
	        start = end = -1;
	      } else {
	        throw new SyntaxError(`Unexpected character at index ${i}`);
	      }
	    }
	  }

	  if (start === -1 || inQuotes || code === 0x20 || code === 0x09) {
	    throw new SyntaxError('Unexpected end of input');
	  }

	  if (end === -1) end = i;
	  const token = header.slice(start, end);
	  if (extensionName === undefined) {
	    push(offers, token, params);
	  } else {
	    if (paramName === undefined) {
	      push(params, token, true);
	    } else if (mustUnescape) {
	      push(params, paramName, token.replace(/\\/g, ''));
	    } else {
	      push(params, paramName, token);
	    }
	    push(offers, extensionName, params);
	  }

	  return offers;
	}

	/**
	 * Builds the `Sec-WebSocket-Extensions` header field value.
	 *
	 * @param {Object} extensions The map of extensions and parameters to format
	 * @return {String} A string representing the given object
	 * @public
	 */
	function format(extensions) {
	  return Object.keys(extensions)
	    .map((extension) => {
	      let configurations = extensions[extension];
	      if (!Array.isArray(configurations)) configurations = [configurations];
	      return configurations
	        .map((params) => {
	          return [extension]
	            .concat(
	              Object.keys(params).map((k) => {
	                let values = params[k];
	                if (!Array.isArray(values)) values = [values];
	                return values
	                  .map((v) => (v === true ? k : `${k}=${v}`))
	                  .join('; ');
	              })
	            )
	            .join('; ');
	        })
	        .join(', ');
	    })
	    .join(', ');
	}

	extension = { format, parse };
	return extension;
}

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^Duplex|Readable$", "caughtErrors": "none" }] */

var websocket;
var hasRequiredWebsocket;

function requireWebsocket () {
	if (hasRequiredWebsocket) return websocket;
	hasRequiredWebsocket = 1;

	const EventEmitter = require$$0$3;
	const https = require$$1$1;
	const http = require$$2$1;
	const net = require$$3;
	const tls = require$$4;
	const { randomBytes, createHash } = require$$1;
	const { Duplex, Readable } = require$$0$2;
	const { URL } = require$$7;

	const PerMessageDeflate = requirePermessageDeflate();
	const Receiver = requireReceiver();
	const Sender = requireSender();
	const { isBlob } = requireValidation();

	const {
	  BINARY_TYPES,
	  CLOSE_TIMEOUT,
	  EMPTY_BUFFER,
	  GUID,
	  kForOnEventAttribute,
	  kListener,
	  kStatusCode,
	  kWebSocket,
	  NOOP
	} = requireConstants();
	const {
	  EventTarget: { addEventListener, removeEventListener }
	} = requireEventTarget();
	const { format, parse } = requireExtension();
	const { toBuffer } = requireBufferUtil();

	const kAborted = Symbol('kAborted');
	const protocolVersions = [8, 13];
	const readyStates = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
	const subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;

	/**
	 * Class representing a WebSocket.
	 *
	 * @extends EventEmitter
	 */
	class WebSocket extends EventEmitter {
	  /**
	   * Create a new `WebSocket`.
	   *
	   * @param {(String|URL)} address The URL to which to connect
	   * @param {(String|String[])} [protocols] The subprotocols
	   * @param {Object} [options] Connection options
	   */
	  constructor(address, protocols, options) {
	    super();

	    this._binaryType = BINARY_TYPES[0];
	    this._closeCode = 1006;
	    this._closeFrameReceived = false;
	    this._closeFrameSent = false;
	    this._closeMessage = EMPTY_BUFFER;
	    this._closeTimer = null;
	    this._errorEmitted = false;
	    this._extensions = {};
	    this._paused = false;
	    this._protocol = '';
	    this._readyState = WebSocket.CONNECTING;
	    this._receiver = null;
	    this._sender = null;
	    this._socket = null;

	    if (address !== null) {
	      this._bufferedAmount = 0;
	      this._isServer = false;
	      this._redirects = 0;

	      if (protocols === undefined) {
	        protocols = [];
	      } else if (!Array.isArray(protocols)) {
	        if (typeof protocols === 'object' && protocols !== null) {
	          options = protocols;
	          protocols = [];
	        } else {
	          protocols = [protocols];
	        }
	      }

	      initAsClient(this, address, protocols, options);
	    } else {
	      this._autoPong = options.autoPong;
	      this._closeTimeout = options.closeTimeout;
	      this._isServer = true;
	    }
	  }

	  /**
	   * For historical reasons, the custom "nodebuffer" type is used by the default
	   * instead of "blob".
	   *
	   * @type {String}
	   */
	  get binaryType() {
	    return this._binaryType;
	  }

	  set binaryType(type) {
	    if (!BINARY_TYPES.includes(type)) return;

	    this._binaryType = type;

	    //
	    // Allow to change `binaryType` on the fly.
	    //
	    if (this._receiver) this._receiver._binaryType = type;
	  }

	  /**
	   * @type {Number}
	   */
	  get bufferedAmount() {
	    if (!this._socket) return this._bufferedAmount;

	    return this._socket._writableState.length + this._sender._bufferedBytes;
	  }

	  /**
	   * @type {String}
	   */
	  get extensions() {
	    return Object.keys(this._extensions).join();
	  }

	  /**
	   * @type {Boolean}
	   */
	  get isPaused() {
	    return this._paused;
	  }

	  /**
	   * @type {Function}
	   */
	  /* istanbul ignore next */
	  get onclose() {
	    return null;
	  }

	  /**
	   * @type {Function}
	   */
	  /* istanbul ignore next */
	  get onerror() {
	    return null;
	  }

	  /**
	   * @type {Function}
	   */
	  /* istanbul ignore next */
	  get onopen() {
	    return null;
	  }

	  /**
	   * @type {Function}
	   */
	  /* istanbul ignore next */
	  get onmessage() {
	    return null;
	  }

	  /**
	   * @type {String}
	   */
	  get protocol() {
	    return this._protocol;
	  }

	  /**
	   * @type {Number}
	   */
	  get readyState() {
	    return this._readyState;
	  }

	  /**
	   * @type {String}
	   */
	  get url() {
	    return this._url;
	  }

	  /**
	   * Set up the socket and the internal resources.
	   *
	   * @param {Duplex} socket The network socket between the server and client
	   * @param {Buffer} head The first packet of the upgraded stream
	   * @param {Object} options Options object
	   * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
	   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
	   *     multiple times in the same tick
	   * @param {Function} [options.generateMask] The function used to generate the
	   *     masking key
	   * @param {Number} [options.maxBufferedChunks=0] The maximum number of
	   *     buffered data chunks
	   * @param {Number} [options.maxFragments=0] The maximum number of message
	   *     fragments
	   * @param {Number} [options.maxPayload=0] The maximum allowed message size
	   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
	   *     not to skip UTF-8 validation for text and close messages
	   * @private
	   */
	  setSocket(socket, head, options) {
	    const receiver = new Receiver({
	      allowSynchronousEvents: options.allowSynchronousEvents,
	      binaryType: this.binaryType,
	      extensions: this._extensions,
	      isServer: this._isServer,
	      maxBufferedChunks: options.maxBufferedChunks,
	      maxFragments: options.maxFragments,
	      maxPayload: options.maxPayload,
	      skipUTF8Validation: options.skipUTF8Validation
	    });

	    const sender = new Sender(socket, this._extensions, options.generateMask);

	    this._receiver = receiver;
	    this._sender = sender;
	    this._socket = socket;

	    receiver[kWebSocket] = this;
	    sender[kWebSocket] = this;
	    socket[kWebSocket] = this;

	    receiver.on('conclude', receiverOnConclude);
	    receiver.on('drain', receiverOnDrain);
	    receiver.on('error', receiverOnError);
	    receiver.on('message', receiverOnMessage);
	    receiver.on('ping', receiverOnPing);
	    receiver.on('pong', receiverOnPong);

	    sender.onerror = senderOnError;

	    //
	    // These methods may not be available if `socket` is just a `Duplex`.
	    //
	    if (socket.setTimeout) socket.setTimeout(0);
	    if (socket.setNoDelay) socket.setNoDelay();

	    if (head.length > 0) socket.unshift(head);

	    socket.on('close', socketOnClose);
	    socket.on('data', socketOnData);
	    socket.on('end', socketOnEnd);
	    socket.on('error', socketOnError);

	    this._readyState = WebSocket.OPEN;
	    this.emit('open');
	  }

	  /**
	   * Emit the `'close'` event.
	   *
	   * @private
	   */
	  emitClose() {
	    if (!this._socket) {
	      this._readyState = WebSocket.CLOSED;
	      this.emit('close', this._closeCode, this._closeMessage);
	      return;
	    }

	    if (this._extensions[PerMessageDeflate.extensionName]) {
	      this._extensions[PerMessageDeflate.extensionName].cleanup();
	    }

	    this._receiver.removeAllListeners();
	    this._readyState = WebSocket.CLOSED;
	    this.emit('close', this._closeCode, this._closeMessage);
	  }

	  /**
	   * Start a closing handshake.
	   *
	   *          +----------+   +-----------+   +----------+
	   *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
	   *    |     +----------+   +-----------+   +----------+     |
	   *          +----------+   +-----------+         |
	   * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
	   *          +----------+   +-----------+   |
	   *    |           |                        |   +---+        |
	   *                +------------------------+-->|fin| - - - -
	   *    |         +---+                      |   +---+
	   *     - - - - -|fin|<---------------------+
	   *              +---+
	   *
	   * @param {Number} [code] Status code explaining why the connection is closing
	   * @param {(String|Buffer)} [data] The reason why the connection is
	   *     closing
	   * @public
	   */
	  close(code, data) {
	    if (this.readyState === WebSocket.CLOSED) return;
	    if (this.readyState === WebSocket.CONNECTING) {
	      const msg = 'WebSocket was closed before the connection was established';
	      abortHandshake(this, this._req, msg);
	      return;
	    }

	    if (this.readyState === WebSocket.CLOSING) {
	      if (
	        this._closeFrameSent &&
	        (this._closeFrameReceived || this._receiver._writableState.errorEmitted)
	      ) {
	        this._socket.end();
	      }

	      return;
	    }

	    this._readyState = WebSocket.CLOSING;
	    this._sender.close(code, data, !this._isServer, (err) => {
	      //
	      // This error is handled by the `'error'` listener on the socket. We only
	      // want to know if the close frame has been sent here.
	      //
	      if (err) return;

	      this._closeFrameSent = true;

	      if (
	        this._closeFrameReceived ||
	        this._receiver._writableState.errorEmitted
	      ) {
	        this._socket.end();
	      }
	    });

	    setCloseTimer(this);
	  }

	  /**
	   * Pause the socket.
	   *
	   * @public
	   */
	  pause() {
	    if (
	      this.readyState === WebSocket.CONNECTING ||
	      this.readyState === WebSocket.CLOSED
	    ) {
	      return;
	    }

	    this._paused = true;
	    this._socket.pause();
	  }

	  /**
	   * Send a ping.
	   *
	   * @param {*} [data] The data to send
	   * @param {Boolean} [mask] Indicates whether or not to mask `data`
	   * @param {Function} [cb] Callback which is executed when the ping is sent
	   * @public
	   */
	  ping(data, mask, cb) {
	    if (this.readyState === WebSocket.CONNECTING) {
	      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
	    }

	    if (typeof data === 'function') {
	      cb = data;
	      data = mask = undefined;
	    } else if (typeof mask === 'function') {
	      cb = mask;
	      mask = undefined;
	    }

	    if (typeof data === 'number') data = data.toString();

	    if (this.readyState !== WebSocket.OPEN) {
	      sendAfterClose(this, data, cb);
	      return;
	    }

	    if (mask === undefined) mask = !this._isServer;
	    this._sender.ping(data || EMPTY_BUFFER, mask, cb);
	  }

	  /**
	   * Send a pong.
	   *
	   * @param {*} [data] The data to send
	   * @param {Boolean} [mask] Indicates whether or not to mask `data`
	   * @param {Function} [cb] Callback which is executed when the pong is sent
	   * @public
	   */
	  pong(data, mask, cb) {
	    if (this.readyState === WebSocket.CONNECTING) {
	      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
	    }

	    if (typeof data === 'function') {
	      cb = data;
	      data = mask = undefined;
	    } else if (typeof mask === 'function') {
	      cb = mask;
	      mask = undefined;
	    }

	    if (typeof data === 'number') data = data.toString();

	    if (this.readyState !== WebSocket.OPEN) {
	      sendAfterClose(this, data, cb);
	      return;
	    }

	    if (mask === undefined) mask = !this._isServer;
	    this._sender.pong(data || EMPTY_BUFFER, mask, cb);
	  }

	  /**
	   * Resume the socket.
	   *
	   * @public
	   */
	  resume() {
	    if (
	      this.readyState === WebSocket.CONNECTING ||
	      this.readyState === WebSocket.CLOSED
	    ) {
	      return;
	    }

	    this._paused = false;
	    if (!this._receiver._writableState.needDrain) this._socket.resume();
	  }

	  /**
	   * Send a data message.
	   *
	   * @param {*} data The message to send
	   * @param {Object} [options] Options object
	   * @param {Boolean} [options.binary] Specifies whether `data` is binary or
	   *     text
	   * @param {Boolean} [options.compress] Specifies whether or not to compress
	   *     `data`
	   * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
	   *     last one
	   * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
	   * @param {Function} [cb] Callback which is executed when data is written out
	   * @public
	   */
	  send(data, options, cb) {
	    if (this.readyState === WebSocket.CONNECTING) {
	      throw new Error('WebSocket is not open: readyState 0 (CONNECTING)');
	    }

	    if (typeof options === 'function') {
	      cb = options;
	      options = {};
	    }

	    if (typeof data === 'number') data = data.toString();

	    if (this.readyState !== WebSocket.OPEN) {
	      sendAfterClose(this, data, cb);
	      return;
	    }

	    const opts = {
	      binary: typeof data !== 'string',
	      mask: !this._isServer,
	      compress: true,
	      fin: true,
	      ...options
	    };

	    if (!this._extensions[PerMessageDeflate.extensionName]) {
	      opts.compress = false;
	    }

	    this._sender.send(data || EMPTY_BUFFER, opts, cb);
	  }

	  /**
	   * Forcibly close the connection.
	   *
	   * @public
	   */
	  terminate() {
	    if (this.readyState === WebSocket.CLOSED) return;
	    if (this.readyState === WebSocket.CONNECTING) {
	      const msg = 'WebSocket was closed before the connection was established';
	      abortHandshake(this, this._req, msg);
	      return;
	    }

	    if (this._socket) {
	      this._readyState = WebSocket.CLOSING;
	      this._socket.destroy();
	    }
	  }
	}

	/**
	 * @constant {Number} CONNECTING
	 * @memberof WebSocket
	 */
	Object.defineProperty(WebSocket, 'CONNECTING', {
	  enumerable: true,
	  value: readyStates.indexOf('CONNECTING')
	});

	/**
	 * @constant {Number} CONNECTING
	 * @memberof WebSocket.prototype
	 */
	Object.defineProperty(WebSocket.prototype, 'CONNECTING', {
	  enumerable: true,
	  value: readyStates.indexOf('CONNECTING')
	});

	/**
	 * @constant {Number} OPEN
	 * @memberof WebSocket
	 */
	Object.defineProperty(WebSocket, 'OPEN', {
	  enumerable: true,
	  value: readyStates.indexOf('OPEN')
	});

	/**
	 * @constant {Number} OPEN
	 * @memberof WebSocket.prototype
	 */
	Object.defineProperty(WebSocket.prototype, 'OPEN', {
	  enumerable: true,
	  value: readyStates.indexOf('OPEN')
	});

	/**
	 * @constant {Number} CLOSING
	 * @memberof WebSocket
	 */
	Object.defineProperty(WebSocket, 'CLOSING', {
	  enumerable: true,
	  value: readyStates.indexOf('CLOSING')
	});

	/**
	 * @constant {Number} CLOSING
	 * @memberof WebSocket.prototype
	 */
	Object.defineProperty(WebSocket.prototype, 'CLOSING', {
	  enumerable: true,
	  value: readyStates.indexOf('CLOSING')
	});

	/**
	 * @constant {Number} CLOSED
	 * @memberof WebSocket
	 */
	Object.defineProperty(WebSocket, 'CLOSED', {
	  enumerable: true,
	  value: readyStates.indexOf('CLOSED')
	});

	/**
	 * @constant {Number} CLOSED
	 * @memberof WebSocket.prototype
	 */
	Object.defineProperty(WebSocket.prototype, 'CLOSED', {
	  enumerable: true,
	  value: readyStates.indexOf('CLOSED')
	});

	[
	  'binaryType',
	  'bufferedAmount',
	  'extensions',
	  'isPaused',
	  'protocol',
	  'readyState',
	  'url'
	].forEach((property) => {
	  Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
	});

	//
	// Add the `onopen`, `onerror`, `onclose`, and `onmessage` attributes.
	// See https://html.spec.whatwg.org/multipage/comms.html#the-websocket-interface
	//
	['open', 'error', 'close', 'message'].forEach((method) => {
	  Object.defineProperty(WebSocket.prototype, `on${method}`, {
	    enumerable: true,
	    get() {
	      for (const listener of this.listeners(method)) {
	        if (listener[kForOnEventAttribute]) return listener[kListener];
	      }

	      return null;
	    },
	    set(handler) {
	      for (const listener of this.listeners(method)) {
	        if (listener[kForOnEventAttribute]) {
	          this.removeListener(method, listener);
	          break;
	        }
	      }

	      if (typeof handler !== 'function') return;

	      this.addEventListener(method, handler, {
	        [kForOnEventAttribute]: true
	      });
	    }
	  });
	});

	WebSocket.prototype.addEventListener = addEventListener;
	WebSocket.prototype.removeEventListener = removeEventListener;

	websocket = WebSocket;

	/**
	 * Initialize a WebSocket client.
	 *
	 * @param {WebSocket} websocket The client to initialize
	 * @param {(String|URL)} address The URL to which to connect
	 * @param {Array} protocols The subprotocols
	 * @param {Object} [options] Connection options
	 * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether any
	 *     of the `'message'`, `'ping'`, and `'pong'` events can be emitted multiple
	 *     times in the same tick
	 * @param {Boolean} [options.autoPong=true] Specifies whether or not to
	 *     automatically send a pong in response to a ping
	 * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to wait
	 *     for the closing handshake to finish after `websocket.close()` is called
	 * @param {Function} [options.finishRequest] A function which can be used to
	 *     customize the headers of each http request before it is sent
	 * @param {Boolean} [options.followRedirects=false] Whether or not to follow
	 *     redirects
	 * @param {Function} [options.generateMask] The function used to generate the
	 *     masking key
	 * @param {Number} [options.handshakeTimeout] Timeout in milliseconds for the
	 *     handshake request
	 * @param {Number} [options.maxBufferedChunks=1048576] The maximum number of
	 *     buffered data chunks
	 * @param {Number} [options.maxFragments=131072] The maximum number of message
	 *     fragments
	 * @param {Number} [options.maxPayload=104857600] The maximum allowed message
	 *     size
	 * @param {Number} [options.maxRedirects=10] The maximum number of redirects
	 *     allowed
	 * @param {String} [options.origin] Value of the `Origin` or
	 *     `Sec-WebSocket-Origin` header
	 * @param {(Boolean|Object)} [options.perMessageDeflate=true] Enable/disable
	 *     permessage-deflate
	 * @param {Number} [options.protocolVersion=13] Value of the
	 *     `Sec-WebSocket-Version` header
	 * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
	 *     not to skip UTF-8 validation for text and close messages
	 * @private
	 */
	function initAsClient(websocket, address, protocols, options) {
	  const opts = {
	    allowSynchronousEvents: true,
	    autoPong: true,
	    closeTimeout: CLOSE_TIMEOUT,
	    protocolVersion: protocolVersions[1],
	    maxBufferedChunks: 1024 * 1024,
	    maxFragments: 128 * 1024,
	    maxPayload: 100 * 1024 * 1024,
	    skipUTF8Validation: false,
	    perMessageDeflate: true,
	    followRedirects: false,
	    maxRedirects: 10,
	    ...options,
	    socketPath: undefined,
	    hostname: undefined,
	    protocol: undefined,
	    timeout: undefined,
	    method: 'GET',
	    host: undefined,
	    path: undefined,
	    port: undefined
	  };

	  websocket._autoPong = opts.autoPong;
	  websocket._closeTimeout = opts.closeTimeout;

	  if (!protocolVersions.includes(opts.protocolVersion)) {
	    throw new RangeError(
	      `Unsupported protocol version: ${opts.protocolVersion} ` +
	        `(supported versions: ${protocolVersions.join(', ')})`
	    );
	  }

	  let parsedUrl;

	  if (address instanceof URL) {
	    parsedUrl = address;
	  } else {
	    try {
	      parsedUrl = new URL(address);
	    } catch {
	      throw new SyntaxError(`Invalid URL: ${address}`);
	    }
	  }

	  if (parsedUrl.protocol === 'http:') {
	    parsedUrl.protocol = 'ws:';
	  } else if (parsedUrl.protocol === 'https:') {
	    parsedUrl.protocol = 'wss:';
	  }

	  websocket._url = parsedUrl.href;

	  const isSecure = parsedUrl.protocol === 'wss:';
	  const isIpcUrl = parsedUrl.protocol === 'ws+unix:';
	  let invalidUrlMessage;

	  if (parsedUrl.protocol !== 'ws:' && !isSecure && !isIpcUrl) {
	    invalidUrlMessage =
	      'The URL\'s protocol must be one of "ws:", "wss:", ' +
	      '"http:", "https:", or "ws+unix:"';
	  } else if (isIpcUrl && !parsedUrl.pathname) {
	    invalidUrlMessage = "The URL's pathname is empty";
	  } else if (parsedUrl.hash) {
	    invalidUrlMessage = 'The URL contains a fragment identifier';
	  }

	  if (invalidUrlMessage) {
	    const err = new SyntaxError(invalidUrlMessage);

	    if (websocket._redirects === 0) {
	      throw err;
	    } else {
	      emitErrorAndClose(websocket, err);
	      return;
	    }
	  }

	  const defaultPort = isSecure ? 443 : 80;
	  const key = randomBytes(16).toString('base64');
	  const request = isSecure ? https.request : http.request;
	  const protocolSet = new Set();
	  let perMessageDeflate;

	  opts.createConnection =
	    opts.createConnection || (isSecure ? tlsConnect : netConnect);
	  opts.defaultPort = opts.defaultPort || defaultPort;
	  opts.port = parsedUrl.port || defaultPort;
	  opts.host = parsedUrl.hostname.startsWith('[')
	    ? parsedUrl.hostname.slice(1, -1)
	    : parsedUrl.hostname;
	  opts.headers = {
	    ...opts.headers,
	    'Sec-WebSocket-Version': opts.protocolVersion,
	    'Sec-WebSocket-Key': key,
	    Connection: 'Upgrade',
	    Upgrade: 'websocket'
	  };
	  opts.path = parsedUrl.pathname + parsedUrl.search;
	  opts.timeout = opts.handshakeTimeout;

	  if (opts.perMessageDeflate) {
	    perMessageDeflate = new PerMessageDeflate({
	      ...opts.perMessageDeflate,
	      isServer: false,
	      maxPayload: opts.maxPayload
	    });
	    opts.headers['Sec-WebSocket-Extensions'] = format({
	      [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
	    });
	  }
	  if (protocols.length) {
	    for (const protocol of protocols) {
	      if (
	        typeof protocol !== 'string' ||
	        !subprotocolRegex.test(protocol) ||
	        protocolSet.has(protocol)
	      ) {
	        throw new SyntaxError(
	          'An invalid or duplicated subprotocol was specified'
	        );
	      }

	      protocolSet.add(protocol);
	    }

	    opts.headers['Sec-WebSocket-Protocol'] = protocols.join(',');
	  }
	  if (opts.origin) {
	    if (opts.protocolVersion < 13) {
	      opts.headers['Sec-WebSocket-Origin'] = opts.origin;
	    } else {
	      opts.headers.Origin = opts.origin;
	    }
	  }
	  if (parsedUrl.username || parsedUrl.password) {
	    opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
	  }

	  if (isIpcUrl) {
	    const parts = opts.path.split(':');

	    opts.socketPath = parts[0];
	    opts.path = parts[1];
	  }

	  let req;

	  if (opts.followRedirects) {
	    if (websocket._redirects === 0) {
	      websocket._originalIpc = isIpcUrl;
	      websocket._originalSecure = isSecure;
	      websocket._originalHostOrSocketPath = isIpcUrl
	        ? opts.socketPath
	        : parsedUrl.host;

	      const headers = options && options.headers;

	      //
	      // Shallow copy the user provided options so that headers can be changed
	      // without mutating the original object.
	      //
	      options = { ...options, headers: {} };

	      if (headers) {
	        for (const [key, value] of Object.entries(headers)) {
	          options.headers[key.toLowerCase()] = value;
	        }
	      }
	    } else if (websocket.listenerCount('redirect') === 0) {
	      const isSameHost = isIpcUrl
	        ? websocket._originalIpc
	          ? opts.socketPath === websocket._originalHostOrSocketPath
	          : false
	        : websocket._originalIpc
	          ? false
	          : parsedUrl.host === websocket._originalHostOrSocketPath;

	      if (!isSameHost || (websocket._originalSecure && !isSecure)) {
	        //
	        // Match curl 7.77.0 behavior and drop the following headers. These
	        // headers are also dropped when following a redirect to a subdomain.
	        //
	        delete opts.headers.authorization;
	        delete opts.headers.cookie;

	        if (!isSameHost) delete opts.headers.host;

	        opts.auth = undefined;
	      }
	    }

	    //
	    // Match curl 7.77.0 behavior and make the first `Authorization` header win.
	    // If the `Authorization` header is set, then there is nothing to do as it
	    // will take precedence.
	    //
	    if (opts.auth && !options.headers.authorization) {
	      options.headers.authorization =
	        'Basic ' + Buffer.from(opts.auth).toString('base64');
	    }

	    req = websocket._req = request(opts);

	    if (websocket._redirects) {
	      //
	      // Unlike what is done for the `'upgrade'` event, no early exit is
	      // triggered here if the user calls `websocket.close()` or
	      // `websocket.terminate()` from a listener of the `'redirect'` event. This
	      // is because the user can also call `request.destroy()` with an error
	      // before calling `websocket.close()` or `websocket.terminate()` and this
	      // would result in an error being emitted on the `request` object with no
	      // `'error'` event listeners attached.
	      //
	      websocket.emit('redirect', websocket.url, req);
	    }
	  } else {
	    req = websocket._req = request(opts);
	  }

	  if (opts.timeout) {
	    req.on('timeout', () => {
	      abortHandshake(websocket, req, 'Opening handshake has timed out');
	    });
	  }

	  req.on('error', (err) => {
	    if (req === null || req[kAborted]) return;

	    req = websocket._req = null;
	    emitErrorAndClose(websocket, err);
	  });

	  req.on('response', (res) => {
	    const location = res.headers.location;
	    const statusCode = res.statusCode;

	    if (
	      location &&
	      opts.followRedirects &&
	      statusCode >= 300 &&
	      statusCode < 400
	    ) {
	      if (++websocket._redirects > opts.maxRedirects) {
	        abortHandshake(websocket, req, 'Maximum redirects exceeded');
	        return;
	      }

	      req.abort();

	      let addr;

	      try {
	        addr = new URL(location, address);
	      } catch (e) {
	        const err = new SyntaxError(`Invalid URL: ${location}`);
	        emitErrorAndClose(websocket, err);
	        return;
	      }

	      initAsClient(websocket, addr, protocols, options);
	    } else if (!websocket.emit('unexpected-response', req, res)) {
	      abortHandshake(
	        websocket,
	        req,
	        `Unexpected server response: ${res.statusCode}`
	      );
	    }
	  });

	  req.on('upgrade', (res, socket, head) => {
	    websocket.emit('upgrade', res);

	    //
	    // The user may have closed the connection from a listener of the
	    // `'upgrade'` event.
	    //
	    if (websocket.readyState !== WebSocket.CONNECTING) return;

	    req = websocket._req = null;

	    const upgrade = res.headers.upgrade;

	    if (upgrade === undefined || upgrade.toLowerCase() !== 'websocket') {
	      abortHandshake(websocket, socket, 'Invalid Upgrade header');
	      return;
	    }

	    const digest = createHash('sha1')
	      .update(key + GUID)
	      .digest('base64');

	    if (res.headers['sec-websocket-accept'] !== digest) {
	      abortHandshake(websocket, socket, 'Invalid Sec-WebSocket-Accept header');
	      return;
	    }

	    const serverProt = res.headers['sec-websocket-protocol'];
	    let protError;

	    if (serverProt !== undefined) {
	      if (!protocolSet.size) {
	        protError = 'Server sent a subprotocol but none was requested';
	      } else if (!protocolSet.has(serverProt)) {
	        protError = 'Server sent an invalid subprotocol';
	      }
	    } else if (protocolSet.size) {
	      protError = 'Server sent no subprotocol';
	    }

	    if (protError) {
	      abortHandshake(websocket, socket, protError);
	      return;
	    }

	    if (serverProt) websocket._protocol = serverProt;

	    const secWebSocketExtensions = res.headers['sec-websocket-extensions'];

	    if (secWebSocketExtensions !== undefined) {
	      if (!perMessageDeflate) {
	        const message =
	          'Server sent a Sec-WebSocket-Extensions header but no extension ' +
	          'was requested';
	        abortHandshake(websocket, socket, message);
	        return;
	      }

	      let extensions;

	      try {
	        extensions = parse(secWebSocketExtensions);
	      } catch (err) {
	        const message = 'Invalid Sec-WebSocket-Extensions header';
	        abortHandshake(websocket, socket, message);
	        return;
	      }

	      const extensionNames = Object.keys(extensions);

	      if (
	        extensionNames.length !== 1 ||
	        extensionNames[0] !== PerMessageDeflate.extensionName
	      ) {
	        const message = 'Server indicated an extension that was not requested';
	        abortHandshake(websocket, socket, message);
	        return;
	      }

	      try {
	        perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
	      } catch (err) {
	        const message = 'Invalid Sec-WebSocket-Extensions header';
	        abortHandshake(websocket, socket, message);
	        return;
	      }

	      websocket._extensions[PerMessageDeflate.extensionName] =
	        perMessageDeflate;
	    }

	    websocket.setSocket(socket, head, {
	      allowSynchronousEvents: opts.allowSynchronousEvents,
	      generateMask: opts.generateMask,
	      maxBufferedChunks: opts.maxBufferedChunks,
	      maxFragments: opts.maxFragments,
	      maxPayload: opts.maxPayload,
	      skipUTF8Validation: opts.skipUTF8Validation
	    });
	  });

	  if (opts.finishRequest) {
	    opts.finishRequest(req, websocket);
	  } else {
	    req.end();
	  }
	}

	/**
	 * Emit the `'error'` and `'close'` events.
	 *
	 * @param {WebSocket} websocket The WebSocket instance
	 * @param {Error} The error to emit
	 * @private
	 */
	function emitErrorAndClose(websocket, err) {
	  websocket._readyState = WebSocket.CLOSING;
	  //
	  // The following assignment is practically useless and is done only for
	  // consistency.
	  //
	  websocket._errorEmitted = true;
	  websocket.emit('error', err);
	  websocket.emitClose();
	}

	/**
	 * Create a `net.Socket` and initiate a connection.
	 *
	 * @param {Object} options Connection options
	 * @return {net.Socket} The newly created socket used to start the connection
	 * @private
	 */
	function netConnect(options) {
	  options.path = options.socketPath;
	  return net.connect(options);
	}

	/**
	 * Create a `tls.TLSSocket` and initiate a connection.
	 *
	 * @param {Object} options Connection options
	 * @return {tls.TLSSocket} The newly created socket used to start the connection
	 * @private
	 */
	function tlsConnect(options) {
	  options.path = undefined;

	  if (!options.servername && options.servername !== '') {
	    options.servername = net.isIP(options.host) ? '' : options.host;
	  }

	  return tls.connect(options);
	}

	/**
	 * Abort the handshake and emit an error.
	 *
	 * @param {WebSocket} websocket The WebSocket instance
	 * @param {(http.ClientRequest|net.Socket|tls.Socket)} stream The request to
	 *     abort or the socket to destroy
	 * @param {String} message The error message
	 * @private
	 */
	function abortHandshake(websocket, stream, message) {
	  websocket._readyState = WebSocket.CLOSING;

	  const err = new Error(message);
	  Error.captureStackTrace(err, abortHandshake);

	  if (stream.setHeader) {
	    stream[kAborted] = true;
	    stream.abort();

	    if (stream.socket && !stream.socket.destroyed) {
	      //
	      // On Node.js >= 14.3.0 `request.abort()` does not destroy the socket if
	      // called after the request completed. See
	      // https://github.com/websockets/ws/issues/1869.
	      //
	      stream.socket.destroy();
	    }

	    process.nextTick(emitErrorAndClose, websocket, err);
	  } else {
	    stream.destroy(err);
	    stream.once('error', websocket.emit.bind(websocket, 'error'));
	    stream.once('close', websocket.emitClose.bind(websocket));
	  }
	}

	/**
	 * Handle cases where the `ping()`, `pong()`, or `send()` methods are called
	 * when the `readyState` attribute is `CLOSING` or `CLOSED`.
	 *
	 * @param {WebSocket} websocket The WebSocket instance
	 * @param {*} [data] The data to send
	 * @param {Function} [cb] Callback
	 * @private
	 */
	function sendAfterClose(websocket, data, cb) {
	  if (data) {
	    const length = isBlob(data) ? data.size : toBuffer(data).length;

	    //
	    // The `_bufferedAmount` property is used only when the peer is a client and
	    // the opening handshake fails. Under these circumstances, in fact, the
	    // `setSocket()` method is not called, so the `_socket` and `_sender`
	    // properties are set to `null`.
	    //
	    if (websocket._socket) websocket._sender._bufferedBytes += length;
	    else websocket._bufferedAmount += length;
	  }

	  if (cb) {
	    const err = new Error(
	      `WebSocket is not open: readyState ${websocket.readyState} ` +
	        `(${readyStates[websocket.readyState]})`
	    );
	    process.nextTick(cb, err);
	  }
	}

	/**
	 * The listener of the `Receiver` `'conclude'` event.
	 *
	 * @param {Number} code The status code
	 * @param {Buffer} reason The reason for closing
	 * @private
	 */
	function receiverOnConclude(code, reason) {
	  const websocket = this[kWebSocket];

	  websocket._closeFrameReceived = true;
	  websocket._closeMessage = reason;
	  websocket._closeCode = code;

	  if (websocket._socket[kWebSocket] === undefined) return;

	  websocket._socket.removeListener('data', socketOnData);
	  process.nextTick(resume, websocket._socket);

	  if (code === 1005) websocket.close();
	  else websocket.close(code, reason);
	}

	/**
	 * The listener of the `Receiver` `'drain'` event.
	 *
	 * @private
	 */
	function receiverOnDrain() {
	  const websocket = this[kWebSocket];

	  if (!websocket.isPaused) websocket._socket.resume();
	}

	/**
	 * The listener of the `Receiver` `'error'` event.
	 *
	 * @param {(RangeError|Error)} err The emitted error
	 * @private
	 */
	function receiverOnError(err) {
	  const websocket = this[kWebSocket];

	  if (websocket._socket[kWebSocket] !== undefined) {
	    websocket._socket.removeListener('data', socketOnData);

	    //
	    // On Node.js < 14.0.0 the `'error'` event is emitted synchronously. See
	    // https://github.com/websockets/ws/issues/1940.
	    //
	    process.nextTick(resume, websocket._socket);

	    websocket.close(err[kStatusCode]);
	  }

	  if (!websocket._errorEmitted) {
	    websocket._errorEmitted = true;
	    websocket.emit('error', err);
	  }
	}

	/**
	 * The listener of the `Receiver` `'finish'` event.
	 *
	 * @private
	 */
	function receiverOnFinish() {
	  this[kWebSocket].emitClose();
	}

	/**
	 * The listener of the `Receiver` `'message'` event.
	 *
	 * @param {Buffer|ArrayBuffer|Buffer[])} data The message
	 * @param {Boolean} isBinary Specifies whether the message is binary or not
	 * @private
	 */
	function receiverOnMessage(data, isBinary) {
	  this[kWebSocket].emit('message', data, isBinary);
	}

	/**
	 * The listener of the `Receiver` `'ping'` event.
	 *
	 * @param {Buffer} data The data included in the ping frame
	 * @private
	 */
	function receiverOnPing(data) {
	  const websocket = this[kWebSocket];

	  if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
	  websocket.emit('ping', data);
	}

	/**
	 * The listener of the `Receiver` `'pong'` event.
	 *
	 * @param {Buffer} data The data included in the pong frame
	 * @private
	 */
	function receiverOnPong(data) {
	  this[kWebSocket].emit('pong', data);
	}

	/**
	 * Resume a readable stream
	 *
	 * @param {Readable} stream The readable stream
	 * @private
	 */
	function resume(stream) {
	  stream.resume();
	}

	/**
	 * The `Sender` error event handler.
	 *
	 * @param {Error} The error
	 * @private
	 */
	function senderOnError(err) {
	  const websocket = this[kWebSocket];

	  if (websocket.readyState === WebSocket.CLOSED) return;
	  if (websocket.readyState === WebSocket.OPEN) {
	    websocket._readyState = WebSocket.CLOSING;
	    setCloseTimer(websocket);
	  }

	  //
	  // `socket.end()` is used instead of `socket.destroy()` to allow the other
	  // peer to finish sending queued data. There is no need to set a timer here
	  // because `CLOSING` means that it is already set or not needed.
	  //
	  this._socket.end();

	  if (!websocket._errorEmitted) {
	    websocket._errorEmitted = true;
	    websocket.emit('error', err);
	  }
	}

	/**
	 * Set a timer to destroy the underlying raw socket of a WebSocket.
	 *
	 * @param {WebSocket} websocket The WebSocket instance
	 * @private
	 */
	function setCloseTimer(websocket) {
	  websocket._closeTimer = setTimeout(
	    websocket._socket.destroy.bind(websocket._socket),
	    websocket._closeTimeout
	  );
	}

	/**
	 * The listener of the socket `'close'` event.
	 *
	 * @private
	 */
	function socketOnClose() {
	  const websocket = this[kWebSocket];

	  this.removeListener('close', socketOnClose);
	  this.removeListener('data', socketOnData);
	  this.removeListener('end', socketOnEnd);

	  websocket._readyState = WebSocket.CLOSING;

	  //
	  // The close frame might not have been received or the `'end'` event emitted,
	  // for example, if the socket was destroyed due to an error. Ensure that the
	  // `receiver` stream is closed after writing any remaining buffered data to
	  // it. If the readable side of the socket is in flowing mode then there is no
	  // buffered data as everything has been already written. If instead, the
	  // socket is paused, any possible buffered data will be read as a single
	  // chunk.
	  //
	  if (
	    !this._readableState.endEmitted &&
	    !websocket._closeFrameReceived &&
	    !websocket._receiver._writableState.errorEmitted &&
	    this._readableState.length !== 0
	  ) {
	    const chunk = this.read(this._readableState.length);

	    websocket._receiver.write(chunk);
	  }

	  websocket._receiver.end();

	  this[kWebSocket] = undefined;

	  clearTimeout(websocket._closeTimer);

	  if (
	    websocket._receiver._writableState.finished ||
	    websocket._receiver._writableState.errorEmitted
	  ) {
	    websocket.emitClose();
	  } else {
	    websocket._receiver.on('error', receiverOnFinish);
	    websocket._receiver.on('finish', receiverOnFinish);
	  }
	}

	/**
	 * The listener of the socket `'data'` event.
	 *
	 * @param {Buffer} chunk A chunk of data
	 * @private
	 */
	function socketOnData(chunk) {
	  if (!this[kWebSocket]._receiver.write(chunk)) {
	    this.pause();
	  }
	}

	/**
	 * The listener of the socket `'end'` event.
	 *
	 * @private
	 */
	function socketOnEnd() {
	  const websocket = this[kWebSocket];

	  websocket._readyState = WebSocket.CLOSING;
	  websocket._receiver.end();
	  this.end();
	}

	/**
	 * The listener of the socket `'error'` event.
	 *
	 * @private
	 */
	function socketOnError() {
	  const websocket = this[kWebSocket];

	  this.removeListener('error', socketOnError);
	  this.on('error', NOOP);

	  if (websocket) {
	    websocket._readyState = WebSocket.CLOSING;
	    this.destroy();
	  }
	}
	return websocket;
}

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^WebSocket$" }] */

var stream;
var hasRequiredStream;

function requireStream () {
	if (hasRequiredStream) return stream;
	hasRequiredStream = 1;

	requireWebsocket();
	const { Duplex } = require$$0$2;

	/**
	 * Emits the `'close'` event on a stream.
	 *
	 * @param {Duplex} stream The stream.
	 * @private
	 */
	function emitClose(stream) {
	  stream.emit('close');
	}

	/**
	 * The listener of the `'end'` event.
	 *
	 * @private
	 */
	function duplexOnEnd() {
	  if (!this.destroyed && this._writableState.finished) {
	    this.destroy();
	  }
	}

	/**
	 * The listener of the `'error'` event.
	 *
	 * @param {Error} err The error
	 * @private
	 */
	function duplexOnError(err) {
	  this.removeListener('error', duplexOnError);
	  this.destroy();
	  if (this.listenerCount('error') === 0) {
	    // Do not suppress the throwing behavior.
	    this.emit('error', err);
	  }
	}

	/**
	 * Wraps a `WebSocket` in a duplex stream.
	 *
	 * @param {WebSocket} ws The `WebSocket` to wrap
	 * @param {Object} [options] The options for the `Duplex` constructor
	 * @return {Duplex} The duplex stream
	 * @public
	 */
	function createWebSocketStream(ws, options) {
	  let terminateOnDestroy = true;

	  const duplex = new Duplex({
	    ...options,
	    autoDestroy: false,
	    emitClose: false,
	    objectMode: false,
	    writableObjectMode: false
	  });

	  ws.on('message', function message(msg, isBinary) {
	    const data =
	      !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;

	    if (!duplex.push(data)) ws.pause();
	  });

	  ws.once('error', function error(err) {
	    if (duplex.destroyed) return;

	    // Prevent `ws.terminate()` from being called by `duplex._destroy()`.
	    //
	    // - If the `'error'` event is emitted before the `'open'` event, then
	    //   `ws.terminate()` is a noop as no socket is assigned.
	    // - Otherwise, the error is re-emitted by the listener of the `'error'`
	    //   event of the `Receiver` object. The listener already closes the
	    //   connection by calling `ws.close()`. This allows a close frame to be
	    //   sent to the other peer. If `ws.terminate()` is called right after this,
	    //   then the close frame might not be sent.
	    terminateOnDestroy = false;
	    duplex.destroy(err);
	  });

	  ws.once('close', function close() {
	    if (duplex.destroyed) return;

	    duplex.push(null);
	  });

	  duplex._destroy = function (err, callback) {
	    if (ws.readyState === ws.CLOSED) {
	      callback(err);
	      process.nextTick(emitClose, duplex);
	      return;
	    }

	    let called = false;

	    ws.once('error', function error(err) {
	      called = true;
	      callback(err);
	    });

	    ws.once('close', function close() {
	      if (!called) callback(err);
	      process.nextTick(emitClose, duplex);
	    });

	    if (terminateOnDestroy) ws.terminate();
	  };

	  duplex._final = function (callback) {
	    if (ws.readyState === ws.CONNECTING) {
	      ws.once('open', function open() {
	        duplex._final(callback);
	      });
	      return;
	    }

	    // If the value of the `_socket` property is `null` it means that `ws` is a
	    // client websocket and the handshake failed. In fact, when this happens, a
	    // socket is never assigned to the websocket. Wait for the `'error'` event
	    // that will be emitted by the websocket.
	    if (ws._socket === null) return;

	    if (ws._socket._writableState.finished) {
	      callback();
	      if (duplex._readableState.endEmitted) duplex.destroy();
	    } else {
	      ws._socket.once('finish', function finish() {
	        // `duplex` is not destroyed here because the `'end'` event will be
	        // emitted on `duplex` after this `'finish'` event. The EOF signaling
	        // `null` chunk is, in fact, pushed when the websocket emits `'close'`.
	        callback();
	      });
	      ws.close();
	    }
	  };

	  duplex._read = function () {
	    if (ws.isPaused) ws.resume();
	  };

	  duplex._write = function (chunk, encoding, callback) {
	    if (ws.readyState === ws.CONNECTING) {
	      ws.once('open', function open() {
	        duplex._write(chunk, encoding, callback);
	      });
	      return;
	    }

	    ws.send(chunk, callback);
	  };

	  duplex.on('end', duplexOnEnd);
	  duplex.on('error', duplexOnError);
	  return duplex;
	}

	stream = createWebSocketStream;
	return stream;
}

requireStream();

requireExtension();

requirePermessageDeflate();

requireReceiver();

requireSender();

var subprotocol;
var hasRequiredSubprotocol;

function requireSubprotocol () {
	if (hasRequiredSubprotocol) return subprotocol;
	hasRequiredSubprotocol = 1;

	const { tokenChars } = requireValidation();

	/**
	 * Parses the `Sec-WebSocket-Protocol` header into a set of subprotocol names.
	 *
	 * @param {String} header The field value of the header
	 * @return {Set} The subprotocol names
	 * @public
	 */
	function parse(header) {
	  const protocols = new Set();
	  let start = -1;
	  let end = -1;
	  let i = 0;

	  for (i; i < header.length; i++) {
	    const code = header.charCodeAt(i);

	    if (end === -1 && tokenChars[code] === 1) {
	      if (start === -1) start = i;
	    } else if (
	      i !== 0 &&
	      (code === 0x20 /* ' ' */ || code === 0x09) /* '\t' */
	    ) {
	      if (end === -1 && start !== -1) end = i;
	    } else if (code === 0x2c /* ',' */) {
	      if (start === -1) {
	        throw new SyntaxError(`Unexpected character at index ${i}`);
	      }

	      if (end === -1) end = i;

	      const protocol = header.slice(start, end);

	      if (protocols.has(protocol)) {
	        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
	      }

	      protocols.add(protocol);
	      start = end = -1;
	    } else {
	      throw new SyntaxError(`Unexpected character at index ${i}`);
	    }
	  }

	  if (start === -1 || end !== -1) {
	    throw new SyntaxError('Unexpected end of input');
	  }

	  const protocol = header.slice(start, i);

	  if (protocols.has(protocol)) {
	    throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
	  }

	  protocols.add(protocol);
	  return protocols;
	}

	subprotocol = { parse };
	return subprotocol;
}

requireSubprotocol();

var websocketExports = requireWebsocket();
var WebSocket = /*@__PURE__*/getDefaultExportFromCjs(websocketExports);

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^Duplex$", "caughtErrors": "none" }] */

var websocketServer;
var hasRequiredWebsocketServer;

function requireWebsocketServer () {
	if (hasRequiredWebsocketServer) return websocketServer;
	hasRequiredWebsocketServer = 1;

	const EventEmitter = require$$0$3;
	const http = require$$2$1;
	const { Duplex } = require$$0$2;
	const { createHash } = require$$1;

	const extension = requireExtension();
	const PerMessageDeflate = requirePermessageDeflate();
	const subprotocol = requireSubprotocol();
	const WebSocket = requireWebsocket();
	const { CLOSE_TIMEOUT, GUID, kWebSocket } = requireConstants();

	const keyRegex = /^[+/0-9A-Za-z]{22}==$/;

	const RUNNING = 0;
	const CLOSING = 1;
	const CLOSED = 2;

	/**
	 * Class representing a WebSocket server.
	 *
	 * @extends EventEmitter
	 */
	class WebSocketServer extends EventEmitter {
	  /**
	   * Create a `WebSocketServer` instance.
	   *
	   * @param {Object} options Configuration options
	   * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
	   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
	   *     multiple times in the same tick
	   * @param {Boolean} [options.autoPong=true] Specifies whether or not to
	   *     automatically send a pong in response to a ping
	   * @param {Number} [options.backlog=511] The maximum length of the queue of
	   *     pending connections
	   * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
	   *     track clients
	   * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
	   *     wait for the closing handshake to finish after `websocket.close()` is
	   *     called
	   * @param {Function} [options.handleProtocols] A hook to handle protocols
	   * @param {String} [options.host] The hostname where to bind the server
	   * @param {Number} [options.maxBufferedChunks=1048576] The maximum number of
	   *     buffered data chunks
	   * @param {Number} [options.maxFragments=131072] The maximum number of message
	   *     fragments
	   * @param {Number} [options.maxPayload=104857600] The maximum allowed message
	   *     size
	   * @param {Boolean} [options.noServer=false] Enable no server mode
	   * @param {String} [options.path] Accept only connections matching this path
	   * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
	   *     permessage-deflate
	   * @param {Number} [options.port] The port where to bind the server
	   * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
	   *     server to use
	   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
	   *     not to skip UTF-8 validation for text and close messages
	   * @param {Function} [options.verifyClient] A hook to reject connections
	   * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
	   *     class to use. It must be the `WebSocket` class or class that extends it
	   * @param {Function} [callback] A listener for the `listening` event
	   */
	  constructor(options, callback) {
	    super();

	    options = {
	      allowSynchronousEvents: true,
	      autoPong: true,
	      maxBufferedChunks: 1024 * 1024,
	      maxFragments: 128 * 1024,
	      maxPayload: 100 * 1024 * 1024,
	      skipUTF8Validation: false,
	      perMessageDeflate: false,
	      handleProtocols: null,
	      clientTracking: true,
	      closeTimeout: CLOSE_TIMEOUT,
	      verifyClient: null,
	      noServer: false,
	      backlog: null, // use default (511 as implemented in net.js)
	      server: null,
	      host: null,
	      path: null,
	      port: null,
	      WebSocket,
	      ...options
	    };

	    if (
	      (options.port == null && !options.server && !options.noServer) ||
	      (options.port != null && (options.server || options.noServer)) ||
	      (options.server && options.noServer)
	    ) {
	      throw new TypeError(
	        'One and only one of the "port", "server", or "noServer" options ' +
	          'must be specified'
	      );
	    }

	    if (options.port != null) {
	      this._server = http.createServer((req, res) => {
	        const body = http.STATUS_CODES[426];

	        res.writeHead(426, {
	          'Content-Length': body.length,
	          'Content-Type': 'text/plain'
	        });
	        res.end(body);
	      });
	      this._server.listen(
	        options.port,
	        options.host,
	        options.backlog,
	        callback
	      );
	    } else if (options.server) {
	      this._server = options.server;
	    }

	    if (this._server) {
	      const emitConnection = this.emit.bind(this, 'connection');

	      this._removeListeners = addListeners(this._server, {
	        listening: this.emit.bind(this, 'listening'),
	        error: this.emit.bind(this, 'error'),
	        upgrade: (req, socket, head) => {
	          this.handleUpgrade(req, socket, head, emitConnection);
	        }
	      });
	    }

	    if (options.perMessageDeflate === true) options.perMessageDeflate = {};
	    if (options.clientTracking) {
	      this.clients = new Set();
	      this._shouldEmitClose = false;
	    }

	    this.options = options;
	    this._state = RUNNING;
	  }

	  /**
	   * Returns the bound address, the address family name, and port of the server
	   * as reported by the operating system if listening on an IP socket.
	   * If the server is listening on a pipe or UNIX domain socket, the name is
	   * returned as a string.
	   *
	   * @return {(Object|String|null)} The address of the server
	   * @public
	   */
	  address() {
	    if (this.options.noServer) {
	      throw new Error('The server is operating in "noServer" mode');
	    }

	    if (!this._server) return null;
	    return this._server.address();
	  }

	  /**
	   * Stop the server from accepting new connections and emit the `'close'` event
	   * when all existing connections are closed.
	   *
	   * @param {Function} [cb] A one-time listener for the `'close'` event
	   * @public
	   */
	  close(cb) {
	    if (this._state === CLOSED) {
	      if (cb) {
	        this.once('close', () => {
	          cb(new Error('The server is not running'));
	        });
	      }

	      process.nextTick(emitClose, this);
	      return;
	    }

	    if (cb) this.once('close', cb);

	    if (this._state === CLOSING) return;
	    this._state = CLOSING;

	    if (this.options.noServer || this.options.server) {
	      if (this._server) {
	        this._removeListeners();
	        this._removeListeners = this._server = null;
	      }

	      if (this.clients) {
	        if (!this.clients.size) {
	          process.nextTick(emitClose, this);
	        } else {
	          this._shouldEmitClose = true;
	        }
	      } else {
	        process.nextTick(emitClose, this);
	      }
	    } else {
	      const server = this._server;

	      this._removeListeners();
	      this._removeListeners = this._server = null;

	      //
	      // The HTTP/S server was created internally. Close it, and rely on its
	      // `'close'` event.
	      //
	      server.close(() => {
	        emitClose(this);
	      });
	    }
	  }

	  /**
	   * See if a given request should be handled by this server instance.
	   *
	   * @param {http.IncomingMessage} req Request object to inspect
	   * @return {Boolean} `true` if the request is valid, else `false`
	   * @public
	   */
	  shouldHandle(req) {
	    if (this.options.path) {
	      const index = req.url.indexOf('?');
	      const pathname = index !== -1 ? req.url.slice(0, index) : req.url;

	      if (pathname !== this.options.path) return false;
	    }

	    return true;
	  }

	  /**
	   * Handle a HTTP Upgrade request.
	   *
	   * @param {http.IncomingMessage} req The request object
	   * @param {Duplex} socket The network socket between the server and client
	   * @param {Buffer} head The first packet of the upgraded stream
	   * @param {Function} cb Callback
	   * @public
	   */
	  handleUpgrade(req, socket, head, cb) {
	    socket.on('error', socketOnError);

	    const key = req.headers['sec-websocket-key'];
	    const upgrade = req.headers.upgrade;
	    const version = +req.headers['sec-websocket-version'];

	    if (req.method !== 'GET') {
	      const message = 'Invalid HTTP method';
	      abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
	      return;
	    }

	    if (upgrade === undefined || upgrade.toLowerCase() !== 'websocket') {
	      const message = 'Invalid Upgrade header';
	      abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
	      return;
	    }

	    if (key === undefined || !keyRegex.test(key)) {
	      const message = 'Missing or invalid Sec-WebSocket-Key header';
	      abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
	      return;
	    }

	    if (version !== 13 && version !== 8) {
	      const message = 'Missing or invalid Sec-WebSocket-Version header';
	      abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
	        'Sec-WebSocket-Version': '13, 8'
	      });
	      return;
	    }

	    if (!this.shouldHandle(req)) {
	      abortHandshake(socket, 400);
	      return;
	    }

	    const secWebSocketProtocol = req.headers['sec-websocket-protocol'];
	    let protocols = new Set();

	    if (secWebSocketProtocol !== undefined) {
	      try {
	        protocols = subprotocol.parse(secWebSocketProtocol);
	      } catch (err) {
	        const message = 'Invalid Sec-WebSocket-Protocol header';
	        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
	        return;
	      }
	    }

	    const secWebSocketExtensions = req.headers['sec-websocket-extensions'];
	    const extensions = {};

	    if (
	      this.options.perMessageDeflate &&
	      secWebSocketExtensions !== undefined
	    ) {
	      const perMessageDeflate = new PerMessageDeflate({
	        ...this.options.perMessageDeflate,
	        isServer: true,
	        maxPayload: this.options.maxPayload
	      });

	      try {
	        const offers = extension.parse(secWebSocketExtensions);

	        if (offers[PerMessageDeflate.extensionName]) {
	          perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
	          extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
	        }
	      } catch (err) {
	        const message =
	          'Invalid or unacceptable Sec-WebSocket-Extensions header';
	        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
	        return;
	      }
	    }

	    //
	    // Optionally call external client verification handler.
	    //
	    if (this.options.verifyClient) {
	      const info = {
	        origin:
	          req.headers[`${version === 8 ? 'sec-websocket-origin' : 'origin'}`],
	        secure: !!(req.socket.authorized || req.socket.encrypted),
	        req
	      };

	      if (this.options.verifyClient.length === 2) {
	        this.options.verifyClient(info, (verified, code, message, headers) => {
	          if (!verified) {
	            return abortHandshake(socket, code || 401, message, headers);
	          }

	          this.completeUpgrade(
	            extensions,
	            key,
	            protocols,
	            req,
	            socket,
	            head,
	            cb
	          );
	        });
	        return;
	      }

	      if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
	    }

	    this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
	  }

	  /**
	   * Upgrade the connection to WebSocket.
	   *
	   * @param {Object} extensions The accepted extensions
	   * @param {String} key The value of the `Sec-WebSocket-Key` header
	   * @param {Set} protocols The subprotocols
	   * @param {http.IncomingMessage} req The request object
	   * @param {Duplex} socket The network socket between the server and client
	   * @param {Buffer} head The first packet of the upgraded stream
	   * @param {Function} cb Callback
	   * @throws {Error} If called more than once with the same socket
	   * @private
	   */
	  completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
	    //
	    // Destroy the socket if the client has already sent a FIN packet.
	    //
	    if (!socket.readable || !socket.writable) return socket.destroy();

	    if (socket[kWebSocket]) {
	      throw new Error(
	        'server.handleUpgrade() was called more than once with the same ' +
	          'socket, possibly due to a misconfiguration'
	      );
	    }

	    if (this._state > RUNNING) return abortHandshake(socket, 503);

	    const digest = createHash('sha1')
	      .update(key + GUID)
	      .digest('base64');

	    const headers = [
	      'HTTP/1.1 101 Switching Protocols',
	      'Upgrade: websocket',
	      'Connection: Upgrade',
	      `Sec-WebSocket-Accept: ${digest}`
	    ];

	    const ws = new this.options.WebSocket(null, undefined, this.options);

	    if (protocols.size) {
	      //
	      // Optionally call external protocol selection handler.
	      //
	      const protocol = this.options.handleProtocols
	        ? this.options.handleProtocols(protocols, req)
	        : protocols.values().next().value;

	      if (protocol) {
	        headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
	        ws._protocol = protocol;
	      }
	    }

	    if (extensions[PerMessageDeflate.extensionName]) {
	      const params = extensions[PerMessageDeflate.extensionName].params;
	      const value = extension.format({
	        [PerMessageDeflate.extensionName]: [params]
	      });
	      headers.push(`Sec-WebSocket-Extensions: ${value}`);
	      ws._extensions = extensions;
	    }

	    //
	    // Allow external modification/inspection of handshake headers.
	    //
	    this.emit('headers', headers, req);

	    socket.write(headers.concat('\r\n').join('\r\n'));
	    socket.removeListener('error', socketOnError);

	    ws.setSocket(socket, head, {
	      allowSynchronousEvents: this.options.allowSynchronousEvents,
	      maxBufferedChunks: this.options.maxBufferedChunks,
	      maxFragments: this.options.maxFragments,
	      maxPayload: this.options.maxPayload,
	      skipUTF8Validation: this.options.skipUTF8Validation
	    });

	    if (this.clients) {
	      this.clients.add(ws);
	      ws.on('close', () => {
	        this.clients.delete(ws);

	        if (this._shouldEmitClose && !this.clients.size) {
	          process.nextTick(emitClose, this);
	        }
	      });
	    }

	    cb(ws, req);
	  }
	}

	websocketServer = WebSocketServer;

	/**
	 * Add event listeners on an `EventEmitter` using a map of <event, listener>
	 * pairs.
	 *
	 * @param {EventEmitter} server The event emitter
	 * @param {Object.<String, Function>} map The listeners to add
	 * @return {Function} A function that will remove the added listeners when
	 *     called
	 * @private
	 */
	function addListeners(server, map) {
	  for (const event of Object.keys(map)) server.on(event, map[event]);

	  return function removeListeners() {
	    for (const event of Object.keys(map)) {
	      server.removeListener(event, map[event]);
	    }
	  };
	}

	/**
	 * Emit a `'close'` event on an `EventEmitter`.
	 *
	 * @param {EventEmitter} server The event emitter
	 * @private
	 */
	function emitClose(server) {
	  server._state = CLOSED;
	  server.emit('close');
	}

	/**
	 * Handle socket errors.
	 *
	 * @private
	 */
	function socketOnError() {
	  this.destroy();
	}

	/**
	 * Close the connection when preconditions are not fulfilled.
	 *
	 * @param {Duplex} socket The socket of the upgrade request
	 * @param {Number} code The HTTP response status code
	 * @param {String} [message] The HTTP response body
	 * @param {Object} [headers] Additional HTTP response headers
	 * @private
	 */
	function abortHandshake(socket, code, message, headers) {
	  //
	  // The socket is writable unless the user destroyed or ended it before calling
	  // `server.handleUpgrade()` or in the `verifyClient` function, which is a user
	  // error. Handling this does not make much sense as the worst that can happen
	  // is that some of the data written by the user might be discarded due to the
	  // call to `socket.end()` below, which triggers an `'error'` event that in
	  // turn causes the socket to be destroyed.
	  //
	  message = message || http.STATUS_CODES[code];
	  headers = {
	    Connection: 'close',
	    'Content-Type': 'text/html',
	    'Content-Length': Buffer.byteLength(message),
	    ...headers
	  };

	  socket.once('finish', socket.destroy);

	  socket.end(
	    `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r\n` +
	      Object.keys(headers)
	        .map((h) => `${h}: ${headers[h]}`)
	        .join('\r\n') +
	      '\r\n\r\n' +
	      message
	  );
	}

	/**
	 * Emit a `'wsClientError'` event on a `WebSocketServer` if there is at least
	 * one listener for it, otherwise call `abortHandshake()`.
	 *
	 * @param {WebSocketServer} server The WebSocket server
	 * @param {http.IncomingMessage} req The request object
	 * @param {Duplex} socket The socket of the upgrade request
	 * @param {Number} code The HTTP response status code
	 * @param {String} message The HTTP response body
	 * @param {Object} [headers] The HTTP response headers
	 * @private
	 */
	function abortHandshakeOrEmitwsClientError(
	  server,
	  req,
	  socket,
	  code,
	  message,
	  headers
	) {
	  if (server.listenerCount('wsClientError')) {
	    const err = new Error(message);
	    Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);

	    server.emit('wsClientError', err, socket, req);
	  } else {
	    abortHandshake(socket, code, message, headers);
	  }
	}
	return websocketServer;
}

requireWebsocketServer();

/**!
 * @author Elgato
 * @module elgato/streamdeck
 * @license MIT
 * @copyright Copyright (c) Corsair Memory Inc.
 */

/**
 * Languages supported by Stream Deck.
 */
const supportedLanguages = ["de", "en", "es", "fr", "ja", "ko", "zh_CN", "zh_TW"];

/**
 * Defines the type of argument supplied by Stream Deck.
 */
var RegistrationParameter;
(function (RegistrationParameter) {
    /**
     * Identifies the argument that specifies the web socket port that Stream Deck is listening on.
     */
    RegistrationParameter["Port"] = "-port";
    /**
     * Identifies the argument that supplies information about the Stream Deck and the plugin.
     */
    RegistrationParameter["Info"] = "-info";
    /**
     * Identifies the argument that specifies the unique identifier that can be used when registering the plugin.
     */
    RegistrationParameter["PluginUUID"] = "-pluginUUID";
    /**
     * Identifies the argument that specifies the event to be sent to Stream Deck as part of the registration procedure.
     */
    RegistrationParameter["RegisterEvent"] = "-registerEvent";
})(RegistrationParameter || (RegistrationParameter = {}));

/**
 * Defines the target of a request, i.e. whether the request should update the Stream Deck hardware, Stream Deck software (application), or both, when calling `setImage` and `setState`.
 */
var Target;
(function (Target) {
    /**
     * Hardware and software should be updated as part of the request.
     */
    Target[Target["HardwareAndSoftware"] = 0] = "HardwareAndSoftware";
    /**
     * Hardware only should be updated as part of the request.
     */
    Target[Target["Hardware"] = 1] = "Hardware";
    /**
     * Software only should be updated as part of the request.
     */
    Target[Target["Software"] = 2] = "Software";
})(Target || (Target = {}));

/**
 * Prevents the modification of existing property attributes and values on the value, and all of its child properties, and prevents the addition of new properties.
 * @param value Value to freeze.
 */
function freeze(value) {
    if (value !== undefined && value !== null && typeof value === "object" && !Object.isFrozen(value)) {
        Object.freeze(value);
        Object.values(value).forEach(freeze);
    }
}
/**
 * Gets the value at the specified {@link path}.
 * @param path Path to the property to get.
 * @param source Source object that is being read from.
 * @returns Value of the property.
 */
function get(path, source) {
    const props = path.split(".");
    return props.reduce((obj, prop) => obj && obj[prop], source);
}

/**
 * Internalization provider, responsible for managing localizations and translating resources.
 */
class I18nProvider {
    language;
    readTranslations;
    /**
     * Default language to be used when a resource does not exist for the desired language.
     */
    static DEFAULT_LANGUAGE = "en";
    /**
     * Map of localized resources, indexed by their language.
     */
    _translations = new Map();
    /**
     * Initializes a new instance of the {@link I18nProvider} class.
     * @param language The default language to be used when retrieving translations for a given key.
     * @param readTranslations Function responsible for loading translations.
     */
    constructor(language, readTranslations) {
        this.language = language;
        this.readTranslations = readTranslations;
    }
    /**
     * Translates the specified {@link key}, as defined within the resources for the {@link language}. When the key is not found, the default language is checked.
     *
     * Alias of `I18nProvider.translate(string, Language)`
     * @param key Key of the translation.
     * @param language Optional language to get the translation for; otherwise the default language.
     * @returns The translation; otherwise the key.
     */
    t(key, language = this.language) {
        return this.translate(key, language);
    }
    /**
     * Translates the specified {@link key}, as defined within the resources for the {@link language}. When the key is not found, the default language is checked.
     * @param key Key of the translation.
     * @param language Optional language to get the translation for; otherwise the default language.
     * @returns The translation; otherwise the key.
     */
    translate(key, language = this.language) {
        // When the language and default are the same, only check the language.
        if (language === I18nProvider.DEFAULT_LANGUAGE) {
            return get(key, this.getTranslations(language))?.toString() || key;
        }
        // Otherwise check the language and default.
        return (get(key, this.getTranslations(language))?.toString() ||
            get(key, this.getTranslations(I18nProvider.DEFAULT_LANGUAGE))?.toString() ||
            key);
    }
    /**
     * Gets the translations for the specified language.
     * @param language Language whose translations are being retrieved.
     * @returns The translations, otherwise `null`.
     */
    getTranslations(language) {
        let translations = this._translations.get(language);
        if (translations === undefined) {
            translations = supportedLanguages.includes(language) ? this.readTranslations(language) : null;
            freeze(translations);
            this._translations.set(language, translations);
        }
        return translations;
    }
}
/**
 * Parses the localizations from the specified contents, or throws a `TypeError` when unsuccessful.
 * @param contents Contents that represent the stringified JSON containing the localizations.
 * @returns The localizations; otherwise a `TypeError`.
 */
function parseLocalizations(contents) {
    const json = JSON.parse(contents);
    if (json !== undefined && json !== null && typeof json === "object" && "Localization" in json) {
        return json["Localization"];
    }
    throw new TypeError(`Translations must be a JSON object nested under a property named "Localization"`);
}

/**
 * Levels of logging.
 */
var LogLevel;
(function (LogLevel) {
    /**
     * Error message used to indicate an error was thrown, or something critically went wrong.
     */
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    /**
     * Warning message used to indicate something went wrong, but the application is able to recover.
     */
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    /**
     * Information message for general usage.
     */
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    /**
     * Debug message used to detail information useful for profiling the applications runtime.
     */
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
    /**
     * Trace message used to monitor low-level information such as method calls, performance tracking, etc.
     */
    LogLevel[LogLevel["TRACE"] = 4] = "TRACE";
})(LogLevel || (LogLevel = {}));

/**
 * Provides a {@link LogTarget} that logs to the console.
 */
class ConsoleTarget {
    /**
     * @inheritdoc
     */
    write(entry) {
        switch (entry.level) {
            case LogLevel.ERROR:
                console.error(...entry.data);
                break;
            case LogLevel.WARN:
                console.warn(...entry.data);
                break;
            default:
                console.log(...entry.data);
        }
    }
}

// Remove any dependencies on node.
const EOL = "\n";
/**
 * Creates a new string log entry formatter.
 * @param opts Options that defines the type for the formatter.
 * @returns The string {@link LogEntryFormatter}.
 */
function stringFormatter(opts) {
    {
        return (entry) => {
            const { data, level, scope } = entry;
            let prefix = `${new Date().toISOString()} ${LogLevel[level].padEnd(5)} `;
            if (scope) {
                prefix += `${scope}: `;
            }
            return `${prefix}${reduce(data)}`;
        };
    }
}
/**
 * Stringifies the provided data parameters that make up the log entry.
 * @param data Data parameters.
 * @returns The data represented as a single `string`.
 */
function reduce(data) {
    let result = "";
    let previousWasError = false;
    for (const value of data) {
        // When the value is an error, write the stack.
        if (typeof value === "object" && value instanceof Error) {
            result += `${EOL}${value.stack}`;
            previousWasError = true;
            continue;
        }
        // When the previous was an error, write a new line.
        if (previousWasError) {
            result += EOL;
            previousWasError = false;
        }
        result += typeof value === "object" ? JSON.stringify(value) : value;
        result += " ";
    }
    return result.trimEnd();
}

/**
 * Logger capable of forwarding messages to a {@link LogTarget}.
 */
class Logger {
    /**
     * Backing field for the {@link Logger.level}.
     */
    _level;
    /**
     * Options that define the loggers behavior.
     */
    options;
    /**
     * Scope associated with this {@link Logger}.
     */
    scope;
    /**
     * Initializes a new instance of the {@link Logger} class.
     * @param opts Options that define the loggers behavior.
     */
    constructor(opts) {
        this.options = { minimumLevel: LogLevel.TRACE, ...opts };
        this.scope = this.options.scope === undefined || this.options.scope.trim() === "" ? "" : this.options.scope;
        if (typeof this.options.level !== "function") {
            this.setLevel(this.options.level);
        }
    }
    /**
     * Gets the {@link LogLevel}.
     * @returns The {@link LogLevel}.
     */
    get level() {
        if (this._level !== undefined) {
            return this._level;
        }
        return typeof this.options.level === "function" ? this.options.level() : this.options.level;
    }
    /**
     * Creates a scoped logger with the given {@link scope}; logs created by scoped-loggers include their scope to enable their source to be easily identified.
     * @param scope Value that represents the scope of the new logger.
     * @returns The scoped logger, or this instance when {@link scope} is not defined.
     */
    createScope(scope) {
        scope = scope.trim();
        if (scope === "") {
            return this;
        }
        return new Logger({
            ...this.options,
            level: () => this.level,
            scope: this.options.scope ? `${this.options.scope}->${scope}` : scope,
        });
    }
    /**
     * Writes the arguments as a debug log entry.
     * @param data Message or data to log.
     * @returns This instance for chaining.
     */
    debug(...data) {
        return this.write({ level: LogLevel.DEBUG, data, scope: this.scope });
    }
    /**
     * Writes the arguments as error log entry.
     * @param data Message or data to log.
     * @returns This instance for chaining.
     */
    error(...data) {
        return this.write({ level: LogLevel.ERROR, data, scope: this.scope });
    }
    /**
     * Writes the arguments as an info log entry.
     * @param data Message or data to log.
     * @returns This instance for chaining.
     */
    info(...data) {
        return this.write({ level: LogLevel.INFO, data, scope: this.scope });
    }
    /**
     * Sets the log-level that determines which logs should be written. The specified level will be inherited by all scoped loggers unless they have log-level explicitly defined.
     * @param level The log-level that determines which logs should be written; when `undefined`, the level will be inherited from the parent logger, or default to the environment level.
     * @returns This instance for chaining.
     */
    setLevel(level) {
        if (level !== undefined && level > this.options.minimumLevel) {
            this._level = LogLevel.INFO;
            this.warn(`Log level cannot be set to ${LogLevel[level]} whilst not in debug mode.`);
        }
        else {
            this._level = level;
        }
        return this;
    }
    /**
     * Writes the arguments as a trace log entry.
     * @param data Message or data to log.
     * @returns This instance for chaining.
     */
    trace(...data) {
        return this.write({ level: LogLevel.TRACE, data, scope: this.scope });
    }
    /**
     * Writes the arguments as a warning log entry.
     * @param data Message or data to log.
     * @returns This instance for chaining.
     */
    warn(...data) {
        return this.write({ level: LogLevel.WARN, data, scope: this.scope });
    }
    /**
     * Writes the log entry.
     * @param entry Log entry to write.
     * @returns This instance for chaining.
     */
    write(entry) {
        if (entry.level <= this.level) {
            this.options.targets.forEach((t) => t.write(entry));
        }
        return this;
    }
}

// Polyfill, explicit resource management https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#using-declarations-and-explicit-resource-management
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Symbol.dispose ??= Symbol("Symbol.dispose");
/**
 * Creates a {@link IDisposable} that defers the disposing to the {@link dispose} function; disposing is guarded so that it may only occur once.
 * @param dispose Function responsible for disposing.
 * @returns Disposable whereby the disposing is delegated to the {@link dispose}  function.
 */
function deferredDisposable(dispose) {
    let isDisposed = false;
    const guardedDispose = () => {
        if (!isDisposed) {
            dispose();
            isDisposed = true;
        }
    };
    return {
        [Symbol.dispose]: guardedDispose,
        dispose: guardedDispose,
    };
}

/**
 * An event emitter that enables the listening for, and emitting of, events.
 */
class EventEmitter {
    /**
     * Underlying collection of events and their listeners.
     */
    events = new Map();
    /**
     * Adds the event {@link listener} for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns This instance with the {@link listener} added.
     */
    addListener(eventName, listener) {
        return this.on(eventName, listener);
    }
    /**
     * Adds the event {@link listener} for the event named {@link eventName}, and returns a disposable capable of removing the event listener.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns A disposable that removes the listener when disposed.
     */
    disposableOn(eventName, listener) {
        this.addListener(eventName, listener);
        return deferredDisposable(() => this.removeListener(eventName, listener));
    }
    /**
     * Emits the {@link eventName}, invoking all event listeners with the specified {@link args}.
     * @param eventName Name of the event.
     * @param args Arguments supplied to each event listener.
     * @returns `true` when there was a listener associated with the event; otherwise `false`.
     */
    emit(eventName, ...args) {
        const listeners = this.events.get(eventName);
        if (listeners === undefined) {
            return false;
        }
        for (let i = 0; i < listeners.length;) {
            const { listener, once } = listeners[i];
            if (once) {
                listeners.splice(i, 1);
            }
            else {
                i++;
            }
            listener(...args);
        }
        return true;
    }
    /**
     * Gets the event names with event listeners.
     * @returns Event names.
     */
    eventNames() {
        return Array.from(this.events.keys());
    }
    /**
     * Gets the number of event listeners for the event named {@link eventName}. When a {@link listener} is defined, only matching event listeners are counted.
     * @param eventName Name of the event.
     * @param listener Optional event listener to count.
     * @returns Number of event listeners.
     */
    listenerCount(eventName, listener) {
        const listeners = this.events.get(eventName);
        if (listeners === undefined || listener == undefined) {
            return listeners?.length || 0;
        }
        let count = 0;
        listeners.forEach((ev) => {
            if (ev.listener === listener) {
                count++;
            }
        });
        return count;
    }
    /**
     * Gets the event listeners for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @returns The event listeners.
     */
    listeners(eventName) {
        return Array.from(this.events.get(eventName) || []).map(({ listener }) => listener);
    }
    /**
     * Removes the event {@link listener} for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns This instance with the event {@link listener} removed.
     */
    off(eventName, listener) {
        const listeners = this.events.get(eventName) || [];
        for (let i = listeners.length - 1; i >= 0; i--) {
            if (listeners[i].listener === listener) {
                listeners.splice(i, 1);
            }
        }
        return this;
    }
    /**
     * Adds the event {@link listener} for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns This instance with the event {@link listener} added.
     */
    on(eventName, listener) {
        return this.add(eventName, (listeners) => listeners.push({ listener }));
    }
    /**
     * Adds the **one-time** event {@link listener} for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns This instance with the event {@link listener} added.
     */
    once(eventName, listener) {
        return this.add(eventName, (listeners) => listeners.push({ listener, once: true }));
    }
    /**
     * Adds the event {@link listener} to the beginning of the listeners for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns This instance with the event {@link listener} prepended.
     */
    prependListener(eventName, listener) {
        return this.add(eventName, (listeners) => listeners.splice(0, 0, { listener }));
    }
    /**
     * Adds the **one-time** event {@link listener} to the beginning of the listeners for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns This instance with the event {@link listener} prepended.
     */
    prependOnceListener(eventName, listener) {
        return this.add(eventName, (listeners) => listeners.splice(0, 0, { listener, once: true }));
    }
    /**
     * Removes all event listeners for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @returns This instance with the event listeners removed
     */
    removeAllListeners(eventName) {
        this.events.delete(eventName);
        return this;
    }
    /**
     * Removes the event {@link listener} for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param listener Event handler function.
     * @returns This instance with the event {@link listener} removed.
     */
    removeListener(eventName, listener) {
        return this.off(eventName, listener);
    }
    /**
     * Adds the event {@link listener} for the event named {@link eventName}.
     * @param eventName Name of the event.
     * @param fn Function responsible for adding the new event handler function.
     * @returns This instance with event {@link listener} added.
     */
    add(eventName, fn) {
        let listeners = this.events.get(eventName);
        if (listeners === undefined) {
            listeners = [];
            this.events.set(eventName, listeners);
        }
        fn(listeners);
        return this;
    }
}

/**
 * Determines whether the specified {@link value} is a {@link RawMessageResponse}.
 * @param value Value.
 * @returns `true` when the value of a {@link RawMessageResponse}; otherwise `false`.
 */
function isRequest(value) {
    return isMessage(value, "request") && has(value, "unidirectional", "boolean");
}
/**
 * Determines whether the specified {@link value} is a {@link RawMessageResponse}.
 * @param value Value.
 * @returns `true` when the value of a {@link RawMessageResponse; otherwise `false`.
 */
function isResponse(value) {
    return isMessage(value, "response") && has(value, "status", "number");
}
/**
 * Determines whether the specified {@link value} is a message of type {@link type}.
 * @param value Value.
 * @param type Message type.
 * @returns `true` when the value of a {@link Message} of type {@link type}; otherwise `false`.
 */
function isMessage(value, type) {
    // The value should be an object.
    if (value === undefined || value === null || typeof value !== "object") {
        return false;
    }
    // The value should have a __type property of "response".
    if (!("__type" in value) || value.__type !== type) {
        return false;
    }
    // The value should should have at least an id, status, and path1.
    return has(value, "id", "string") && has(value, "path", "string");
}
/**
 * Determines whether the specified {@link key} exists in {@link obj}, and is typeof {@link type}.
 * @param obj Object to check.
 * @param key key to check for.
 * @param type Expected type.
 * @returns `true` when the {@link key} exists in the {@link obj}, and is typeof {@link type}.
 */
function has(obj, key, type) {
    return key in obj && typeof obj[key] === type;
}

/**
 * Message responder responsible for responding to a request.
 */
class MessageResponder {
    request;
    proxy;
    /**
     * Indicates whether a response has already been sent in relation to the response.
     */
    _responded = false;
    /**
     * Initializes a new instance of the {@link MessageResponder} class.
     * @param request The request the response is associated with.
     * @param proxy Proxy responsible for forwarding the response to the client.
     */
    constructor(request, proxy) {
        this.request = request;
        this.proxy = proxy;
    }
    /**
     * Indicates whether a response can be sent.
     * @returns `true` when a response has not yet been set.
     */
    get canRespond() {
        return !this._responded;
    }
    /**
     * Sends a failure response with a status code of `500`.
     * @param body Optional response body.
     * @returns Promise fulfilled once the response has been sent.
     */
    fail(body) {
        return this.send(500, body);
    }
    /**
     * Sends the {@link body} as a response with the {@link status}
     * @param status Response status.
     * @param body Optional response body.
     * @returns Promise fulfilled once the response has been sent.
     */
    async send(status, body) {
        if (this.canRespond) {
            await this.proxy({
                __type: "response",
                id: this.request.id,
                path: this.request.path,
                body,
                status,
            });
            this._responded = true;
        }
    }
    /**
     * Sends a success response with a status code of `200`.
     * @param body Optional response body.
     * @returns Promise fulfilled once the response has been sent.
     */
    success(body) {
        return this.send(200, body);
    }
}

/**
 * Default request timeout.
 */
const DEFAULT_TIMEOUT = 5000;
const PUBLIC_PATH_PREFIX = "public:";
const INTERNAL_PATH_PREFIX = "internal:";
/**
 * Message gateway responsible for sending, routing, and receiving requests and responses.
 */
class MessageGateway extends EventEmitter {
    proxy;
    actionProvider;
    /**
     * Requests with pending responses.
     */
    requests = new Map();
    /**
     * Registered routes, and their respective handlers.
     */
    routes = new EventEmitter();
    /**
     * Initializes a new instance of the {@link MessageGateway} class.
     * @param proxy Proxy capable of sending messages to the plugin / property inspector.
     * @param actionProvider Action provider responsible for retrieving actions associated with source messages.
     */
    constructor(proxy, actionProvider) {
        super();
        this.proxy = proxy;
        this.actionProvider = actionProvider;
    }
    /**
     * Sends the {@link requestOrPath} to the server; the server should be listening on {@link MessageGateway.route}.
     * @param requestOrPath The request, or the path of the request.
     * @param bodyOrUndefined Request body, or moot when constructing the request with {@link MessageRequestOptions}.
     * @returns The response.
     */
    async fetch(requestOrPath, bodyOrUndefined) {
        const id = crypto.randomUUID();
        const { body, path, timeout = DEFAULT_TIMEOUT, unidirectional = false, } = typeof requestOrPath === "string" ? { body: bodyOrUndefined, path: requestOrPath } : requestOrPath;
        // Initialize the response handler.
        const response = new Promise((resolve) => {
            this.requests.set(id, (res) => {
                if (res.status !== 408) {
                    clearTimeout(timeoutMonitor);
                }
                resolve(res);
            });
        });
        // Start the timeout, and send the request.
        const timeoutMonitor = setTimeout(() => this.handleResponse({ __type: "response", id, path, status: 408 }), timeout);
        const accepted = await this.proxy({
            __type: "request",
            body,
            id,
            path,
            unidirectional,
        });
        // When the server did not accept the request, return a 406.
        if (!accepted) {
            this.handleResponse({ __type: "response", id, path, status: 406 });
        }
        return response;
    }
    /**
     * Attempts to process the specified {@link message}.
     * @param message Message to process.
     * @returns `true` when the {@link message} was processed by this instance; otherwise `false`.
     */
    async process(message) {
        if (isRequest(message.payload)) {
            // Server-side handling.
            const action = this.actionProvider(message);
            if (await this.handleRequest(action, message.payload)) {
                return;
            }
            this.emit("unhandledRequest", message);
        }
        else if (isResponse(message.payload) && this.handleResponse(message.payload)) {
            // Response handled successfully.
            return;
        }
        this.emit("unhandledMessage", message);
    }
    /**
     * Maps the specified {@link path} to the {@link handler}, allowing for requests from the client.
     * @param path Path used to identify the route.
     * @param handler Handler to be invoked when the request is received.
     * @param options Optional routing configuration.
     * @returns Disposable capable of removing the route handler.
     */
    route(path, handler, options) {
        options = { filter: () => true, ...options };
        return this.routes.disposableOn(path, async (ev) => {
            if (options?.filter && options.filter(ev.request.action)) {
                await ev.routed();
                try {
                    // Invoke the handler; when data was returned, propagate it as part of the response (if there wasn't already a response).
                    const result = await handler(ev.request, ev.responder);
                    if (result !== undefined) {
                        await ev.responder.send(200, result);
                    }
                }
                catch (err) {
                    // Respond with an error before throwing.
                    await ev.responder.send(500);
                    throw err;
                }
            }
        });
    }
    /**
     * Handles inbound requests.
     * @param action Action associated with the request.
     * @param source The request.
     * @returns `true` when the request was handled; otherwise `false`.
     */
    async handleRequest(action, source) {
        const responder = new MessageResponder(source, this.proxy);
        const request = {
            action,
            path: source.path,
            unidirectional: source.unidirectional,
            body: source.body,
        };
        // Get handlers of the path, and invoke them; filtering is applied by the handlers themselves
        let routed = false;
        const routes = this.routes.listeners(source.path);
        for (const route of routes) {
            await route({
                request,
                responder,
                routed: async () => {
                    // Flags the path as handled, sending an immediate 202 if the request was unidirectional.
                    if (request.unidirectional) {
                        await responder.send(202);
                    }
                    routed = true;
                },
            });
        }
        // The request was successfully routed, so fallback to a 200.
        if (routed) {
            await responder.send(200);
            return true;
        }
        // When there were no applicable routes, return not-handled.
        await responder.send(501);
        return false;
    }
    /**
     * Handles inbound response.
     * @param res The response.
     * @returns `true` when the response was handled; otherwise `false`.
     */
    handleResponse(res) {
        const handler = this.requests.get(res.id);
        this.requests.delete(res.id);
        // Determine if there is a request pending a response.
        if (handler) {
            handler(new MessageResponse(res));
            return true;
        }
        return false;
    }
}
/**
 * Message response, received from the server.
 */
class MessageResponse {
    /**
     * Body of the response.
     */
    body;
    /**
     * Status of the response.
     * - `200` the request was successful.
     * - `202` the request was unidirectional, and does not have a response.
     * - `406` the request could not be accepted by the server.
     * - `408` the request timed-out.
     * - `500` the request failed.
     * - `501` the request is not implemented by the server, and could not be fulfilled.
     */
    status;
    /**
     * Initializes a new instance of the {@link MessageResponse} class.
     * @param res The status code, or the response.
     */
    constructor(res) {
        this.body = res.body;
        this.status = res.status;
    }
    /**
     * Indicates whether the request was successful.
     * @returns `true` when the status indicates a success; otherwise `false`.
     */
    get ok() {
        return this.status >= 200 && this.status < 300;
    }
}

const LOGGER_WRITE_PATH = `${INTERNAL_PATH_PREFIX}logger.write`;
/**
 * Registers a route handler on the router, propagating any log entries to the specified logger for writing.
 * @param router Router to receive inbound log entries on.
 * @param logger Logger responsible for logging log entries.
 */
function registerCreateLogEntryRoute(router, logger) {
    router.route(LOGGER_WRITE_PATH, (req, res) => {
        if (req.body === undefined) {
            return res.fail();
        }
        const { level, message, scope } = req.body;
        if (level === undefined) {
            return res.fail();
        }
        logger.write({ level, data: [message], scope });
        return res.success();
    });
}

/**
 * Provides information for events received from Stream Deck.
 */
class Event {
    /**
     * Event that occurred.
     */
    type;
    /**
     * Initializes a new instance of the {@link Event} class.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     */
    constructor(source) {
        this.type = source.event;
    }
}

/**
 * Provides information for an event relating to an action.
 */
class ActionWithoutPayloadEvent extends Event {
    action;
    /**
     * Initializes a new instance of the {@link ActionWithoutPayloadEvent} class.
     * @param action Action that raised the event.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     */
    constructor(action, source) {
        super(source);
        this.action = action;
    }
}
/**
 * Provides information for an event relating to an action.
 */
class ActionEvent extends ActionWithoutPayloadEvent {
    /**
     * Provides additional information about the event that occurred, e.g. how many `ticks` the dial was rotated, the current `state` of the action, etc.
     */
    payload;
    /**
     * Initializes a new instance of the {@link ActionEvent} class.
     * @param action Action that raised the event.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     */
    constructor(action, source) {
        super(action, source);
        this.payload = source.payload;
    }
}

/**
 * Provides event information for when the plugin received the global settings.
 */
class DidReceiveGlobalSettingsEvent extends Event {
    /**
     * Settings associated with the event.
     */
    settings;
    /**
     * Initializes a new instance of the {@link DidReceiveGlobalSettingsEvent} class.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     */
    constructor(source) {
        super(source);
        this.settings = source.payload.settings;
    }
}

/**
 * Provides a wrapper around a value that is lazily instantiated.
 */
class Lazy {
    /**
     * Private backing field for {@link Lazy.value}.
     */
    #value = undefined;
    /**
     * Factory responsible for instantiating the value.
     */
    #valueFactory;
    /**
     * Initializes a new instance of the {@link Lazy} class.
     * @param valueFactory The factory responsible for instantiating the value.
     */
    constructor(valueFactory) {
        this.#valueFactory = valueFactory;
    }
    /**
     * Gets the value.
     * @returns The value.
     */
    get value() {
        if (this.#value === undefined) {
            this.#value = this.#valueFactory();
        }
        return this.#value;
    }
}

/**
 * Wraps an underlying Promise{T}, exposing the resolve and reject delegates as methods, allowing for it to be awaited, resolved, or rejected externally.
 */
class PromiseCompletionSource {
    /**
     * The underlying promise that this instance is managing.
     */
    _promise;
    /**
     * Delegate used to reject the promise.
     */
    _reject;
    /**
     * Delegate used to resolve the promise.
     */
    _resolve;
    /**
     * Wraps an underlying Promise{T}, exposing the resolve and reject delegates as methods, allowing for it to be awaited, resolved, or rejected externally.
     */
    constructor() {
        this._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }
    /**
     * Gets the underlying promise being managed by this instance.
     * @returns The promise.
     */
    get promise() {
        return this._promise;
    }
    /**
     * Rejects the promise, causing any awaited calls to throw.
     * @param reason The reason for rejecting the promise.
     */
    setException(reason) {
        if (this._reject) {
            this._reject(reason);
        }
    }
    /**
     * Sets the result of the underlying promise, allowing any awaited calls to continue invocation.
     * @param value The value to resolve the promise with.
     */
    setResult(value) {
        if (this._resolve) {
            this._resolve(value);
        }
    }
}

/**
 * Provides information for a version, as parsed from a string denoted as a collection of numbers separated by a period, for example `1.45.2`, `4.0.2.13098`. Parsing is opinionated
 * and strings should strictly conform to the format `{major}[.{minor}[.{patch}[.{build}]]]`; version numbers that form the version are optional, and when `undefined` will default to
 * 0, for example the `minor`, `patch`, or `build` number may be omitted.
 *
 * NB: This implementation should be considered fit-for-purpose, and should be used sparing.
 */
class Version {
    /**
     * Build version number.
     */
    build;
    /**
     * Major version number.
     */
    major;
    /**
     * Minor version number.
     */
    minor;
    /**
     * Patch version number.
     */
    patch;
    /**
     * Initializes a new instance of the {@link Version} class.
     * @param value Value to parse the version from.
     */
    constructor(value) {
        const result = value.match(/^(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?$/);
        if (result === null) {
            throw new Error(`Invalid format; expected "{major}[.{minor}[.{patch}[.{build}]]]" but was "${value}"`);
        }
        [, this.major, this.minor, this.patch, this.build] = [...result.map((value) => parseInt(value) || 0)];
    }
    /**
     * Compares this instance to the {@link other} {@link Version}.
     * @param other The {@link Version} to compare to.
     * @returns `-1` when this instance is less than the {@link other}, `1` when this instance is greater than {@link other}, otherwise `0`.
     */
    compareTo(other) {
        const segments = ({ major, minor, build, patch }) => [major, minor, build, patch];
        const thisSegments = segments(this);
        const otherSegments = segments(other);
        for (let i = 0; i < 4; i++) {
            if (thisSegments[i] < otherSegments[i]) {
                return -1;
            }
            else if (thisSegments[i] > otherSegments[i]) {
                return 1;
            }
        }
        return 0;
    }
    /** @inheritdoc */
    toString() {
        return `${this.major}.${this.minor}`;
    }
}

let __isDebugMode = undefined;
/**
 * Determines whether the current plugin is running in a debug environment; this is determined by the command-line arguments supplied to the plugin by Stream. Specifically, the result
 * is `true` when  either `--inspect`, `--inspect-brk` or `--inspect-port` are present as part of the processes' arguments.
 * @returns `true` when the plugin is running in debug mode; otherwise `false`.
 */
function isDebugMode() {
    if (__isDebugMode === undefined) {
        __isDebugMode = process.execArgv.some((arg) => {
            const name = arg.split("=")[0];
            return name === "--inspect" || name === "--inspect-brk" || name === "--inspect-port";
        });
    }
    return __isDebugMode;
}
/**
 * Gets the plugin's unique-identifier from the current working directory.
 * @returns The plugin's unique-identifier.
 */
function getPluginUUID() {
    const name = path.basename(process.cwd());
    const suffixIndex = name.lastIndexOf(".sdPlugin");
    return suffixIndex < 0 ? name : name.substring(0, suffixIndex);
}

/**
 * Provides a {@link LogTarget} capable of logging to a local file system.
 */
class FileTarget {
    options;
    /**
     * File path where logs will be written.
     */
    filePath;
    /**
     * Current size of the logs that have been written to the {@link FileTarget.filePath}.
     */
    size = 0;
    /**
     * Initializes a new instance of the {@link FileTarget} class.
     * @param options Options that defines how logs should be written to the local file system.
     */
    constructor(options) {
        this.options = options;
        this.filePath = this.getLogFilePath();
        this.reIndex();
    }
    /**
     * @inheritdoc
     */
    write(entry) {
        const fd = fs.openSync(this.filePath, "a");
        try {
            const msg = this.options.format(entry);
            fs.writeSync(fd, msg + "\n");
            this.size += msg.length;
        }
        finally {
            fs.closeSync(fd);
        }
        if (this.size >= this.options.maxSize) {
            this.reIndex();
            this.size = 0;
        }
    }
    /**
     * Gets the file path to an indexed log file.
     * @param index Optional index of the log file to be included as part of the file name.
     * @returns File path that represents the indexed log file.
     */
    getLogFilePath(index = 0) {
        return path.join(this.options.dest, `${this.options.fileName}.${index}.log`);
    }
    /**
     * Gets the log files associated with this file target, including past and present.
     * @returns Log file entries.
     */
    getLogFiles() {
        const regex = /^\.(\d+)\.log$/;
        return fs
            .readdirSync(this.options.dest, { withFileTypes: true })
            .reduce((prev, entry) => {
            if (entry.isDirectory() || entry.name.indexOf(this.options.fileName) < 0) {
                return prev;
            }
            const match = entry.name.substring(this.options.fileName.length).match(regex);
            if (match?.length !== 2) {
                return prev;
            }
            prev.push({
                path: path.join(this.options.dest, entry.name),
                index: parseInt(match[1]),
            });
            return prev;
        }, [])
            .sort(({ index: a }, { index: b }) => {
            return a < b ? -1 : a > b ? 1 : 0;
        });
    }
    /**
     * Re-indexes the existing log files associated with this file target, removing old log files whose index exceeds the {@link FileTargetOptions.maxFileCount}, and renaming the
     * remaining log files, leaving index "0" free for a new log file.
     */
    reIndex() {
        // When the destination directory is new, create it, and return.
        if (!fs.existsSync(this.options.dest)) {
            fs.mkdirSync(this.options.dest);
            return;
        }
        const logFiles = this.getLogFiles();
        for (let i = logFiles.length - 1; i >= 0; i--) {
            const log = logFiles[i];
            if (i >= this.options.maxFileCount - 1) {
                fs.rmSync(log.path);
            }
            else {
                fs.renameSync(log.path, this.getLogFilePath(i + 1));
            }
        }
    }
}

// Log all entires to a log file.
const fileTarget = new FileTarget({
    dest: path.join(cwd(), "logs"),
    fileName: getPluginUUID(),
    format: stringFormatter(),
    maxFileCount: 10,
    maxSize: 50 * 1024 * 1024,
});
// Construct the log targets.
const targets = [fileTarget];
if (isDebugMode()) {
    targets.splice(0, 0, new ConsoleTarget());
}
/**
 * Logger responsible for capturing log messages.
 */
const logger = new Logger({
    level: isDebugMode() ? LogLevel.DEBUG : LogLevel.INFO,
    minimumLevel: isDebugMode() ? LogLevel.TRACE : LogLevel.DEBUG,
    targets,
});
process.once("uncaughtException", (err) => logger.error("Process encountered uncaught exception", err));

/**
 * Provides a connection between the plugin and the Stream Deck allowing for messages to be sent and received.
 */
class Connection extends EventEmitter {
    /**
     * Private backing field for {@link Connection.registrationParameters}.
     */
    _registrationParameters;
    /**
     * Private backing field for {@link Connection.version}.
     */
    _version;
    /**
     * Used to ensure {@link Connection.connect} is invoked as a singleton; `false` when a connection is occurring or established.
     */
    canConnect = true;
    /**
     * Underlying web socket connection.
     */
    connection = new PromiseCompletionSource();
    /**
     * Logger scoped to the connection.
     */
    logger = logger.createScope("Connection");
    /**
     * Underlying connection information provided to the plugin to establish a connection with Stream Deck.
     * @returns The registration parameters.
     */
    get registrationParameters() {
        return (this._registrationParameters ??= this.getRegistrationParameters());
    }
    /**
     * Version of Stream Deck this instance is connected to.
     * @returns The version.
     */
    get version() {
        return (this._version ??= new Version(this.registrationParameters.info.application.version));
    }
    /**
     * Establishes a connection with the Stream Deck, allowing for the plugin to send and receive messages.
     * @returns A promise that is resolved when a connection has been established.
     */
    async connect() {
        // Ensure we only establish a single connection.
        if (this.canConnect) {
            this.canConnect = false;
            const webSocket = new WebSocket(`ws://127.0.0.1:${this.registrationParameters.port}`);
            webSocket.onmessage = (ev) => this.tryEmit(ev);
            webSocket.onopen = () => {
                webSocket.send(JSON.stringify({
                    event: this.registrationParameters.registerEvent,
                    uuid: this.registrationParameters.pluginUUID,
                }));
                // Web socket established a connection with the Stream Deck and the plugin was registered.
                this.connection.setResult(webSocket);
                this.emit("connected", this.registrationParameters.info);
            };
        }
        await this.connection.promise;
    }
    /**
     * Sends the commands to the Stream Deck, once the connection has been established and registered.
     * @param command Command being sent.
     * @returns `Promise` resolved when the command is sent to Stream Deck.
     */
    async send(command) {
        const connection = await this.connection.promise;
        const message = JSON.stringify(command);
        this.logger.trace(message);
        connection.send(message);
    }
    /**
     * Gets the registration parameters, provided by Stream Deck, that provide information to the plugin, including how to establish a connection.
     * @returns Parsed registration parameters.
     */
    getRegistrationParameters() {
        const params = {
            port: undefined,
            info: undefined,
            pluginUUID: undefined,
            registerEvent: undefined,
        };
        const scopedLogger = logger.createScope("RegistrationParameters");
        for (let i = 0; i < process.argv.length - 1; i++) {
            const param = process.argv[i];
            const value = process.argv[++i];
            switch (param) {
                case RegistrationParameter.Port:
                    scopedLogger.debug(`port=${value}`);
                    params.port = value;
                    break;
                case RegistrationParameter.PluginUUID:
                    scopedLogger.debug(`pluginUUID=${value}`);
                    params.pluginUUID = value;
                    break;
                case RegistrationParameter.RegisterEvent:
                    scopedLogger.debug(`registerEvent=${value}`);
                    params.registerEvent = value;
                    break;
                case RegistrationParameter.Info:
                    scopedLogger.debug(`info=${value}`);
                    params.info = JSON.parse(value);
                    break;
                default:
                    i--;
                    break;
            }
        }
        const invalidArgs = [];
        const validate = (name, value) => {
            if (value === undefined) {
                invalidArgs.push(name);
            }
        };
        validate(RegistrationParameter.Port, params.port);
        validate(RegistrationParameter.PluginUUID, params.pluginUUID);
        validate(RegistrationParameter.RegisterEvent, params.registerEvent);
        validate(RegistrationParameter.Info, params.info);
        if (invalidArgs.length > 0) {
            throw new Error(`Unable to establish a connection with Stream Deck, missing command line arguments: ${invalidArgs.join(", ")}`);
        }
        return params;
    }
    /**
     * Attempts to emit the {@link ev} that was received from the {@link Connection.connection}.
     * @param ev Event message data received from Stream Deck.
     */
    tryEmit(ev) {
        try {
            const message = JSON.parse(ev.data.toString());
            if (message.event) {
                this.logger.trace(ev.data.toString());
                this.emit(message.event, message);
            }
            else {
                this.logger.warn(`Received unknown message: ${ev.data}`);
            }
        }
        catch (err) {
            this.logger.error(`Failed to parse message: ${ev.data}`, err);
        }
    }
}
const connection = new Connection();

let manifest$1;
let softwareMinimumVersion;
/**
 * Gets the minimum version that this plugin required, as defined within the manifest.
 * @returns Minimum required version.
 */
function getSoftwareMinimumVersion() {
    return (softwareMinimumVersion ??= new Version(getManifest().Software.MinimumVersion));
}
/**
 * Gets the manifest associated with the plugin.
 * @returns The manifest.
 */
function getManifest() {
    return (manifest$1 ??= readManifest());
}
/**
 * Reads the manifest associated with the plugin from the `manifest.json` file.
 * @returns The manifest.
 */
function readManifest() {
    const path = join(process.cwd(), "manifest.json");
    if (!existsSync(path)) {
        throw new Error("Failed to read manifest.json as the file does not exist.");
    }
    return JSON.parse(readFileSync(path, {
        encoding: "utf-8",
        flag: "r",
    }).toString());
}

/**
 * Provides a read-only iterable collection of items that also acts as a partial polyfill for iterator helpers.
 */
class Enumerable {
    /**
     * Backing function responsible for providing the iterator of items.
     */
    #items;
    /**
     * Backing function for {@link Enumerable.length}.
     */
    #length;
    /**
     * Captured iterator from the underlying iterable; used to fulfil {@link IterableIterator} methods.
     */
    #iterator;
    /**
     * Initializes a new instance of the {@link Enumerable} class.
     * @param source Source that contains the items.
     * @returns The enumerable.
     */
    constructor(source) {
        if (source instanceof Enumerable) {
            // Enumerable
            this.#items = source.#items;
            this.#length = source.#length;
        }
        else if (Array.isArray(source)) {
            // Array
            this.#items = () => source.values();
            this.#length = () => source.length;
        }
        else if (source instanceof Map || source instanceof Set) {
            // Map or Set
            this.#items = () => source.values();
            this.#length = () => source.size;
        }
        else {
            // IterableIterator delegate
            this.#items = source;
            this.#length = () => {
                let i = 0;
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                for (const _ of this) {
                    i++;
                }
                return i;
            };
        }
    }
    /**
     * Gets the number of items in the enumerable.
     * @returns The number of items.
     */
    get length() {
        return this.#length();
    }
    /**
     * Gets the iterator for the enumerable.
     * @yields The items.
     */
    *[Symbol.iterator]() {
        for (const item of this.#items()) {
            yield item;
        }
    }
    /**
     * Transforms each item within this iterator to an indexed pair, with each pair represented as an array.
     * @returns An iterator of indexed pairs.
     */
    asIndexedPairs() {
        return new Enumerable(function* () {
            let i = 0;
            for (const item of this) {
                yield [i++, item];
            }
        }.bind(this));
    }
    /**
     * Returns an iterator with the first items dropped, up to the specified limit.
     * @param limit The number of elements to drop from the start of the iteration.
     * @returns An iterator of items after the limit.
     */
    drop(limit) {
        if (isNaN(limit) || limit < 0) {
            throw new RangeError("limit must be 0, or a positive number");
        }
        return new Enumerable(function* () {
            let i = 0;
            for (const item of this) {
                if (i++ >= limit) {
                    yield item;
                }
            }
        }.bind(this));
    }
    /**
     * Determines whether all items satisfy the specified predicate.
     * @param predicate Function that determines whether each item fulfils the predicate.
     * @returns `true` when all items satisfy the predicate; otherwise `false`.
     */
    every(predicate) {
        for (const item of this) {
            if (!predicate(item)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Returns an iterator of items that meet the specified predicate..
     * @param predicate Function that determines which items to filter.
     * @returns An iterator of filtered items.
     */
    filter(predicate) {
        return new Enumerable(function* () {
            for (const item of this) {
                if (predicate(item)) {
                    yield item;
                }
            }
        }.bind(this));
    }
    /**
     * Finds the first item that satisfies the specified predicate.
     * @param predicate Predicate to match items against.
     * @returns The first item that satisfied the predicate; otherwise `undefined`.
     */
    find(predicate) {
        for (const item of this) {
            if (predicate(item)) {
                return item;
            }
        }
    }
    /**
     * Finds the last item that satisfies the specified predicate.
     * @param predicate Predicate to match items against.
     * @returns The first item that satisfied the predicate; otherwise `undefined`.
     */
    findLast(predicate) {
        let result = undefined;
        for (const item of this) {
            if (predicate(item)) {
                result = item;
            }
        }
        return result;
    }
    /**
     * Returns an iterator containing items transformed using the specified mapper function.
     * @param mapper Function responsible for transforming each item.
     * @returns An iterator of transformed items.
     */
    flatMap(mapper) {
        return new Enumerable(function* () {
            for (const item of this) {
                for (const mapped of mapper(item)) {
                    yield mapped;
                }
            }
        }.bind(this));
    }
    /**
     * Iterates over each item, and invokes the specified function.
     * @param fn Function to invoke against each item.
     */
    forEach(fn) {
        for (const item of this) {
            fn(item);
        }
    }
    /**
     * Determines whether the search item exists in the collection exists.
     * @param search Item to search for.
     * @returns `true` when the item was found; otherwise `false`.
     */
    includes(search) {
        return this.some((item) => item === search);
    }
    /**
     * Returns an iterator of mapped items using the mapper function.
     * @param mapper Function responsible for mapping the items.
     * @returns An iterator of mapped items.
     */
    map(mapper) {
        return new Enumerable(function* () {
            for (const item of this) {
                yield mapper(item);
            }
        }.bind(this));
    }
    /**
     * Captures the underlying iterable, if it is not already captured, and gets the next item in the iterator.
     * @param args Optional values to send to the generator.
     * @returns An iterator result of the current iteration; when `done` is `false`, the current `value` is provided.
     */
    next(...args) {
        this.#iterator ??= this.#items();
        const result = this.#iterator.next(...args);
        if (result.done) {
            this.#iterator = undefined;
        }
        return result;
    }
    /**
     * Applies the accumulator function to each item, and returns the result.
     * @param accumulator Function responsible for accumulating all items within the collection.
     * @param initial Initial value supplied to the accumulator.
     * @returns Result of accumulating each value.
     */
    reduce(accumulator, initial) {
        if (this.length === 0) {
            if (initial === undefined) {
                throw new TypeError("Reduce of empty enumerable with no initial value.");
            }
            return initial;
        }
        let result = initial;
        for (const item of this) {
            if (result === undefined) {
                result = item;
            }
            else {
                result = accumulator(result, item);
            }
        }
        return result;
    }
    /**
     * Acts as if a `return` statement is inserted in the generator's body at the current suspended position.
     *
     * Please note, in the context of an {@link Enumerable}, calling {@link Enumerable.return} will clear the captured iterator,
     * if there is one. Subsequent calls to {@link Enumerable.next} will result in re-capturing the underlying iterable, and
     * yielding items from the beginning.
     * @param value Value to return.
     * @returns The value as an iterator result.
     */
    return(value) {
        this.#iterator = undefined;
        return { done: true, value };
    }
    /**
     * Determines whether an item in the collection exists that satisfies the specified predicate.
     * @param predicate Function used to search for an item.
     * @returns `true` when the item was found; otherwise `false`.
     */
    some(predicate) {
        for (const item of this) {
            if (predicate(item)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Returns an iterator with the items, from 0, up to the specified limit.
     * @param limit Limit of items to take.
     * @returns An iterator of items from 0 to the limit.
     */
    take(limit) {
        if (isNaN(limit) || limit < 0) {
            throw new RangeError("limit must be 0, or a positive number");
        }
        return new Enumerable(function* () {
            let i = 0;
            for (const item of this) {
                if (i++ < limit) {
                    yield item;
                }
            }
        }.bind(this));
    }
    /**
     * Acts as if a `throw` statement is inserted in the generator's body at the current suspended position.
     * @param e Error to throw.
     */
    throw(e) {
        throw e;
    }
    /**
     * Converts this iterator to an array.
     * @returns The array of items from this iterator.
     */
    toArray() {
        return Array.from(this);
    }
    /**
     * Converts this iterator to serializable collection.
     * @returns The serializable collection of items.
     */
    toJSON() {
        return this.toArray();
    }
    /**
     * Converts this iterator to a string.
     * @returns The string.
     */
    toString() {
        return `${this.toArray()}`;
    }
}

const __items$1 = new Map();
/**
 * Provides a read-only store of Stream Deck devices.
 */
class ReadOnlyActionStore extends Enumerable {
    /**
     * Initializes a new instance of the {@link ReadOnlyActionStore}.
     */
    constructor() {
        super(__items$1);
    }
    /**
     * Gets the action with the specified identifier.
     * @param id Identifier of action to search for.
     * @returns The action, when present; otherwise `undefined`.
     */
    getActionById(id) {
        return __items$1.get(id);
    }
}
/**
 * Provides a store of Stream Deck actions.
 */
class ActionStore extends ReadOnlyActionStore {
    /**
     * Deletes the action from the store.
     * @param id The action's identifier.
     */
    delete(id) {
        __items$1.delete(id);
    }
    /**
     * Adds the action to the store.
     * @param action The action.
     */
    set(action) {
        __items$1.set(action.id, action);
    }
}
/**
 * Singleton instance of the action store.
 */
const actionStore = new ActionStore();

/**
 * Provides information for events relating to an application.
 */
class ApplicationEvent extends Event {
    /**
     * Monitored application that was launched/terminated.
     */
    application;
    /**
     * Initializes a new instance of the {@link ApplicationEvent} class.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     */
    constructor(source) {
        super(source);
        this.application = source.payload.application;
    }
}

/**
 * Provides information for events relating to a device.
 */
class DeviceEvent extends Event {
    device;
    /**
     * Initializes a new instance of the {@link DeviceEvent} class.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     * @param device Device that event is associated with.
     */
    constructor(source, device) {
        super(source);
        this.device = device;
    }
}

/**
 * Event information received from Stream Deck as part of a deep-link message being routed to the plugin.
 */
class DidReceiveDeepLinkEvent extends Event {
    /**
     * Deep-link URL routed from Stream Deck.
     */
    url;
    /**
     * Initializes a new instance of the {@link DidReceiveDeepLinkEvent} class.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     */
    constructor(source) {
        super(source);
        this.url = new DeepLinkURL(source.payload.url);
    }
}
const PREFIX = "streamdeck://";
/**
 * Provides information associated with a URL received as part of a deep-link message, conforming to the URI syntax defined within RFC-3986 (https://datatracker.ietf.org/doc/html/rfc3986#section-3).
 */
class DeepLinkURL {
    /**
     * Fragment of the URL, with the number sign (#) omitted. For example, a URL of "/test#heading" would result in a {@link DeepLinkURL.fragment} of "heading".
     */
    fragment;
    /**
     * Original URL. For example, a URL of "/test?one=two#heading" would result in a {@link DeepLinkURL.href} of "/test?one=two#heading".
     */
    href;
    /**
     * Path of the URL; the full URL with the query and fragment omitted. For example, a URL of "/test?one=two#heading" would result in a {@link DeepLinkURL.path} of "/test".
     */
    path;
    /**
     * Query of the URL, with the question mark (?) omitted. For example, a URL of "/test?name=elgato&key=123" would result in a {@link DeepLinkURL.query} of "name=elgato&key=123".
     * See also {@link DeepLinkURL.queryParameters}.
     */
    query;
    /**
     * Query string parameters parsed from the URL. See also {@link DeepLinkURL.query}.
     */
    queryParameters;
    /**
     * Initializes a new instance of the {@link DeepLinkURL} class.
     * @param url URL of the deep-link, with the schema and authority omitted.
     */
    constructor(url) {
        const refUrl = new URL(`${PREFIX}${url}`);
        this.fragment = refUrl.hash.substring(1);
        this.href = refUrl.href.substring(PREFIX.length);
        this.path = DeepLinkURL.parsePath(this.href);
        this.query = refUrl.search.substring(1);
        this.queryParameters = refUrl.searchParams;
    }
    /**
     * Parses the {@link DeepLinkURL.path} from the specified {@link href}.
     * @param href Partial URL that contains the path to parse.
     * @returns The path of the URL.
     */
    static parsePath(href) {
        const indexOf = (char) => {
            const index = href.indexOf(char);
            return index >= 0 ? index : href.length;
        };
        return href.substring(0, Math.min(indexOf("?"), indexOf("#")));
    }
}

/**
 * Provides information for an event triggered by a message being sent to the plugin, from the property inspector.
 */
class SendToPluginEvent extends Event {
    action;
    /**
     * Payload sent from the property inspector.
     */
    payload;
    /**
     * Initializes a new instance of the {@link SendToPluginEvent} class.
     * @param action Action that raised the event.
     * @param source Source of the event, i.e. the original message from Stream Deck.
     */
    constructor(action, source) {
        super(source);
        this.action = action;
        this.payload = source.payload;
    }
}

/**
 * Gets the global settings associated with the plugin. Use in conjunction with {@link setGlobalSettings}.
 * @template T The type of global settings associated with the plugin.
 * @returns Promise containing the plugin's global settings.
 */
function getGlobalSettings() {
    return new Promise((resolve) => {
        connection.once("didReceiveGlobalSettings", (ev) => resolve(ev.payload.settings));
        connection.send({
            event: "getGlobalSettings",
            context: connection.registrationParameters.pluginUUID,
        });
    });
}
/**
 * Occurs when the global settings are requested using {@link getGlobalSettings}, or when the the global settings were updated by the property inspector.
 * @template T The type of settings associated with the action.
 * @param listener Function to be invoked when the event occurs.
 * @returns A disposable that, when disposed, removes the listener.
 */
function onDidReceiveGlobalSettings(listener) {
    return connection.disposableOn("didReceiveGlobalSettings", (ev) => listener(new DidReceiveGlobalSettingsEvent(ev)));
}
/**
 * Occurs when the settings associated with an action instance are requested using {@link Action.getSettings}, or when the the settings were updated by the property inspector.
 * @template T The type of settings associated with the action.
 * @param listener Function to be invoked when the event occurs.
 * @returns A disposable that, when disposed, removes the listener.
 */
function onDidReceiveSettings(listener) {
    return connection.disposableOn("didReceiveSettings", (ev) => {
        const action = actionStore.getActionById(ev.context);
        if (action) {
            listener(new ActionEvent(action, ev));
        }
    });
}
/**
 * Sets the global {@link settings} associated the plugin. **Note**, these settings are only available to this plugin, and should be used to persist information securely. Use in
 * conjunction with {@link getGlobalSettings}.
 * @param settings Settings to save.
 * @returns `Promise` resolved when the global `settings` are sent to Stream Deck.
 * @example
 * streamDeck.settings.setGlobalSettings({
 *   apiKey,
 *   connectedDate: new Date()
 * })
 */
function setGlobalSettings(settings) {
    return connection.send({
        event: "setGlobalSettings",
        context: connection.registrationParameters.pluginUUID,
        payload: settings,
    });
}

var settings = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getGlobalSettings: getGlobalSettings,
    onDidReceiveGlobalSettings: onDidReceiveGlobalSettings,
    onDidReceiveSettings: onDidReceiveSettings,
    setGlobalSettings: setGlobalSettings
});

/**
 * Property inspector providing information about its context, and functions for sending and fetching messages.
 */
class PropertyInspector {
    router;
    /**
     * Action associated with the property inspector
     */
    action;
    /**
     * Initializes a new instance of the {@link PropertyInspector} class.
     * @param router Router responsible for fetching requests.
     * @param source Source the property inspector is associated with.
     */
    constructor(router, source) {
        this.router = router;
        this.action = actionStore.getActionById(source.context);
    }
    /**
     * Sends a fetch request to the property inspector; the property inspector can listen for requests by registering routes.
     * @template T The type of the response body.
     * @param requestOrPath The request, or the path of the request.
     * @param bodyOrUndefined Request body, or moot when constructing the request with {@link MessageRequestOptions}.
     * @returns The response.
     */
    async fetch(requestOrPath, bodyOrUndefined) {
        if (typeof requestOrPath === "string") {
            return this.router.fetch(`${PUBLIC_PATH_PREFIX}${requestOrPath}`, bodyOrUndefined);
        }
        else {
            return this.router.fetch({
                ...requestOrPath,
                path: `${PUBLIC_PATH_PREFIX}${requestOrPath.path}`,
            });
        }
    }
    /**
     * Sends the {@link payload} to the property inspector. The plugin can also receive information from the property inspector via {@link streamDeck.ui.onSendToPlugin} and {@link SingletonAction.onSendToPlugin}
     * allowing for bi-directional communication.
     * @template T The type of the payload received from the property inspector.
     * @param payload Payload to send to the property inspector.
     * @returns `Promise` resolved when {@link payload} has been sent to the property inspector.
     */
    sendToPropertyInspector(payload) {
        return connection.send({
            event: "sendToPropertyInspector",
            context: this.action.id,
            payload,
        });
    }
}

let current;
let debounceCount = 0;
/**
 * Gets the current property inspector.
 * @returns The property inspector; otherwise `undefined`.
 */
function getCurrentUI() {
    return current;
}
/**
 * Router responsible for communicating with the property inspector.
 */
const router = new MessageGateway(async (payload) => {
    const current = getCurrentUI();
    if (current) {
        await connection.send({
            event: "sendToPropertyInspector",
            context: current.action.id,
            payload,
        });
        return true;
    }
    return false;
}, (source) => actionStore.getActionById(source.context));
/**
 * Determines whether the specified event is related to the current tracked property inspector.
 * @param ev The event.
 * @returns `true` when the event is related to the current property inspector.
 */
function isCurrent(ev) {
    return (current?.action?.id === ev.context &&
        current?.action?.manifestId === ev.action &&
        current?.action?.device?.id === ev.device);
}
/*
 * To overcome event races, the debounce counter keeps track of appear vs disappear events, ensuring we only
 * clear the current ui when an equal number of matching disappear events occur.
 */
connection.on("propertyInspectorDidAppear", (ev) => {
    if (isCurrent(ev)) {
        debounceCount++;
    }
    else {
        debounceCount = 1;
        current = new PropertyInspector(router, ev);
    }
});
connection.on("propertyInspectorDidDisappear", (ev) => {
    if (isCurrent(ev)) {
        debounceCount--;
        if (debounceCount <= 0) {
            current = undefined;
        }
    }
});
connection.on("sendToPlugin", (ev) => router.process(ev));

/**
 * Controller responsible for interacting with the property inspector associated with the plugin.
 */
class UIController {
    /**
     * Gets the current property inspector.
     * @returns The property inspector; otherwise `undefined`.
     */
    get current() {
        return getCurrentUI();
    }
    /**
     * Occurs when the property inspector associated with the action becomes visible, i.e. the user selected an action in the Stream Deck application. See also {@link UIController.onDidDisappear}.
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDidAppear(listener) {
        return connection.disposableOn("propertyInspectorDidAppear", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action) {
                listener(new ActionWithoutPayloadEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when the property inspector associated with the action becomes destroyed, i.e. the user unselected the action in the Stream Deck application. See also {@link UIController.onDidAppear}.
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDidDisappear(listener) {
        return connection.disposableOn("propertyInspectorDidDisappear", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action) {
                listener(new ActionWithoutPayloadEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when a message was sent to the plugin _from_ the property inspector. The plugin can also send messages _to_ the property inspector using {@link UIController.current.sendMessage}
     * or {@link Action.sendToPropertyInspector}.
     * @template TPayload The type of the payload received from the property inspector.
     * @template TSettings The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onSendToPlugin(listener) {
        return router.disposableOn("unhandledMessage", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action) {
                listener(new SendToPluginEvent(action, ev));
            }
        });
    }
    /**
     * Registers the function as a route, exposing it to the property inspector via `streamDeck.plugin.fetch(path)`.
     * @template TBody The type of the request body.
     * @template TSettings The type of the action's settings.
     * @param path Path that identifies the route.
     * @param handler Handler to be invoked when a matching request is received.
     * @param options Optional routing configuration.
     * @returns Disposable capable of removing the route handler.
     * @example
     * streamDeck.ui.registerRoute("/toggle-light", async (req, res) => {
     *   await lightService.toggle(req.body.lightId);
     *   res.success();
     * });
     */
    registerRoute(path, handler, options) {
        return router.route(`${PUBLIC_PATH_PREFIX}${path}`, handler, options);
    }
}
const ui = new UIController();

const __items = new Map();
/**
 * Provides a read-only store of Stream Deck devices.
 */
class ReadOnlyDeviceStore extends Enumerable {
    /**
     * Initializes a new instance of the {@link ReadOnlyDeviceStore}.
     */
    constructor() {
        super(__items);
    }
    /**
     * Gets the Stream Deck {@link Device} associated with the specified {@link deviceId}.
     * @param deviceId Identifier of the Stream Deck device.
     * @returns The Stream Deck device information; otherwise `undefined` if a device with the {@link deviceId} does not exist.
     */
    getDeviceById(deviceId) {
        return __items.get(deviceId);
    }
}
/**
 * Provides a store of Stream Deck devices.
 */
class DeviceStore extends ReadOnlyDeviceStore {
    /**
     * Adds the device to the store.
     * @param device The device.
     */
    set(device) {
        __items.set(device.id, device);
    }
}
/**
 * Singleton instance of the device store.
 */
const deviceStore = new DeviceStore();

/**
 * Provides information about an instance of a Stream Deck action.
 */
class ActionContext {
    /**
     * Device the action is associated with.
     */
    #device;
    /**
     * Source of the action.
     */
    #source;
    /**
     * Initializes a new instance of the {@link ActionContext} class.
     * @param source Source of the action.
     */
    constructor(source) {
        this.#source = source;
        const device = deviceStore.getDeviceById(source.device);
        if (!device) {
            throw new Error(`Failed to initialize action; device ${source.device} not found`);
        }
        this.#device = device;
    }
    /**
     * Type of the action.
     * - `Keypad` is a key.
     * - `Encoder` is a dial and portion of the touch strip.
     * @returns Controller type.
     */
    get controllerType() {
        return this.#source.payload.controller;
    }
    /**
     * Stream Deck device the action is positioned on.
     * @returns Stream Deck device.
     */
    get device() {
        return this.#device;
    }
    /**
     * Action instance identifier.
     * @returns Identifier.
     */
    get id() {
        return this.#source.context;
    }
    /**
     * Manifest identifier (UUID) for this action type.
     * @returns Manifest identifier.
     */
    get manifestId() {
        return this.#source.action;
    }
    /**
     * Converts this instance to a serializable object.
     * @returns The serializable object.
     */
    toJSON() {
        return {
            controllerType: this.controllerType,
            device: this.device,
            id: this.id,
            manifestId: this.manifestId,
        };
    }
}

/**
 * Provides a contextualized instance of an {@link Action}, allowing for direct communication with the Stream Deck.
 * @template T The type of settings associated with the action.
 */
class Action extends ActionContext {
    /**
     * Gets the settings associated this action instance.
     * @template U The type of settings associated with the action.
     * @returns Promise containing the action instance's settings.
     */
    getSettings() {
        return new Promise((resolve) => {
            const callback = (ev) => {
                if (ev.context == this.id) {
                    resolve(ev.payload.settings);
                    connection.removeListener("didReceiveSettings", callback);
                }
            };
            connection.on("didReceiveSettings", callback);
            connection.send({
                event: "getSettings",
                context: this.id,
            });
        });
    }
    /**
     * Determines whether this instance is a dial.
     * @returns `true` when this instance is a dial; otherwise `false`.
     */
    isDial() {
        return this.controllerType === "Encoder";
    }
    /**
     * Determines whether this instance is a key.
     * @returns `true` when this instance is a key; otherwise `false`.
     */
    isKey() {
        return this.controllerType === "Keypad";
    }
    /**
     * Sets the {@link settings} associated with this action instance. Use in conjunction with {@link Action.getSettings}.
     * @param settings Settings to persist.
     * @returns `Promise` resolved when the {@link settings} are sent to Stream Deck.
     */
    setSettings(settings) {
        return connection.send({
            event: "setSettings",
            context: this.id,
            payload: settings,
        });
    }
    /**
     * Temporarily shows an alert (i.e. warning), in the form of an exclamation mark in a yellow triangle, on this action instance. Used to provide visual feedback when an action failed.
     * @returns `Promise` resolved when the request to show an alert has been sent to Stream Deck.
     */
    showAlert() {
        return connection.send({
            event: "showAlert",
            context: this.id,
        });
    }
}

/**
 * Provides a contextualized instance of a dial action.
 * @template T The type of settings associated with the action.
 */
class DialAction extends Action {
    /**
     * Private backing field for {@link DialAction.coordinates}.
     */
    #coordinates;
    /**
     * Initializes a new instance of the {@see DialAction} class.
     * @param source Source of the action.
     */
    constructor(source) {
        super(source);
        if (source.payload.controller !== "Encoder") {
            throw new Error("Unable to create DialAction; source event is not a Encoder");
        }
        this.#coordinates = Object.freeze(source.payload.coordinates);
    }
    /**
     * Coordinates of the dial.
     * @returns The coordinates.
     */
    get coordinates() {
        return this.#coordinates;
    }
    /**
     * Sets the feedback for the current layout associated with this action instance, allowing for the visual items to be updated. Layouts are a powerful way to provide dynamic information
     * to users, and can be assigned in the manifest, or dynamically via {@link Action.setFeedbackLayout}.
     *
     * The {@link feedback} payload defines which items within the layout will be updated, and are identified by their property name (defined as the `key` in the layout's definition).
     * The values can either by a complete new definition, a `string` for layout item types of `text` and `pixmap`, or a `number` for layout item types of `bar` and `gbar`.
     * @param feedback Object containing information about the layout items to be updated.
     * @returns `Promise` resolved when the request to set the {@link feedback} has been sent to Stream Deck.
     */
    setFeedback(feedback) {
        return connection.send({
            event: "setFeedback",
            context: this.id,
            payload: feedback,
        });
    }
    /**
     * Sets the layout associated with this action instance. The layout must be either a built-in layout identifier, or path to a local layout JSON file within the plugin's folder.
     * Use in conjunction with {@link Action.setFeedback} to update the layout's current items' settings.
     * @param layout Name of a pre-defined layout, or relative path to a custom one.
     * @returns `Promise` resolved when the new layout has been sent to Stream Deck.
     */
    setFeedbackLayout(layout) {
        return connection.send({
            event: "setFeedbackLayout",
            context: this.id,
            payload: {
                layout,
            },
        });
    }
    /**
     * Sets the {@link image} to be display for this action instance within Stream Deck app.
     *
     * NB: The image can only be set by the plugin when the the user has not specified a custom image.
     * @param image Image to display; this can be either a path to a local file within the plugin's folder, a base64 encoded `string` with the mime type declared (e.g. PNG, JPEG, etc.),
     * or an SVG `string`. When `undefined`, the image from the manifest will be used.
     * @returns `Promise` resolved when the request to set the {@link image} has been sent to Stream Deck.
     */
    setImage(image) {
        return connection.send({
            event: "setImage",
            context: this.id,
            payload: {
                image,
            },
        });
    }
    /**
     * Sets the {@link title} displayed for this action instance.
     *
     * NB: The title can only be set by the plugin when the the user has not specified a custom title.
     * @param title Title to display.
     * @returns `Promise` resolved when the request to set the {@link title} has been sent to Stream Deck.
     */
    setTitle(title) {
        return this.setFeedback({ title });
    }
    /**
     * Sets the trigger (interaction) {@link descriptions} associated with this action instance. Descriptions are shown within the Stream Deck application, and informs the user what
     * will happen when they interact with the action, e.g. rotate, touch, etc. When {@link descriptions} is `undefined`, the descriptions will be reset to the values provided as part
     * of the manifest.
     *
     * NB: Applies to encoders (dials / touchscreens) found on Stream Deck + devices.
     * @param descriptions Descriptions that detail the action's interaction.
     * @returns `Promise` resolved when the request to set the {@link descriptions} has been sent to Stream Deck.
     */
    setTriggerDescription(descriptions) {
        return connection.send({
            event: "setTriggerDescription",
            context: this.id,
            payload: descriptions || {},
        });
    }
    /**
     * @inheritdoc
     */
    toJSON() {
        return {
            ...super.toJSON(),
            coordinates: this.coordinates,
        };
    }
}

/**
 * Provides a contextualized instance of a key action.
 * @template T The type of settings associated with the action.
 */
class KeyAction extends Action {
    /**
     * Private backing field for {@link KeyAction.coordinates}.
     */
    #coordinates;
    /**
     * Source of the action.
     */
    #source;
    /**
     * Initializes a new instance of the {@see KeyAction} class.
     * @param source Source of the action.
     */
    constructor(source) {
        super(source);
        if (source.payload.controller !== "Keypad") {
            throw new Error("Unable to create KeyAction; source event is not a Keypad");
        }
        this.#coordinates = !source.payload.isInMultiAction ? Object.freeze(source.payload.coordinates) : undefined;
        this.#source = source;
    }
    /**
     * Coordinates of the key; otherwise `undefined` when the action is part of a multi-action.
     * @returns The coordinates.
     */
    get coordinates() {
        return this.#coordinates;
    }
    /**
     * Determines whether the key is part of a multi-action.
     * @returns `true` when in a multi-action; otherwise `false`.
     */
    isInMultiAction() {
        return this.#source.payload.isInMultiAction;
    }
    /**
     * Sets the {@link image} to be display for this action instance.
     *
     * NB: The image can only be set by the plugin when the the user has not specified a custom image.
     * @param image Image to display; this can be either a path to a local file within the plugin's folder, a base64 encoded `string` with the mime type declared (e.g. PNG, JPEG, etc.),
     * or an SVG `string`. When `undefined`, the image from the manifest will be used.
     * @param options Additional options that define where and how the image should be rendered.
     * @returns `Promise` resolved when the request to set the {@link image} has been sent to Stream Deck.
     */
    setImage(image, options) {
        return connection.send({
            event: "setImage",
            context: this.id,
            payload: {
                image,
                ...options,
            },
        });
    }
    /**
     * Sets the current {@link state} of this action instance; only applies to actions that have multiple states defined within the manifest.
     * @param state State to set; this be either 0, or 1.
     * @returns `Promise` resolved when the request to set the state of an action instance has been sent to Stream Deck.
     */
    setState(state) {
        return connection.send({
            event: "setState",
            context: this.id,
            payload: {
                state,
            },
        });
    }
    /**
     * Sets the {@link title} displayed for this action instance.
     *
     * NB: The title can only be set by the plugin when the the user has not specified a custom title.
     * @param title Title to display; when `undefined` the title within the manifest will be used.
     * @param options Additional options that define where and how the title should be rendered.
     * @returns `Promise` resolved when the request to set the {@link title} has been sent to Stream Deck.
     */
    setTitle(title, options) {
        return connection.send({
            event: "setTitle",
            context: this.id,
            payload: {
                title,
                ...options,
            },
        });
    }
    /**
     * Temporarily shows an "OK" (i.e. success), in the form of a check-mark in a green circle, on this action instance. Used to provide visual feedback when an action successfully
     * executed.
     * @returns `Promise` resolved when the request to show an "OK" has been sent to Stream Deck.
     */
    showOk() {
        return connection.send({
            event: "showOk",
            context: this.id,
        });
    }
    /**
     * @inheritdoc
     */
    toJSON() {
        return {
            ...super.toJSON(),
            coordinates: this.coordinates,
            isInMultiAction: this.isInMultiAction(),
        };
    }
}

const manifest = new Lazy(() => getManifest());
/**
 * Provides functions, and information, for interacting with Stream Deck actions.
 */
class ActionService extends ReadOnlyActionStore {
    /**
     * Initializes a new instance of the {@link ActionService} class.
     */
    constructor() {
        super();
        // Adds the action to the store.
        connection.prependListener("willAppear", (ev) => {
            const action = ev.payload.controller === "Encoder" ? new DialAction(ev) : new KeyAction(ev);
            actionStore.set(action);
        });
        // Remove the action from the store.
        connection.prependListener("willDisappear", (ev) => actionStore.delete(ev.context));
    }
    /**
     * Occurs when the user presses a dial (Stream Deck +).
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDialDown(listener) {
        return connection.disposableOn("dialDown", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action?.isDial()) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when the user rotates a dial (Stream Deck +).
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDialRotate(listener) {
        return connection.disposableOn("dialRotate", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action?.isDial()) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when the user releases a pressed dial (Stream Deck +).
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDialUp(listener) {
        return connection.disposableOn("dialUp", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action?.isDial()) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when the user presses a action down.
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onKeyDown(listener) {
        return connection.disposableOn("keyDown", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action?.isKey()) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when the user releases a pressed action.
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onKeyUp(listener) {
        return connection.disposableOn("keyUp", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action?.isKey()) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when the user updates an action's title settings in the Stream Deck application. See also {@link Action.setTitle}.
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onTitleParametersDidChange(listener) {
        return connection.disposableOn("titleParametersDidChange", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when the user taps the touchscreen (Stream Deck +).
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onTouchTap(listener) {
        return connection.disposableOn("touchTap", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action?.isDial()) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when an action appears on the Stream Deck due to the user navigating to another page, profile, folder, etc. This also occurs during startup if the action is on the "front
     * page". An action refers to _all_ types of actions, e.g. keys, dials,
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onWillAppear(listener) {
        return connection.disposableOn("willAppear", (ev) => {
            const action = actionStore.getActionById(ev.context);
            if (action) {
                listener(new ActionEvent(action, ev));
            }
        });
    }
    /**
     * Occurs when an action disappears from the Stream Deck due to the user navigating to another page, profile, folder, etc. An action refers to _all_ types of actions, e.g. keys,
     * dials, touchscreens, pedals, etc.
     * @template T The type of settings associated with the action.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onWillDisappear(listener) {
        return connection.disposableOn("willDisappear", (ev) => listener(new ActionEvent(new ActionContext(ev), ev)));
    }
    /**
     * Registers the action with the Stream Deck, routing all events associated with the {@link SingletonAction.manifestId} to the specified {@link action}.
     * @param action The action to register.
     * @example
     * ＠action({ UUID: "com.elgato.test.action" })
     * class MyCustomAction extends SingletonAction {
     *     export function onKeyDown(ev: KeyDownEvent) {
     *         // Do some awesome thing.
     *     }
     * }
     *
     * streamDeck.actions.registerAction(new MyCustomAction());
     */
    registerAction(action) {
        if (action.manifestId === undefined) {
            throw new Error("The action's manifestId cannot be undefined.");
        }
        if (!manifest.value.Actions.some((a) => a.UUID === action.manifestId)) {
            throw new Error(`The action's manifestId was not found within the manifest: ${action.manifestId}`);
        }
        // Routes an event to the action, when the applicable listener is defined on the action.
        const { manifestId } = action;
        const route = (fn, listener) => {
            const boundedListener = listener?.bind(action);
            if (boundedListener === undefined) {
                return;
            }
            fn.bind(action)(async (ev) => {
                if (ev.action.manifestId == manifestId) {
                    await boundedListener(ev);
                }
            });
        };
        // Route each of the action events.
        route(this.onDialDown, action.onDialDown);
        route(this.onDialUp, action.onDialUp);
        route(this.onDialRotate, action.onDialRotate);
        route(ui.onSendToPlugin, action.onSendToPlugin);
        route(onDidReceiveSettings, action.onDidReceiveSettings);
        route(this.onKeyDown, action.onKeyDown);
        route(this.onKeyUp, action.onKeyUp);
        route(ui.onDidAppear, action.onPropertyInspectorDidAppear);
        route(ui.onDidDisappear, action.onPropertyInspectorDidDisappear);
        route(this.onTitleParametersDidChange, action.onTitleParametersDidChange);
        route(this.onTouchTap, action.onTouchTap);
        route(this.onWillAppear, action.onWillAppear);
        route(this.onWillDisappear, action.onWillDisappear);
    }
}
/**
 * Service for interacting with Stream Deck actions.
 */
const actionService = new ActionService();

/**
 * Validates the {@link streamDeckVersion} and manifest's `Software.MinimumVersion` are at least the {@link minimumVersion}; when the version is not fulfilled, an error is thrown with the
 * {@link feature} formatted into the message.
 * @param minimumVersion Minimum required version.
 * @param streamDeckVersion Actual application version.
 * @param feature Feature that requires the version.
 */
function requiresVersion(minimumVersion, streamDeckVersion, feature) {
    const required = {
        major: Math.floor(minimumVersion),
        minor: Number(minimumVersion.toString().split(".").at(1) ?? 0), // Account for JavaScript's floating point precision.
        patch: 0,
        build: 0,
    };
    if (streamDeckVersion.compareTo(required) === -1) {
        throw new Error(`[ERR_NOT_SUPPORTED]: ${feature} requires Stream Deck version ${required.major}.${required.minor} or higher, but current version is ${streamDeckVersion.major}.${streamDeckVersion.minor}; please update Stream Deck and the "Software.MinimumVersion" in the plugin's manifest to "${required.major}.${required.minor}" or higher.`);
    }
    else if (getSoftwareMinimumVersion().compareTo(required) === -1) {
        throw new Error(`[ERR_NOT_SUPPORTED]: ${feature} requires Stream Deck version ${required.major}.${required.minor} or higher; please update the "Software.MinimumVersion" in the plugin's manifest to "${required.major}.${required.minor}" or higher.`);
    }
}

/**
 * Provides information about a device.
 */
class Device {
    /**
     * Private backing field for {@link Device.isConnected}.
     */
    #isConnected = false;
    /**
     * Private backing field for the device's information.
     */
    #info;
    /**
     * Unique identifier of the device.
     */
    id;
    /**
     * Initializes a new instance of the {@link Device} class.
     * @param id Device identifier.
     * @param info Information about the device.
     * @param isConnected Determines whether the device is connected.
     */
    constructor(id, info, isConnected) {
        this.id = id;
        this.#info = info;
        this.#isConnected = isConnected;
        // Set connected.
        connection.prependListener("deviceDidConnect", (ev) => {
            if (ev.device === this.id) {
                this.#info = ev.deviceInfo;
                this.#isConnected = true;
            }
        });
        // Track changes.
        connection.prependListener("deviceDidChange", (ev) => {
            if (ev.device === this.id) {
                this.#info = ev.deviceInfo;
            }
        });
        // Set disconnected.
        connection.prependListener("deviceDidDisconnect", (ev) => {
            if (ev.device === this.id) {
                this.#isConnected = false;
            }
        });
    }
    /**
     * Actions currently visible on the device.
     * @returns Collection of visible actions.
     */
    get actions() {
        return actionStore.filter((a) => a.device.id === this.id);
    }
    /**
     * Determines whether the device is currently connected.
     * @returns `true` when the device is connected; otherwise `false`.
     */
    get isConnected() {
        return this.#isConnected;
    }
    /**
     * Name of the device, as specified by the user in the Stream Deck application.
     * @returns Name of the device.
     */
    get name() {
        return this.#info.name;
    }
    /**
     * Number of action slots, excluding dials / touchscreens, available to the device.
     * @returns Size of the device.
     */
    get size() {
        return this.#info.size;
    }
    /**
     * Type of the device that was connected, e.g. Stream Deck +, Stream Deck Pedal, etc. See {@link DeviceType}.
     * @returns Type of the device.
     */
    get type() {
        return this.#info.type;
    }
}

/**
 * Provides functions, and information, for interacting with Stream Deck actions.
 */
class DeviceService extends ReadOnlyDeviceStore {
    /**
     * Initializes a new instance of the {@link DeviceService}.
     */
    constructor() {
        super();
        // Add the devices from registration parameters.
        connection.once("connected", (info) => {
            info.devices.forEach((dev) => deviceStore.set(new Device(dev.id, dev, false)));
        });
        // Add new devices that were connected.
        connection.on("deviceDidConnect", ({ device: id, deviceInfo }) => {
            if (!deviceStore.getDeviceById(id)) {
                deviceStore.set(new Device(id, deviceInfo, true));
            }
        });
        // Add new devices that were changed (Virtual Stream Deck event race).
        connection.on("deviceDidChange", ({ device: id, deviceInfo }) => {
            if (!deviceStore.getDeviceById(id)) {
                deviceStore.set(new Device(id, deviceInfo, false));
            }
        });
    }
    /**
     * Occurs when a Stream Deck device changed, for example its name or size.
     *
     * Available from Stream Deck 7.0.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDeviceDidChange(listener) {
        requiresVersion(7.0, connection.version, "onDeviceDidChange");
        return connection.disposableOn("deviceDidChange", (ev) => listener(new DeviceEvent(ev, this.getDeviceById(ev.device))));
    }
    /**
     * Occurs when a Stream Deck device is connected. See also {@link DeviceService.onDeviceDidConnect}.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDeviceDidConnect(listener) {
        return connection.disposableOn("deviceDidConnect", (ev) => listener(new DeviceEvent(ev, this.getDeviceById(ev.device))));
    }
    /**
     * Occurs when a Stream Deck device is disconnected. See also {@link DeviceService.onDeviceDidDisconnect}.
     * @param listener Function to be invoked when the event occurs.
     * @returns A disposable that, when disposed, removes the listener.
     */
    onDeviceDidDisconnect(listener) {
        return connection.disposableOn("deviceDidDisconnect", (ev) => listener(new DeviceEvent(ev, this.getDeviceById(ev.device))));
    }
}
/**
 * Provides functions, and information, for interacting with Stream Deck actions.
 */
const deviceService = new DeviceService();

/**
 * Loads a locale from the file system.
 * @param language Language to load.
 * @returns Contents of the locale.
 */
function fileSystemLocaleProvider(language) {
    const filePath = path.join(process.cwd(), `${language}.json`);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    try {
        // Parse the translations from the file.
        const contents = fs.readFileSync(filePath, { flag: "r" })?.toString();
        return parseLocalizations(contents);
    }
    catch (err) {
        logger.error(`Failed to load translations from ${filePath}`, err);
        return null;
    }
}

/**
 * Collection of error codes.
 */
const errorCode = {
    /**
     * Indicates the current Node.js SDK is not compatible with the SDK Version specified within the manifest.
     */
    incompatibleSdkVersion: 652025,
};

/**
 * Requests the Stream Deck switches the current profile of the specified {@link deviceId} to the {@link profile}; when no {@link profile} is provided the previously active profile
 * is activated.
 *
 * NB: Plugins may only switch to profiles distributed with the plugin, as defined within the manifest, and cannot access user-defined profiles.
 * @param deviceId Unique identifier of the device where the profile should be set.
 * @param profile Optional name of the profile to switch to; when `undefined` the previous profile will be activated. Name must be identical to the one provided in the manifest.
 * @param page Optional page to show when switching to the {@link profile}, indexed from 0. When `undefined`, the page that was previously visible (when switching away from the
 * profile) will be made visible.
 * @returns `Promise` resolved when the request to switch the `profile` has been sent to Stream Deck.
 */
function switchToProfile(deviceId, profile, page) {
    if (page !== undefined) {
        requiresVersion(6.5, connection.version, "Switching to a profile page");
    }
    return connection.send({
        event: "switchToProfile",
        context: connection.registrationParameters.pluginUUID,
        device: deviceId,
        payload: {
            page,
            profile,
        },
    });
}

var profiles = /*#__PURE__*/Object.freeze({
    __proto__: null,
    switchToProfile: switchToProfile
});

/**
 * Occurs when a monitored application is launched. Monitored applications can be defined in the manifest via the {@link Manifest.ApplicationsToMonitor} property.
 * See also {@link onApplicationDidTerminate}.
 * @param listener Function to be invoked when the event occurs.
 * @returns A disposable that, when disposed, removes the listener.
 */
function onApplicationDidLaunch(listener) {
    return connection.disposableOn("applicationDidLaunch", (ev) => listener(new ApplicationEvent(ev)));
}
/**
 * Occurs when a monitored application terminates. Monitored applications can be defined in the manifest via the {@link Manifest.ApplicationsToMonitor} property.
 * See also {@link onApplicationDidLaunch}.
 * @param listener Function to be invoked when the event occurs.
 * @returns A disposable that, when disposed, removes the listener.
 */
function onApplicationDidTerminate(listener) {
    return connection.disposableOn("applicationDidTerminate", (ev) => listener(new ApplicationEvent(ev)));
}
/**
 * Occurs when a deep-link message is routed to the plugin from Stream Deck. One-way deep-link messages can be sent to plugins from external applications using the URL format
 * `streamdeck://plugins/message/<PLUGIN_UUID>/{MESSAGE}`.
 * @param listener Function to be invoked when the event occurs.
 * @returns A disposable that, when disposed, removes the listener.
 */
function onDidReceiveDeepLink(listener) {
    requiresVersion(6.5, connection.version, "Receiving deep-link messages");
    return connection.disposableOn("didReceiveDeepLink", (ev) => listener(new DidReceiveDeepLinkEvent(ev)));
}
/**
 * Occurs when the computer wakes up.
 * @param listener Function to be invoked when the event occurs.
 * @returns A disposable that, when disposed, removes the listener.
 */
function onSystemDidWakeUp(listener) {
    return connection.disposableOn("systemDidWakeUp", (ev) => listener(new Event(ev)));
}
/**
 * Opens the specified `url` in the user's default browser.
 * @param url URL to open.
 * @returns `Promise` resolved when the request to open the `url` has been sent to Stream Deck.
 */
function openUrl(url) {
    return connection.send({
        event: "openUrl",
        payload: {
            url,
        },
    });
}

var system = /*#__PURE__*/Object.freeze({
    __proto__: null,
    onApplicationDidLaunch: onApplicationDidLaunch,
    onApplicationDidTerminate: onApplicationDidTerminate,
    onDidReceiveDeepLink: onDidReceiveDeepLink,
    onSystemDidWakeUp: onSystemDidWakeUp,
    openUrl: openUrl
});

/**
 * Defines a Stream Deck action associated with the plugin.
 * @param definition The definition of the action, e.g. it's identifier, name, etc.
 * @returns The definition decorator.
 */
function action(definition) {
    const manifestId = definition.UUID;
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars
    return function (target, context) {
        return class extends target {
            /**
             * The universally-unique value that identifies the action within the manifest.
             */
            manifestId = manifestId;
        };
    };
}

/**
 * Provides the main bridge between the plugin and the Stream Deck allowing the plugin to send requests and receive events, e.g. when the user presses an action.
 * @template T The type of settings associated with the action.
 */
class SingletonAction {
    /**
     * The universally-unique value that identifies the action within the manifest.
     */
    manifestId;
    /**
     * Gets the visible actions with the `manifestId` that match this instance's.
     * @returns The visible actions.
     */
    get actions() {
        return actionStore.filter((a) => a.manifestId === this.manifestId);
    }
}

let i18n;
const streamDeck = {
    /**
     * Namespace for event listeners and functionality relating to Stream Deck actions.
     * @returns Actions namespace.
     */
    get actions() {
        return actionService;
    },
    /**
     * Namespace for interacting with Stream Deck devices.
     * @returns Devices namespace.
     */
    get devices() {
        return deviceService;
    },
    /**
     * Internalization provider, responsible for managing localizations and translating resources.
     * @returns Internalization provider.
     */
    get i18n() {
        return (i18n ??= new I18nProvider(this.info.application.language, fileSystemLocaleProvider));
    },
    /**
     * Registration and application information provided by Stream Deck during initialization.
     * @returns Registration information.
     */
    get info() {
        return connection.registrationParameters.info;
    },
    /**
     * Logger responsible for capturing log messages.
     * @returns The logger.
     */
    get logger() {
        return logger;
    },
    /**
     * Manifest associated with the plugin, as defined within the `manifest.json` file.
     * @returns The manifest.
     */
    get manifest() {
        return getManifest();
    },
    /**
     * Namespace for Stream Deck profiles.
     * @returns Profiles namespace.
     */
    get profiles() {
        return profiles;
    },
    /**
     * Namespace for persisting settings within Stream Deck.
     * @returns Settings namespace.
     */
    get settings() {
        return settings;
    },
    /**
     * Namespace for interacting with, and receiving events from, the system the plugin is running on.
     * @returns System namespace.
     */
    get system() {
        return system;
    },
    /**
     * Namespace for interacting with UI (property inspector) associated with the plugin.
     * @returns UI namespace.
     */
    get ui() {
        return ui;
    },
    /**
     * Connects the plugin to the Stream Deck.
     * @returns A promise resolved when a connection has been established.
     */
    connect() {
        return connection.connect();
    },
};
registerCreateLogEntryRoute(router, logger);
/**
 * Validate compatibility with manifest `SDKVersion`.
 */
if (streamDeck.manifest.SDKVersion >= 3) {
    logger.error("[ERR_NOT_SUPPORTED]: Manifest SDKVersion 3 requires @elgato/streamdeck 2.0 or higher.");
    process.exit(errorCode.incompatibleSdkVersion);
}

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
}
function __runInitializers(thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
}
typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

/**
 * Spawns the tmux CLI. Stream Deck launches plugins with a minimal PATH that
 * usually lacks Homebrew, so we resolve an absolute tmux path. `exec`/`exists`
 * are injectable for tests.
 */
const TMUX_CANDIDATES = ["/opt/homebrew/bin/tmux", "/usr/local/bin/tmux", "/usr/bin/tmux"];
/** First tmux binary that exists, falling back to bare "tmux" (PATH lookup). */
function findTmuxPath(exists = existsSync) {
    return TMUX_CANDIDATES.find(exists) ?? "tmux";
}
/** tmux args that emit one window per line as `session|index|active|name`.
 * The NAME is last: window names may legally contain `|`, so every fixed-width
 * field comes first and the parser joins the remainder back into the name. */
const LIST_WINDOWS_ARGS = [
    "list-windows",
    "-a",
    "-F",
    "#{session_name}|#{window_index}|#{window_active}|#{window_name}",
];
/** tmux args that emit one client per line as `tty|session`. */
const LIST_CLIENTS_ARGS = ["list-clients", "-F", "#{client_tty}|#{client_session}"];
/**
 * Stream Deck launches plugins with a minimal environment — no LANG/LC_ALL —
 * so child processes run in the C locale and tmux TRANSLITERATES every
 * non-ASCII character in its output to "_": the Claude braille/✳ title
 * markers arrived as underscores and every session read "waiting" on-device
 * while every UTF-8 shell probe looked correct. Force UTF-8 for all children.
 */
const UTF8_ENV = { ...process.env, LC_ALL: "en_US.UTF-8" };
/** Run tmux with the given args and capture stdout/stderr. */
function runTmux(args, tmuxPath, exec = execFile) {
    return new Promise((resolve) => {
        exec(tmuxPath, args, { timeout: 5000, env: UTF8_ENV }, (error, stdout, stderr) => {
            resolve({
                ok: !error,
                stdout: String(stdout ?? ""),
                stderr: String(stderr ?? ""),
            });
        });
    });
}

/**
 * Thin osascript runner, shared by all actions. The `exec` dependency is
 * injectable so tests can mock it without spawning processes. Error
 * classification distinguishes the two macOS privacy denials we can hit —
 * Automation (Apple Events) and Accessibility (assistive/keystroke) — from a
 * generic failure, so each action can guide the user to the right setting.
 */
/**
 * Classify osascript stderr. macOS reports blocked automation with error
 * -1743 ("Not authorized to send Apple events"); blocked keystroke/assistive
 * access (Accessibility) with -1719 ("not allowed assistive access"); -10004
 * can also appear when a target app isn't reachable under sandboxed automation.
 */
function classifyError(stderr) {
    if (/-1743|-1719|-10004|not authori[sz]ed to send apple events|not allowed assistive/i.test(stderr)) {
        return "permission-denied";
    }
    return "error";
}
function runOsascript(args, exec) {
    return new Promise((resolve) => {
        exec("/usr/bin/osascript", args, { timeout: 8000, env: UTF8_ENV }, (error, stdout, stderr) => {
            const out = String(stdout ?? "");
            const err = String(stderr ?? "");
            if (error) {
                resolve({ ok: false, code: classifyError(err || String(error)), stdout: out, stderr: err });
            }
            else {
                resolve({ ok: true, code: "success", stdout: out, stderr: err });
            }
        });
    });
}
function runAppleScript(script, exec = execFile) {
    return runOsascript(["-e", script], exec);
}
/**
 * Run a JXA (JavaScript for Automation) script. Same osascript binary, but the
 * ObjC bridge lets scripts hit AppKit directly (e.g. NSWorkspace) instead of
 * Apple-Eventing the System Events process — ~5x faster for process queries.
 */
function runJxa(script, exec = execFile) {
    return runOsascript(["-l", "JavaScript", "-e", script], exec);
}

/**
 * Pure logic for the "cycle windows of the active application" dial. Uses the
 * macOS "Move focus to next window" shortcut (Cmd+`, grave = key code 50),
 * which cycles the frontmost app's windows — no app-specific scripting needed.
 *
 * The dial is modal: "windows" cycles the frontmost app's windows, "apps"
 * cycles the visible applications themselves. Press or touch-tap toggles.
 */
/** Toggle between cycling windows and cycling applications. */
function toggleAppWindowsMode(mode) {
    return mode === "windows" ? "apps" : "windows";
}
/** AppleScript to cycle the frontmost app's windows forward/backward. */
function appWindowCycleScript(direction) {
    const modifiers = direction === "next" ? "{command down}" : "{command down, shift down}";
    return `tell application "System Events"
	key code 50 using ${modifiers}
end tell
return "ok"`;
}
/**
 * JXA (run via `runJxa`) to activate the next/previous visible regular app.
 * NSWorkspace is queried directly through the ObjC bridge — measured ~0.12s
 * per call vs ~0.7s for the equivalent System Events `whose visible is true`
 * enumeration, and it needs no Accessibility grant. Apps are taken in
 * launch order, hidden ones skipped; wraps at both ends. Returns the
 * activated app's name.
 */
function appCycleJxa(direction) {
    const step = direction === "next" ? "frontIdx + 1" : "frontIdx - 1 + regular.length";
    return `ObjC.import("AppKit");
function run() {
	const apps = $.NSWorkspace.sharedWorkspace.runningApplications;
	const regular = [];
	for (let i = 0; i < apps.count; i++) {
		const a = apps.objectAtIndex(i);
		if (a.activationPolicy === $.NSApplicationActivationPolicyRegular && !a.hidden) regular.push(a);
	}
	if (regular.length === 0) return "";
	let frontIdx = 0;
	for (let i = 0; i < regular.length; i++) {
		if (regular[i].active) { frontIdx = i; break; }
	}
	const target = regular[(${step}) % regular.length];
	target.activateWithOptions($.NSApplicationActivateIgnoringOtherApps);
	return ObjC.unwrap(target.localizedName);
}`;
}
/**
 * setFeedback payload for the shared `layouts/mode-dial.json` layout — OWN
 * item keys, because the built-in $B1 layout's `title` item is bound to the
 * user-editable action title and silently ignores plugin pushes. `mode` names
 * what rotation moves through; `current` shows where you are — the window
 * title (falling back to the app name for title-less windows) or the
 * frontmost app.
 */
function appWindowsFeedback(mode, front) {
    if (mode === "apps") {
        return { mode: { value: "Apps ⇄", color: "#4E9CFF" }, current: front.app || "—" };
    }
    return {
        mode: { value: "App Windows ⇄", color: "#4E9CFF" },
        current: front.title || front.app || "—",
    };
}
/**
 * JXA (run via `runJxa`) returning the frontmost app's bundle identifier, or
 * "". NSWorkspace answers in ~0.12s with no Accessibility grant — cheap
 * enough to poll.
 */
const FRONT_APP_BUNDLE_JXA = `ObjC.import("AppKit");
function run() {
	const a = $.NSWorkspace.sharedWorkspace.frontmostApplication;
	if (!a || a.isNil()) return "";
	const id = ObjC.unwrap(a.bundleIdentifier);
	return id ? String(id) : "";
}`;
/** AppleScript returning `appName|frontWindowTitle` for the frontmost app. */
const FRONT_WINDOW_SCRIPT = `tell application "System Events"
	set p to first application process whose frontmost is true
	set appName to name of p
	if (count of windows of p) is 0 then return appName & "|"
	return appName & "|" & (name of front window of p)
end tell`;
/** Parse `app|title` (title may contain further `|`, kept intact). */
function parseFrontWindow(output) {
    const out = output.trim();
    const i = out.indexOf("|");
    if (i < 0)
        return { app: out, title: "" };
    return { app: out.slice(0, i), title: out.slice(i + 1) };
}

/** Shared dial-rotation direction mapping. */
/** Map a dial rotation to a step: positive = next, negative = prev, 0 = none. */
function rotationDirection(ticks) {
    const t = Math.trunc(ticks);
    if (t > 0)
        return "next";
    if (t < 0)
        return "prev";
    return "none";
}
/** A rotation as direction + how many detents to apply. Fast spins arrive as
 * one event with |ticks| > 1; collapsing them to a single step loses motion.
 * Steps are capped so a wild spin can't queue a subprocess storm. */
function rotationSteps(ticks) {
    const t = Math.trunc(ticks);
    return { direction: rotationDirection(t), steps: Math.min(Math.abs(t), 5) };
}

/**
 * Queries macOS Accessibility (AX) trust via the native `axcheck` helper, so
 * the property inspector can show a live "permission not granted" warning. The
 * helper has no side effects and does not prompt. `exec` is injectable for
 * tests.
 *
 * Resolves `false` only when the helper definitively reports `untrusted`. A
 * spawn error / missing binary / unexpected output resolves `true` so an old
 * install (no helper) never raises a false alarm.
 */
/** Resolve the axcheck binary path relative to the bundled plugin entry point. */
function axcheckHelperPath(baseUrl) {
    return fileURLToPath(new URL("macos/axcheck", baseUrl));
}
/** True when the process has Accessibility trust (or the check is inconclusive). */
function checkAccessibility(baseUrl, exec = execFile) {
    const bin = axcheckHelperPath(baseUrl);
    return new Promise((resolve) => {
        exec(bin, [], { timeout: 4000 }, (_error, stdout) => {
            // Only a definitive "untrusted" raises the warning; anything else
            // (trusted, error, missing helper) is treated as granted to avoid
            // false positives on installs without the helper.
            resolve(String(stdout ?? "").trim() !== "untrusted");
        });
    });
}

/**
 * Shared property-inspector handler for the live Accessibility warning. Actions
 * that need Accessibility call this from their `onSendToPlugin`; it answers the
 * PI's `checkAccessibility` request and pushes the result back so the PI can
 * show or hide its warning banner. Returns true when it handled the message, so
 * an action with its own datasource handling can early-return.
 */
async function respondToAccessibilityCheck(payload, baseUrl) {
    const event = payload?.event;
    if (event !== "checkAccessibility")
        return false;
    const trusted = await checkAccessibility(baseUrl);
    await streamDeck.ui.current?.sendToPropertyInspector({ event: "checkAccessibility", trusted });
    return true;
}

/**
 * Dial action: cycle the windows of the frontmost application, or — after a
 * press/touch-tap toggles the dial into "apps" mode — cycle the visible
 * applications themselves. The touchscreen shows the current mode and the
 * front app/window, refreshed after each step. The mode is transient (held in
 * memory per dial), so every appearance starts in the familiar windows mode.
 */
/** Quiet time after the last tick before the strip readback runs. */
const REFRESH_DEBOUNCE_MS = 250;
let CycleAppWindows = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.appwindows" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        modes = new Map();
        refreshTimers = new Map();
        async onWillAppear(ev) {
            if (ev.action.isDial()) {
                await this.refresh(ev.action);
            }
        }
        onWillDisappear(ev) {
            this.modes.delete(ev.action.id);
            const t = this.refreshTimers.get(ev.action.id);
            if (t !== undefined)
                clearTimeout(t);
            this.refreshTimers.delete(ev.action.id);
        }
        async onDialRotate(ev) {
            const direction = rotationDirection(ev.payload.ticks);
            if (direction === "none") {
                await this.refresh(ev.action);
                return;
            }
            const mode = this.mode(ev.action.id);
            const result = mode === "apps"
                ? await runJxa(appCycleJxa(direction))
                : await runAppleScript(appWindowCycleScript(direction));
            if (!result.ok && result.code === "permission-denied") {
                streamDeck.logger.error("Window cycling blocked. Grant Accessibility: System Settings > Privacy & " +
                    "Security > Accessibility > enable Stream Deck.");
            }
            // The cycle script already returns the activated app's name — paint from
            // it directly instead of spending a second osascript round-trip per tick.
            if (mode === "apps" && result.ok && result.stdout.trim() !== "") {
                await this.paint(ev.action, appWindowsFeedback("apps", { app: result.stdout.trim(), title: "" }));
                return;
            }
            // Windows mode: the title readback costs more than the keystroke itself
            // (~200ms vs ~130ms), so don't pay it per tick — debounce it to after the
            // rotation stops. You watch the windows change on screen, not the strip.
            this.scheduleRefresh(ev.action);
        }
        /** Repaint once the dial has been quiet for a beat (cancels prior timers). */
        scheduleRefresh(dial) {
            const t = this.refreshTimers.get(dial.id);
            if (t !== undefined)
                clearTimeout(t);
            this.refreshTimers.set(dial.id, setTimeout(() => {
                this.refreshTimers.delete(dial.id);
                void this.refresh(dial);
            }, REFRESH_DEBOUNCE_MS));
        }
        async onDialDown(ev) {
            await this.toggle(ev.action);
        }
        async onTouchTap(ev) {
            await this.toggle(ev.action);
        }
        /** Answer the property inspector's live Accessibility-permission check. */
        async onSendToPlugin(ev) {
            await respondToAccessibilityCheck(ev.payload, import.meta.url);
        }
        mode(id) {
            return this.modes.get(id) ?? "windows";
        }
        async toggle(dial) {
            this.modes.set(dial.id, toggleAppWindowsMode(this.mode(dial.id)));
            await this.refresh(dial);
        }
        async refresh(dial) {
            const result = await runAppleScript(FRONT_WINDOW_SCRIPT);
            if (!result.ok)
                return;
            await this.paint(dial, appWindowsFeedback(this.mode(dial.id), parseFrontWindow(result.stdout)));
        }
        async paint(dial, feedback) {
            try {
                await dial.setFeedback(feedback);
            }
            catch (err) {
                streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
            }
        }
    });
    return _classThis;
})();

/**
 * Overlap-safe job coalescing for the polling actions. A poll tick and an
 * explicit "state just changed, repaint now" request can collide; the naive
 * `if (running) return` guard silently DROPS the explicit request, leaving a
 * freshly captured/raised key painting its old state for a full extra poll
 * cycle. This runner never overlaps the job and never loses a request: a
 * request during a run queues exactly one rerun (multiple requests coalesce
 * into that one), which starts as soon as the current run finishes — with the
 * job then reading the post-change state.
 */
class CoalescedRunner {
    job;
    running = false;
    pending = false;
    constructor(job) {
        this.job = job;
    }
    /**
     * Run the job, or — if it is already running — schedule one rerun after it
     * finishes. Resolves when the run this call participated in has finished
     * (for a queued rerun: immediately; the rerun still executes). A throwing
     * job never wedges the runner.
     */
    async request() {
        if (this.running) {
            this.pending = true;
            return;
        }
        this.running = true;
        try {
            do {
                this.pending = false;
                try {
                    await this.job();
                }
                catch {
                    // The job owns its error reporting; a throw must not stop a
                    // queued rerun or permanently wedge the runner.
                }
            } while (this.pending);
        }
        finally {
            this.running = false;
        }
    }
}

/** Small shared SVG helpers used by the key/touchscreen image builders. */
/** Encode an SVG string as a data URI usable by Stream Deck setImage / pixmaps. */
function svgToDataUri(svg) {
    return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
/** Round to one decimal place — keeps generated SVG coordinates compact. */
function round(n) {
    return Math.round(n * 10) / 10;
}
/**
 * Convert HSL (h 0–360, s/l 0–100) to a #rrggbb hex string. Key-face SVGs must
 * not use `hsl()` literals: Stream Deck's KEY rasterizer silently paints them
 * as black (the touchscreen pipeline accepts them; keys do not).
 */
function hslToHex(h, s, l) {
    const sn = s / 100;
    const ln = l / 100;
    const a = sn * Math.min(ln, 1 - ln);
    const channel = (n) => {
        const k = (n + h / 30) % 12;
        const c = ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(255 * c)
            .toString(16)
            .padStart(2, "0");
    };
    return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/**
 * Pure logic for the "cycle tmux window" dial: rotate to move between windows,
 * push for last-window, and render a dynamic touchscreen background that
 * reflects the current session/window. All functions are pure (no tmux, no
 * Stream Deck) so they unit test in isolation.
 */
/** Toggle the dial's scope (touch-tap). */
function toggleScope(scope) {
    return scope === "session" ? "all" : "session";
}
/**
 * tmux args to move to the next/previous window. Untargeted, tmux acts on its
 * own "current" session; pass `session` to scope to the session actually in
 * the frontmost macOS window.
 */
function selectWindowDirArgs(direction, session) {
    const base = direction === "next" ? ["next-window"] : ["previous-window"];
    return session ? [...base, "-t", session] : base;
}
/** tmux args to toggle to the previously active window of `session`
 * (push = back-and-forth). */
function lastWindowArgs(session) {
    return ["last-window", "-t", session];
}
/** tmux args to toggle the given CLIENT to its previously active session
 * (push in "all" scope). Scoped with -c so a background client never moves. */
function lastSessionArgs(clientTty) {
    return ["switch-client", "-c", clientTty, "-l"];
}
/**
 * The window a rotation should land on in "all" scope: the neighbour of the
 * current window in the flattened all-sessions list (wrapping across session
 * boundaries). Falls back to the first window when the current one isn't in
 * the list; null only for an empty list.
 */
function nextWindowAcross(windows, current, direction) {
    const n = windows.length;
    if (n === 0)
        return null;
    const idx = windows.findIndex((w) => w.session === current.session && w.index === current.index);
    if (idx < 0)
        return windows[0];
    const target = direction === "next" ? (idx + 1) % n : (idx - 1 + n) % n;
    return windows[target];
}
/**
 * tmux args that jump a client to a window in ANY session.
 * `switch-client -t sess:idx` changes session and window in one step
 * (`select-window` alone cannot leave the current session). Pass the front
 * client's tty as `clientTty` — untargeted, tmux moves ITS "current client",
 * which can be a background terminal.
 */
function switchToWindowArgs(w, clientTty) {
    const target = ["-t", `${w.session}:${w.index}`];
    return clientTty
        ? ["switch-client", "-c", clientTty, ...target]
        : ["switch-client", ...target];
}
// Name LAST — window names may contain `|` (fixed fields first, name joined).
const CURRENT_WINDOW_FORMAT = "#{session_name}|#{window_index}|#{window_name}";
/** {@link CURRENT_WINDOW_ARGS} scoped to a session's active window. */
function currentWindowArgs(session) {
    return ["display-message", "-p", "-t", session, CURRENT_WINDOW_FORMAT];
}
/** tmux args listing the active flag of each window in the given session
 * (untargeted when omitted — tmux's own "current" session). */
function windowFlagsArgs(session) {
    const base = ["list-windows", "-F", "#{window_active}"];
    return session ? [...base, "-t", session] : base;
}
/** Parse `session|index|name…` (name last, may contain `|`). */
function parseCurrentWindow(output) {
    const fields = output.trim().split("|");
    return {
        session: fields[0] ?? "",
        index: Number.parseInt(fields[1] ?? "", 10) || 0,
        name: fields.slice(2).join("|"),
    };
}
/**
 * "Teach the button": the Focus-tmux target string for a captured current
 * window, in the same `session:name` form the dropdown persists. "" (nothing
 * to save) when the session is blank — i.e. no tmux server was running.
 */
function captureTmuxTarget(current) {
    if (current.session.trim() === "")
        return "";
    return `${current.session}:${current.name}`;
}
/** Parse the per-window active flags ("1" = active) preserving window order. */
function parseActiveFlags(output) {
    return output
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "")
        .map((line) => line === "1");
}
/** Deterministic 0–359 hue derived from a session name, so colours are stable. */
function sessionHue(session) {
    let h = 0;
    for (let i = 0; i < session.length; i++) {
        h = (h * 31 + session.charCodeAt(i)) % 360;
    }
    return h;
}
/** Escape text for safe embedding inside SVG/XML. */
function escapeXml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
/** Row of position dots; the active window's dot is larger and brighter. */
function dotsSvg(count, activeIndex, hue) {
    if (count <= 0)
        return "";
    // Shrink the gap when many windows must fit (all-sessions scope) so the
    // row never overflows the 200px strip.
    const gap = count > 1 ? Math.min(14, 180 / (count - 1)) : 14;
    const startX = 100 - ((count - 1) * gap) / 2;
    const y = 86;
    let out = "";
    for (let i = 0; i < count; i++) {
        const cx = round(startX + i * gap);
        const active = i === activeIndex;
        const r = active ? 4 : 2.5;
        const fill = active ? `hsl(${hue},70%,78%)` : `hsl(${hue},30%,45%)`;
        out += `<circle cx="${cx}" cy="${y}" r="${r}" fill="${fill}"/>`;
    }
    return out;
}
/** Truncate a label so it fits the 200px touch strip. */
function truncate$2(value, max = 16) {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
/**
 * Build the 200×100 touchscreen image as an SVG string: a session-tinted
 * vertical gradient, faint left/right chevrons hinting the dial rotates, the
 * session name (top) and current window name (centre), and a row of dots
 * showing the window position. Stream Deck layout items may not overlap, so all
 * of this lives in one full-area pixmap. User text is XML-escaped.
 */
function buildBackgroundSvg(opts) {
    const { hue, session, window, count, activeIndex, badge } = opts;
    const badgeSvg = badge
        ? `<text x="192" y="17" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="1" fill="hsl(${hue},60%,85%)" opacity="0.9">${escapeXml(badge)}</text>`
        : "";
    return (`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" stop-color="hsl(${hue},55%,24%)"/>` +
        `<stop offset="1" stop-color="hsl(${hue},60%,10%)"/>` +
        `</linearGradient></defs>` +
        `<rect width="200" height="100" fill="url(#g)"/>` +
        `<path d="M14 50l-7 6 7 6" fill="none" stroke="hsl(${hue},45%,72%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>` +
        `<path d="M186 50l7 6-7 6" fill="none" stroke="hsl(${hue},45%,72%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>` +
        `<text x="100" y="24" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="600" letter-spacing="1.5" fill="hsl(${hue},45%,76%)">${escapeXml(truncate$2(session.toUpperCase(), 20))}</text>` +
        `<text x="100" y="60" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="24" font-weight="700" fill="#ffffff">${escapeXml(truncate$2(window))}</text>` +
        dotsSvg(count, activeIndex, hue) +
        badgeSvg +
        `</svg>`);
}
/** Build the setFeedback payload for the current window + window flags. */
function buildWindowFeedback(current, flags) {
    const svg = buildBackgroundSvg({
        hue: sessionHue(current.session),
        session: current.session,
        window: current.name,
        count: flags.length,
        activeIndex: flags.indexOf(true),
    });
    return { bg: svgToDataUri(svg) };
}
/**
 * setFeedback payload for "all" scope: the dots span every window of every
 * session (current window highlighted) and an ALL badge marks the scope.
 */
function buildAllWindowsFeedback(windows, current) {
    const svg = buildBackgroundSvg({
        hue: sessionHue(current.session),
        session: current.session,
        window: current.name,
        count: windows.length,
        activeIndex: windows.findIndex((w) => w.session === current.session && w.index === current.index),
        badge: "ALL",
    });
    return { bg: svgToDataUri(svg) };
}

/**
 * Pure logic for the "Claude Project" key: find Claude Code CLI instances on
 * the machine (any host — tmux, plain iTerm2, Terminal.app), decide their
 * working/waiting state, and render the live key face. The impure scanning
 * lives in claude-scan.ts; this module only parses and decides.
 *
 * Identity model: a button targets a PROJECT DIRECTORY. A claude process
 * belongs to it when its cwd matches. State comes from two signals:
 * the tmux pane title's spinner marker when the instance is tmux-hosted
 * (always readable via the tmux server), else the freshness of the newest
 * transcript .jsonl under ~/.claude/projects/<slug>/ — verified to advance
 * only while a session is actively working.
 */
/**
 * Parse `ps -axo pid=,tty=,comm=` output, keeping only `claude` processes
 * with a real controlling tty. NOTE: enumerate with ps, not pgrep — BSD pgrep
 * silently omits its own ancestor processes.
 */
function parsePsClaude(output) {
    const out = [];
    for (const rawLine of output.split("\n")) {
        const line = rawLine.trim();
        if (line === "")
            continue;
        const fields = line.split(/\s+/);
        if (fields.length < 3)
            continue;
        const pid = Number.parseInt(fields[0], 10);
        const tty = fields[1];
        const comm = fields.slice(2).join(" ");
        const base = comm.slice(comm.lastIndexOf("/") + 1);
        if (!Number.isFinite(pid) || base !== "claude" || tty === "??")
            continue;
        out.push({ pid, tty: `/dev/${tty}` });
    }
    return out;
}
/** Parse batched `lsof -a -p <csv> -d cwd -Fpn` output into pid → cwd. */
function parseLsofCwds(output) {
    const cwds = new Map();
    let pid = null;
    for (const line of output.split("\n")) {
        if (line.startsWith("p")) {
            const n = Number.parseInt(line.slice(1), 10);
            pid = Number.isFinite(n) ? n : null;
        }
        else if (line.startsWith("n") && pid !== null) {
            cwds.set(pid, line.slice(1));
        }
    }
    return cwds;
}
/** ~/.claude/projects directory name for a project path: every
 * non-alphanumeric character becomes "-" (verified transform). */
function projectSlug(projectPath) {
    return projectPath.replace(/[^A-Za-z0-9]/g, "-");
}
/** Normalize a configured project path for matching (trailing slash off). */
function normalizeProjectPath(p) {
    const trimmed = p.trim();
    return trimmed.length > 1 ? trimmed.replace(/\/+$/, "") : trimmed;
}
/** The instances whose cwd is exactly the target project. */
function instancesForProject(instances, projectPath) {
    const target = normalizeProjectPath(projectPath);
    return instances.filter((i) => normalizeProjectPath(i.cwd) === target);
}
/** A transcript younger than this is "actively working". */
const TRANSCRIPT_FRESH_MS = 30_000;
/**
 * Decide the project's Claude state. Title marker wins when known (the tmux
 * pane title's spinner stays animated through long tool calls, where the
 * transcript goes quiet); transcript freshness covers hosts whose titles we
 * can't read without launching apps.
 */
function projectClaudeState(args) {
    if (!args.present)
        return "none";
    if (args.titleWorking === true)
        return "working";
    if (args.titleWorking === false)
        return "waiting";
    if (args.transcriptAgeMs !== null && args.transcriptAgeMs < TRANSCRIPT_FRESH_MS) {
        return "working";
    }
    return "waiting";
}
const MONO$1 = "Menlo, Monaco, monospace";
function truncate$1(value, max) {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
/** Last path segment as the display name ("" -> "?"). */
function projectBasename(projectPath) {
    const normalized = normalizeProjectPath(projectPath);
    const base = normalized.slice(normalized.lastIndexOf("/") + 1);
    return base || "?";
}
/** 12 o'clock-start orbit positions for the working dot (r=8 around the spark). */
const ORBIT$1 = [[61.0, 4.0], [65.0, 5.1], [67.9, 8.0], [69.0, 12.0], [67.9, 16.0], [65.0, 18.9], [61.0, 20.0], [57.0, 18.9], [54.1, 16.0], [53.0, 12.0], [54.1, 8.0], [57.0, 5.1]];
/**
 * Render the 72×72 live key face, sibling of the tmux key: ink ground, the
 * project name in mono (hue seeded per project, so each project wears a
 * stable colour), host as the eyebrow, the status bar lit when keystrokes
 * would land in that session, and the Claude spark (amber turning = working,
 * white still = waiting). No claude process → dashed bar, no spark. Hex
 * colours only — the key rasterizer paints hsl() black.
 */
function buildClaudeProjectKeyImage(args) {
    const name = truncate$1(projectBasename(args.project), 9);
    const hue = sessionHue(projectBasename(args.project));
    const spin = args.spin ?? 0;
    let bar;
    let nameFill;
    let eyebrowFill = "";
    if (args.claude === "none") {
        bar = `<rect x="1" y="58" width="70" height="13" fill="none" stroke="#4A504D" stroke-width="1.5" stroke-dasharray="3 3"/>`;
        nameFill = "#6A716E";
    }
    else if (args.hot) {
        bar =
            `<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1">` +
                `<stop offset="0" stop-color="${hslToHex(hue, 62, 46)}"/>` +
                `<stop offset="1" stop-color="${hslToHex(hue, 66, 36)}"/>` +
                `</linearGradient></defs>` +
                `<rect x="0" y="57" width="72" height="15" fill="url(#b)"/>` +
                `<rect x="60" y="60.5" width="5" height="8" fill="#F2FFF6"/>`;
        nameFill = "#FFFFFF";
        eyebrowFill = hslToHex(hue, 55, 72);
    }
    else {
        bar = `<rect x="1" y="58" width="70" height="13" fill="none" stroke="${hslToHex(hue, 35, 52)}" stroke-width="1.5"/>`;
        nameFill = "#A6ADA9";
        eyebrowFill = hslToHex(hue, 50, 70);
    }
    // Anchored at x=30, not center: the longest host label ("TERMINAL") must
    // clear the Claude spark in the top-right corner.
    const eyebrow = args.host
        ? `<text x="30" y="15" text-anchor="middle" font-family="${MONO$1}" font-size="7.5" letter-spacing="1" fill="${eyebrowFill || "#8B9490"}">${escapeXml(truncate$1(args.host.toUpperCase(), 8))}</text>`
        : "";
    let spark = "";
    if (args.claude !== "none") {
        const color = args.claude === "working" ? "#F0A63C" : "#F2FFF6";
        const angle = args.claude === "working" ? (spin % 12) * 30 : 0;
        spark =
            `<path d="M56 12h10M58.5 7.7l5 8.6M63.5 7.7l-5 8.6" ` +
                `stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none" ` +
                `transform="rotate(${angle} 61 12)"/>`;
        if (args.claude === "working") {
            // The star is 6-fold symmetric, so its rotation collapses to a
            // two-frame wobble — motion you cannot see at key size. The orbiting
            // dot gives 12 genuinely distinct frames per revolution.
            const [ox, oy] = ORBIT$1[spin % 12];
            spark += `<circle cx="${ox}" cy="${oy}" r="1.7" fill="#F0A63C"/>`;
        }
    }
    // tmux identity mark's sibling: a small spark outline at the bar's left
    // end marks this as a Claude key even when idle.
    const mark = `<path d="M6.5 64.25h7M8 61.25l4 6M12 61.25l-4 6" ` +
        `stroke="${args.claude === "none" ? "#8B9490" : args.hot ? "#F2FFF6" : hslToHex(hue, 50, 70)}" stroke-width="1.4" stroke-linecap="round" fill="none"/>`;
    return (`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
        `<rect width="72" height="72" fill="#0F1211"/>` +
        eyebrow +
        spark +
        `<text x="36" y="40" text-anchor="middle" font-family="${MONO$1}" font-size="11.5" font-weight="700" fill="${nameFill}">${escapeXml(name)}</text>` +
        bar +
        mark +
        `</svg>`);
}

/**
 * Scans the machine for running Claude Code CLI instances: `ps` enumerates
 * pids+ttys (pgrep misses ancestors), one batched `lsof` maps every pid to
 * its project cwd (~0.06s total, measured). Absolute binary paths — Stream
 * Deck launches plugins with a minimal PATH. `exec` injectable for tests.
 */
const TIMEOUT_MS = 4000;
function run(file, args, exec) {
    return new Promise((resolve) => {
        exec(file, args, { timeout: TIMEOUT_MS, env: UTF8_ENV }, (error, stdout) => {
            resolve(error ? "" : String(stdout ?? ""));
        });
    });
}
const PS_CLAUDE_ARGS = ["-axo", "pid=,tty=,comm="];
function lsofCwdArgs(pids) {
    return ["-a", "-p", pids.join(","), "-d", "cwd", "-Fpn"];
}
/** All running Claude Code CLI instances with their ttys and project cwds. */
async function scanClaudeInstances(exec = execFile) {
    const ps = await run("/bin/ps", PS_CLAUDE_ARGS, exec);
    const procs = parsePsClaude(ps);
    if (procs.length === 0)
        return [];
    const lsof = await run("/usr/sbin/lsof", lsofCwdArgs(procs.map((p) => p.pid)), exec);
    const cwds = parseLsofCwds(lsof);
    return procs
        .map((p) => ({ pid: p.pid, tty: p.tty, cwd: cwds.get(p.pid) ?? "" }))
        .filter((i) => i.cwd !== "");
}
/** Is a process with exactly this name running? (pgrep -x; used to avoid
 * AppleScript-launching a terminal app that isn't open.) */
function processRunning(name, exec = execFile) {
    return new Promise((resolve) => {
        exec("/usr/bin/pgrep", ["-x", name], { timeout: TIMEOUT_MS, env: UTF8_ENV }, (error) => {
            resolve(!error);
        });
    });
}

/**
 * Detect Claude Code inside tmux windows — and whether it is WORKING or
 * WAITING for input — from signals tmux already captures. Claude Code sets
 * the terminal title (OSC), which tmux stores as `pane_title`: while working
 * the title starts with an animated braille spinner frame (U+2800–U+28FF);
 * while idle at the prompt it starts with a static "✳". Presence is
 * `pane_current_command == "claude"`. Pure parsing/decision only.
 */
/** tmux args listing every pane as `session|windowIndex|windowName|command|title`
 * (title LAST — it is a task summary and may itself contain `|`). */
const LIST_PANES_ARGS = [
    "list-panes",
    "-a",
    "-F",
    "#{session_name}|#{window_index}|#{window_name}|#{pane_current_command}|#{pane_title}",
];
/** Parse {@link LIST_PANES_ARGS} output; malformed lines are skipped. */
function parsePanes(output) {
    const panes = [];
    for (const rawLine of output.split("\n")) {
        const line = rawLine.trim();
        if (line === "")
            continue;
        const fields = line.split("|");
        if (fields.length < 5)
            continue;
        panes.push({
            session: fields[0],
            windowIndex: Number.parseInt(fields[1], 10) || 0,
            windowName: fields[2],
            command: fields[3],
            title: fields.slice(4).join("|"),
        });
    }
    return panes;
}
/** tmux args listing every pane as `paneTty|session|windowIndex|command|title`
 * (title LAST — it may contain `|`). Pane ttys identify tmux-hosted processes:
 * they are invisible to iTerm/Terminal tab lists, so a raise-by-tty must
 * detect them here and route through the tmux machinery instead. */
const LIST_PANE_TTYS_ARGS = [
    "list-panes",
    "-a",
    "-F",
    "#{pane_tty}|#{session_name}|#{window_index}|#{pane_active}|#{window_active}|#{pane_current_command}|#{pane_title}",
];
/** Parse {@link LIST_PANE_TTYS_ARGS} output; malformed lines are skipped. */
function parsePaneTtys(output) {
    const panes = [];
    for (const rawLine of output.split("\n")) {
        const line = rawLine.trim();
        if (line === "")
            continue;
        const fields = line.split("|");
        if (fields.length < 7)
            continue;
        const windowIndex = Number.parseInt(fields[2], 10);
        if (!Number.isFinite(windowIndex))
            continue; // malformed line — never raise window 0 from garbage
        panes.push({
            tty: fields[0],
            session: fields[1],
            windowIndex,
            receivesKeys: fields[3] === "1" && fields[4] === "1",
            command: fields[5],
            title: fields.slice(6).join("|"),
        });
    }
    return panes;
}
/** Working/waiting from a pane title's leading marker (braille spinner =
 * working, anything else = waiting); null when no title to judge. */
function titleWorking(title) {
    const trimmed = title.trim();
    if (trimmed === "")
        return null;
    const cp = trimmed.codePointAt(0);
    return cp !== undefined && cp >= 0x2800 && cp <= 0x28ff;
}
/** True when the string starts with a braille pattern char — Claude Code's
 * animated working-spinner frames all live in U+2800–U+28FF. */
function startsWithSpinner(title) {
    const cp = title.codePointAt(0);
    return cp !== undefined && cp >= 0x2800 && cp <= 0x28ff;
}
/**
 * Claude Code's state inside one tmux window (matched by session + window
 * name, same as the key's target). Several claude panes in one window:
 * WORKING wins — the key should read busy if anything is busy.
 */
function claudeStateForWindow(panes, session, windowName) {
    let state = "none";
    for (const p of panes) {
        if (p.session !== session || p.windowName !== windowName)
            continue;
        if (p.command !== "claude")
            continue;
        if (startsWithSpinner(p.title))
            return "working";
        state = "waiting";
    }
    return state;
}

/**
 * Freshness of a project's newest Claude Code transcript. Sessions append to
 * ~/.claude/projects/<slug>/<session>.jsonl while working; the newest file's
 * mtime goes stale within seconds of the session going idle (verified live).
 * Fully async and batch-bounded — this runs inside the shared poll of a
 * plugin process that serves every key and dial.
 */
const BATCH = 64;
/** Age in ms of the newest .jsonl transcript for the project, or null when
 * the project has no transcript directory / no transcripts. */
async function newestTranscriptAgeMs(projectPath, now = Date.now(), base = join(homedir(), ".claude", "projects")) {
    const dir = join(base, projectSlug(projectPath));
    try {
        const names = (await readdir(dir)).filter((n) => n.endsWith(".jsonl"));
        let newest = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < names.length; i += BATCH) {
            const mtimes = await Promise.all(names.slice(i, i + BATCH).map(async (n) => {
                try {
                    return (await stat(join(dir, n))).mtimeMs;
                }
                catch {
                    return null; // removed mid-scan
                }
            }));
            for (const m of mtimes) {
                if (m !== null && m > newest)
                    newest = m;
            }
        }
        return newest === Number.NEGATIVE_INFINITY ? null : Math.max(0, now - newest);
    }
    catch {
        return null;
    }
}

/** Escape a string for safe embedding inside an AppleScript double-quoted literal. */
function escapeForAppleScript(value) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** iTerm2's bundle identifier (for frontmost-app checks). */
const ITERM_BUNDLE_ID = "com.googlecode.iterm2";
/**
 * AppleScript returning the tty of iTerm's FOCUSED session — current session
 * of the current tab of the current (front) window — or "" when there is no
 * window. Only run this when iTerm is already frontmost: merely addressing an
 * app via AppleScript launches it.
 */
const ITERM_FOCUSED_TTY_SCRIPT = `tell application "iTerm"
	try
		return tty of current session of current tab of current window
	on error
		return ""
	end try
end tell`;
/**
 * Build AppleScript that activates iTerm and selects the window+tab+session
 * whose `tty` equals the given tty. The script returns "ok" if a match was
 * found and selected, otherwise "notfound".
 *
 * The tty is escaped via {@link escapeForAppleScript} before interpolation so
 * that quotes/backslashes in the value cannot break out of the AppleScript
 * string literal.
 *
 * iTerm2's AppleScript application name is "iTerm". Each iTerm2 session exposes
 * a `tty` property (e.g. "/dev/ttys000").
 *
 * @param tty - The tty device path to match (e.g. "/dev/ttys000").
 * @returns The AppleScript source, or "" when `tty` is empty/whitespace-only
 *          (the caller treats "" as nothing-to-do).
 */
function buildITermRaiseScript(tty) {
    if (tty.trim() === "") {
        return "";
    }
    const escapedTty = escapeForAppleScript(tty);
    return `tell application "iTerm"
	activate
	repeat with w in windows
		repeat with t in tabs of w
			repeat with s in sessions of t
				if (tty of s) is "${escapedTty}" then
					select w
					tell t to select
					tell s to select
					return "ok"
				end if
			end repeat
		end repeat
	end repeat
end tell
return "notfound"`;
}

/**
 * Long-press detection for Keypad actions, factored out of Window Ring's
 * proven pattern: the hold callback fires AT the threshold (immediate haptic
 * of "something happened", no waiting for release), and a release before the
 * threshold is reported as a short press for the caller to act on in onKeyUp.
 * Pure timers, no SDK — unit-tested with fake timers.
 */
/** Press held this long (ms) registers as a long press. */
const LONG_PRESS_MS$1 = 500;
class PressGate {
    holdMs;
    timers = new Map();
    constructor(holdMs = LONG_PRESS_MS$1) {
        this.holdMs = holdMs;
    }
    /** Key went down: arm the hold callback. A second down re-arms. */
    down(id, onHold) {
        this.cancel(id);
        const t = setTimeout(() => {
            this.timers.delete(id);
            onHold();
        }, this.holdMs);
        this.timers.set(id, t);
    }
    /**
     * Key came up. Returns true for a short press (released before the
     * threshold — the caller should run the normal action); false when the
     * hold callback already fired or nothing was armed.
     */
    up(id) {
        const t = this.timers.get(id);
        if (t === undefined)
            return false;
        clearTimeout(t);
        this.timers.delete(id);
        return true;
    }
    /** Disarm without firing (e.g. the key disappeared mid-press). */
    cancel(id) {
        const t = this.timers.get(id);
        if (t !== undefined)
            clearTimeout(t);
        this.timers.delete(id);
    }
}

/**
 * Pure parsing + target-resolution helpers for driving tmux from the plugin.
 *
 * None of these functions shell out — they take the raw stdout of tmux
 * commands as strings and return plain data, so they are fully unit-testable.
 */
/**
 * Parse the output of:
 *   tmux list-windows -a -F "#{session_name}|#{window_index}|#{window_active}|#{window_name}"
 *
 * Each non-blank line is split on `|`: `session | index | active | name…`.
 * The window NAME is the LAST field and may itself contain `|` — the fixed
 * fields come first and the remainder is joined back into the name. `active`
 * is `true` only for the literal string `"1"`. Blank/short lines are skipped.
 */
function parseWindows(output) {
    const windows = [];
    for (const rawLine of output.split("\n")) {
        const line = rawLine.trim();
        if (line.length === 0) {
            continue;
        }
        const fields = line.split("|");
        if (fields.length < 4) {
            continue;
        }
        const [session, index, active] = fields;
        windows.push({
            session,
            index: Number(index),
            name: fields.slice(3).join("|"),
            active: active === "1",
        });
    }
    return windows;
}
/**
 * Parse the output of:
 *   tmux list-clients -F "#{client_tty}|#{client_session}"
 *
 * Returns a map of session name → client tty. If a session appears on more
 * than one line, the FIRST occurrence wins. Blank and malformed lines (fewer
 * than two `|`-separated fields) are skipped.
 */
function parseClients(output) {
    const clients = new Map();
    for (const rawLine of output.split("\n")) {
        const line = rawLine.trim();
        if (line.length === 0) {
            continue;
        }
        const fields = line.split("|");
        if (fields.length < 2) {
            continue;
        }
        const [tty, session] = fields;
        if (!clients.has(session)) {
            clients.set(session, tty);
        }
    }
    return clients;
}
/**
 * Reverse lookup on {@link parseClients}: which session is attached to the
 * given client tty? Null for "" or an unknown tty.
 */
function sessionForTty(clients, tty) {
    if (tty === "")
        return null;
    for (const [session, clientTty] of clients) {
        if (clientTty === tty)
            return session;
    }
    return null;
}
/**
 * Resolve a user-supplied target string to a single {@link TmuxWindow}.
 *
 * The target is trimmed first; an empty/whitespace-only target returns `null`.
 *
 * Two forms are supported:
 *
 * - `"session:name"` — the part before `:` must match a window's session
 *   exactly (case-insensitive) AND the part after must match the window's name
 *   exactly (case-insensitive). If the part after `:` is all digits, it ALSO
 *   matches when it equals the window's index.
 *
 * - `"name"` (no colon) — first try a case-insensitive EXACT name match across
 *   all windows; if none, fall back to a case-insensitive SUBSTRING match.
 *   Returns the first match in either pass.
 *
 * Returns `null` when nothing matches.
 */
function resolveTarget$1(windows, target) {
    const trimmed = target.trim();
    if (trimmed.length === 0) {
        return null;
    }
    const colon = trimmed.indexOf(":");
    if (colon !== -1) {
        const sessionPart = trimmed.slice(0, colon).toLowerCase();
        const namePart = trimmed.slice(colon + 1);
        const namePartLower = namePart.toLowerCase();
        const isIndex = namePart.length > 0 && /^\d+$/.test(namePart);
        const indexValue = isIndex ? Number(namePart) : NaN;
        for (const w of windows) {
            if (w.session.toLowerCase() !== sessionPart) {
                continue;
            }
            if (w.name.toLowerCase() === namePartLower) {
                return w;
            }
            if (isIndex && w.index === indexValue) {
                return w;
            }
        }
        return null;
    }
    const targetLower = trimmed.toLowerCase();
    // Pass 1: exact (case-insensitive) name match.
    for (const w of windows) {
        if (w.name.toLowerCase() === targetLower) {
            return w;
        }
    }
    // Pass 2: substring (case-insensitive) name match.
    for (const w of windows) {
        if (w.name.toLowerCase().includes(targetLower)) {
            return w;
        }
    }
    return null;
}
/** The tmux args that select the given window: `select-window -t <session>:<index>`. */
function selectWindowArgs(w) {
    return ["select-window", "-t", `${w.session}:${w.index}`];
}
/** Human-readable dropdown label, e.g. `"dev: movingavg"`. */
function tmuxWindowLabel(w) {
    return `${w.session}: ${w.name}`;
}
/** Stable dropdown/target value, e.g. `"dev:movingavg"`. */
function tmuxWindowValue(w) {
    return `${w.session}:${w.name}`;
}

/**
 * Terminal.app scripting for the Claude Project key: read the focused tab's
 * tty and raise the window+tab hosting a given tty. Verified against the
 * Terminal sdef: tabs expose read-only `tty`, windows a settable
 * `selected tab` / `frontmost`. Only address Terminal when it is RUNNING —
 * `tell application "Terminal"` would launch it.
 */
const TERMINAL_BUNDLE_ID = "com.apple.Terminal";
/** Process name for the running check (pgrep -x). */
const TERMINAL_PROCESS_NAME = "Terminal";
/** AppleScript returning the tty of Terminal's focused tab, or "". */
const TERMINAL_FOCUSED_TTY_SCRIPT = `tell application "Terminal"
	try
		if (count of windows) is 0 then return ""
		return tty of selected tab of front window
	on error
		return ""
	end try
end tell`;
/**
 * AppleScript that selects the Terminal window+tab whose tty matches, raises
 * it, and activates Terminal. Returns "ok" or "notfound".
 */
function buildTerminalRaiseScript(tty) {
    if (tty.trim() === "") {
        return "";
    }
    const escapedTty = escapeForAppleScript(tty);
    return `tell application "Terminal"
	repeat with w in windows
		repeat with t in tabs of w
			if (tty of t) is "${escapedTty}" then
				set selected tab of w to t
				set frontmost of w to true
				activate
				return "ok"
			end if
		end repeat
	end repeat
end tell
return "notfound"`;
}

/** How often the key faces re-check the live state. */
const POLL_MS$3 = 2500;
/**
 * Live key face for a Claude Code PROJECT, host-independent: works whether
 * the session runs under tmux, plain iTerm2, or Terminal.app. The face shows
 * the project name, whether keystrokes would land in that session (status
 * bar), and the Claude spark (amber turning = working, white still = waiting;
 * dashed bar = no claude running there). Press raises the hosting window —
 * tmux-hosted instances sit on tmux pane ttys that iTerm/Terminal have never
 * heard of, so those route through the tmux raise machinery. Hold to capture
 * the frontmost session's project ("teach the button").
 */
let ClaudeProject = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.claudeproject" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        gate = new PressGate();
        visible = new Map();
        timer;
        refresher = new CoalescedRunner(() => this.doRefreshAll());
        spin = 0;
        lastImage = new Map();
        async onWillAppear(ev) {
            if (!ev.action.isKey())
                return;
            this.visible.set(ev.action.id, ev.action);
            if (this.timer === undefined) {
                this.timer = setInterval(() => void this.refreshAll(), POLL_MS$3);
            }
            await this.refreshAll();
        }
        onWillDisappear(ev) {
            this.gate.cancel(ev.action.id);
            this.visible.delete(ev.action.id);
            this.lastImage.delete(ev.action.id);
            if (this.visible.size === 0 && this.timer !== undefined) {
                clearInterval(this.timer);
                this.timer = undefined;
            }
        }
        onKeyDown(ev) {
            this.gate.down(ev.action.id, () => {
                void this.capture(ev.action).catch((err) => streamDeck.logger.error(`Claude Project capture failed: ${String(err)}`));
            });
        }
        async onKeyUp(ev) {
            if (!this.gate.up(ev.action.id))
                return; // long press already captured
            await this.focus(ev.action);
        }
        /** One query set per tick: process scan, tmux pane/client maps, frontmost
         * app + its focused tty. Transcript freshness is checked per project. */
        async snapshot() {
            const tmux = findTmuxPath();
            const [instances, panesRes, clientsRes, front] = await Promise.all([
                scanClaudeInstances(),
                runTmux(LIST_PANE_TTYS_ARGS, tmux),
                runTmux(LIST_CLIENTS_ARGS, tmux),
                runJxa(FRONT_APP_BUNDLE_JXA),
            ]);
            const frontBundle = front.ok ? front.stdout.trim() : "";
            // Only address a terminal app that is FRONTMOST (addressing via
            // AppleScript would launch it; frontmost implies running).
            let focusedTty = "";
            if (frontBundle === ITERM_BUNDLE_ID) {
                focusedTty = (await runAppleScript(ITERM_FOCUSED_TTY_SCRIPT)).stdout.trim();
            }
            else if (frontBundle === TERMINAL_BUNDLE_ID) {
                focusedTty = (await runAppleScript(TERMINAL_FOCUSED_TTY_SCRIPT)).stdout.trim();
            }
            return {
                instances,
                panes: panesRes.ok ? parsePaneTtys(panesRes.stdout) : [],
                clients: parseClients(clientsRes.stdout),
                frontBundle,
                focusedTty,
            };
        }
        /** Coalesced — see focus-tmux: explicit repaints must never be dropped. */
        refreshAll() {
            return this.refresher.request();
        }
        async doRefreshAll() {
            if (this.visible.size === 0)
                return;
            {
                const snap = await this.snapshot();
                this.spin++;
                for (const key of this.visible.values()) {
                    const settings = await key.getSettings();
                    const project = (settings.project ?? "").trim();
                    const image = await this.renderKey(project, snap);
                    if (this.lastImage.get(key.id) === image)
                        continue;
                    try {
                        await key.setImage(image);
                        this.lastImage.set(key.id, image);
                    }
                    catch (err) {
                        streamDeck.logger.debug(`Claude Project image skipped: ${String(err)}`);
                    }
                }
            }
        }
        async renderKey(project, snap) {
            const mine = project ? instancesForProject(snap.instances, project) : [];
            const pane = this.paneFor(mine, snap.panes);
            const instance = pane.instance ?? mine[0];
            let host = "";
            let hot = false;
            let title = null;
            if (instance !== undefined) {
                if (pane.pane !== undefined) {
                    host = "tmux";
                    title = titleWorking(pane.pane.title);
                    // Keystrokes land there when the pane would receive its session's
                    // keys AND that session's client is the focused iTerm session.
                    hot =
                        pane.pane.receivesKeys &&
                            snap.focusedTty !== "" &&
                            snap.clients.get(pane.pane.session) === snap.focusedTty;
                }
                else {
                    hot = snap.focusedTty !== "" && instance.tty === snap.focusedTty;
                    if (hot) {
                        host = snap.frontBundle === TERMINAL_BUNDLE_ID ? "terminal" : "iterm";
                    }
                }
            }
            const claude = projectClaudeState({
                present: instance !== undefined,
                titleWorking: title,
                transcriptAgeMs: instance !== undefined ? await newestTranscriptAgeMs(project) : null,
            });
            return svgToDataUri(buildClaudeProjectKeyImage({
                project: project || "no target",
                host,
                hot,
                claude,
                spin: this.spin,
            }));
        }
        /** The project's tmux-hosted instance and its pane, if any. */
        paneFor(mine, panes) {
            for (const instance of mine) {
                const pane = panes.find((p) => p.tty === instance.tty);
                if (pane !== undefined)
                    return { instance, pane };
            }
            return { instance: mine[0] };
        }
        /** Short press: raise whatever window hosts the project's session. */
        async focus(key) {
            const settings = await key.getSettings();
            const project = (settings.project ?? "").trim();
            if (!project) {
                streamDeck.logger.warn("Claude Project pressed with no project configured.");
                await key.showAlert();
                return;
            }
            // Resolve FRESH at press time — never from the poll cache.
            const snap = await this.snapshot();
            const mine = instancesForProject(snap.instances, project);
            if (mine.length === 0) {
                streamDeck.logger.warn(`Claude Project: no claude running in ${project}.`);
                await key.showAlert();
                return;
            }
            const { instance, pane } = this.paneFor(mine, snap.panes);
            const target = instance ?? mine[0];
            if (pane !== undefined) {
                // tmux-hosted: raise the hosting iTerm window by CLIENT tty, then
                // switch tmux to the exact window.
                const clientTty = snap.clients.get(pane.session);
                const raise = await runAppleScript(clientTty ? buildITermRaiseScript(clientTty) : 'tell application "iTerm" to activate');
                if (!raise.ok) {
                    streamDeck.logger.error(`Claude Project raise failed (${raise.code}): ${raise.stderr}`);
                    await key.showAlert();
                    return;
                }
                const tmux = findTmuxPath();
                const selected = await runTmux(["select-window", "-t", `${pane.session}:${pane.windowIndex}`], tmux);
                if (!selected.ok) {
                    streamDeck.logger.error(`Claude Project select-window failed: ${selected.stderr}`);
                    await key.showAlert();
                    return;
                }
                await key.showOk();
                setTimeout(() => void this.refreshAll(), 450); // frontmost settle
                return;
            }
            // Plain terminal: try the running hosts by tty. Only address apps that
            // are RUNNING — AppleScript launches the ones that aren't.
            if (await processRunning("iTerm2")) {
                const raise = await runAppleScript(buildITermRaiseScript(target.tty));
                if (raise.ok && raise.stdout.includes("ok")) {
                    await key.showOk();
                    return;
                }
            }
            if (await processRunning(TERMINAL_PROCESS_NAME)) {
                const raise = await runAppleScript(buildTerminalRaiseScript(target.tty));
                if (raise.ok && raise.stdout.includes("ok")) {
                    await key.showOk();
                    return;
                }
            }
            streamDeck.logger.warn(`Claude Project: no window found hosting ${target.tty}.`);
            await key.showAlert();
        }
        /** Long press: capture the frontmost session's project into this button. */
        async capture(key) {
            const snap = await this.snapshot();
            if (snap.focusedTty === "") {
                streamDeck.logger.warn("Claude Project capture: no terminal is frontmost.");
                await key.showAlert();
                return;
            }
            // Direct hit: the focused tab/session IS a claude tty (plain host).
            let cwd = snap.instances.find((i) => i.tty === snap.focusedTty)?.cwd;
            // tmux: the focused tty is a CLIENT tty; find the session it shows, then
            // the pane that would receive keys, then the claude on that pane tty.
            if (cwd === undefined) {
                for (const [session, clientTty] of snap.clients) {
                    if (clientTty !== snap.focusedTty)
                        continue;
                    const pane = snap.panes.find((p) => p.session === session && p.receivesKeys);
                    if (pane !== undefined) {
                        cwd = snap.instances.find((i) => i.tty === pane.tty)?.cwd;
                    }
                    break;
                }
            }
            if (cwd === undefined || cwd === "") {
                streamDeck.logger.warn("Claude Project capture: focused terminal is not running claude.");
                await key.showAlert();
                return;
            }
            const settings = await key.getSettings();
            await key.setSettings({ ...settings, project: cwd });
            streamDeck.logger.info(`Claude Project captured ${cwd}.`);
            await key.showOk();
            await this.refreshAll();
        }
    });
    return _classThis;
})();

/**
 * Pure logic for the BBEdit document dial: move between the text documents open
 * in BBEdit's front window, in a user-chosen traversal order. We cycle `text
 * documents` (not `documents`) so non-editor project/folder items that show
 * "(no editor)" are skipped.
 *
 * The ordering/selection is done here in TypeScript (testable): AppleScript
 * lists the docs with sort keys (`BBEDIT_LIST_SCRIPT`), this module orders them
 * and picks the target, then AppleScript selects it by its stable `id`
 * (`bbeditSelectScript`). Scripts interpolate only numeric ids, so there is
 * nothing to escape.
 */
/**
 * AppleScript that lists the front window's text documents, one per line as
 * `id<tab>name<tab>modSeconds`, then a final `ACTIVE<tab>id` line for the active
 * document. Returns "" when there is no text window.
 */
const BBEDIT_LIST_SCRIPT = `tell application "BBEdit"
	if (count of text windows) is 0 then return ""
	set w to text window 1
	set theDocs to text documents of w
	set epoch to current date
	set day of epoch to 1
	set month of epoch to January
	set year of epoch to 1970
	set time of epoch to 0
	set out to ""
	repeat with d in theDocs
		set out to out & (id of d) & tab & (name of d) & tab & ((modification date of d) - epoch) & linefeed
	end repeat
	try
		set out to out & "ACTIVE" & tab & (id of active document of w)
	end try
	return out
end tell`;
/** Parse `BBEDIT_LIST_SCRIPT` output into docs + the active document id. */
function parseBBEditDocs(output) {
    const docs = [];
    let activeId = null;
    for (const line of output.split("\n")) {
        if (line.trim() === "")
            continue;
        const parts = line.split("\t");
        if (parts[0] === "ACTIVE") {
            const id = Number.parseInt(parts[1] ?? "", 10);
            activeId = Number.isFinite(id) ? id : null;
            continue;
        }
        if (parts.length < 3)
            continue;
        const id = Number.parseInt(parts[0] ?? "", 10);
        if (!Number.isFinite(id))
            continue;
        const modSeconds = Number(parts[parts.length - 1]);
        const name = parts.slice(1, parts.length - 1).join("\t");
        docs.push({ id, name, modSeconds: Number.isFinite(modSeconds) ? modSeconds : 0 });
    }
    return { docs, activeId };
}
/** Order the documents by the chosen traversal mode (window = natural order). */
function orderedDocs(docs, order) {
    const arr = [...docs];
    switch (order) {
        case "alpha":
            return arr.sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
        case "recent":
            return arr.sort((a, b) => b.modSeconds - a.modSeconds || a.id - b.id);
        case "oldest":
            return arr.sort((a, b) => a.modSeconds - b.modSeconds || a.id - b.id);
        default:
            return arr;
    }
}
/**
 * Given docs already in traversal order, return the id of the next/previous
 * document relative to `activeId` (wrapping). If the active document isn't in
 * the set, jump to the first. Returns null only for an empty list.
 */
function nextDocId(ordered, activeId, direction) {
    const n = ordered.length;
    if (n === 0)
        return null;
    const idx = ordered.findIndex((d) => d.id === activeId);
    if (idx < 0)
        return ordered[0].id;
    const target = direction === "next" ? (idx + 1) % n : (idx - 1 + n) % n;
    return ordered[target].id;
}
/**
 * Remembers the previously active document so a dial press can jump back to it.
 * Feed every observed active id through {@link note}; `lastActive` is the id
 * that was active before the most recent change (never the current one).
 */
class ActiveDocTracker {
    current = null;
    previous = null;
    note(activeId) {
        if (activeId === null || activeId === this.current)
            return;
        this.previous = this.current;
        this.current = activeId;
    }
    get lastActive() {
        return this.previous;
    }
}
/**
 * The document a press should jump back to: the remembered id, provided it is
 * not the active document and is still open. Returns null when there is no
 * valid "previous" to go to (caller treats that as a no-op).
 */
function lastDocTarget(docs, activeId, remembered) {
    if (remembered === null || remembered === activeId)
        return null;
    return docs.some((d) => d.id === remembered) ? remembered : null;
}
/** AppleScript that selects the front window's text document with the given id. */
function bbeditSelectScript(id) {
    return `tell application "BBEdit"
	if (count of text windows) is 0 then return ""
	set w to text window 1
	try
		select (first text document of w whose id is ${id})
		return name of active document of w
	on error
		return ""
	end try
end tell`;
}

/**
 * Per-key async mutex: chains tasks for the same key so read-modify-write
 * handlers (dial rotations that persist a cursor, run a subprocess, then
 * render) can't interleave. Stream Deck delivers events serially, but async
 * handlers overlap at their await points — two rotations could both read the
 * same settings index and both write index+1. Tasks for DIFFERENT keys run
 * concurrently; a rejected task never breaks the chain.
 *
 * The map is self-cleaning: when a key's chain fully settles it removes its
 * own entry (only if it is still the tail). There is deliberately no external
 * "release" — deleting a live chain would let a new event run concurrently
 * with an in-flight task, recreating the exact race this exists to prevent.
 */
const chains = new Map();
function serialize(key, task) {
    const prev = chains.get(key) ?? Promise.resolve();
    const next = prev.then(task, task);
    let entry;
    entry = next.then(() => {
        if (chains.get(key) === entry)
            chains.delete(key);
    }, () => {
        if (chains.get(key) === entry)
            chains.delete(key);
    });
    chains.set(key, entry);
    return next;
}

/**
 * Dial action: move between the text documents open in BBEdit's front window,
 * in the order chosen in the property inspector. Press jumps back to the
 * previously active document (like tmux last-window). The touchscreen shows
 * the active document name.
 */
let BBEditDocDial = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.bbeditdoc" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        trackers = new Map();
        async onWillAppear(ev) {
            if (!ev.action.isDial())
                return;
            const state = await this.readDocs(ev.action);
            if (state === null)
                return;
            this.tracker(ev.action.id).note(state.activeId);
            await this.render(ev.action, this.activeName(state.docs, state.activeId));
        }
        onWillDisappear(ev) {
            this.trackers.delete(ev.action.id);
        }
        async onDialRotate(ev) {
            const { direction, steps } = rotationSteps(ev.payload.ticks);
            if (direction === "none")
                return;
            // Serialized per dial: two overlapping list→select sequences would both
            // read the same active doc and collapse two detents into one move.
            await serialize(ev.action.id, async () => {
                const state = await this.readDocs(ev.action);
                if (state === null)
                    return;
                const tracker = this.tracker(ev.action.id);
                tracker.note(state.activeId); // catch changes made in BBEdit itself
                const ordered = orderedDocs(state.docs, ev.payload.settings.order ?? "window");
                let activeId = state.activeId;
                for (let i = 0; i < steps; i++) {
                    const targetId = nextDocId(ordered, activeId, direction);
                    if (targetId === null) {
                        await this.render(ev.action, "no docs");
                        return;
                    }
                    await this.select(ev.action, targetId, tracker);
                    activeId = targetId;
                }
            });
        }
        /** Press: jump back to the previously active document. */
        async onDialDown(ev) {
            const state = await this.readDocs(ev.action);
            if (state === null)
                return;
            const tracker = this.tracker(ev.action.id);
            tracker.note(state.activeId);
            const targetId = lastDocTarget(state.docs, state.activeId, tracker.lastActive);
            if (targetId === null) {
                // Nothing to go back to yet — just confirm the current document.
                await this.render(ev.action, this.activeName(state.docs, state.activeId));
                return;
            }
            await this.select(ev.action, targetId, tracker);
        }
        /** Run the list script and parse it; null (already rendered) on failure. */
        async readDocs(dial) {
            const list = await runAppleScript(BBEDIT_LIST_SCRIPT);
            if (!list.ok) {
                this.logFailure("list", list.code, list.stderr);
                await this.render(dial, this.hint(list.code));
                return null;
            }
            return parseBBEditDocs(list.stdout);
        }
        /** Select a document by id, record it as active, and render the outcome. */
        async select(dial, targetId, tracker) {
            const selected = await runAppleScript(bbeditSelectScript(targetId));
            if (!selected.ok) {
                this.logFailure("select", selected.code, selected.stderr);
                await this.render(dial, this.hint(selected.code));
                return;
            }
            tracker.note(targetId);
            await this.render(dial, selected.stdout);
        }
        tracker(id) {
            let t = this.trackers.get(id);
            if (t === undefined) {
                t = new ActiveDocTracker();
                this.trackers.set(id, t);
            }
            return t;
        }
        activeName(docs, activeId) {
            return docs.find((d) => d.id === activeId)?.name ?? "";
        }
        /** Shared mode-dial layout; no ⇄ — this dial has no tap gesture. */
        async render(dial, docName) {
            try {
                await dial.setFeedback({ mode: { value: "BBEdit", color: "#F0A63C" }, current: docName.trim() || "—" });
            }
            catch (err) {
                streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
            }
        }
        logFailure(stage, code, stderr) {
            streamDeck.logger.error(`BBEdit ${stage} failed (${code}): ${stderr || "no stderr"}`);
            if (code === "permission-denied") {
                streamDeck.logger.error("Grant: System Settings > Privacy & Security > Automation > Stream Deck > enable BBEdit.");
            }
        }
        hint(code) {
            return code === "permission-denied" ? "grant access" : "no BBEdit?";
        }
    });
    return _classThis;
})();

/**
 * Live key face for Focus tmux Window: a miniature tmux pane whose bottom
 * status bar lights up — with a block cursor — exactly when the button's tmux
 * window would receive keyboard input (active window of its session, that
 * session's client tty is iTerm's focused session, and iTerm is the frontmost
 * app). Pure: state evaluation and SVG rendering only; the action supplies
 * the queried inputs and turns the SVG into a data URI.
 */
/**
 * Decide the key's state from the polled facts. The hot chain requires every
 * link: the target resolves, it is the ACTIVE window of its session, that
 * session has an attached client tty, iTerm is frontmost, and iTerm's focused
 * session sits on that exact tty (an unfocused split pane fails this —
 * correctly, since keystrokes would not go there).
 */
function evaluateKeyStatus(args) {
    const match = resolveTarget$1(args.windows, args.target);
    if (!match) {
        return { state: "unknown", session: "", window: args.target.trim() };
    }
    const tty = args.clients.get(match.session) ?? "";
    const hot = match.active && args.iTermFrontmost && tty !== "" && tty === args.focusedTty;
    return { state: hot ? "hot" : "cold", session: match.session, window: match.name };
}
const MONO = "Menlo, Monaco, monospace";
function truncate(value, max) {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
/** 12 o'clock-start orbit positions for the working dot (r=8 around the spark). */
const ORBIT = [[61.0, 4.0], [65.0, 5.1], [67.9, 8.0], [69.0, 12.0], [67.9, 16.0], [65.0, 18.9], [61.0, 20.0], [57.0, 18.9], [54.1, 16.0], [53.0, 12.0], [54.1, 8.0], [57.0, 5.1]];
/**
 * Render the 72×72 key SVG. The bottom strip is the tmux status bar: lit in
 * the session's hue with a block cursor when hot, a hollow outline when cold,
 * a gray dashed outline when the target can't be resolved. Session name is a
 * small uppercase eyebrow, window name the mono centerpiece. User text is
 * XML-escaped.
 */
function buildTmuxKeyImage(status, claude = "none", 
/** Poll tick counter — the working spark rotates a step per tick. */
spin = 0) {
    const hue = sessionHue(status.session);
    const name = truncate(status.window || (status.state === "unknown" ? "no target" : "—"), 9);
    // 10 chars keeps the centered eyebrow clear of the Claude spark's corner.
    const session = truncate(status.session.toUpperCase(), 10);
    let bar;
    let nameFill;
    let sessionText = "";
    let glyphStroke;
    // Stream Deck's KEY rasterizer paints hsl() literals as BLACK (the
    // touchscreen pipeline accepts them) — every colour here must be hex.
    if (status.state === "hot") {
        bar =
            `<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1">` +
                `<stop offset="0" stop-color="${hslToHex(hue, 62, 46)}"/>` +
                `<stop offset="1" stop-color="${hslToHex(hue, 66, 36)}"/>` +
                `</linearGradient></defs>` +
                `<rect x="0" y="57" width="72" height="15" fill="url(#b)"/>` +
                `<rect x="60" y="60.5" width="5" height="8" fill="#F2FFF6"/>`;
        nameFill = "#FFFFFF";
        sessionText = hslToHex(hue, 55, 72);
        glyphStroke = "#F2FFF6";
    }
    else if (status.state === "cold") {
        bar = `<rect x="1" y="58" width="70" height="13" fill="none" stroke="${hslToHex(hue, 35, 52)}" stroke-width="1.5"/>`;
        nameFill = "#A6ADA9";
        sessionText = hslToHex(hue, 50, 70);
        glyphStroke = hslToHex(hue, 50, 70);
    }
    else {
        bar = `<rect x="1" y="58" width="70" height="13" fill="none" stroke="#6A716E" stroke-width="1.5" stroke-dasharray="3 3"/>`;
        nameFill = "#8B9490";
        glyphStroke = "#8B9490";
    }
    // tmux identity mark: a tiny split-pane window at the bar's left end (where
    // tmux puts its session block) — present in every state so the key reads as
    // a tmux button even when idle; on hot it bookends the cursor. Attributes
    // go DIRECTLY on each element: Stream Deck's SVG rasterizer does not
    // reliably inherit presentation attributes from a <g> wrapper (the glyph
    // rendered as an invisible black-filled rect when they lived on the group).
    const glyph = `<rect x="5.5" y="60.5" width="9" height="8" rx="1" fill="none" stroke="${glyphStroke}" stroke-width="1.6"/>` +
        `<path d="M10 60.5v8" fill="none" stroke="${glyphStroke}" stroke-width="1.6"/>`;
    const eyebrow = session
        ? `<text x="36" y="15" text-anchor="middle" font-family="${MONO}" font-size="7.5" letter-spacing="1.2" fill="${sessionText}">${escapeXml(session)}</text>`
        : "";
    // Claude Code spark (top-right): amber and slowly rotating while WORKING,
    // still signal-white when finished and WAITING for input, absent when no
    // claude runs in the window. Drawn as paths — no font-fallback risk.
    let spark = "";
    if (claude !== "none") {
        const color = claude === "working" ? "#F0A63C" : "#F2FFF6";
        const angle = claude === "working" ? (spin % 12) * 30 : 0;
        spark =
            `<path d="M56 12h10M58.5 7.7l5 8.6M63.5 7.7l-5 8.6" ` +
                `stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none" ` +
                `transform="rotate(${angle} 61 12)"/>`;
        if (claude === "working") {
            // The star is 6-fold symmetric, so its rotation collapses to a
            // two-frame wobble — motion you cannot see at key size. The orbiting
            // dot gives 12 genuinely distinct frames per revolution.
            const [ox, oy] = ORBIT[spin % 12];
            spark += `<circle cx="${ox}" cy="${oy}" r="1.7" fill="#F0A63C"/>`;
        }
    }
    return (`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
        `<rect width="72" height="72" fill="#0F1211"/>` +
        eyebrow +
        spark +
        `<text x="36" y="40" text-anchor="middle" font-family="${MONO}" font-size="11.5" font-weight="700" fill="${nameFill}">${escapeXml(name)}</text>` +
        bar +
        glyph +
        `</svg>`);
}

/**
 * Which tmux client/session is in the frontmost macOS window? Chains the
 * probes the live tmux key faces already use: frontmost app (NSWorkspace JXA)
 * → iTerm's focused-session tty (only queried when iTerm IS frontmost —
 * addressing a non-running app via AppleScript would launch it) → tmux
 * list-clients tty → session. Null when indeterminate (iTerm not frontmost,
 * focused pane isn't a tmux client, …); the tmux dials treat null as
 * "nothing to control" and do nothing rather than drive a background terminal.
 *
 * The probe costs ~0.3s, so the result is cached briefly — a rotation burst
 * pays it once, and you don't change macOS windows mid-burst.
 */
const TTL_MS = 2000;
let cached = null;
let inFlight = null;
/** Bumped by invalidation; a probe may only publish to the cache if the
 * generation it started under is still current — a stale probe finishing
 * AFTER an invalidation must not resurrect pre-invalidation state. */
let generation = 0;
/** Drop the cache and orphan any in-flight probe (its result won't publish). */
function invalidateFrontTmux() {
    generation++;
    cached = null;
    inFlight = null;
}
function resolveFrontTmux(tmuxPath) {
    if (cached !== null && Date.now() - cached.at < TTL_MS) {
        return Promise.resolve(cached.front);
    }
    // Share one probe among concurrent callers (several dials rotating at
    // once must not each launch their own JXA + AppleScript + tmux trio).
    if (inFlight !== null) {
        return inFlight;
    }
    const p = probe(tmuxPath, generation);
    inFlight = p;
    void p.finally(() => {
        // Only clear our own reference — an orphaned probe's cleanup must not
        // drop a NEWER in-flight probe and trigger duplicate probing.
        if (inFlight === p)
            inFlight = null;
    });
    return p;
}
async function probe(tmuxPath, startedGeneration) {
    let front = null;
    const app = await runJxa(FRONT_APP_BUNDLE_JXA);
    if (app.ok && app.stdout.trim() === ITERM_BUNDLE_ID) {
        const [ttyRes, clientsRes] = await Promise.all([
            runAppleScript(ITERM_FOCUSED_TTY_SCRIPT),
            runTmux(LIST_CLIENTS_ARGS, tmuxPath),
        ]);
        const tty = ttyRes.stdout.trim();
        const session = sessionForTty(parseClients(clientsRes.stdout), tty);
        if (session !== null) {
            front = { session, tty };
        }
    }
    if (startedGeneration === generation) {
        cached = { front, at: Date.now() };
    }
    return front;
}

/** How often the key faces re-check the live focus state. */
const POLL_MS$2 = 2500;
/**
 * Raise the iTerm2 window hosting a tmux session (matched by one of its window
 * names) and optionally switch tmux to that window. The dropdown is populated
 * live from `tmux list-windows`; the target is re-resolved at press time so it
 * survives tmux layout changes. Holding the key ("teach the button") captures
 * the current tmux window as the new target. The key face renders live: a
 * mini tmux pane whose status bar lights up (with a block cursor) when this
 * window would receive keyboard input right now.
 */
let FocusTmuxWindow = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.tmux" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        gate = new PressGate();
        visible = new Map();
        timer;
        refresher = new CoalescedRunner(() => this.doRefreshAll());
        spin = 0; // poll tick counter — rotates the working spark
        lastImage = new Map(); // skip identical repaints
        async onWillAppear(ev) {
            if (!ev.action.isKey())
                return;
            this.visible.set(ev.action.id, ev.action);
            if (this.timer === undefined) {
                this.timer = setInterval(() => void this.refreshAll(), POLL_MS$2);
            }
            await this.refreshAll();
        }
        onKeyDown(ev) {
            this.gate.down(ev.action.id, () => {
                void this.capture(ev.action).catch((err) => streamDeck.logger.error(`Focus tmux capture failed: ${String(err)}`));
            });
        }
        async onKeyUp(ev) {
            if (!this.gate.up(ev.action.id))
                return; // long press already captured
            await this.focus(ev.action);
        }
        onWillDisappear(ev) {
            this.gate.cancel(ev.action.id);
            this.visible.delete(ev.action.id);
            this.lastImage.delete(ev.action.id);
            if (this.visible.size === 0 && this.timer !== undefined) {
                clearInterval(this.timer);
                this.timer = undefined;
            }
        }
        /**
         * One query set per tick, evaluated for every visible key: frontmost app
         * (fast NSWorkspace JXA, doubles as the gate — when iTerm isn't frontmost
         * nothing is hot and the iTerm query is skipped), tmux windows + clients,
         * and iTerm's focused-session tty.
         */
        /** Coalesced: an explicit repaint request colliding with an in-flight poll
         * tick queues a rerun instead of being dropped — a freshly captured or
         * raised key must never keep its old face for another poll cycle. */
        refreshAll() {
            return this.refresher.request();
        }
        async doRefreshAll() {
            if (this.visible.size === 0)
                return;
            {
                const tmux = findTmuxPath();
                this.spin++;
                const [front, windowsRes, clientsRes, panesRes] = await Promise.all([
                    runJxa(FRONT_APP_BUNDLE_JXA),
                    runTmux(LIST_WINDOWS_ARGS, tmux),
                    runTmux(LIST_CLIENTS_ARGS, tmux),
                    runTmux(LIST_PANES_ARGS, tmux),
                ]);
                const iTermFrontmost = front.ok && front.stdout.trim() === ITERM_BUNDLE_ID;
                // Only address iTerm when it is frontmost — AppleScript would LAUNCH it.
                const focusedTty = iTermFrontmost
                    ? (await runAppleScript(ITERM_FOCUSED_TTY_SCRIPT)).stdout.trim()
                    : "";
                const windows = windowsRes.ok ? parseWindows(windowsRes.stdout) : [];
                const clients = parseClients(clientsRes.stdout);
                const panes = panesRes.ok ? parsePanes(panesRes.stdout) : [];
                for (const key of this.visible.values()) {
                    const settings = await key.getSettings();
                    const status = evaluateKeyStatus({
                        windows,
                        clients,
                        target: (settings.target ?? "").trim(),
                        iTermFrontmost,
                        focusedTty,
                    });
                    const claude = status.state === "unknown"
                        ? "none"
                        : claudeStateForWindow(panes, status.session, status.window);
                    const image = svgToDataUri(buildTmuxKeyImage(status, claude, this.spin));
                    if (this.lastImage.get(key.id) === image)
                        continue; // unchanged — save the round-trip
                    try {
                        await key.setImage(image);
                        this.lastImage.set(key.id, image);
                    }
                    catch (err) {
                        streamDeck.logger.debug(`tmux key image skipped: ${String(err)}`);
                    }
                }
            }
        }
        /** Short press: raise the iTerm2 window for the configured tmux window. */
        async focus(key) {
            const settings = (await key.getSettings()) ?? {};
            const target = (settings.target ?? "").trim();
            if (!target) {
                streamDeck.logger.warn("Focus tmux Window pressed with no target selected.");
                await key.showAlert();
                return;
            }
            const tmux = findTmuxPath();
            const windowsResult = await runTmux(LIST_WINDOWS_ARGS, tmux);
            if (!windowsResult.ok) {
                streamDeck.logger.error(`tmux list-windows failed: ${windowsResult.stderr || "no server?"}`);
                await key.showAlert();
                return;
            }
            const match = resolveTarget$1(parseWindows(windowsResult.stdout), target);
            if (!match) {
                streamDeck.logger.warn(`No tmux window matched "${target}".`);
                await key.showAlert();
                return;
            }
            // Map the session to the iTerm2 window via its attached client tty.
            const clientsResult = await runTmux(LIST_CLIENTS_ARGS, tmux);
            const tty = parseClients(clientsResult.stdout).get(match.session);
            const raiseScript = tty ? buildITermRaiseScript(tty) : 'tell application "iTerm" to activate';
            const raise = await runAppleScript(raiseScript);
            if (!raise.ok) {
                // A hard failure (permission denied, script error) must not paint ✓.
                streamDeck.logger.error(`iTerm raise failed (${raise.code}): ${raise.stderr}`);
                await key.showAlert();
                return;
            }
            if (raise.stdout.includes("notfound")) {
                // Documented fallback: no iTerm session on that tty — iTerm was
                // activated, which is the best available outcome, so still ✓.
                streamDeck.logger.debug(`No iTerm session on tty ${tty ?? "?"}; activated iTerm only.`);
            }
            // Optionally switch tmux to the exact window (default on).
            if (settings.switchWindow !== false) {
                const selected = await runTmux(selectWindowArgs(match), tmux);
                if (!selected.ok) {
                    streamDeck.logger.error(`tmux select-window failed: ${selected.stderr || "no server?"}`);
                    await key.showAlert();
                    return;
                }
            }
            await key.showOk();
            await this.refreshAll(); // the press changed focus — flip the dots now
            // NSWorkspace can still report the OLD frontmost app right after the
            // raise; one short-settle re-refresh corrects the cold-then-fix flicker.
            setTimeout(() => void this.refreshAll(), 450);
        }
        /**
         * Long press: capture the current tmux window into this button — the window
         * of the session in the FRONTMOST macOS window (an untargeted query asks
         * tmux for ITS current window, which can belong to a background terminal —
         * the same wrong-session trap the dials had).
         */
        async capture(key) {
            const tmux = findTmuxPath();
            // Capture is an explicit "what is front RIGHT NOW" — a poll-aged cache
            // entry (up to 2s old) could name the previous session. Probe fresh.
            invalidateFrontTmux();
            const front = await resolveFrontTmux(tmux);
            if (front === null) {
                streamDeck.logger.warn("Focus tmux capture: iTerm/tmux is not the frontmost window.");
                await key.showAlert();
                return;
            }
            const result = await runTmux(currentWindowArgs(front.session), tmux);
            const target = result.ok ? captureTmuxTarget(parseCurrentWindow(result.stdout)) : "";
            if (target === "") {
                streamDeck.logger.warn(`Focus tmux capture: no current window (${result.stderr || "no server?"}).`);
                await key.showAlert();
                return;
            }
            const settings = (await key.getSettings()) ?? {};
            await key.setSettings({ ...settings, target });
            streamDeck.logger.info(`Focus tmux captured ${target}.`);
            await key.showOk();
            await this.refreshAll(); // repaint with the newly captured target
        }
        /** Serve the live list of tmux windows to the property inspector dropdown. */
        async onSendToPlugin(ev) {
            const payload = ev.payload;
            if (payload?.event !== "getTmuxWindows")
                return;
            const tmux = findTmuxPath();
            const result = await runTmux(LIST_WINDOWS_ARGS, tmux);
            const items = parseWindows(result.stdout).map((w) => ({
                label: tmuxWindowLabel(w),
                value: tmuxWindowValue(w),
            }));
            await streamDeck.ui.current?.sendToPropertyInspector({ event: "getTmuxWindows", items });
        }
    });
    return _classThis;
})();

/**
 * AppleScript generation. Pure string-building so it can be unit-tested without
 * actually invoking osascript. All user-controlled values are escaped before
 * interpolation to avoid AppleScript injection.
 */
/** Build a title-match clause from a `||`-separated pattern list. */
function titleClause(titlePattern) {
    if (!titlePattern)
        return "";
    const parts = titlePattern
        .split("||")
        .map((p) => p.trim())
        .filter(Boolean);
    if (parts.length === 0)
        return "";
    const ors = parts.map((p) => `(theName contains "${escapeForAppleScript(p)}")`).join(" or ");
    return ` or ${ors}`;
}
/**
 * Split a URL match pattern into ordered literal segments on `*` wildcards.
 *
 * A pattern with no `*` yields a single segment, which matches as a plain
 * substring (so existing non-wildcard patterns are unchanged). `*` stands for
 * any run of characters; matching requires the segments to appear in order but
 * is not anchored (it still matches anywhere in the URL).
 *
 * Examples: `"a/b"` -> `["a/b"]`; `"mail.google.com/u/*​/inbox"` ->
 * `["mail.google.com/u/", "/inbox"]`; `"*"` / `""` -> `[]` (matches anything).
 */
function wildcardSegments(pattern) {
    return pattern.split("*").filter((segment) => segment.length > 0);
}
/** Render segments as an AppleScript list literal of escaped strings. */
function segmentsListLiteral(segments) {
    return `{${segments.map((s) => `"${escapeForAppleScript(s)}"`).join(", ")}}`;
}
/**
 * Find an existing Safari tab matching the URL pattern (or title fallback),
 * focus it, and raise its window. If none is found, open the URL. The URL match
 * supports `*` wildcards via an ordered-segment containment check.
 *
 * `URL of tb` / `name of tb` on an unloaded (suspended/session-restored) tab
 * does not error — it returns `missing value`, which slips past the try blocks
 * and would crash urlMatches with -1728 ("Can't get length of missing value"),
 * killing the whole scan. Hence the explicit `missing value` -> "" coercions.
 */
function buildNormalScript(t) {
    const url = escapeForAppleScript(t.url);
    const segs = segmentsListLiteral(wildcardSegments(t.urlPattern));
    const titleMatch = titleClause(t.titlePattern);
    return `on urlMatches(u)
	set segs to ${segs}
	set startIdx to 1
	set uLen to (length of u)
	repeat with seg in segs
		set s to (seg as text)
		if s is not "" then
			if startIdx > uLen then return false
			set f to offset of s in (text startIdx thru uLen of u)
			if f is 0 then return false
			set startIdx to startIdx + f + (length of s) - 1
		end if
	end repeat
	return true
end urlMatches

tell application "Safari"
	set wasFound to false
	repeat with w in windows
		repeat with tb in tabs of w
			try
				set theURL to URL of tb
			on error
				set theURL to ""
			end try
			if theURL is missing value then set theURL to ""
			try
				set theName to name of tb
			on error
				set theName to ""
			end try
			if theName is missing value then set theName to ""
			if (my urlMatches(theURL))${titleMatch} then
				set current tab of w to tb
				set index of w to 1
				set wasFound to true
				exit repeat
			end if
		end repeat
		if wasFound then exit repeat
	end repeat
	if not wasFound then
		open location "${url}"
	end if
	activate
end tell
return "ok"`;
}
/**
 * Open the URL in a NEW private window. Safari does not expose private-window
 * tabs to AppleScript, so matching an existing private tab is not possible — we
 * always open fresh via the ⌘⇧N menu shortcut.
 *
 * Safety: rather than a fixed `delay` then blindly writing `front document`
 * (which, if the private window opened slowly, would navigate the user's CURRENT
 * tab), we count windows first and poll until the count INCREASES — the only
 * reliable sign the new window exists (a URL-change proxy fails when the new
 * window's start page has the same URL as the previous front tab). Only then is
 * the URL set, on the now-frontmost new window. A timeout RAISES an
 * AppleScript error — osascript then exits non-zero, which is the only signal
 * runAppleScript's ok/callers actually honour (a returned "error:…" string
 * would be treated as success).
 */
function buildPrivateScript(t) {
    const url = escapeForAppleScript(t.url);
    return `tell application "Safari"
	activate
	set prevCount to (count of windows)
end tell
tell application "System Events"
	keystroke "n" using {command down, shift down}
end tell
tell application "Safari"
	set waited to 0
	repeat until ((count of windows) > prevCount) or (waited > 40)
		delay 0.05
		set waited to waited + 1
	end repeat
	if (count of windows) > prevCount then
		set URL of front document to "${url}"
		activate
		return "ok"
	end if
end tell
error "private window did not open"`;
}
/** Build the AppleScript for a resolved target (private or normal). */
function buildJumpScript(t) {
    return t.private ? buildPrivateScript(t) : buildNormalScript(t);
}
/**
 * AppleScript returning the URL of Safari's current front tab, or "" when
 * there is no window or the tab is unloaded (`URL of tab` yields
 * `missing value` without erroring — see buildNormalScript).
 */
const FRONT_TAB_URL_SCRIPT = `tell application "Safari"
	if (count of windows) is 0 then return ""
	set u to URL of current tab of front window
	if u is missing value then return ""
	return u
end tell`;

/**
 * Target resolution: turn per-button settings into a concrete URL + match
 * pattern. This is the multi-account / preset logic and is intentionally pure
 * (no Stream Deck, no Safari) so it is fully unit-testable.
 */
/** Coerce an account index into a non-negative integer, defaulting to 0. */
function normalizeIndex(value) {
    const n = typeof value === "string" ? Number.parseInt(value, 10) : value;
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}
/** Derive a sensible match pattern (host + path) from a full URL. */
function derivePattern(url) {
    try {
        const u = new URL(url);
        return (u.host + u.pathname).replace(/\/+$/, "");
    }
    catch {
        return url.trim();
    }
}
/**
 * "Teach the button": rebuild the settings around a captured live URL. The
 * button becomes a custom target for that URL (pattern derived from it); a
 * stale titlePattern is dropped so it cannot match some other tab, and the
 * private flag survives (capture changes WHERE the button goes, not HOW).
 * Returns null for a blank URL — nothing worth saving.
 */
function captureTarget(url, prev) {
    const trimmed = url.trim();
    if (trimmed === "")
        return null;
    return {
        ...prev,
        service: "custom",
        url: trimmed,
        urlPattern: derivePattern(trimmed),
        titlePattern: undefined,
    };
}
function resolveTarget(settings) {
    const isPrivate = settings.private === true;
    const idx = normalizeIndex(settings.accountIndex);
    const titlePattern = settings.titlePattern?.trim() || undefined;
    // The PI's `service` dropdown only persists once actively changed, so a
    // button left on the default Gmail option saves no `service` at all. Infer
    // it: a bare URL implies a custom target, otherwise default to Gmail.
    const service = settings.service ?? (settings.url?.trim() ? "custom" : "gmail");
    switch (service) {
        case "gmail":
            return {
                url: `https://mail.google.com/mail/u/${idx}/`,
                urlPattern: `mail.google.com/mail/u/${idx}`,
                titlePattern,
                private: isPrivate,
            };
        case "calendar":
            return {
                url: `https://calendar.google.com/calendar/u/${idx}/r`,
                urlPattern: `calendar.google.com/calendar/u/${idx}`,
                titlePattern,
                private: isPrivate,
            };
        case "custom":
        default: {
            const url = (settings.url ?? "").trim();
            return {
                url,
                urlPattern: settings.urlPattern?.trim() || derivePattern(url),
                titlePattern,
                private: isPrivate,
            };
        }
    }
}

/**
 * Jump to (or open) a Safari tab. Settings are per-key, so there is no shared
 * target list to clobber — each button owns its own target. Holding the key
 * ("teach the button") captures Safari's current front tab as the new target.
 */
let JumpToTab = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.jump" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        gate = new PressGate();
        onKeyDown(ev) {
            this.gate.down(ev.action.id, () => {
                void this.capture(ev.action).catch((err) => streamDeck.logger.error(`Jump to Tab capture failed: ${String(err)}`));
            });
        }
        async onKeyUp(ev) {
            if (!this.gate.up(ev.action.id))
                return; // long press already captured
            await this.jump(ev.action);
        }
        onWillDisappear(ev) {
            this.gate.cancel(ev.action.id);
        }
        /** Short press: focus (or open) the configured tab. */
        async jump(key) {
            const target = resolveTarget((await key.getSettings()) ?? {});
            if (!target.url) {
                streamDeck.logger.warn("Jump to Tab pressed with no URL configured.");
                await key.showAlert();
                return;
            }
            const result = await runAppleScript(buildJumpScript(target));
            if (result.ok) {
                await key.showOk();
                return;
            }
            await key.showAlert();
            if (result.code === "permission-denied") {
                streamDeck.logger.error("Safari automation blocked. Grant access: System Settings > Privacy & Security > " +
                    "Automation > Stream Deck > enable Safari (and System Events for private windows).");
            }
            else {
                streamDeck.logger.error(`Jump to Tab failed: ${result.stderr || "unknown error"}`);
            }
        }
        /** Long press: capture Safari's current front tab into this button. */
        async capture(key) {
            const result = await runAppleScript(FRONT_TAB_URL_SCRIPT);
            const updated = result.ok ? captureTarget(result.stdout.trim(), await key.getSettings()) : null;
            if (updated === null) {
                streamDeck.logger.warn(`Jump to Tab capture: no front tab URL (${result.stderr || "empty"}).`);
                await key.showAlert();
                return;
            }
            await key.setSettings(updated);
            streamDeck.logger.info(`Jump to Tab captured ${updated.url}.`);
            await key.showOk();
        }
    });
    return _classThis;
})();

/**
 * Pure logic for the "Open File" action: glob matching, picking a file from a
 * directory listing by a strategy, and building `open` arguments. The actual
 * filesystem read and process launch live in the action; everything here is
 * pure and unit-testable.
 */
/**
 * Expand a leading `~` to the home directory. Node's fs does not understand
 * `~` (it's a shell convenience), so a directory like "~/Downloads" must be
 * resolved before use. Non-tilde paths are returned unchanged.
 */
function expandHome(p, home) {
    if (p === "~")
        return home;
    if (p.startsWith("~/"))
        return `${home}${p.slice(1)}`;
    return p;
}
/**
 * Convert a filename glob (`*` = any run, `?` = one char) into an anchored,
 * case-insensitive RegExp. All other regex metacharacters are matched literally.
 */
function globToRegExp(glob) {
    const specials = /[.+^${}()|[\]\\]/;
    let body = "";
    for (const ch of glob) {
        if (ch === "*")
            body += ".*";
        else if (ch === "?")
            body += ".";
        else
            body += specials.test(ch) ? `\\${ch}` : ch;
    }
    return new RegExp(`^${body}$`, "i");
}
/**
 * Pick one file from `entries` matching `pattern`, by `mode`:
 *   - "modified": most recently modified (mtime)
 *   - "created":  most recently created (birthtime)
 *   - "name":     last in descending name order (handy for date-named files)
 * Returns null when nothing matches.
 */
function selectFile(entries, pattern, mode) {
    const re = globToRegExp(pattern.trim() || "*");
    const matches = entries.filter((e) => re.test(e.name));
    if (matches.length === 0)
        return null;
    const compare = mode === "created"
        ? (a, b) => b.birthtimeMs - a.birthtimeMs
        : mode === "name"
            ? (a, b) => b.name.localeCompare(a.name)
            : (a, b) => b.mtimeMs - a.mtimeMs;
    return [...matches].sort(compare)[0] ?? null;
}
/**
 * Build `open` CLI args for the chosen file. Default app: `open <file>`;
 * BBEdit: `open -a BBEdit <file>`; a named/path app: `open -a <app> <file>`.
 * Falls back to the default app when "app" is selected but none is provided.
 */
function buildOpenArgs(filePath, opener, app) {
    if (opener === "bbedit")
        return ["-a", "BBEdit", filePath];
    if (opener === "app" && app && app.trim() !== "")
        return ["-a", app.trim(), filePath];
    return [filePath];
}

/**
 * Builds the Open File key image as an SVG: a document glyph with an optional
 * status badge — a green check when a matching file exists, a red X when none
 * does. Pure and unit-testable; the action turns it into a data URI for
 * setImage.
 */
// svgToDataUri now lives in the shared svg module; re-exported for callers.
function badge(status) {
    if (status === "match") {
        return (`<circle cx="52" cy="50" r="13" fill="#46C46E" stroke="#0F1211" stroke-width="2"/>` +
            `<path d="M46 50l4 4 8-9" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    if (status === "none") {
        return (`<circle cx="52" cy="50" r="13" fill="#E5484D" stroke="#0F1211" stroke-width="2"/>` +
            `<path d="M47 45l10 10M57 45l-10 10" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>`);
    }
    return "";
}
/**
 * Build the 72×72 Open File key image SVG for the given status, on the shared
 * design system (ink ground, teal files family, jack-line — matching the
 * action's static icon). Hex colours only: the key rasterizer paints hsl()
 * black.
 */
function buildOpenFileImage(status) {
    return (`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
        `<rect width="72" height="72" fill="#0F1211"/>` +
        `<rect x="8" y="62.5" width="56" height="3.5" rx="1.75" fill="#3EC9C4" opacity="0.95"/>` +
        `<rect x="20" y="9" width="26" height="36" rx="3" fill="none" stroke="#3EC9C4" stroke-width="3"/>` +
        `<path d="M26 18h14M26 25h14M26 32h9" stroke="#3EC9C4" stroke-width="2.5" opacity="0.8" stroke-linecap="round"/>` +
        badge(status) +
        `</svg>`);
}

/** How often the status badge re-checks the directory (ms). */
const POLL_MS$1 = 10_000;
/**
 * Open the newest / latest-modified / pattern-matched file in a directory with
 * the default app, BBEdit, or a chosen app. When the status indicator is on,
 * the key shows a ✓ when a matching file exists or a ✗ when none does, polled
 * live so it reflects new files without a press.
 */
let OpenFile = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.openfile" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        visible = new Map();
        timer;
        async onWillAppear(ev) {
            if (!ev.action.isKey())
                return;
            this.visible.set(ev.action.id, ev.action);
            if (this.timer === undefined) {
                this.timer = setInterval(() => void this.refreshAll(), POLL_MS$1);
            }
            await this.updateStatus(ev.action, ev.payload.settings);
        }
        onWillDisappear(ev) {
            this.visible.delete(ev.action.id);
            if (this.visible.size === 0 && this.timer !== undefined) {
                clearInterval(this.timer);
                this.timer = undefined;
            }
        }
        async onDidReceiveSettings(ev) {
            if (ev.action.isKey()) {
                await this.updateStatus(ev.action, ev.payload.settings);
            }
        }
        async onKeyDown(ev) {
            const settings = ev.payload.settings;
            const dir = expandHome((settings.directory ?? "").trim(), homedir());
            if (!dir) {
                streamDeck.logger.warn("Open File pressed with no directory configured.");
                await ev.action.showAlert();
                return;
            }
            const entries = await this.list(dir);
            if (entries === null) {
                streamDeck.logger.error(`Open File: cannot read directory "${dir}".`);
                await ev.action.showAlert();
                return;
            }
            const chosen = selectFile(entries, settings.pattern ?? "*", settings.pick ?? "modified");
            if (!chosen) {
                streamDeck.logger.warn(`Open File: no file matched "${settings.pattern ?? "*"}" in ${dir}.`);
                await ev.action.showAlert();
                await this.updateStatus(ev.action, settings);
                return;
            }
            const args = buildOpenArgs(join(dir, chosen.name), settings.openWith ?? "default", settings.app);
            const ok = await this.open(args);
            await (ok ? ev.action.showOk() : ev.action.showAlert());
            await this.updateStatus(ev.action, settings);
        }
        /**
         * Read a directory into file entries with timestamps, or null on error.
         * Fully async: this plugin is ONE process serving every key and dial, and a
         * slow/network/huge directory scanned synchronously would freeze all of
         * them (it polls every 10s). Stat failures on individual files (deleted
         * mid-scan) are skipped rather than failing the listing.
         */
        async list(dir) {
            try {
                const dirents = await readdir(dir, { withFileTypes: true });
                const names = dirents.filter((d) => d.isFile()).map((d) => d.name);
                const entries = [];
                // Bounded batches: a huge directory must not open thousands of
                // simultaneous stat operations (descriptor pressure).
                const BATCH = 64;
                for (let i = 0; i < names.length; i += BATCH) {
                    const batch = await Promise.all(names.slice(i, i + BATCH).map(async (name) => {
                        try {
                            const st = await stat(join(dir, name));
                            return { name, mtimeMs: st.mtimeMs, birthtimeMs: st.birthtimeMs };
                        }
                        catch {
                            return null; // deleted mid-scan
                        }
                    }));
                    for (const e of batch)
                        if (e !== null)
                            entries.push(e);
                }
                return entries;
            }
            catch {
                return null;
            }
        }
        open(args) {
            return new Promise((resolve) => {
                execFile("/usr/bin/open", args, { timeout: 10_000 }, (err) => resolve(!err));
            });
        }
        async refreshAll() {
            for (const action of this.visible.values()) {
                const settings = await action.getSettings();
                await this.updateStatus(action, settings);
            }
        }
        /** Paint the ✓/✗ status badge (or reset to the plain icon when disabled). */
        async updateStatus(action, settings) {
            try {
                if (!settings.statusIndicator) {
                    await action.setImage();
                    return;
                }
                const dir = expandHome((settings.directory ?? "").trim(), homedir());
                let status = "none";
                if (dir) {
                    const entries = await this.list(dir);
                    const hit = entries && selectFile(entries, settings.pattern ?? "*", settings.pick ?? "modified");
                    status = hit ? "match" : "none";
                }
                await action.setImage(svgToDataUri(buildOpenFileImage(status)));
            }
            catch (err) {
                streamDeck.logger.debug(`Open File status update skipped: ${String(err)}`);
            }
        }
    });
    return _classThis;
})();

/**
 * Pure logic for the "scroll the frontmost window" Stream Deck dial.
 *
 * This module models a dial rotation as a {@link KeystrokePlan} and renders
 * that plan into an AppleScript string that drives macOS System Events. It is
 * intentionally free of any Stream Deck SDK dependency so it can be unit
 * tested in isolation.
 *
 * macOS virtual key codes used here:
 *   116 = Page Up, 121 = Page Down, 125 = Down arrow, 126 = Up arrow.
 */
/**
 * Coerce an arbitrary settings value into a usable lines-per-tick count.
 *
 * Rules: parse numbers and numeric strings, floor to an integer, and clamp to
 * a minimum of 1. Anything unparseable (including `undefined`) falls back to
 * the default of 3.
 *
 * Examples: `"5" -> 5`, `undefined -> 3`, `0 -> 1`, `-2 -> 1`, `2.9 -> 2`,
 * `"abc" -> 3`.
 */
function normalizeLinesPerTick(value) {
    const n = typeof value === "number"
        ? value
        : typeof value === "string"
            ? Number(value)
            : NaN;
    if (!Number.isFinite(n))
        return 3;
    return Math.max(1, Math.floor(n));
}
/** Toggle between the two speeds. */
function nextSpeed(s) {
    return s === "fast" ? "slow" : "fast";
}
/** In "fast" mode each tick scrolls this many times the slow-mode line count. */
const FAST_MULTIPLIER = 5;
/**
 * Map a dial rotation to a signed scroll distance in lines, posted as a single
 * proportional scroll-wheel event by the native helper (not synthetic
 * keystrokes — those coalesce and never scale).
 *
 * Positive ticks scroll DOWN; negative ticks scroll UP. Ticks are truncated
 * toward zero. In "slow" mode a tick is `linesPerTick` lines; in "fast" mode it
 * is `linesPerTick * FAST_MULTIPLIER`. `linesPerTick` defaults to 3. A zero
 * rotation returns 0 (a no-op).
 */
function scrollLines(ticks, speed, linesPerTick = 3) {
    const truncated = Math.trunc(ticks);
    const perTick = speed === "fast" ? linesPerTick * FAST_MULTIPLIER : linesPerTick;
    return truncated * perTick;
}
/**
 * Plan a "jump to top of document" action: Cmd+Up (key code 126 with the
 * command modifier), sent once.
 */
function jumpTopPlan() {
    return {
        keyCode: 126,
        repeats: 1,
        modifiers: ["command down"],
    };
}
/**
 * Seconds to pause between consecutive synthetic key presses. macOS coalesces
 * (drops) System Events key codes fired back-to-back with no gap, which made
 * `linesPerTick` appear to have no effect — 6 presses scrolled the same as 1.
 * A small delay lets each press register so the count actually scales.
 */
const KEYSTROKE_DELAY_SECONDS = 0.02;
/**
 * Render a {@link KeystrokePlan} into an AppleScript that sends its key code
 * `repeats` times via System Events, pausing briefly between presses so they
 * are not coalesced.
 *
 * If `repeats <= 0`, returns a no-op script containing no `key code` line.
 * Otherwise emits a `repeat` loop. The `using {...}` clause is included only
 * when the plan has at least one modifier.
 */
function buildKeystrokeScript(plan) {
    if (plan.repeats <= 0) {
        return 'return "noop"';
    }
    const using = plan.modifiers.length > 0
        ? ` using {${plan.modifiers.join(", ")}}`
        : "";
    return [
        'tell application "System Events"',
        `\trepeat ${plan.repeats} times`,
        `\t\tkey code ${plan.keyCode}${using}`,
        `\t\tdelay ${KEYSTROKE_DELAY_SECONDS}`,
        "\tend repeat",
        "end tell",
        'return "ok"',
    ].join("\n");
}

/**
 * Invokes the native `scroll` helper (bin/macos/scroll) that posts a real
 * CGScrollWheel event. The helper path is derived from a base URL (normally
 * `import.meta.url` of the bundled plugin) so it resolves inside the installed
 * plugin folder. `exec` is injectable for tests.
 */
/** Resolve the helper binary path relative to the bundled plugin entry point. */
function scrollHelperPath(baseUrl) {
    return fileURLToPath(new URL("macos/scroll", baseUrl));
}
/** A stuck helper must never leave a dial handler pending forever. */
const HELPER_TIMEOUT_MS$1 = 4000;
/** Post a signed line-count scroll via the helper. No-op for 0 lines. */
function runScroll(lines, baseUrl, exec = execFile) {
    if (lines === 0) {
        return Promise.resolve({ ok: true, trusted: true });
    }
    const bin = scrollHelperPath(baseUrl);
    return new Promise((resolve) => {
        exec(bin, [String(lines)], { timeout: HELPER_TIMEOUT_MS$1 }, (error, _stdout, stderr) => {
            const trusted = !/untrusted/i.test(String(stderr ?? ""));
            resolve({ ok: !error, trusted });
        });
    });
}

/**
 * Dial action: rotate to scroll the frontmost window; press to either jump to
 * the top of the document or toggle between fast and slow scrolling; touch-tap
 * always toggles the speed (so both gestures are available at once). Defaults
 * are applied here (speed → slow, press → jump-to-top) so behaviour does not
 * depend on the property inspector persisting its dropdown defaults.
 */
let ScrollWindow = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.scroll" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async onWillAppear(ev) {
            if (ev.action.isDial()) {
                await this.render(ev.action, ev.payload.settings);
            }
        }
        async onDialRotate(ev) {
            const speed = ev.payload.settings.speed ?? "slow";
            const linesPerTick = normalizeLinesPerTick(ev.payload.settings.linesPerTick);
            const lines = scrollLines(ev.payload.ticks, speed, linesPerTick);
            if (lines === 0)
                return;
            // One proportional scroll-wheel event via the native helper — no keystroke
            // spam, so the line count actually scales and there is no per-press lag.
            const result = await runScroll(lines, import.meta.url);
            if (!result.ok) {
                streamDeck.logger.error("Scroll helper failed to run (missing/blocked binary?).");
            }
            if (!result.trusted) {
                streamDeck.logger.error("Scroll blocked. Grant Accessibility: System Settings > Privacy & Security > " +
                    "Accessibility > enable Stream Deck (synthetic scroll needs this).");
            }
        }
        async onDialDown(ev) {
            const settings = ev.payload.settings;
            if (settings.pressAction === "toggleSpeed") {
                await this.toggleSpeed(ev.action, settings);
                return;
            }
            // Default press behaviour: jump to the top of the document (⌘↑).
            const result = await runAppleScript(buildKeystrokeScript(jumpTopPlan()));
            if (!result.ok)
                this.warn(result.code);
        }
        /** Touch-tap: always toggle fast/slow, regardless of the press setting. */
        async onTouchTap(ev) {
            await this.toggleSpeed(ev.action, ev.payload.settings);
        }
        async toggleSpeed(dial, settings) {
            const updated = { ...settings, speed: nextSpeed(settings.speed ?? "slow") };
            await dial.setSettings(updated);
            await this.render(dial, updated);
        }
        /** Answer the property inspector's live Accessibility-permission check. */
        async onSendToPlugin(ev) {
            await respondToAccessibilityCheck(ev.payload, import.meta.url);
        }
        /** Best-effort touchscreen readout of the current speed; never blocks
         * scrolling. Shared mode-dial layout; the ⇄ marks the tap-to-toggle. */
        async render(dial, settings) {
            const speed = settings.speed ?? "slow";
            try {
                await dial.setFeedback({
                    mode: { value: "Scroll ⇄", color: "#4E9CFF" },
                    current: speed === "fast" ? "Fast" : "Slow",
                });
            }
            catch (err) {
                streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
            }
        }
        warn(code) {
            if (code === "permission-denied") {
                streamDeck.logger.error("Scroll blocked. Grant Accessibility: System Settings > Privacy & Security > " +
                    "Accessibility > enable Stream Deck (sending keystrokes needs this).");
            }
            else {
                streamDeck.logger.error(`Scroll failed: ${code}`);
            }
        }
    });
    return _classThis;
})();

/**
 * Normalize raw {@link AppSettings} into a {@link ResolvedApp}.
 *
 * - `appName` is trimmed; missing → `""`.
 * - `titlePattern` is trimmed; missing or whitespace-only → `undefined`.
 */
function resolveApp(s) {
    const appName = (s.appName ?? "").trim();
    const trimmedPattern = (s.titlePattern ?? "").trim();
    const titlePattern = trimmedPattern.length > 0 ? trimmedPattern : undefined;
    return { appName, titlePattern };
}
/**
 * "Teach the button": point the settings at a captured frontmost app. The
 * old titlePattern is dropped — it belonged to the previous app and would
 * otherwise raise an arbitrary matching window of the new one. Returns null
 * for a blank app name.
 */
function captureApp(appName, prev) {
    const trimmed = appName.trim();
    if (trimmed === "")
        return null;
    return { ...prev, appName: trimmed, titlePattern: undefined };
}
/**
 * Build the AppleScript that opens or switches to the given app, optionally
 * raising the first window whose title contains `titlePattern`.
 *
 * - Empty `appName` → returns `""` (caller treats this as "not configured").
 * - No `titlePattern` → a simple `activate` (launches or switches to the app).
 * - With `titlePattern` → activates the app, then uses System Events to find
 *   and raise the first matching window.
 *
 * All interpolated user values are escaped via {@link escapeForAppleScript}.
 */
function buildAppScript(app) {
    if (app.appName.length === 0) {
        return "";
    }
    const appName = escapeForAppleScript(app.appName);
    if (app.titlePattern === undefined) {
        return `tell application "${appName}" to activate`;
    }
    const pattern = escapeForAppleScript(app.titlePattern);
    // Exact-title pass first: the Window Ring stores FULL titles, and a bare
    // `contains` would raise the wrong window when one title is a substring of
    // another. Falls back to substring so partial user patterns still work.
    return [
        `tell application "${appName}" to activate`,
        `delay 0.15`,
        `tell application "System Events"`,
        `  tell process "${appName}"`,
        `    set matched to false`,
        `    repeat with w in windows`,
        `      if name of w is "${pattern}" then`,
        `        perform action "AXRaise" of w`,
        `        set frontmost to true`,
        `        set matched to true`,
        `        exit repeat`,
        `      end if`,
        `    end repeat`,
        `    if not matched then`,
        `      repeat with w in windows`,
        `        if name of w contains "${pattern}" then`,
        `          perform action "AXRaise" of w`,
        `          set frontmost to true`,
        `          set matched to true`,
        `          exit repeat`,
        `        end if`,
        `      end repeat`,
        `    end if`,
        `  end tell`,
        `end tell`,
        `return "ok"`,
    ].join("\n");
}

/**
 * Open or switch to an app, optionally focusing a window whose title contains a
 * pattern. `activate` both launches (if needed) and switches; with a title
 * pattern, System Events raises the first matching window. Holding the key
 * ("teach the button") captures the frontmost app as the new target.
 */
let SwitchApp = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.switchapp" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        gate = new PressGate();
        onKeyDown(ev) {
            this.gate.down(ev.action.id, () => {
                void this.capture(ev.action).catch((err) => streamDeck.logger.error(`Open/Switch App capture failed: ${String(err)}`));
            });
        }
        async onKeyUp(ev) {
            if (!this.gate.up(ev.action.id))
                return; // long press already captured
            await this.switchTo(ev.action);
        }
        onWillDisappear(ev) {
            this.gate.cancel(ev.action.id);
        }
        /** Short press: open or switch to the configured app. */
        async switchTo(key) {
            const app = resolveApp((await key.getSettings()) ?? {});
            const script = buildAppScript(app);
            if (!script) {
                streamDeck.logger.warn("Open/Switch App pressed with no application configured.");
                await key.showAlert();
                return;
            }
            const result = await runAppleScript(script);
            if (result.ok) {
                await key.showOk();
                return;
            }
            await key.showAlert();
            if (result.code === "permission-denied") {
                streamDeck.logger.error("App switch blocked. Grant access in System Settings > Privacy & Security: " +
                    "Automation (the target app) and, for title matching, Accessibility > Stream Deck.");
            }
            else {
                streamDeck.logger.error(`Open/Switch App failed: ${result.stderr || result.code}`);
            }
        }
        /** Long press: capture the frontmost app into this button. */
        async capture(key) {
            const result = await runAppleScript(FRONT_WINDOW_SCRIPT);
            const updated = result.ok
                ? captureApp(parseFrontWindow(result.stdout).app, await key.getSettings())
                : null;
            if (updated === null) {
                streamDeck.logger.warn(`Open/Switch App capture: no frontmost app (${result.stderr || "empty"}).`);
                await key.showAlert();
                return;
            }
            await key.setSettings(updated);
            streamDeck.logger.info(`Open/Switch App captured ${updated.appName}.`);
            await key.showOk();
        }
        /** Answer the property inspector's live Accessibility-permission check. */
        async onSendToPlugin(ev) {
            await respondToAccessibilityCheck(ev.payload, import.meta.url);
        }
    });
    return _classThis;
})();

/**
 * Pure geometry + ordering for the "Arrange Window" dial. The dial walks the
 * frontmost window through the cells of a grid; a touch-tap toggles between
 * the button's two configured arrangements (e.g. columns ↔ grid), and rotation
 * steps the ACTIVE arrangement forward (clockwise) or backward — so reversing
 * the dial retraces the same style. All arrangements reduce to a (cols × rows)
 * grid, and cells are visited in serpentine order (row 0 left→right, row 1
 * right→left, …) so a 2-row grid is traversed clockwise — e.g. quarters go
 * TL → TR → BR → BL, matching how you'd lay windows around the screen.
 *
 * This module is intentionally free of any macOS/AppleScript dependency: it
 * emits a normalized cell {x,y,w,h} in 0..1 of the screen's *visible* frame,
 * which the native helper maps to pixels and applies. That keeps the tricky
 * part (which cell, which direction, wrap-around) unit-testable.
 */
/** The arrangements offered in the property inspector, keyed by setting value.
 * Columns = divisions across the width; rows = divisions down the height. */
const SCHEMES = {
    halvesH: { cols: 2, rows: 1 }, // left / right
    halvesV: { cols: 1, rows: 2 }, // top / bottom
    thirdsH: { cols: 3, rows: 1 }, // three columns
    thirdsV: { cols: 1, rows: 3 }, // three rows
    quartersH: { cols: 4, rows: 1 }, // four columns
    quartersV: { cols: 1, rows: 4 }, // four rows
    grid2x2: { cols: 2, rows: 2 }, // quarters: half height × half width
    grid2x3: { cols: 3, rows: 2 }, // half height × third width
    grid2x4: { cols: 4, rows: 2 }, // half height × quarter width
};
/** Short human labels for the touchscreen readout + the property inspector. */
const SCHEME_LABELS = {
    halvesH: "Halves ↔",
    halvesV: "Halves ↕",
    thirdsH: "Thirds ↔",
    thirdsV: "Thirds ↕",
    quartersH: "Quarters ↔",
    quartersV: "Quarters ↕",
    grid2x2: "2×2 grid",
    grid2x3: "2×3 grid",
    grid2x4: "2×4 grid",
};
const DEFAULT_SCHEME = "grid2x2";
/** Default for the second arrangement — a columns style, so the out-of-the-box
 * tap toggle is meaningfully "grid ↔ columns" rather than a no-op. */
const ALT_DEFAULT_SCHEME = "halvesH";
function isSchemeKey(s) {
    return s !== undefined && Object.prototype.hasOwnProperty.call(SCHEMES, s);
}
function resolveScheme(s) {
    return isSchemeKey(s) ? s : DEFAULT_SCHEME;
}
/** The button's two configured arrangements (settings keys kept from the old
 * per-direction model, so existing buttons keep their chosen pair). */
function tileSchemes(settings) {
    return {
        a: resolveScheme(settings.cwScheme),
        b: isSchemeKey(settings.ccwScheme) ? settings.ccwScheme : ALT_DEFAULT_SCHEME,
    };
}
/** The arrangement rotation currently walks (defaults to arrangement A). */
function activeTileScheme(settings) {
    return isSchemeKey(settings.activeScheme) ? settings.activeScheme : tileSchemes(settings).a;
}
/** The arrangement a touch-tap switches to: A ↔ B. */
function toggledTileScheme(settings) {
    const { a, b } = tileSchemes(settings);
    return activeTileScheme(settings) === a ? b : a;
}
/**
 * The ordered cells of a scheme, in serpentine order. Even rows run
 * left→right, odd rows right→left, so a 2-row grid walks clockwise.
 */
function cells(scheme) {
    const { cols, rows } = scheme;
    const cw = 1 / cols;
    const ch = 1 / rows;
    const out = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            row.push({ x: c * cw, y: r * ch, w: cw, h: ch });
        }
        if (r % 2 === 1)
            row.reverse();
        out.push(...row);
    }
    return out;
}
/** The full-screen cell used by the press-to-maximize action. */
const FULL_CELL = { x: 0, y: 0, w: 1, h: 1 };
/**
 * Advance the tiling cursor one detent so the window follows the dial.
 *
 * Both directions walk the ACTIVE arrangement (tap toggles which one that is):
 * clockwise (`next`) steps FORWARD through its order (thirds: left → middle →
 * right; quarters: TL → TR → BR → BL), counter-clockwise (`prev`) steps in
 * REVERSE — so reversing the dial retraces the same style. A fresh clockwise
 * turn enters at the first cell, a fresh counter-clockwise turn at the last.
 * The caller maps physical rotation to direction (and may invert it for
 * hardware that reports rotation the other way).
 */
function nextTile(settings, direction) {
    const scheme = activeTileScheme(settings);
    const order = cells(SCHEMES[scheme]);
    const n = order.length;
    const idx = settings.index ?? -1;
    const entering = settings.activeScheme !== scheme || idx < 0;
    const newIndex = direction === "next"
        ? entering
            ? 0
            : (idx + 1) % n
        : entering
            ? n - 1
            : (idx - 1 + n) % n;
    return {
        activeScheme: scheme,
        index: newIndex,
        cell: order[newIndex],
        position: `${newIndex + 1}/${n}`,
    };
}

/**
 * Invokes the native `tile` helper (bin/macos/tile) that moves+resizes the
 * focused window to a normalized rectangle of its screen's visible frame via
 * the Accessibility API. The helper path is derived from a base URL (normally
 * `import.meta.url` of the bundled plugin) so it resolves inside the installed
 * plugin folder. `exec` is injectable for tests.
 *
 * The helper takes four fractions (0..1): x y w h, where y is measured from the
 * top of the visible frame. It prints "untrusted" to stderr when it lacks
 * Accessibility (the move is a no-op in that case).
 */
/** Resolve the helper binary path relative to the bundled plugin entry point. */
function tileHelperPath(baseUrl) {
    return fileURLToPath(new URL("macos/tile", baseUrl));
}
/** A stuck helper must never leave a dial handler pending forever. */
const HELPER_TIMEOUT_MS = 4000;
/** Round to a few decimals so the CLI args stay short and stable. */
function frac(n) {
    return (Math.round(n * 1e4) / 1e4).toString();
}
/**
 * Apply a normalized cell to the focused window via the helper.
 *
 * The (notarized, unchangeable-without-re-notarizing) helper always exits 0
 * and reports operational failures — "no-frontmost", "no-window", "no-screen",
 * bad usage — on stderr. Any non-empty stderr therefore means the window did
 * NOT move; `untrusted` additionally means Accessibility is missing. Callers
 * must not persist or render the new position unless `ok` is true.
 */
function runTile(cell, baseUrl, exec = execFile) {
    const bin = tileHelperPath(baseUrl);
    const args = [frac(cell.x), frac(cell.y), frac(cell.w), frac(cell.h)];
    return new Promise((resolve) => {
        exec(bin, args, { timeout: HELPER_TIMEOUT_MS }, (error, _stdout, stderr) => {
            const err = String(stderr ?? "").trim();
            const trusted = !/untrusted/i.test(err);
            resolve({ ok: !error && err === "", trusted });
        });
    });
}

/**
 * Dial action: rotate to walk the frontmost window through the active
 * arrangement — clockwise steps forward, counter-clockwise retraces the same
 * style in reverse. Touch-tap toggles between the button's two configured
 * arrangements (e.g. columns ↔ grid). Press maximizes the window within the
 * screen's visible frame.
 */
let ArrangeWindow = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.tile" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async onWillAppear(ev) {
            if (ev.action.isDial()) {
                await this.render(ev.action, ev.payload.settings);
            }
        }
        async onDialRotate(ev) {
            // The dial reports clockwise as positive ticks; `invertDial` flips this
            // for hardware that reports rotation the other way. Rotations are
            // SERIALIZED per dial (a read-modify-write of the cursor around an async
            // helper call would otherwise interleave and double-place cells) and the
            // full tick count is consumed so a fast spin isn't collapsed to one step.
            let { direction, steps } = rotationSteps(ev.payload.ticks);
            if (direction === "none")
                return;
            if (ev.payload.settings.invertDial) {
                direction = direction === "next" ? "prev" : "next";
            }
            const dir = direction;
            await serialize(ev.action.id, async () => {
                let settings = await ev.action.getSettings(); // fresh — not the event snapshot
                for (let i = 0; i < steps; i++) {
                    const step = nextTile(settings, dir);
                    const result = await runTile(step.cell, import.meta.url);
                    if (!result.trusted)
                        this.warnUntrusted();
                    if (!result.ok) {
                        // The helper reported no window moved — do not persist or
                        // render a position the screen doesn't show.
                        streamDeck.logger.warn("Arrange Window: helper reported no focused window/screen.");
                        return;
                    }
                    settings = { ...settings, activeScheme: step.activeScheme, index: step.index };
                    await ev.action.setSettings(settings);
                    await this.render(ev.action, settings, step.position);
                }
            });
        }
        async onDialDown(ev) {
            // Press = maximize within the visible frame, and reset the cursor so the
            // next rotation starts fresh from the first cell.
            await serialize(ev.action.id, async () => {
                const result = await runTile(FULL_CELL, import.meta.url);
                if (!result.trusted)
                    this.warnUntrusted();
                if (!result.ok)
                    return; // nothing moved — keep the real state
                const updated = { ...(await ev.action.getSettings()), index: -1 };
                await ev.action.setSettings(updated);
                await this.render(ev.action, updated, "max");
            });
        }
        /** Touch-tap: toggle between the two configured arrangements (A ↔ B).
         * Serialized with rotations — a tap during a queued spin must not have its
         * scheme/index overwritten by an in-flight rotation's write. */
        async onTouchTap(ev) {
            await serialize(ev.action.id, async () => {
                const settings = await ev.action.getSettings();
                const updated = {
                    ...settings,
                    activeScheme: toggledTileScheme(settings),
                    index: -1, // fresh entry: the next turn starts the new arrangement cleanly
                };
                await ev.action.setSettings(updated);
                await this.render(ev.action, updated);
            });
        }
        /** Answer the property inspector's live Accessibility-permission check. */
        async onSendToPlugin(ev) {
            await respondToAccessibilityCheck(ev.payload, import.meta.url);
        }
        /** Touchscreen readout (shared mode-dial layout): arrangement + position. */
        async render(dial, settings, position) {
            try {
                await dial.setFeedback({
                    mode: { value: `${SCHEME_LABELS[activeTileScheme(settings)]} ⇄`, color: "#4E9CFF" },
                    current: position ?? "—",
                });
            }
            catch (err) {
                streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
            }
        }
        warnUntrusted() {
            streamDeck.logger.error("Arrange Window blocked. Grant Accessibility: System Settings > Privacy & " +
                "Security > Accessibility > enable Stream Deck (moving windows needs this).");
        }
    });
    return _classThis;
})();

/**
 * Dial action: rotate to cycle tmux windows, push for last-window. Touch-tap
 * toggles the scope between the current session and ALL sessions: in "all"
 * scope rotation crosses session boundaries (switch-client) and push jumps to
 * the last session. Every command drives the tmux client/session in the
 * FRONTMOST macOS window; when iTerm isn't frontmost the dial does nothing
 * (never a background terminal) and the strip shows a dash. The touchscreen
 * shows a session-tinted background with position dots (plus an ALL badge in
 * all-sessions scope), refreshed after every change. The scope is transient
 * per-dial memory.
 */
let CycleTmuxWindow = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.tmuxwindial" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        scopes = new Map();
        async onWillAppear(ev) {
            if (ev.action.isDial()) {
                await this.refresh(ev.action);
            }
        }
        onWillDisappear(ev) {
            this.scopes.delete(ev.action.id);
        }
        async onDialRotate(ev) {
            const { direction, steps } = rotationSteps(ev.payload.ticks);
            if (direction !== "none") {
                // Serialized per dial, consuming the full tick count (see pane dial).
                await serialize(ev.action.id, async () => {
                    const tmux = findTmuxPath();
                    const front = await resolveFrontTmux(tmux);
                    if (front === null)
                        return; // no tmux in the frontmost window
                    for (let i = 0; i < steps; i++) {
                        if (this.scope(ev.action.id) === "all") {
                            const [list, current] = await Promise.all([
                                runTmux(LIST_WINDOWS_ARGS, tmux),
                                runTmux(currentWindowArgs(front.session), tmux),
                            ]);
                            const target = list.ok
                                ? nextWindowAcross(parseWindows(list.stdout), parseCurrentWindow(current.stdout), direction)
                                : null;
                            if (target === null)
                                return;
                            const result = await runTmux(switchToWindowArgs(target, front.tty), tmux);
                            if (!result.ok) {
                                streamDeck.logger.error(`tmux switch-client failed: ${result.stderr || "no server?"}`);
                                return;
                            }
                        }
                        else {
                            const result = await runTmux(selectWindowDirArgs(direction, front.session), tmux);
                            if (!result.ok) {
                                streamDeck.logger.error(`tmux ${direction}-window failed: ${result.stderr || "no server?"}`);
                                return;
                            }
                        }
                    }
                });
            }
            await this.refresh(ev.action);
        }
        /** Push: last window in session scope, last session in all scope. */
        async onDialDown(ev) {
            const tmux = findTmuxPath();
            const front = await resolveFrontTmux(tmux);
            if (front !== null) {
                const args = this.scope(ev.action.id) === "all" ? lastSessionArgs(front.tty) : lastWindowArgs(front.session);
                await runTmux(args, tmux);
            }
            await this.refresh(ev.action);
        }
        /** Touch-tap: toggle between current-session and all-sessions scope. */
        async onTouchTap(ev) {
            this.scopes.set(ev.action.id, toggleScope(this.scope(ev.action.id)));
            await this.refresh(ev.action);
        }
        scope(id) {
            return this.scopes.get(id) ?? "session";
        }
        /** Repaint from the front session's state; a dash when there is none. */
        async refresh(dial) {
            const tmux = findTmuxPath();
            const front = await resolveFrontTmux(tmux);
            const all = this.scope(dial.id) === "all";
            let feedback;
            if (front === null) {
                feedback = buildWindowFeedback({ session: "", name: "—"}, []);
            }
            else {
                const [current, set] = await Promise.all([
                    runTmux(currentWindowArgs(front.session), tmux),
                    runTmux(all ? LIST_WINDOWS_ARGS : windowFlagsArgs(front.session), tmux),
                ]);
                // Keep the last good strip rather than painting a half-true one
                // (e.g. dots missing) from a failed query.
                if (!current.ok || !set.ok)
                    return;
                const parsed = parseCurrentWindow(current.stdout);
                feedback = all
                    ? buildAllWindowsFeedback(parseWindows(set.stdout), parsed)
                    : buildWindowFeedback(parsed, parseActiveFlags(set.stdout));
            }
            try {
                await dial.setFeedback(feedback);
            }
            catch (err) {
                streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
            }
        }
    });
    return _classThis;
})();

/**
 * Pure logic for the tmux pane dial: rotate to switch panes — or, after a
 * press/touch-tap toggles the mode, tmux windows — from one dial. All
 * functions are tmux-CLI-agnostic strings/args so they unit test without tmux.
 */
/** Toggle between switching panes and switching windows (press or tap). */
function togglePaneDialMode(mode) {
    return mode === "panes" ? "windows" : "panes";
}
/**
 * tmux args to select the next/previous pane. Untargeted (`-t +`) tmux acts on
 * ITS notion of the current session — which may not be the one in the
 * frontmost macOS window. Pass `session` to scope the move to that session's
 * current window (`-t "sess:.+"`). Wraps around within the window.
 */
function selectPaneArgs(direction, session) {
    const sign = direction === "next" ? "+" : "-";
    return ["select-pane", "-t", session ? `${session}:.${sign}` : sign];
}
const PANE_STATUS_FORMAT = "#{pane_current_command}|#{pane_index}|#{window_panes}|#{window_name}";
/**
 * tmux args reading the pane/window status for the touchscreen:
 * `command|paneIndex|paneCount|windowName` (window name LAST — it may itself
 * contain `|`, the other fields never do). Scoped to `session` when given, for
 * the same reason as {@link selectPaneArgs}.
 */
function paneStatusArgs(session) {
    return session
        ? ["display-message", "-p", "-t", session, PANE_STATUS_FORMAT]
        : ["display-message", "-p", PANE_STATUS_FORMAT];
}
/** Parse {@link PANE_STATUS_ARGS} output; missing fields degrade to ""/0. */
function parsePaneStatus(output) {
    const fields = output.trim().split("|");
    return {
        command: fields[0] ?? "",
        paneIndex: Number.parseInt(fields[1] ?? "", 10) || 0,
        paneCount: Number.parseInt(fields[2] ?? "", 10) || 0,
        windowName: fields.slice(3).join("|"),
    };
}
/**
 * setFeedback payload for the shared `layouts/mode-dial.json` layout. `mode`
 * names what rotation moves through (the ⇄ hints the press/tap toggle) in the
 * tmux family's phosphor — the "tmux" prefix and colour distinguish this dial
 * from the look-alike macOS App Windows dial. `current` shows where you are —
 * the pane's running command with its position, or the window name.
 */
function paneDialFeedback(mode, status) {
    if (mode === "windows") {
        return {
            mode: { value: "tmux Windows ⇄", color: "#3ECF6E" },
            current: status.windowName || "—",
        };
    }
    const position = status.paneCount > 0 ? `${status.paneIndex + 1}/${status.paneCount}` : "";
    const current = [status.command, position].filter(Boolean).join(" · ");
    return { mode: { value: "tmux Panes ⇄", color: "#3ECF6E" }, current: current || "—" };
}

/**
 * Dial action: rotate to switch tmux panes — or, after a press/touch-tap
 * toggles the mode, tmux windows. Every command is scoped to the tmux session
 * shown in the FRONTMOST macOS window; when iTerm isn't frontmost the dial
 * does nothing (never a background terminal) and the strip shows a dash. The
 * mode is stored in the button's settings and survives Stream Deck restarts.
 * The touchscreen shows the mode and the current pane command (or window
 * name) of the controlled session.
 */
let TmuxPaneDial = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.tmuxpane" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async onWillAppear(ev) {
            if (ev.action.isDial()) {
                await this.refresh(ev.action, ev.payload.settings.mode ?? "panes");
            }
        }
        async onDialRotate(ev) {
            const { direction, steps } = rotationSteps(ev.payload.ticks);
            let mode = "panes";
            // Serialized per dial and consuming the full tick count: fast spins
            // arrive as one event with |ticks| > 1 and overlapping handlers would
            // otherwise reorder the moves. The mode is read FRESH inside the
            // critical section — the event snapshot could predate a queued toggle.
            await serialize(ev.action.id, async () => {
                mode = (await ev.action.getSettings()).mode ?? "panes";
                if (direction === "none")
                    return;
                const tmux = findTmuxPath();
                const front = await resolveFrontTmux(tmux);
                if (front === null)
                    return; // no tmux in the frontmost window
                const args = mode === "windows"
                    ? selectWindowDirArgs(direction, front.session)
                    : selectPaneArgs(direction, front.session);
                for (let i = 0; i < steps; i++) {
                    const result = await runTmux(args, tmux);
                    if (!result.ok) {
                        streamDeck.logger.error(`tmux ${args[0]} failed: ${result.stderr || "no server?"}`);
                        return;
                    }
                }
            });
            await this.refresh(ev.action, mode);
        }
        /** Press: toggle between switching panes and switching windows. */
        async onDialDown(ev) {
            await this.toggle(ev.action, ev.payload.settings);
        }
        /** Touch-tap: same toggle as press. */
        async onTouchTap(ev) {
            await this.toggle(ev.action, ev.payload.settings);
        }
        async toggle(dial, _settings) {
            // Serialized with rotations, reading fresh settings — an event-snapshot
            // read-modify-write could race a queued rotation's view of the mode.
            await serialize(dial.id, async () => {
                const settings = await dial.getSettings();
                const mode = togglePaneDialMode(settings.mode ?? "panes");
                await dial.setSettings({ ...settings, mode });
                await this.refresh(dial, mode);
            });
        }
        /** Repaint from the controlled session's state; a dash when there is none. */
        async refresh(dial, mode) {
            const tmux = findTmuxPath();
            const front = await resolveFrontTmux(tmux);
            let status = parsePaneStatus(""); // dash placeholders when nothing to control
            if (front !== null) {
                const result = await runTmux(paneStatusArgs(front.session), tmux);
                if (!result.ok)
                    return;
                status = parsePaneStatus(result.stdout);
            }
            try {
                await dial.setFeedback(paneDialFeedback(mode, status));
            }
            catch (err) {
                streamDeck.logger.debug(`setFeedback skipped: ${String(err)}`);
            }
        }
    });
    return _classThis;
})();

/**
 * Pure logic for the "window ring" dial/key: a user-curated list of windows you
 * tap through. A window is identified by (app, title) — macOS exposes no stable
 * window id via AppleScript, so a window whose title changes can drift out of
 * the ring (documented limitation). Focusing reuses `apps.ts` (activate + raise
 * the window whose title matches); the frontmost window is read via
 * `app-windows.ts` `FRONT_WINDOW_SCRIPT`.
 */
/** Two ring entries are the same window when app and title both match. */
function sameWindow(a, b) {
    return a.app === b.app && a.title === b.title;
}
/** Index of a window in the ring, or -1. */
function indexOfWindow(list, w) {
    return list.findIndex((x) => sameWindow(x, w));
}
/**
 * Classify what a long-press does to the ring: remove the window if present,
 * add it if new, or no-op when there's no frontmost window (empty app). Returns
 * the resulting list, the outcome, and the index removed (-1 otherwise) so the
 * caller can keep the round-robin cursor consistent.
 */
function classifyToggle(list, w) {
    if (!w.app)
        return { list, outcome: "noop", removedIndex: -1 };
    const i = indexOfWindow(list, w);
    if (i >= 0) {
        return { list: list.filter((_, idx) => idx !== i), outcome: "removed", removedIndex: i };
    }
    return { list: [...list, w], outcome: "added", removedIndex: -1 };
}
/** Keep the cursor pointing at a sensible slot after a window is removed. */
function adjustCursorAfterRemoval(cursor, removedIndex) {
    if (removedIndex < 0)
        return cursor;
    return cursor >= removedIndex ? cursor - 1 : cursor;
}
/**
 * Next cursor position (round-robin). A cursor of -1 (or non-integer) yields 0,
 * so the first tap lands on the first window. Negative values wrap correctly.
 */
function nextIndex(len, cursor) {
    if (len <= 0)
        return 0;
    const c = Number.isInteger(cursor) ? cursor : -1;
    return (((c + 1) % len) + len) % len;
}
/**
 * Build the 72×72 key image on the shared design system (ink ground, azure
 * family, jack-line): the ring itself carries the state — a solid azure
 * circle when the frontmost window is in the list, a muted dotted one when
 * not (matching the action's static icon) — with the window pair and count
 * inside. Pass `badge: "removed"` to overlay a transient red "−" used as
 * removal feedback. Hex colours only: the key rasterizer paints hsl() black.
 */
function buildRingImage(count, currentInList, badge) {
    const ring = currentInList
        ? `stroke="#4E9CFF"`
        : `stroke="#5A615E" stroke-dasharray="1 6" stroke-linecap="round"`;
    const label = String(count);
    const fontSize = label.length > 1 ? 17 : 20;
    const removed = badge === "removed"
        ? `<circle cx="54" cy="18" r="12" fill="#E5484D" stroke="#0F1211" stroke-width="2"/>` +
            `<path d="M48 18h12" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>`
        : "";
    return (`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
        `<rect width="72" height="72" fill="#0F1211"/>` +
        `<rect x="8" y="62.5" width="56" height="3.5" rx="1.75" fill="#4E9CFF" opacity="0.95"/>` +
        `<circle cx="36" cy="31" r="23" fill="none" stroke-width="3" ${ring}/>` +
        `<rect x="24" y="16" width="20" height="14" rx="2" fill="#0F1211" stroke="#8B9490" stroke-width="2.5"/>` +
        `<rect x="30" y="23" width="20" height="14" rx="2" fill="#4E9CFF"/>` +
        `<text x="36" y="${round(53)}" text-anchor="middle" font-family="Menlo, Monaco, monospace" ` +
        `font-size="${fontSize}" font-weight="700" fill="#F2FFF6">${label}</text>` +
        removed +
        `</svg>`);
}

/** Press held this long (ms) registers as a long press (add/remove). */
const LONG_PRESS_MS = 500;
/** How often the key icon re-checks whether the front window is in the ring. */
const POLL_MS = 3000;
/** How long the red "removed" flash stays before reverting to the count icon. */
const REMOVE_FLASH_MS = 900;
/** Built-in macOS sound played on long-press when enabled. */
const SOUND_FILE = "/System/Library/Sounds/Tink.aiff";
/**
 * A user-curated ring of windows. Long-press adds the frontmost window (or
 * removes it); a short tap focuses the next. Handlers always read fresh
 * settings via getSettings() so rapid presses don't clobber each other.
 */
let WindowRing = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.windowring" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    (class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        pressTimers = new Map();
        revertTimers = new Map();
        visible = new Map();
        timer;
        refreshing = false;
        async onWillAppear(ev) {
            if (!ev.action.isKey())
                return;
            this.visible.set(ev.action.id, ev.action);
            if (this.timer === undefined) {
                this.timer = setInterval(() => void this.refreshAll(), POLL_MS);
            }
            await this.updateIcon(ev.action, ev.payload.settings.windows ?? []);
        }
        onWillDisappear(ev) {
            const id = ev.action.id;
            this.visible.delete(id);
            this.clearTimer(this.pressTimers, id);
            this.clearTimer(this.revertTimers, id);
            if (this.visible.size === 0 && this.timer !== undefined) {
                clearInterval(this.timer);
                this.timer = undefined;
            }
        }
        onKeyDown(ev) {
            const id = ev.action.id;
            this.clearTimer(this.revertTimers, id); // a new press cancels a pending revert
            const t = setTimeout(() => {
                this.pressTimers.delete(id);
                void this.handleLongPress(ev.action).catch((err) => streamDeck.logger.error(`Window Ring long-press failed: ${String(err)}`));
            }, LONG_PRESS_MS);
            this.pressTimers.set(id, t);
        }
        async onKeyUp(ev) {
            const t = this.pressTimers.get(ev.action.id);
            if (t === undefined)
                return; // long press already fired at the threshold
            clearTimeout(t);
            this.pressTimers.delete(ev.action.id);
            await this.handleShortPress(ev.action);
        }
        /** Long press: toggle the frontmost window in the ring + give feedback. */
        async handleLongPress(action) {
            const front = await runAppleScript(FRONT_WINDOW_SCRIPT);
            if (!front.ok) {
                this.warn(front.code, "read the front window");
                await action.showAlert();
                return;
            }
            const settings = await action.getSettings(); // fresh — avoids rapid-press races
            const before = settings.windows ?? [];
            const { list, outcome, removedIndex } = classifyToggle(before, parseFrontWindow(front.stdout));
            if (outcome === "noop") {
                streamDeck.logger.debug("Window Ring long-press with no frontmost window to add.");
                await action.showAlert();
                return;
            }
            const cursor = adjustCursorAfterRemoval(settings.cursor ?? -1, removedIndex);
            await action.setSettings({ ...settings, windows: list, cursor });
            this.playSound(settings);
            if (outcome === "added") {
                await action.showOk(); // green check = added
                await this.updateIcon(action, list);
            }
            else {
                // removed: distinct red "−" flash, then revert to the live icon
                await action.setImage(svgToDataUri(buildRingImage(list.length, false, "removed")));
                this.clearTimer(this.revertTimers, action.id);
                this.revertTimers.set(action.id, setTimeout(() => {
                    this.revertTimers.delete(action.id);
                    void this.refreshIcon(action);
                }, REMOVE_FLASH_MS));
            }
        }
        /** Short tap: focus the next window in the ring (round-robin). */
        async handleShortPress(action) {
            const settings = await action.getSettings(); // fresh
            const list = settings.windows ?? [];
            if (list.length === 0) {
                await action.showAlert();
                return;
            }
            const cursor = nextIndex(list.length, settings.cursor ?? -1);
            const target = list[cursor];
            const result = await runAppleScript(buildAppScript(resolveApp({ appName: target.app, titlePattern: target.title })));
            if (!result.ok) {
                this.warn(result.code, `focus ${target.app}`);
                await action.showAlert();
                return;
            }
            await action.setSettings({ ...settings, cursor });
            // We just focused a ring member, so the front window is in the list by
            // definition — paint directly instead of spending a second osascript
            // round-trip (FRONT_WINDOW_SCRIPT) just to rediscover that.
            await this.paintIcon(action, list, target);
        }
        /** Answer the property inspector's live Accessibility-permission check. */
        async onSendToPlugin(ev) {
            await respondToAccessibilityCheck(ev.payload, import.meta.url);
        }
        async refreshAll() {
            if (this.refreshing)
                return; // a slow Automation call must not stack polls
            this.refreshing = true;
            try {
                const front = await runAppleScript(FRONT_WINDOW_SCRIPT); // once per tick
                if (!front.ok)
                    return; // keep the last good icons — don't paint "not in ring" from a failed probe
                const current = parseFrontWindow(front.stdout);
                for (const action of this.visible.values()) {
                    if (!this.visible.has(action.id))
                        continue; // disappeared mid-refresh
                    const settings = await action.getSettings();
                    await this.paintIcon(action, settings.windows ?? [], current);
                }
            }
            finally {
                this.refreshing = false;
            }
        }
        /** Re-read settings and repaint (used by the revert timer). */
        async refreshIcon(action) {
            const settings = await action.getSettings();
            await this.updateIcon(action, settings.windows ?? []);
        }
        async updateIcon(action, list) {
            const front = await runAppleScript(FRONT_WINDOW_SCRIPT);
            // A failed probe is UNKNOWN, not "not in ring" — keep the last icon
            // rather than painting a false gray state.
            if (!front.ok)
                return;
            await this.paintIcon(action, list, parseFrontWindow(front.stdout));
        }
        async paintIcon(action, list, current) {
            try {
                const inList = current ? indexOfWindow(list, current) >= 0 : false;
                await action.setImage(svgToDataUri(buildRingImage(list.length, inList)));
            }
            catch (err) {
                streamDeck.logger.debug(`Window Ring icon update skipped: ${String(err)}`);
            }
        }
        clearTimer(map, id) {
            const t = map.get(id);
            if (t !== undefined)
                clearTimeout(t);
            map.delete(id);
        }
        playSound(settings) {
            if (settings.sound !== true)
                return;
            execFile("/usr/bin/afplay", [SOUND_FILE], { timeout: 5000 }, () => {
                /* best-effort; ignore errors */
            });
        }
        warn(code, what) {
            if (code === "permission-denied") {
                streamDeck.logger.error(`Window Ring could not ${what}. Grant Accessibility: System Settings > Privacy & ` +
                    "Security > Accessibility > enable Stream Deck.");
            }
            else {
                streamDeck.logger.error(`Window Ring failed to ${what} (${code}).`);
            }
        }
    });
    return _classThis;
})();

streamDeck.logger.setLevel(LogLevel.INFO);
streamDeck.actions.registerAction(new JumpToTab());
streamDeck.actions.registerAction(new ClaudeProject());
streamDeck.actions.registerAction(new ScrollWindow());
streamDeck.actions.registerAction(new SwitchApp());
streamDeck.actions.registerAction(new FocusTmuxWindow());
streamDeck.actions.registerAction(new TmuxPaneDial());
streamDeck.actions.registerAction(new CycleTmuxWindow());
streamDeck.actions.registerAction(new CycleAppWindows());
streamDeck.actions.registerAction(new BBEditDocDial());
streamDeck.actions.registerAction(new OpenFile());
streamDeck.actions.registerAction(new WindowRing());
streamDeck.actions.registerAction(new ArrangeWindow());
streamDeck.connect();
//# sourceMappingURL=plugin.js.map
