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
import { readdir, stat, open, realpath } from 'node:fs/promises';
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
/**
 * Run osascript with the given args, optionally piping `stdin` to it first.
 * `stdin` is the ONLY safe way to hand a script arbitrary-length user text:
 * unlike an argv element it has no OS argument-length ceiling, and unlike
 * script-source interpolation it can never become code — the script must
 * explicitly choose to read it (see `runJxaWithStdin`).
 */
function runOsascript(args, exec, stdin) {
    return new Promise((resolve) => {
        const child = exec("/usr/bin/osascript", args, { timeout: 8000, env: UTF8_ENV }, (error, stdout, stderr) => {
            const out = String(stdout ?? "");
            const err = String(stderr ?? "");
            if (error) {
                resolve({ ok: false, code: classifyError(err || String(error)), stdout: out, stderr: err });
            }
            else {
                resolve({ ok: true, code: "success", stdout: out, stderr: err });
            }
        });
        if (stdin !== undefined) {
            const proc = child;
            proc.stdin?.write(stdin, "utf8");
            proc.stdin?.end();
        }
    });
}
function runAppleScript(script, exec = execFile) {
    return runOsascript(["-e", script], exec);
}
/** Run an AppleScript with ARGUMENTS, delivered to its `on run argv` handler.
 * The only safe way to hand user text to AppleScript: arguments are data, never
 * source, so a snippet containing quotes, backslashes or `& do shell script`
 * cannot become code. NEVER interpolate user text into a script string. */
function runAppleScriptWithArgs(script, args, exec = execFile) {
    return runOsascript(["-e", script, "--", ...args], exec);
}
/**
 * Run a JXA (JavaScript for Automation) script. Same osascript binary, but the
 * ObjC bridge lets scripts hit AppKit directly (e.g. NSWorkspace) instead of
 * Apple-Eventing the System Events process — ~5x faster for process queries.
 */
function runJxa(script, exec = execFile) {
    return runOsascript(["-l", "JavaScript", "-e", script], exec);
}
/** Run a JXA script with `on run`/`function run(argv)` ARGUMENTS — the JXA
 * counterpart to {@link runAppleScriptWithArgs}: arguments are data delivered
 * via argv, never interpolated into the script source. */
function runJxaWithArgs(script, args, exec = execFile) {
    return runOsascript(["-l", "JavaScript", "-e", script, "--", ...args], exec);
}
/**
 * Run a JXA script, piping `input` to its STDIN. The script reads it itself
 * (typically via `NSFileHandle.fileHandleWithStandardInput`) — this is the
 * preferred way to hand a script large or sensitive user text: it has no
 * OS argv-length ceiling the way `runJxaWithArgs` does, and — like argv —
 * it is delivered as data the script must opt into reading, never as script
 * source.
 */
function runJxaWithStdin(script, input, exec = execFile) {
    return runOsascript(["-l", "JavaScript", "-e", script], exec, input);
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
/**
 * Adaptive poll gate: poll every tick while things are INTERESTING (a
 * terminal is frontmost, something is hot, Claude is working), every Nth
 * tick otherwise — most of the subprocess cost of polling is spent watching
 * nothing change. Pure.
 */
function shouldPollThisTick(tick, interesting, idleEvery = 4) {
    return interesting || tick % idleEvery === 0;
}

/**
 * WHAT IT'S FOR: the one place that draws the "there is a newer way to do
 * this" mark on the three per-agent project keys — Claude Project, Codex
 * Project and Cursor Project — which are superseded by the single AI Project
 * action. Those three faces are built by three separate, near-duplicate SVG
 * builders; putting the mark here means they cannot drift into three slightly
 * different badges.
 *
 * The badge is PURELY COSMETIC. It changes no state, no detection, no
 * behaviour: the three actions keep working exactly as before, and the badge
 * is only a hint to the operator that the key has a replacement. The
 * corresponding words — what to do about it — live in the property inspector
 * banner (`ui/lib/deprecated.js`); a 72×72 key has no room for a sentence.
 *
 * EXPECTED LIFETIME: this module is scaffolding for one deprecation cycle.
 * When the three superseded actions are deleted, delete this file wholesale
 * along with its three call sites — there is nothing here worth keeping.
 */
/**
 * A right-pointing chevron-arrow to overlay on a 72×72 key face, marking the
 * key as superseded. Returns an SVG fragment (not a whole document) to be
 * concatenated into a builder's `<svg>…</svg>`.
 *
 * Placement: the free top-left corner, roughly x 2..8, y 9..15 — clear of the
 * host eyebrow (text centred at x=30 y=15, whose longest label "TERMINAL"
 * starts its ink near x≈8), the state glyph (x 53..69, y 4..21), the project
 * name (centred at x=36 y=40) and the bottom bar (y 57..71). The horizontal
 * extent is deliberately kept tighter than the free box so the longest eyebrow
 * still clears it.
 *
 * Hex colour only — the Stream Deck KEY rasterizer paints `hsl()` as BLACK
 * (documented gotcha; each of the three key-face test files asserts that no
 * `hsl(` literal survives). #6A716E is the muted grey already used for a
 * dimmed project name, so the mark reads as secondary to everything else.
 */
function deprecationBadge() {
    return (`<path d="M2.6 12h4.4M4.9 9.8L7.1 12l-2.2 2.2" fill="none" stroke="#6A716E" ` +
        `stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`);
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
function truncate$5(value, max = 16) {
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
        `<text x="100" y="24" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="600" letter-spacing="1.5" fill="hsl(${hue},45%,76%)">${escapeXml(truncate$5(session.toUpperCase(), 20))}</text>` +
        `<text x="100" y="60" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="24" font-weight="700" fill="#ffffff">${escapeXml(truncate$5(window))}</text>` +
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
 *
 * Known limits (documented, not defects introduced here):
 * - Two claude sessions in the SAME cwd share a project transcript dir; the
 *   NEWEST .jsonl is read, so an idle session can briefly borrow a busy
 *   same-project session's "working". Exact pid→session-file correlation
 *   would need a per-pid lsof of open fds (cost); deferred while the common
 *   case is one session per project.
 * - While a session STREAMS its final text response under a ✳ title (no tool
 *   coming), the transcript momentarily shows a completed assistant turn, so
 *   a tmux key can read "waiting" for the few seconds of that stream. The
 *   robust fix (parse Claude Code's stop_reason/message-id internals) couples
 *   us to an undocumented, version-fragile format — rejected as
 *   disproportionate to a transient, self-correcting misread.
 */
/**
 * Parse cheap `ps -axo pid=,ppid=,tty=,comm=` output. This deliberately
 * avoids `command=` (full argv extraction costs ~0.13s CPU per call across
 * all processes); the argv check needed for shell-busy detection runs as a
 * TARGETED second pass over claude children only. NOTE: enumerate with ps,
 * not pgrep — BSD pgrep silently omits its own ancestor processes.
 */
function parsePsProcs(output) {
    const procs = [];
    for (const rawLine of output.split("\n")) {
        const line = rawLine.trim();
        if (line === "")
            continue;
        const fields = line.split(/\s+/);
        if (fields.length < 4)
            continue;
        const pid = Number.parseInt(fields[0], 10);
        const ppid = Number.parseInt(fields[1], 10);
        if (!Number.isFinite(pid) || !Number.isFinite(ppid))
            continue;
        procs.push({ pid, ppid, tty: fields[2], comm: fields.slice(3).join(" ") });
    }
    return procs;
}
/** claude CLI processes (comm basename "claude") with a controlling tty. */
function claudesFrom(procs) {
    return procs
        .filter((p) => p.comm.slice(p.comm.lastIndexOf("/") + 1) === "claude" && p.tty !== "??")
        .map((p) => ({ pid: p.pid, tty: `/dev/${p.tty}` }));
}
/**
 * Parse targeted `ps -o pid=,ppid=,command= -p <children>` output and return
 * the PARENT pids that have a live shell-snapshot child — Claude Code runs
 * every Bash tool (foreground or backgrounded) as a direct child via its
 * shell-snapshot mechanism, so this is true exactly while "N shells still
 * running". No shell-name assumptions: the argv marker is the invariant.
 */
function busyParentsFrom(confirmOutput) {
    const busy = new Set();
    for (const rawLine of confirmOutput.split("\n")) {
        const line = rawLine.trim();
        if (line === "")
            continue;
        const fields = line.split(/\s+/);
        if (fields.length < 3)
            continue;
        const ppid = Number.parseInt(fields[1], 10);
        if (Number.isFinite(ppid) && line.includes("shell-snapshots/snapshot-")) {
            busy.add(ppid);
        }
    }
    return busy;
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
function normalizeProjectPath$1(p) {
    const trimmed = p.trim();
    return trimmed.length > 1 ? trimmed.replace(/\/+$/, "") : trimmed;
}
/** The instances whose cwd is exactly the target project. */
function instancesForProject(instances, projectPath) {
    const target = normalizeProjectPath$1(projectPath);
    return instances.filter((i) => normalizeProjectPath$1(i.cwd) === target);
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
        return "working"; // braille spinner: fast-path
    if (args.shellBusy === true)
        return "working";
    // The PRECISE transcript signal (Claude owes the next turn) overrides the ✳
    // title — that is the Brewing fix. A mere fresh mtime does NOT override ✳,
    // or every key would read "working" for ~30s after each turn completes.
    if (args.transcriptWorking === true)
        return "working";
    // ✳ title with a quiet, non-owing transcript = genuinely idle at the prompt.
    if (args.titleWorking === false)
        return "waiting";
    // No readable title (non-tmux host): a fresh transcript means streaming.
    if (args.transcriptAgeMs !== null && args.transcriptAgeMs < TRANSCRIPT_FRESH_MS) {
        return "working";
    }
    return "waiting";
}
const MONO$4 = "Menlo, Monaco, monospace";
function truncate$4(value, max) {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
/** Last path segment as the display name ("" -> "?"). */
function projectBasename$3(projectPath) {
    const normalized = normalizeProjectPath$1(projectPath);
    const base = normalized.slice(normalized.lastIndexOf("/") + 1);
    return base || "?";
}
/** 12 o'clock-start orbit positions for the working dot (r=8 around the spark). */
const ORBIT$4 = [[61.0, 4.0], [65.0, 5.1], [67.9, 8.0], [69.0, 12.0], [67.9, 16.0], [65.0, 18.9], [61.0, 20.0], [57.0, 18.9], [54.1, 16.0], [53.0, 12.0], [54.1, 8.0], [57.0, 5.1]];
/**
 * Render the 72×72 live key face, sibling of the tmux key: ink ground, the
 * project name in mono (hue seeded per project, so each project wears a
 * stable colour), host as the eyebrow, the status bar lit when keystrokes
 * would land in that session, and the Claude spark (amber turning = working,
 * white still = waiting). No claude process → dashed bar, no spark. Hex
 * colours only — the key rasterizer paints hsl() black.
 */
function buildClaudeProjectKeyImage(args) {
    const name = truncate$4(projectBasename$3(args.project), 9);
    const hue = sessionHue(projectBasename$3(args.project));
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
        ? `<text x="30" y="15" text-anchor="middle" font-family="${MONO$4}" font-size="7.5" letter-spacing="1" fill="${eyebrowFill || "#8B9490"}">${escapeXml(truncate$4(args.host.toUpperCase(), 8))}</text>`
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
            const [ox, oy] = ORBIT$4[spin % 12];
            spark += `<circle cx="${ox}" cy="${oy}" r="1.7" fill="#F0A63C"/>`;
        }
    }
    // tmux identity mark's sibling: a small spark outline at the bar's left
    // end marks this as a Claude key even when idle.
    const mark = `<path d="M6.5 64.25h7M8 61.25l4 6M12 61.25l-4 6" ` +
        `stroke="${args.claude === "none" ? "#8B9490" : args.hot ? "#F2FFF6" : hslToHex(hue, 50, 70)}" stroke-width="1.4" stroke-linecap="round" fill="none"/>`;
    return (`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
        `<rect width="72" height="72" fill="#0F1211"/>` +
        // Deprecation marker — superseded by AI Project; remove with this action.
        deprecationBadge() +
        eyebrow +
        spark +
        `<text x="36" y="40" text-anchor="middle" font-family="${MONO$4}" font-size="11.5" font-weight="700" fill="${nameFill}">${escapeXml(name)}</text>` +
        bar +
        mark +
        `</svg>`);
}

/**
 * WHAT IT'S FOR: the one place that asks the machine "which Claude Code CLI
 * sessions exist right now, in which project folders, and is a shell tool
 * still running under each?" — so every Claude-facing key repaints from a
 * single bounded snapshot instead of each key shelling out for itself.
 *
 * Shape of a scan: `pgrep` narrows to candidate pids (a full `ps -axo` costs
 * ~0.12s per call), one targeted `ps` reads their ttys, a second `pgrep -P` +
 * confirming `ps` spots a live shell-snapshot child, and one batched `lsof`
 * maps every pid to its project cwd (~0.06s total, measured). The child-probe
 * chain and the lsof cwd probe depend only on that first `ps`, so they run
 * CONCURRENTLY rather than one waiting on the other. Absolute binary paths —
 * Stream Deck launches plugins with a minimal PATH. `exec` injectable for
 * tests.
 *
 * The snapshot carries a `status`. When a probe FAILS the scan reports
 * `unknown` and hands back the remembered sessions rather than an empty list:
 * an empty list from a broken `ps` or `lsof` is indistinguishable from "no
 * Claude sessions are running", and a key that confidently paints "nothing
 * here" is worse than one that admits it doesn't know. The one probe whose
 * failure is deliberately tolerated is the shell-busy child probe — see the
 * comment at that call.
 *
 * A caller that needs the machine's CURRENT state rather than a shared,
 * cached one (a key press about to act) passes `{ fresh: true }`. Fresh
 * bypasses three separate caches, all of them, or the option would lie about
 * how fresh the answer is: the 2s world-snapshot TTL, the in-flight-scan
 * join, and — easy to miss, and the reason a naive first cut of this
 * regressed freshness — the per-pid 60s cwd memo (see {@link refreshCwds}).
 */
const TIMEOUT_MS$2 = 4000;
function run$2(file, args, exec) {
    return new Promise((resolve) => {
        exec(file, args, { timeout: TIMEOUT_MS$2, env: UTF8_ENV }, (error, stdout) => {
            const e = error;
            // A process cut short by the timeout is NOT reporting an exit status,
            // even though Node may still surface a numeric `code`.
            const terminated = e !== null && (e.killed === true || typeof e.signal === "string");
            const code = terminated ? null : e?.code;
            resolve({
                ok: error === null,
                stdout: String(stdout ?? ""),
                exitCode: typeof code === "number" ? code : null,
            });
        });
    });
}
/** pgrep's documented contract: exit 1 means "nothing matched" — a definite,
 * trustworthy answer. Any other non-zero exit (or a signal/timeout, which is
 * normalised to a non-numeric code above) means the probe itself failed, and
 * must NOT be reported as "no Claude sessions are running". */
function pgrepFoundNothing$1(result) {
    return !result.ok && result.exitCode === 1 && result.stdout.trim() === "";
}
/** Discovery is pgrep-based: pgrep walks the process table at ~zero CPU
 * where a full `ps -axo` costs ~0.12s per call. Safe HERE because the plugin
 * is never an ancestor of a claude process (BSD pgrep omits its own
 * ancestors — that caveat applies to probes run from inside a session, not
 * to this plugin). All ps calls are then TARGETED (-p) at a handful of pids. */
const PGREP_CLAUDE_ARGS = ["-x", "claude"];
function claudeDetailArgs(pids) {
    return ["-o", "pid=,ppid=,tty=,comm=", "-p", pids.join(",")];
}
function childPidsArgs(pids) {
    return ["-P", pids.join(",")];
}
/** Targeted argv read for shell-busy confirmation (few pids — cheap). */
function confirmShellArgs(pids) {
    return ["-o", "pid=,ppid=,command=", "-p", pids.join(",")];
}
/** A claude's cwd is effectively fixed for its lifetime; cache the lsof
 * lookups per pid. Tolerated staleness: 60s (documented, plain TTL — no
 * cleverness about invalidation it can't actually deliver), EXCEPT a `fresh`
 * scan, which re-probes every pid regardless of memo age (see
 * {@link refreshCwds}). */
const CWD_TTL_MS = 60_000;
const cwdCache = new Map();
/** Shared snapshot for ALL pollers: both key types poll every few seconds
 * and would otherwise duplicate the scans. Deliberately LESS than the
 * pollers' own interval (2500ms, `POLL_MS` in ai-project.ts / focus-tmux.ts):
 * every action's tick must still land on a genuinely fresh scan of its own
 * rather than always inheriting one a neighbour happened to trigger a moment
 * earlier — raising this above the poll period would halve the effective
 * refresh rate. Do not "fix" this by raising it. */
const WORLD_TTL_MS$2 = 2000;
let worldCache = null;
let worldInFlight = null;
/**
 * Guards which scan is allowed to publish to the shared cache.
 *
 * EXACT GUARANTEE: a scan that STARTED earlier can never overwrite the result
 * of one that started later. It does NOT guarantee the cached snapshot is the
 * latest observation of the world — a long scan that started later still
 * wins even if a faster, earlier-started scan finishes after it.
 *
 * Ordered by START time via a monotonic counter assigned at kickoff, not by
 * a `Date.now()` timestamp: two scans can start in the same millisecond, so
 * comparing wall-clock times says nothing reliable about which one actually
 * began later.
 */
let seq$2 = 0;
let publishedSeq$2 = 0;
function lsofCwdArgs(pids) {
    return ["-a", "-p", pids.join(","), "-d", "cwd", "-Fpn"];
}
/** All running Claude Code CLI instances with their ttys, project cwds, and
 * whether a shell tool is running under each — WITHOUT the trust channel.
 * Kept for callers that only ever act on sessions they actually found; prefer
 * {@link scanClaudeSnapshot} where an empty list would be painted as an
 * answer. TTL-cached so concurrent pollers share one scan; cwds cached per
 * pid (60s). */
function scanClaudeInstances(exec = execFile) {
    return scanClaudeSnapshot(exec).then((snapshot) => snapshot.instances);
}
/** The same scan, carrying whether its probes actually answered. */
function scanClaudeSnapshot(exec = execFile, options = {}) {
    if (!options.fresh) {
        if (worldCache !== null && Date.now() - worldCache.at < WORLD_TTL_MS$2) {
            return Promise.resolve(worldCache.snapshot);
        }
        if (worldInFlight !== null) {
            return worldInFlight;
        }
    }
    const mySeq = ++seq$2;
    const p = doScan$2(exec, mySeq, options.fresh === true);
    worldInFlight = p;
    void p.finally(() => {
        if (worldInFlight === p)
            worldInFlight = null;
    });
    return p;
}
/**
 * Which claudes have a live shell-snapshot child right now?
 *
 * DELIBERATE: a failure here does NOT degrade the snapshot to "unknown". It
 * means "we don't know whether a backgrounded shell is running", not "no
 * session here" — the sessions and their project folders are established
 * elsewhere, and `shellBusy` only ever UPGRADES a session's face to "working"
 * (see `claudeState`). Degrading the whole snapshot would throw away correct
 * project identity for every key on the machine to protect one of three
 * "working" signals; the compensating signals — the braille/✳ terminal title
 * and the transcript freshness check — are read separately and still fire.
 * The cost is bounded and one-directional: a failed child probe can only
 * UNDER-report "working", never invent a session or claim a project is empty.
 */
async function shellBusyPids(claudePids, exec) {
    const kids = await run$2("/usr/bin/pgrep", childPidsArgs([...claudePids]), exec);
    if (!kids.ok)
        return new Set();
    const children = kids.stdout
        .split("\n")
        .map((l) => Number.parseInt(l.trim(), 10))
        .filter((n) => Number.isFinite(n));
    if (children.length === 0)
        return new Set();
    const confirm = await run$2("/bin/ps", confirmShellArgs(children), exec);
    return confirm.ok ? busyParentsFrom(confirm.stdout) : new Set();
}
/**
 * Refresh the cwd memo for whichever pids need it, in one batched `lsof`
 * call. Returns false only when lsof itself failed: without cwds there is no
 * project binding at all, so the caller must downgrade the whole scan to
 * "unknown" rather than reporting an empty list.
 *
 * `fresh` (see A1 in the perf review): re-probes EVERY live pid, not just the
 * ones whose memo has aged past {@link CWD_TTL_MS}. The map is refreshed IN
 * PLACE rather than cleared — other concurrent pollers read it between
 * awaits, and clearing it would show them a hole that was never really empty.
 */
async function refreshCwds(claudes, exec, now, fresh) {
    const need = fresh
        ? claudes
        : claudes.filter((c) => {
            const hit = cwdCache.get(c.pid);
            return hit === undefined || now - hit.at >= CWD_TTL_MS;
        });
    if (need.length === 0)
        return true;
    // A FRESH scan must resolve identity from THIS probe alone. Dropping the
    // requested pids' memo entries first is the whole point: lsof can succeed
    // and still omit a pid, and without this the scan would silently fall back
    // to a cwd observed up to CWD_TTL_MS (60s) ago while reporting itself
    // fresh. A press acting on a 60-second-old project binding is exactly the
    // staleness `fresh` exists to eliminate.
    if (fresh)
        for (const c of need)
            cwdCache.delete(c.pid);
    const lsof = await run$2("/usr/sbin/lsof", lsofCwdArgs(need.map((p) => p.pid)), exec);
    // Without cwds there is no project binding at all, so a broken lsof would
    // empty the list — exactly the confident lie this status channel exists
    // to prevent.
    if (!lsof.ok)
        return false;
    for (const [pid, cwd] of parseLsofCwds(lsof.stdout))
        cwdCache.set(pid, { cwd, at: now });
    return true;
}
async function doScan$2(exec, mySeq, fresh) {
    const now = Date.now();
    const pgrep = await run$2("/usr/bin/pgrep", PGREP_CLAUDE_ARGS, exec);
    if (pgrepFoundNothing$1(pgrep))
        return remember$2(now, mySeq, { status: "ok", instances: [] });
    if (!pgrep.ok)
        return rememberUnknown$2(now, mySeq);
    const pids = pgrep.stdout
        .split("\n")
        .map((l) => Number.parseInt(l.trim(), 10))
        .filter((n) => Number.isFinite(n));
    if (pids.length === 0)
        return remember$2(now, mySeq, { status: "ok", instances: [] });
    const ps = await run$2("/bin/ps", claudeDetailArgs(pids), exec);
    if (!ps.ok)
        return rememberUnknown$2(now, mySeq);
    const claudes = claudesFrom(parsePsProcs(ps.stdout));
    if (claudes.length === 0)
        return remember$2(now, mySeq, { status: "ok", instances: [] });
    const claudePids = new Set(claudes.map((c) => c.pid));
    // The shell-busy child chain and the cwd lookup both depend only on the ps
    // above, so they run CONCURRENTLY instead of one waiting on the other.
    const [busyPids, cwdsOk] = await Promise.all([
        shellBusyPids(claudePids, exec),
        refreshCwds(claudes, exec, now, fresh),
    ]);
    if (!cwdsOk)
        return rememberUnknown$2(now, mySeq);
    for (const pid of [...cwdCache.keys()]) {
        if (!claudePids.has(pid))
            cwdCache.delete(pid); // dead pids out
    }
    const instances = claudes
        .map((p) => ({
        pid: p.pid,
        tty: p.tty,
        cwd: cwdCache.get(p.pid)?.cwd ?? "",
        shellBusy: busyPids.has(p.pid),
    }))
        .filter((i) => i.cwd !== "");
    // A live claude whose cwd lsof did not report cannot be bound to a project,
    // so the list is not the whole truth even though every command succeeded.
    const incomplete = instances.length !== claudes.length;
    return remember$2(now, mySeq, { status: incomplete ? "unknown" : "ok", instances });
}
function remember$2(at, mySeq, snapshot) {
    if (mySeq >= publishedSeq$2) {
        worldCache = { at, snapshot };
        publishedSeq$2 = mySeq;
    }
    return snapshot;
}
/** Downgrade rather than invent: keep the last scan's sessions (they are the
 * best available guess at what is running) and let `status` say they are not
 * fresh. `shellBusy` is carried over as last known — there is no "unknown"
 * value for a boolean, and substituting `false` would fabricate the negative
 * this whole channel exists to avoid. */
function rememberUnknown$2(at, mySeq) {
    const stale = worldCache?.snapshot.instances.map((instance) => ({ ...instance })) ?? [];
    return remember$2(at, mySeq, { status: "unknown", instances: stale });
}
/** Is a process with exactly this name running? (pgrep -x; used to avoid
 * AppleScript-launching a terminal app that isn't open.) */
function processRunning(name, exec = execFile) {
    return new Promise((resolve) => {
        exec("/usr/bin/pgrep", ["-x", name], { timeout: TIMEOUT_MS$2, env: UTF8_ENV }, (error) => {
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
/** tmux args listing every pane as `paneTty|session|windowIndex|command|title`
 * (title LAST — it may contain `|`). Pane ttys identify tmux-hosted processes:
 * they are invisible to iTerm/Terminal tab lists, so a raise-by-tty must
 * detect them here and route through the tmux machinery instead. */
const LIST_PANE_TTYS_ARGS = [
    "list-panes",
    "-a",
    "-F",
    "#{pane_tty}|#{session_name}|#{window_index}|#{window_name}|#{pane_active}|#{window_active}|#{pane_current_command}|#{pane_title}",
];
/** Parse {@link LIST_PANE_TTYS_ARGS} output; malformed lines are skipped. */
function parsePaneTtys(output) {
    const panes = [];
    for (const rawLine of output.split("\n")) {
        const line = rawLine.trim();
        if (line === "")
            continue;
        const fields = line.split("|");
        if (fields.length < 8)
            continue;
        const windowIndex = Number.parseInt(fields[2], 10);
        if (!Number.isFinite(windowIndex))
            continue; // malformed line — never raise window 0 from garbage
        panes.push({
            tty: fields[0],
            session: fields[1],
            windowIndex,
            windowName: fields[3],
            receivesKeys: fields[4] === "1" && fields[5] === "1",
            command: fields[6],
            title: fields.slice(7).join("|"),
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
    return startsWithSpinner(trimmed);
}
/** True when the title matches Claude Code's WORKING format: a braille
 * spinner frame (U+2800–U+28FF) followed by a space and the task summary.
 * Trimmed first (identity and state must read the same bytes), and the
 * marker+space shape rejects unrelated TUI titles that merely start with a
 * braille character. */
function startsWithSpinner(title) {
    const t = title.trim();
    const cp = t.codePointAt(0);
    if (cp === undefined || cp < 0x2800 || cp > 0x28ff)
        return false;
    return t.length === 1 || t[1] === " ";
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
        // command === "claude" is the authoritative identity. The ONE sanctioned
        // fallback: a WORKING-format title (braille frame + space) on a pane
        // whose foreground command is a tool — Claude's OSC title persists while
        // a foreground shell tool momentarily owns the tty. The fallback is
        // deliberately braille-only: a stale ✳ on a dead/reused pane must never
        // be adopted as a waiting Claude forever.
        if (p.command !== "claude") {
            if (startsWithSpinner(p.title))
                return "working";
            continue;
        }
        if (startsWithSpinner(p.title))
            return "working";
        state = "waiting";
    }
    return state;
}
/** Does this window contain a pane whose tty hosts a shell-busy claude?
 * Feeds the tmux keys the "turn ended but a background shell still runs"
 * case, where the pane title reads ✳ (waiting). */
function windowShellBusy(panes, session, windowName, busyTtys) {
    return panes.some((p) => p.session === session && p.windowName === windowName && busyTtys.has(p.tty));
}
/** A pane title that could belong to Claude (braille spinner OR the ✳ idle
 * marker) — used only to LOCATE a claude pane for the cwd lookup, never to
 * decide working/waiting. */
function startsWithSpinnerOrStar(title) {
    const t = title.trim();
    const cp = t.codePointAt(0);
    if (cp === undefined)
        return false;
    return cp === 0x2733 || (cp >= 0x2800 && cp <= 0x28ff);
}
/** The project cwds of EVERY claude pane in a window (panes whose command is
 * claude OR whose title carries Claude's marker), via a tty→cwd map — so the
 * tmux keys can read those projects' transcripts for the Brewing signal. A
 * split window can host more than one claude; any working one should light
 * the key, so all are returned (deduped). Empty when none matched. */
function windowClaudeCwds(panes, session, windowName, ttyToCwd) {
    const cwds = new Set();
    for (const p of panes) {
        if (p.session !== session || p.windowName !== windowName)
            continue;
        if (p.command !== "claude" && !startsWithSpinnerOrStar(p.title))
            continue;
        const cwd = ttyToCwd.get(p.tty);
        if (cwd)
            cwds.add(cwd);
    }
    return [...cwds];
}

/**
 * Freshness of a project's newest Claude Code transcript. Sessions append to
 * ~/.claude/projects/<slug>/<session>.jsonl while working; the newest file's
 * mtime goes stale within seconds of the session going idle (verified live).
 * Fully async and batch-bounded — this runs inside the shared poll of a
 * plugin process that serves every key and dial.
 */
const BATCH = 64;
/**
 * Does the transcript tail show Claude OWING the next assistant turn — i.e.
 * actively working, even when the terminal title reads ✳ and the file is
 * frozen? The agent loop: a `user` message (a fresh prompt or a tool_result)
 * is answered by an `assistant` turn; if that turn ends WITHOUT a tool call
 * the conversation stops (idle); if it emits a tool_use, the tool runs and
 * appends a tool_result (another `user` message), looping back. So Claude is
 * working exactly when either:
 *   (a) the last conversational (user/assistant) entry is a `user` message —
 *       Claude has input it hasn't responded to yet (a prompt, or a just-
 *       completed tool's result). THIS is the "Brewing" state that ✳-title +
 *       frozen-transcript detection missed: after a tool result, Claude awaits
 *       the model API and writes nothing until the first token; or
 *   (b) an emitted tool_use has no matching tool_result (a tool is running).
 * It is IDLE only when the last conversational entry is an assistant turn
 * whose every tool_use is answered — Claude produced its final response and
 * stopped. Meta entries (bridge-session, attachment, system, …) interleave
 * and are ignored. Returns false on an unreadable/empty tail (let freshness
 * or the title decide). Pure; exported for tests.
 *
 * Crash-safety note: a dead session can also end on a dangling tool_result,
 * but the caller gates every "working" verdict on the claude PROCESS being
 * alive, so a crashed session reads "none", never a stuck "working".
 */
function transcriptOwesResponse(lines) {
    const convs = [];
    for (const line of lines) {
        if (!line.includes('"type":"user"') && !line.includes('"type":"assistant"'))
            continue;
        try {
            const entry = JSON.parse(line);
            if (entry.type !== "user" && entry.type !== "assistant")
                continue;
            const uses = [];
            const content = entry.message?.content;
            if (Array.isArray(content)) {
                for (const block of content) {
                    if (block?.type === "tool_use" && typeof block.id === "string")
                        uses.push(block.id);
                }
            }
            convs.push({ role: entry.type, uses });
        }
        catch {
            // partial line at the window edge — skip
        }
    }
    if (convs.length === 0)
        return false;
    // (a) the conversation ends on a user message — Claude owes the next turn
    // (a fresh prompt, or a just-completed tool's result = the Brewing state).
    if (convs[convs.length - 1].role === "user")
        return true;
    // (b) a tool is still running: an unanswered tool_use in the trailing
    // assistant turn(s) after the last user message. (Answered tools produce a
    // later user tool_result, which would have made the last role `user`.)
    const lastUserIdx = convs.map((c) => c.role).lastIndexOf("user");
    return convs.slice(lastUserIdx + 1).some((c) => c.uses.length > 0);
}
/** Read the newest transcript's tail window as COMPLETE lines. Tool_use /
 * tool_result turns can be large (a big file Read, verbose command output),
 * so the window is generous; when the head is truncated (offset > 0) the
 * first split fragment is a partial record and is dropped rather than fed to
 * the parser as if whole. A single record exceeding the window is possible
 * but extraordinarily rare (Claude Code caps tool output); the residual is a
 * transient waiting misread, documented. */
const TAIL_WINDOW = 1024 * 1024;
async function newestTranscriptTailLines(path) {
    try {
        const fh = await open(path, "r");
        try {
            const size = (await fh.stat()).size;
            const window = Math.min(size, TAIL_WINDOW);
            const offset = size - window;
            const buf = Buffer.alloc(window);
            await fh.read(buf, 0, window, offset);
            const lines = buf.toString("utf8").split("\n");
            if (offset > 0 && lines.length > 0)
                lines.shift(); // partial head record
            return lines.filter((l) => l.trim() !== "");
        }
        finally {
            await fh.close();
        }
    }
    catch {
        return [];
    }
}
/** Memo of the owes-response verdict keyed by transcript path, valid while its
 * mtime is unchanged — an unchanged transcript can't change verdict, so the
 * 1MB read+parse is skipped across ticks (both key pollers hit this). */
const owesMemo = new Map();
/** Age AND pending-tool state of the project's newest transcript. */
async function newestTranscriptState(projectPath, now = Date.now(), base = join(homedir(), ".claude", "projects")) {
    const dir = join(base, projectSlug(projectPath));
    try {
        const names = (await readdir(dir)).filter((n) => n.endsWith(".jsonl"));
        let newest = null;
        for (let i = 0; i < names.length; i += BATCH) {
            const batch = await Promise.all(names.slice(i, i + BATCH).map(async (n) => {
                try {
                    const p = join(dir, n);
                    return { mtimeMs: (await stat(p)).mtimeMs, path: p };
                }
                catch {
                    return null;
                }
            }));
            for (const e of batch) {
                if (e !== null && (newest === null || e.mtimeMs > newest.mtimeMs))
                    newest = e;
            }
        }
        if (newest === null)
            return { ageMs: null, working: false };
        const memo = owesMemo.get(newest.path);
        let working;
        if (memo !== undefined && memo.mtimeMs === newest.mtimeMs) {
            working = memo.working;
        }
        else {
            working = transcriptOwesResponse(await newestTranscriptTailLines(newest.path));
            owesMemo.set(newest.path, { mtimeMs: newest.mtimeMs, working });
        }
        return { ageMs: Math.max(0, now - newest.mtimeMs), working };
    }
    catch {
        return { ageMs: null, working: false };
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
/** Parse the structured final line emitted by {@link buildITermRaiseScript}. */
function parseITermFocusResult(output) {
    const line = output.trim().split("\n").at(-1) ?? "";
    const [status, windowId = "", tty = ""] = line.split("|");
    if (status === "ok" || status === "notfound" || status === "timeout" || status === "error") {
        return { status, windowId, tty };
    }
    return { status: "error", windowId, tty };
}
/**
 * Build AppleScript that activates iTerm and selects the window+tab+session
 * whose `tty` equals the given tty. Selection is verified by stable window id
 * plus focused tty, with a bounded retry for cross-window/Space activation.
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
    return `set targetTty to "${escapedTty}"
set targetWindowId to ""

tell application "iTerm"
	-- Capture a stable window identity before activation changes window order.
	repeat with w in windows
		repeat with t in tabs of w
			repeat with s in sessions of t
				if (tty of s) is targetTty then
					set targetWindowId to id of w
					exit repeat
				end if
			end repeat
			if targetWindowId is not "" then exit repeat
		end repeat
		if targetWindowId is not "" then exit repeat
	end repeat

	if targetWindowId is "" then return "notfound||"

	activate
	set observedWindowId to ""
	set observedTty to ""
	set cleanAttempts to 0
	set lastErrorNumber to ""

	-- Window activation is asynchronous across iTerm windows and Spaces.
	-- Re-resolve by stable id on every attempt, wait for that window to become
	-- current, then make tab/session selection the final write.
	repeat with attempt from 1 to 30
		try
			set targetWindow to first window whose id is targetWindowId
			try
				if miniaturized of targetWindow then set miniaturized of targetWindow to false
			end try
			select targetWindow
			delay 0.05
			set observedWindowId to id of current window
			if observedWindowId is targetWindowId then
				set selectedTarget to false
				set targetWindow to first window whose id is targetWindowId
				repeat with t in tabs of targetWindow
					repeat with s in sessions of t
						if (tty of s) is targetTty then
							tell t to select
							tell s to select
							set selectedTarget to true
							exit repeat
						end if
					end repeat
					if selectedTarget then exit repeat
				end repeat
				delay 0.05
				set observedWindowId to id of current window
				set observedTty to tty of current session of current tab of current window
				if observedWindowId is targetWindowId and observedTty is targetTty and frontmost then
					return "ok|" & observedWindowId & "|" & observedTty
				end if
			end if
			set cleanAttempts to cleanAttempts + 1
		on error errMsg number errNum
			set lastErrorNumber to errNum as text
			-- A window/session can disappear during the transition. The next
			-- bounded attempt re-resolves it; final readback remains diagnostic.
		end try
	end repeat
end tell
if cleanAttempts is 0 and lastErrorNumber is not "" then return "error|" & lastErrorNumber & "|"
return "timeout|" & observedWindowId & "|" & observedTty`;
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
/** Preserve every attached client tty per session instead of silently picking one. */
function parseClientTtys(output) {
    const clients = new Map();
    for (const rawLine of output.split("\n")) {
        const fields = rawLine.trim().split("|");
        if (fields.length < 2 || fields[0] === "" || fields[1] === "")
            continue;
        const [tty, session] = fields;
        const ttys = clients.get(session) ?? [];
        if (!ttys.includes(tty))
            ttys.push(tty);
        clients.set(session, ttys);
    }
    return clients;
}
/** Prefer the already-focused client, otherwise preserve tmux's deterministic order. */
function chooseClientTty(ttys, focusedTty) {
    if (focusedTty !== "" && ttys.includes(focusedTty))
        return focusedTty;
    return ttys[0] ?? null;
}
/** Target one attached client and its exact tmux window. */
function switchClientToWindowArgs(session, index, clientTty) {
    return ["switch-client", "-c", clientTty, "-t", `${session}:${index}`];
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
/** Human-readable dropdown label, e.g. `"dev: movingavg"`. */
function tmuxWindowLabel(w) {
    return `${w.session}: ${w.name}`;
}
/** Stable dropdown/target value, e.g. `"dev:movingavg"`. */
function tmuxWindowValue(w) {
    return `${w.session}:${w.name}`;
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
const exclusive = new Set();
/**
 * Run at most one task for a key. A second request while the first is live is
 * dropped instead of queued: focus presses describe "go there now", so a
 * stale press must not fire seconds later after a slow cross-Space raise.
 */
async function runExclusive(key, task) {
    if (exclusive.has(key))
        return undefined;
    exclusive.add(key);
    try {
        return await task();
    }
    finally {
        exclusive.delete(key);
    }
}
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
const POLL_MS$6 = 2500;
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
        tick = 0;
        /** Last tick saw a frontmost terminal / hot key / working Claude. */
        interesting = true;
        lastImage = new Map();
        async onWillAppear(ev) {
            if (!ev.action.isKey())
                return;
            this.visible.set(ev.action.id, ev.action);
            if (this.timer === undefined) {
                this.timer = setInterval(() => {
                    if (shouldPollThisTick(this.tick++, this.interesting))
                        void this.refreshAll();
                }, POLL_MS$6);
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
            await runExclusive("iterm-focus", () => this.focus(ev.action));
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
                clientTtys: parseClientTtys(clientsRes.stdout),
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
                this.interesting = snap.focusedTty !== "" || snap.instances.some((i) => i.shellBusy);
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
                            (snap.clientTtys.get(pane.pane.session) ?? []).includes(snap.focusedTty);
                }
                else {
                    hot = snap.focusedTty !== "" && instance.tty === snap.focusedTty;
                    if (hot) {
                        host = snap.frontBundle === TERMINAL_BUNDLE_ID ? "terminal" : "iterm";
                    }
                }
            }
            const transcript = instance !== undefined
                ? await newestTranscriptState(project)
                : { ageMs: null, working: false };
            const claude = projectClaudeState({
                present: instance !== undefined,
                titleWorking: title,
                transcriptAgeMs: transcript.ageMs,
                transcriptWorking: transcript.working,
                shellBusy: instance?.shellBusy === true,
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
                // tmux-hosted: raise and verify the hosting iTerm window+tab first,
                // then switch that exact client to the requested tmux window.
                const clientTtys = snap.clientTtys.get(pane.session) ?? [];
                const clientTty = chooseClientTty(clientTtys, snap.focusedTty);
                if (clientTty === null) {
                    streamDeck.logger.warn(`Claude Project: tmux session ${pane.session} has no attached client.`);
                    await key.showAlert();
                    return;
                }
                if (clientTtys.length > 1)
                    streamDeck.logger.debug(`Claude Project: chose ${clientTty} from ${clientTtys.length} clients for ${pane.session}.`);
                const raise = await runAppleScript(buildITermRaiseScript(clientTty));
                const focus = raise.ok ? parseITermFocusResult(raise.stdout) : { status: "error", windowId: "", tty: "" };
                if (!raise.ok || focus.status !== "ok") {
                    streamDeck.logger.error(`Claude Project iTerm focus failed (${raise.code}/${focus.status}): window=${focus.windowId || "?"} tty=${focus.tty || "?"} ${raise.stderr}`);
                    await key.showAlert();
                    return;
                }
                const tmux = findTmuxPath();
                const selected = await runTmux(switchClientToWindowArgs(pane.session, pane.windowIndex, clientTty), tmux);
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
                if (raise.ok && parseITermFocusResult(raise.stdout).status === "ok") {
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
                for (const [session, clientTtys] of snap.clientTtys) {
                    if (!clientTtys.includes(snap.focusedTty))
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

/** Pure identity, rollout-state, tmux-target, and key-face logic for Codex Project. */
/** Parse targeted `ps -o pid=,tty=,comm=,args=` output. */
function parseCodexProcesses(output) {
    const result = [];
    for (const raw of output.split("\n")) {
        const m = raw.trim().match(/^(\d+)\s+(\S+)\s+(\S+)\s+(.+)$/);
        if (m === null)
            continue;
        const pid = Number.parseInt(m[1], 10);
        if (!Number.isFinite(pid))
            continue;
        result.push({ pid, tty: m[2], comm: m[3], args: m[4] });
    }
    return result;
}
function basename(path) {
    return path.slice(path.lastIndexOf("/") + 1);
}
/** Cheap candidate gate. The rollout's `originator` is the authoritative
 * interactive-vs-exec discriminator: rendered ps argv cannot distinguish the
 * subcommand `review` from an initial prompt beginning with the word review. */
function isInteractiveCodex(p) {
    if (p.tty === "??" || basename(p.comm) !== "codex")
        return false;
    const words = p.args.trim().split(/\s+/);
    return words.length > 0 && basename(words[0]) === "codex";
}
/** Parse lsof field output (`-Fpcfn`) without ever retaining file contents. */
function parseLsofEntries(output) {
    const entries = [];
    let pid = null;
    let fd = "";
    for (const line of output.split("\n")) {
        if (line.startsWith("p")) {
            const n = Number.parseInt(line.slice(1), 10);
            pid = Number.isFinite(n) ? n : null;
            fd = "";
        }
        else if (line.startsWith("f")) {
            fd = line.slice(1);
        }
        else if (line.startsWith("n") && pid !== null) {
            entries.push({ pid, fd, name: line.slice(1) });
        }
    }
    return entries;
}
function isRolloutPath(path) {
    return /\/sessions\/\d{4}\/\d{2}\/\d{2}\/rollout-[^/]+\.jsonl$/.test(path);
}
/** Session UUID is the final UUID-like component before `.jsonl`. */
function rolloutSessionId(path) {
    return path.match(/([0-9a-f]{8}-[0-9a-f-]{27})\.jsonl$/i)?.[1] ?? "";
}
const BLOCKED_EVENTS = new Set([
    "approval_request", "approval_requested", "request_user_input", "user_input_requested",
    "elicitation_request",
]);
const UNKNOWN_TERMINALS = new Set([
    "task_error", "task_failed", "task_aborted", "task_interrupted", "stream_error",
]);
/** Last relevant complete rollout record decides state. Unknown is deliberate. */
function codexStateFromRolloutLines(lines) {
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (!line.includes('"type"'))
            continue;
        try {
            const row = JSON.parse(line);
            if (row.type !== "event_msg")
                continue;
            const event = row.payload?.type ?? "";
            if (event === "task_complete")
                return "waiting";
            if (BLOCKED_EVENTS.has(event))
                return "blocked";
            if (UNKNOWN_TERMINALS.has(event))
                return "unknown";
            if (event === "task_started")
                return "working";
        }
        catch {
            // A concurrent append or bounded partial record is not state evidence.
        }
    }
    return "unknown";
}
/** Session metadata is at the head of every observed rollout. */
function codexRolloutOriginator(lines) {
    for (const line of lines) {
        try {
            const row = JSON.parse(line);
            if (row.type === "session_meta")
                return row.payload?.originator ?? "";
        }
        catch { /* partial record */ }
    }
    return "";
}
function normalizeProjectPath(path) {
    const trimmed = path.trim();
    return trimmed.length > 1 ? trimmed.replace(/\/+$/, "") : trimmed;
}
function codexInstancesForProject(instances, project) {
    const target = normalizeProjectPath(project);
    return instances.filter((i) => normalizeProjectPath(i.cwd) === target);
}
/** Prefer the captured identity. Never guess when several sessions share a cwd. */
function selectCodexInstance(instances, project, sessionId) {
    const mine = codexInstancesForProject(instances, project);
    const captured = mine.find((i) => sessionId !== "" && i.sessionId === sessionId);
    if (captured !== undefined)
        return captured;
    return mine.length === 1 ? mine[0] : null;
}
const LIST_CODEX_PANES_ARGS = [
    "list-panes", "-a", "-F",
    "#{pane_tty}|#{session_name}|#{window_id}|#{pane_id}|#{pane_active}|#{window_active}",
];
function parseCodexPanes(output) {
    const result = [];
    for (const raw of output.split("\n")) {
        const f = raw.trim().split("|");
        if (f.length < 6)
            continue;
        const tail = f.length - 4;
        const windowId = f[tail];
        const paneId = f[tail + 1];
        if (!windowId.startsWith("@") || !paneId.startsWith("%"))
            continue;
        result.push({
            tty: f[0],
            session: f.slice(1, tail).join("|"),
            windowId,
            paneId,
            receivesKeys: f[tail + 2] === "1" && f[tail + 3] === "1",
        });
    }
    return result;
}
function codexTmuxFocusArgs(pane, clientTty) {
    const commands = [];
    if (clientTty !== "")
        commands.push(["switch-client", "-c", clientTty, "-t", pane.session]);
    commands.push(["select-window", "-t", pane.windowId]);
    commands.push(["select-pane", "-t", pane.paneId]);
    return commands;
}
function projectBasename$2(path) {
    const p = normalizeProjectPath(path);
    return p.slice(p.lastIndexOf("/") + 1) || "?";
}
function truncate$3(value, max) {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
const MONO$3 = "Menlo, Monaco, monospace";
const ORBIT$3 = [[61, 4], [65, 5.1], [67.9, 8], [69, 12], [67.9, 16], [65, 18.9], [61, 20], [57, 18.9], [54.1, 16], [53, 12], [54.1, 8], [57, 5.1]];
/** Codex sibling of the Claude live face. Hex colors only for key rasterizing. */
function buildCodexProjectKeyImage(args) {
    const name = truncate$3(projectBasename$2(args.project), 9);
    const hue = sessionHue(projectBasename$2(args.project));
    const active = args.state !== "none";
    const color = args.state === "working" ? "#4E9CFF" : args.state === "blocked" ? "#F0A63C" : args.state === "waiting" ? "#F2FFF6" : "#8B9490";
    const nameFill = active ? args.hot ? "#FFFFFF" : "#A6ADA9" : "#6A716E";
    const bar = !active
        ? '<rect x="1" y="58" width="70" height="13" fill="none" stroke="#4A504D" stroke-width="1.5" stroke-dasharray="3 3"/>'
        : args.hot
            ? `<rect x="0" y="57" width="72" height="15" fill="${hslToHex(hue, 62, 42)}"/><rect x="60" y="60.5" width="5" height="8" fill="#F2FFF6"/>`
            : `<rect x="1" y="58" width="70" height="13" fill="none" stroke="${hslToHex(hue, 35, 52)}" stroke-width="1.5"/>`;
    const eyebrow = args.host ? `<text x="30" y="15" text-anchor="middle" font-family="${MONO$3}" font-size="7.5" letter-spacing="1" fill="${hslToHex(hue, 50, 70)}">${escapeXml(args.host.toUpperCase())}</text>` : "";
    let glyph = "";
    if (active) {
        const spin = args.spin ?? 0;
        glyph = `<path d="M56 7h10v10H56zM59 10h4v4h-4z" fill="none" stroke="${color}" stroke-width="1.8"/>`;
        if (args.state === "working") {
            const [x, y] = ORBIT$3[spin % ORBIT$3.length];
            glyph += `<circle cx="${x}" cy="${y}" r="1.7" fill="#4E9CFF"/>`;
        }
    }
    const mark = `<path d="M7 61h7v7H7zM9 63h3v3H9z" fill="none" stroke="${active ? args.hot ? "#F2FFF6" : hslToHex(hue, 50, 70) : "#8B9490"}" stroke-width="1.2"/>`;
    // Deprecation marker — superseded by AI Project; remove with this action.
    return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><rect width="72" height="72" fill="#0F1211"/>${deprecationBadge()}${eyebrow}${glyph}<text x="36" y="40" text-anchor="middle" font-family="${MONO$3}" font-size="11.5" font-weight="700" fill="${nameFill}">${escapeXml(name)}</text>${bar}${mark}</svg>`;
}

/**
 * Bounded, cached scan of interactive Codex CLI sessions.
 *
 * A caller on the press path that needs the machine's state right now, not a
 * poll-old shared one, passes `{ fresh: true }` — see {@link CodexScanOptions}.
 * Publication to the shared cache is guarded by a monotonic start-sequence
 * counter, not a wall-clock timestamp: see the exact guarantee documented at
 * `seq`/`publishedSeq` in claude-scan.ts, which applies here unchanged.
 */
const TIMEOUT_MS$1 = 4000;
/** Shared across every poller; deliberately LESS than the pollers' own
 * interval (2500ms) so each action's tick still lands on a genuinely fresh
 * scan rather than always inheriting one a neighbour happened to trigger a
 * moment earlier. Raising this above the poll period would halve the
 * effective refresh rate — do not "fix" it. */
const WORLD_TTL_MS$1 = 2000;
const TAIL_BYTES$1 = 1024 * 1024;
const HEAD_BYTES = 64 * 1024;
let cache$1 = null;
let inFlight$2 = null;
/** Monotonic start-sequence guard against a scan that started EARLIER
 * publishing over one that started LATER — see the exact guarantee at the
 * matching pair in claude-scan.ts. Not a wall-clock timestamp: two scans can
 * start in the same millisecond. */
let seq$1 = 0;
let publishedSeq$1 = 0;
function run$1(file, args, exec) {
    return new Promise((resolve) => {
        exec(file, args, { timeout: TIMEOUT_MS$1, env: UTF8_ENV }, (error, stdout) => resolve({ ok: error === null, stdout: String(stdout ?? "") }));
    });
}
function codexPsArgs(pids) {
    return ["-o", "pid=,tty=,comm=,args=", "-p", pids.join(",")];
}
function codexLsofArgs(pids) {
    return ["-nP", "-a", "-p", pids.join(","), "-Fpcfn"];
}
async function rolloutLines(path) {
    try {
        const fh = await open(path, "r");
        try {
            const size = (await fh.stat()).size;
            const headLength = Math.min(size, HEAD_BYTES);
            const head = Buffer.alloc(headLength);
            await fh.read(head, 0, headLength, 0);
            const tailLength = Math.min(size, TAIL_BYTES$1);
            const offset = size - tailLength;
            const tail = Buffer.alloc(tailLength);
            await fh.read(tail, 0, tailLength, offset);
            const headLines = head.toString("utf8").split("\n");
            headLines.pop(); // possibly partial final head record
            const tailLines = tail.toString("utf8").split("\n");
            if (offset > 0)
                tailLines.shift();
            return [...headLines, ...tailLines].filter((line) => line.trim() !== "");
        }
        finally {
            await fh.close();
        }
    }
    catch {
        return [];
    }
}
function scanCodexSnapshot(exec = execFile, options = {}) {
    if (!options.fresh) {
        if (cache$1 !== null && Date.now() - cache$1.at < WORLD_TTL_MS$1)
            return Promise.resolve(cache$1.snapshot);
        if (inFlight$2 !== null)
            return inFlight$2;
    }
    const mySeq = ++seq$1;
    const p = doScan$1(exec, mySeq);
    inFlight$2 = p;
    void p.finally(() => { if (inFlight$2 === p)
        inFlight$2 = null; });
    return p;
}
async function doScan$1(exec, mySeq) {
    const now = Date.now();
    const pgrep = await run$1("/usr/bin/pgrep", ["-x", "codex"], exec);
    if (!pgrep.ok)
        return rememberUnknown$1(now, mySeq);
    const pids = pgrep.stdout.split("\n").map((s) => Number.parseInt(s.trim(), 10)).filter(Number.isFinite);
    if (pids.length === 0)
        return remember$1(now, mySeq, { status: "ok", instances: [] });
    const ps = await run$1("/bin/ps", codexPsArgs(pids), exec);
    if (!ps.ok)
        return rememberUnknown$1(now, mySeq);
    const processes = parseCodexProcesses(ps.stdout).filter(isInteractiveCodex);
    if (processes.length === 0)
        return remember$1(now, mySeq, { status: "ok", instances: [] });
    const lsof = await run$1("/usr/sbin/lsof", codexLsofArgs(processes.map((p) => p.pid)), exec);
    if (!lsof.ok)
        return rememberUnknown$1(now, mySeq);
    const entries = parseLsofEntries(lsof.stdout);
    let incomplete = false;
    const instances = await Promise.all(processes.map(async (process) => {
        const mine = entries.filter((e) => e.pid === process.pid);
        const cwdRaw = mine.find((e) => e.fd === "cwd")?.name ?? "";
        const rolloutPath = mine.find((e) => isRolloutPath(e.name))?.name ?? "";
        if (cwdRaw === "" || rolloutPath === "") {
            incomplete = true;
            return null;
        }
        let cwd = cwdRaw;
        try {
            cwd = await realpath(cwdRaw);
        }
        catch { /* process may exit mid-scan */ }
        const lines = await rolloutLines(rolloutPath);
        const originator = codexRolloutOriginator(lines);
        if (originator !== "codex-tui") {
            // A KNOWN non-tui originator is a clean negative: this is a `codex
            // exec` job or similar, correctly not a target. An EMPTY one means
            // the rollout could not be read or carried no session_meta — we
            // failed to classify a live process, and unlike Cursor's
            // never-prompted case that is not a normal state, so it stays an
            // incomplete observation rather than being reported as a clean scan.
            if (originator === "")
                incomplete = true;
            return null;
        }
        return {
            pid: process.pid,
            tty: process.tty.startsWith("/dev/") ? process.tty : `/dev/${process.tty}`,
            cwd,
            rolloutPath,
            sessionId: rolloutSessionId(rolloutPath),
            state: codexStateFromRolloutLines(lines),
        };
    }));
    return remember$1(now, mySeq, { status: incomplete ? "unknown" : "ok", instances: instances.filter((i) => i !== null) });
}
/** EXACT GUARANTEE (mirrors claude-scan.ts): a scan that started earlier can
 * never overwrite the result of one that started later, ordered by a
 * monotonic start sequence rather than a timestamp. It does NOT guarantee the
 * cache holds the latest observation of the world — a long scan that started
 * later still wins even if a faster, earlier scan finishes after it. */
function remember$1(at, mySeq, snapshot) {
    if (mySeq >= publishedSeq$1) {
        cache$1 = { at, snapshot };
        publishedSeq$1 = mySeq;
    }
    return snapshot;
}
function rememberUnknown$1(at, mySeq) {
    const stale = cache$1?.snapshot.instances.map((instance) => ({ ...instance, state: "unknown" })) ?? [];
    return remember$1(at, mySeq, { status: "unknown", instances: stale });
}

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

const POLL_MS$5 = 2500;
/** Live key for one interactive Codex CLI session/project. */
let CodexProject = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.codexproject" })];
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
        lastImage = new Map();
        /** Identity used for the currently painted face; press must revalidate it. */
        paintedSession = new Map();
        refresher = new CoalescedRunner(() => this.doRefreshAll());
        timer;
        spin = 0;
        tick = 0;
        interesting = true;
        async onWillAppear(ev) {
            if (!ev.action.isKey())
                return;
            this.visible.set(ev.action.id, ev.action);
            if (this.timer === undefined) {
                this.timer = setInterval(() => {
                    if (shouldPollThisTick(this.tick++, this.interesting))
                        void this.refreshAll();
                }, POLL_MS$5);
            }
            await this.refreshAll();
        }
        onWillDisappear(ev) {
            this.gate.cancel(ev.action.id);
            this.visible.delete(ev.action.id);
            this.lastImage.delete(ev.action.id);
            this.paintedSession.delete(ev.action.id);
            if (this.visible.size === 0 && this.timer !== undefined) {
                clearInterval(this.timer);
                this.timer = undefined;
            }
        }
        onKeyDown(ev) {
            this.gate.down(ev.action.id, () => {
                void this.capture(ev.action).catch((error) => streamDeck.logger.error(`Codex Project capture failed: ${String(error)}`));
            });
        }
        async onKeyUp(ev) {
            if (!this.gate.up(ev.action.id))
                return;
            await runExclusive("iterm-focus", () => this.focus(ev.action));
        }
        async snapshot() {
            const tmux = findTmuxPath();
            const [codex, panesResult, clientsResult, front] = await Promise.all([
                scanCodexSnapshot(),
                runTmux(LIST_CODEX_PANES_ARGS, tmux),
                runTmux(LIST_CLIENTS_ARGS, tmux),
                runJxa(FRONT_APP_BUNDLE_JXA),
            ]);
            const frontBundle = front.ok ? front.stdout.trim() : "";
            let focusedTty = "";
            if (frontBundle === ITERM_BUNDLE_ID)
                focusedTty = (await runAppleScript(ITERM_FOCUSED_TTY_SCRIPT)).stdout.trim();
            else if (frontBundle === TERMINAL_BUNDLE_ID)
                focusedTty = (await runAppleScript(TERMINAL_FOCUSED_TTY_SCRIPT)).stdout.trim();
            return {
                instances: codex.instances,
                panes: panesResult.ok ? parseCodexPanes(panesResult.stdout) : [],
                clientTtys: parseClientTtys(clientsResult.stdout),
                frontBundle,
                focusedTty,
                scanStatus: codex.status,
            };
        }
        refreshAll() { return this.refresher.request(); }
        async canonicalProject(project) {
            const normalized = normalizeProjectPath(expandHome(project, homedir()));
            try {
                return await realpath(normalized);
            }
            catch {
                return normalized;
            }
        }
        async doRefreshAll() {
            if (this.visible.size === 0)
                return;
            const snap = await this.snapshot();
            this.spin++;
            this.interesting = snap.focusedTty !== "" || snap.instances.some((i) => i.state === "working" || i.state === "blocked");
            for (const key of this.visible.values()) {
                const settings = await key.getSettings();
                const project = await this.canonicalProject((settings.project ?? "").trim());
                const mine = project ? codexInstancesForProject(snap.instances, project) : [];
                const instance = selectCodexInstance(mine, project, (settings.sessionId ?? "").trim());
                if (instance === null)
                    this.paintedSession.delete(key.id);
                else
                    this.paintedSession.set(key.id, instance.sessionId);
                const pane = instance === null ? undefined : snap.panes.find((p) => p.tty === instance.tty);
                let host = "";
                let hot = false;
                if (instance !== null && pane !== undefined) {
                    host = "tmux";
                    hot = pane.receivesKeys && snap.focusedTty !== "" && (snap.clientTtys.get(pane.session) ?? []).includes(snap.focusedTty);
                }
                else if (instance !== null && instance.tty === snap.focusedTty) {
                    hot = true;
                    host = snap.frontBundle === TERMINAL_BUNDLE_ID ? "terminal" : "iterm";
                }
                const state = mine.length > 1 && instance === null
                    ? "unknown"
                    : instance?.state ?? (project !== "" && snap.scanStatus === "unknown" ? "unknown" : "none");
                const image = svgToDataUri(buildCodexProjectKeyImage({ project: project || "no target", host, hot, state, spin: this.spin }));
                if (this.lastImage.get(key.id) === image)
                    continue;
                try {
                    await key.setImage(image);
                    this.lastImage.set(key.id, image);
                }
                catch (error) {
                    streamDeck.logger.debug(`Codex Project image skipped: ${String(error)}`);
                }
            }
        }
        async raiseTty(tty) {
            if (await processRunning("iTerm2")) {
                const result = await runAppleScript(buildITermRaiseScript(tty));
                if (result.ok) {
                    const focus = parseITermFocusResult(result.stdout);
                    if (focus.status === "ok")
                        return true;
                    if (focus.status === "timeout") {
                        streamDeck.logger.warn(`Codex Project iTerm focus timed out: window=${focus.windowId || "?"} tty=${focus.tty || "?"}`);
                        return false;
                    }
                }
            }
            if (await processRunning(TERMINAL_PROCESS_NAME)) {
                const result = await runAppleScript(buildTerminalRaiseScript(tty));
                if (result.ok && result.stdout.includes("ok"))
                    return true;
            }
            return false;
        }
        async focus(key) {
            const settings = await key.getSettings();
            const project = await this.canonicalProject((settings.project ?? "").trim());
            if (project === "") {
                await key.showAlert();
                return;
            }
            const expected = this.paintedSession.get(key.id) ?? (settings.sessionId ?? "");
            const snap = await this.snapshot();
            if (snap.scanStatus !== "ok") {
                streamDeck.logger.warn("Codex Project: process scan unavailable; refusing stale focus.");
                await key.showAlert();
                return;
            }
            const instance = selectCodexInstance(snap.instances, project, expected);
            if (instance === null || (expected !== "" && instance.sessionId !== expected)) {
                streamDeck.logger.warn(`Codex Project: target missing or ambiguous for ${project}.`);
                await key.showAlert();
                return;
            }
            const pane = snap.panes.find((p) => p.tty === instance.tty);
            if (pane !== undefined) {
                const clientTtys = snap.clientTtys.get(pane.session) ?? [];
                const clientTty = chooseClientTty(clientTtys, snap.focusedTty);
                if (clientTty === null) {
                    streamDeck.logger.warn(`Codex Project: tmux session ${pane.session} has no attached client.`);
                    await key.showAlert();
                    return;
                }
                if (clientTtys.length > 1)
                    streamDeck.logger.debug(`Codex Project: chose ${clientTty} from ${clientTtys.length} clients for ${pane.session}.`);
                if (!(await this.raiseTty(clientTty))) {
                    await key.showAlert();
                    return;
                }
                const tmux = findTmuxPath();
                for (const args of codexTmuxFocusArgs(pane, clientTty)) {
                    const result = await runTmux(args, tmux);
                    if (!result.ok) {
                        streamDeck.logger.error(`Codex Project tmux ${args[0]} failed: ${result.stderr}`);
                        await key.showAlert();
                        return;
                    }
                }
            }
            else if (!(await this.raiseTty(instance.tty))) {
                await key.showAlert();
                return;
            }
            await key.showOk();
            setTimeout(() => void this.refreshAll(), 450);
        }
        async capture(key) {
            const snap = await this.snapshot();
            if (snap.scanStatus !== "ok" || snap.focusedTty === "") {
                await key.showAlert();
                return;
            }
            let instance = snap.instances.find((i) => i.tty === snap.focusedTty);
            if (instance === undefined) {
                for (const [session, clientTtys] of snap.clientTtys) {
                    if (!clientTtys.includes(snap.focusedTty))
                        continue;
                    const pane = snap.panes.find((p) => p.session === session && p.receivesKeys);
                    if (pane !== undefined)
                        instance = snap.instances.find((i) => i.tty === pane.tty);
                    break;
                }
            }
            if (instance === undefined) {
                await key.showAlert();
                return;
            }
            const settings = await key.getSettings();
            await key.setSettings({ ...settings, project: instance.cwd, sessionId: instance.sessionId });
            this.paintedSession.set(key.id, instance.sessionId);
            await key.showOk();
            await this.refreshAll();
        }
    });
    return _classThis;
})();

/**
 * WHAT IT'S FOR: one shared decision layer for the "agent project" keys, so a
 * key that has captured a Claude Code, Codex or Cursor session in a folder can
 * answer the same four questions — is there a session, is it working, is it
 * blocked on me, or is it just sitting idle? — with the SAME rules whichever
 * CLI it captured. Before this module each CLI had its own copy of that logic
 * and the copies had drifted; the drift is what this module removes.
 *
 * The three CLIs are NOT interchangeable underneath, and the differences are
 * load-bearing rather than cosmetic. Each was measured against a live session,
 * and the comments below say what was observed rather than what seemed likely:
 *
 *   - Codex records "I am waiting for your approval" in its own rollout log, so
 *     a blocked Codex session is knowable from a file, on any host, with no
 *     terminal scraping at all. Its `state` already carries `blocked`.
 *   - Claude Code and Cursor write nothing that distinguishes "blocked on the
 *     operator" from "busy working". The ONLY direct evidence is the approval
 *     prompt drawn on the terminal, and the only terminal this plugin can read
 *     is a tmux pane. Outside tmux, "blocked" is simply not observable for
 *     those two — see {@link blockedEvidenceFor}.
 *   - Measured, and the reason {@link decideAgentFace} exists in this form:
 *     Claude Code keeps its IDLE title marker (a "✳") on screen while its
 *     approval prompt is up, so a blocked Claude session's file-derived state
 *     reads `waiting`, not `working`. Cursor's blocked session has no
 *     `turn_ended` record yet and so reads `working`. A rule that only upgrades
 *     a `working` session to `blocked` is therefore correct for Cursor and
 *     unreachable for Claude.
 *
 * Vocabulary used throughout (these recur, so they are defined once here):
 *   - "instance" — one running agent process this plugin has identified,
 *     with the tty it owns and the folder it was started in. Identifying them
 *     is the impure scanners' job; this module only decides.
 *   - "face" — what the key should PAINT: the composed verdict, which is not
 *     the same thing as an instance's own state (an incomplete scan can force
 *     `unknown` over a perfectly confident instance).
 *   - "hot" — this key's project is the one the operator is looking at now.
 */
/**
 * What kind of evidence a `blocked` verdict could rest on for this kind+host.
 *
 * Callers use it to decide whether scraping a pane is worth doing at all, and
 * to avoid promising a "needs you" light they cannot actually deliver.
 */
function blockedEvidenceFor(kind, host) {
    // Codex reports blocking in its own rollout log, so it needs no terminal and
    // works outside tmux too.
    if (kind === "codex")
        return "authoritative";
    // Claude and Cursor are only observable through the pane text, and the only
    // terminal this plugin can read is a tmux pane.
    return host === "tmux" ? "terminal" : "unavailable";
}
/**
 * What should a "blocked" probe read when there is no pane to scrape?
 *
 * A missing pane is ambiguous on its own: it means "no session here" just as
 * often as it means "the pane LISTING itself failed this tick". The two must
 * not paint the same face. `panesOk` tells them apart:
 *
 *   - Both `list-panes` and `list-clients` failed: indistinguishable from a
 *     machine with no tmux server at all, which is a supported first-class
 *     case (`runTmux` reports that failure the same way it reports "no tmux
 *     server"). The honest answer here is `"clear"` — there was never a
 *     question to answer.
 *   - `list-clients` succeeded but `list-panes` specifically did not: tmux is
 *     demonstrably alive, so a hidden approval prompt cannot be ruled out for
 *     any kind whose blocked verdict can ONLY come from scraping a pane
 *     (`blockedEvidenceFor(kind, "tmux") === "terminal"` — claude and cursor).
 *     For those, "clear" would be a confident negative on a question that was
 *     never actually asked; the honest answer is `"failed"`. Codex is
 *     unaffected either way — its blocked verdict never depends on a pane.
 */
function blockedProbeForMissingPane(kind, panesOk, clientsOk) {
    if (!panesOk && clientsOk && blockedEvidenceFor(kind, "tmux") === "terminal")
        return "failed";
    return "clear";
}
/** Claude Code's approval question. Two different wordings were measured —
 * "Do you want to proceed?" for a bash approval and "Do you want to make this
 * edit to <file>?" for an edit approval — so the matcher keys on the shared
 * stem rather than on either full sentence. `.` does not cross newlines, so
 * this necessarily matches WITHIN one line of pane text. */
const CLAUDE_ASK = /Do you want to .*\?/;
/**
 * Does this terminal pane show the agent's approval prompt — i.e. is it
 * blocked on the operator right now?
 *
 * Matching is deliberately narrow, and the guarantee is narrow to match:
 * unrecognised wording yields false, so a prompt phrased in a way we have not
 * measured leaves the key on its file-derived state instead of inventing an
 * amber light. It does NOT guarantee the reverse — this reads the pane's
 * visible text, so recognised prompt wording appearing in ordinary output (a
 * README being catted, a transcript being replayed) CAN produce a false
 * `blocked`. The markers below were chosen to make that unlikely, not
 * impossible.
 *
 * Callers must capture the VISIBLE screen only, never scrollback: an
 * already-answered prompt lingers in history, and matching it would hold the
 * key amber while the agent is busy working.
 */
function paneShowsAgentPrompt(kind, paneText) {
    switch (kind) {
        case "codex":
            // Codex's own log already says `blocked` (see blockedEvidenceFor), so
            // there is nothing to gain by scraping and a false positive to lose.
            return false;
        case "claude":
            // The question alone is too ordinary a sentence to trust; Claude renders
            // a numbered choice list directly beneath it, and both measured wordings
            // carry "1. Yes".
            //
            // NEGATIVE CASE (measured): the folder-trust prompt — "Quick safety
            // check: Is this a project you created or one you trust?" with "1. Yes,
            // I trust this folder" — carries the same choice line but is NOT an
            // approval to act on, and must not turn the key amber. It is excluded by
            // the question stem: it never says "Do you want to". A test pins this.
            return CLAUDE_ASK.test(paneText) && paneText.includes("1. Yes");
        case "cursor":
            // The inline status marker is specific enough to stand on its own.
            // "Run this command?" is a phrase that could plausibly appear in
            // scrolled output, so it only counts alongside Cursor's choice line.
            if (paneText.includes("Waiting for approval"))
                return true;
            return paneText.includes("Run this command?") && paneText.includes("Run (once)");
    }
}
/**
 * The agent instance owning the terminal the operator is looking at, or null.
 *
 * Returns null on zero matches AND on two or more — never picks. Two can
 * genuinely match: an agent launched from inside another agent's terminal
 * inherits that terminal's tty, so both processes legitimately report it.
 * Choosing between them would be a guess, and the caller's honest answer to a
 * guess is to show nothing rather than act on the wrong session.
 */
function agentForFocusedTty(instances, focusedTty) {
    const matches = instances.filter((i) => i.tty === focusedTty);
    return matches.length === 1 ? matches[0] : null;
}
/**
 * Should the AI Project key's poller stay at full cadence this tick, or is it
 * safe to drop to the idle-gate's reduced rate?
 *
 * MEASURED, and the reason `blockedProbes` is part of this decision and not
 * just `instances`: Claude Code keeps its idle "✳" title marker on screen
 * while its own approval prompt is up, so a BLOCKED Claude's `instance.state`
 * reads `"waiting"`, never `"working"` or `"blocked"` — a version of this
 * check that only looked at instance state would drop to a quarter of full
 * cadence at exactly the moment the operator's approval is most time-
 * sensitive, and the amber light could sit stale for up to 4 poll periods
 * (~10s) instead of one (~2.5s). Folding in every kind's own blocked-probe
 * verdict for the tick closes that gap for every kind, not just Claude.
 * `"failed"` counts as interesting too, so a broken probe is re-tried at full
 * speed rather than quietly left broken for several cycles.
 */
function agentTickInteresting(args) {
    return (args.focusedTty !== "" ||
        args.instances.some((i) => i.state === "working" || i.state === "blocked") ||
        args.blockedProbes.some((p) => p !== "clear"));
}
/**
 * Compose the face a key should paint from every piece of evidence at once.
 *
 * Pure and tested because it is where the honesty rules live: a key must never
 * look confident on thin evidence. Three cases are easy to get wrong and are
 * settled here rather than in each action shell:
 *
 *   - A scan that could not identify every candidate process is not proof that
 *     the ONE session it found is the only one in this folder. Without a
 *     captured session id — the thing that would make it unambiguous — the
 *     honest face is `unknown`, not that session's state.
 *   - Once a key has captured a session id that id is binding. If a trustworthy
 *     scan no longer finds it, the answer is "no target", never the neighbour
 *     that happens to share the folder.
 *   - A visible approval prompt outranks the file-derived state. MEASURED: a
 *     blocked Claude Code session still shows its idle "✳" marker and so reads
 *     `waiting`, while a blocked Cursor session reads `working`. Requiring
 *     `working` here — as the Cursor-only predecessor did — would make the
 *     branch unreachable for Claude and silently kill the whole feature. The
 *     prompt on screen is direct evidence either way.
 *
 * `blockedOnPane` is only ever true for claude and cursor: codex carries its own
 * `blocked` in `instanceState` and is never scraped ({@link paneShowsAgentPrompt}).
 */
function decideAgentFace(args) {
    if (!args.hasTarget)
        return "none";
    if (args.instanceState === null) {
        if (args.scanStatus !== "ok")
            return "unknown";
        // A trustworthy scan that did not turn up the captured session means that
        // session has exited — "no target". Reporting `unknown` because OTHER
        // sessions share the folder would contradict the binding-capture rule:
        // those neighbours are not this key's.
        if (args.hasCapturedId)
            return "none";
        return args.matchCount > 1 ? "unknown" : "none";
    }
    // `scanStatus` here is THIS kind's own probe (see kindTrusted). If it failed,
    // nothing about this session was actually observed this tick — a captured id
    // disambiguates WHICH session is meant, it does not make an unobserved one
    // trustworthy. So the exemption a captured id used to buy is gone.
    if (args.scanStatus !== "ok")
        return "unknown";
    // A visible prompt is direct evidence and outranks the file-derived state.
    // It must upgrade from "waiting" as well as "working": Claude Code keeps its
    // IDLE title marker while its approval prompt is on screen (measured), so
    // gating this on "working" alone would make it unreachable for Claude.
    if (args.blockedProbe === "blocked")
        return "blocked";
    // The probe failed, so "is it waiting on the operator?" is unanswered — and
    // that is exactly the question this key exists to answer. Say so.
    if (args.blockedProbe === "failed")
        return "unknown";
    return args.instanceState;
}
function projectBasename$1(path) {
    const p = normalizeProjectPath(path);
    return p.slice(p.lastIndexOf("/") + 1) || "?";
}
function truncate$2(value, max) {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
const MONO$2 = "Menlo, Monaco, monospace";
/** Twelve positions around the state glyph. The glyphs are close to
 * rotationally symmetric at key size, so spinning them collapses to a wobble
 * you cannot see; an orbiting dot gives 12 genuinely distinct frames. */
const ORBIT$2 = [[61, 4], [65, 5.1], [67.9, 8], [69, 12], [67.9, 16], [65, 18.9], [61, 20], [57, 18.9], [54.1, 16], [53, 12], [54.1, 8], [57, 5.1]];
/** The top-right state glyph, one shape per kind, so a crowded deck says at a
 * glance WHICH agent a key captured and not merely that it captured one. */
function stateGlyph(kind, color) {
    switch (kind) {
        case "claude":
            // Claude's coral spark/asterisk.
            return `<path d="M56 12h10M58.5 7.7l5 8.6M63.5 7.7l-5 8.6" stroke="${color}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
        case "codex":
            // Codex's nested square.
            return `<path d="M56 7h10v10H56zM59 10h4v4h-4z" fill="none" stroke="${color}" stroke-width="1.8"/>`;
        case "cursor":
            // Cursor's arrow pointer.
            return `<path d="M57 5l9 10.5-4.4.4 2.6 5.2-2.6 1.3-2.6-5.2-3 3.2z" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>`;
    }
}
/** The small mark at the bar's left end — the same shape as the state glyph,
 * so the key still identifies its agent when there is nothing to report. */
function footMark(kind, color) {
    switch (kind) {
        case "claude":
            return `<path d="M6.5 64.25h7M8 61.25l4 6M12 61.25l-4 6" stroke="${color}" stroke-width="1.4" stroke-linecap="round" fill="none"/>`;
        case "codex":
            return `<path d="M7 61h7v7H7zM9 63h3v3H9z" fill="none" stroke="${color}" stroke-width="1.2"/>`;
        case "cursor":
            return `<path d="M8 61l5 5.8-2.5.2 1.5 2.9-1.5.7-1.5-2.9-1.7 1.8z" fill="none" stroke="${color}" stroke-width="1.1" stroke-linejoin="round"/>`;
    }
}
/**
 * The unified live key face, 72x72, on the shared ink ground.
 *
 * Hex colours ONLY — the KEY rasterizer paints `hsl()` as solid black (the
 * touchscreen pixmap pipeline renders it fine), so every hue goes through
 * {@link hslToHex}; a unit test asserts no `hsl(` literal survives for any
 * kind/state/hot combination. The project name is XML-escaped and truncated to
 * what fits the key.
 */
function buildAgentProjectKeyImage(args) {
    const base = projectBasename$1(args.project);
    const name = truncate$2(base, 9);
    const hue = sessionHue(base);
    const active = args.state !== "none";
    const color = args.state === "working" ? "#4E9CFF" : args.state === "blocked" ? "#F0A63C" : args.state === "waiting" ? "#F2FFF6" : "#8B9490";
    const nameFill = active ? args.hot ? "#FFFFFF" : "#A6ADA9" : "#6A716E";
    const bar = !active
        ? '<rect x="1" y="58" width="70" height="13" fill="none" stroke="#4A504D" stroke-width="1.5" stroke-dasharray="3 3"/>'
        : args.hot
            ? `<rect x="0" y="57" width="72" height="15" fill="${hslToHex(hue, 62, 42)}"/><rect x="60" y="60.5" width="5" height="8" fill="#F2FFF6"/>`
            : `<rect x="1" y="58" width="70" height="13" fill="none" stroke="${hslToHex(hue, 35, 52)}" stroke-width="1.5"/>`;
    // Anchored at x=30, not centre: the longest host label ("TERMINAL") must
    // clear the state glyph in the top-right corner.
    const eyebrow = args.host
        ? `<text x="30" y="15" text-anchor="middle" font-family="${MONO$2}" font-size="7.5" letter-spacing="1" fill="${hslToHex(hue, 50, 70)}">${escapeXml(args.host.toUpperCase())}</text>`
        : "";
    let glyph = "";
    if (active) {
        glyph = stateGlyph(args.kind, color);
        if (args.state === "working") {
            const [x, y] = ORBIT$2[(args.spin ?? 0) % ORBIT$2.length];
            glyph += `<circle cx="${x}" cy="${y}" r="1.7" fill="#4E9CFF"/>`;
        }
        // The hollow-outline glyphs get an amber core when blocked. Claude's spark
        // is skipped: its three strokes already cross at exactly this point, so a
        // dot there would only thicken the join. Its whole spark is amber instead.
        if (args.state === "blocked" && args.kind !== "claude") {
            glyph += `<circle cx="61" cy="12" r="1.7" fill="#F0A63C"/>`;
        }
    }
    const mark = footMark(args.kind, active ? args.hot ? "#F2FFF6" : hslToHex(hue, 50, 70) : "#8B9490");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><rect width="72" height="72" fill="#0F1211"/>${eyebrow}${glyph}<text x="36" y="40" text-anchor="middle" font-family="${MONO$2}" font-size="11.5" font-weight="700" fill="${nameFill}">${escapeXml(name)}</text>${bar}${mark}</svg>`;
}

/**
 * WHAT IT'S FOR: the pure decision layer behind the Cursor Project key — the
 * one place that answers "which running Cursor CLI session is this key's
 * project, and is it working, blocked on me, or idle?" so the action shell
 * stays a thin wire between Stream Deck events and tested logic.
 *
 * Cursor's CLI (`cursor-agent`) looks superficially like Codex but records
 * state very differently, and three of the Codex signals do NOT port. Each
 * difference below was measured against cursor-agent 2026.08.11-e8db854, and
 * the comments say what was observed rather than what seemed likely:
 *
 *   - `ps -o comm=` is TRUNCATED to 16 characters for these processes (it
 *     comes back as `/Users/johnknox/`), so identity must be read from `args`.
 *   - There is no `originator` field and no state marker in the terminal
 *     title (the title is the chat's name, identical whether the agent is
 *     working, blocked, or idle), so neither Codex's nor Claude Code's
 *     identity trick is available.
 *   - Transcript records are appended AFTER a tool runs, not when the model
 *     asks for it. While a session sits on an approval prompt its transcript
 *     is byte-identical to a session waiting on the model. Tail SHAPE
 *     therefore cannot decide working-vs-blocked, and this module does not
 *     try to; see {@link cursorStateFromTranscriptLines}.
 *
 * Privacy: transcripts hold the operator's prompts and command text. A bounded
 * tail of those bytes is necessarily parsed here, but the ONLY fields retained
 * or returned are the structural ones (`type`, `role`); no message content
 * leaves this module, and none is ever logged. That is a minimisation, not an
 * isolation guarantee — the bytes do pass through this process's memory.
 */
/** Parse targeted `ps -o pid=,ppid=,tty=,args=` output. `comm` is deliberately
 * absent: it truncates at 16 chars for cursor-agent and is useless here. */
function parseCursorProcesses(output) {
    const result = [];
    for (const raw of output.split("\n")) {
        const m = raw.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);
        if (m === null)
            continue;
        const pid = Number.parseInt(m[1], 10);
        const ppid = Number.parseInt(m[2], 10);
        if (!Number.isFinite(pid) || !Number.isFinite(ppid))
            continue;
        result.push({ pid, ppid, tty: m[3], args: m[4] });
    }
    return result;
}
/** The installed-version path every cursor-agent process carries in argv,
 * whichever of the two interchangeable symlinks (`agent`, `cursor-agent`) the
 * operator typed. Anchored to the real layout so an unrelated process that
 * merely mentions "cursor-agent" (an editor open on a file of that name, a
 * grep) cannot enter the scan. */
const CURSOR_ARGV = /(^|\/)\.local\/share\/cursor-agent\/versions\/[^/\s]+\//;
/** Cheap candidate gate: a real controlling tty (a TUI session, not a daemon)
 * plus the installed-version path in argv. */
function isCursorProcess(p) {
    return p.tty !== "??" && p.tty !== "?" && CURSOR_ARGV.test(p.args);
}
/** A worker is launched as the versioned `node` binary directly; an operator's
 * session is launched through the `bin/agent` or `bin/cursor-agent` wrapper.
 * Matched from the start of argv but WITHOUT assuming the path is
 * whitespace-free: a home directory containing a space (`/Users/Jane Doe/…`)
 * used to make this fail, leaving the worker in the list and rendering every
 * key on that machine permanently ambiguous. */
const WORKER_ARGV = /^\/[^\n]*?\/\.local\/share\/cursor-agent\/versions\/[^/]+\/node(\s|$)/;
/**
 * Drop cursor-agent's own worker child. Every interactive session forks a
 * long-lived `.../versions/<v>/node .../index.js` helper that matches the
 * same argv pattern, shares the session's tty AND its chat store — left in,
 * it would masquerade as a second session on the same project and force every
 * key to the deliberately-ambiguous `unknown` face.
 *
 * BOTH conditions are required: the process is parented by another candidate
 * AND its argv has the worker's shape. Parentage alone would also swallow a
 * genuine session that happens to have been started from inside another
 * session's terminal, which is a real session the operator may want a key for.
 */
function withoutWorkerChildren(procs) {
    const pids = new Set(procs.map((p) => p.pid));
    return procs.filter((p) => !(pids.has(p.ppid) && WORKER_ARGV.test(p.args)));
}
/** Is this an open file inside a session's chat store? */
function isCursorChatPath(path) {
    // Deliberately not anchored on the literal `.cursor` segment: lsof reports
    // the RESOLVED path, so a symlinked or relocated config directory would
    // otherwise stop every session being recognised. The remaining shape —
    // a 32-hex project hash, a session UUID, and a store.db file — is specific
    // enough, and only files held open by a confirmed cursor-agent are tested.
    return /\/chats\/[0-9a-f]{32}\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\/store\.db(-wal|-shm)?$/i.test(path);
}
/** The chat-store directory holding a session's files, or "" if not one. */
function cursorChatDir(path) {
    return isCursorChatPath(path) ? path.slice(0, path.lastIndexOf("/")) : "";
}
/** Session UUID = the final path component of the chat-store directory. */
function cursorSessionId(chatDir) {
    return chatDir.match(/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i)?.[1] ?? "";
}
/**
 * The single chat directory a process is using, or "" when the evidence is
 * not unambiguous. A process holds store.db, -wal and -shm open at once, so
 * several entries are normal and must collapse to ONE directory; zero matches
 * (a session still starting) and two distinct directories (a session being
 * switched) both mean "don't claim to know which conversation this is".
 */
function soleChatDir(paths) {
    const dirs = new Set();
    for (const p of paths) {
        const dir = cursorChatDir(p);
        if (dir !== "")
            dirs.add(dir);
    }
    return dirs.size === 1 ? [...dirs][0] : "";
}
/**
 * Working/idle from the transcript, using ONLY the turn terminator.
 *
 * Cursor closes every turn with a `{"type":"turn_ended","status":...}` record
 * and appends tool records after the fact, so the presence of a terminator at
 * the tail is the one thing the file reliably says: terminator = the prompt is
 * idle; no terminator = a turn is still in flight. It cannot tell whether an
 * in-flight turn is computing or holding for approval — that needs the
 * terminal itself ({@link paneShowsApprovalPrompt}).
 *
 * An empty transcript means a session that has not been prompted yet, which
 * is idle. Lines that exist but do not parse are NOT evidence of anything, so
 * they yield `unknown` rather than a confident face. A turn that ended with
 * `status: "error"` still left the prompt idle, so it reads `waiting`.
 *
 * Pure; reads only `type`, `role` and `status` — never message content.
 */
function cursorStateFromTranscriptLines(lines) {
    let sawLine = false;
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line === "")
            continue;
        sawLine = true;
        let row;
        try {
            row = JSON.parse(line);
        }
        catch {
            continue; // a concurrent append or a clipped window edge is not evidence
        }
        if (row.type === "turn_ended")
            return "waiting";
        if (row.role === "user" || row.role === "assistant")
            return "working";
    }
    return sawLine ? "unknown" : "waiting";
}
/**
 * Does this terminal pane show Cursor's command-approval prompt?
 *
 * This is the ONLY direct evidence that a session is blocked on the operator;
 * no file Cursor writes distinguishes that from ordinary work. Matching is
 * deliberately narrow and fails SAFE: unrecognised wording yields false, so
 * the key falls back to `working` and can never invent an amber "needs you"
 * light that isn't real.
 */
function paneShowsApprovalPrompt(paneText) {
    // "Run this command?" alone is a phrase that could plausibly appear in
    // ordinary scrolled output, so it only counts alongside the choice line
    // that Cursor renders directly beneath it. The inline status marker is
    // specific enough to stand on its own.
    if (paneText.includes("Waiting for approval"))
        return true;
    return paneText.includes("Run this command?") && paneText.includes("Run (once)");
}
/**
 * tmux args capturing one pane's VISIBLE screen — deliberately no scrollback.
 *
 * An approval prompt is on screen for exactly as long as it is waiting, so the
 * live screen is sufficient evidence. Including history is not merely
 * unnecessary but wrong: an already-answered prompt lingers in the scrollback,
 * and matching it would hold the key amber while the agent is busy working.
 */
function capturePaneArgs(paneId) {
    return ["capture-pane", "-p", "-t", paneId];
}
function cursorInstancesForProject(instances, project) {
    const target = normalizeProjectPath(project);
    return instances.filter((i) => normalizeProjectPath(i.cwd) === target);
}
/**
 * Resolve the key's target session.
 *
 * Once a key has captured a session id that id is binding: if that exact
 * session is gone, the answer is "no target", NEVER the other session that
 * happens to share the folder. Quietly re-pointing at a same-cwd neighbour
 * would send the operator's keystrokes and window focus to a conversation
 * they never captured. Without a captured id a lone session is unambiguous;
 * two or more are not, and yield null so the caller can paint `unknown`.
 */
function selectCursorInstance(instances, project, sessionId) {
    const mine = cursorInstancesForProject(instances, project);
    if (sessionId !== "") {
        const matches = mine.filter((i) => i.sessionId === sessionId);
        return matches.length === 1 ? matches[0] : null;
    }
    return mine.length === 1 ? mine[0] : null;
}
/**
 * Compose the face a key should show from every piece of evidence at once.
 *
 * Pure and tested because it is where the honesty rules live: a key must never
 * look confident on thin evidence. Two cases in particular are easy to get
 * wrong and are handled explicitly here rather than in the action shell:
 *
 *   - A scan that could not identify every candidate process is not proof that
 *     the ONE session found is the only one in this folder. If the key has no
 *     captured session id — the thing that would make it unambiguous — the
 *     honest face is `unknown`, not that session's state.
 *   - Only an in-flight turn can be blocked; an idle prompt showing leftover
 *     approval text on screen must not turn the key amber.
 */
function decideCursorFace(args) {
    if (!args.hasTarget)
        return "none";
    if (args.instanceState === null) {
        // A trustworthy scan that did not turn up the captured session means that
        // session has exited — "no target". Reporting `unknown` because OTHER
        // sessions share the folder would contradict the binding-capture rule in
        // {@link selectCursorInstance}: those neighbours are not this key's.
        if (args.scanStatus !== "ok")
            return "unknown";
        if (args.hasCapturedId)
            return "none";
        return args.matchCount > 1 ? "unknown" : "none";
    }
    if (args.scanStatus !== "ok" && !args.hasCapturedId)
        return "unknown";
    if (args.instanceState === "working" && args.blockedOnPane)
        return "blocked";
    return args.instanceState;
}
/** The pane hosting a session, matched by tty. */
function paneForTty(panes, tty) {
    return panes.find((p) => p.tty === tty);
}
function projectBasename(path) {
    const p = normalizeProjectPath(path);
    return p.slice(p.lastIndexOf("/") + 1) || "?";
}
function truncate$1(value, max) {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
const MONO$1 = "Menlo, Monaco, monospace";
const ORBIT$1 = [[61, 4], [65, 5.1], [67.9, 8], [69, 12], [67.9, 16], [65, 18.9], [61, 20], [57, 18.9], [54.1, 16], [53, 12], [54.1, 8], [57, 5.1]];
/**
 * Cursor sibling of the Claude and Codex live faces. Hex colours only — the
 * KEY rasterizer paints `hsl()` as black, so every colour goes through
 * {@link hslToHex} (a unit test asserts no `hsl(` literal survives).
 */
function buildCursorProjectKeyImage(args) {
    const name = truncate$1(projectBasename(args.project), 9);
    const hue = sessionHue(projectBasename(args.project));
    const active = args.state !== "none";
    const color = args.state === "working" ? "#4E9CFF" : args.state === "blocked" ? "#F0A63C" : args.state === "waiting" ? "#F2FFF6" : "#8B9490";
    const nameFill = active ? args.hot ? "#FFFFFF" : "#A6ADA9" : "#6A716E";
    const bar = !active
        ? '<rect x="1" y="58" width="70" height="13" fill="none" stroke="#4A504D" stroke-width="1.5" stroke-dasharray="3 3"/>'
        : args.hot
            ? `<rect x="0" y="57" width="72" height="15" fill="${hslToHex(hue, 62, 42)}"/><rect x="60" y="60.5" width="5" height="8" fill="#F2FFF6"/>`
            : `<rect x="1" y="58" width="70" height="13" fill="none" stroke="${hslToHex(hue, 35, 52)}" stroke-width="1.5"/>`;
    const eyebrow = args.host ? `<text x="30" y="15" text-anchor="middle" font-family="${MONO$1}" font-size="7.5" letter-spacing="1" fill="${hslToHex(hue, 50, 70)}">${escapeXml(args.host.toUpperCase())}</text>` : "";
    let glyph = "";
    if (active) {
        const spin = args.spin ?? 0;
        // Cursor's mark reads as an arrow pointer, distinguishing it at a glance
        // from Codex's square and Claude's asterisk on a crowded deck.
        glyph = `<path d="M57 5l9 10.5-4.4.4 2.6 5.2-2.6 1.3-2.6-5.2-3 3.2z" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>`;
        if (args.state === "working") {
            const [x, y] = ORBIT$1[spin % ORBIT$1.length];
            glyph += `<circle cx="${x}" cy="${y}" r="1.7" fill="#4E9CFF"/>`;
        }
        if (args.state === "blocked")
            glyph += `<circle cx="61" cy="12" r="1.7" fill="#F0A63C"/>`;
    }
    const mark = `<path d="M8 61l5 5.8-2.5.2 1.5 2.9-1.5.7-1.5-2.9-1.7 1.8z" fill="none" stroke="${active ? args.hot ? "#F2FFF6" : hslToHex(hue, 50, 70) : "#8B9490"}" stroke-width="1.1" stroke-linejoin="round"/>`;
    // Deprecation marker — superseded by AI Project; remove with this action.
    return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><rect width="72" height="72" fill="#0F1211"/>${deprecationBadge()}${eyebrow}${glyph}<text x="36" y="40" text-anchor="middle" font-family="${MONO$1}" font-size="11.5" font-weight="700" fill="${nameFill}">${escapeXml(name)}</text>${bar}${mark}</svg>`;
}

/**
 * WHAT IT'S FOR: the one place that asks the machine "which interactive
 * Cursor CLI sessions exist right now, in which folders, and what is each
 * doing?" — so every visible Cursor Project key repaints from a single
 * bounded snapshot instead of each key shelling out for itself.
 *
 * Shape of a scan: `pgrep` narrows to candidate pids, one targeted `ps`
 * reads their argv and parent, one batched `lsof` maps each to its working
 * directory and chat store, and the newest transcript tail supplies the
 * working/idle verdict. Every external command runs with an absolute path
 * (Stream Deck gives plugins a minimal PATH) and `UTF8_ENV` (its environment
 * has no LANG, and the C locale mangles non-ASCII output).
 *
 * The snapshot carries a `status`. When any probe FAILS the scan reports
 * `unknown` and downgrades remembered sessions rather than serving a
 * confident, stale answer — a key that focuses the wrong terminal window is
 * worse than a key that admits it doesn't know.
 *
 * A session that is present but not yet IDENTIFIABLE is a different thing and
 * is not a failure: it is returned with an empty `sessionId`, and `status`
 * stays `ok`. Conflating the two made one unprompted session gray out every
 * Cursor key on the machine.
 *
 * Privacy: transcripts contain the operator's prompts and command text. Only
 * a bounded tail is read, only `type`/`role` are parsed out of it, and no
 * transcript content is ever returned or logged.
 *
 * A caller on the press path that needs the machine's state right now, not a
 * poll-old shared one, passes `{ fresh: true }` (see {@link CursorScanOptions}).
 * `fresh` does NOT bump `generation` — it answers one caller's "right now"
 * without retroactively declaring every OTHER in-flight scan stale. Two
 * publish guards cooperate, each closing a different gap: `generation` is an
 * explicit invalidation epoch (bumped by {@link invalidateCursorScan}, so a
 * scan started before an invalidation can never publish after one started
 * following it), while a monotonic start-sequence counter orders scans
 * WITHIN the same epoch by which one started later — see the exact guarantee
 * documented at its declaration, which mirrors claude-scan.ts.
 */
const TIMEOUT_MS = 4000;
/** Shared across every poller; deliberately LESS than the pollers' own
 * interval (2500ms) so each action's tick still lands on a genuinely fresh
 * scan rather than always inheriting one a neighbour happened to trigger a
 * moment earlier. Raising this above the poll period would halve the
 * effective refresh rate — do not "fix" it. */
const WORLD_TTL_MS = 2000;
/** Enough to hold the last turn's records; bounds how much prompt text is
 * ever paged in. A record larger than the window yields unparsable fragments,
 * which the state parser treats as no evidence rather than as a verdict. */
const TAIL_BYTES = 256 * 1024;
const PROJECT_BATCH = 32;
let cache = null;
let inFlight$1 = null;
/** Bumped by every invalidation. A scan carries the generation it started in
 * and declines to publish its result if that generation has since moved on —
 * without it, a slow scan begun before a press could land AFTER the press's
 * fresh scan and leave the cache holding older data. */
let generation$1 = 0;
/**
 * Monotonic start-sequence guard, on top of `generation`: two scans in the
 * SAME generation (e.g. two `fresh` scans, or two ordinary concurrent ones)
 * still need ordering by which one started later — `generation` alone is
 * silent on that.
 *
 * EXACT GUARANTEE (mirrors claude-scan.ts): a scan that started earlier can
 * never overwrite the result of one that started later. It does NOT
 * guarantee the cache holds the latest observation of the world — a long
 * scan that started later still wins even if a faster, earlier scan finishes
 * after it. Ordered by a counter assigned at kickoff, not a `Date.now()`
 * timestamp: two scans can start in the same millisecond.
 */
let seq = 0;
let publishedSeq = 0;
/** Session id → transcript path. A session's transcript never moves, so this
 * spares the per-tick directory walk once a session has been seen. */
const transcriptPaths = new Map();
function run(file, args, exec) {
    return new Promise((resolve) => {
        exec(file, args, { timeout: TIMEOUT_MS, env: UTF8_ENV }, (error, stdout) => {
            const e = error;
            // A process cut short by the timeout is NOT reporting an exit status,
            // even though Node may still surface a numeric `code`.
            const terminated = e !== null && (e.killed === true || typeof e.signal === "string");
            const code = terminated ? null : e?.code;
            resolve({ ok: error === null, stdout: String(stdout ?? ""), exitCode: typeof code === "number" ? code : null });
        });
    });
}
/** pgrep's documented contract: exit 1 means "nothing matched" — a definite,
 * trustworthy answer. Any other non-zero exit (or a signal/timeout, which
 * surfaces as a non-numeric code) means the probe itself failed, and must NOT
 * be reported as "no Cursor sessions are running". */
function pgrepFoundNothing(result) {
    return !result.ok && result.exitCode === 1 && result.stdout.trim() === "";
}
/** Candidate discovery. Matches the installed-version path that every
 * cursor-agent process carries, whichever symlink name was typed; the strict
 * argv/tty/parent filtering happens in the pure layer. */
const PGREP_CURSOR_ARGS = ["-f", "cursor-agent/versions"];
function cursorPsArgs(pids) {
    return ["-o", "pid=,ppid=,tty=,args=", "-p", pids.join(",")];
}
function cursorLsofArgs(pids) {
    return ["-nP", "-a", "-p", pids.join(","), "-Fpcfn"];
}
function isMissing(error) {
    const code = error?.code;
    return code === "ENOENT" || code === "ENOTDIR";
}
async function findTranscriptPath(sessionId, base) {
    if (sessionId === "")
        return { status: "failed" };
    const key = `${base}\u0000${sessionId}`;
    const memo = transcriptPaths.get(key);
    if (memo !== undefined)
        return { status: "found", path: memo };
    let names;
    try {
        names = await readdir(base);
    }
    catch (error) {
        // No projects folder at all = Cursor has never run here, which is a real
        // "absent". Anything else (EACCES, EIO) is a failed probe.
        return isMissing(error) ? { status: "absent" } : { status: "failed" };
    }
    let probeFailed = false;
    for (let i = 0; i < names.length; i += PROJECT_BATCH) {
        const found = await Promise.all(names.slice(i, i + PROJECT_BATCH).map(async (name) => {
            const path = join(base, name, "agent-transcripts", sessionId, `${sessionId}.jsonl`);
            try {
                return (await stat(path)).isFile() ? path : null;
            }
            catch (error) {
                if (!isMissing(error))
                    probeFailed = true;
                return null;
            }
        }));
        for (const path of found) {
            if (path !== null) {
                transcriptPaths.set(key, path);
                return { status: "found", path };
            }
        }
    }
    // Not found, but at least one directory could not be checked — so "not
    // found" is not something we actually established.
    return probeFailed ? { status: "failed" } : { status: "absent" };
}
/**
 * Read the transcript's trailing window as COMPLETE lines, or null when the
 * file cannot be turned into usable evidence.
 *
 * The null case matters: an empty array means "this session has written
 * nothing yet", which the state parser reads as idle. A failed open/read, or a
 * window that lands entirely inside one oversized final record, must NOT be
 * allowed to masquerade as that — it is an absence of evidence, and painting a
 * confident "idle" from it would be exactly the lie this module avoids
 * elsewhere. When the head is clipped the first fragment is dropped rather
 * than handed to the parser as though it were a whole record.
 */
async function transcriptTailLines(path) {
    try {
        const fh = await open(path, "r");
        try {
            const size = (await fh.stat()).size;
            if (size === 0)
                return [];
            const window = Math.min(size, TAIL_BYTES);
            const offset = size - window;
            const buf = Buffer.alloc(window);
            await fh.read(buf, 0, window, offset);
            const text = buf.toString("utf8");
            const lines = text.split("\n");
            if (offset > 0)
                lines.shift();
            // A file not ending in a newline is mid-append: its final fragment is
            // a partial record. Left in, it fails to parse and the reader falls
            // back to the PREVIOUS record — which can be the last turn's
            // terminator, reporting "idle" just as a new turn begins.
            if (!text.endsWith("\n"))
                lines.pop();
            const usable = lines.filter((line) => line.trim() !== "");
            // A non-empty file that yielded no whole line: one record is larger
            // than the window, so the tail says nothing we can rely on.
            return usable.length === 0 ? null : usable;
        }
        finally {
            await fh.close();
        }
    }
    catch {
        return null;
    }
}
function invalidateCursorScan() {
    cache = null;
    inFlight$1 = null;
    generation$1++;
    // Do NOT reset `seq` — an in-flight scan keeps the sequence it took at entry,
    // so zeroing the counter would let it publish over a newer scan afterwards.
    // Raising the watermark locks in-flight scans out; the next scan (++seq) passes.
    publishedSeq = seq;
}
/** Where Cursor files its per-project transcripts. A parameter so tests can
 * point at a fixture tree instead of the operator's real, populated one. */
const CURSOR_PROJECTS_BASE = join(homedir(), ".cursor", "projects");
function scanCursorSnapshot(exec = execFile, projectsBase = CURSOR_PROJECTS_BASE, options = {}) {
    if (!options.fresh) {
        if (cache !== null && Date.now() - cache.at < WORLD_TTL_MS)
            return Promise.resolve(cache.snapshot);
        if (inFlight$1 !== null)
            return inFlight$1;
    }
    const mySeq = ++seq;
    const p = doScan(exec, projectsBase, generation$1, mySeq);
    inFlight$1 = p;
    void p.finally(() => { if (inFlight$1 === p)
        inFlight$1 = null; });
    return p;
}
async function doScan(exec, projectsBase, gen, mySeq) {
    const now = Date.now();
    const pgrep = await run("/usr/bin/pgrep", PGREP_CURSOR_ARGS, exec);
    if (pgrepFoundNothing(pgrep))
        return remember(now, gen, mySeq, { status: "ok", instances: [] });
    if (!pgrep.ok)
        return rememberUnknown(now, gen, mySeq);
    const pids = pgrep.stdout.split("\n").map((s) => Number.parseInt(s.trim(), 10)).filter(Number.isFinite);
    if (pids.length === 0)
        return remember(now, gen, mySeq, { status: "ok", instances: [] });
    const ps = await run("/bin/ps", cursorPsArgs(pids), exec);
    if (!ps.ok)
        return rememberUnknown(now, gen, mySeq);
    const processes = withoutWorkerChildren(parseCursorProcesses(ps.stdout).filter(isCursorProcess));
    if (processes.length === 0)
        return remember(now, gen, mySeq, { status: "ok", instances: [] });
    const lsof = await run("/usr/sbin/lsof", cursorLsofArgs(processes.map((p) => p.pid)), exec);
    if (!lsof.ok)
        return rememberUnknown(now, gen, mySeq);
    const entries = parseLsofEntries(lsof.stdout);
    let incomplete = false;
    const instances = await Promise.all(processes.map(async (process) => {
        const mine = entries.filter((e) => e.pid === process.pid);
        const cwdRaw = mine.find((e) => e.fd === "cwd")?.name ?? "";
        const chatDir = soleChatDir(mine.map((e) => e.name));
        // Without a cwd the process cannot be placed in a project at all, which
        // is a genuinely incomplete observation of a live session.
        if (cwdRaw === "") {
            incomplete = true;
            return null;
        }
        let cwd = cwdRaw;
        try {
            cwd = await realpath(cwdRaw);
        }
        catch { /* process may exit mid-scan */ }
        // PRESENT BUT UNIDENTIFIED is its own answer, not a failure. A session
        // that has never been prompted holds no chat store open (measured: a
        // freshly opened cursor-agent has zero handles under ~/.cursor/chats),
        // and one mid-switch briefly holds two. Either way the session is really
        // there — callers that only need "is an agent here and is it busy?" must
        // be able to see it, while a captured session id can never match the
        // empty one, so nothing binds to a conversation we cannot name.
        if (chatDir === "") {
            const unidentified = {
                pid: process.pid,
                tty: process.tty.startsWith("/dev/") ? process.tty : `/dev/${process.tty}`,
                cwd,
                chatDir: "",
                sessionId: "",
                state: "unknown",
            };
            return unidentified;
        }
        const sessionId = cursorSessionId(chatDir);
        const transcript = await findTranscriptPath(sessionId, projectsBase);
        // Only a SUCCESSFUL search that found nothing means "not prompted yet",
        // which is genuinely idle. A failed search is an absence of evidence.
        let state;
        if (transcript.status === "absent") {
            state = "waiting";
        }
        else if (transcript.status === "failed") {
            state = "unknown";
        }
        else {
            const lines = await transcriptTailLines(transcript.path);
            state = lines === null ? "unknown" : cursorStateFromTranscriptLines(lines);
        }
        const instance = {
            pid: process.pid,
            tty: process.tty.startsWith("/dev/") ? process.tty : `/dev/${process.tty}`,
            cwd,
            chatDir,
            sessionId,
            state,
        };
        return instance;
    }));
    return remember(now, gen, mySeq, {
        status: incomplete ? "unknown" : "ok",
        instances: instances.filter((i) => i !== null),
    });
}
function remember(at, gen, mySeq, snapshot) {
    // Still return the snapshot to whoever awaited THIS scan; just don't let a
    // superseded scan become the cached view of the world. Two independent
    // checks: `gen` catches an EXPLICIT invalidation happening in between;
    // `mySeq` catches two scans of the SAME generation finishing out of start
    // order (see the module header for why both are needed).
    if (gen !== generation$1)
        return snapshot;
    if (mySeq < publishedSeq)
        return snapshot;
    cache = { at, snapshot };
    publishedSeq = mySeq;
    // Sessions come and go; keep the memo from growing without bound.
    if (transcriptPaths.size > 64) {
        const live = new Set(snapshot.instances.map((i) => i.sessionId));
        for (const memoKey of [...transcriptPaths.keys()]) {
            const id = memoKey.slice(memoKey.indexOf("\u0000") + 1);
            if (!live.has(id))
                transcriptPaths.delete(memoKey);
        }
    }
    return snapshot;
}
function rememberUnknown(at, gen, mySeq) {
    const stale = cache?.snapshot.instances.map((instance) => ({ ...instance, state: "unknown" })) ?? [];
    return remember(at, gen, mySeq, { status: "unknown", instances: stale });
}

/**
 * WHAT IT'S FOR: one question, asked once — "which coding-agent sessions are
 * running right now, and what is each one doing?" — answered in a single
 * vocabulary regardless of whether the agent is Claude Code, Codex, or Cursor.
 * The AI Project key talks to this and never to the three per-agent scanners
 * underneath it.
 *
 * This module is deliberately an ADAPTER, not a fourth scanner. The three
 * existing scanners (`claude-scan`, `codex-scan`, `cursor-scan`) keep all the
 * hard-won detection logic and are reused untouched, so there is no second
 * implementation to drift out of step and their existing tests keep guarding
 * it. What lives here is only the translation into {@link AgentInstance} and
 * the honest reconciliation of three different notions of "state".
 *
 * Two asymmetries are real and are handled explicitly rather than papered over:
 *
 *   - **Claude's state is not derivable from process facts alone.** Codex and
 *     Cursor each write a log their scanner reads, so their scanner returns a
 *     finished verdict. Claude's depends on its terminal title, its transcript,
 *     and whether a shell tool is still running — so this module needs the
 *     caller to hand it the tmux pane titles it cannot see for itself.
 *   - **Only Codex reports being blocked.** Claude and Cursor reveal an
 *     approval prompt on screen and nowhere else, so a "blocked" verdict for
 *     those two is added by the caller from a terminal scrape, and is
 *     unavailable outside tmux. See `blockedEvidenceFor` in `agent-project`.
 *
 * Scanning is per-kind on purpose: a key that has already captured its agent
 * asks for exactly one kind, so the steady-state cost is identical to the old
 * dedicated keys. Only the capture gesture pays for all three.
 *
 * The three per-kind branches run CONCURRENTLY (`Promise.all`), each kind's
 * `failedKinds` contribution computed entirely inside its own branch and only
 * merged afterward — so a Codex probe failing can never contaminate Claude's
 * or Cursor's own trustworthiness, whether the branches finish in order or not.
 *
 * FRESH-SCAN CONTRACT: `{ fresh: true }` (see {@link ScanAgentsOptions}) is
 * for a caller on the press path that needs the machine's state right now,
 * not whatever the shared 2s cache happens to hold. It is threaded straight
 * into each underlying scanner's own `fresh` option — this module adds no
 * caching of its own to bypass. The EXACT guarantee inherited from every
 * scanner beneath it: a scan that STARTED earlier can never overwrite the
 * result of one that started later (ordered by an internal start-sequence
 * counter, not a timestamp — see claude-scan.ts). It does NOT guarantee the
 * published snapshot is the single latest possible observation of the world.
 *
 * CLAUDE-STATE SELECTOR: resolving Claude's state costs a transcript read per
 * instance, which nothing else needs — Codex and Cursor's state comes free
 * from their own scanners. `claudeState` (default `"all"`) lets a caller that
 * only watches SOME Claude projects (the AI Project key, once its taught
 * targets are known) skip that read for every unwatched instance, which is
 * returned with state `"unknown"` instead. A caller that has no such
 * distinction to make (Focus tmux Window, which needs every instance's state
 * to compute a window's spark) passes nothing and gets `"all"`.
 */
/** Did the probe for THIS key's agent actually answer? Takes anything carrying
 * `failedKinds` so the action's own richer snapshot can be passed straight in. */
function kindTrusted(snapshot, kind) {
    return !snapshot.failedKinds.includes(kind);
}
function normalizeTty(tty) {
    if (tty === "" || tty === "??" || tty === "?")
        return "";
    return tty.startsWith("/dev/") ? tty : `/dev/${tty}`;
}
/**
 * Claude's verdict, assembled from the three signals its own action uses.
 * `titleWorking` is null when no pane title was available (a non-tmux host),
 * which `projectClaudeState` already treats as "fall back to transcript
 * freshness" rather than as evidence of idleness.
 *
 * Note what this deliberately CANNOT return: `blocked`. Claude keeps its idle
 * title while an approval prompt is on screen (measured), so nothing here can
 * see that — the caller supplies it from the terminal.
 */
async function computeClaudeState(cwd, paneTitle, shellBusy, projectsBase) {
    const transcript = projectsBase === undefined
        ? await newestTranscriptState(cwd)
        : await newestTranscriptState(cwd, Date.now(), projectsBase);
    const state = projectClaudeState({
        present: true,
        titleWorking: paneTitle === undefined ? null : titleWorking(paneTitle),
        transcriptAgeMs: transcript.ageMs,
        transcriptWorking: transcript.working,
        shellBusy,
    });
    // `present: true` above forecloses "none"; the narrowing is for the compiler.
    return state === "none" ? "unknown" : state;
}
async function scanCodexBranch(exec, fresh) {
    const snap = await scanCodexSnapshot(exec, fresh ? { fresh: true } : undefined);
    return {
        failed: snap.status !== "ok",
        instances: snap.instances.map((i) => ({
            kind: "codex",
            pid: i.pid,
            tty: normalizeTty(i.tty),
            cwd: i.cwd,
            sessionId: i.sessionId,
            state: i.state,
        })),
    };
}
async function scanCursorBranch(exec, fresh) {
    const snap = await scanCursorSnapshot(exec, undefined, fresh ? { fresh: true } : undefined);
    return {
        failed: snap.status !== "ok",
        instances: snap.instances.map((i) => ({
            kind: "cursor",
            pid: i.pid,
            tty: normalizeTty(i.tty),
            cwd: i.cwd,
            sessionId: i.sessionId,
            state: i.state,
        })),
    };
}
async function scanClaudeBranch(exec, fresh, paneTitles, claudeState, claudeProjectsBase) {
    const snap = await scanClaudeSnapshot(exec, fresh ? { fresh: true } : undefined);
    // Identity (kind/pid/tty/cwd) depends only on the scan, not on the pane
    // titles, so it is kicked off immediately and resolved ALONGSIDE the
    // titles promise below rather than waiting on it serially.
    const identityP = Promise.all(snap.instances.map(async (i) => {
        const tty = normalizeTty(i.tty);
        // The Codex and Cursor scanners realpath their cwd; claude-scan
        // reports lsof's raw path. Left alone, the same project reached
        // through a symlink would compare unequal across kinds and a
        // captured binding would stop matching its own session.
        let cwd = i.cwd;
        try {
            cwd = await realpath(i.cwd);
        }
        catch { /* may exit mid-scan */ }
        return { pid: i.pid, tty, cwd, rawCwd: i.cwd, shellBusy: i.shellBusy };
    }));
    // CONTRACT (A6): this must never reject. A caller's titles promise can
    // fail (a tmux probe errored) — that degrades Claude's title signal to
    // the transcript-freshness fallback, exactly today's degraded path. It
    // must never fail the whole scan just because one caller's title probe did.
    let titles;
    try {
        titles = await paneTitles;
    }
    catch {
        titles = new Map();
    }
    const identities = await identityP;
    const instances = await Promise.all(identities.map(async (id) => {
        const watched = claudeState === "all" || claudeState.has(normalizeProjectPath(id.cwd));
        const state = watched
            ? await computeClaudeState(id.rawCwd, titles.get(id.tty), id.shellBusy, claudeProjectsBase)
            : "unknown";
        return {
            kind: "claude",
            pid: id.pid,
            tty: id.tty,
            cwd: id.cwd,
            // Claude binds by project path — it has no captured session id.
            sessionId: "",
            state,
        };
    }));
    return { failed: snap.status !== "ok", instances };
}
/**
 * Every running session of the requested kinds, in one vocabulary.
 *
 * Pass `paneTitles` whenever Claude is among the kinds: without it Claude's
 * title signal is simply absent and its state falls back to transcript
 * freshness, which is coarser. Codex and Cursor ignore it entirely. May be a
 * PROMISE — the caller's own pane listing and this scan then run in the same
 * burst instead of one blocking the other (see A6 for the non-rejecting
 * contract that makes this safe).
 */
async function scanAgents(kinds, paneTitles = new Map(), exec = execFile, options = {}) {
    const wanted = new Set(kinds);
    const fresh = options.fresh === true;
    const claudeState = options.claudeState ?? "all";
    // The three per-kind branches run CONCURRENTLY — a key that has already
    // captured its agent still only pays for one, but the capture gesture
    // (which asks for all three) no longer pays for them serially.
    const [codexResult, cursorResult, claudeResult] = await Promise.all([
        wanted.has("codex") ? scanCodexBranch(exec, fresh) : null,
        wanted.has("cursor") ? scanCursorBranch(exec, fresh) : null,
        wanted.has("claude")
            ? scanClaudeBranch(exec, fresh, paneTitles, claudeState, options.claudeProjectsBase)
            : null,
    ]);
    const failedKinds = [];
    const instances = [];
    // Fixed concatenation order (codex, cursor, claude) regardless of which
    // branch actually finished first.
    for (const [kind, result] of [
        ["codex", codexResult],
        ["cursor", cursorResult],
        ["claude", claudeResult],
    ]) {
        if (result === null)
            continue;
        if (result.failed)
            failedKinds.push(kind);
        instances.push(...result.instances);
    }
    return { status: failedKinds.length > 0 ? "unknown" : "ok", failedKinds, instances };
}
/** The kinds a key must scan: just its captured one, or all three while it is
 * still untaught and any of them could be the answer to a capture. */
function kindsToScan(captured) {
    return captured === undefined ? ["claude", "codex", "cursor"] : [captured];
}
/**
 * One tmux listing carrying everything the unified key needs, because the two
 * formats already in the codebase each hold only half of it: the Codex/Cursor
 * one has the window and pane IDs required to focus a pane but no title, and
 * the Claude one has the title but identifies windows by index rather than by
 * the `@id` that `select-window` wants. Asking twice would mean two probes that
 * can disagree with each other between calls.
 */
/** ASCII unit separator. Both the session name and the pane title are
 * user-controlled and may contain `|`, which the older per-agent formats had to
 * disambiguate by hunting for an `@window`/`%pane` landmark — a session named
 * `…@x|%y…` could defeat that. tmux passes this control character through `-F`
 * untouched (verified), and neither a session name nor a title contains it in
 * practice, so the split is unambiguous rather than cleverly guessed.
 *
 * The exact guarantee, not a rounded-up one: this is framing by convention, not
 * escaping. A title containing a literal unit separator would yield too many
 * fields, and one containing a newline would split into two records; either way
 * the affected pane fails the shape check and is DROPPED. A dropped pane makes
 * its session look non-tmux — the key still works, but shows amber as
 * unavailable rather than reporting something false. */
const FS = "\u001f";
const LIST_AGENT_PANES_ARGS = [
    "list-panes",
    "-a",
    "-F",
    `#{pane_tty}${FS}#{session_name}${FS}#{window_id}${FS}#{pane_id}${FS}#{pane_active}${FS}#{window_active}${FS}#{pane_title}`,
];
/** Parse {@link LIST_AGENT_PANES_ARGS}. Positional and exact: the separator
 * cannot appear inside any field, so a line either has its seven parts or is
 * malformed. The id shapes are still checked so a garbled line is dropped
 * rather than turned into a plausible-looking pane target. */
function parseAgentPanes(output) {
    const panes = [];
    for (const raw of output.split("\n")) {
        const line = raw.trim();
        if (line === "")
            continue;
        const f = line.split(FS);
        if (f.length !== 7)
            continue; // malformed — skipped, never guessed at
        if (!f[2].startsWith("@") || !f[3].startsWith("%"))
            continue;
        panes.push({
            tty: f[0],
            session: f[1],
            windowId: f[2],
            paneId: f[3],
            receivesKeys: f[4] === "1" && f[5] === "1",
            title: f[6],
        });
    }
    return panes;
}
/** tty -> title, for feeding Claude's title signal into {@link scanAgents}. */
function paneTitlesByTty(panes) {
    return new Map(panes.map((p) => [p.tty, p.title]));
}
/** The pane hosting a session, matched by tty. */
function agentPaneForTty(panes, tty) {
    return panes.find((p) => p.tty === tty);
}
/** Raise one pane to the front of its session. Deliberately defined here rather
 * than borrowed from the per-agent modules: those carry the superseded actions
 * and are slated for deletion, and the unified key must not depend on them. */
function agentTmuxFocusArgs(pane, clientTty) {
    const commands = [];
    if (clientTty !== "")
        commands.push(["switch-client", "-c", clientTty, "-t", pane.session]);
    commands.push(["select-window", "-t", pane.windowId]);
    commands.push(["select-pane", "-t", pane.paneId]);
    return commands;
}
/** Capture one pane's VISIBLE screen — no scrollback. An approval prompt is on
 * screen for exactly as long as it is waiting, so history adds nothing but the
 * risk of matching a prompt that was already answered. */
function captureAgentPaneArgs(paneId) {
    return ["capture-pane", "-p", "-t", paneId];
}
/**
 * Does any coding agent in this tmux WINDOW have work in flight?
 *
 * The Focus tmux Window key answers "take me to that window", so it wants one
 * bit about the whole window rather than per-session detail: is something in
 * there still going, or is it all sitting idle? Panes are matched to sessions
 * by tty — never by `pane_current_command`, which is how the older Claude-only
 * check worked and why it could not see Cursor at all (cursor-agent presents as
 * `node`, not `cursor`).
 *
 * The exact guarantee: `working` means at least one agent in the window is
 * mid-turn. `waiting` means agents are present and none is KNOWN to be
 * computing — which includes a session whose state could not be read at all, so
 * `waiting` here is "present, not known to be busy" rather than a positive
 * claim of idleness. Callers must not pass instances from a failed probe. Note what
 * that folds together — an agent BLOCKED on your approval reports `waiting`
 * here, because it is indeed not computing, and this key has no amber to spend:
 * amber belongs to the AI Project key, which is bound to one exact session and
 * can say whose approval is wanted. Less information, not wrong information.
 *
 * Structurally typed over panes so it works with either tmux listing format.
 */
function agentSparkForWindow(instances, panes, session, windowName) {
    const ttys = new Set(panes.filter((p) => p.session === session && p.windowName === windowName).map((p) => p.tty));
    if (ttys.size === 0)
        return "none";
    let present = false;
    for (const i of instances) {
        if (!ttys.has(i.tty))
            continue;
        present = true;
        if (i.state === "working")
            return "working";
    }
    return present ? "waiting" : "none";
}
/** Every running session of one kind sitting in one project folder. */
function agentInstancesFor(instances, kind, project) {
    const target = normalizeProjectPath(project);
    return instances.filter((i) => i.kind === kind && normalizeProjectPath(i.cwd) === target);
}
/**
 * Resolve the key's target session.
 *
 * A captured session id is BINDING: if that exact session is gone the answer is
 * "no target", never a neighbour that happens to share the folder — sending the
 * operator's window focus to a conversation they never captured is worse than
 * showing nothing. Claude has no session id (it binds by folder), so for Claude
 * a lone session is unambiguous and two or more are not.
 */
function selectAgentInstance(instances, kind, project, sessionId) {
    // An empty sessionId means two different things, and conflating them is a
    // hole: on the KEY it means "nothing captured", but on an INSTANCE it means
    // "we can see this session but cannot name its conversation". For a kind
    // that has conversation ids, an unnameable session must never be selectable
    // at all — otherwise capturing one would store an empty binding that
    // afterwards adopts whichever sole session happens to sit in that folder,
    // which is exactly the neighbour-adoption this function exists to prevent.
    const mine = agentInstancesFor(instances, kind, project)
        .filter((i) => !bindsBySession(kind) || i.sessionId !== "");
    if (sessionId !== "") {
        const matches = mine.filter((i) => i.sessionId === sessionId);
        return matches.length === 1 ? matches[0] : null;
    }
    return mine.length === 1 ? mine[0] : null;
}
/** Does this agent give its conversations a stable id? Codex and Cursor do, so
 * a key binds to one exact session. Claude Code does not, so its keys bind by
 * project folder and a folder with two Claude sessions is simply ambiguous. */
function bindsBySession(kind) {
    return kind !== "claude";
}

const POLL_MS$4 = 2500;
/**
 * One live key for one coding-agent session, whichever agent that is.
 *
 * Supersedes the three per-agent keys. Hold it for half a second while Claude
 * Code, Codex, or Cursor is frontmost and it works out which of the three it is
 * looking at, then behaves exactly as the dedicated key did: blue while a turn
 * runs, amber when the agent is waiting on you, white at an idle prompt, and
 * the bar lit when your keystrokes would reach that exact session.
 */
let AiProject = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.aiproject" })];
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
        lastImage = new Map();
        refresher = new CoalescedRunner(() => this.doRefreshAll());
        timer;
        spin = 0;
        tick = 0;
        interesting = true;
        async onWillAppear(ev) {
            if (!ev.action.isKey())
                return;
            this.visible.set(ev.action.id, ev.action);
            if (this.timer === undefined) {
                this.timer = setInterval(() => {
                    if (shouldPollThisTick(this.tick++, this.interesting))
                        void this.refreshAll();
                }, POLL_MS$4);
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
                void this.capture(ev.action).catch((error) => streamDeck.logger.error(`AI Project capture failed: ${String(error)}`));
            });
        }
        async onKeyUp(ev) {
            if (!this.gate.up(ev.action.id))
                return;
            await runExclusive("iterm-focus", () => this.focus(ev.action));
        }
        /** Every visible key with its settings, read exactly once per tick. */
        async readKeys() {
            return Promise.all([...this.visible.values()].map(async (key) => ({ key, settings: await key.getSettings() })));
        }
        /** The kinds this tick must scan, derived from the SAME settings read that
         * will paint the keys — reading twice invites a key whose agent changed in
         * between being painted from a snapshot that never scanned its kind. */
        wantedKinds(entries) {
            const kinds = new Set();
            for (const { settings } of entries) {
                if (settings.agent === undefined)
                    return kindsToScan(undefined);
                kinds.add(settings.agent);
            }
            return [...kinds];
        }
        /**
         * One parallel probe burst instead of a chain: panes, clients, and the
         * frontmost app all start together; the focused-tty AppleScript (which
         * used to run strictly AFTER the frontmost-app probe, and after that the
         * whole agent scan) is chained off the frontmost-app result INSIDE its own
         * branch, so it overlaps the scan instead of adding to its latency. Pane
         * titles are handed to {@link scanAgents} as a PROMISE for the same
         * reason: Claude's working/idle marker lives in the terminal title, so the
         * scan still needs it, but listing panes and scanning no longer serialize.
         */
        async snapshot(kinds, opts = {}) {
            const tmux = findTmuxPath();
            const panesP = runTmux(LIST_AGENT_PANES_ARGS, tmux);
            const clientsP = runTmux(LIST_CLIENTS_ARGS, tmux);
            const frontP = runJxa(FRONT_APP_BUNDLE_JXA);
            // CONTRACT (A6): must never reject — a failed pane listing degrades
            // Claude's title signal to the transcript fallback, never the scan.
            const titlesP = panesP
                .then((r) => (r.ok ? paneTitlesByTty(parseAgentPanes(r.stdout)) : new Map()))
                .catch(() => new Map());
            const agentsP = scanAgents(kinds, titlesP, undefined, { fresh: opts.fresh, claudeState: opts.claudeState });
            const focusedTtyP = frontP.then(async (front) => {
                const frontBundle = front.ok ? front.stdout.trim() : "";
                if (frontBundle === ITERM_BUNDLE_ID)
                    return (await runAppleScript(ITERM_FOCUSED_TTY_SCRIPT)).stdout.trim();
                if (frontBundle === TERMINAL_BUNDLE_ID)
                    return (await runAppleScript(TERMINAL_FOCUSED_TTY_SCRIPT)).stdout.trim();
                return "";
            });
            const [panesResult, clientsResult, front, focusedTty, agents] = await Promise.all([
                panesP, clientsP, frontP, focusedTtyP, agentsP,
            ]);
            const panes = panesResult.ok ? parseAgentPanes(panesResult.stdout) : [];
            const frontBundle = front.ok ? front.stdout.trim() : "";
            return {
                instances: agents.instances,
                panes,
                clientTtys: parseClientTtys(clientsResult.stdout),
                frontBundle,
                focusedTty,
                scanStatus: agents.status,
                failedKinds: agents.failedKinds,
                clientsOk: clientsResult.ok,
                panesOk: panesResult.ok,
            };
        }
        refreshAll() { return this.refresher.request(); }
        async canonicalProject(project) {
            const normalized = normalizeProjectPath(expandHome(project, homedir()));
            try {
                return await realpath(normalized);
            }
            catch {
                return normalized;
            }
        }
        /**
         * Is this session holding for the operator? Only asked when the terminal is
         * the ONLY place that answer exists — Codex records it in its own log and so
         * never needs scraping, and outside tmux there is no screen we can read.
         *
         * `captured` is a Map of PROMISES, not settled results (A4/6d.3): per-key
         * bodies now run concurrently, so two keys can race to ask for the same
         * pane in the same tick — storing the promise lets the second one share
         * the first one's in-flight capture instead of firing a duplicate.
         */
        async blockedOnApproval(kind, host, pane, tmux, captured, panesOk, clientsOk) {
            if (pane === undefined) {
                // A4: "no pane" is ambiguous by itself — see the pure decision this
                // defers to for why panesOk/clientsOk tell it apart from a genuine
                // pane-listing failure.
                return blockedProbeForMissingPane(kind, panesOk, clientsOk);
            }
            if (blockedEvidenceFor(kind, host) !== "terminal")
                return "clear";
            // Several keys can watch the same pane; capture it once per tick.
            let shotP = captured.get(pane.paneId);
            if (shotP === undefined) {
                shotP = runTmux(captureAgentPaneArgs(pane.paneId), tmux).then((result) => {
                    if (!result.ok)
                        streamDeck.logger.warn(`AI Project: capture-pane failed for ${pane.paneId}: ${result.stderr}`);
                    return { ok: result.ok, text: result.stdout };
                });
                captured.set(pane.paneId, shotP);
            }
            const shot = await shotP;
            // A probe that errored has NOT told us the agent is unblocked.
            if (!shot.ok)
                return "failed";
            return paneShowsAgentPrompt(kind, shot.text) ? "blocked" : "clear";
        }
        async doRefreshAll() {
            if (this.visible.size === 0)
                return;
            const entries = await this.readKeys();
            const kinds = this.wantedKinds(entries);
            // Canonicalize each DISTINCT raw project string once (a home-dir
            // realpath, cheap but not free) — doing it per key duplicated the work
            // across every key sharing a project, and doing it AFTER the scan (as
            // this used to) meant the watched-Claude-project set below could not
            // exist yet when the scan needed it.
            const rawProjects = [...new Set(entries.map((e) => (e.settings.project ?? "").trim()))];
            const canonicalByRaw = new Map(await Promise.all(rawProjects.map(async (raw) => [raw, await this.canonicalProject(raw)])));
            // Claude alone pays for a transcript read per instance (F4); spend it
            // only on projects a visible key is actually watching. A key bound to
            // Codex or Cursor gets its state for free from the scan itself.
            const watchedClaudeProjects = new Set();
            for (const { settings } of entries) {
                if (settings.agent !== "claude")
                    continue;
                const raw = (settings.project ?? "").trim();
                if (raw === "")
                    continue;
                const canonical = canonicalByRaw.get(raw);
                if (canonical !== undefined && canonical !== "")
                    watchedClaudeProjects.add(normalizeProjectPath(canonical));
            }
            const snap = await this.snapshot(kinds, { claudeState: watchedClaudeProjects });
            const tmux = findTmuxPath();
            this.spin++;
            // One capture-pane per pane per tick, however many keys watch it,
            // shared via its PROMISE — see blockedOnApproval.
            const captured = new Map();
            const blockedProbes = [];
            // Per-key bodies run CONCURRENTLY (F5): each does its own setImage,
            // guarded by the existing lastImage dedupe.
            await Promise.all(entries.map(async ({ key, settings }) => {
                const kind = settings.agent;
                const project = canonicalByRaw.get((settings.project ?? "").trim()) ?? "";
                const sessionId = (settings.sessionId ?? "").trim();
                const mine = kind !== undefined && project !== "" ? agentInstancesFor(snap.instances, kind, project) : [];
                const instance = kind === undefined ? null : selectAgentInstance(snap.instances, kind, project, sessionId);
                const pane = instance === null ? undefined : agentPaneForTty(snap.panes, instance.tty);
                let host = "";
                let hot = false;
                if (instance !== null && pane !== undefined) {
                    host = "tmux";
                    hot = pane.receivesKeys && snap.focusedTty !== "" && (snap.clientTtys.get(pane.session) ?? []).includes(snap.focusedTty);
                }
                else if (instance !== null && instance.tty === snap.focusedTty) {
                    hot = true;
                    host = snap.frontBundle === TERMINAL_BUNDLE_ID ? "terminal" : "iterm";
                }
                const blockedProbe = instance !== null && kind !== undefined
                    ? await this.blockedOnApproval(kind, host, pane, tmux, captured, snap.panesOk, snap.clientsOk)
                    : "clear";
                blockedProbes.push(blockedProbe);
                const state = decideAgentFace({
                    hasTarget: kind !== undefined && project !== "",
                    matchCount: mine.length,
                    instanceState: instance?.state ?? null,
                    // Only this key's own agent matters: an unrelated kind's probe
                    // failing must not gray out a key whose agent was scanned fine.
                    scanStatus: kind !== undefined && kindTrusted(snap, kind) ? "ok" : "unknown",
                    hasCapturedId: sessionId !== "",
                    blockedProbe,
                });
                const image = svgToDataUri(buildAgentProjectKeyImage({
                    kind: kind ?? "claude",
                    project: kind === undefined ? "hold to teach" : project || "no target",
                    host,
                    hot,
                    state,
                    spin: this.spin,
                }));
                if (this.lastImage.get(key.id) === image)
                    return;
                try {
                    await key.setImage(image);
                    this.lastImage.set(key.id, image);
                }
                catch (error) {
                    streamDeck.logger.debug(`AI Project image skipped: ${String(error)}`);
                }
            }));
            // Computed AFTER the per-key pass (F7): needs this tick's blocked-probe
            // verdicts, which only exist once every key has been evaluated.
            this.interesting = agentTickInteresting({
                focusedTty: snap.focusedTty,
                instances: snap.instances,
                blockedProbes,
            });
        }
        async raiseTty(tty) {
            if (await processRunning("iTerm2")) {
                const result = await runAppleScript(buildITermRaiseScript(tty));
                if (result.ok) {
                    const focus = parseITermFocusResult(result.stdout);
                    if (focus.status === "ok")
                        return true;
                    if (focus.status === "timeout") {
                        streamDeck.logger.warn(`AI Project iTerm focus timed out: window=${focus.windowId || "?"} tty=${focus.tty || "?"}`);
                        return false;
                    }
                }
            }
            if (await processRunning(TERMINAL_PROCESS_NAME)) {
                const result = await runAppleScript(buildTerminalRaiseScript(tty));
                if (result.ok && result.stdout.includes("ok"))
                    return true;
            }
            return false;
        }
        async focus(key) {
            const settings = await key.getSettings();
            const kind = settings.agent;
            const project = await this.canonicalProject((settings.project ?? "").trim());
            if (kind === undefined || project === "") {
                await key.showAlert();
                return;
            }
            // A3: settings are what capture() commits, so they are the single source
            // of truth for what this key targets — there used to be a second,
            // separately-written `paintedSession` map read here instead, and making
            // the per-key refresh loop concurrent (above) turned its race with
            // doRefreshAll's writes into a real bug: a refresh that read a key's
            // settings before a capture committed could overwrite paintedSession
            // AFTERWARDS, and focus() would prefer that stale value over the
            // freshly captured one. Reading settings directly has no such race.
            const expected = (settings.sessionId ?? "").trim();
            // `fresh: true` asks every scanner for the machine's state right now,
            // bypassing their shared ~2s caches (and Claude's separate 60s cwd
            // memo) — without it this would act on a view of the world up to a
            // poll old and could raise a window for a session that has already
            // exited. `claudeState: new Set()` skips Claude's transcript read
            // entirely: a raise only needs to know WHICH session is still there,
            // not whether it is working, so there is nothing to buy by paying for
            // that read on the press path.
            const snap = await this.snapshot([kind], { fresh: true, claudeState: new Set() });
            if (!kindTrusted(snap, kind)) {
                streamDeck.logger.warn("AI Project: agent scan unavailable; refusing stale focus.");
                await key.showAlert();
                return;
            }
            const instance = selectAgentInstance(snap.instances, kind, project, expected);
            if (instance === null || (expected !== "" && instance.sessionId !== expected)) {
                streamDeck.logger.warn(`AI Project: ${kind} target missing or ambiguous for ${project}.`);
                await key.showAlert();
                return;
            }
            const pane = agentPaneForTty(snap.panes, instance.tty);
            if (pane !== undefined) {
                const clientTtys = snap.clientTtys.get(pane.session) ?? [];
                const clientTty = chooseClientTty(clientTtys, snap.focusedTty);
                if (clientTty === null) {
                    streamDeck.logger.warn(`AI Project: tmux session ${pane.session} has no attached client.`);
                    await key.showAlert();
                    return;
                }
                if (!(await this.raiseTty(clientTty))) {
                    await key.showAlert();
                    return;
                }
                const tmux = findTmuxPath();
                for (const args of agentTmuxFocusArgs(pane, clientTty)) {
                    const result = await runTmux(args, tmux);
                    if (!result.ok) {
                        streamDeck.logger.error(`AI Project tmux ${args[0]} failed: ${result.stderr}`);
                        await key.showAlert();
                        return;
                    }
                }
            }
            else if (!(await this.raiseTty(instance.tty))) {
                await key.showAlert();
                return;
            }
            await key.showOk();
            setTimeout(() => void this.refreshAll(), 450);
        }
        /**
         * Work out which agent the operator is looking at. The frontmost terminal
         * reports the tty of its focused session; under tmux that is the CLIENT's
         * tty, not the agent's, so it is translated through the attached session to
         * whichever pane would receive keystrokes.
         */
        resolveCapture(snap) {
            // tmux FIRST. A client's tty is the terminal's own, so an agent that was
            // started in that terminal and then suspended (Ctrl-Z, then `tmux
            // attach`) still owns the tty — and would otherwise be captured in
            // preference to the agent actually on screen in the active pane.
            for (const [session, clientTtys] of snap.clientTtys) {
                if (!clientTtys.includes(snap.focusedTty))
                    continue;
                const pane = snap.panes.find((p) => p.session === session && p.receivesKeys);
                return pane === undefined ? null : agentForFocusedTty(snap.instances, pane.tty);
            }
            // Not a tmux client: the frontmost terminal hosts the agent directly. A
            // tty CAN still host two agents — one launched from inside another's
            // terminal inherits it — so more than one match is ambiguous, not a
            // choice to make on the operator's behalf.
            return agentForFocusedTty(snap.instances, snap.focusedTty);
        }
        async capture(key) {
            // Capture must consider every kind — this is the one gesture that does
            // not yet know which agent it is dealing with.
            // Capture must consider every kind, and every kind must have answered:
            // binding to the wrong agent is not recoverable by looking again.
            // `fresh: true` asks the machine now rather than acting on a snapshot
            // up to a poll old.
            const snap = await this.snapshot(kindsToScan(undefined), { fresh: true });
            if (snap.scanStatus !== "ok" || snap.focusedTty === "") {
                await key.showAlert();
                return;
            }
            // tmux is clearly alive (it listed panes) but would not list its clients,
            // so the client->pane translation below cannot run. Falling back to the
            // raw tty would reintroduce exactly the miscapture that translation
            // exists to prevent: a suspended agent sharing the terminal's tty.
            if (!snap.clientsOk && snap.panes.length > 0) {
                streamDeck.logger.warn("AI Project: tmux listed panes but not clients; refusing an ambiguous capture.");
                await key.showAlert();
                return;
            }
            const instance = this.resolveCapture(snap);
            if (instance === null) {
                await key.showAlert();
                return;
            }
            // Refuse a capture that would not survive its own first refresh. Claude
            // has no session id, so two Claude sessions in one folder are
            // indistinguishable afterwards: storing the binding would flash "ok" and
            // then leave the key permanently ambiguous. Better to decline the gesture
            // than to accept it and quietly not work.
            // Compare using the SAME canonical form refresh will use, or the guard
            // tests an identity the key never actually looks up.
            const project = await this.canonicalProject(instance.cwd);
            if (selectAgentInstance(snap.instances, instance.kind, project, instance.sessionId) === null) {
                streamDeck.logger.warn(`AI Project: refusing capture — ${instance.kind} in ${instance.cwd} cannot be told apart from another session there.`);
                await key.showAlert();
                return;
            }
            const settings = await key.getSettings();
            await key.setSettings({ ...settings, agent: instance.kind, project, sessionId: instance.sessionId });
            await key.showOk();
            await this.refreshAll();
        }
    });
    return _classThis;
})();

const POLL_MS$3 = 2500;
/** Live key for one interactive Cursor CLI session/project. */
let CursorProject = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.cursorproject" })];
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
        lastImage = new Map();
        /** Session identity the last refresh RESOLVED for this key (set even if the
         * subsequent setImage was skipped). A press treats it as a hint only — focus()
         * revalidates it against a fresh scan before acting. */
        paintedSession = new Map();
        refresher = new CoalescedRunner(() => this.doRefreshAll());
        timer;
        spin = 0;
        tick = 0;
        interesting = true;
        async onWillAppear(ev) {
            if (!ev.action.isKey())
                return;
            this.visible.set(ev.action.id, ev.action);
            if (this.timer === undefined) {
                this.timer = setInterval(() => {
                    if (shouldPollThisTick(this.tick++, this.interesting))
                        void this.refreshAll();
                }, POLL_MS$3);
            }
            await this.refreshAll();
        }
        onWillDisappear(ev) {
            this.gate.cancel(ev.action.id);
            this.visible.delete(ev.action.id);
            this.lastImage.delete(ev.action.id);
            this.paintedSession.delete(ev.action.id);
            if (this.visible.size === 0 && this.timer !== undefined) {
                clearInterval(this.timer);
                this.timer = undefined;
            }
        }
        onKeyDown(ev) {
            this.gate.down(ev.action.id, () => {
                void this.capture(ev.action).catch((error) => streamDeck.logger.error(`Cursor Project capture failed: ${String(error)}`));
            });
        }
        async onKeyUp(ev) {
            if (!this.gate.up(ev.action.id))
                return;
            await runExclusive("iterm-focus", () => this.focus(ev.action));
        }
        async snapshot() {
            const tmux = findTmuxPath();
            const [cursor, panesResult, clientsResult, front] = await Promise.all([
                scanCursorSnapshot(),
                runTmux(LIST_CODEX_PANES_ARGS, tmux),
                runTmux(LIST_CLIENTS_ARGS, tmux),
                runJxa(FRONT_APP_BUNDLE_JXA),
            ]);
            const frontBundle = front.ok ? front.stdout.trim() : "";
            let focusedTty = "";
            if (frontBundle === ITERM_BUNDLE_ID)
                focusedTty = (await runAppleScript(ITERM_FOCUSED_TTY_SCRIPT)).stdout.trim();
            else if (frontBundle === TERMINAL_BUNDLE_ID)
                focusedTty = (await runAppleScript(TERMINAL_FOCUSED_TTY_SCRIPT)).stdout.trim();
            return {
                instances: cursor.instances,
                panes: panesResult.ok ? parseCodexPanes(panesResult.stdout) : [],
                clientTtys: parseClientTtys(clientsResult.stdout),
                frontBundle,
                focusedTty,
                scanStatus: cursor.status,
            };
        }
        /** A snapshot taken deliberately fresh, for the moment a press acts on it —
         * the cached one may be up to a poll old, and a window raise must not be
         * aimed at a session that has since exited or moved. */
        freshSnapshot() {
            invalidateCursorScan();
            return this.snapshot();
        }
        refreshAll() { return this.refresher.request(); }
        async canonicalProject(project) {
            const normalized = normalizeProjectPath(expandHome(project, homedir()));
            try {
                return await realpath(normalized);
            }
            catch {
                return normalized;
            }
        }
        /**
         * Is this session holding for the operator's approval? Nothing Cursor
         * writes to disk separates that from ordinary work, so the terminal itself
         * is the only evidence — which means the answer is available for
         * tmux-hosted sessions only. Anything unrecognised leaves the state as
         * `working`, so a wording change can never manufacture a false alarm.
         */
        async blockedOnApproval(pane, tmux) {
            const result = await runTmux(capturePaneArgs(pane.paneId), tmux);
            if (!result.ok) {
                streamDeck.logger.debug(`Cursor Project: capture-pane failed for ${pane.paneId}: ${result.stderr}`);
                return false;
            }
            return paneShowsApprovalPrompt(result.stdout);
        }
        async doRefreshAll() {
            if (this.visible.size === 0)
                return;
            const snap = await this.snapshot();
            const tmux = findTmuxPath();
            this.spin++;
            this.interesting = snap.focusedTty !== "" || snap.instances.some((i) => i.state === "working");
            for (const key of this.visible.values()) {
                const settings = await key.getSettings();
                const project = await this.canonicalProject((settings.project ?? "").trim());
                const mine = project ? cursorInstancesForProject(snap.instances, project) : [];
                const instance = selectCursorInstance(mine, project, (settings.sessionId ?? "").trim());
                if (instance === null)
                    this.paintedSession.delete(key.id);
                else
                    this.paintedSession.set(key.id, instance.sessionId);
                const pane = instance === null ? undefined : paneForTty(snap.panes, instance.tty);
                let host = "";
                let hot = false;
                if (instance !== null && pane !== undefined) {
                    host = "tmux";
                    hot = pane.receivesKeys && snap.focusedTty !== "" && (snap.clientTtys.get(pane.session) ?? []).includes(snap.focusedTty);
                }
                else if (instance !== null && instance.tty === snap.focusedTty) {
                    hot = true;
                    host = snap.frontBundle === TERMINAL_BUNDLE_ID ? "terminal" : "iterm";
                }
                // Scraping the pane costs a tmux call, so only ask when the answer could
                // change the face: an in-flight turn hosted in a pane we can read.
                const blockedOnPane = instance !== null && instance.state === "working" && pane !== undefined
                    && await this.blockedOnApproval(pane, tmux);
                const state = decideCursorFace({
                    hasTarget: project !== "",
                    matchCount: mine.length,
                    instanceState: instance?.state ?? null,
                    scanStatus: snap.scanStatus,
                    hasCapturedId: (settings.sessionId ?? "").trim() !== "",
                    blockedOnPane,
                });
                const image = svgToDataUri(buildCursorProjectKeyImage({ project: project || "no target", host, hot, state, spin: this.spin }));
                if (this.lastImage.get(key.id) === image)
                    continue;
                try {
                    await key.setImage(image);
                    this.lastImage.set(key.id, image);
                }
                catch (error) {
                    streamDeck.logger.debug(`Cursor Project image skipped: ${String(error)}`);
                }
            }
        }
        async raiseTty(tty) {
            if (await processRunning("iTerm2")) {
                const result = await runAppleScript(buildITermRaiseScript(tty));
                if (result.ok) {
                    const focus = parseITermFocusResult(result.stdout);
                    if (focus.status === "ok")
                        return true;
                    if (focus.status === "timeout") {
                        streamDeck.logger.warn(`Cursor Project iTerm focus timed out: window=${focus.windowId || "?"} tty=${focus.tty || "?"}`);
                        return false;
                    }
                }
            }
            if (await processRunning(TERMINAL_PROCESS_NAME)) {
                const result = await runAppleScript(buildTerminalRaiseScript(tty));
                if (result.ok && result.stdout.includes("ok"))
                    return true;
            }
            return false;
        }
        async focus(key) {
            const settings = await key.getSettings();
            const project = await this.canonicalProject((settings.project ?? "").trim());
            if (project === "") {
                await key.showAlert();
                return;
            }
            const expected = this.paintedSession.get(key.id) ?? (settings.sessionId ?? "");
            const snap = await this.freshSnapshot();
            if (snap.scanStatus !== "ok") {
                streamDeck.logger.warn("Cursor Project: process scan unavailable; refusing stale focus.");
                await key.showAlert();
                return;
            }
            const instance = selectCursorInstance(snap.instances, project, expected);
            if (instance === null || (expected !== "" && instance.sessionId !== expected)) {
                streamDeck.logger.warn(`Cursor Project: target missing or ambiguous for ${project}.`);
                await key.showAlert();
                return;
            }
            const pane = paneForTty(snap.panes, instance.tty);
            if (pane !== undefined) {
                const clientTtys = snap.clientTtys.get(pane.session) ?? [];
                const clientTty = chooseClientTty(clientTtys, snap.focusedTty);
                if (clientTty === null) {
                    streamDeck.logger.warn(`Cursor Project: tmux session ${pane.session} has no attached client.`);
                    await key.showAlert();
                    return;
                }
                if (clientTtys.length > 1)
                    streamDeck.logger.debug(`Cursor Project: chose ${clientTty} from ${clientTtys.length} clients for ${pane.session}.`);
                if (!(await this.raiseTty(clientTty))) {
                    await key.showAlert();
                    return;
                }
                const tmux = findTmuxPath();
                for (const args of codexTmuxFocusArgs(pane, clientTty)) {
                    const result = await runTmux(args, tmux);
                    if (!result.ok) {
                        streamDeck.logger.error(`Cursor Project tmux ${args[0]} failed: ${result.stderr}`);
                        await key.showAlert();
                        return;
                    }
                }
            }
            else if (!(await this.raiseTty(instance.tty))) {
                await key.showAlert();
                return;
            }
            await key.showOk();
            setTimeout(() => void this.refreshAll(), 450);
        }
        async capture(key) {
            const snap = await this.freshSnapshot();
            if (snap.scanStatus !== "ok" || snap.focusedTty === "") {
                await key.showAlert();
                return;
            }
            let instance = snap.instances.find((i) => i.tty === snap.focusedTty);
            if (instance === undefined) {
                for (const [session, clientTtys] of snap.clientTtys) {
                    if (!clientTtys.includes(snap.focusedTty))
                        continue;
                    const pane = snap.panes.find((p) => p.session === session && p.receivesKeys);
                    if (pane !== undefined)
                        instance = snap.instances.find((i) => i.tty === pane.tty);
                    break;
                }
            }
            if (instance === undefined) {
                await key.showAlert();
                return;
            }
            const settings = await key.getSettings();
            await key.setSettings({ ...settings, project: instance.cwd, sessionId: instance.sessionId });
            this.paintedSession.set(key.id, instance.sessionId);
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
    // Coding-agent spark (top-right): blue and slowly rotating while WORKING,
    // still signal-white when idle, absent when no agent runs in the window.
    // Covers Claude Code, Codex and Cursor — the caller matches panes to agents
    // by tty, so it is not fooled by cursor-agent presenting as `node`.
    // Drawn as paths — no font-fallback risk.
    //
    // Blue, not amber, so ONE colour language holds across every key that
    // outlives this release: blue = working (leave it alone), amber = stopped
    // and waiting on you (go here now), white = idle at the prompt. Amber for
    // "busy" here and amber for "needs you" on the AI Project key would be the
    // worst kind of clash — the two call for opposite actions.
    let spark = "";
    if (claude !== "none") {
        const color = claude === "working" ? "#4E9CFF" : "#F2FFF6";
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
            spark += `<circle cx="${ox}" cy="${oy}" r="1.7" fill="#4E9CFF"/>`;
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
        tick = 0; // interval counter for the adaptive idle gate
        /** Last tick saw a frontmost terminal / hot key / working Claude. */
        interesting = true;
        lastImage = new Map(); // skip identical repaints
        async onWillAppear(ev) {
            if (!ev.action.isKey())
                return;
            this.visible.set(ev.action.id, ev.action);
            if (this.timer === undefined) {
                this.timer = setInterval(() => {
                    // Idle gate: when nothing is hot/working and no terminal is
                    // frontmost, poll at a quarter cadence — the full subprocess
                    // set spent most of its CPU watching nothing change.
                    if (shouldPollThisTick(this.tick++, this.interesting))
                        void this.refreshAll();
                }, POLL_MS$2);
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
            await runExclusive("iterm-focus", () => this.focus(ev.action));
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
                const frontP = runJxa(FRONT_APP_BUNDLE_JXA);
                // Chained off `front` so it overlaps the rest of this burst instead of
                // running strictly after it. Only address iTerm when it is frontmost
                // — AppleScript would LAUNCH it.
                const focusedTtyP = frontP.then(async (front) => {
                    if (!(front.ok && front.stdout.trim() === ITERM_BUNDLE_ID))
                        return "";
                    return (await runAppleScript(ITERM_FOCUSED_TTY_SCRIPT)).stdout.trim();
                });
                const [front, windowsRes, clientsRes, panesRes, instances, focusedTty, otherAgents] = await Promise.all([
                    frontP,
                    runTmux(LIST_WINDOWS_ARGS, tmux),
                    runTmux(LIST_CLIENTS_ARGS, tmux),
                    runTmux(LIST_PANE_TTYS_ARGS, tmux),
                    scanClaudeInstances(),
                    focusedTtyP,
                    // Codex and Cursor, via the shared adapter, started in the SAME
                    // burst rather than after it. Claude is deliberately NOT requested
                    // here: its own path below is richer (it upgrades a ✳ idle title to
                    // "working" from a backgrounded shell or a transcript that owes the
                    // next turn), and duplicating it would be a second opinion that
                    // could disagree with itself.
                    scanAgents(["codex", "cursor"]),
                ]);
                const iTermFrontmost = front.ok && front.stdout.trim() === ITERM_BUNDLE_ID;
                let anyInteresting = iTermFrontmost;
                const windows = windowsRes.ok ? parseWindows(windowsRes.stdout) : [];
                const clients = parseClients(clientsRes.stdout);
                const panes = panesRes.ok ? parsePaneTtys(panesRes.stdout) : [];
                const busyTtys = new Set(instances.filter((i) => i.shellBusy).map((i) => i.tty));
                const ttyToCwd = new Map(instances.map((i) => [i.tty, i.cwd]));
                const transcriptWorking = new Map(); // cwd -> working, deduped per tick
                for (const key of this.visible.values()) {
                    const settings = await key.getSettings();
                    const status = evaluateKeyStatus({
                        windows,
                        clients,
                        target: (settings.target ?? "").trim(),
                        iTermFrontmost,
                        focusedTty,
                    });
                    let claude = status.state === "unknown"
                        ? "none"
                        : claudeStateForWindow(panes, status.session, status.window);
                    // A ✳ title only means "no tool executing" — Claude also shows it
                    // while BREWING (awaiting the model after a prompt/tool result).
                    // Upgrade waiting→working when a backgrounded shell runs, or when
                    // this window's Claude transcript shows it owing the next turn.
                    if (claude === "waiting") {
                        if (windowShellBusy(panes, status.session, status.window, busyTtys)) {
                            claude = "working";
                        }
                        else {
                            for (const cwd of windowClaudeCwds(panes, status.session, status.window, ttyToCwd)) {
                                let working = transcriptWorking.get(cwd);
                                if (working === undefined) {
                                    working = (await newestTranscriptState(cwd)).working;
                                    transcriptWorking.set(cwd, working);
                                }
                                if (working) {
                                    claude = "working";
                                    break;
                                }
                            }
                        }
                    }
                    // Whatever Claude concluded, a Codex or Cursor session in the same
                    // window can still be mid-turn — and for a window with no Claude in
                    // it at all this is the only signal there is.
                    // Only layer when those probes actually answered. A failed scan
                    // returns nothing, which would otherwise read as "no agent here"
                    // and quietly retract a spark that belongs there.
                    if (claude !== "working" && status.state !== "unknown" && otherAgents.status === "ok") {
                        const other = agentSparkForWindow(otherAgents.instances, panes, status.session, status.window);
                        if (other === "working")
                            claude = "working";
                        else if (claude === "none" && other === "waiting")
                            claude = "waiting";
                    }
                    if (status.state === "hot" || claude === "working")
                        anyInteresting = true;
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
                this.interesting = anyInteresting;
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
            const ttys = parseClientTtys(clientsResult.stdout).get(match.session) ?? [];
            const front = await runJxa(FRONT_APP_BUNDLE_JXA);
            const focusedTty = front.ok && front.stdout.trim() === ITERM_BUNDLE_ID
                ? (await runAppleScript(ITERM_FOCUSED_TTY_SCRIPT)).stdout.trim()
                : "";
            const tty = chooseClientTty(ttys, focusedTty);
            if (tty === null) {
                streamDeck.logger.warn(`Focus tmux: session ${match.session} has no attached client.`);
                await key.showAlert();
                return;
            }
            if (ttys.length > 1)
                streamDeck.logger.debug(`Focus tmux: chose ${tty} from ${ttys.length} clients for ${match.session}.`);
            const raise = await runAppleScript(buildITermRaiseScript(tty));
            const focus = raise.ok ? parseITermFocusResult(raise.stdout) : { status: "error", windowId: "", tty: "" };
            if (!raise.ok || focus.status !== "ok") {
                streamDeck.logger.error(`iTerm focus failed (${raise.code}/${focus.status}): window=${focus.windowId || "?"} tty=${focus.tty || "?"} ${raise.stderr}`);
                await key.showAlert();
                return;
            }
            // Optionally switch tmux to the exact window (default on).
            if (settings.switchWindow !== false) {
                const selected = await runTmux(switchClientToWindowArgs(match.session, match.index, tty), tmux);
                if (!selected.ok) {
                    streamDeck.logger.error(`tmux switch-client failed: ${selected.stderr || "no server?"}`);
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
 * WHAT IT'S FOR: the FIRST-CHOICE route for the Paste Snippet key's two
 * gestures — reading and writing the frontmost app's actual text-control
 * selection through the Accessibility API (`AXSelectedText`), via System
 * Events. Its whole reason to exist is that `clipboard-snippet.ts`'s ⌘C/⌘V
 * route, while universal, ALWAYS touches the system clipboard — displacing
 * whatever the operator had copied, and racing their clipboard manager
 * (CopyBug) over who writes last. Confirmed live in iTerm2 (`AXSelectedText`
 * present, real selection text returned): when an app exposes its selection
 * this way, neither gesture needs to touch the clipboard at all. Confirmed
 * ALSO live that Safari and ChatGPT's web content do not expose
 * `AXSelectedText` on their focused element at all — for those, and anything
 * else that doesn't support it, the clipboard route in `clipboard-snippet.ts`
 * remains the fallback. This module only decides "can accessibility help
 * here right now," and if so, does the read/write; the fallback wiring lives
 * in the action (`../actions/paste-snippet.ts`).
 *
 * ASK, DON'T INFER. A naive version would just try to read `AXSelectedText`
 * and treat any thrown error as "unsupported." That's wrong: reading a
 * missing/unset attribute raises DIFFERENT AppleEvent errors in different
 * states (-1700 "can't make some data into the expected type", -1728
 * "can't get object", and sometimes no error at all with an empty result) —
 * there's no reliable way to tell "this app doesn't support selections" apart
 * from "it supports them and none is selected" by pattern-matching a thrown
 * error. So {@link READ_SELECTION_SCRIPT} asks the question directly instead:
 * it fetches the focused element's attribute NAMES and checks whether
 * `"AXSelectedText"` is even in the list, before ever trying to read its
 * value. Only once presence is confirmed does an empty/missing value get
 * reported as "nothing is selected" (`nosel`) rather than "not supported"
 * (`unsupported`) — and that distinction is exactly what the routing rule
 * below depends on.
 *
 * FRAMING (read): a short status word on the FIRST LINE — `ok`, `unsupported`,
 * `nosel`, or `err|<n>` — and, for `ok` only, EVERYTHING after the first
 * newline is the selection text, verbatim. Deliberately not base64: a
 * previous attempt tried `do shell script "..." with input` (not a real
 * AppleScript form) and separately assumed `Buffer.from(x, "base64")` throws
 * on malformed input, which it does not — a try/catch "safety net" around it
 * would have been dead code. Status-line framing needs no such net: it is
 * verified (this module's tests, plus a real `osascript` run while building
 * it) to survive quotes, backslashes, tabs, `|`, embedded newlines, accented
 * characters and emoji. Only the single trailing newline `osascript` itself
 * appends is stripped — the payload is never trimmed beyond that, because
 * trimming would eat leading/trailing whitespace the operator actually
 * selected.
 *
 * ERROR NUMBERS ONLY CROSS THE BOUNDARY. AppleScript's `errMsg` can quote the
 * very content a script failed on (e.g. while trying to set a value); neither
 * script ever returns it, and neither this module nor its caller ever logs
 * it. Only `errNum` (an OS-level integer) and status words travel back.
 *
 * THE WRITE SIDE TAKES THE TEXT ONLY AS ARGV. {@link WRITE_SELECTION_SCRIPT}
 * reads `item 1 of argv` inside `on run argv` — never interpolated into the
 * script source — via {@link runAppleScriptWithArgs}, the one mechanism in
 * this codebase where arguments are delivered as data a script must opt into
 * reading, never as code.
 */
/**
 * AppleScript: ask whether the frontmost app's focused UI element exposes
 * `AXSelectedText` at all, and if so, read it. See the module header for why
 * this asks rather than infers from a failed read.
 */
const READ_SELECTION_SCRIPT = `try
	tell application "System Events"
		set frontProc to first application process whose frontmost is true
		tell frontProc
			try
				set theElement to value of attribute "AXFocusedUIElement"
			on error
				return "unsupported"
			end try
			if theElement is missing value then return "unsupported"
			try
				set attrNames to name of attributes of theElement
			on error
				return "unsupported"
			end try
			if attrNames does not contain "AXSelectedText" then return "unsupported"
			try
				set theText to value of attribute "AXSelectedText" of theElement
			on error
				return "nosel"
			end try
			if theText is missing value then return "nosel"
			if theText is "" then return "nosel"
			return "ok" & linefeed & theText
		end tell
	end tell
on error errMsg number errNum
	return "err|" & errNum
end try`;
/** Strip only the single trailing newline `osascript` appends to every
 * result — never more. Trimming further would eat whitespace that is part
 * of an actual selection. */
function stripTrailingNewline(raw) {
    return raw.endsWith("\n") ? raw.slice(0, -1) : raw;
}
/** Parse {@link READ_SELECTION_SCRIPT}'s raw stdout. See the module header
 * for the exact framing this depends on. */
function parseAxRead(rawOutput) {
    const output = stripTrailingNewline(rawOutput);
    const firstNewline = output.indexOf("\n");
    const head = firstNewline === -1 ? output : output.slice(0, firstNewline);
    if (head === "unsupported")
        return { status: "unsupported" };
    if (head === "nosel")
        return { status: "nosel" };
    const err = /^err\|(-?\d+)$/.exec(head);
    if (err)
        return { status: "error", code: Number(err[1]) };
    if (head === "ok") {
        // The script's framing guarantees a payload line after "ok", even
        // though it can never be empty (an empty/missing selection is framed
        // as "nosel", not "ok" with nothing after it). No payload line at all
        // means the output is garbled — never treated as a successful read.
        if (firstNewline === -1)
            return { status: "malformed" };
        return { status: "ok", text: output.slice(firstNewline + 1) };
    }
    return { status: "malformed" };
}
/**
 * Run {@link READ_SELECTION_SCRIPT} and parse its result. A failure at the
 * `osascript` process level itself (distinct from the script's own
 * try/catch, which already turns every internal failure into a framed
 * status word) is reported as `malformed` — there is no error NUMBER to
 * carry in that case, only the runner's own classification, which is logged
 * directly since it is already sanitized (`classifyError` never carries the
 * AppleScript message).
 */
async function captureViaAx(deps) {
    const result = await deps.runAppleScript(READ_SELECTION_SCRIPT);
    if (!result.ok) {
        deps.log?.(`ax-read: osascript failed (code=${result.code})`);
        return { status: "malformed" };
    }
    const parsed = parseAxRead(result.stdout);
    if (parsed.status === "malformed") {
        deps.log?.("ax-read: unparseable output");
    }
    else if (parsed.status === "error") {
        deps.log?.(`ax-read: script reported error ${parsed.code}`);
    }
    return parsed;
}
/**
 * THE FALLBACK RULE, as a pure function over an {@link AxReadResult} — no
 * I/O, so it's testable without a single mock. Exact mapping:
 *   - `ok` -> `use-ax` (the clipboard is never touched).
 *   - everything else (`unsupported`, `nosel`, `error`, `malformed`) ->
 *     `fall-back` to the clipboard capture.
 *
 * Only a SUCCESSFUL read skips the clipboard; see the comment in the body for
 * why `nosel` in particular is a fall-back and not a refusal.
 */
function decideCaptureRoute(ax) {
    // ONLY a successful read skips the clipboard. Everything else falls back,
    // including `nosel`.
    //
    // `nosel` used to mean "accessibility can see selections here and there
    // isn't one", so firing ⌘C was assumed pointless. MEASURED ON THE REAL
    // MACHINE: iTerm2 reports `nosel` even with text selected — the attribute
    // exists and stays empty — while ⌘C copies that selection perfectly. So the
    // old rule blocked the one mechanism that worked. A ⌘C with nothing
    // selected is harmless (the pasteboard does not move and we report
    // no-copy); refusing to try is not.
    return ax.status === "ok" ? "use-ax" : "fall-back";
}

/**
 * Pure logic for the "Paste Snippet" key: the BUTTON is the storage. Press
 * pastes the stored text at the cursor; holding it (the shared PressGate
 * long-press gesture) copies whatever's currently selected into the key
 * instead; the key face previews what's stored. Everything here is pure (no
 * child_process, no Stream Deck SDK) so the size cap and the masked/visible
 * default are unit-tested in isolation. The actual macOS mechanics — sending
 * ⌘C/⌘V and reading/writing `NSPasteboard` deliberately, on purpose, without
 * ever restoring what was on it before — live in `clipboard-snippet.ts`.
 */
/** Hard cap on stored snippet size, in BYTES (not characters) — a 32 KiB
 * plaintext blob is already generous for a "paste this" key, and refusing
 * over-cap content is safer than silently truncating it (a truncated paste
 * is a corrupted paste). */
const MAX_SNIPPET_BYTES = 32_768;
/** True when `content`'s UTF-8 byte length is within {@link MAX_SNIPPET_BYTES}
 * (inclusive). Byte length, not `.length` — a string well under 32,768
 * *characters* can still exceed the cap once multi-byte UTF-8 is counted. */
function withinSizeCap(content) {
    return Buffer.byteLength(content, "utf8") <= MAX_SNIPPET_BYTES;
}
const PREVIEW_MAX_LINES = 3;
const PREVIEW_LINE_WIDTH = 10;
/** Length and slicing in CODE POINTS, not UTF-16 units: `"👍".length` is 2, so a
 * width-based slice can cut an emoji in half and render replacement characters
 * on the key. */
function chars(text) {
    return Array.from(text);
}
function cut(text, n) {
    return chars(text).slice(0, n).join("");
}
/** Truncate one row to {@link PREVIEW_LINE_WIDTH}, matching the codebase's
 * existing label-truncation convention (`truncate()` in tmux-window.ts):
 * cut to width-1 plus a trailing "…" so the row still signals "there's more"
 * without silently growing past the key face. */
function truncateRow(line) {
    // Code points, like wrapWords — `.length`/`.slice` count UTF-16 units and
    // would cut an emoji in half on the multi-line path.
    return chars(line).length > PREVIEW_LINE_WIDTH ? `${cut(line, PREVIEW_LINE_WIDTH - 1)}…` : line;
}
/**
 * Reduce arbitrary snippet text to up to 3 rows of up to 10 characters each,
 * for the key-face preview. Tabs collapse to a single space and carriage
 * returns are stripped before splitting on "\n"; blank lines are dropped
 * (leading or otherwise) rather than shown as gaps.
 *
 * A single non-empty line with no newlines WRAPS across the available rows
 * (consecutive 10-char slices) instead of being shown once and cut off; if
 * more of it exists than 3 rows can hold, the last row ends in "…". With more
 * than one non-empty line, the first 3 are shown as-is (each individually
 * truncated to the row width, with its own "…" when it didn't fit) — any
 * lines beyond the third are dropped, with the third row ending in "…" so the
 * face never implies the snippet is only as long as what fits.
 *
 * Deterministic: the same input always maps to the same rows, which is what
 * the tests pin down.
 */
function previewLines(content) {
    const normalized = content.replace(/\t/g, " ").replace(/\r/g, "");
    const nonEmpty = normalized
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    if (nonEmpty.length === 0)
        return [];
    if (nonEmpty.length === 1)
        return wrapWords(nonEmpty[0]);
    const shown = nonEmpty.slice(0, PREVIEW_MAX_LINES).map(truncateRow);
    // Say so when lines were dropped. Cutting silently at three rows makes a
    // 200-line snippet look like a 3-line one, and the operator's only cue that
    // the key holds more would be pasting it somewhere to find out.
    if (nonEmpty.length > PREVIEW_MAX_LINES) {
        const last = shown[shown.length - 1];
        shown[shown.length - 1] = last.endsWith("…") ? last : `${cut(last, PREVIEW_LINE_WIDTH - 1).trimEnd()}…`;
    }
    return shown;
}
/**
 * Wrap one line across the key face, breaking at SPACES where it can.
 *
 * Slicing every PREVIEW_LINE_WIDTH characters is simpler but reads badly at key
 * size: "npm run build" became "npm run bu" / "ild", which is harder to
 * recognise at a glance than the text it is previewing. Breaking on words gives
 * "npm run" / "build". A single word longer than the line is still hard-broken
 * — there is nowhere else to break it — and anything past the last line is cut
 * by one character to make room for the ellipsis.
 */
function wrapWords(line) {
    const rows = [];
    let rest = line;
    while (rest.length > 0 && rows.length < PREVIEW_MAX_LINES) {
        if (chars(rest).length <= PREVIEW_LINE_WIDTH) {
            rows.push(rest);
            rest = "";
            break;
        }
        // Prefer the last space that still fits; fall back to a hard break for
        // a single over-long word.
        const window = cut(rest, PREVIEW_LINE_WIDTH + 1);
        const breakAt = chars(window).lastIndexOf(" ");
        const take = breakAt > 0 ? breakAt : PREVIEW_LINE_WIDTH;
        rows.push(cut(rest, take).trimEnd());
        rest = chars(rest).slice(take).join("").trimStart();
    }
    if (rest.length > 0 && rows.length > 0) {
        const last = rows[rows.length - 1];
        rows[rows.length - 1] = `${cut(last, Math.max(0, PREVIEW_LINE_WIDTH - 1)).trimEnd()}…`;
    }
    return rows;
}
/**
 * Which face this key should paint.
 *
 * Empty content shows the teach hint. Otherwise the real text is previewed —
 * that is the point of the key face, and it is what the operator asked for.
 * `mask` replaces it with dots plus a character count for keys that hold
 * something they would rather not have readable across the room; it is opt-in
 * and applies whether the text was captured or typed. Provenance (`source` on
 * the action's settings) deliberately plays no part — see the note there.
 */
function resolveSnippetFace(settings) {
    const content = settings.content ?? "";
    // Checked before anything else: an over-cap snippet is unusable whether or
    // not it is masked, and the face must say so rather than preview text the
    // key will refuse to paste.
    if (!withinSizeCap(content))
        return { kind: "over-cap", bytes: Buffer.byteLength(content, "utf8") };
    // Only genuinely absent content shows the teach hint. A snippet of spaces
    // or newlines is real text the operator captured on purpose — showing the
    // "hold to teach" face for it would claim the key is untaught when it is not.
    if (content === "")
        return { kind: "empty" };
    // The preview shows the real text by default, whatever its provenance.
    // Captured text used to default to MASKED on the theory that an accidental
    // capture shouldn't be readable on a desk device — but the operator's whole
    // reason for a preview is seeing what the key holds, and a row of dots
    // answers the wrong question. Masking is now opt-in per key.
    const masked = settings.mask ?? false;
    if (masked)
        return { kind: "masked", chars: content.length };
    const lines = previewLines(content);
    // Whitespace-only content previews as no rows at all. Painting that would
    // give a blank key indistinguishable from a broken one.
    if (lines.length === 0)
        return { kind: "blank", chars: content.length };
    return { kind: "preview", lines };
}
const INK = "#0F1211";
const TEAL = "#3EC9C4"; // files family, matching Open File's jack-line
const SIGNAL = "#F2FFF6";
const MUTED = "#8B9490";
const WARN = "#E8B14C"; // the amber used for "needs you" elsewhere on the deck
const PREVIEW_ROW_Y = [22, 36, 50];
// A FIXED bullet string, never derived from the real content — the masked
// face must not leak line count, line length, or anything else about what's
// stored, only the character count printed below it.
const MASK_ROW = "••••••••••";
function jackLine() {
    return `<rect x="8" y="62.5" width="56" height="3.5" rx="1.75" fill="${TEAL}" opacity="0.95"/>`;
}
/** A dimmed clipboard outline, used for the empty face. */
function clipboardGlyph(color) {
    return (
    // Sized to end well above the hint's baseline (y=53). The first version ran to
    // y=52 and the hint printed straight through it.
    `<rect x="24" y="12" width="24" height="28" rx="4" fill="none" stroke="${color}" stroke-width="3"/>` +
        `<rect x="30" y="8" width="12" height="6" rx="2" fill="${color}"/>`);
}
/**
 * Build the 72×72 key-face SVG for the given face. Hex colours only — the
 * KEY rasterizer (unlike the touchscreen pixmap pipeline) paints `hsl()` as
 * solid black. Any real snippet text (the preview lines) is XML-escaped;
 * the masked face never touches the real content at all, by construction.
 */
function buildSnippetKeyImage(face) {
    let body;
    if (face.kind === "empty") {
        body =
            clipboardGlyph(MUTED) +
                `<text x="36" y="53" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
                `font-size="9" fill="${MUTED}">hold to teach</text>`;
    }
    else if (face.kind === "masked") {
        const rows = PREVIEW_ROW_Y.map((y) => `<text x="36" y="${y}" text-anchor="middle" font-family="Menlo, Monaco, monospace" ` +
            `font-size="10" fill="${SIGNAL}">${MASK_ROW}</text>`).join("");
        body =
            rows +
                `<text x="36" y="60" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
                `font-size="8" fill="${MUTED}">${face.chars} ch</text>`;
    }
    else if (face.kind === "over-cap") {
        body =
            `<text x="36" y="30" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
                `font-size="10" fill="${WARN}">too big</text>` +
                `<text x="36" y="44" text-anchor="middle" font-family="Menlo, Monaco, monospace" ` +
                `font-size="9" fill="${MUTED}">${Math.round(face.bytes / 1024)} KB</text>` +
                `<text x="36" y="57" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
                `font-size="8" fill="${MUTED}">shorten it</text>`;
    }
    else if (face.kind === "blank") {
        body =
            clipboardGlyph(TEAL) +
                `<text x="36" y="53" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ` +
                `font-size="8" fill="${MUTED}">whitespace · ${face.chars} ch</text>`;
    }
    else {
        body = face.lines
            .map((line, i) => `<text x="36" y="${PREVIEW_ROW_Y[i]}" text-anchor="middle" font-family="Menlo, Monaco, monospace" ` +
            `font-size="10" fill="${SIGNAL}">${escapeXml(line)}</text>`)
            .join("");
    }
    return (`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
        `<rect width="72" height="72" fill="${INK}"/>${body}${jackLine()}</svg>`);
}

/**
 * WHAT IT'S FOR: capturing the operator's current text selection into the
 * "Paste Snippet" key, and pasting it back out — through the system
 * clipboard, on purpose.
 *
 * This is the FALLBACK route. The first choice, tried before any of this
 * runs, is `ax-text.ts`'s Accessibility route (`AXSelectedText` on the
 * frontmost app's focused element) — it never touches the clipboard at all,
 * confirmed live in iTerm2. This module exists because that route isn't
 * universal: Safari and ChatGPT's web content don't expose `AXSelectedText`
 * on their focused element at all (probed live — Safari's focused element
 * exposed 42 Accessibility attributes, and that wasn't one of them). The
 * routing decision itself (`decideCaptureRoute`/`decideInsertRoute` in
 * `ax-text.ts`) lives outside this module; this module is just what runs
 * once that decision says "fall back."
 *
 * So this module goes through ⌘C / ⌘V — but explicitly WITHOUT saving and
 * restoring whatever was on the clipboard before. The operator said plainly
 * that this key changing the clipboard is fine. That one decision is what
 * makes the rest of this simple: no snapshot-and-restore, no race against a
 * clipboard manager over who gets to write last, no "restore clobbered an
 * image I had copied." Capture leaves the just-copied text on the clipboard;
 * insert leaves the snippet on the clipboard. Neither ever restores anything.
 *
 * Both directions go through small, single-purpose AppleScript/JXA scripts,
 * run via the shared osascript runner (`../applescript/runner.js`). Every one
 * of them has been extracted and actually executed against a real Mac while
 * writing this module — this is not "should work," it is "was run."
 *
 * Two rules hold throughout, because breaking either leaks the operator's
 * text into a place it must never go:
 *   - Snippet/clipboard text is NEVER interpolated into a script. It travels
 *     only as a JXA process's STDIN (write) or as a script's stdout (read) —
 *     never spliced into source, never passed as an argv element either (argv
 *     has a real OS length ceiling a 32 KiB snippet can approach).
 *   - No selection text, snippet text, preview, or AppleScript/JXA error
 *     MESSAGE ever reaches a call to `log`. Only outcome codes, byte counts,
 *     and (non-secret) OS-level numbers — a changeCount, a bundle id — are
 *     logged. An AppleScript error message can quote the content it failed
 *     on, which is exactly why only error NUMBERS survive
 *     (`classifyError` in `../applescript/runner.js`), never the message.
 *
 * FRAMING, used by every script that returns non-trivial data: a short status
 * word (plus, where useful, a piece of non-secret numeric context) on the
 * FIRST LINE; for the one status that carries a payload, EVERYTHING after the
 * first newline is that payload, verbatim. Deliberately not base64: the
 * payload is arbitrary user text, so any in-band delimiter could occur inside
 * it, whereas "before the first newline" is the one thing the status word
 * itself cannot do. Verified end to end (see the module's test suite and the
 * commands run while building this) that quotes, backslashes, tabs, `|`,
 * embedded newlines, accents and emoji all survive the round trip intact.
 *
 * KNOWN LIMITS, stated plainly:
 *   - Capture refuses when macOS itself reports Secure Input is on, and when
 *     the copied item carries `org.nspasteboard.ConcealedType` (the marker
 *     password managers use). It CANNOT recognise every secret — a field
 *     that doesn't set either signal (plenty don't) is copied like any other.
 *   - Before sending ⌘V, insert re-reads the pasteboard's changeCount and
 *     requires it to still equal the one OUR write produced. That is an exact
 *     check that nothing else has written since — not a lock: another process
 *     can still write in the instant between that read and the keystroke.
 *   - The frontmost-app check before pasting is a MITIGATION, not a
 *     guarantee: it catches the operator switching apps between our write and
 *     our ⌘V, not every way focus could move in that gap.
 *   - Nothing here can tell a genuine, isolated pasteboard change (the
 *     operator's own ⌘C) apart from some OTHER process changing the
 *     clipboard in the same instant. A clipboard manager that reacts to a
 *     copy by promptly re-touching the pasteboard (adding its own metadata)
 *     is exactly what `churn` below is for — but a change that lands in the
 *     narrow window BEFORE our own ⌘C is not distinguishable from our
 *     result, and is not detected.
 */
/** How long the capture poll waits for the ⌘C we just sent to land, in ms. */
const CAPTURE_POLL_DEADLINE_MS = 1200;
/** How often the capture poll checks the pasteboard's changeCount, in ms. */
const CAPTURE_POLL_INTERVAL_MS = 50;
/**
 * JXA: ask Carbon whether Secure Input is currently on. Refusing ONLY when
 * this affirmatively says "true" (never when the probe fails or returns
 * something unexpected) is deliberate: false alarms would make the key
 * unusable, so the rule is "refuse only when we KNOW the field is secure."
 * Verified live: `osascript -l JavaScript -e '<this>'` printed "false" in a
 * normal Terminal window.
 */
const SECURE_INPUT_PROBE_SCRIPT = `function run() {
	ObjC.import("Carbon");
	try {
		return String($.IsSecureEventInputEnabled());
	} catch (e) {
		return "probe-failed";
	}
}`;
/** JXA: read the general pasteboard's `changeCount` — a plain, non-secret
 * integer used as a before/after fingerprint. Never the pasteboard's content. */
const READ_CHANGE_COUNT_SCRIPT = `function run() {
	ObjC.import("AppKit");
	try {
		return String($.NSPasteboard.generalPasteboard.changeCount);
	} catch (e) {
		return "read-failed";
	}
}`;
/** JXA: read the frontmost application's bundle identifier — again, a plain
 * non-secret string, used only to notice "the frontmost app changed." Empty
 * output means "couldn't tell," never a real bundle id. */
const READ_FRONTMOST_BUNDLE_SCRIPT = `function run() {
	ObjC.import("AppKit");
	try {
		var bid = $.NSWorkspace.sharedWorkspace.frontmostApplication.bundleIdentifier;
		var unwrapped = ObjC.unwrap(bid);
		return unwrapped === null || unwrapped === undefined ? "" : unwrapped;
	} catch (e) {
		return "";
	}
}`;
/** AppleScript: the ⌘C the capture gesture sends. */
const COPY_KEYSTROKE_SCRIPT = `tell application "System Events" to keystroke "c" using {command down}`;
/** AppleScript: the ⌘V the insert gesture sends. Intentionally NOT executed
 * during development/verification (it would fire into whatever is
 * frontmost) — only compiled. */
const PASTE_KEYSTROKE_SCRIPT = `tell application "System Events" to keystroke "v" using {command down}`;
/**
 * JXA, given the pre-⌘C `changeCount` as `argv[0]`: poll the pasteboard
 * (every {@link CAPTURE_POLL_INTERVAL_MS}ms, up to {@link CAPTURE_POLL_DEADLINE_MS}ms)
 * until it changes, then snapshot its TYPES and TEXT together in one pass,
 * then re-read `changeCount` a third time to catch a TORN read — something
 * (our own ⌘C, or another process) changing the pasteboard again while we
 * were mid-snapshot. A single external process, not a JS-side poll loop:
 * the whole wait-then-snapshot happens inside one `osascript` invocation, so
 * there is nothing for this module's own timers to coordinate.
 *
 * Output, per the module's framing: `unchanged|<n>` (nothing changed within
 * the deadline — the ⌘C copied nothing), `churn|<n>` (changed again during
 * the snapshot — refuse, don't guess which write is real), `readfail|<n>`
 * (changed, but reading it threw), or `ok|<comma-joined types>` + LINEFEED +
 * the raw text (verbatim; empty when the pasteboard has no plain-text
 * representation at all — the JS side decides what that means).
 *
 * Verified live end-to-end: a background poll of this exact loop correctly
 * caught a real pasteboard write (including multi-byte emoji) made by a
 * second process ~150-300ms after the poll started.
 */
const CAPTURE_POLL_SCRIPT = `function run(argv) {
	ObjC.import("AppKit");
	ObjC.import("Foundation");
	var baseline = parseInt(argv[0], 10);
	var pb = $.NSPasteboard.generalPasteboard;
	var deadline = Date.now() + ${CAPTURE_POLL_DEADLINE_MS};
	var cur = pb.changeCount;
	var changed = false;
	while (Date.now() < deadline) {
		cur = pb.changeCount;
		if (cur !== baseline) { changed = true; break; }
		$.NSThread.sleepForTimeInterval(${CAPTURE_POLL_INTERVAL_MS / 1000});
	}
	if (!changed) return "unchanged|" + cur;
	var types, text;
	try {
		var nsTypes = pb.types;
		types = [];
		var count = nsTypes.count;
		for (var i = 0; i < count; i++) {
			types.push(ObjC.unwrap(nsTypes.objectAtIndex(i)));
		}
		var nsText = pb.stringForType("public.utf8-plain-text");
		text = nsText.isNil() ? null : ObjC.unwrap(nsText);
	} catch (e) {
		return "readfail|" + pb.changeCount;
	}
	var after = pb.changeCount;
	if (after !== cur) return "churn|" + after;
	return "ok|" + types.join(",") + "\\n" + (text === null ? "" : text);
}`;
/**
 * JXA, reading the snippet text from STDIN (never argv, never script
 * source): write it to the pasteboard as a `NSPasteboardItem` carrying THREE
 * representations on the same item — `public.utf8-plain-text` (the text
 * itself), plus `org.nspasteboard.ConcealedType` and
 * `org.nspasteboard.TransientType` (empty marker data; their PRESENCE, not
 * their content, is what clipboard managers and Universal Clipboard look for
 * to skip retaining/syncing an entry). Every ObjC call that can fail is
 * checked explicitly and reported as a distinct `fail-*` code — nothing here
 * assumes success.
 *
 * Verified live: after running this exact script with real UTF-8 (including
 * emoji) piped to its stdin, `pbpaste` read the text back correctly and a
 * fresh read of the pasteboard's types showed BOTH marker types present
 * alongside `public.utf8-plain-text`.
 */
const WRITE_SNIPPET_SCRIPT = `function run() {
	ObjC.import("AppKit");
	ObjC.import("Foundation");
	var nsString;
	try {
		var data = $.NSFileHandle.fileHandleWithStandardInput.readDataToEndOfFile;
		if (!data) return "fail-stdin";
		nsString = $.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding);
		if (!nsString) return "fail-decode";
	} catch (e) {
		return "fail-stdin";
	}
	try {
		var pb = $.NSPasteboard.generalPasteboard;
		var token = $.NSUUID.UUID.UUIDString.js;
		pb.clearContents;
		var item = $.NSPasteboardItem.alloc.init;
		var okText = item.setStringForType(nsString, "public.utf8-plain-text");
		if (!okText) return "fail-write-text";
		var emptyData = $.NSData.alloc.init;
		var okConcealed = item.setDataForType(emptyData, "org.nspasteboard.ConcealedType");
		if (!okConcealed) return "fail-write-concealed";
		var okTransient = item.setDataForType(emptyData, "org.nspasteboard.TransientType");
		if (!okTransient) return "fail-write-transient";
		// A per-write ownership token on a private type. changeCount alone
		// cannot prove the item on the pasteboard is OURS: reading the count
		// after writeObjects is not atomic with it, so a writer landing in
		// between yields a count that describes THEIR write and then never
		// moves again. Reading this token back identifies the item itself.
		var okToken = item.setStringForType($(token), ${JSON.stringify("com.movingavg.switchboard.snippet-token")});
		if (!okToken) return "fail-write-token";
		var wrote = pb.writeObjects($([item]));
		if (!wrote) return "fail-writeobjects";
		return "ok " + pb.changeCount + " " + token;
	} catch (e) {
		return "fail-write";
	}
}`;
/**
 * JXA: read back the ownership token written by {@link WRITE_SNIPPET_SCRIPT}.
 * Returns the token (a UUID string — never content) or "none". Run
 * immediately before ⌘V: it answers "is the item I wrote still what will be
 * pasted?", which changeCount equality alone cannot.
 */
const READ_SNIPPET_TOKEN_SCRIPT = `function run() {
	ObjC.import("AppKit");
	try {
		var pb = $.NSPasteboard.generalPasteboard;
		var value = pb.stringForType(${JSON.stringify("com.movingavg.switchboard.snippet-token")});
		if (!value) return "none";
		var js = value.js;
		return js ? js : "none";
	} catch (e) {
		return "none";
	}
}`;
/** Parse {@link SECURE_INPUT_PROBE_SCRIPT}'s output. Anything other than an
 * exact "true"/"false" is "unknown" — including a thrown/caught probe — so
 * the caller can apply "refuse only when we KNOW it's secure." */
function parseSecureInputProbe(output) {
    const trimmed = output.trim();
    if (trimmed === "true")
        return "secure";
    if (trimmed === "false")
        return "not-secure";
    return "unknown";
}
/** Parse a plain-integer script result (changeCount). Null on anything that
 * isn't exactly an integer — never coerced, never guessed. */
function parseChangeCount(output) {
    const trimmed = output.trim();
    return /^-?\d+$/.test(trimmed) ? Number(trimmed) : null;
}
/** Parse {@link READ_FRONTMOST_BUNDLE_SCRIPT}'s output. Empty means
 * "couldn't tell," represented as null so callers can't mistake it for a
 * real (if oddly empty) bundle id. */
/** Every `fail-*` code {@link WRITE_SNIPPET_SCRIPT} can return, plus the two
 * this module synthesises. An EXACT allowlist, not a pattern: a value is
 * logged because it is one of these, never because it merely looks like one. */
const WRITE_FAIL_CODES = new Set([
    "fail-stdin",
    "fail-decode",
    "fail-write-text",
    "fail-write-concealed",
    "fail-write-transient",
    "fail-write-token",
    "fail-writeobjects",
    "fail-write",
    "empty",
    "bad-changecount",
    "incomplete-write-receipt",
]);
/**
 * Reduce any string bound for a LOG LINE to a token we can prove is safe.
 *
 * WHY: every value this feature logs comes from a child process's stdout, and
 * this action's whole contract is that the operator's selection text never
 * reaches a log at any level. A `fail-*` code and a bundle id are safe to log
 * because of their SHAPE, not because of where they came from — an osascript
 * that emits a warning, a partial read, or an unexpected error puts arbitrary
 * text in the same field. Anything that is not a short, identifier-shaped,
 * dot/dash-separated token becomes "unrecognised": the log keeps its
 * diagnostic value for the codes that matter and cannot carry content.
 */
function safeLogToken(value) {
    const trimmed = value.trim();
    return /^[A-Za-z0-9][A-Za-z0-9._-]{0,47}$/.test(trimmed) ? trimmed : "unrecognised";
}
function parseBundleId(output) {
    const trimmed = output.trim();
    return trimmed === "" ? null : trimmed;
}
/** Parse {@link CAPTURE_POLL_SCRIPT}'s output. Null on anything that isn't
 * exactly one of the four framed shapes — a garbled or partial osascript
 * result must never be read as a real capture. */
function parseCapturePoll(output) {
    const body = output.endsWith("\n") ? output.slice(0, -1) : output;
    const split = body.indexOf("\n");
    const head = split === -1 ? body : body.slice(0, split);
    const unchanged = /^unchanged\|(-?\d+)$/.exec(head);
    if (unchanged)
        return { status: "unchanged", changeCount: Number(unchanged[1]) };
    const churn = /^churn\|(-?\d+)$/.exec(head);
    if (churn)
        return { status: "churn", changeCount: Number(churn[1]) };
    const readfail = /^readfail\|(-?\d+)$/.exec(head);
    if (readfail)
        return { status: "readfail", changeCount: Number(readfail[1]) };
    const ok = /^ok\|(.*)$/.exec(head);
    if (ok) {
        // "ok|..." with no LF at all is malformed — the framing guarantees a
        // payload line, even if that payload is empty.
        if (split === -1)
            return null;
        const types = ok[1] === "" ? [] : ok[1].split(",");
        return { status: "ok", types, text: body.slice(split + 1) };
    }
    return null;
}
/** Parse {@link WRITE_SNIPPET_SCRIPT}'s output: exactly "ok", or any
 * `fail-*` (or garbled/empty) reason — never partially trusted. */
function parseWriteResult(output) {
    const trimmed = output.trim();
    // A success MUST carry BOTH the changeCount the write produced and the
    // ownership token. A bare "ok" is not accepted: it would satisfy the
    // caller's success check while silently skipping the pre-⌘V ownership
    // verification those two values exist to make possible.
    const parts = /^ok (-?\d+) ([0-9A-Fa-f-]{36})$/.exec(trimmed);
    if (parts) {
        const count = Number(parts[1]);
        if (Number.isSafeInteger(count))
            return { ok: true, changeCount: count, token: parts[2] };
        return { ok: false, reason: "bad-changecount" };
    }
    if (/^ok\b/.test(trimmed))
        return { ok: false, reason: "incomplete-write-receipt" };
    // The reason is logged, so it passes through the shape check: the script's
    // own `fail-*` codes survive it, anything unexpected does not.
    // An EXACT allowlist. A shape check would pass through any identifier-shaped
    // stdout — including one that happens to be a short secret — so an
    // unexpected value is reported as "unrecognised" and the value itself is
    // dropped rather than logged.
    if (trimmed === "")
        return { ok: false, reason: "empty" };
    return { ok: false, reason: WRITE_FAIL_CODES.has(trimmed) ? trimmed : "unrecognised" };
}
async function readChangeCount(deps) {
    const result = await deps.runJxa(READ_CHANGE_COUNT_SCRIPT);
    if (!result.ok) {
        deps.log?.(`clipboard: could not read changeCount (code=${result.code})`);
        return null;
    }
    return parseChangeCount(result.stdout);
}
async function readFrontmostBundleId(deps) {
    const result = await deps.runJxa(READ_FRONTMOST_BUNDLE_SCRIPT);
    if (!result.ok) {
        deps.log?.(`clipboard: could not read the frontmost app (code=${result.code})`);
        return null;
    }
    return parseBundleId(result.stdout);
}
/**
 * Read whatever the operator just selected, for the long-press "teach the
 * button" gesture: refuse Secure Input and password-manager copies, send
 * ⌘C, wait for the pasteboard to reflect it, and validate the result before
 * ever returning it to the caller for storage. NEVER restores whatever was
 * on the clipboard before — that is intentional (see the module header) —
 * and refuses rather than stores on anything short of a confirmed, in-cap,
 * plain-text, non-concealed capture.
 */
async function captureSnippet(deps) {
    const secureResult = await deps.runJxa(SECURE_INPUT_PROBE_SCRIPT);
    if (secureResult.ok) {
        const probe = parseSecureInputProbe(secureResult.stdout);
        if (probe === "secure") {
            deps.log?.("capture: refused — Secure Input is on (a password field is likely focused)");
            return { status: "secure-input" };
        }
        if (probe === "unknown") {
            deps.log?.("capture: secure-input probe returned an unexpected result; proceeding");
        }
    }
    else {
        deps.log?.(`capture: secure-input probe failed (code=${secureResult.code}); proceeding`);
    }
    const baseline = await readChangeCount(deps);
    if (baseline === null) {
        deps.log?.("capture: refused — could not read the clipboard's baseline changeCount");
        return { status: "error", detail: "baseline-unreadable" };
    }
    const copyResult = await deps.runAppleScript(COPY_KEYSTROKE_SCRIPT);
    if (!copyResult.ok) {
        if (copyResult.code === "permission-denied") {
            deps.log?.("capture: permission-denied sending ⌘C");
            return { status: "permission-denied" };
        }
        deps.log?.(`capture: ⌘C keystroke failed (code=${copyResult.code})`);
        return { status: "error", detail: copyResult.code };
    }
    const pollResult = await deps.runJxaWithArgs(CAPTURE_POLL_SCRIPT, [String(baseline)]);
    if (!pollResult.ok) {
        if (pollResult.code === "permission-denied") {
            deps.log?.("capture: permission-denied reading the clipboard");
            return { status: "permission-denied" };
        }
        deps.log?.(`capture: poll script failed (code=${pollResult.code})`);
        return { status: "error", detail: pollResult.code };
    }
    const parsed = parseCapturePoll(pollResult.stdout);
    if (parsed === null) {
        deps.log?.("capture: refused — unparseable poll output");
        return { status: "error", detail: "unparseable" };
    }
    switch (parsed.status) {
        case "unchanged":
            deps.log?.(`capture: nothing was copied (changeCount stayed at ${parsed.changeCount})`);
            return { status: "no-selection" };
        case "churn":
            deps.log?.(`capture: refused — clipboard changed again mid-read (changeCount ${parsed.changeCount})`);
            return { status: "churn" };
        case "readfail":
            deps.log?.("capture: refused — could not read the clipboard after the copy");
            return { status: "read-fail" };
        case "ok": {
            if (parsed.types.includes("org.nspasteboard.ConcealedType")) {
                deps.log?.("capture: refused — copied item is marked concealed (likely a password manager)");
                return { status: "concealed" };
            }
            if (!parsed.types.includes("public.utf8-plain-text")) {
                deps.log?.("capture: refused — no plain text on the clipboard after the copy");
                return { status: "not-text" };
            }
            // EXACTLY empty is treated as nothing copied, not as a capture of
            // "". Storing it would overwrite the operator's existing snippet
            // with nothing — a destructive result from a gesture that found no
            // selection. Whitespace-only text is NOT empty and is kept: they
            // may well have meant to capture an indent (the blank key face
            // exists precisely to show that).
            if (parsed.text === "") {
                deps.log?.("capture: nothing was copied (the clipboard carried plain text, but it was empty)");
                return { status: "no-selection" };
            }
            if (!withinSizeCap(parsed.text)) {
                deps.log?.(`capture: refused — selection is ${Buffer.byteLength(parsed.text, "utf8")} bytes, over the size cap`);
                return { status: "too-big" };
            }
            deps.log?.(`capture: ok (${Buffer.byteLength(parsed.text, "utf8")} bytes)`);
            return { status: "ok", content: parsed.text };
        }
    }
}
/**
 * Write `content` onto the clipboard (marked concealed + transient so
 * clipboard managers and sync skip retaining it) and send ⌘V — the "press"
 * gesture. Confirms the write actually landed (changeCount advanced) before
 * ever sending the paste keystroke, and best-effort-checks the frontmost app
 * hasn't changed out from under it. Leaves the snippet on the clipboard
 * afterward — never restores anything (see the module header).
 */
async function insertSnippet(content, deps) {
    if (!withinSizeCap(content)) {
        deps.log?.(`insert: refused — content is ${Buffer.byteLength(content, "utf8")} bytes, over the size cap`);
        return { status: "too-big" };
    }
    const beforeBundle = await readFrontmostBundleId(deps);
    const beforeChangeCount = await readChangeCount(deps);
    const writeResult = await deps.runJxaWithStdin(WRITE_SNIPPET_SCRIPT, content);
    if (!writeResult.ok) {
        if (writeResult.code === "permission-denied") {
            deps.log?.("insert: permission-denied writing the clipboard");
            return { status: "permission-denied" };
        }
        deps.log?.(`insert: write script failed (code=${writeResult.code})`);
        return { status: "error", detail: writeResult.code };
    }
    const written = parseWriteResult(writeResult.stdout);
    if (!written.ok) {
        deps.log?.(`insert: refused — write reported ${written.reason}`);
        return { status: "write-failed", detail: written.reason };
    }
    const afterChangeCount = await readChangeCount(deps);
    if (beforeChangeCount === null || afterChangeCount === null || !(afterChangeCount > beforeChangeCount)) {
        deps.log?.("insert: refused — clipboard changeCount did not advance past our pre-write baseline; not sending ⌘V");
        return { status: "not-confirmed" };
    }
    // Best-effort only (see module header): only abort when BOTH reads
    // succeeded and disagree. An unreadable frontmost app on either side
    // can't tell us anything, so it doesn't block the paste.
    const afterBundle = await readFrontmostBundleId(deps);
    if (beforeBundle !== null && afterBundle !== null && beforeBundle !== afterBundle) {
        deps.log?.("insert: refused — frontmost app changed since the write (mitigation, not a guarantee)");
        return { status: "frontmost-changed" };
    }
    // Confirm OUR OWN write is still what the pasteboard holds, at the last
    // moment we can check. Everything above proves the write happened; only this proves it
    // has not since been replaced — by a clipboard manager, another app, or the
    // operator — in the window between the write and the keystroke. Without it
    // ⌘V can paste a stranger's content into wherever the cursor is.
    const nowChangeCount = await readChangeCount(deps);
    if (nowChangeCount === null || nowChangeCount !== written.changeCount) {
        deps.log?.("insert: refused — the pasteboard changed after our write; not sending ⌘V");
        return { status: "clobbered" };
    }
    // Identity, not just stability: read our own per-write token back. This is
    // what catches a writer that landed between writeObjects and our reading of
    // changeCount — their write would give us a count that then never moves,
    // passing the check above while the pasteboard holds THEIR content.
    const tokenRead = await deps.runJxa(READ_SNIPPET_TOKEN_SCRIPT);
    const token = tokenRead.ok ? tokenRead.stdout.trim() : "";
    if (token !== written.token) {
        deps.log?.("insert: refused — the pasteboard does not hold our own write; not sending ⌘V");
        return { status: "clobbered" };
    }
    const pasteResult = await deps.runAppleScript(PASTE_KEYSTROKE_SCRIPT);
    if (!pasteResult.ok) {
        if (pasteResult.code === "permission-denied") {
            deps.log?.("insert: permission-denied sending ⌘V");
            return { status: "permission-denied" };
        }
        deps.log?.(`insert: ⌘V keystroke failed (code=${pasteResult.code})`);
        return { status: "error", detail: pasteResult.code };
    }
    deps.log?.(`insert: ok (${Buffer.byteLength(content, "utf8")} bytes)`);
    return { status: "ok" };
}

const KNOWN_ERROR_NAMES = new Set([
    "Error",
    "TypeError",
    "RangeError",
    "SyntaxError",
    "ReferenceError",
    "EvalError",
    "URIError",
    "AggregateError",
    "DOMException",
]);
function errorClass(error) {
    if (error === null || error === undefined)
        return typeof error;
    // An EXACT allowlist of the built-in error types, not a shape check: a
    // class name is normally a safe identifier, but a dynamically named
    // constructor can be built from arbitrary text — and a name-shaped secret
    // would pass any pattern. Anything else logs as the useless-but-safe
    // "Error", which is the whole point of this function.
    const ctor = error.constructor;
    const name = typeof ctor?.name === "string" ? ctor.name : "";
    return KNOWN_ERROR_NAMES.has(name) ? name : error instanceof Error ? "Error" : typeof error;
}
/**
 * One key, two gestures: press inserts the stored text at the cursor; a
 * long-press (the shared PressGate gesture, 500ms) captures whatever's
 * currently selected into the key instead. The BUTTON is the storage.
 *
 * THE TWO GESTURES ROUTE DIFFERENTLY, and the asymmetry is deliberate.
 * CAPTURE tries ACCESSIBILITY FIRST — reading `AXSelectedText` on the
 * frontmost app's focused element via `mac/ax-text.ts` — because that route
 * never touches the system clipboard; it falls back to ⌘C on anything but a
 * successful read, which in practice is most places (measured: iTerm2 reports
 * "nothing selected" even when text IS selected, and Safari and ChatGPT's web
 * content don't expose the attribute at all). INSERT always uses ⌘V: the
 * accessibility WRITE was measured reporting success in iTerm2 while
 * inserting nothing, and a confident false success is worse than touching the
 * clipboard. So in practice both gestures usually do go through
 * `mac/clipboard-snippet.ts`, which deliberately does not save or restore
 * whatever was on the clipboard before (see that module's header for why).
 * The routing rules themselves — `decideCaptureRoute`/`decideInsertRoute` in
 * `ax-text.ts` — are pure and unit-tested; this shell just calls them and
 * dispatches. One route is logged per gesture (`accessibility` or
 * `clipboard`) as a plain outcome code, never with any selection/snippet
 * content.
 *
 * The face previews what's stored, however the text arrived; ticking "show
 * dots" per key replaces the preview with a character count. It also has
 * faces for the two states that would otherwise look like a broken key: text
 * with nothing printable in it, and text over the size cap (see
 * `resolveSnippetFace` in mac/snippet.ts).
 *
 * All the AppleScript/JXA plumbing — Accessibility probing, the Secure Input
 * and concealed-copy refusals, framing pasteboard/AX reads so selection text
 * can never be confused with the framing itself, and delivering text ONLY
 * via STDIN/argv so it can never become script source — lives in
 * `mac/ax-text.ts` and `mac/clipboard-snippet.ts`, tested against injected
 * dependencies. This shell is just SDK wiring: build the real dependencies,
 * call the pure orchestration, map the outcome to showOk/showAlert/log,
 * repaint.
 */
let PasteSnippet = (() => {
    let _classDecorators = [action({ UUID: "com.movingavg.switchboard.snippet" })];
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
        async onWillAppear(ev) {
            if (!ev.action.isKey())
                return;
            this.visible.set(ev.action.id, ev.action);
            // Persisted settings are INPUT, not truth: a value written by an older
            // build, restored from a profile backup, or hand-edited in the profile
            // JSON can exceed the cap.
            const settings = ev.payload.settings;
            if (!withinSizeCap(settings.content ?? "")) {
                streamDeck.logger.warn(`Paste Snippet: stored content is over the ${MAX_SNIPPET_BYTES}-byte cap; ` +
                    "this key will not paste until it is shortened in its settings.");
            }
            // The operator's data is left EXACTLY as it is in every case. Refusing
            // to use an over-cap snippet is honest; rewriting, truncating or
            // reverting their content to make the key work would destroy something
            // they may want and cannot get back. The key face says why it is inert.
            await this.repaint(ev.action, settings);
        }
        onWillDisappear(ev) {
            this.gate.cancel(ev.action.id);
            this.visible.delete(ev.action.id);
        }
        async onDidReceiveSettings(ev) {
            if (!ev.action.isKey())
                return;
            const settings = ev.payload.settings;
            const content = settings.content ?? "";
            if (!withinSizeCap(content)) {
                // Refuse to USE it, never truncate it, and never revert it: this is
                // text the operator just typed or pasted into their own settings
                // field, and silently replacing it loses work. Alert + an explicit
                // key face, then leave it to them to shorten.
                streamDeck.logger.warn(`Paste Snippet: stored content is ${Buffer.byteLength(content, "utf8")} bytes, ` +
                    `over the ${MAX_SNIPPET_BYTES}-byte cap — this key will not paste until it is shortened.`);
                await ev.action.showAlert();
            }
            await this.repaint(ev.action, settings);
        }
        onKeyDown(ev) {
            this.gate.down(ev.action.id, () => {
                void this.capture(ev.action).catch((error) => streamDeck.logger.error(`Paste Snippet: capture threw (${errorClass(error)}) — details omitted, they can carry selection text.`));
            });
        }
        async onKeyUp(ev) {
            if (!this.gate.up(ev.action.id))
                return; // long-press already fired capture()
            await this.paste(ev.action);
        }
        /** Answer the property inspector's live Accessibility-permission check. */
        async onSendToPlugin(ev) {
            await respondToAccessibilityCheck(ev.payload, import.meta.url);
        }
        deps() {
            return {
                runAppleScript: (script) => runAppleScript(script),
                runJxa: (script) => runJxa(script),
                runJxaWithArgs: (script, args) => runJxaWithArgs(script, args),
                runJxaWithStdin: (script, input) => runJxaWithStdin(script, input),
                // Content-free, structural logging only — byte counts and outcome
                // codes, never clipboard/snippet text.
                log: (message) => streamDeck.logger.warn(`Paste Snippet: ${message}`),
            };
        }
        axDeps() {
            return {
                runAppleScript: (script) => runAppleScript(script),
                runAppleScriptWithArgs: (script, args) => runAppleScriptWithArgs(script, args),
                // Content-free, structural logging only — outcome codes and OS-level
                // error NUMBERS, never selection/snippet text or an error MESSAGE.
                log: (message) => streamDeck.logger.warn(`Paste Snippet: ${message}`),
            };
        }
        /** Save a confirmed-good captured value (from either route) onto the key. */
        async saveCaptured(action, content) {
            const settings = await action.getSettings();
            const next = { ...settings, content, source: "captured" };
            await action.setSettings(next);
            await action.showOk();
            await this.repaint(action, next);
        }
        /**
         * Which app will actually receive this gesture. Logged as a bundle id —
         * an identifier, never content — because "it reported success but nothing
         * happened" is almost always this: the frontmost app at key-time is not the
         * one the operator is looking at. Clicking the key in the Stream Deck WINDOW
         * makes Stream Deck frontmost; pressing the physical deck does not.
         */
        /** The frontmost bundle id, shape-checked before it can reach a log line
         * (see safeLogToken) — it is raw child stdout like every other value here. */
        async frontmostApp() {
            const res = await runJxa(READ_FRONTMOST_BUNDLE_SCRIPT);
            if (!res.ok)
                return "";
            const trimmed = res.stdout.trim();
            return trimmed === "" ? "" : safeLogToken(trimmed);
        }
        async capture(action) {
            streamDeck.logger.info(`Paste Snippet: capture targeting frontmost=${(await this.frontmostApp()) || "unknown"}`);
            // SECURE INPUT IS CHECKED HERE, BEFORE EITHER ROUTE — not inside the
            // clipboard path. The accessibility route reads the selection directly
            // and never goes near the pasteboard, so a guard living only in the
            // clipboard code left the operator's own rule ("refuse when we KNOW the
            // field is marked secure") unenforced on exactly the path that skips it.
            // A failed probe proceeds and logs: we refuse only when we KNOW.
            const secure = await runJxa(SECURE_INPUT_PROBE_SCRIPT);
            const secureState = secure.ok ? parseSecureInputProbe(secure.stdout) : "unknown";
            if (secureState === "secure") {
                streamDeck.logger.warn("Paste Snippet: capture refused — secure input is active (a password field has focus).");
                await action.showAlert();
                return;
            }
            if (secureState === "unknown") {
                streamDeck.logger.warn("Paste Snippet: secure-input probe unavailable; proceeding (we refuse only when we KNOW).");
            }
            const axResult = await captureViaAx(this.axDeps());
            const route = decideCaptureRoute(axResult);
            if (route === "use-ax") {
                // decideCaptureRoute only returns "use-ax" for an "ok" AxReadResult.
                const text = axResult.text;
                if (!withinSizeCap(text)) {
                    streamDeck.logger.warn(`Paste Snippet: capture refused — selection exceeds the ${MAX_SNIPPET_BYTES}-byte cap.`);
                    await action.showAlert();
                    return;
                }
                streamDeck.logger.info("Paste Snippet: capture route=accessibility");
                await this.saveCaptured(action, text);
                return;
            }
            // fall-back: accessibility couldn't help here (unsupported, or we
            // couldn't tell) — go through the clipboard instead.
            const outcome = await captureSnippet(this.deps());
            switch (outcome.status) {
                case "ok":
                    streamDeck.logger.info("Paste Snippet: capture route=clipboard");
                    await this.saveCaptured(action, outcome.content);
                    return;
                case "secure-input":
                    streamDeck.logger.warn("Paste Snippet: capture refused — Secure Input is on (a password field is likely focused).");
                    await action.showAlert();
                    return;
                case "no-selection":
                    streamDeck.logger.warn("Paste Snippet: capture found nothing selected.");
                    await action.showAlert();
                    return;
                case "concealed":
                    streamDeck.logger.warn("Paste Snippet: capture refused — the copied item is marked concealed (likely a password manager copy).");
                    await action.showAlert();
                    return;
                case "not-text":
                    streamDeck.logger.warn("Paste Snippet: capture refused — no plain text was on the clipboard after the copy.");
                    await action.showAlert();
                    return;
                case "churn":
                    streamDeck.logger.warn("Paste Snippet: capture refused — the clipboard changed again while reading it.");
                    await action.showAlert();
                    return;
                case "read-fail":
                    streamDeck.logger.warn("Paste Snippet: capture refused — could not read the clipboard after the copy.");
                    await action.showAlert();
                    return;
                case "too-big":
                    streamDeck.logger.warn(`Paste Snippet: capture refused — selection exceeds the ${MAX_SNIPPET_BYTES}-byte cap.`);
                    await action.showAlert();
                    return;
                case "permission-denied":
                    streamDeck.logger.error("Paste Snippet: capture needs Accessibility access for Stream Deck.");
                    await action.showAlert();
                    return;
                case "error":
                default:
                    streamDeck.logger.error(`Paste Snippet: capture failed (${safeLogToken(outcome.detail ?? "unknown")}).`);
                    await action.showAlert();
                    return;
            }
        }
        /** Stored content is INPUT on every path, not just when it arrives. */
        async paste(action) {
            streamDeck.logger.info(`Paste Snippet: insert targeting frontmost=${(await this.frontmostApp()) || "unknown"}`);
            const settings = await action.getSettings();
            const content = settings.content ?? "";
            if (content === "") {
                await action.showAlert();
                return;
            }
            // The cap is checked here too, not only where content ARRIVES. A value
            // restored from a profile backup, written by an older build, or edited
            // into the profile JSON reaches this path without ever passing through
            // the load or settings-change checks.
            if (!withinSizeCap(content)) {
                streamDeck.logger.warn(`Paste Snippet: refusing to paste — stored content exceeds the ${MAX_SNIPPET_BYTES}-byte cap.`);
                await action.showAlert();
                return;
            }
            // Insert ALWAYS goes through the clipboard — see decideInsertRoute. The
            // accessibility write cannot be verified and was measured lying: iTerm2
            // accepted it, reported ok, and inserted nothing. A confident false
            // success is worse than touching the clipboard.
            const outcome = await insertSnippet(content, this.deps());
            switch (outcome.status) {
                case "ok":
                    streamDeck.logger.info("Paste Snippet: insert route=clipboard");
                    await action.showOk();
                    return;
                case "too-big":
                    streamDeck.logger.warn(`Paste Snippet: refusing to paste — stored content exceeds the ${MAX_SNIPPET_BYTES}-byte cap.`);
                    await action.showAlert();
                    return;
                case "write-failed":
                    streamDeck.logger.warn(`Paste Snippet: paste refused — writing the clipboard failed (${safeLogToken(outcome.detail)}).`);
                    await action.showAlert();
                    return;
                case "not-confirmed":
                    streamDeck.logger.warn("Paste Snippet: paste refused — could not confirm the clipboard write landed.");
                    await action.showAlert();
                    return;
                case "frontmost-changed":
                    streamDeck.logger.warn("Paste Snippet: paste refused — the frontmost app changed before the paste keystroke.");
                    await action.showAlert();
                    return;
                case "clobbered":
                    streamDeck.logger.warn("Paste Snippet: paste refused — something else wrote to the clipboard after us; ⌘V would have pasted that instead.");
                    await action.showAlert();
                    return;
                case "permission-denied":
                    streamDeck.logger.error("Paste Snippet: paste needs Accessibility access for Stream Deck.");
                    await action.showAlert();
                    return;
                case "error":
                default:
                    streamDeck.logger.warn(`Paste Snippet: paste failed (${safeLogToken(outcome.detail ?? "unknown")}).`);
                    await action.showAlert();
                    return;
            }
        }
        async repaint(action, settings) {
            try {
                const face = resolveSnippetFace(settings);
                await action.setImage(svgToDataUri(buildSnippetKeyImage(face)));
            }
            catch (err) {
                streamDeck.logger.debug(`Paste Snippet: key image update skipped (${errorClass(err)}).`);
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
streamDeck.actions.registerAction(new CodexProject());
streamDeck.actions.registerAction(new CursorProject());
streamDeck.actions.registerAction(new AiProject());
streamDeck.actions.registerAction(new ScrollWindow());
streamDeck.actions.registerAction(new SwitchApp());
streamDeck.actions.registerAction(new FocusTmuxWindow());
streamDeck.actions.registerAction(new TmuxPaneDial());
streamDeck.actions.registerAction(new CycleTmuxWindow());
streamDeck.actions.registerAction(new CycleAppWindows());
streamDeck.actions.registerAction(new BBEditDocDial());
streamDeck.actions.registerAction(new OpenFile());
streamDeck.actions.registerAction(new WindowRing());
streamDeck.actions.registerAction(new PasteSnippet());
streamDeck.actions.registerAction(new ArrangeWindow());
streamDeck.connect();
//# sourceMappingURL=plugin.js.map
