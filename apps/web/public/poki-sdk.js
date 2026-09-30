/**
 * Poki SDK HTML5 Bridge & Mock for Tolee Games
 * Supports Defold Poki templates (https://github.com/defold/template-html5-poki)
 * and Poki HTML5 games.
 */
(function(window) {
  'use strict';

  var PokiSDK = {
    _initialized: false,
    _gameLoading: false,
    _gameplay: false,

    init: function() {
      this._initialized = true;
      return Promise.resolve(true);
    },

    initWithVideoHB: function() {
      this._initialized = true;
      return Promise.resolve(true);
    },

    customEvent: function() {},

    gameLoadingStart: function() {
      this._gameLoading = true;
    },

    gameLoadingFinished: function() {
      this._gameLoading = false;
    },

    gameLoadingProgress: function() {},

    gameplayStart: function() {
      this._gameplay = true;
    },

    gameplayStop: function() {
      this._gameplay = false;
    },

    commercialBreak: function() {
      return Promise.resolve(true);
    },

    rewardedBreak: function() {
      return Promise.resolve(true);
    },

    displayAd: function() {},
    destroyAd: function() {},

    getLeaderboard: function() {
      return Promise.resolve([]);
    },

    happyTime: function() {},
    setDebug: function() {},
    isAdBlocked: function() {
      return false;
    }
  };

  window.PokiSDK = PokiSDK;
})(typeof window !== 'undefined' ? window : this);
