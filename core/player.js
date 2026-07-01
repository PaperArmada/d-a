/* Player — drives a list of "frames" (snapshots) with play/pause/step/reset.
   A frame is any object your render(frame) function understands.

   Usage:
     const player = new Player({ onFrame, onStateChange });
     player.load(framesArray);
     player.play();  player.pause();  player.stepForward();  ...
*/
(function (global) {
  'use strict';

  class Player {
    constructor(opts) {
      opts = opts || {};
      this.onFrame = opts.onFrame || function () {};
      this.onStateChange = opts.onStateChange || function () {};
      this.frames = [];
      this.index = 0;
      this.playing = false;
      this.speed = opts.speed || 1;       // multiplier
      this.baseDelay = opts.baseDelay || 600; // ms at speed 1
      this._timer = null;
    }

    load(frames, keepIndex) {
      this.pause();
      this.frames = frames || [];
      this.index = keepIndex ? Math.min(this.index, this.frames.length - 1) : 0;
      if (this.index < 0) this.index = 0;
      this._emit();
    }

    get current() { return this.frames[this.index]; }
    get length() { return this.frames.length; }
    get atEnd() { return this.index >= this.frames.length - 1; }
    get atStart() { return this.index <= 0; }

    _emit() {
      if (this.frames.length) this.onFrame(this.frames[this.index], this.index);
      this.onStateChange(this._state());
    }

    _state() {
      return {
        playing: this.playing,
        index: this.index,
        length: this.frames.length,
        atStart: this.atStart,
        atEnd: this.atEnd,
        speed: this.speed
      };
    }

    play() {
      if (this.playing || !this.frames.length) return;
      if (this.atEnd) this.index = 0; // replay from start
      this.playing = true;
      this._emit();
      this._tick();
    }

    _tick() {
      if (!this.playing) return;
      this._timer = setTimeout(() => {
        if (this.atEnd) { this.pause(); return; }
        this.index++;
        this._emit();
        this._tick();
      }, Math.max(30, this.baseDelay / this.speed));
    }

    pause() {
      this.playing = false;
      if (this._timer) { clearTimeout(this._timer); this._timer = null; }
      this.onStateChange(this._state());
    }

    toggle() { this.playing ? this.pause() : this.play(); }

    stepForward() {
      this.pause();
      if (!this.atEnd) { this.index++; this._emit(); }
    }

    stepBack() {
      this.pause();
      if (!this.atStart) { this.index--; this._emit(); }
    }

    seek(i) {
      this.pause();
      this.index = Math.max(0, Math.min(i, this.frames.length - 1));
      this._emit();
    }

    reset() { this.seek(0); }

    setSpeed(mult) {
      this.speed = mult;
      this.onStateChange(this._state());
    }

    destroy() { this.pause(); }
  }

  global.Player = Player;
})(window);
