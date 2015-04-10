'use strict';

var cache = require('../');

describe('leroux-cache', function () {
    var c;

    describe('Initialization, Setters and Defaults', function () {
        it('should return an instance even if not invoked with new', function () {
            cache().should.be.instanceof(cache);
        });

        it('should interpret a numeric options as maxSize', function () {
            c = cache(111);
            c.maxSize.should.equal(111);
        });

        it('should have a default sizeFn', function () {
            c = cache();
            c.sizeFn.should.be.a.function;
        });

        it('should have a default maxSize', function () {
            c = cache();
            (c.maxSize === null).should.be.true;
        });

        it('should have a default maxAge', function () {
            c = cache();
            (c.maxAge === null).should.be.true;
        });

        it('should have a default sweepDelay', function () {
            c = cache();
            c.sweepDelay.should.equal(2500);
        });

        it('should only allow sizeFn to be a function', function () {
            var fn = function () {};

            c = cache({ sizeFn : fn });
            c.sizeFn.should.equal(fn);

            c.sizeFn = 'function';
            c.sizeFn.should.equal(fn);
        });

        it('should only allow maxSize to be positive or null', function () {
            c = cache({ maxSize : 222 });
            c.maxSize.should.equal(222);

            c.maxSize = 0;
            c.maxSize.should.equal(222);

            c.maxSize = -2;
            c.maxSize.should.equal(222);

            c.maxSize = 'two';
            c.maxSize.should.equal(222);

            c.maxSize = null;
            (c.maxSize === null).should.be.true;
        });

        it('should only allow maxAge to be positive or null', function () {
            c = cache({ maxAge : 333 });
            c.maxAge.should.equal(333);

            c.maxAge = 0;
            c.maxAge.should.equal(333);

            c.maxAge = -3;
            c.maxAge.should.equal(333);

            c.maxAge = 'three';
            c.maxAge.should.equal(333);

            c.maxAge = null;
            (c.maxAge === null).should.be.true;
        });

        it('should only allow sweepDelay to be positive', function () {
            c = cache({ sweepDelay : 444 });
            c.sweepDelay.should.equal(444);

            c.sweepDelay = 0;
            c.sweepDelay.should.equal(444);

            c.sweepDelay = -4;
            c.sweepDelay.should.equal(444);

            c.sweepDelay = 'four';
            c.sweepDelay.should.equal(444);
        });
    });

    describe('Base Cache Functionality', function () {
        beforeEach(function () {
            c = cache();
            c.set('a', 'AAA');
            c.set('b', 'BBB');
        });

        it('can set() an existing key', function () {
            c.get('a').should.equal('AAA');
            c.set('a', 'new AAA');
            c.get('a').should.equal('new AAA');
        });

        it('should has() an existing key', function () {
            c.has('a').should.be.true;
            c.has('b').should.be.true;
        });

        it('should not has() for missing keys', function () {
            c.has('fake').should.be.false;
            c.has(null).should.be.false;
        });

        it('can get() an existing key', function () {
            c.get('a').should.equal('AAA');
            c.get('b').should.equal('BBB');
        });

        it('should get() undefined for missing keys', function () {
            (typeof c.get('nope')).should.equal('undefined');
            (typeof c.get(null)  ).should.equal('undefined');
        });

        it('can call a function forEach() key', function () {
            var results = [];

            c.forEach(function (value, key, inst) {
                inst.should.equal(c);
                this.push({ k : key, v : value });
            }, results);

            results.should.containDeep([
                { k : 'a', v: 'AAA' },
                { k : 'b', v: 'BBB' }
            ]);
        });

        it('can del() an exsting key', function () {
            c.get('a').should.equal('AAA');
            c.del('a');
            c.has('a').should.be.false;
            (typeof c.get('a')).should.equal('undefined');
        });

        it('should not break on del() for missing keys', function () {
            (function () {
                c.del('errant');
                c.del(null);
            }).should.not.throw();
        });

        it('can reset()');
    });

    describe('Cache Age Control', function () {
        it('should not return a stale key, even if sweep has not happened');

        it('should sweep stale keys automatically');
    });

    describe('Cache Size Control', function () {
        var sa, sb, sc, sum;

        beforeEach(function () {
            c = cache({ sweepDelay : 60 * 1000 });  //avoid sweeping mid-test
        });

        function fillCache () {
            c.set('a', 'This is entry A. It is 37 bytes long.');
            c.set('b', 'temporary');
            c.set('b', 'Entry B was once 9 bytes. Now it is 45 bytes.');
            c.set('c', 'This is entry C. It clocks in at a nice round 55 bytes.');
            sa = 37; sb = 45; sc = 55;
            sum = 0;
        }

        function byteCounter (value) {
            return value.length;
        }

        it('should not allow size to be written', function () {
            (function () {
                c.size = 1;
            }).should.throw(TypeError);
        });

        it('should count each key as size 1 by default', function () {
            fillCache();
            c.size.should.equal(3);
        });

        it('should accept and use a custom sizeFn', function () {
            c.sizeFn = byteCounter;
            fillCache();
            c.size.should.equal(sa + sb + sc);
        });

        it('should recalculate the cache size when sizeFn changes', function () {
            fillCache();
            c.size.should.equal(3);
            c.sizeFn = byteCounter;
            c.size.should.equal(sa + sb + sc);
        });

        it('should increase the cache size when keys are added', function () {
            c.sizeFn = byteCounter;
            fillCache();
            c.size.should.equal(sa + sb + sc);
            c.set('d', '8 bytes.');
            c.size.should.equal(sa + sb + sc + 8);
            c.set('e', 'And 18 more bytes.');
            c.size.should.equal(sa + sb + sc + 8 + 18);
        });

        it('should increase the cache size when keys are updated', function () {
            c.sizeFn = byteCounter;
            fillCache();
            c.size.should.equal(sa + sb + sc);
            c.set('a', '4 b.');
            c.size.should.equal(4 + sb + sc);
            c.set('b', '4 b.');
            c.size.should.equal(4 + 4 + sc);
            c.set('c', '4 b.');
            c.size.should.equal(4 + 4 + 4);
        });

        it('should decrease the cache size when keys are removed', function () {
            c.sizeFn = byteCounter;
            fillCache();
            c.size.should.equal(sa + sb + sc);
            c.del('a');
            c.size.should.equal(sb + sc);
            c.del('b');
            c.size.should.equal(sc);
            c.del('c');
            c.size.should.equal(0);
        });

        it('should not delete items if the cache is not over size', function (done) {
            c.maxSize = 3;
            c.sweepDelay = 5;
            fillCache();
            c.size.should.equal(3);
            setTimeout(function () {
                c.forEach(function () { sum++; });
                sum.should.equal(3);
                c.size.should.equal(3);

                done();
            }, c.sweepDelay * 2);
        });

        it('should delete items when the cache is over size', function (done) {
            c.maxSize = 1;
            c.sweepDelay = 5;
            fillCache();
            c.size.should.equal(3);
            setTimeout(function () {
                c.forEach(function () { sum++; });
                sum.should.equal(1);
                c.size.should.equal(1);

                done();
            }, c.sweepDelay * 2);
        });
    });
});
